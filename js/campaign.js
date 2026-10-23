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
      blurb: 'What happened each session, and what to prep next.',
      fields: [['name', 'Title', 'text'], ['date', 'Date played', 'date'], ['summary', 'What happened', 'textarea'], ['prep', 'Prep for next time', 'textarea']],
      summary: ['date'],
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

  function campaign() {
    const s = Store.state;
    if (!s.campaign || !Array.isArray(s.campaign.sections)) {
      s.campaign = migrate(s.campaign);
      Store.save();
    }
    return migrate(s.campaign);
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
  function mount(el) {
    const cp = campaign();
    let query = '';

    el.innerHTML = `
      <div class="notebook">
        <header class="nb-head">
          <div class="nb-title">
            <input class="campaign-name" data-ref="name" value="${esc(cp.name)}" placeholder="Untitled campaign" aria-label="Campaign name">
            <textarea class="campaign-pitch" data-ref="pitch" rows="1" placeholder="One line about this campaign: the premise, the tone, the big threat…" aria-label="Campaign summary">${esc(cp.pitch || '')}</textarea>
          </div>
          <div class="nb-tools">
            <input type="search" class="nb-search" data-ref="search" placeholder="Search everything" aria-label="Search the campaign">
            <button class="btn" data-action="expand">Expand all</button>
            <button class="btn" data-action="collapse">Collapse all</button>
            <button class="btn" data-action="export">Download</button>
            <button class="btn" data-action="import">Upload</button>
          </div>
        </header>
        <div class="nb-sections" data-ref="sections"></div>
        <form class="nb-add-section" data-ref="addSection" autocomplete="off">
          <input data-ref="newSection" placeholder="New section name, e.g. Gods, Ships, Rumors" aria-label="New section name">
          <button class="btn" type="submit">Add section</button>
        </form>
        <datalist id="dl-locations"></datalist>
        <datalist id="dl-factions"></datalist>
        <datalist id="dl-npcs"></datalist>
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
    }

    function matches(entry) {
      if (!query) return true;
      return Object.values(entry.f).some(v => String(v).toLowerCase().includes(query));
    }

    function summaryOf(t, e) {
      return t.summary.map(k => e.f[k]).filter(Boolean).join(', ');
    }

    function entryHTML(sec, e) {
      const t = typeOf(sec);
      const badge = t.badge && e.f[t.badge] ? `${t.badgePrefix || ''}${e.f[t.badge]}` : '';
      const open = e.open || (query && matches(e));
      return `
        <article class="entry ${open ? 'open' : ''}" data-entry="${e.id}">
          <button class="entry-head" data-action="toggle-entry" aria-expanded="${open}">
            <span class="entry-name ${e.f.name ? '' : 'unnamed'}">${esc(e.f.name || `Unnamed ${t.one}`)}</span>
            <span class="entry-meta">${esc(summaryOf(t, e))}</span>
            ${badge ? `<span class="badge" data-tone="${esc(String(e.f[t.badge]).toLowerCase().replace(/\s+/g, '-'))}">${esc(badge)}</span>` : ''}
            <span class="chev" aria-hidden="true"></span>
          </button>
          ${open ? `<div class="entry-body">
            <div class="entry-grid">
              ${t.fields.map(([k, label, type, opt]) => fieldHTML(k, label, type, opt, e.f[k])).join('')}
            </div>
            <div class="entry-actions">
              ${t.roll ? '<button class="btn" data-action="roll-weather">Roll random weather</button>' : ''}
              ${t.combat ? `<button class="btn" data-action="to-combat">${t.combat === 'creatures' ? 'Add creatures to combat' : 'Add to combat'}</button>` : ''}
              <button class="btn btn-ghost-danger" data-action="delete-entry">Delete ${esc(t.one)}</button>
            </div>
          </div>` : ''}
        </article>`;
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
      if (query && !shown.length) return '';
      const open = sec.open || Boolean(query);
      return `
        <section class="nb-section ${open ? 'open' : ''}" data-section="${sec.id}" style="--c:${t.color}">
          <div class="nb-section-head">
            <button class="nb-toggle" data-action="toggle-section" aria-expanded="${open}" aria-controls="sec-${sec.id}">
              <span class="chev" aria-hidden="true"></span>
              <span class="swatch"></span>
              <span class="nb-label">${esc(sec.label)}</span>
              <span class="count">${sec.entries.length}</span>
            </button>
            ${TYPES[sec.type] ? '' : `<button class="link-btn" data-action="delete-section">Remove section</button>`}
            <button class="btn btn-add" data-action="add-entry">Add ${esc(t.one)}</button>
          </div>
          ${open ? `<div class="nb-section-body" id="sec-${sec.id}">
            ${shown.length ? shown.map(e => entryHTML(sec, e)).join('') : `<p class="nb-empty">${esc(t.blurb)} <button class="link-btn" data-action="add-entry">Add the first ${esc(t.one)}</button></p>`}
          </div>` : ''}
        </section>`;
    }

    function render() {
      const html = cp.sections.map(sectionHTML).join('');
      ref('sections').innerHTML = html || `<p class="nb-empty">Nothing matches “${esc(query)}”.</p>`;
      ref('sections').querySelectorAll('textarea').forEach(autoSize);
      renderLists();
    }

    function autoSize(t) {
      t.style.height = 'auto';
      t.style.height = t.scrollHeight + 2 + 'px';
    }

    function addEntry(sec) {
      const t = typeOf(sec);
      const f = {};
      t.fields.forEach(([k, , type, opt]) => { if (type === 'select') f[k] = opt[0]; });
      const e = { id: Util.uid(), open: true, f };
      sec.entries.unshift(e);
      sec.open = true;
      Store.save();
      render();
      el.querySelector(`[data-entry="${e.id}"] [data-field="name"]`)?.focus();
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

    function toCombat(sec, e) {
      const t = typeOf(sec);
      if (t.combat === 'single') {
        const name = e.f.name || `Unnamed ${t.one}`;
        Combat.add({ name, kind: 'enemy', hp: e.f.hp || 10, ac: e.f.ac || 12 });
        return Util.toast(`${name} added to combat.`);
      }
      const lines = String(e.f.creatures || '').split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) return Util.toast('List the creatures first, one per line, like "3 Goblin".', 'error');
      let total = 0;
      lines.forEach(line => {
        let m = /^(\d+)\s*[x×]?\s+(.+)$/i.exec(line) || /^(.+?)\s*[x×]\s*(\d+)$/i.exec(line);
        let count = 1, name = line;
        if (m) {
          if (/^\d+$/.test(m[1])) { count = Number(m[1]); name = m[2]; } else { name = m[1]; count = Number(m[2]); }
        }
        count = Util.clamp(count, 1, 20);
        for (let i = 1; i <= count; i++) Combat.add({ name: count > 1 ? `${name} ${i}` : name, kind: 'enemy', hp: 10, ac: 12 });
        total += count;
      });
      Util.toast(`${total} creature${total > 1 ? 's' : ''} added to combat. Set HP and AC on the Combat tab.`);
    }

    /* ---------- Events ---------- */
    el.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const a = btn.dataset.action;
      if (!a) return;
      const ctx = btn.closest('[data-section]') ? findEntry(btn) : {};
      switch (a) {
        case 'toggle-section':
          if (query) return;
          ctx.sec.open = !ctx.sec.open; Store.save(); return render();
        case 'add-entry': return addEntry(ctx.sec);
        case 'toggle-entry':
          ctx.entry.open = !ctx.entry.open; Store.save(); render();
          if (ctx.entry.open) el.querySelector(`[data-entry="${ctx.entry.id}"] .entry-body [data-field]`)?.focus({ preventScroll: true });
          return;
        case 'delete-entry': {
          const idx = ctx.sec.entries.indexOf(ctx.entry);
          ctx.sec.entries.splice(idx, 1);
          Store.save(); render();
          const t = typeOf(ctx.sec);
          return showUndo(`Deleted ${ctx.entry.f.name || `unnamed ${t.one}`}.`, () => {
            ctx.sec.entries.splice(Math.min(idx, ctx.sec.entries.length), 0, ctx.entry);
            Store.save(); if (el.isConnected) render();
          });
        }
        case 'delete-section': {
          const idx = cp.sections.indexOf(ctx.sec);
          cp.sections.splice(idx, 1);
          Store.save(); render();
          return showUndo(`Removed the ${ctx.sec.label} section.`, () => {
            cp.sections.splice(idx, 0, ctx.sec); Store.save(); if (el.isConnected) render();
          });
        }
        case 'roll-weather':
          rollWeather(ctx.entry.f); Store.save(); render();
          return Util.toast(`Rolled: ${ctx.entry.f.conditions}, ${ctx.entry.f.temperature.toLowerCase()}, ${ctx.entry.f.wind.toLowerCase()}.`);
        case 'to-combat': return toCombat(ctx.sec, ctx.entry);
        case 'expand': cp.sections.forEach(s => { s.open = true; }); Store.save(); return render();
        case 'collapse': cp.sections.forEach(s => { s.open = false; s.entries.forEach(x => { x.open = false; }); }); Store.save(); return render();
        case 'export':
          Util.download(`${Util.slug(cp.name || 'campaign')}.json`, cp);
          return Util.toast('Campaign downloaded.');
        case 'import':
          return Util.pickJSON().then(data => {
            if (!data || (!Array.isArray(data.sections) && !Array.isArray(data.cards))) throw new Error('That file doesn\'t look like a Campaign Codex campaign.');
            Store.state.campaign = migrate(data);
            Store.save();
            mount(el);
            Util.toast(`Uploaded ${data.name || 'campaign'}.`);
          }).catch(err => Util.toast(err.message, 'error'));
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
        Store.save();
        return;
      }
      if (t === ref('name')) { cp.name = t.value; Store.save(); }
      if (t === ref('pitch')) { cp.pitch = t.value; autoSize(t); Store.save(); }
      if (t === ref('search')) { query = t.value.trim().toLowerCase(); render(); }
    });

    el.addEventListener('change', e => {
      const t = e.target;
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
      Store.save();
      render();
      Util.toast(`Added the ${label} section.`);
    });

    render();
    autoSize(ref('pitch'));
  }

  return { mount };
})();
