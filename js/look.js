'use strict';

/*
 * Personalize: how the site looks for you. Theme, accent color, text size, fonts and motion.
 * Saved with your other settings (and to your account if you're signed in), and applied as
 * attributes on <html> that css/styles.css turns into colors and sizes.
 */
const Look = (() => {
  const esc = Util.esc;
  const DEFAULTS = { theme: 'night', accent: 'verdigris', text: 'standard', font: 'storybook', motion: 'normal' };

  const THEMES = [
    ['night', 'Night', 'Ink blue, the original', ['#151823', '#1d2130', '#ebe5d6']],
    ['forest', 'Forest', 'Deep green and moss', ['#121a16', '#18231d', '#e7ebdc']],
    ['ember', 'Ember', 'Warm firelit browns', ['#1a1413', '#231b19', '#f0e4d7']],
    ['parchment', 'Parchment', 'Light, like a printed page', ['#f3eee3', '#fffbf3', '#2a2318']],
  ];
  const ACCENTS = [
    ['verdigris', 'Verdigris', '#5cbfae'], ['gold', 'Gold', '#e3b654'], ['violet', 'Violet', '#b78ad8'],
    ['blue', 'Blue', '#7ea6e8'], ['crimson', 'Crimson', '#e0705f'],
  ];
  const TEXT = [['standard', 'Standard'], ['large', 'Large'], ['larger', 'Larger']];
  const FONTS = [['storybook', 'Storybook', 'Alegreya'], ['classic', 'Classic', 'Book serif'], ['plain', 'Plain', 'Simple and clean']];

  const current = () => Object.assign({}, DEFAULTS, Store.state.look || {});

  function apply(look = current()) {
    const d = document.documentElement.dataset;
    Object.keys(DEFAULTS).forEach(k => {
      if (look[k] && look[k] !== DEFAULTS[k]) d[k] = look[k]; else delete d[k];
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#151823';
  }

  function set(key, value) {
    Store.state.look = Object.assign(current(), { [key]: value });
    Store.save();
    apply();
  }

  const PALETTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.7-.9 1.7-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7h2.1A4.5 4.5 0 0 0 21 10.6C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7.2" r="1.2"/><circle cx="14.5" cy="7.2" r="1.2"/></svg>';

  function open() {
    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal look-modal" role="dialog" aria-modal="true" aria-labelledby="look-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const lastFocus = document.activeElement;
    const close = () => { document.removeEventListener('keydown', onKey); host.remove(); if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    function render() {
      const L = current();
      const pressed = (k, v) => `aria-pressed="${L[k] === v}"`;
      body.innerHTML = `
        <header class="modal-head"><div><h2 id="look-title">Personalize</h2><p class="muted">Make the site yours. Changes apply right away${typeof Account !== 'undefined' && Account.signedIn() ? ' and follow you to your other devices' : ''}.</p></div>
          <button class="icon-btn" data-act="close" aria-label="Close">×</button></header>
        <div class="modal-body">
          <section class="look-group"><h3>Theme</h3><div class="look-opts">
            ${THEMES.map(([k, name, desc, sw]) => `<button class="look-opt" data-k="theme" data-v="${k}" ${pressed('theme', k)}>
              <span class="look-swatch">${sw.map(c => `<i style="background:${c}"></i>`).join('')}</span><b>${esc(name)}</b><small>${esc(desc)}</small></button>`).join('')}
          </div></section>
          <section class="look-group"><h3>Accent color</h3><div class="look-accents">
            ${ACCENTS.map(([k, name, c]) => `<button class="look-accent" style="background:${c}" data-k="accent" data-v="${k}" ${pressed('accent', k)} aria-label="${esc(name)}" title="${esc(name)}"></button>`).join('')}
          </div></section>
          <section class="look-group"><h3>Text size</h3><div class="look-row">
            ${TEXT.map(([k, name], i) => `<button class="look-opt" data-k="text" data-v="${k}" ${pressed('text', k)}><b style="font-size:${1 + i * 0.12}rem">${esc(name)}</b></button>`).join('')}
          </div></section>
          <section class="look-group"><h3>Fonts</h3><div class="look-row">
            ${FONTS.map(([k, name, desc]) => `<button class="look-opt" data-k="font" data-v="${k}" ${pressed('font', k)}><b>${esc(name)}</b><small>${esc(desc)}</small></button>`).join('')}
          </div></section>
          <section class="look-group"><label class="look-check"><input type="checkbox" data-motion ${L.motion === 'reduce' ? 'checked' : ''}> Reduce motion (no animations)</label></section>
        </div>
        <footer class="modal-foot"><button class="btn" data-act="reset">Reset to default</button><span class="foot-hint"></span><button class="btn btn-primary" data-act="close">Done</button></footer>`;
    }

    host.addEventListener('click', e => {
      if (e.target === host) return close();
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'close') return close();
      if (b.dataset.act === 'reset') { Store.state.look = {}; Store.save(); apply(); render(); return; }
      if (b.dataset.k) {
        set(b.dataset.k, b.dataset.v);
        render();
        body.querySelector(`[data-k="${b.dataset.k}"][data-v="${b.dataset.v}"]`)?.focus({ preventScroll: true });
      }
    });
    host.addEventListener('change', e => { if (e.target.matches('[data-motion]')) set('motion', e.target.checked ? 'reduce' : 'normal'); });
    render();
    body.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }

  /* A small palette button for the top bar. */
  function button() {
    return `<button class="look-btn" data-look aria-label="Personalize" title="Personalize">${PALETTE}</button>`;
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-look]')) open(); });

  apply();
  return { open, apply, button, current };
})();
