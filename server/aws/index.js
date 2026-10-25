/*
 * Campaign Codex AI helper for AWS Lambda (function URL).
 *
 * The website sends { provider, system, prompt, meta } here with the DM's access code.
 * This function looks up who the code belongs to, adds your secret API key, asks Claude or
 * ChatGPT, logs the request (who, when, what, cost) to DynamoDB and returns { text }.
 *
 * It also stores each signed-in person's characters and campaigns (accounts are an Amazon
 * Cognito user pool; the site sends the person's sign-in token and this function checks it).
 *
 * Environment variables (set by the CloudFormation template):
 *   ANTHROPIC_API_KEY, OPENAI_API_KEY   your AI keys (either may be empty to switch that AI off)
 *   ACCESS_CODES     "Name=code, Name2=code2"  one code per person; the name goes in the log
 *   ADMIN_CODE       password for viewing the AI activity log on the site
 *   ALLOWED_ORIGINS  websites allowed to call this, comma separated
 *   ANTHROPIC_MODEL, OPENAI_MODEL, MAX_TOKENS, DAILY_LIMIT (requests per person per day)
 *   LOG_TABLE        DynamoDB table for the activity log
 *   USER_POOL_ID, USER_POOL_CLIENT_ID   the Cognito user pool and the website's client
 *   DATA_TABLE       DynamoDB table for people's saved characters and campaigns
 *   INVITE_REQUIRED  "yes" if new accounts need an invite code
 */
'use strict';
const { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand, GetItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const db = new DynamoDBClient({});
const crypto = require('crypto');
const zlib = require('zlib');

const DEFAULTS = { anthropicModel: 'claude-sonnet-5-5', openaiModel: 'gpt-6.1-sol', maxTokens: 1500, dailyLimit: 100 };
// Estimated dollars per million tokens [input, output], for the log's cost column.
const PRICES = {
  'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20],
  'gpt-6-luna': [0.1, 0.5], 'gpt-6.1-sol': [2, 10], 'gpt-6-astra': [10, 50],
};
const YEAR = 365 * 24 * 3600;

const env = name => (process.env[name] || '').trim();
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);

function people() {
  const map = new Map();
  env('ACCESS_CODES').split(',').forEach(pair => {
    const i = pair.indexOf('=');
    if (i > 0) map.set(pair.slice(i + 1).trim(), pair.slice(0, i).trim());
  });
  return map;
}

function sameText(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function whoIs(code) {
  for (const [c, name] of people()) if (sameText(code, c)) return name;
  return null;
}

function respond(status, data, origin, allowed) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      // A site that isn't allowed still gets to read the "not allowed" message (and nothing else).
      'Access-Control-Allow-Origin': allowed.includes(origin) || status === 403 ? (origin || allowed[0]) : allowed[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Access-Code, X-Admin-Code',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
    body: status === 204 ? '' : JSON.stringify(data),
  };
}

async function writeLog(entry) {
  if (!env('LOG_TABLE')) return;
  const now = new Date();
  const id = crypto.randomUUID();
  const item = { pk: { S: 'log' }, sk: { S: `${now.toISOString()}#${id}` }, ts: { S: now.toISOString() }, expires: { N: String(Math.floor(now / 1000) + YEAR) } };
  Object.entries(entry).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    item[k] = typeof v === 'number' ? { N: String(v) } : { S: clip(v, 600) };
  });
  try { await db.send(new PutItemCommand({ TableName: env('LOG_TABLE'), Item: item })); }
  catch (e) { console.error('log failed', e.message); }
}

/* Count today's requests for this person; true if they're over the daily limit. */
async function overLimit(who) {
  const limit = parseInt(env('DAILY_LIMIT'), 10) || DEFAULTS.dailyLimit;
  if (!env('LOG_TABLE')) return false;
  const day = new Date().toISOString().slice(0, 10);
  try {
    const r = await db.send(new UpdateItemCommand({
      TableName: env('LOG_TABLE'),
      Key: { pk: { S: `count#${who}` }, sk: { S: day } },
      UpdateExpression: 'ADD n :one SET expires = :exp',
      ExpressionAttributeValues: { ':one': { N: '1' }, ':exp': { N: String(Math.floor(Date.now() / 1000) + 3 * 86400) } },
      ReturnValues: 'UPDATED_NEW',
    }));
    return Number(r.Attributes.n.N) > limit;
  } catch (e) {
    console.error('count failed', e.message);
    return false;
  }
}

