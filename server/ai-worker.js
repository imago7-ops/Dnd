/*
 * Campaign Codex AI helper: a Cloudflare Worker that keeps your AI keys secret.
 *
 * The website sends { provider, system, prompt } here; this Worker adds your secret key and
 * forwards the request to Claude (Anthropic) or ChatGPT (OpenAI), then returns { text }.
 *
 * Settings (Cloudflare dashboard → your Worker → Settings → Variables and Secrets):
 *   ANTHROPIC_API_KEY   secret  your Claude API key (leave out to turn Claude off)
 *   OPENAI_API_KEY      secret  your OpenAI API key (leave out to turn ChatGPT off)
 *   ACCESS_CODE         secret  a password DMs must enter on the site to use the AI
 *   ALLOWED_ORIGINS     text    sites allowed to call this Worker, comma separated
 *                               (default: https://imago7-ops.github.io)
 *   ANTHROPIC_MODEL     text    optional, default claude-sonnet-5-5
 *   OPENAI_MODEL        text    optional, default gpt-6.1-sol
 *   MAX_TOKENS          text    optional, longest reply allowed, default 1500
 */

const DEFAULTS = {
  origins: 'https://imago7-ops.github.io',
  anthropicModel: 'claude-sonnet-5-5',
  openaiModel: 'gpt-6.1-sol',
  anthropicVersion: '2023-06-01',
  maxTokens: 1500,
};
const LIMITS = { system: 6000, prompt: 12000 };

function corsHeaders(origin, allowed) {
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Access-Code',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function reply(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

/* Compare without leaking timing information about the access code. */
function sameText(a, b) {
  a = String(a || ''); b = String(b || '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

async function askClaude(env, system, prompt, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      authorization: `Bearer ${env.ANTHROPIC_API_KEY}`,
      'anthropic-version': env.ANTHROPIC_VERSION || DEFAULTS.anthropicVersion,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL || DEFAULTS.anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data.error && data.error.message) || `Claude returned an error (${r.status}).`);
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

async function askOpenAI(env, system, prompt, maxTokens) {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULTS.openaiModel,
      max_completion_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data.error && data.error.message) || `ChatGPT returned an error (${r.status}).`);
  const choice = data.choices && data.choices[0];
  return (choice && choice.message && choice.message.content) || '';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || DEFAULTS.origins).split(',').map(s => s.trim()).filter(Boolean);
    const headers = corsHeaders(origin, allowed);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (!allowed.includes(origin)) return reply({ error: 'This site is not allowed to use the AI helper.' }, 403, headers);

    const providers = [];
    if (env.ANTHROPIC_API_KEY) providers.push('anthropic');
    if (env.OPENAI_API_KEY) providers.push('openai');

    // GET: tell the site which AIs are switched on (no key or code needed).
    if (request.method === 'GET') return reply({ ok: true, providers, needsCode: Boolean(env.ACCESS_CODE) }, 200, headers);
    if (request.method !== 'POST') return reply({ error: 'Use POST.' }, 405, headers);

    if (env.ACCESS_CODE && !sameText(request.headers.get('X-Access-Code'), env.ACCESS_CODE)) {
      return reply({ error: 'That access code is not right. Ask the site owner for the AI access code.' }, 401, headers);
    }

    let body;
    try { body = await request.json(); } catch { return reply({ error: 'The request was not valid JSON.' }, 400, headers); }
    const provider = body && body.provider === 'openai' ? 'openai' : 'anthropic';
    if (!providers.includes(provider)) {
      return reply({ error: `${provider === 'openai' ? 'ChatGPT' : 'Claude'} is not switched on for this site.` }, 400, headers);
    }
    const system = String((body && body.system) || '').slice(0, LIMITS.system);
    const prompt = String((body && body.prompt) || '').slice(0, LIMITS.prompt);
    if (!prompt.trim()) return reply({ error: 'Describe what you want the AI to draft.' }, 400, headers);
    const maxTokens = Math.min(4000, Math.max(100, parseInt(env.MAX_TOKENS, 10) || DEFAULTS.maxTokens));

    try {
      const text = provider === 'openai'
        ? await askOpenAI(env, system, prompt, maxTokens)
        : await askClaude(env, system, prompt, maxTokens);
      return reply({ text, provider }, 200, headers);
    } catch (e) {
      return reply({ error: e.message || 'The AI service did not answer.' }, 502, headers);
    }
  },
};
