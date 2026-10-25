'use strict';

/*
 * Accounts: sign in with email and password so your characters and campaigns follow you
 * to any device.
 *
 * Sign-in itself is handled by Amazon Cognito (your password goes straight to Cognito, never
 * to this site's code or server). Your characters and campaigns are saved through the site's
 * AWS helper (see AI-SETUP.md), which only accepts a valid sign-in token and only ever
 * reads or writes that person's own data.
 *
 * Syncing: every change is saved in this browser first, then sent to your account a few
 * seconds later. Changes from your other devices are picked up when you come back to the tab
 * and every minute while it's open. If the same thing was edited on two devices at once, the
 * most recent save wins.
 */
const Account = (() => {
  const esc = Util.esc;
  const SESSION_KEY = 'campaign-codex.account' + Store.suffix;
  const SKIP_KEY = 'campaign-codex.no-account' + Store.suffix;
  const GUEST_KEY = Store.KEY + '.guest';
  const RESUME_KEY = 'campaign-codex.resume' + Store.suffix; // signing back in after a sign-in expired
  const metaKey = sub => `campaign-codex.sync.${sub}${Store.suffix}`;

  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

  let session = read(SESSION_KEY); // { sub, email, username, idToken, accessToken, refreshToken, exp }
  let cfg; // undefined = not checked yet, null = accounts not available, else { region, clientId, inviteRequired }
  let unavailable = false; // accounts couldn't be reached on this visit
  const sync = { status: session ? 'idle' : 'off', message: '', last: 0 };
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(sync); } catch (e) { console.error(e); } });

  /* ---------- Config ---------- */
  async function config() {
    if (cfg !== undefined) return cfg;
    if (typeof AI === 'undefined' || !AI.endpoint()) { cfg = null; return cfg; }
    const st = await AI.status();
    if (!st.connected) return null; // try again next time (maybe offline)
    cfg = st.accounts && st.accounts.clientId ? st.accounts : null;
    return cfg;
  }

  /* ---------- Cognito ---------- */
  const FRIENDLY = {
    NotAuthorizedException: 'That email or password is not right.',
    UserNotFoundException: 'That email or password is not right.',
    UsernameExistsException: 'There is already an account with that email. Sign in instead.',
    InvalidPasswordException: 'Use at least 8 characters, including a number.',
    CodeMismatchException: 'That code is not right. Check the email and try again.',
    ExpiredCodeException: 'That code has expired. Send a new one.',
    LimitExceededException: 'Too many tries. Wait a few minutes and try again.',
    TooManyRequestsException: 'Too many tries. Wait a few minutes and try again.',
    TooManyFailedAttemptsException: 'Too many tries. Wait a few minutes and try again.',
    CodeDeliveryFailureException: 'We couldn\'t send the email. Check the address and try again.',
    PasswordResetRequiredException: 'You need to reset your password. Use "Forgot your password?".',
  };
  async function cognito(action, body) {
    const c = await config();
    if (!c) throw new Error('Accounts aren\'t switched on for this site yet.');
    let r;
    try {
      r = await fetch(`https://cognito-idp.${c.region}.amazonaws.com/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}` },
        body: JSON.stringify({ ClientId: c.clientId, ...body }),
      });
    } catch {
      throw new Error('Couldn\'t reach the sign-in service. Check your internet connection.');
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const code = String(d.__type || '').split('#').pop();
      let msg = FRIENDLY[code] || d.message || 'Something went wrong. Try again.';
      if (code === 'UserLambdaValidationException') msg = String(d.message || '').replace(/^.*failed with error\s*/i, '').replace(/\.?$/, '.');
      if (code === 'InvalidParameterException' && /password/i.test(d.message || '')) msg = FRIENDLY.InvalidPasswordException;
      const err = new Error(msg);
      err.code = code;
      throw err;
    }
    return d;
  }

  function claims(jwt) {
    try { return JSON.parse(decodeURIComponent(escape(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); } catch { return {}; }
  }
  function keepTokens(res, refresh) {
    const c = claims(res.IdToken);
    session = {
      sub: c.sub, email: c.email, username: c.nickname || (c.email || '').split('@')[0],
      idToken: res.IdToken, accessToken: res.AccessToken, refreshToken: refresh || res.RefreshToken || (session && session.refreshToken),
      exp: (c.exp || 0) * 1000,
    };
    write(SESSION_KEY, session);
  }

  let refreshing = null;
  async function refresh() {
    if (!session || !session.refreshToken) throw new Error('signed out');
    if (!refreshing) {
      refreshing = cognito('InitiateAuth', { AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: { REFRESH_TOKEN: session.refreshToken } })
        .then(d => keepTokens(d.AuthenticationResult, session.refreshToken))
        .finally(() => { refreshing = null; });
    }
    return refreshing;
  }
  async function token() {
    if (!session) throw new Error('signed out');
    if (Date.now() > session.exp - 120e3) {
      try { await refresh(); } catch (e) {
        if (e.code === 'NotAuthorizedException') { expired(); throw new Error('signed out'); }
        throw e;
      }
    }
    return session.idToken;
  }
  function expired() {
    sync.status = 'expired';
    sync.message = 'Your sign-in has expired. Sign in again to keep syncing.';
    emit();
  }

  /* Call the site's AWS helper as the signed-in person. */
  async function api(method, query, body, retried) {
    const url = new URL(AI.endpoint() + '/');
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
    let r;
    try {
      r = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${await token()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        keepalive: Boolean(body && JSON.stringify(body).length < 60000 && document.visibilityState === 'hidden'),
      });
    } catch (e) {
      if (e.message === 'signed out') throw e;
      const err = new Error('offline'); err.offline = true; throw err;
    }
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 && d.expired && !retried) { await refresh(); return api(method, query, body, true); }
    if (r.status === 401) { expired(); throw new Error('signed out'); }
    if (!r.ok) throw new Error(d.error || `The server returned an error (${r.status}).`);
    return d;
  }

  /* ---------- Sync ---------- */
  // cyrb53: a quick 53-bit string hash, used to tell whether something changed since it last synced.
  function hash(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const getMeta = () => Object.assign({ revs: {}, hashes: {}, failed: {}, since: '' }, read(metaKey(session.sub)) || {});
  const putMeta = m => write(metaKey(session.sub), m);

  function campaignsArray() {
    if (typeof Campaign !== 'undefined') return Campaign.list(); // also moves very old saves into folders
    return (Store.state.campaigns = Store.state.campaigns || []);
  }
  const prefsOf = s => ({ role: s.role || null, activeCharacterId: s.activeCharacterId || null, activeCampaignId: s.activeCampaignId || null });

  /* Everything that syncs, keyed "kind#id". */
  function currentDocs() {
    const s = Store.state, out = new Map();
    (s.characters || []).forEach(c => c && c.id && out.set(`character#${c.id}`, c));
    campaignsArray().forEach(c => c && c.id && out.set(`campaign#${c.id}`, c));
    out.set('prefs#main', prefsOf(s));
    return out;
  }

  /* Put a document from the account into this browser's data (in place, so open pages keep working). */
  function apply(doc) {
    const s = Store.state;
    if (doc.kind === 'prefs') {
      if (doc.data) Object.assign(s, prefsOf(doc.data));
      return;
    }
    const arr = doc.kind === 'character' ? (s.characters = s.characters || []) : campaignsArray();
    const i = arr.findIndex(x => x && x.id === doc.id);
    if (doc.deleted) {
      if (i >= 0) arr.splice(i, 1);
      if (s.activeCampaignId === doc.id || s.activeCharacterId === doc.id) removedOpen = true;
      if (doc.kind === 'character' && s.activeCharacterId === doc.id) s.activeCharacterId = arr[0] ? arr[0].id : null;
      return;
    }
    if (!doc.data || typeof doc.data !== 'object') return;
    if (i >= 0) {
      const obj = arr[i];
      Object.keys(obj).forEach(k => delete obj[k]);
      Object.assign(obj, doc.data);
    } else arr.push(doc.data);
  }

  function setStatus(status, message = '') {
    sync.status = status;
    sync.message = message;
    if (status === 'idle') sync.last = Date.now();
    emit();
  }

  let pulling = null;
  let removedOpen = false; // something you had open was deleted on another device
  /* Fetch changes made on other devices. Returns how many things changed here. */
  async function pull({ full = false, initial = false } = {}) {
    if (!session) return 0;
    if (pulling) return pulling;
    pulling = (async () => {
      const meta = getMeta();
      const d = await api('GET', { data: '1', ...(meta.since && !full ? { since: meta.since } : {}) });
      const cur = currentDocs();
      let changed = 0;
      for (const doc of d.docs || []) {
        const key = `${doc.kind}#${doc.id}`;
        if (!initial && (meta.revs[key] || 0) >= doc.rev) continue;
        if (doc.kind === 'prefs' && !initial) { meta.revs[key] = doc.rev; continue; } // each device keeps its own page and role
        const local = cur.get(key);
        const dirty = local ? hash(JSON.stringify(local)) !== meta.hashes[key] : key in meta.hashes;
        if (dirty && !initial) continue; // this device's newer change gets sent next and wins
        apply(doc);
        meta.revs[key] = doc.rev;
        if (doc.deleted) delete meta.hashes[key];
        else {
          const now = currentDocs().get(key);
          if (now) meta.hashes[key] = hash(JSON.stringify(now));
        }
        changed++;
      }
      meta.since = new Date(Date.parse(d.now) - 10000).toISOString();
      putMeta(meta);
      if (changed) {
        Store.flush();
        window.dispatchEvent(new CustomEvent('codex:synced', { detail: { changed, removedOpen } }));
        removedOpen = false;
      }
      return changed;
    })().finally(() => { pulling = null; });
    return pulling;
  }

  let pushing = null, again = false, pushTimer = null;
  async function push() {
    if (!session || sync.status === 'expired') return;
    if (pushing) { again = true; return pushing; }
    pushing = (async () => {
      const meta = getMeta();
      const cur = currentDocs();
      const changes = [];
      for (const [key, obj] of cur) {
        const json = JSON.stringify(obj);
        const h = hash(json);
        if (meta.hashes[key] === h || meta.failed[key] === h) continue;
        const [kind, ...rest] = key.split('#');
        changes.push({ key, h, json, doc: { kind, id: rest.join('#'), baseRev: meta.revs[key] || 0 } });
      }
      Object.keys(meta.hashes).forEach(key => {
        if (cur.has(key)) return;
        const [kind, ...rest] = key.split('#');
        changes.push({ key, deleted: true, doc: { kind, id: rest.join('#'), baseRev: meta.revs[key] || 0, deleted: true } });
      });
      if (!changes.length) return setStatus('idle');
      setStatus('saving');

      // Send in batches of up to ~1.5 MB.
      const batches = [[]];
      let size = 0;
      changes.forEach(c => {
        const n = c.json ? c.json.length : 100;
        if (batches[batches.length - 1].length && (size + n > 1.5e6 || batches[batches.length - 1].length >= 40)) { batches.push([]); size = 0; }
        batches[batches.length - 1].push(c);
        size += n;
      });
      const problems = [];
      for (const batch of batches) {
        const send = list => api('POST', { data: '1' }, { docs: list.map(c => (c.json ? { ...c.doc, data: JSON.parse(c.json) } : c.doc)) });
        const res = await send(batch);
        const retry = [];
        res.results.forEach((r, i) => {
          const c = batch[i];
          if (r.ok) {
            meta.revs[c.key] = r.rev;
            if (c.deleted) delete meta.hashes[c.key]; else meta.hashes[c.key] = c.h;
            delete meta.failed[c.key];
          } else if (r.conflict) {
            // Changed on another device too: the newest save (this one) wins.
            retry.push({ ...c, doc: { ...c.doc, force: true } });
          } else if (r.error) {
            meta.failed[c.key] = c.h;
            problems.push(r.error);
          }
        });
        if (retry.length) {
          const res2 = await send(retry);
          res2.results.forEach((r, i) => {
            const c = retry[i];
            if (r.ok) { meta.revs[c.key] = r.rev; if (c.deleted) delete meta.hashes[c.key]; else meta.hashes[c.key] = c.h; }
          });
        }
        putMeta(meta);
      }
      if (problems.length) {
        setStatus('error', problems[0]);
        Util.toast(`Couldn't save something to your account: ${problems[0]}`, 'error');
      } else setStatus('idle');
    })().catch(e => {
      if (e.message === 'signed out') return;
      setStatus(e.offline ? 'offline' : 'error', e.offline ? 'Offline. Your changes are saved in this browser and will sync when you\'re back online.' : e.message);
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 30000);
    }).finally(() => {
      pushing = null;
      if (again) { again = false; schedulePush(); }
    });
    return pushing;
  }
  function schedulePush(delay = 2500) {
    if (!session) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, delay);
  }

  async function syncNow() {
    try {
      await push();
      await pull();
      await push();
    } catch (e) {
      if (e.message !== 'signed out') setStatus(e.offline ? 'offline' : 'error', e.offline ? 'Offline. Changes will sync when you\'re back online.' : e.message);
    }
  }

  let started = false;
  function start() {
    if (started || !session) return;
    started = true;
    window.addEventListener('codex:save', () => schedulePush());
    document.addEventListener('visibilitychange', () => {
      if (!session) return;
      if (document.visibilityState === 'hidden') push();
      else pull().catch(() => {});
    });
    window.addEventListener('online', () => syncNow());
    setInterval(() => { if (session && document.visibilityState === 'visible') pull().catch(() => {}); }, 60000);
    syncNow();
  }

  /* ---------- Signing in, up and out ---------- */
  const user = () => (session ? { email: session.email, username: session.username, sub: session.sub } : null);
  const signedIn = () => Boolean(session);
  const idToken = () => (session && Date.now() < session.exp ? session.idToken : '');
  const skipped = () => Boolean(read(SKIP_KEY));
  const skip = () => write(SKIP_KEY, true);

  async function signIn(email, password) {
    const d = await cognito('InitiateAuth', { AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: email.trim(), PASSWORD: password } });
    if (!d.AuthenticationResult) throw new Error('This account needs a step this site doesn\'t support yet.');
    keepTokens(d.AuthenticationResult);
    write(SKIP_KEY, null);
  }

  function signUp({ username, email, password, invite }) {
    return cognito('SignUp', {
      Username: email.trim(), Password: password,
      UserAttributes: [{ Name: 'email', Value: email.trim() }, { Name: 'nickname', Value: username.trim() }],
      ...(invite ? { ValidationData: [{ Name: 'invite', Value: invite.trim() }], ClientMetadata: { invite: invite.trim() } } : {}),
    });
  }
  const confirm = (email, code) => cognito('ConfirmSignUp', { Username: email.trim(), ConfirmationCode: code.trim() });
  const resend = email => cognito('ResendConfirmationCode', { Username: email.trim() });
  const forgot = email => cognito('ForgotPassword', { Username: email.trim() });
  const resetPassword = (email, code, password) => cognito('ConfirmForgotPassword', { Username: email.trim(), ConfirmationCode: code.trim(), Password: password });

  const hasLocalWork = s => (s.characters || []).length > 0 || (Array.isArray(s.campaigns) && s.campaigns.length > 0) || Boolean(s.campaign);

  /* After a successful sign-in: bring the account's data onto this device. */
  async function afterSignIn(choice) {
    // choice: 'add' = add this device's characters and campaigns to the account,
    //         'keep' = leave them on this device (they come back when you sign out),
    //         'resume' = same account signing back in: send this device's unsynced changes first.
    if (choice === 'resume') {
      started = false;
      start();
      return;
    }
    if (choice === 'keep') {
      write(GUEST_KEY, Store.state);
      Store.replace({});
    }
    write(metaKey(session.sub), null);
    campaignsArray();
    const meta = getMeta();
    const d = await api('GET', { data: '1' });
    for (const doc of d.docs || []) {
      const key = `${doc.kind}#${doc.id}`;
      // A character or campaign that's both here and in the account: the account's copy wins.
      if (doc.kind === 'prefs' && choice === 'add' && Store.state.role) { meta.revs[key] = doc.rev; continue; }
      apply(doc);
      meta.revs[key] = doc.rev;
      const now = currentDocs().get(key);
      if (!doc.deleted && now) meta.hashes[key] = hash(JSON.stringify(now));
    }
    meta.since = new Date(Date.parse(d.now) - 10000).toISOString();
    putMeta(meta);
    Store.flush();
    started = false;
    start();
    await push().catch(() => {});
  }

  async function signOut() {
    if (session) {
      try { await push(); } catch { /* best effort */ }
      try { await cognito('RevokeToken', { Token: session.refreshToken }); } catch { /* already invalid */ }
    }
    finishSignOut();
  }
  function finishSignOut() {
    if (session) write(metaKey(session.sub), null);
    write(SESSION_KEY, null);
    session = null;
    // Account data leaves this device; anything kept from before signing in comes back.
    Store.replace(read(GUEST_KEY) || {});
    write(GUEST_KEY, null);
    location.hash = '#/account';
    location.reload();
  }

  async function deleteAccount() {
    await api('POST', { account: 'delete' });
    await cognito('DeleteUser', { AccessToken: session.accessToken });
    finishSignOut();
  }

  async function changeUsername(name) {
    await token();
    await cognito('UpdateUserAttributes', { AccessToken: session.accessToken, UserAttributes: [{ Name: 'nickname', Value: name.trim() }] });
    await refresh();
    emit();
  }

  /* ---------- Sign-in screen (#/account) ---------- */
  const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ico" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle class="ico" cx="12" cy="12" r="3"/></svg>';

  function mountScreen(app, done) {
    let view = 'signin';
    const form = { email: '', username: '', invite: '' };
    let password = ''; // kept only in memory, to sign in right after verifying the email
    let msg = '', note = '', busy = false;

    const pw = (name, auto, label = 'Password') => `<label class="field"><span>${label}</span>
      <span class="pw-wrap"><input type="password" name="${name}" autocomplete="${auto}" minlength="8" required>
      <button type="button" class="pw-eye" data-act="peek" aria-label="Show password">${EYE}</button></span></label>`;
    const email = (auto = 'username') => `<label class="field"><span>Email</span><input type="email" name="email" autocomplete="${auto}" value="${esc(form.email)}" required></label>`;

    async function render() {
      document.title = 'Sign in – Campaign Codex';
      app.innerHTML = `<main class="welcome auth"><div class="auth-card panel"><div class="brand brand-lg">${Dice.D20_SVG}<span>Campaign Codex</span></div><div data-ref="body"><p class="muted">Checking accounts…</p></div></div></main>`;
      const c = await config().catch(() => null);
      const body = app.querySelector('[data-ref="body"]');
      if (!body) return;
      if (!c) {
        // Accounts aren't set up (or can't be reached right now): carry on without them.
        unavailable = true;
        return done();
      }
      const err = msg ? `<p class="auth-msg error" role="alert">${esc(msg)}</p>` : '';
      const ok = note ? `<p class="auth-msg ok" role="status">${esc(note)}</p>` : '';
      const views = {
        signin: `<h1>Sign in</h1>
          <p class="lede">Your characters and campaigns, on any device.</p>
          <form data-form="signin">${email()}${pw('password', 'current-password')}${err}${ok}
            <button class="btn btn-primary btn-lg" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Signing in…' : 'Sign in'}</button></form>
          <p class="auth-links"><button class="link-btn" data-act="go" data-view="forgot">Forgot your password?</button></p>
          <p class="auth-links">New here? <button class="link-btn" data-act="go" data-view="signup">Create an account</button></p>`,
        signup: `<h1>Create an account</h1>
          <p class="lede">So you can reach your characters and campaigns from any device.</p>
          <form data-form="signup">
            <label class="field"><span>Username</span><input name="username" maxlength="30" autocomplete="nickname" value="${esc(form.username)}" placeholder="What your party sees" required></label>
            ${email('email')}${pw('password', 'new-password')}
            <p class="muted small">At least 8 characters, including a number.</p>
            ${c.inviteRequired ? `<label class="field"><span>Invite code</span><input name="invite" value="${esc(form.invite)}" autocomplete="off" required placeholder="From the site owner"></label>` : ''}
            ${err}<button class="btn btn-primary btn-lg" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Creating…' : 'Create account'}</button></form>
          <p class="auth-links">Already have an account? <button class="link-btn" data-act="go" data-view="signin">Sign in</button></p>`,
        verify: `<h1>Check your email</h1>
          <p class="lede">We sent a 6-digit code to <b>${esc(form.email)}</b>. It can take a minute; check your spam folder too.</p>
          <form data-form="verify"><label class="field"><span>Code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label>
            ${err}${ok}<button class="btn btn-primary btn-lg" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Checking…' : 'Verify email'}</button></form>
          <p class="auth-links"><button class="link-btn" data-act="resend">Send a new code</button> · <button class="link-btn" data-act="go" data-view="signin">Back to sign in</button></p>`,
        forgot: `<h1>Reset your password</h1>
          <p class="lede">Enter your email and we'll send you a code.</p>
          <form data-form="forgot">${email()}${err}<button class="btn btn-primary btn-lg" type="submit" ${busy ? 'disabled' : ''}>Send code</button></form>
          <p class="auth-links"><button class="link-btn" data-act="go" data-view="signin">Back to sign in</button></p>`,
        reset: `<h1>Choose a new password</h1>
          <p class="lede">If there's an account for <b>${esc(form.email)}</b>, we've emailed it a code.</p>
          <form data-form="reset"><label class="field"><span>Code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label>
            ${pw('password', 'new-password', 'New password')}<p class="muted small">At least 8 characters, including a number.</p>
            ${err}<button class="btn btn-primary btn-lg" type="submit" ${busy ? 'disabled' : ''}>Set new password</button></form>
          <p class="auth-links"><button class="link-btn" data-act="go" data-view="signin">Back to sign in</button></p>`,
      };
      body.innerHTML = `${views[view]}
        ${view === 'signin' || view === 'signup' ? `<div class="auth-or"><span>or</span></div>
          <button class="btn btn-lg auth-skip" data-act="skip">Continue without an account</button>
          <p class="muted small center">Without an account, your work is saved in this browser only.</p>` : ''}`;
      wire(body);
      const first = body.querySelector('input:not([value]), input[value=""]') || body.querySelector('input');
      first?.focus({ preventScroll: true });
    }

    function wire(body) {
      body.onclick = e => {
        const b = e.target.closest('[data-act]');
        if (!b) return;
        if (b.dataset.act === 'peek') {
          const input = b.parentElement.querySelector('input');
          input.type = input.type === 'password' ? 'text' : 'password';
          b.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
          return;
        }
        if (b.dataset.act === 'skip') { skip(); return done(); }
        if (b.dataset.act === 'go') { view = b.dataset.view; msg = note = ''; return render(); }
        if (b.dataset.act === 'resend') {
          resend(form.email).then(() => { msg = ''; note = 'A new code is on its way.'; render(); }).catch(err => { msg = err.message; render(); });
        }
      };
      body.onsubmit = async e => {
        e.preventDefault();
        const f = e.target;
        const val = n => (f.elements.namedItem(n) ? f.elements.namedItem(n).value : '');
        if (f.elements.namedItem('email')) form.email = val('email').trim();
        busy = true; msg = ''; note = '';
        try {
          switch (f.dataset.form) {
            case 'signin':
              password = val('password');
              try { await signIn(form.email, password); }
              catch (err) {
                if (err.code === 'UserNotConfirmedException') {
                  await resend(form.email).catch(() => {});
                  view = 'verify'; note = 'Verify your email to finish creating your account.';
                  break;
                }
                throw err;
              }
              password = '';
              return await finishSignIn(app, done);
            case 'signup':
              form.username = val('username').trim();
              form.invite = val('invite');
              password = val('password');
              if (!form.username) throw new Error('Pick a username.');
              await signUp({ username: form.username, email: form.email, password, invite: form.invite });
              view = 'verify';
              break;
            case 'verify':
              await confirm(form.email, val('code'));
              if (password) {
                await signIn(form.email, password);
                password = '';
                return await finishSignIn(app, done);
              }
              view = 'signin'; note = 'Email verified. Sign in to continue.';
              break;
            case 'forgot':
              await forgot(form.email);
              view = 'reset';
              break;
            case 'reset':
              await resetPassword(form.email, val('code'), val('password'));
              view = 'signin'; note = 'Password changed. Sign in with your new password.';
              break;
          }
        } catch (err) {
          msg = err.message;
        }
        busy = false;
        render();
      };
    }

    render();
  }

  /* Ask what to do with characters and campaigns already in this browser, then load the account. */
  async function finishSignIn(app, done) {
    let choice = 'add';
    const resume = read(RESUME_KEY);
    write(RESUME_KEY, null);
    if (resume && resume === session.sub) choice = 'resume';
    else if (hasLocalWork(Store.state)) choice = await askMerge();
    const body = app.querySelector('[data-ref="body"]');
    if (body) body.innerHTML = `<h1>Signed in</h1><p class="lede">Loading your characters and campaigns…</p>`;
    try {
      await afterSignIn(choice);
    } catch (e) {
      Util.toast(e.offline ? 'Signed in, but you look offline. Your account will sync when you\'re back online.' : `Signed in, but syncing failed: ${e.message}`, 'error');
    }
    done();
  }

  function askMerge() {
    const s = Store.state;
    const nc = (s.characters || []).length;
    const ncp = Array.isArray(s.campaigns) ? s.campaigns.length : (s.campaign ? 1 : 0);
    const parts = [nc && `${nc} character${nc > 1 ? 's' : ''}`, ncp && `${ncp} campaign${ncp > 1 ? 's' : ''}`].filter(Boolean).join(' and ');
    return new Promise(resolve => {
      const host = document.createElement('div');
      host.className = 'modal-backdrop';
      host.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="merge-title"><div>
        <header class="modal-head"><div><h2 id="merge-title">Add this browser's work to your account?</h2>
          <p class="muted">This browser has ${esc(parts)} saved without an account.</p></div></header>
        <div class="modal-body"><div class="nc-choices">
          <button class="nc-choice" data-c="add"><b>Add them to my account</b><span>They'll be on all your devices from now on.</span></button>
          <button class="nc-choice" data-c="keep"><b>Keep them separate</b><span>Not added to your account. They come back on this browser when you sign out.</span></button>
        </div></div></div></div>`;
      document.body.appendChild(host);
      host.querySelector('[data-c]').focus();
      host.onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; host.remove(); resolve(b.dataset.c); };
    });
  }

  /* ---------- Account menu in the top bar ---------- */
  function statusText() {
    switch (sync.status) {
      case 'saving': return 'Saving to your account…';
      case 'offline': return 'Offline: saved in this browser';
      case 'error': return `Not synced: ${sync.message}`;
      case 'expired': return 'Sign in again to keep syncing';
      default: return sync.last ? 'All changes saved to your account' : 'Connected to your account';
    }
  }

  function mountChip(el) {
    if (!el) return;
    function render() {
      if (!el.isConnected) { listeners.delete(render); return; }
      if (!session) {
        el.innerHTML = cfg ? `<a class="link-btn acct-signin" href="#/account">Sign in</a>` : '';
        return;
      }
      const wasOpen = el.querySelector('details')?.open;
      el.innerHTML = `<details class="menu acct-menu" ${wasOpen ? 'open' : ''}>
        <summary class="acct-chip" data-status="${sync.status}" title="${esc(statusText())}"><span class="sync-dot" aria-hidden="true"></span><span class="acct-name">${esc(session.username)}</span></summary>
        <div class="menu-list">
          <div class="acct-who"><b>${esc(session.username)}</b><span>${esc(session.email)}</span><span class="acct-status" data-status="${sync.status}">${esc(statusText())}</span></div>
          ${sync.status === 'expired' ? '<button data-acct="relogin">Sign in again</button>' : '<button data-acct="sync">Sync now</button>'}
          <button data-acct="rename">Change username</button>
          <button data-acct="signout">Sign out</button>
          <button data-acct="delete" class="danger">Delete account…</button>
        </div></details>`;
    }
    el.onclick = e => {
      const b = e.target.closest('[data-acct]');
      if (!b) return;
      el.querySelector('details')?.removeAttribute('open');
      const a = b.dataset.acct;
      if (a === 'sync') return syncNow().then(() => { if (sync.status === 'idle') Util.toast('Everything is synced.'); });
      if (a === 'signout') return signOut();
      if (a === 'relogin') {
        const again = session.email;
        write(RESUME_KEY, session.sub);
        write(SESSION_KEY, null);
        session = null;
        Store.flush();
        location.hash = '#/account';
        return Util.toast(`Sign in as ${again} to keep syncing.`);
      }
      if (a === 'rename') return renameDialog();
      if (a === 'delete') return deleteDialog();
    };
    listeners.add(render);
    render();
    if (cfg === undefined) config().then(render).catch(() => {});
  }

  function dialog(html, onSubmit) {
    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><form>${html}</form></div>`;
    document.body.appendChild(host);
    const close = () => host.remove();
    host.onclick = e => { if (e.target === host || e.target.closest('[data-act="close"]')) close(); };
    host.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    const formEl = host.querySelector('form');
    formEl.onsubmit = async e => {
      e.preventDefault();
      const btn = formEl.querySelector('[type="submit"]');
      const msgEl = formEl.querySelector('.auth-msg');
      btn.disabled = true;
      try { await onSubmit(formEl); close(); }
      catch (err) { if (msgEl) { msgEl.hidden = false; msgEl.textContent = err.message; } btn.disabled = false; }
    };
    formEl.querySelector('input')?.focus();
  }

  function renameDialog() {
    dialog(`<header class="modal-head"><div><h2>Change username</h2><p class="muted">The name your party sees.</p></div><button type="button" class="icon-btn" data-act="close" aria-label="Close">×</button></header>
      <div class="modal-body"><label class="field"><span>Username</span><input name="username" maxlength="30" value="${esc(session.username)}" required></label><p class="auth-msg error" hidden></p></div>
      <footer class="modal-foot"><span class="foot-hint"></span><button type="button" class="btn" data-act="close">Cancel</button><button class="btn btn-primary" type="submit">Save</button></footer>`,
    async f => {
      await changeUsername(f.elements.namedItem('username').value);
      Util.toast('Username changed.');
    });
  }

  function deleteDialog() {
    dialog(`<header class="modal-head"><div><h2>Delete your account?</h2><p class="muted">This permanently deletes your account and every character and campaign saved in it, on all devices. It can't be undone.</p></div><button type="button" class="icon-btn" data-act="close" aria-label="Close">×</button></header>
      <div class="modal-body"><p>Download anything you want to keep first (each character and campaign has a <b>Download</b> option).</p>
        <label class="field"><span>Type your email to confirm</span><input name="confirm" autocomplete="off" required placeholder="${esc(session.email)}"></label><p class="auth-msg error" hidden></p></div>
      <footer class="modal-foot"><span class="foot-hint"></span><button type="button" class="btn" data-act="close">Cancel</button><button class="btn btn-danger" type="submit">Delete my account</button></footer>`,
    async f => {
      if (f.elements.namedItem('confirm').value.trim().toLowerCase() !== String(session.email).toLowerCase()) throw new Error('That doesn\'t match your email.');
      await deleteAccount();
    });
  }

  return {
    config, signedIn, user, idToken, skipped, skip, start, syncNow, signOut,
    available: () => !unavailable,
    mountScreen, mountChip, get sync() { return { ...sync }; },
  };
})();