async function readLog() {
  const r = await db.send(new QueryCommand({
    TableName: env('LOG_TABLE'),
    KeyConditionExpression: 'pk = :p',
    ExpressionAttributeValues: { ':p': { S: 'log' } },
    ScanIndexForward: false,
    Limit: 300,
  }));
  return (r.Items || []).map(it => Object.fromEntries(Object.entries(it)
    .filter(([k]) => !['pk', 'sk', 'expires'].includes(k))
    .map(([k, v]) => [k, v.N !== undefined ? Number(v.N) : v.S])));
}

async function askClaude(system, prompt, maxTokens) {
  const model = env('ANTHROPIC_MODEL') || DEFAULTS.anthropicModel;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), authorization: `Bearer ${env('ANTHROPIC_API_KEY')}`, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || `Claude returned an error (${r.status}).`);
  const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return { text, model, inTokens: d.usage && d.usage.input_tokens, outTokens: d.usage && d.usage.output_tokens };
}

async function askOpenAI(system, prompt, maxTokens) {
  const model = env('OPENAI_MODEL') || DEFAULTS.openaiModel;
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env('OPENAI_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_completion_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d.error && d.error.message) || `ChatGPT returned an error (${r.status}).`);
  const c = d.choices && d.choices[0];
  return { text: (c && c.message && c.message.content) || '', model, inTokens: d.usage && d.usage.prompt_tokens, outTokens: d.usage && d.usage.completion_tokens };
}

function cost(model, inT, outT) {
  const p = PRICES[model];
  if (!p || inT == null || outT == null) return undefined;
  return Math.round(((inT * p[0] + outT * p[1]) / 1e6) * 100000) / 100000;
}

/* ---------- Accounts: checking sign-in tokens ---------- */
const b64url = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
let jwks = null, jwksAt = 0;

async function signingKeys(iss, fresh) {
  if (fresh || !jwks || Date.now() - jwksAt > 6 * 3600e3) {
    const r = await fetch(`${iss}/.well-known/jwks.json`);
    if (!r.ok) throw new Error('could not load sign-in keys');
    jwks = (await r.json()).keys || [];
    jwksAt = Date.now();
  }
  return jwks;
}

/* The person's details if the token is a valid, unexpired sign-in token from our user pool. */
async function verifyToken(token) {
  const pool = env('USER_POOL_ID');
  if (!pool || !token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  let head, claims;
  try { head = JSON.parse(b64url(parts[0])); claims = JSON.parse(b64url(parts[1])); } catch { return null; }
  const iss = `https://cognito-idp.${pool.split('_')[0]}.amazonaws.com/${pool}`;
  if (head.alg !== 'RS256' || claims.iss !== iss || claims.token_use !== 'id' || claims.aud !== env('USER_POOL_CLIENT_ID')) return null;
  if (!claims.exp || claims.exp * 1000 < Date.now() - 5000) return { expired: true };
  let jwk = (await signingKeys(iss)).find(k => k.kid === head.kid);
  if (!jwk) jwk = (await signingKeys(iss, true)).find(k => k.kid === head.kid);
  if (!jwk) return null;
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), crypto.createPublicKey({ key: jwk, format: 'jwk' }), b64url(parts[2]));
  return ok ? { sub: claims.sub, email: claims.email, username: claims.nickname || claims.email } : null;
}

/* ---------- Accounts: saved characters and campaigns ---------- */
const KINDS = ['character', 'campaign', 'prefs'];
const MAX_DOCS = 500;           // per person
const MAX_DOC_BYTES = 350000;   // compressed; DynamoDB items max out at 400 KB

const userKey = sub => ({ S: `user#${sub}` });

async function listDocs(sub, since, keysOnly) {
  const items = [];
  let start;
  do {
    const r = await db.send(new QueryCommand({
      TableName: env('DATA_TABLE'),
      KeyConditionExpression: 'pk = :p',
      ExpressionAttributeValues: { ':p': userKey(sub), ...(since ? { ':s': { S: since } } : {}) },
      ...(since ? { FilterExpression: 'updated > :s' } : {}),
      ...(keysOnly ? { ProjectionExpression: 'pk, sk' } : {}),
      ExclusiveStartKey: start,
    }));
    items.push(...(r.Items || []));
    start = r.LastEvaluatedKey;
  } while (start);
  return items;
}

