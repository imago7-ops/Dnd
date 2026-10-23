'use strict';

/*
 * AI drafting for the DM: talks to the site owner's AI helper (see AI-SETUP.md), which
 * forwards requests to Claude or ChatGPT. The keys never reach the browser; DMs only enter
 * the access code the site owner gave them.
 */
const AI = (() => {
  const esc = Util.esc;
  const KEY = 'campaign-codex.ai';
  const NAMES = { anthropic: 'Claude', openai: 'ChatGPT' };
  const endpoint = () => String(window.CODEX_AI_ENDPOINT || '').trim().replace(/\/+$/, '');

  function settings() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function saveSettings(next) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...settings(), ...next })); } catch { /* ignore */ }
  }

  let statusCache = null;
  async function status() {
    if (!endpoint()) return { connected: false };
    if (statusCache) return statusCache;
    try {
      const r = await fetch(endpoint(), { method: 'GET' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'The AI helper refused the connection.');
      statusCache = { connected: true, providers: d.providers || [], needsCode: Boolean(d.needsCode) };
    } catch (e) {
      return { connected: false, error: e.message && e.message !== 'Failed to fetch' ? e.message : "Couldn't reach the AI helper. Check your internet connection." };
    }
    return statusCache;
  }

  async function ask({ system, prompt, provider, code }) {
    let r;
    try {
      r = await fetch(endpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Access-Code': code || '' },
        body: JSON.stringify({ provider, system, prompt }),
      });
    } catch {
      throw new Error("Couldn't reach the AI helper. Check your internet connection.");
    }
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(d.error || `The AI helper returned an error (${r.status}).`);
      err.status = r.status;
      throw err;
    }
    return String(d.text || '');
  }

  /* Pull the first JSON object out of a reply, even if it's wrapped in a code block. */
  function parseJSON(text) {
    const cleaned = String(text).replace(/```(?:json)?/gi, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('The AI reply was not in the expected format. Try again.');
    try { return JSON.parse(cleaned.slice(start, end + 1)); }
    catch { throw new Error('The AI reply was not in the expected format. Try again.'); }
  }

  /* Keep only known fields, in the right shape. */
  function clean(raw, fields) {
    const out = {};
    fields.forEach(([k, , type, opt]) => {
      let v = raw[k];
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) v = v.join('\n');
      if (typeof v === 'object') v = Object.entries(v).map(([a, b]) => `${a}: ${b}`).join('\n');
      v = String(v).trim().slice(0, 3000);
      if (type === 'select') { if (!opt.includes(v)) return; }
      if (type === 'number') { const n = parseInt(v, 10); if (!Number.isFinite(n)) return; v = String(n); }
      if (v) out[k] = v;
    });
    return out;
  }

  /*
   * Open the drafting dialog.
   * opts: { title, kind, fields, current, buildPrompt(request, useContext) -> {system, prompt}, onAccept(fields) }
   */
  function open(opts) {
    const fill = Boolean(opts.current);
    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal ai-modal" role="dialog" aria-modal="true" aria-labelledby="ai-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const lastFocus = document.activeElement;
    const st = { phase: 'loading', info: null, result: null, error: '', request: '', useContext: true };

    function close() {
      document.removeEventListener('keydown', onKey);
      host.remove();
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    function onKey(e) { if (e.key === 'Escape' && st.phase !== 'working') close(); }
    document.addEventListener('keydown', onKey);

    const head = () => `
      <header class="modal-head">
        <div><h2 id="ai-title">${esc(opts.title)}</h2><p class="muted">${fill ? 'Fills only the empty fields; your own writing is kept.' : 'Describe it in a few words and the AI drafts the rest.'}</p></div>
        <button class="icon-btn" data-act="close" aria-label="Close">×</button>
      </header>`;

    function render() {
      const s = settings();
      if (st.phase === 'loading') {
        body.innerHTML = `${head()}<div class="modal-body"><p class="ai-wait">Checking the AI helper…</p></div>`;
        return;
      }
      if (st.phase === 'offline') {
        body.innerHTML = `${head()}<div class="modal-body"><section class="lu-section">
          <p>${esc(st.info.error || "The AI helper isn't connected to this site yet.")}</p>
          ${!endpoint() ? '<p class="detail-note">The site owner needs to finish the steps in AI-SETUP.md (in the GitHub repo) and add the helper\'s address to js/ai-config.js.</p>' : ''}
        </section></div><footer class="modal-foot"><span class="foot-hint"></span><button class="btn" data-act="close">Close</button></footer>`;
        return;
      }
      const providers = st.info.providers;
      const provider = providers.includes(s.provider) ? s.provider : providers[0];
      if (st.phase === 'result') {
        const rows = opts.fields.filter(([k]) => st.result[k]).map(([k, label]) => `<div class="ai-row"><dt>${esc(label)}</dt><dd>${esc(st.result[k])}</dd></div>`).join('');
        body.innerHTML = `${head()}<div class="modal-body">
          <section class="lu-section">
            <p class="detail-note">Drafted by ${esc(NAMES[provider] || provider)}. ${fill ? 'These go into the empty fields.' : 'It\'s added as Hidden, and you can edit everything after.'}</p>
            ${rows ? `<dl class="ai-result">${rows}</dl>` : '<p>The AI had nothing to add. Try again with more detail.</p>'}
          </section></div>
          <footer class="modal-foot">
            <span class="foot-hint"></span>
            <button class="btn" data-act="again">Try again</button>
            <button class="btn btn-primary" data-act="accept" ${rows ? '' : 'disabled'}>${fill ? 'Fill in these fields' : `Add this ${esc(opts.kind)}`}</button>
          </footer>`;
        return;
      }
      const working = st.phase === 'working';
      body.innerHTML = `${head()}<div class="modal-body">
        <section class="lu-section">
          <label class="field"><span>${fill ? 'Anything to steer it? (optional)' : `What should this ${esc(opts.kind)} be?`}</span>
            <textarea data-ref="request" rows="3" maxlength="1500" placeholder="${esc(opts.placeholder || '')}" ${working ? 'disabled' : ''}>${esc(st.request)}</textarea>
          </label>
          <label class="check-line"><input type="checkbox" data-ref="ctx" ${st.useContext ? 'checked' : ''} ${working ? 'disabled' : ''}> Use this campaign's summary and names so it fits your world</label>
          <div class="ai-opts">
            ${providers.length > 1 ? `<label class="field"><span>AI</span><select data-ref="provider" ${working ? 'disabled' : ''}>
              ${providers.map(p => `<option value="${p}" ${p === provider ? 'selected' : ''}>${NAMES[p] || p}</option>`).join('')}
            </select></label>` : `<p class="muted small">Using ${esc(NAMES[provider] || provider)}.</p>`}
            ${st.info.needsCode ? `<label class="field"><span>Access code</span><input type="password" data-ref="code" value="${esc(s.code || '')}" autocomplete="off" placeholder="From the site owner" ${working ? 'disabled' : ''}></label>` : ''}
          </div>
          ${st.error ? `<p class="ai-error" role="alert">${esc(st.error)}</p>` : ''}
          <p class="muted small">Your request and the campaign details it uses are sent to ${esc(NAMES[provider] || 'the AI')} to write the draft.</p>
        </section></div>
        <footer class="modal-foot">
          <span class="foot-hint">${working ? 'Drafting… this takes a few seconds.' : ''}</span>
          <button class="btn" data-act="close" ${working ? 'disabled' : ''}>Cancel</button>
          <button class="btn btn-primary" data-act="go" ${working ? 'disabled' : ''}>${working ? 'Drafting…' : (fill ? 'Fill in the blanks' : 'Draft it')}</button>
        </footer>`;
      if (!working) body.querySelector('[data-ref="request"]').focus();
    }

    async function go() {
      const req = body.querySelector('[data-ref="request"]');
      st.request = req.value.trim();
      st.useContext = body.querySelector('[data-ref="ctx"]').checked;
      if (!fill && !st.request) { st.error = `Describe the ${opts.kind} in a few words first.`; render(); return; }
      const prov = body.querySelector('[data-ref="provider"]');
      const codeInput = body.querySelector('[data-ref="code"]');
      if (prov) saveSettings({ provider: prov.value });
      if (codeInput) saveSettings({ code: codeInput.value.trim() });
      if (st.info.needsCode && !settings().code) { st.error = 'Enter the access code the site owner gave you.'; render(); return; }
      const s = settings();
      const provider = st.info.providers.includes(s.provider) ? s.provider : st.info.providers[0];
      st.phase = 'working'; st.error = '';
      render();
      try {
        const { system, prompt } = opts.buildPrompt(st.request, st.useContext);
        const text = await ask({ system, prompt, provider, code: s.code });
        st.result = clean(parseJSON(text), opts.fields);
        if (fill) Object.keys(st.result).forEach(k => { if (String(opts.current[k] || '').trim()) delete st.result[k]; });
        st.phase = 'result';
      } catch (e) {
        st.phase = 'form';
        st.error = e.message;
        if (e.status === 401) saveSettings({ code: '' });
      }
      if (host.isConnected) render();
    }

    host.addEventListener('click', e => {
      if (e.target === host && st.phase !== 'working') return close();
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      switch (b.dataset.act) {
        case 'close': return close();
        case 'go': return go();
        case 'again': st.phase = 'form'; return render();
        case 'accept': opts.onAccept(st.result); return close();
      }
    });
    host.addEventListener('keydown', e => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && st.phase === 'form') go();
    });

    render();
    status().then(info => {
      st.info = info;
      st.phase = info.connected && info.providers.length ? 'form' : 'offline';
      if (info.connected && !info.providers.length) st.info.error = 'The AI helper is running, but no AI key has been added to it yet.';
      if (host.isConnected) render();
    });
  }

  return { open, settings, endpoint, parseJSON, clean };
})();
