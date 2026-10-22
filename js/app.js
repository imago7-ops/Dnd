'use strict';

/* App shell, role choice and page routing (#/character, #/campaign, #/combat). */
const App = (() => {
  const PAGES = {
    player: [['character', 'Character'], ['combat', 'Combat']],
    dm: [['campaign', 'Campaign'], ['combat', 'Combat']],
  };
  const MODULES = { character: Character, campaign: Campaign, combat: Combat };
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
              <span class="role-desc">Start with an empty table and build your campaign: places, people, quests and encounters, then run the fight.</span>
              <span class="role-go">Start as the DM</span>
            </button>
          </div>
        </div>
      </main>`;

    app.querySelector('.role-grid').addEventListener('click', e => {
      const btn = e.target.closest('[data-role]');
      if (!btn) return;
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
            <span class="role-pill role-${role}">${ROLE_NAME[role]}</span>
            <a class="link-btn" href="#/welcome">Switch role</a>
          </div>
        </header>
        <main class="main" id="main"></main>
        <aside class="tray-col" id="tray"></aside>
      </div>`;
    Dice.mount(document.getElementById('tray'));
  }

  function route() {
    const role = Store.state.role;
    let page = currentPage();

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

  return { route };
})();
