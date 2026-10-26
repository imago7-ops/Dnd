'use strict';

/*
 * DM campaign notebook: one collapsible section per part of the campaign
 * (NPCs, locations, factions, bosses, weather, abnormalities…). Each section holds
 * entries that expand into a form with fields suited to that kind of thing.
 */
const Campaign = (() => {
  const esc = Util.esc;

  /* Field: [key, label, type, options]. type: text | textarea | select | number | date */
  const TYPES = {
    npcs: {
      label: 'NPCs', one: 'NPC', color: 'var(--violet)',
      blurb: 'The people your players meet.',
      fields: [
        ['name', 'Name', 'text'], ['role', 'Role or occupation', 'text'],
        ['location', 'Usually found at', 'text', 'locations'], ['faction', 'Faction', 'text', 'factions'],
        ['attitude', 'Attitude toward the party', 'select', ['', 'Friendly', 'Indifferent', 'Hostile']],
        ['ac', 'AC', 'number'], ['hp', 'HP', 'number'],
        ['appearance', 'Appearance', 'textarea'], ['personality', 'Personality and voice', 'textarea'],
        ['wants', 'Wants and fears', 'textarea'], ['secrets', 'Secrets', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['role', 'location'], badge: 'attitude', combat: 'single',
    },
    locations: {
      label: 'Locations', one: 'location', color: 'var(--accent)',
      blurb: 'Cities, dungeons, wilds and everywhere in between.',
      fields: [
        ['name', 'Name', 'text'],
        ['kind', 'Type', 'select', ['', 'City', 'Town', 'Village', 'Dungeon', 'Wilderness', 'Building', 'Ruin', 'Plane', 'Other']],
        ['region', 'Region', 'text'],
        ['description', 'Description', 'textarea'], ['inhabitants', "Who's here", 'textarea'],
        ['points', 'Points of interest', 'textarea'], ['secrets', 'Secrets', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['kind', 'region'],
    },
    factions: {
      label: 'Factions', one: 'faction', color: 'var(--blue)',
      blurb: 'Guilds, cults, kingdoms and other groups with an agenda.',
      fields: [
        ['name', 'Name', 'text'], ['leader', 'Leader', 'text'], ['base', 'Headquarters', 'text', 'locations'],
        ['standing', 'Standing with the party', 'select', ['', 'Allied', 'Friendly', 'Neutral', 'Wary', 'Hostile']],
        ['goals', 'Goals', 'textarea'], ['resources', 'Members and resources', 'textarea'],
        ['allies', 'Allies', 'textarea'], ['enemies', 'Enemies', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['leader', 'base'], badge: 'standing',
    },
    bosses: {
      label: 'Bosses', one: 'boss', color: 'var(--red)',
      blurb: 'Villains and big fights worth planning in detail.',
      fields: [
        ['name', 'Name', 'text'], ['cr', 'Challenge rating', 'text'], ['ac', 'AC', 'number'], ['hp', 'HP', 'number'],
        ['location', 'Lair or location', 'text', 'locations'], ['faction', 'Faction', 'text', 'factions'],
        ['motive', 'Motive', 'textarea'], ['tactics', 'Abilities and tactics', 'textarea'],
        ['legendary', 'Legendary and lair actions', 'textarea'], ['phases', 'Phases or weaknesses', 'textarea'],
        ['loot', 'Loot', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['location'], badge: 'cr', badgePrefix: 'CR ', combat: 'single',
    },
    monsters: {
      label: 'Monsters and enemies', one: 'monster', color: '#c77d5a',
      blurb: 'Creatures and foes with quick stats, ready to drop into a fight.',
      fields: [
        ['name', 'Name', 'text'], ['ctype', 'Size and type', 'text'], ['cr', 'Challenge rating', 'text'],
        ['ac', 'AC', 'number'], ['hp', 'HP', 'number'], ['speed', 'Speed', 'text'],
        ['abilities', 'Ability scores (STR DEX CON INT WIS CHA)', 'text'],
        ['traits', 'Traits', 'textarea'], ['actions', 'Actions and attacks', 'textarea'],
        ['tactics', 'Tactics', 'textarea'], ['habitat', 'Where it is found', 'text', 'locations'],
        ['loot', 'Loot', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['ctype', 'habitat'], badge: 'cr', badgePrefix: 'CR ', combat: 'single',
    },
    weather: {
      label: 'Weather', one: 'weather', color: '#8cc3dd',
      blurb: 'Conditions by region or day. Roll it or write your own.',
      fields: [
        ['name', 'Name or date', 'text'], ['region', 'Region', 'text', 'locations'],
        ['season', 'Season', 'select', ['', 'Spring', 'Summer', 'Autumn', 'Winter']],
        ['conditions', 'Conditions', 'text'], ['temperature', 'Temperature', 'text'], ['wind', 'Wind', 'text'],
        ['effects', 'Effects on travel and combat', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['conditions', 'region'], badge: 'season', roll: true,
    },
    abnormalities: {
      label: 'Abnormalities', one: 'abnormality', color: 'var(--gold)',
      blurb: 'Curses, wild magic zones, planar rifts and strange phenomena.',
      fields: [
        ['name', 'Name', 'text'],
        ['kind', 'Type', 'select', ['', 'Magical', 'Planar', 'Curse', 'Divine', 'Aberrant', 'Natural phenomenon', 'Unknown']],
        ['location', 'Where', 'text', 'locations'],
        ['description', 'What people notice', 'textarea'], ['effects', 'Effects in play', 'textarea'],
        ['cause', 'True cause', 'textarea'], ['resolution', 'How it can be ended', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['location'], badge: 'kind',
    },
    quests: {
      label: 'Quests', one: 'quest', color: '#c9a86a',
      blurb: 'Hooks, jobs and story threads.',
      fields: [
        ['name', 'Name', 'text'], ['status', 'Status', 'select', ['Not started', 'Active', 'Completed', 'Failed']],
        ['giver', 'Quest giver', 'text', 'npcs'], ['location', 'Location', 'text', 'locations'], ['reward', 'Reward', 'text'],
        ['description', 'Hook and objective', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['giver', 'reward'], badge: 'status',
    },
    encounters: {
      label: 'Encounters', one: 'encounter', color: '#e08a6a',
      blurb: 'Planned fights and dangers. Add the creatures to combat in one click.',
      fields: [
        ['name', 'Name', 'text'], ['location', 'Location', 'text', 'locations'],
        ['difficulty', 'Difficulty', 'select', ['', 'Low', 'Moderate', 'High']],
        ['creatures', 'Creatures (one per line, e.g. "3 Goblin")', 'textarea'],
        ['terrain', 'Terrain and hazards', 'textarea'], ['tactics', 'Tactics', 'textarea'], ['treasure', 'Treasure', 'textarea'],
      ],
      summary: ['location'], badge: 'difficulty', combat: 'creatures',
    },
    items: {
      label: 'Items and loot', one: 'item', color: 'var(--blue)',
      blurb: 'Magic items, treasure and plot objects.',
      fields: [
        ['name', 'Name', 'text'],
        ['rarity', 'Rarity', 'select', ['', 'Common', 'Uncommon', 'Rare', 'Very rare', 'Legendary', 'Artifact']],
        ['attunement', 'Requires attunement', 'select', ['', 'No', 'Yes']],
        ['holder', 'Held by or found at', 'text'], ['description', 'What it does', 'textarea'], ['notes', 'Notes', 'textarea'],
      ],
      summary: ['holder'], badge: 'rarity',
    },
    lore: {
      label: 'Lore and history', one: 'lore entry', color: 'var(--muted)',
      blurb: 'Myths, history, religions and world facts.',
      fields: [['name', 'Title', 'text'], ['era', 'Era or date', 'text'], ['details', 'Details', 'textarea']],
      summary: ['era'],
    },
    sessions: {
      label: 'Session notes', one: 'session', color: 'var(--faint)',
      blurb: 'One folder per session: the plan, what happened, and everything tagged for it.',
      fields: [['name', 'Title', 'text'], ['level', 'Party level', 'text'], ['date', 'Date played', 'date'],
        ['plan', 'Plan and key scenes', 'textarea'], ['summary', 'What happened', 'textarea'], ['prep', 'Prep for next time', 'textarea']],
      summary: ['date'], linked: true,
    },
  };
  const CUSTOM = {
    one: 'entry', color: 'var(--faint)', blurb: 'Your own section.',
    fields: [['name', 'Name', 'text'], ['details', 'Details', 'textarea'], ['notes', 'Notes', 'textarea']],
    summary: [],
  };
  const DEFAULT_ORDER = Object.keys(TYPES);

  /* ---------- Data ---------- */
  function blank() {
    return {
      format: 'campaign-codex-campaign', version: 2, name: '', pitch: '',
      sections: DEFAULT_ORDER.map((type, i) => ({ id: type, type, label: TYPES[type].label, open: i === 0, entries: [] })),
    };
  }

  /* Bring older saves (the drag-around board) into sections. */
  function migrate(cp) {
    if (cp && Array.isArray(cp.sections)) {
      // Add any section types introduced since this campaign was saved.
      DEFAULT_ORDER.forEach(type => {
        if (!cp.sections.some(s => s.type === type)) cp.sections.push({ id: type, type, label: TYPES[type].label, open: false, entries: [] });
      });
      return cp;
    }
    const next = blank();
    if (cp) {
      next.name = cp.name || '';
      const map = { npc: 'npcs', location: 'locations', quest: 'quests', encounter: 'encounters', item: 'items', note: 'sessions' };
      const bodyField = { npcs: 'notes', locations: 'description', quests: 'description', encounters: 'tactics', items: 'description', sessions: 'summary' };
      (cp.cards || []).forEach(card => {
        const type = map[card.type] || 'sessions';
        const sec = next.sections.find(s => s.type === type);
        sec.entries.push({ id: card.id || Util.uid(), open: false, f: { name: card.title || '', [bodyField[type]]: card.body || '' } });
      });
      next.sections.forEach(s => { s.open = s.entries.length > 0; });
      if (!next.sections.some(s => s.open)) next.sections[0].open = true;
    }
    return next;
  }

  /* ---------- Campaign folders ---------- */
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
  const emptyCombat = () => ({ round: 1, activeId: null, started: false, combatants: [] });

  /* A party room code no other campaign in this browser is using. */
  function newRoomCode(existing) {
    const taken = new Set((existing || Store.state.campaigns || []).map(c => c.roomCode));
    let code;
    do {
      const buf = new Uint32Array(5);
      crypto.getRandomValues(buf);
      code = Array.from(buf, x => CODE_CHARS[x % CODE_CHARS.length]).join('');
    } while (taken.has(code));
    return code;
  }

  /* Turn campaign content (new, uploaded or migrated) into a campaign folder. */
  function adopt(content, existing) {
    const c = migrate(content);
    c.id = Util.uid();
    c.roomCode = newRoomCode(existing);
    c.combat = emptyCombat();
    c.feed = [];
    c.created = c.updated = Date.now();
    return c;
  }

  /* Older saves had a single campaign; move it into the folder list once. */
  function ensure() {
    const s = Store.state;
    if (Array.isArray(s.campaigns)) return s.campaigns;
    const all = [];
    const old = s.campaign;
    const hasOld = old && (old.name || (Array.isArray(old.sections) && old.sections.some(x => x.entries.length)) || (Array.isArray(old.cards) && old.cards.length));
    const hasFight = s.combat && Array.isArray(s.combat.combatants) && s.combat.combatants.length;
    if (hasOld || hasFight) {
      const c = adopt(old || blank(), all);
      if (s.combat && Array.isArray(s.combat.combatants)) c.combat = s.combat;
      if (s.room && Array.isArray(s.room.feed)) c.feed = s.room.feed;
      all.push(c);
      s.activeCampaignId = c.id;
    }
    s.campaigns = all;
    delete s.campaign; delete s.combat; delete s.room;
    Store.save();
    return all;
  }

  const list = () => ensure();
  const byId = id => list().find(c => c.id === id) || null;
  function activeId() {
    const all = list();
    return (byId(Store.state.activeCampaignId) && Store.state.activeCampaignId) || (all[0] && all[0].id) || null;
  }
  function create(content) {
    const all = list();
    const c = adopt(content || blank(), all);
    all.unshift(c);
    Store.state.activeCampaignId = c.id;
    Store.save();
    return c;
  }
  /* Campaign content from a premade starter campaign. */
  function fromPremade(p) {
    const c = blank();
    c.name = p.name;
    c.pitch = p.pitch;
    c.source = `Premade: ${p.name} (levels ${p.levels})`;
    c.premadeKey = p.key;
    // A battle map for every planned encounter, creatures placed and the party's start revealed.
    c.maps = typeof PremadeMaps !== 'undefined' ? PremadeMaps.forKey(p.key) : [];
    c.sections.forEach(sec => {
      const t = TYPES[sec.type];
      sec.entries = (p.sections[sec.type] || []).map(({ known, tags, ...fields }) => {
        const f = {};
        t.fields.forEach(([k, , type, opt]) => { if (type === 'select') f[k] = opt[0]; });
        Object.entries(fields).forEach(([k, v]) => { f[k] = typeof v === 'number' ? String(v) : v; });
        return { id: Util.uid(), open: false, known: Boolean(known), tags: tags ? [...tags] : [], f };
      });
      sec.open = sec.type === 'sessions' || sec.type === 'locations';
    });
    // Put the "Running this campaign" notes first so the DM sees them straight away.
    const ses = c.sections.findIndex(s => s.type === 'sessions');
    if (ses > 0) c.sections.unshift(...c.sections.splice(ses, 1));
    return c;
  }

  /* An empty campaign for an official adventure the DM owns. */
  function fromBook(title) {
    const c = blank();
    c.name = title;
    c.pitch = `Running ${title}. Fill in the sections from your copy of the book.`;
    c.source = `Official book: ${title}`;
    return c;
  }

  /* "New campaign" chooser: blank, premade or from a book. done(content) */
  function openChooser(done) {
    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal new-camp-modal" role="dialog" aria-modal="true" aria-labelledby="nc-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const lastFocus = document.activeElement;
    let tab = 'start';
    let pick = null;
    const close = () => { document.removeEventListener('keydown', onKey); host.remove(); if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    const head = (title, sub) => `
      <header class="modal-head">
        <div><h2 id="nc-title">${esc(title)}</h2><p class="muted">${sub}</p></div>
        <button class="icon-btn" data-act="close" aria-label="Close">×</button>
      </header>`;

    function render() {
      if (tab === 'start') {
        body.innerHTML = `${head('New campaign', 'Start from scratch, or begin with a campaign that is ready to run.')}
          <div class="modal-body"><div class="nc-choices">
            <button class="nc-choice" data-act="blank"><b>Create my own</b><span>An empty campaign notebook for your own world.</span></button>
            <button class="nc-choice" data-act="premades"><b>Use a premade campaign</b><span>${Premades.list.length} ready-to-run adventures with NPCs, places, monsters, encounters and a session plan. Everything stays editable.</span></button>
            <button class="nc-choice" data-act="book"><b>From an official book</b><span>Running a published adventure you own? Get a campaign set up for it and fill it in from your book.</span></button>
          </div></div>`;
      } else if (tab === 'premades') {
        body.innerHTML = `${head('Premade campaigns', 'Original adventures written for this site. Everything starts Hidden except what the players would know at the start.')}
          <div class="modal-body"><div class="nc-premades">
            ${Premades.list.map(p => {
              const n = Object.values(p.sections).reduce((a, x) => a + x.length, 0);
              return `<button class="nc-premade ${pick === p.key ? 'on' : ''}" data-act="pick" data-key="${p.key}" aria-pressed="${pick === p.key}">
                <span class="nc-name">${esc(p.name)}</span>
                <span class="nc-meta">Levels ${esc(p.levels)} · ${esc(p.sessions)} · ${esc(p.tone)}</span>
                <span class="nc-pitch">${esc(p.pitch)}</span>
                <span class="nc-count">${n} entries ready to use</span>
              </button>`;
            }).join('')}
          </div></div>
          <footer class="modal-foot"><button class="btn" data-act="back">Back</button><span class="foot-hint"></span>
            <button class="btn btn-primary" data-act="use" ${pick ? '' : 'disabled'}>Use this campaign</button></footer>`;
      } else {
        body.innerHTML = `${head('From an official book', 'The adventure\'s contents belong to its publisher, so this site doesn\'t include them. You\'ll get an empty campaign named after the book to fill in from your own copy.')}
          <div class="modal-body"><form class="nc-book" data-ref="bookForm" autocomplete="off">
            <label class="field"><span>Adventure</span>
              <select data-ref="book">${Premades.books.map(b => `<option>${esc(b)}</option>`).join('')}<option value="">Another book…</option></select></label>
            <label class="field" data-ref="otherWrap" hidden><span>Book title</span><input data-ref="other" placeholder="Title of the adventure"></label>
            <p class="muted small">Don't have it yet? Official adventures are sold at <a href="https://www.dndbeyond.com/marketplace" target="_blank" rel="noopener">D&amp;D Beyond</a> and game stores. Campaign Codex is a fan project, not affiliated with Wizards of the Coast.</p>
          </form></div>
          <footer class="modal-foot"><button class="btn" data-act="back">Back</button><span class="foot-hint"></span>
            <button class="btn btn-primary" data-act="use-book">Create campaign</button></footer>`;
        const sel = body.querySelector('[data-ref="book"]');
        sel.onchange = () => { body.querySelector('[data-ref="otherWrap"]').hidden = sel.value !== ''; if (sel.value === '') body.querySelector('[data-ref="other"]').focus(); };
      }
      body.querySelector('.nc-choice, .nc-premade, select')?.focus({ preventScroll: true });
    }

    host.addEventListener('click', e => {
      if (e.target === host) return close();
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      switch (b.dataset.act) {
        case 'close': return close();
        case 'blank': close(); return done(null);
        case 'premades': tab = 'premades'; return render();
        case 'book': tab = 'book'; return render();
        case 'back': tab = 'start'; return render();
        case 'pick':
          pick = b.dataset.key;
          body.querySelectorAll('.nc-premade').forEach(x => { const on = x.dataset.key === pick; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
          body.querySelector('[data-act="use"]').disabled = false;
          return;
        case 'use': { const p = Premades.byKey(pick); if (!p) return; close(); return done(fromPremade(p)); }
        case 'use-book': {
          const sel = body.querySelector('[data-ref="book"]').value;
          const title = (sel || body.querySelector('[data-ref="other"]').value).trim();
          if (!title) return Util.toast('Type the book\'s title first.', 'error');
          close(); return done(fromBook(title));
        }
      }
    });
    body.addEventListener('dblclick', e => { const b = e.target.closest('.nc-premade'); if (b) { pick = b.dataset.key; body.querySelector('[data-act="use"]').click(); } });
    render();
  }

  function combatOf(id) {
    const c = byId(id || activeId());
    if (!c) return null;
    if (!c.combat || !Array.isArray(c.combat.combatants)) c.combat = emptyCombat();
    return c.combat;
  }
  /* What goes in a downloaded file: the notes, not the room code or live combat. */
  function exportable(c) {
    const { id, roomCode, combat, feed, created, updated, ...content } = c;
    return content;
  }

  const typeOf = sec => TYPES[sec.type] || CUSTOM;

  /* ---------- Weather roller ---------- */
  const W = {
    conditions: {
      Spring: ['Clear skies', 'Partly cloudy', 'Overcast', 'Light rain', 'Light rain', 'Heavy rain', 'Thunderstorm', 'Fog'],
      Summer: ['Clear skies', 'Clear skies', 'Clear skies', 'Partly cloudy', 'Partly cloudy', 'Thunderstorm', 'Heavy rain', 'Hazy heat'],
      Autumn: ['Clear skies', 'Partly cloudy', 'Overcast', 'Overcast', 'Light rain', 'Heavy rain', 'Fog', 'Fog'],
      Winter: ['Clear skies', 'Overcast', 'Overcast', 'Light snow', 'Light snow', 'Heavy snow', 'Blizzard', 'Sleet', 'Fog'],
    },
    temperature: {
      Spring: ['Cool', 'Mild', 'Mild', 'Warm'], Summer: ['Warm', 'Hot', 'Hot', 'Sweltering'],
      Autumn: ['Chilly', 'Cool', 'Mild', 'Cool'], Winter: ['Cold', 'Cold', 'Freezing', 'Bitter cold'],
    },
    wind: ['Calm', 'Calm', 'Light breeze', 'Light breeze', 'Moderate wind', 'Strong wind', 'Gale'],
    effects: {
      'Heavy rain': 'Lightly obscured. Disadvantage on Wisdom (Perception) checks that rely on sight or hearing. Open flames go out.',
      'Thunderstorm': 'Heavy rain and strong wind: lightly obscured, disadvantage on Perception and on ranged weapon attacks, open flames go out.',
      'Fog': 'Lightly obscured in light fog, heavily obscured in thick fog. Travel is slower and getting lost is easier.',
      'Light snow': 'Lightly obscured at a distance. Fresh tracks are easy to follow.',
      'Heavy snow': 'Heavily obscured and difficult terrain. Disadvantage on Perception checks that rely on sight.',
      'Blizzard': 'Heavily obscured, difficult terrain, strong wind. Shelter is a priority.',
      'Sleet': 'Lightly obscured. Ground may be slippery (difficult terrain).',
      'Hazy heat': 'Long exertion without water risks Exhaustion.',
    },
    windFx: {
      'Strong wind': 'Strong wind: disadvantage on ranged weapon attacks and on Perception checks that rely on hearing; open flames go out; flying is harder.',
      'Gale': 'Gale: as strong wind, and small creatures or flyers may be pushed around.',
    },
    tempFx: {
      'Freezing': 'Extreme cold: without cold-weather gear, creatures risk Exhaustion each hour outdoors.',
      'Bitter cold': 'Extreme cold: without cold-weather gear, creatures risk Exhaustion each hour outdoors.',
      'Sweltering': 'Extreme heat: without plenty of water, creatures risk Exhaustion each hour of exertion.',
    },
  };
  const pick = list => list[Dice.evaluate(`1d${list.length}`).total - 1];

  function rollWeather(f) {
    const season = f.season || pick(['Spring', 'Summer', 'Autumn', 'Winter']);
    f.season = season;
    f.conditions = pick(W.conditions[season]);
    f.temperature = pick(W.temperature[season]);
    f.wind = pick(W.wind);
    const fx = [W.effects[f.conditions], W.windFx[f.wind], W.tempFx[f.temperature]].filter(Boolean);
    f.effects = fx.length ? fx.join('\n') : 'No special effects.';
    if (!f.name) f.name = `${season} weather`;
  }

  /* ---------- UI ---------- */
  function mountNotebook(el, cp) {
    const save = () => { cp.updated = Date.now(); Store.save(); };
    let query = '';
    let show = 'all'; // all | known | hidden
    let tagFilter = ''; // show only entries with this tag

    el.innerHTML = `
      <div class="notebook">
        <a class="back-link" href="#/campaign">All campaigns</a>
        <header class="nb-head">
          <div class="nb-title">
            <input class="campaign-name" data-ref="name" value="${esc(cp.name)}" placeholder="Untitled campaign" aria-label="Campaign name">
            <textarea class="campaign-pitch" data-ref="pitch" rows="1" placeholder="One line about this campaign: the premise, the tone, the big threat…" aria-label="Campaign summary">${esc(cp.pitch || '')}</textarea>
            <button class="btn btn-guide" data-action="guide" data-ref="guideBtn" hidden><span aria-hidden="true">▶</span> Open the campaign guide</button>
          </div>
          <div class="nb-tools">
            <input type="search" class="nb-search" data-ref="search" placeholder="Search everything" aria-label="Search the campaign">
            <div class="seg vis-filter" role="radiogroup" aria-label="Show entries" data-ref="filter"></div>
            <select class="tag-filter" data-ref="tagFilter" aria-label="Show entries with a tag"></select>
            <a class="room-code-chip" href="#/room" title="Players join this campaign's party room with this code">Room code <b>${esc(cp.roomCode)}</b></a>
            <details class="menu">
              <summary class="btn">More</summary>
              <div class="menu-list">
                <button data-action="expand">Open every section</button>
                <button data-action="collapse">Close every section</button>
                <button data-action="export">Download this campaign</button>
              </div>
            </details>
          </div>
        </header>
        <div class="nb-sections" data-ref="sections"></div>
        <form class="nb-add-section" data-ref="addSection" autocomplete="off">
          <input data-ref="newSection" placeholder="New section name, e.g. gods, ships, rumors" aria-label="New section name">
          <button class="btn" type="submit">Add section</button>
        </form>
        <datalist id="dl-locations"></datalist>
        <datalist id="dl-factions"></datalist>
        <datalist id="dl-npcs"></datalist>
        <datalist id="dl-tags"></datalist>
      </div>`;

    const ref = n => el.querySelector(`[data-ref="${n}"]`);
    const sectionById = id => cp.sections.find(s => s.id === id);
    const findEntry = node => {
      const sec = sectionById(node.closest('[data-section]').dataset.section);
      const entryNode = node.closest('[data-entry]');
      return { sec, entry: entryNode && sec.entries.find(e => e.id === entryNode.dataset.entry) };
    };

    function names(type) {
      const sec = cp.sections.find(s => s.type === type);
      return sec ? sec.entries.map(e => e.f.name).filter(Boolean) : [];
    }
    function renderLists() {
      ['locations', 'factions', 'npcs'].forEach(t => {
        ref('sections').closest('.notebook').querySelector(`#dl-${t}`).innerHTML = names(t).map(n => `<option value="${esc(n)}">`).join('');
      });
      el.querySelector('#dl-tags').innerHTML = allTags().map(n => `<option value="${esc(n)}">`).join('');
    }

    const tagsOf = e => (Array.isArray(e.tags) ? e.tags : []);
    /* Every tag in the campaign, "Session 2" before "Session 10". */
    function allTags() {
      const set = new Set();
      cp.sections.forEach(sec => sec.entries.forEach(e => tagsOf(e).forEach(t => set.add(t))));
      return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }
    const filtering = () => Boolean(query || tagFilter);

    function matches(entry) {
      if (show === 'known' && !entry.known) return false;
      if (show === 'hidden' && entry.known) return false;
      if (tagFilter && !tagsOf(entry).includes(tagFilter)) return false;
      if (!query) return true;
      return Object.values(entry.f).some(v => String(v).toLowerCase().includes(query)) || tagsOf(entry).some(t => t.toLowerCase().includes(query));
    }

    const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ico" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle class="ico" cx="12" cy="12" r="3"/></svg>';
    const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="ico" d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17.6 17.6 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

    function visButton(e) {
      const known = Boolean(e.known);
      return `<button class="vis-toggle ${known ? 'known' : ''}" data-action="toggle-known" aria-pressed="${known}"
        title="${known ? 'Players know about this. Click to hide it.' : 'Hidden from players. Click to mark it known.'}">
        ${known ? EYE : EYE_OFF}<span>${known ? 'Known' : 'Hidden'}</span></button>`;
    }

    function renderFilter() {
      const all = cp.sections.reduce((n, sec) => n + sec.entries.length, 0);
      const known = cp.sections.reduce((n, sec) => n + sec.entries.filter(x => x.known).length, 0);
      ref('filter').innerHTML = [['all', `All (${all})`], ['known', `Known (${known})`], ['hidden', `Hidden (${all - known})`]]
        .map(([k, label]) => `<button role="radio" data-show="${k}" class="${show === k ? 'on' : ''}" aria-checked="${show === k}">${label}</button>`).join('');
      const tags = allTags();
      if (tagFilter && !tags.includes(tagFilter)) tagFilter = '';
      const sel = ref('tagFilter');
      sel.hidden = !tags.length;
      sel.innerHTML = `<option value="">All tags</option>${tags.map(t => `<option value="${esc(t)}" ${t === tagFilter ? 'selected' : ''}>${esc(t)}</option>`).join('')}`;
      sel.classList.toggle('on', Boolean(tagFilter));
    }

    function summaryOf(t, e) {
      return t.summary.map(k => e.f[k]).filter(Boolean).join(', ');
    }

    function entryHTML(sec, e) {
      const t = typeOf(sec);
      const badge = t.badge && e.f[t.badge] ? `${t.badgePrefix || ''}${e.f[t.badge]}` : '';
      const open = e.open || (query && matches(e));
      const tags = tagsOf(e);
      return `
        <article class="entry ${open ? 'open' : ''} ${e.known ? 'is-known' : 'is-hidden'}" data-entry="${e.id}">
          <div class="entry-row">
            <button class="entry-head" data-action="toggle-entry" aria-expanded="${open}">
              <span class="chev" aria-hidden="true"></span>
              <span class="entry-name ${e.f.name ? '' : 'unnamed'}">${esc(e.f.name || `Unnamed ${t.one}`)}</span>
              <span class="entry-meta">${esc(summaryOf(t, e))}</span>
              ${tags.length ? `<span class="tag-chips">${tags.map(x => `<span class="tag-chip">${esc(x)}</span>`).join('')}</span>` : ''}
              ${badge ? `<span class="badge" data-tone="${esc(String(e.f[t.badge]).toLowerCase().replace(/\s+/g, '-'))}">${esc(badge)}</span>` : ''}
            </button>
            ${visButton(e)}
          </div>
          ${open ? `<div class="entry-body">
            <div class="entry-grid">
              ${t.fields.map(([k, label, type, opt]) => fieldHTML(k, label, type, opt, e.f[k])).join('')}
            </div>
            <div class="tag-editor">
              <span class="tag-label">Tags</span>
              ${tags.map(x => `<span class="tag-chip edit"><button class="tag-go" data-action="filter-tag" data-tag="${esc(x)}" title="Show everything tagged ${esc(x)}">${esc(x)}</button><button class="tag-x" data-action="remove-tag" data-tag="${esc(x)}" aria-label="Remove tag ${esc(x)}">×</button></span>`).join('')}
              <form class="tag-add" data-action-form="add-tag" autocomplete="off">
                <input data-ref-tag list="dl-tags" placeholder="${tags.length ? 'Add tag' : 'Add a tag, e.g. Session 1'}" aria-label="Add a tag">
              </form>
            </div>
            ${t.linked ? linkedHTML(e) : ''}
            <div class="entry-actions">
              ${t.roll ? '<button class="btn" data-action="roll-weather">Roll random weather</button>' : ''}
              ${t.combat ? `<button class="btn" data-action="to-combat">${t.combat === 'creatures' ? 'Add creatures to combat' : 'Add to combat'}</button>` : ''}
              <button class="btn btn-ai" data-action="ai-fill"><span aria-hidden="true">✦</span> Fill in the blanks with AI</button>
              <button class="btn btn-ghost-danger" data-action="delete-entry">Delete ${esc(t.one)}</button>
            </div>
          </div>` : ''}
        </article>`;
    }

    /* For a session: every other entry that shares one of its tags, grouped by section. */
    function linkedHTML(e) {
      const tags = tagsOf(e);
      if (!tags.length) return `<div class="linked"><p class="muted small">Tag this session (for example "Session 1"), then give the same tag to the NPCs, places and encounters it uses. They'll be listed here.</p></div>`;
      const groups = cp.sections.map(sec => ({
        sec, items: sec.entries.filter(x => x !== e && tagsOf(x).some(t => tags.includes(t))),
      })).filter(g => g.items.length && g.sec.type !== 'sessions');
      if (!groups.length) return `<div class="linked"><p class="muted small">Nothing else is tagged ${esc(tags.join(' or '))} yet.</p></div>`;
      return `<div class="linked">
        <h4>In this session</h4>
        ${groups.map(g => `<div class="linked-group"><span class="linked-sec" style="--c:${typeOf(g.sec).color}">${esc(g.sec.label)}</span>
          ${g.items.map(x => `<button class="link-btn linked-item" data-action="jump" data-sec="${g.sec.id}" data-id="${x.id}">${esc(x.f.name || 'Unnamed')}${x.known ? '' : ' <span class="muted">(hidden)</span>'}</button>`).join('')}
        </div>`).join('')}
      </div>`;
    }

    function fieldHTML(k, label, type, opt, value) {
      const v = value ?? '';
      const id = `f-${Util.uid()}`;
      if (type === 'textarea') {
        return `<label class="field wide" for="${id}"><span>${esc(label)}</span><textarea id="${id}" data-field="${k}" rows="1">${esc(v)}</textarea></label>`;
      }
      if (type === 'select') {
        return `<label class="field" for="${id}"><span>${esc(label)}</span><select id="${id}" data-field="${k}">
          ${opt.map(o => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${o ? esc(o) : 'Not set'}</option>`).join('')}
        </select></label>`;
      }
      const list = opt ? ` list="dl-${opt}"` : '';
      const cls = k === 'name' ? 'field name' : (type === 'number' ? 'field small' : 'field');
      return `<label class="${cls}" for="${id}"><span>${esc(label)}</span><input id="${id}" type="${type}" data-field="${k}" value="${esc(v)}"${list} autocomplete="off"></label>`;
    }

    function sectionHTML(sec) {
      const t = typeOf(sec);
      const shown = sec.entries.filter(matches);
      if (filtering() && !shown.length) return '';
      const open = sec.open || filtering();
      const knownCount = sec.entries.filter(x => x.known).length;
      const emptyMsg = sec.entries.length && show !== 'all'
        ? `<p class="nb-empty">No ${show} ${esc(sec.label.toLowerCase())}.</p>`
        : `<p class="nb-empty">${esc(t.blurb)} <button class="link-btn" data-action="add-entry">Add the first ${esc(t.one)}</button> or <button class="link-btn" data-action="ai-draft">draft one with AI</button></p>`;
      return `
        <section class="nb-section ${open ? 'open' : ''}" data-section="${sec.id}" style="--c:${t.color}">
          <div class="nb-section-head">
            <button class="nb-toggle" data-action="toggle-section" aria-expanded="${open}" aria-controls="sec-${sec.id}">
              <span class="chev" aria-hidden="true"></span>
              <span class="swatch"></span>
              <span class="nb-label">${esc(sec.label)}</span>
              <span class="count">${sec.entries.length}</span>
            </button>
            <button class="btn btn-ai" data-action="ai-draft" aria-label="Draft ${/^([aeiou]|npc)/i.test(t.one) ? 'an' : 'a'} ${esc(t.one)} with AI" title="Draft with AI"><span aria-hidden="true">✦</span><span class="add-word"> Draft with AI</span></button>
            <button class="btn btn-add" data-action="add-entry" aria-label="Add ${esc(t.one)}"><span aria-hidden="true">+</span><span class="add-word"> Add ${esc(t.one)}</span></button>
          </div>
          ${open ? `<div class="nb-section-body" id="sec-${sec.id}">
            ${sec.entries.length || !TYPES[sec.type] ? `<div class="sec-tools">
              ${sec.entries.length ? `<span class="known-count">${knownCount} of ${sec.entries.length} known to players</span>
              <button class="link-btn" data-action="reveal-all" ${knownCount === sec.entries.length ? 'disabled' : ''}>Reveal all</button>
              <button class="link-btn" data-action="hide-all" ${knownCount === 0 ? 'disabled' : ''}>Hide all</button>` : ''}
              ${TYPES[sec.type] ? '' : `<button class="link-btn danger" data-action="delete-section">Remove section</button>`}
            </div>` : ''}
            ${shown.length ? shown.map(e => entryHTML(sec, e)).join('') : emptyMsg}
          </div>` : ''}
        </section>`;
    }

    function render() {
      const html = cp.sections.map(sectionHTML).join('');
      ref('sections').innerHTML = html || `<p class="nb-empty">Nothing matches${query ? ` “${esc(query)}”` : ''}${tagFilter ? ` with the tag ${esc(tagFilter)}` : ''}.</p>`;
      ref('sections').querySelectorAll('textarea').forEach(autoSize);
      renderLists();
      renderFilter();
      ref('guideBtn').hidden = !Guide.has(cp);
    }

    function autoSize(t) {
      t.style.height = 'auto';
      t.style.height = t.scrollHeight + 2 + 'px';
    }

    function addEntry(sec, filled) {
      const t = typeOf(sec);
      const f = {};
      t.fields.forEach(([k, , type, opt]) => { if (type === 'select') f[k] = opt[0]; });
      if (filled) Object.assign(f, filled);
      const e = { id: Util.uid(), open: true, known: false, tags: [], f };
      if (tagFilter) e.tags.push(tagFilter);
      // New session folders are numbered and tagged automatically.
      if (sec.type === 'sessions' && !filled) {
        const used = new Set(allTags());
        let n = 1;
        while (used.has(`Session ${n}`)) n++;
        f.name = `Session ${n}`;
        if (!e.tags.includes(`Session ${n}`)) e.tags.push(`Session ${n}`);
      }
      if (show === 'known') e.known = true;
      sec.entries.unshift(e);
      sec.open = true;
      save();
      render();
      el.querySelector(`[data-entry="${e.id}"] [data-field="name"]`)?.focus();
    }

    /* ---------- AI drafting ---------- */
    const AI_HINTS = {
      npcs: 'e.g. a nervous gnome cartographer who sells forged maps',
      locations: 'e.g. a fishing village built on the back of a sleeping turtle',
      factions: 'e.g. a guild of lamplighters who secretly hunt shadow creatures',
      bosses: 'e.g. a drowned priestess who commands the tides, CR 8',
      monsters: 'e.g. a swamp lurker that mimics voices, around CR 3',
      weather: 'e.g. a strange green fog rolling off the marsh in late autumn',
      abnormalities: 'e.g. a stretch of road where time runs backwards at night',
      quests: 'e.g. recover a stolen bell before the next new moon',
      encounters: 'e.g. bandit ambush at a collapsed bridge for four level 3 characters',
      items: 'e.g. a compass that points to whatever the holder fears most',
      lore: 'e.g. the legend of how the twin moons were split',
      sessions: 'e.g. recap: the party freed the prisoners and burned the warehouse',
    };

    function campaignContext() {
      const lines = [];
      if (cp.name) lines.push(`Campaign: ${cp.name}`);
      if (cp.pitch) lines.push(`Premise: ${cp.pitch}`);
      [['locations', 'Locations'], ['factions', 'Factions'], ['npcs', 'NPCs'], ['bosses', 'Bosses']].forEach(([type, label]) => {
        const list = names(type).slice(0, 25);
        if (list.length) lines.push(`${label} already in the campaign: ${list.join(', ')}`);
      });
      return lines.join('\n');
    }

    function fieldGuide(t) {
      return t.fields.map(([k, label, type, opt]) => {
        if (type === 'select') return `- "${k}" (${label}): one of ${opt.filter(Boolean).map(o => `"${o}"`).join(', ')}`;
        if (type === 'number') return `- "${k}" (${label}): a whole number`;
        if (type === 'textarea') return `- "${k}" (${label}): 1 to 4 short sentences or short lines separated by \\n`;
        return `- "${k}" (${label}): a short phrase`;
      }).join('\n');
    }

    function aiPrompt(sec, request, useContext, current) {
      const t = typeOf(sec);
      const extra = {
        bosses: 'Make the stats, abilities and legendary actions fit the challenge rating and 5e conventions. Give the boss a clear motive and a weakness the party can discover.',
        monsters: 'Make AC, HP, ability scores and attacks fit the challenge rating and 5e conventions (attack bonus, damage dice and save DCs written out).',
        encounters: 'List creatures one per line with a count, like "3 Goblin". Balance it for the party described, or a typical party of four if none is given.',
        npcs: 'Give them a distinct voice and something they want from the party.',
        abnormalities: 'Describe what players can observe separately from the hidden true cause.',
      }[sec.type] || '';
      const system = [
        'You help a Dungeon Master prepare a Dungeons & Dragons 5th edition campaign using the 2024 rules.',
        'Write original material in your own words. Do not copy text from published books.',
        'Keep it table-ready: concrete, vivid and brief. The DM will read it during play.',
        'Reply with a single JSON object and nothing else.',
      ].join(' ');
      const parts = [`Create one ${t.one} (${sec.label}).`];
      if (useContext) { const c = campaignContext(); if (c) parts.push(`\nCampaign details for consistency:\n${c}`); }
      if (request) parts.push(`\nThe DM asked for: ${request}`);
      if (current) {
        const kept = Object.fromEntries(Object.entries(current).filter(([, v]) => String(v || '').trim()));
        parts.push(`\nThe DM has already written these fields. Keep them as they are and make everything else fit them:\n${JSON.stringify(kept)}`);
        parts.push('Only return the fields that are still empty.');
      }
      if (extra) parts.push(`\n${extra}`);
      parts.push(`\nReturn JSON with these keys:\n${fieldGuide(t)}`);
      return { system, prompt: parts.join('\n') };
    }

    const article = word => (/^([aeiou]|npc)/i.test(word) ? 'an' : 'a');
    function openAI(sec, entry) {
      const t = typeOf(sec);
      AI.open({
        title: entry ? `Fill in ${entry.f.name || `this ${t.one}`}` : `Draft ${article(t.one)} ${t.one} with AI`,
        kind: t.one,
        fields: t.fields,
        current: entry ? entry.f : null,
        placeholder: AI_HINTS[sec.type] || `Describe the ${t.one}`,
        meta: { kind: t.one, campaign: cp.name || 'Untitled campaign' },
        buildPrompt: (request, useContext) => aiPrompt(sec, request, useContext, entry ? entry.f : null),
        onAccept(fields) {
          if (entry) {
            Object.entries(fields).forEach(([k, v]) => { if (!String(entry.f[k] || '').trim()) entry.f[k] = v; });
            entry.open = true;
            save(); render();
            Util.toast('Filled in the empty fields.');
          } else {
            addEntry(sec, fields);
            Util.toast(`Added ${fields.name || `a new ${t.one}`} as Hidden. Edit anything you like.`);
          }
        },
      });
    }

    function showUndo(text, undo) {
      const box = document.getElementById('toasts');
      const node = document.createElement('div');
      node.className = 'toast';
      node.innerHTML = `${esc(text)} <button class="link-btn">Undo</button>`;
      node.querySelector('button').onclick = () => { undo(); node.remove(); };
      box.appendChild(node);
      setTimeout(() => node.classList.add('out'), 4600);
      setTimeout(() => node.remove(), 5000);
    }

    /* HP and AC for a creature named in an encounter, from a matching monster, boss or NPC entry. */
    function statsFor(name) {
      const key = name.trim().toLowerCase();
      for (const s of cp.sections) {
        if (!['monsters', 'bosses', 'npcs'].includes(s.type)) continue;
        const m = s.entries.find(x => String(x.f.name || '').trim().toLowerCase() === key);
        if (m) return { hp: Number(m.f.hp) || 10, ac: Number(m.f.ac) || 12, found: true };
      }
      return { hp: 10, ac: 12 };
    }

    function toCombat(sec, e) {
      const t = typeOf(sec);
      if (t.combat === 'single') {
        const name = e.f.name || `Unnamed ${t.one}`;
        Combat.add({ name, kind: 'enemy', hp: e.f.hp || 10, ac: e.f.ac || 12 }, cp.id);
        return Util.toast(`${name} added to combat.`);
      }
      const lines = String(e.f.creatures || '').split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) return Util.toast('List the creatures first, one per line, like "3 Goblin".', 'error');
      let total = 0, guessed = 0;
      lines.forEach(line => {
        let m = /^(\d+)\s*[x×]?\s+(.+)$/i.exec(line) || /^(.+?)\s*[x×]\s*(\d+)$/i.exec(line);
        let count = 1, name = line;
        if (m) {
          if (/^\d+$/.test(m[1])) { count = Number(m[1]); name = m[2]; } else { name = m[1]; count = Number(m[2]); }
        }
        count = Util.clamp(count, 1, 20);
        const stats = statsFor(name);
        if (!stats.found) guessed += count;
        for (let i = 1; i <= count; i++) Combat.add({ name: count > 1 ? `${name} ${i}` : name, kind: 'enemy', hp: stats.hp, ac: stats.ac }, cp.id);
        total += count;
      });
      Util.toast(`${total} creature${total > 1 ? 's' : ''} added to the combat tracker in the Party room.${guessed ? ' Set HP and AC there for any not listed in this campaign\'s monsters.' : ''}`);
    }

    /* Open an entry in the notebook and scroll to it. */
    function jumpTo(secId, id) {
      const sec = sectionById(secId);
      const target = sec && sec.entries.find(x => x.id === id);
      if (!target) return;
      query = ''; ref('search').value = ''; tagFilter = ''; show = 'all';
      sec.open = true; target.open = true; save(); render();
      const node = el.querySelector(`[data-entry="${target.id}"]`);
      node?.scrollIntoView({ behavior: Util.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      node?.querySelector('.entry-head')?.focus({ preventScroll: true });
    }
    function openGuide() {
      Guide.open(cp, { onClose: () => { if (el.isConnected) render(); }, onJump: jumpTo });
    }

    /* ---------- Events ---------- */
    el.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      btn.closest('details.menu')?.removeAttribute('open');
      if (btn.dataset.show) { show = btn.dataset.show; return render(); }
      const a = btn.dataset.action;
      if (!a) return;
      const ctx = btn.closest('[data-section]') ? findEntry(btn) : {};
      switch (a) {
        case 'toggle-section':
          if (filtering()) return;
          ctx.sec.open = !ctx.sec.open; save(); return render();
        case 'add-entry': return addEntry(ctx.sec);
        case 'ai-draft': return openAI(ctx.sec, null);
        case 'ai-fill': return openAI(ctx.sec, ctx.entry);
        case 'toggle-known': {
          ctx.entry.known = !ctx.entry.known;
          save();
          render();
          el.querySelector(`[data-entry="${ctx.entry.id}"] .vis-toggle`)?.focus({ preventScroll: true });
          return;
        }
        case 'reveal-all':
        case 'hide-all':
          ctx.sec.entries.forEach(x => { x.known = a === 'reveal-all'; });
          save();
          render();
          return Util.toast(a === 'reveal-all' ? `All ${ctx.sec.label.toLowerCase()} are now known to players.` : `All ${ctx.sec.label.toLowerCase()} are now hidden.`);
        case 'toggle-entry':
          ctx.entry.open = !ctx.entry.open; save(); render();
          if (ctx.entry.open) el.querySelector(`[data-entry="${ctx.entry.id}"] .entry-body [data-field]`)?.focus({ preventScroll: true });
          return;
        case 'delete-entry': {
          const idx = ctx.sec.entries.indexOf(ctx.entry);
          ctx.sec.entries.splice(idx, 1);
          save(); render();
          const t = typeOf(ctx.sec);
          return showUndo(`Deleted ${ctx.entry.f.name || `unnamed ${t.one}`}.`, () => {
            ctx.sec.entries.splice(Math.min(idx, ctx.sec.entries.length), 0, ctx.entry);
            save(); if (el.isConnected) render();
          });
        }
        case 'delete-section': {
          const idx = cp.sections.indexOf(ctx.sec);
          cp.sections.splice(idx, 1);
          save(); render();
          return showUndo(`Removed the ${ctx.sec.label} section.`, () => {
            cp.sections.splice(idx, 0, ctx.sec); save(); if (el.isConnected) render();
          });
        }
        case 'roll-weather':
          rollWeather(ctx.entry.f); save(); render();
          return Util.toast(`Rolled: ${ctx.entry.f.conditions}, ${ctx.entry.f.temperature.toLowerCase()}, ${ctx.entry.f.wind.toLowerCase()}.`);
        case 'to-combat': return toCombat(ctx.sec, ctx.entry);
        case 'filter-tag':
          tagFilter = btn.dataset.tag; render();
          ref('tagFilter').scrollIntoView({ block: 'nearest' });
          return Util.toast(`Showing everything tagged ${tagFilter}.`);
        case 'remove-tag':
          ctx.entry.tags = tagsOf(ctx.entry).filter(x => x !== btn.dataset.tag);
          save(); render();
          el.querySelector(`[data-entry="${ctx.entry.id}"] [data-ref-tag]`)?.focus({ preventScroll: true });
          return;
        case 'jump': return jumpTo(btn.dataset.sec, btn.dataset.id);
        case 'guide': return openGuide();
        case 'expand': cp.sections.forEach(s => { s.open = true; }); save(); return render();
        case 'collapse': cp.sections.forEach(s => { s.open = false; s.entries.forEach(x => { x.open = false; }); }); save(); return render();
        case 'export':
          Util.download(`${Util.slug(cp.name || 'campaign')}.json`, exportable(cp));
          return Util.toast('Campaign downloaded.');
      }
    });

    el.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.field) {
        const { entry, sec } = findEntry(t);
        entry.f[t.dataset.field] = t.value;
        if (t.tagName === 'TEXTAREA') autoSize(t);
        // Keep the collapsed row's title and summary in step with typing.
        const row = t.closest('[data-entry]');
        const ty = typeOf(sec);
        if (t.dataset.field === 'name') {
          const n = row.querySelector('.entry-name');
          n.textContent = t.value || `Unnamed ${ty.one}`;
          n.classList.toggle('unnamed', !t.value);
        }
        if (ty.summary.includes(t.dataset.field)) row.querySelector('.entry-meta').textContent = summaryOf(ty, entry);
        save();
        return;
      }
      if (t === ref('name')) { cp.name = t.value; save(); }
      if (t === ref('pitch')) { cp.pitch = t.value; autoSize(t); save(); }
      if (t === ref('search')) { query = t.value.trim().toLowerCase(); render(); }
    });

    el.addEventListener('submit', e => {
      const form = e.target.closest('[data-action-form="add-tag"]');
      if (!form) return;
      e.preventDefault();
      const input = form.querySelector('[data-ref-tag]');
      const { entry } = findEntry(form);
      const tag = input.value.trim().replace(/\s+/g, ' ').slice(0, 40);
      if (!tag) return;
      // Reuse an existing tag's spelling ("session 1" -> "Session 1").
      const same = allTags().find(x => x.toLowerCase() === tag.toLowerCase()) || tag;
      if (!tagsOf(entry).includes(same)) entry.tags = [...tagsOf(entry), same];
      save(); render();
      el.querySelector(`[data-entry="${entry.id}"] [data-ref-tag]`)?.focus({ preventScroll: true });
    });

    el.addEventListener('change', e => {
      const t = e.target;
      if (t === ref('tagFilter')) { tagFilter = t.value; return render(); }
      if (t.tagName === 'SELECT' && t.dataset.field) render();
      if (t.dataset.field === 'name') renderLists();
    });

    ref('addSection').addEventListener('submit', e => {
      e.preventDefault();
      const input = ref('newSection');
      const label = input.value.trim();
      if (!label) { input.focus(); return; }
      cp.sections.push({ id: Util.uid(), type: 'custom', label, open: true, entries: [] });
      input.value = '';
      save();
      render();
      Util.toast(`Added the ${label} section.`);
    });

    render();
    autoSize(ref('pitch'));
    if (guideNext === cp.id) { guideNext = null; openGuide(); }
  }
  let guideNext = null; // open the guide right after starting a premade campaign

  /*
   * What players may see: only entries marked Known, and only their non-secret fields
   * (no secrets, notes, true causes, boss tactics, stats or loot).
   */
  const PUBLIC = {
    npcs: ['role', 'location', 'faction', 'appearance'],
    locations: ['kind', 'region', 'description', 'points'],
    factions: ['leader', 'base', 'goals'],
    bosses: ['location'],
    monsters: ['ctype'],
    weather: ['region', 'season', 'conditions', 'temperature', 'wind', 'effects'],
    abnormalities: ['kind', 'location', 'description'],
    quests: ['status', 'giver', 'location', 'reward', 'description'],
    encounters: ['location'],
    items: ['rarity', 'attunement', 'holder', 'description'],
    lore: ['era', 'details'],
    sessions: ['date', 'summary'],
    custom: ['details'],
  };

  function publicKnown(id) {
    const cp = byId(id || activeId());
    if (!cp || !Array.isArray(cp.sections)) return [];
    return cp.sections.map(sec => {
      const t = TYPES[sec.type] || CUSTOM;
      const keys = PUBLIC[sec.type] || PUBLIC.custom;
      const entries = sec.entries.filter(e => e.known).map(e => ({
        id: e.id,
        name: e.f.name || `Unnamed ${t.one}`,
        fields: keys.map(k => {
          const def = t.fields.find(f => f[0] === k);
          return def && e.f[k] ? [def[1], String(e.f[k])] : null;
        }).filter(Boolean),
      }));
      return { label: sec.label, color: t.color, entries };
    }).filter(sec => sec.entries.length);
  }

  /* ---------- Library of campaign folders ---------- */
  function mountLibrary(el) {
    const all = list();
    const fmtDate = t => (t ? new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric', year: new Date(t).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }) : '');
    const hostingId = typeof Room !== 'undefined' && Room.state.mode === 'host' ? Room.state.campaignId : null;

    function folderHTML(c) {
      const entries = c.sections.reduce((n, sec) => n + sec.entries.length, 0);
      const known = c.sections.reduce((n, sec) => n + sec.entries.filter(e => e.known).length, 0);
      const fighting = c.combat && c.combat.combatants.length;
      return `
        <article class="folder ${c.id === hostingId ? 'live' : ''}" data-id="${c.id}">
          <a class="folder-main" href="#/campaign/${c.id}">
            <span class="folder-name ${c.name ? '' : 'unnamed'}">${esc(c.name || 'Untitled campaign')}</span>
            <span class="folder-pitch">${esc(c.pitch || 'No summary yet.')}</span>
            ${c.source ? `<span class="folder-source">${esc(c.source.split(':')[0])}</span>` : ''}
            <span class="folder-stats">${entries} entr${entries === 1 ? 'y' : 'ies'}, ${known} known to players${fighting ? `, ${fighting} in combat` : ''}</span>
            ${c.updated ? `<span class="folder-date">Edited ${fmtDate(c.updated)}</span>` : ''}
          </a>
          <div class="folder-foot">
            <span class="folder-code" title="Players join this campaign's party room with this code">Room <b>${esc(c.roomCode)}</b></span>
            ${c.id === hostingId ? '<span class="live-badge">Room open</span>' : ''}
            <span class="folder-tools">
              <button class="link-btn" data-lib="download">Download</button>
              <button class="link-btn danger" data-lib="delete">Delete</button>
            </span>
          </div>
        </article>`;
    }

    el.innerHTML = `
      <div class="library">
        <header class="lib-head">
          <div>
            <h1>Campaigns</h1>
            <p class="lede">Each campaign keeps its own notes, combat tracker and party room code.</p>
          </div>
          <div class="lib-actions">
            <button class="btn btn-ai" data-lib="ai-log">AI activity</button>
            <button class="btn" data-lib="upload">Upload a campaign</button>
            <button class="btn btn-primary" data-lib="new">New campaign</button>
          </div>
        </header>
        ${all.length ? `<div class="lib-grid">${all.map(folderHTML).join('')}</div>` : `
          <div class="empty-state">
            <p>No campaigns yet.</p>
            <p class="muted">Start one and fill it with NPCs, places, factions and everything else your world needs.</p>
            <button class="btn btn-primary" data-lib="new">Create your first campaign</button>
          </div>`}
      </div>`;

    el.onclick = e => {
      const b = e.target.closest('[data-lib]');
      if (!b) return;
      const node = b.closest('[data-id]');
      const c = node && byId(node.dataset.id);
      switch (b.dataset.lib) {
        case 'new':
          return openChooser(content => {
            const made = create(content);
            if (content && content.source) Util.toast(`${made.name} is ready. Room code ${made.roomCode}.`);
            if (Guide.has(made)) guideNext = made.id;
            location.hash = `#/campaign/${made.id}`;
          });
        case 'upload':
          return Util.pickJSON().then(data => {
            if (!data || (!Array.isArray(data.sections) && !Array.isArray(data.cards))) throw new Error('That file doesn\'t look like a Campaign Codex campaign.');
            const made = create(data);
            Util.toast(`Uploaded ${made.name || 'campaign'} with room code ${made.roomCode}.`);
            mountLibrary(el);
          }).catch(err => Util.toast(err.message, 'error'));
        case 'ai-log': return AI.openLog();
        case 'download':
          Util.download(`${Util.slug(c.name || 'campaign')}.json`, exportable(c));
          return Util.toast('Campaign downloaded.');
        case 'delete': {
          if (c.id === hostingId) return Util.toast('End this campaign\'s party room before deleting it.', 'error');
          if (!b.dataset.armed) {
            b.dataset.armed = '1'; b.textContent = 'Click again to delete';
            setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete'; } }, 3000);
            return;
          }
          const arr = list();
          const idx = arr.indexOf(c);
          arr.splice(idx, 1);
          Store.save();
          mountLibrary(el);
          const box = document.getElementById('toasts');
          const t = document.createElement('div');
          t.className = 'toast';
          t.innerHTML = `Deleted ${esc(c.name || 'Untitled campaign')}. <button class="link-btn">Undo</button>`;
          t.querySelector('button').onclick = () => { list().splice(Math.min(idx, list().length), 0, c); Store.save(); if (el.isConnected) mountLibrary(el); t.remove(); };
          box.appendChild(t);
          setTimeout(() => t.classList.add('out'), 5600);
          setTimeout(() => t.remove(), 6000);
          return;
        }
      }
    };
  }

  /* #/campaign shows the library; #/campaign/<id> opens one campaign. */
  function mount(el) {
    const id = location.hash.replace(/^#\/?/, '').split('/')[1];
    if (id) {
      const c = byId(id);
      if (c) {
        Store.state.activeCampaignId = c.id;
        Store.save();
        mountNotebook(el, c);
        if (!c.name) el.querySelector('[data-ref="name"]').focus();
        return;
      }
      history.replaceState(null, '', '#/campaign');
    }
    mountLibrary(el);
  }

  return { mount, publicKnown, list, byId, activeId, combat: combatOf, newRoomCode, typeOf };
})();