function docOut(it) {
  const [kind, ...rest] = it.sk.S.split('#');
  const doc = { kind, id: rest.join('#'), rev: Number(it.rev ? it.rev.N : 0), updated: it.updated ? it.updated.S : '' };
  if (it.deleted && it.deleted.BOOL) doc.deleted = true;
  else if (it.data && it.data.B) doc.data = JSON.parse(zlib.gunzipSync(Buffer.from(it.data.B)).toString());
  return doc;
}

async function saveDoc(sub, d) {
  const kind = String(d.kind || ''), id = clip(d.id, 80);
  if (!KINDS.includes(kind) || !id) return { kind, id, error: 'bad document' };
  const now = new Date().toISOString();
  const values = { ':one': { N: '1' }, ':u': { S: now } };
  let set;
  if (d.deleted) {
    set = 'SET updated = :u, deleted = :t REMOVE #d';
    values[':t'] = { BOOL: true };
  } else {
    const data = zlib.gzipSync(Buffer.from(JSON.stringify(d.data == null ? null : d.data)));
    if (data.length > MAX_DOC_BYTES) return { kind, id, error: 'This is too large to save to your account.' };
    set = 'SET updated = :u, #d = :d REMOVE deleted';
    values[':d'] = { B: data };
  }
  let condition;
  if (!d.force) {
    if (d.baseRev) { condition = 'rev = :base'; values[':base'] = { N: String(Number(d.baseRev)) }; }
    else condition = 'attribute_not_exists(pk)';
  }
  try {
    const r = await db.send(new UpdateItemCommand({
      TableName: env('DATA_TABLE'),
      Key: { pk: userKey(sub), sk: { S: `${kind}#${id}` } },
      UpdateExpression: `${set} ADD rev :one`,
      ExpressionAttributeNames: { '#d': 'data' },
      ExpressionAttributeValues: values,
      ...(condition ? { ConditionExpression: condition } : {}),
      ReturnValues: 'ALL_NEW',
    }));
    return { kind, id, ok: true, rev: Number(r.Attributes.rev.N), updated: now };
  } catch (e) {
    if (e.name !== 'ConditionalCheckFailedException') throw e;
    const cur = await db.send(new GetItemCommand({ TableName: env('DATA_TABLE'), Key: { pk: userKey(sub), sk: { S: `${kind}#${id}` } } }));
    return { kind, id, conflict: true, server: cur.Item ? docOut(cur.Item) : null };
  }
}

async function deleteAccountData(sub) {
  const items = await listDocs(sub, '', true);
  for (const it of items) await db.send(new DeleteItemCommand({ TableName: env('DATA_TABLE'), Key: { pk: it.pk, sk: it.sk } }));
  return items.length;
}

function parseBody(event) {
  try { return JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : (event.body || '{}')); }
  catch { return null; }
}

/* GET ?data=1 (&since=time)   POST ?data=1 {docs}   POST ?account=delete */
async function handleData(event, method, q, h, reply) {
  if (!env('DATA_TABLE') || !env('USER_POOL_ID')) return reply(501, { error: 'Accounts are not set up on this server yet.' });
  const bearer = String(h.authorization || '').replace(/^Bearer\s+/i, '');
  let user;
  try { user = await verifyToken(bearer); }
  catch (e) { return reply(503, { error: 'Couldn\'t check your sign-in right now. Try again in a moment.' }); }
  if (user && user.expired) return reply(401, { error: 'Your sign-in has expired.', expired: true });
  if (!user) return reply(401, { error: 'Please sign in again.', signedOut: true });

  try {
    if (method === 'GET') {
      const since = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(q.since || '') ? q.since : '';
      const now = new Date().toISOString();
      const docs = (await listDocs(user.sub, since)).map(docOut);
      return reply(200, { docs, now });
    }
    if (method !== 'POST') return reply(405, { error: 'Use GET or POST.' });
    if (q.account === 'delete') {
      const removed = await deleteAccountData(user.sub);
      console.log('account data deleted', user.sub, removed);
      return reply(200, { ok: true, removed });
    }
    const body = parseBody(event);
    if (!body || !Array.isArray(body.docs)) return reply(400, { error: 'Nothing to save.' });
    if (body.docs.length > 100) return reply(413, { error: 'Too many changes at once.' });
    const existing = (await listDocs(user.sub, '', true)).length;
    if (existing + body.docs.filter(d => !d.baseRev && !d.deleted).length > MAX_DOCS) return reply(413, { error: `Accounts can hold up to ${MAX_DOCS} characters and campaigns.` });
    const results = [];
    for (const d of body.docs) results.push(await saveDoc(user.sub, d));
    return reply(200, { results });
  } catch (e) {
    console.error('data error', e);
    return reply(500, { error: 'Couldn\'t reach your saved data. Try again in a moment.' });
  }
}

