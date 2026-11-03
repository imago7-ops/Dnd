/* Battle maps from the DM's campaign page: build and prepare maps before
   opening the party room. Uses the same editor as the room. */
const MapsDialog = (() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function open(cp, opts = {}) {
    const host = document.createElement('div');
    host.className = 'guide-backdrop maps-backdrop';
    host.innerHTML = `
      <div class="maps-dialog" role="dialog" aria-modal="true" aria-label="Battle maps">
        <header class="maps-head">
          <div>
            <span class="guide-kicker">Battle maps</span>
            <b>${esc(cp.name || 'Untitled campaign')}</b>
          </div>
          <button class="btn" data-ref="close">Done</button>
        </header>
        <p class="muted small maps-hint">Build your maps here before the session. When you open the party room, the map you choose to show appears for players, and everything you've hidden stays hidden.</p>
        <div class="maps-body" data-ref="bm"></div>
      </div>`;
    document.body.appendChild(host);
    document.body.classList.add('guide-open');
    const lastFocus = document.activeElement;
    const bm = Battlemap.mount(host.querySelector('[data-ref="bm"]'), { isDM: true, campaignId: cp.id });

    function close() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', close);
      if (bm && bm.cleanup) bm.cleanup();
      host.remove();
      document.body.classList.remove('guide-open', 'bm-lock');
      if (opts.onClose) opts.onClose();
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    function onKey(e) {
      if (e.key !== 'Escape') return;
      if (host.querySelector('.bm-fullscreen')) return; // Escape leaves full screen first
      if (e.target.closest && e.target.closest('input, textarea, select, dialog')) return;
      if (document.querySelector('dialog[open]')) return;
      close();
    }
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', close);
    host.querySelector('[data-ref="close"]').addEventListener('click', close);
    host.querySelector('[data-ref="close"]').focus({ preventScroll: true });
    return { close };
  }

  return { open };
})();
