'use strict';

/* Shared helpers used by every page. */
const Util = {
  uid() {
    return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  },
  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  },
  fmtMod(n) {
    n = Number(n) || 0;
    return (n >= 0 ? '+' : '−') + Math.abs(n);
  },
  num(v, fallback = 0) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  },
  clamp: (n, a, b) => Math.min(b, Math.max(a, n)),
  slug(s) {
    return (s || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';
  },
  download(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  /* Opens a file picker and resolves with the parsed JSON. */
  pickJSON() {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try { resolve(JSON.parse(reader.result)); }
          catch { reject(new Error(`"${file.name}" isn't a valid character or campaign file.`)); }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },
  toast(message, kind = 'info') {
    const box = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.textContent = message;
    box.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  },
  /* Read/write a nested value like "hp.current". */
  getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  },
  setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = value;
  },
  reducedMotion() {
    return document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
};

/* Everything is saved to localStorage in this browser. */
const Store = (() => {
  // ?profile=name keeps separate saved data per tab (used for testing the party room).
  const profile = (/[?&]profile=([\w-]+)/.exec(location.search) || [])[1];
  const suffix = profile ? `.${profile}` : '';
  const KEY = 'campaign-codex.v1' + suffix;
  const defaults = () => ({
    role: null,                 // 'player' | 'dm'
    characters: [],
    activeCharacterId: null,
    campaign: null,
    combat: { round: 1, activeId: null, started: false, combatants: [] },
    rolls: [],
    diceMode: 'normal',         // applies to the next d20
  });

  let state;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    state = Object.assign(defaults(), saved || {});
  } catch {
    state = defaults();
  }

  let timer = null;
  function flush() {
    clearTimeout(timer);
    timer = null;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { Util.toast('Couldn\'t save: browser storage is full or blocked.', 'error'); }
  }
  function save() {
    clearTimeout(timer);
    timer = setTimeout(flush, 200);
    // Lets the party room notice changes (combat, character, campaign) and share them.
    window.dispatchEvent(new CustomEvent('codex:save'));
  }
  window.addEventListener('beforeunload', () => { if (timer) flush(); });

  /* Swap in a whole different saved state (signing in or out). */
  function replace(next) {
    state = Object.assign(defaults(), next || {});
    flush();
  }

  return {
    get state() { return state; },
    save,
    flush,
    replace,
    defaults,
    KEY,
    suffix,
  };
})();