exports.handler = async event => {
  const h = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const origin = h.origin || '';
  const allowed = (env('ALLOWED_ORIGINS') || 'https://imago7-ops.github.io').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || 'GET';
  const reply = (status, data) => respond(status, data, origin, allowed);

  if (method === 'OPTIONS') return reply(204);
  if (!allowed.includes(origin)) return reply(403, { error: 'This site is not allowed to use the AI helper.' });

  const providers = [];
  if (env('ANTHROPIC_API_KEY')) providers.push('anthropic');
  if (env('OPENAI_API_KEY')) providers.push('openai');

  const q = event.queryStringParameters || {};
  if (q.data || q.account) return handleData(event, method, q, h, reply);

  if (method === 'GET') {
    if (q.log) {
      if (!env('ADMIN_CODE') || !sameText(h['x-admin-code'], env('ADMIN_CODE'))) return reply(401, { error: 'That admin code is not right.' });
      try { return reply(200, { entries: await readLog() }); }
      catch (e) { return reply(500, { error: `Couldn't read the log: ${e.message}` }); }
    }
    const pool = env('USER_POOL_ID');
    const accounts = pool && env('USER_POOL_CLIENT_ID') && env('DATA_TABLE')
      ? { region: pool.split('_')[0], clientId: env('USER_POOL_CLIENT_ID'), inviteRequired: env('INVITE_REQUIRED') === 'yes' }
      : null;
    return reply(200, { ok: true, providers, needsCode: true, accounts });
  }
  if (method !== 'POST') return reply(405, { error: 'Use POST.' });

  const body = parseBody(event);
  if (!body) return reply(400, { error: 'The request was not valid JSON.' });
  const meta = body.meta || {};
  const base = { action: clip(meta.action, 20), kind: clip(meta.kind, 40), campaign: clip(meta.campaign, 120), request: clip(meta.request, 500), origin };
  // If the person is signed in, note their account in the log too.
  if (h.authorization) {
    try {
      const u = await verifyToken(String(h.authorization).replace(/^Bearer\s+/i, ''));
      if (u && u.email) base.account = clip(`${u.username} <${u.email}>`, 120);
    } catch { /* the access code is what matters for AI requests */ }
  }

  const who = whoIs(h['x-access-code']);
  if (!who) {
    await writeLog({ ...base, who: 'unknown', status: 'denied', error: 'wrong access code' });
    return reply(401, { error: 'That access code is not right. Ask the site owner for your AI access code.' });
  }

  const provider = body.provider === 'openai' ? 'openai' : 'anthropic';
  if (!providers.includes(provider)) return reply(400, { error: `${provider === 'openai' ? 'ChatGPT' : 'Claude'} is not switched on for this site.` });
  const system = clip(body.system, 6000);
  const prompt = clip(body.prompt, 12000);
  if (!prompt.trim()) return reply(400, { error: 'Describe what you want the AI to draft.' });

  if (await overLimit(who)) {
    await writeLog({ ...base, who, provider, status: 'limited', error: 'daily limit reached' });
    return reply(429, { error: "You've reached today's AI limit. It resets at midnight UTC." });
  }

  const maxTokens = Math.min(4000, Math.max(100, parseInt(env('MAX_TOKENS'), 10) || DEFAULTS.maxTokens));
  try {
    const out = provider === 'openai' ? await askOpenAI(system, prompt, maxTokens) : await askClaude(system, prompt, maxTokens);
    await writeLog({ ...base, who, provider, model: out.model, status: 'ok', inTokens: out.inTokens, outTokens: out.outTokens, costUsd: cost(out.model, out.inTokens, out.outTokens) });
    return reply(200, { text: out.text, provider, who });
  } catch (e) {
    await writeLog({ ...base, who, provider, status: 'error', error: e.message });
    return reply(502, { error: e.message || 'The AI service did not answer.' });
  }
};
