'use strict';

/* App shell, role choice and page routing (#/character, #/campaign, #/combat). */
const App = (() => {
  const PAGES = {
    player: [['character', 'Character'], ['room', 'Party room']],
    dm: [['campaign', 'Campaign'], ['room', 'Party room']],
  };
  const MODULES = { character: Character, campaign: Campaign, room: Party };
  const ROLE_NAME = { player: 'Player', dm: 'Dungeon Master' };

  const MAP_SVG = `<svg viewBox="0 0 120 100" aria-hidden="true"><path class="map-sheet" d="M8 18 L40 8 L80 18 L112 8 L112 82 L80 92 L40 82 L8 92 Z"/><path class="map-fold" d="M40 8 L40 82 M80 18 L80 92"/><path class="map-route" d="M20 70 C 34 58, 30 40, 52 42 S 76 58, 92 34"/><path class="map-x" d="M88 28 L98 38 M98 28 L88 38"/></svg>`;

  const app = document.getElementById('app');

  function currentPage() {
    return location.hash.replace(/^#\/?/, '').split('/')[0];
  }

  function welcome() {
    document.title = 'Campaign Codex';
    app.innerHTML = `
      <main class="welcome">
        <div class="welcome-inner">
          <div class="brand brand-lg">${Dice.D20_SVG}<span>Campaign Codex</span></div>
          <h1>How are you joining the table?</h1>
          <p class="lede">Pick one to get started. You can switch later, and everything saves in this browser.</p>
          <div class="role-grid">
            <button class="role-card role-player" data-role="player">
              <span class="role-art">${Dice.D20_SVG}</span>
              <span class="role-title">I'm a player</span>
              <span class="role-desc">Create a character or upload one you've already made, then roll checks, saves and attacks straight from your sheet.</span>
              <span class="role-go">Start as a player</span>
            </button>
            <button class="role-card role-dm" data-role="dm">
              <span class="role-art">${MAP_SVG}</span>
              <span class="role-title">I'm the Dungeon Master</span>
              <span class="role-desc">Build your campaign section by section: NPCs, locations, factions, bosses, weather and more, then run the fight.</span>
              <span class="role-go">Start as the DM</span>
            </button>
          </div>
        </div>
      </main>`;

    app.querySelector('.role-grid').addEventListener('click', e => {
      const btn = e.target.closest('[data-role]');
      if (!btn) return;
      if (Room.state.mode && Store.state.role !== btn.dataset.role) Room.leave();
      Store.state.role = btn.dataset.role;
      Store.flush();
      location.hash = '#/' + PAGES[btn.dataset.role][0][0];
    });
  }

  function shell(role) {
    app.innerHTML = `
      <div class="shell">
        <header class="topbar">
          <a class="brand" href="#/">${Dice.D20_SVG}<span>Campaign Codex</span></a>
          <nav class="tabs" aria-label="Pages">
            ${PAGES[role].map(([k, label]) => `<a href="#/${k}" data-page="${k}">${label}</a>`).join('')}
          </nav>
          <div class="topbar-end">
            <a class="room-pill" data-ref="roomPill" href="#/room" hidden></a>
            <span class="role-pill role-${role}">${ROLE_NAME[role]}</span>
            <a class="link-btn" href="#/welcome">Switch role</a>
          </div>
        </header>
        <main class="main" id="main"></main>
        <aside class="tray-col" id="tray"></aside>
      </div>`;
    Dice.mount(document.getElementById('tray'));
    renderRoomPill();
  }

  /* Small badge in the top bar while you're in a party room. */
  function renderRoomPill() {
    const pill = document.querySelector('[data-ref="roomPill"]');
    if (!pill) return;
    const st = Room.state;
    const live = st.mode && (st.status === 'open' || st.status === 'connecting' || st.status === 'reconnecting');
    pill.hidden = !live;
    if (!live) return;
    pill.dataset.status = st.status;
    pill.innerHTML = `<span class="dot"></span>${st.status === 'open' ? 'Room' : 'Connecting'} <b>${st.code}</b>`;
  }
  Room.on(renderRoomPill);

  function route() {
    let page = currentPage();
    if (page === 'combat') { page = 'room'; history.replaceState(null, '', '#/room'); }
    // Shared links go straight to a role's page: #/character = player, #/campaign = DM.
    const linkRole = { character: 'player', campaign: 'dm' }[page];
    if (linkRole && Store.state.role !== linkRole) {
      Store.state.role = linkRole;
      Store.flush();
    }
    const role = Store.state.role;

    if (!role || page === 'welcome') {
      return welcome();
    }
    const allowed = PAGES[role].map(p => p[0]);
    if (!allowed.includes(page)) {
      page = allowed[0];
      history.replaceState(null, '', '#/' + page);
    }

    if (!document.querySelector(`.shell[data-role="${role}"]`)) {
      shell(role);
      app.querySelector('.shell').dataset.role = role;
    }

    app.querySelectorAll('.tabs a').forEach(a => {
      const on = a.dataset.page === page;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    const main = document.getElementById('main');
    main.dataset.page = page;
    const view = document.createElement('div');
    view.className = 'view';
    main.replaceChildren(view);
    MODULES[page].mount(view);
    document.title = `${PAGES[role].find(p => p[0] === page)[1]} – Campaign Codex`;
  }

  window.addEventListener('hashchange', route);
  route();
  Room.resume();

  return { route };
})();
