'use strict';

/*
 * Homebrew (version 4): players make their own classes, subclasses, species and backgrounds.
 *
 * Saved in Store.state.homebrew = { items: [...] } (synced to the account as "prefs#homebrew"),
 * and plugged into the same rules data the official options use (Rules.CLASSES, SPECIES,
 * BACKGROUNDS, ORIGIN_FEATS), so the creator, level up, Spells tab and features list work with
 * them. A homebrew stays an option until its owner deletes it.
 *
 * Characters made with homebrew carry a copy of it (character.homebrew), so the character keeps
 * working on another device, or after the homebrew is deleted from the list.
 */
const Homebrew = (() => {
  const esc = Util.esc;
  const R = Rules;
  const ABIL = R.ABIL;
  const SKILLS = Object.keys(R.SKILL_NAME);
  const LISTS = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];
  const KIND = {
    class: { one: 'class', title: 'Homebrew class' },
    subclass: { one: 'subclass', title: 'Homebrew subclass' },
    species: { one: 'species', title: 'Homebrew species' },
    background: { one: 'background', title: 'Homebrew background' },
  };
  const ORDER = ['class', 'subclass', 'species', 'background'];
  const DICE = ['1d4', '1d6', '1d8', '1d10', '1d12', '2d4', '2d6'];
  const SIZES = ['Tiny', 'Small', 'Medium', 'Large'];

  // The official names, captured before any homebrew is added.
  const OFFICIAL = {
    class: new Set(Object.keys(R.CLASSES)),
    species: new Set(Object.keys(R.SPECIES)),
    background: new Set(Object.keys(R.BACKGROUNDS)),
    feat: new Set(Object.keys(R.ORIGIN_FEATS)),
    subclass: Object.fromEntries(Object.entries(R.CLASSES).map(([k, c]) => [k, new Set(Object.keys(c.subclasses))])),
  };
  const OFFICIAL_SUB_LEVELS = Object.fromEntries(Object.entries(R.CLASSES).map(([k, c]) => [k, c.subclassLevels.slice()]));

  /* Prepared spells by level for each caster type (from the official class tables). */
  const PREPARED = {
    full: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
    half: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15],
    pact: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
    third: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  };
  const CANTRIPS = { full: [3, 4, 5], half: [0, 0, 0], pact: [2, 3, 4], third: [2, 2, 3] };
  const CASTER_NAME = { none: 'None', full: 'Full, like a wizard', half: 'Half, like a paladin', third: 'Third, from level 3', pact: 'Pact Magic, like a warlock' };

  /* ---------- Cleaning (anything can come from an uploaded file) ---------- */
  const clip = (v, n) => String(v ?? '').slice(0, n);
  // Names go into feature lines like "Level 3: Name: A, B", so they can't hold : ; or ,
  const cleanName = (v, n = 40) => clip(v, n * 2).replace(/[:;,\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  const num = (v, a, b, d) => Util.clamp(Util.num(v, d), a, b);
  const abil = (v, d = 'str') => (ABIL.includes(v) ? v : d);
  const abils = v => [...new Set((Array.isArray(v) ? v : []).filter(a => ABIL.includes(a)))];
  const levels = v => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[\s,]+/)).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 20))].sort((a, b) => a - b);
  const feats = (v, max = 60) => (Array.isArray(v) ? v : []).filter(f => f && typeof f === 'object')
    .map(f => ({ lv: num(f.lv, 1, 20, 1), name: cleanName(f.name, 50), desc: clip(f.desc, 1200).trim() })).slice(0, max);

  function clean(raw) {
    const d = raw && typeof raw === 'object' ? raw : {};
    const type = ORDER.includes(d.type) ? d.type : null;
    if (!type) return null;
    const base = { id: Util.safeId(d.id), type, name: cleanName(d.name), blurb: clip(d.blurb, 200).trim() };
    if (type === 'class') {
      const saves = abils(d.saves).slice(0, 2);
      const caster = d.caster && typeof d.caster === 'object' ? d.caster : {};
      const ctype = ['none', 'full', 'half', 'third', 'pact'].includes(caster.type) ? caster.type : 'none';
      return {
        ...base,
        die: [6, 8, 10, 12].includes(Number(d.die)) ? Number(d.die) : 8,
        primary: abil(d.primary), saves,
        skillsN: num(d.skillsN, 0, 6, 2), skillsFrom: (Array.isArray(d.skillsFrom) ? d.skillsFrom : []).filter(s => SKILLS.includes(s)),
        armor: clip(d.armor, 120), weapons: clip(d.weapons, 120), tools: clip(d.tools, 120), equip: clip(d.equip, 400),
        acType: ['none', 'armor', 'unarmored'].includes(d.acType) ? d.acType : 'none',
        acBase: num(d.acBase, 10, 20, 11), acMaxDex: ['full', '2', '0'].includes(String(d.acMaxDex)) ? String(d.acMaxDex) : 'full',
        acShield: Boolean(d.acShield), acExtra: abil(d.acExtra, 'con'),
        weaponsHeld: (Array.isArray(d.weaponsHeld) ? d.weaponsHeld : []).filter(w => R.WEAPONS[w]).slice(0, 4),
        features: feats(d.features, 120),
        asiLevels: Array.isArray(d.asiLevels) || typeof d.asiLevels === 'string' ? levels(d.asiLevels).filter(l => l !== 19 || !d.epicBoon) : [4, 8, 12, 16],
        subclassLevels: Array.isArray(d.subclassLevels) || typeof d.subclassLevels === 'string' ? levels(d.subclassLevels) : [3, 6, 10, 14],
        epicBoon: d.epicBoon !== false,
        caster: {
          type: ctype, abil: abil(caster.abil, 'int'),
          lists: (Array.isArray(caster.lists) ? caster.lists : []).filter(l => LISTS.includes(l)),
          cantrips: [0, 1, 2].map(i => num(Array.isArray(caster.cantrips) ? caster.cantrips[i] : undefined, 0, 9, (CANTRIPS[ctype] || [0, 0, 0])[i])),
        },
      };
    }
    if (type === 'subclass') {
      return {
        ...base, parent: cleanName(d.parent),
        features: feats(d.features),
        acBonus: num(d.acBonus, 0, 5, 0), speedBonus: num(d.speedBonus, 0, 60, 0), hpPerLevel: num(d.hpPerLevel, 0, 5, 0),
        attacks: (Array.isArray(d.attacks) ? d.attacks : []).filter(a => a && typeof a === 'object').slice(0, 4).map(a => ({
          name: cleanName(a.name, 40), die: DICE.includes(a.die) ? a.die : '1d6', abil: ['str', 'dex', 'finesse'].includes(a.abil) ? a.abil : 'str',
        })).filter(a => a.name),
      };
    }
    if (type === 'species') {
      const sizes = (Array.isArray(d.sizes) ? d.sizes : []).filter(s => SIZES.includes(s));
      return {
        ...base, sizes: sizes.length ? sizes : ['Medium'],
        speed: num(d.speed, 5, 60, 30), darkvision: [0, 60, 120].includes(Number(d.darkvision)) ? Number(d.darkvision) : 0,
        traits: (Array.isArray(d.traits) ? d.traits : []).filter(t => t && typeof t === 'object').slice(0, 12)
          .map(t => ({ name: cleanName(t.name, 50), desc: clip(t.desc, 1200).trim() })),
      };
    }
    // background
    return {
      ...base,
      abil: abils(d.abil).slice(0, 3), skills: (Array.isArray(d.skills) ? d.skills : []).filter(s => SKILLS.includes(s)).slice(0, 2),
      feat: cleanName(d.feat, 50), featDesc: clip(d.featDesc, 600).trim(),
      tool: clip(d.tool, 120), equip: clip(d.equip, 400),
    };
  }

  /* Why a homebrew can't be saved yet, or ''. */
  function problem(d, selfId) {
    if (!d.name || d.name.length < 2) return `Give the ${KIND[d.type].one} a name.`;
    const taken = items().some(x => x.id !== selfId && x.type === d.type && x.name.toLowerCase() === d.name.toLowerCase() && (d.type !== 'subclass' || x.parent === d.parent));
    if (taken) return `You already have a homebrew ${KIND[d.type].one} called ${d.name}.`;
    if (d.type === 'class') {
      if ([...OFFICIAL.class].some(n => n.toLowerCase() === d.name.toLowerCase())) return `${d.name} is an official class. Pick another name.`;
      if (d.saves.length !== 2) return 'Choose two saving throws.';
      if (d.skillsFrom.length < d.skillsN) return `Choose at least ${d.skillsN} skills for players to pick from.`;
      if (d.caster.type !== 'none' && !d.caster.lists.length) return 'Choose at least one spell list for the spellcasting.';
    }
    if (d.type === 'subclass') {
      if (!R.CLASSES[d.parent]) return 'Choose the class this subclass belongs to.';
      if (OFFICIAL.subclass[d.parent] && [...OFFICIAL.subclass[d.parent]].some(n => n.toLowerCase() === d.name.toLowerCase())) return `${d.name} is an official ${d.parent} subclass. Pick another name.`;
      if (!subLevels(d.parent).length) return `${d.parent} doesn't have any subclass levels.`;
    }
    if (d.type === 'species' && [...OFFICIAL.species].some(n => n.toLowerCase() === d.name.toLowerCase())) return `${d.name} is an official species. Pick another name.`;
    if (d.type === 'background') {
      if ([...OFFICIAL.background].some(n => n.toLowerCase() === d.name.toLowerCase())) return `${d.name} is an official background. Pick another name.`;
      if (d.abil.length !== 3) return 'Choose three abilities for the ability score increase.';
      if (d.skills.length !== 2 || d.skills[0] === d.skills[1]) return 'Choose two different skills.';
      if (!d.feat) return 'Choose an origin feat, or make a new one.';
      if (!OFFICIAL.feat.has(d.feat) && !d.featDesc) return `Describe what the ${d.feat} feat does.`;
    }
    return '';
  }

  /* ---------- Storage ---------- */
  function lib() {
    const s = Store.state;
    if (!s.homebrew || typeof s.homebrew !== 'object' || !Array.isArray(s.homebrew.items)) s.homebrew = { items: [] };
    return s.homebrew;
  }
  const items = () => lib().items;
  const byId = id => items().find(x => x.id === id) || null;
  const find = (type, name, parent) => items().find(x => x.type === type && x.name === name && (type !== 'subclass' || !parent || x.parent === parent)) || null;
  const listeners = new Set();

  function save(def) {
    const d = clean(def);
    const list = items();
    const i = list.findIndex(x => x.id === d.id);
    const old = i >= 0 ? list[i] : null;
    if (i >= 0) list[i] = d; else list.push(d);
    // A renamed class keeps its homebrew subclasses.
    if (old && old.type === 'class' && old.name !== d.name) list.forEach(x => { if (x.type === 'subclass' && x.parent === old.name) x.parent = d.name; });
    Store.save();
    apply();
    return d;
  }
  function remove(id) {
    lib().items = items().filter(x => x.id !== id);
    Store.save();
    apply();
  }

  /* ---------- Into the rules ---------- */
  const subLevels = parent => {
    const own = items().find(x => x.type === 'class' && x.name === parent);
    if (own) return own.subclassLevels.slice();
    return OFFICIAL_SUB_LEVELS[parent] ? OFFICIAL_SUB_LEVELS[parent].slice() : (R.CLASSES[parent] ? R.CLASSES[parent].subclassLevels.slice() : []);
  };

  function classRules(d) {
    const features = {};
    const add = (lv, name) => { (features[lv] = features[lv] || []).push(name); };
    for (let lv = 1; lv <= 20; lv++) {
      d.features.filter(f => f.lv === lv && f.name).forEach(f => add(lv, f.name));
      if (d.subclassLevels.includes(lv)) add(lv, 'Subclass feature');
      if (d.asiLevels.includes(lv)) add(lv, 'Ability Score Improvement');
      if (lv === 19 && d.epicBoon) add(lv, 'Epic Boon');
    }
    const priority = [d.primary, ...d.saves.filter(a => a !== d.primary), ...['con', 'dex', 'wis', 'str', 'cha', 'int'].filter(a => a !== d.primary && !d.saves.includes(a))];
    const ac = d.acType === 'armor' ? { type: 'armor', base: d.acBase, shield: d.acShield, ...(d.acMaxDex === 'full' ? {} : { maxDex: Number(d.acMaxDex) }) }
      : d.acType === 'unarmored' ? { type: 'unarmored', extra: d.acExtra } : { type: 'none' };
    const c = d.caster;
    return {
      homebrew: true, source: 'Homebrew',
      die: d.die, primary: R.ABIL_NAME[d.primary], saves: d.saves.slice(),
      skills: { n: d.skillsN, from: d.skillsFrom.slice() },
      armor: d.armor || 'None', weapons: d.weapons || 'None', tools: d.tools,
      priority, ac, weaponsHeld: d.weaponsHeld.slice(), equip: d.equip || 'Nothing listed',
      blurb: d.blurb || 'A homebrew class.',
      ...(c.type !== 'none' ? { caster: { type: c.type, abil: c.abil, lists: c.lists.slice(), cantrips: c.cantrips.some(Boolean) ? c.cantrips.slice() : null, prepared: PREPARED[c.type].slice() } } : {}),
      features, subclasses: {}, subclassLevels: d.subclassLevels.slice(),
      stats: () => [],
    };
  }
  function subclassRules(d) {
    const features = {};
    subLevels(d.parent).forEach(lv => {
      const names = d.features.filter(f => f.lv === lv && f.name).map(f => f.name);
      features[lv] = names.length ? names : [`${d.name} feature`];
    });
    return {
      homebrew: true, source: 'Homebrew', details: true, features,
      combat: { acBonus: d.acBonus, speedBonus: d.speedBonus, hpPerLevel: d.hpPerLevel, attacks: d.attacks.map(a => ({ ...a })) },
    };
  }
  const speciesRules = d => ({
    homebrew: true, size: d.sizes.slice(), speed: d.speed, darkvision: d.darkvision, blurb: d.blurb || 'A homebrew species.',
    traits: d.traits.filter(t => t.name).map(t => [t.name, t.desc]),
  });
  const backgroundRules = d => ({ homebrew: true, abil: d.abil.slice(), feat: d.feat, skills: d.skills.slice(), tool: d.tool || 'None', equip: d.equip || 'Nothing listed' });

  let addedFeats = new Set();
  /* Put every homebrew into the rules data (and take out ones that were deleted). */
  function apply() {
    Object.entries(R.CLASSES).forEach(([k, c]) => {
      if (c.homebrew) delete R.CLASSES[k];
      else Object.entries(c.subclasses).forEach(([s, e]) => { if (e.homebrew) delete c.subclasses[s]; });
    });
    Object.entries(R.SPECIES).forEach(([k, s]) => { if (s.homebrew) delete R.SPECIES[k]; });
    Object.entries(R.BACKGROUNDS).forEach(([k, b]) => { if (b.homebrew) delete R.BACKGROUNDS[k]; });
    addedFeats.forEach(f => delete R.ORIGIN_FEATS[f]);
    addedFeats = new Set();

    // The player's own list first, then copies carried by characters (for anything not in the list).
    const all = items().map(clean).filter(Boolean);
    (Store.state.characters || []).forEach(ch => {
      const hb = ch && ch.homebrew;
      if (!hb || typeof hb !== 'object') return;
      ORDER.forEach(t => {
        const d = hb[t] && clean({ ...hb[t], type: t });
        if (d && d.name && !all.some(x => x.type === t && x.name === d.name && (t !== 'subclass' || x.parent === d.parent))) all.push({ ...d, carried: true });
      });
    });
    all.filter(d => d.type === 'class' && d.name && !OFFICIAL.class.has(d.name)).forEach(d => { if (!R.CLASSES[d.name]) R.CLASSES[d.name] = classRules(d); });
    all.filter(d => d.type === 'subclass' && R.CLASSES[d.parent] && d.name).forEach(d => {
      const subs = R.CLASSES[d.parent].subclasses;
      if (!subs[d.name]) subs[d.name] = subclassRules(d);
    });
    all.filter(d => d.type === 'species' && d.name && !OFFICIAL.species.has(d.name)).forEach(d => { if (!R.SPECIES[d.name]) R.SPECIES[d.name] = speciesRules(d); });
    all.filter(d => d.type === 'background' && d.name && !OFFICIAL.background.has(d.name)).forEach(d => {
      if (R.BACKGROUNDS[d.name]) return;
      R.BACKGROUNDS[d.name] = backgroundRules(d);
      if (d.feat && !R.ORIGIN_FEATS[d.feat]) { R.ORIGIN_FEATS[d.feat] = d.featDesc; addedFeats.add(d.feat); }
    });
    applied = all;
    listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  }
  let applied = [];

  /* The homebrew a new character uses, copied onto the character. */
  function snapshot({ className, subclass, species, background }) {
    const pick = (type, name, parent) => {
      const d = applied.find(x => x.type === type && x.name === name && (type !== 'subclass' || x.parent === parent));
      if (!d) return null;
      const { carried, ...rest } = d;
      return JSON.parse(JSON.stringify(rest));
    };
    const out = {};
    const cl = pick('class', className); if (cl) out.class = cl;
    const sc = subclass && pick('subclass', subclass, className); if (sc) out.subclass = sc;
    const sp = pick('species', species); if (sp) out.species = sp;
    const bg = pick('background', background); if (bg) out.background = bg;
    return Object.keys(out).length ? out : null;
  }

  /* A short description for a homebrew feature, to show on the sheet. */
  function describe(name, className, subclass) {
    const n = String(name || '').replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
    if (!n) return '';
    const hit = d => (d.features || []).find(f => f.name.toLowerCase() === n && f.desc);
    const sub = applied.find(d => d.type === 'subclass' && d.name === subclass && d.parent === className);
    const cl = applied.find(d => d.type === 'class' && d.name === className);
    const f = (sub && hit(sub)) || (cl && hit(cl));
    return f ? f.desc : '';
  }
  const isHomebrew = (type, name) => Boolean({ class: R.CLASSES, species: R.SPECIES, background: R.BACKGROUNDS }[type]?.[name]?.homebrew);

  /* ---------- Editor ---------- */
  function blank(type, opts = {}) {
    const id = Util.uid();
    if (type === 'class') return clean({ id, type, name: '', die: 8, primary: 'str', saves: ['str', 'con'], skillsN: 2, skillsFrom: ['athletics', 'perception', 'survival', 'intimidation'], acType: 'none', caster: { type: 'none' } });
    if (type === 'subclass') return clean({ id, type, name: '', parent: opts.parent && R.CLASSES[opts.parent] ? opts.parent : Object.keys(R.CLASSES)[0], features: [] });
    if (type === 'species') return clean({ id, type, name: '', sizes: ['Medium'], speed: 30, darkvision: 0, traits: [{ name: '', desc: '' }] });
    return clean({ id, type, name: '', abil: [], skills: [], feat: '' });
  }

  const sel = (k, options, value, extra = '') => `<select data-k="${k}" ${extra}>${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const fld = (label, inner, cls = '') => `<label class="field ${cls}"><span>${label}</span>${inner}</label>`;
  const txt = (k, v, ph = '', max = 120) => `<input data-k="${k}" value="${esc(v)}" maxlength="${max}" placeholder="${esc(ph)}" autocomplete="off">`;
  const area = (k, v, ph = '', rows = 2) => `<textarea data-k="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(v)}</textarea>`;
  const numIn = (k, v, min, max) => `<input type="number" data-k="${k}" data-num value="${esc(v)}" min="${min}" max="${max}">`;
  const checks = (k, opts, chosen, max) => `<div class="hb-checks" data-group="${k}" ${max ? `data-max="${max}"` : ''}>${opts.map(([v, t]) => `<label class="hb-check ${chosen.includes(v) ? 'on' : ''}"><input type="checkbox" data-toggle="${k}" value="${esc(v)}" ${chosen.includes(v) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}</div>`;
  const sec = (title, body, hint = '') => `<section class="lu-section hb-sec"><h3>${title}</h3>${hint ? `<p class="detail-note">${hint}</p>` : ''}${body}</section>`;
  const abilOpts = ABIL.map(a => [a, R.ABIL_NAME[a]]);

  function featureRows(d, levelsAllowed, what) {
    const rows = d.features.map((f, i) => `<div class="hb-row">
        <label class="field narrow"><span>Level</span>${sel(`features.${i}.lv`, levelsAllowed.map(l => [l, l]), f.lv, 'data-num')}</label>
        ${fld('Feature name', txt(`features.${i}.name`, f.name, 'e.g. Storm Step', 50))}
        ${fld('What it does', area(`features.${i}.desc`, f.desc, 'A short description players see on their sheet'), 'wide')}
        <button class="icon-btn" data-del="features.${i}" aria-label="Remove this feature" title="Remove">×</button>
      </div>`).join('');
    return `${rows || `<p class="muted small">No ${what} yet.</p>`}<button class="btn btn-small" data-add="features">Add a feature</button>`;
  }

  function formHTML(d) {
    if (d.type === 'class') {
      const c = d.caster;
      return sec('Character info', `<div class="hb-grid">
          ${fld('Class name', txt('name', d.name, 'e.g. Stormcaller', 40))}
          ${fld('Hit die', sel('die', [6, 8, 10, 12].map(n => [n, `d${n}`]), d.die, 'data-num'), 'narrow')}
          ${fld('Short description', txt('blurb', d.blurb, 'One line players see when choosing', 200), 'wide')}
        </div>`)
        + sec('Ability scores', `<div class="hb-grid">${fld('Main ability', sel('primary', abilOpts, d.primary))}</div>
          <p class="hb-label">Saving throws (choose two)</p>${checks('saves', abilOpts, d.saves, 2)}`,
        'The creator puts the best scores in the main ability and saving throws.')
        + sec('Skills', `<div class="hb-grid">${fld('Skills a player picks', numIn('skillsN', d.skillsN, 0, 6), 'narrow')}</div>
          <p class="hb-label">They choose from</p>${checks('skillsFrom', SKILLS.map(s => [s, R.SKILL_NAME[s]]), d.skillsFrom)}`)
        + sec('Proficiencies', `<div class="hb-grid">
          ${fld('Armor', txt('armor', d.armor, 'e.g. Light and medium armor, shields'))}
          ${fld('Weapons', txt('weapons', d.weapons, 'e.g. Simple and martial weapons'))}
          ${fld('Tools', txt('tools', d.tools, 'Optional'))}</div>`)
        + sec('Equipment', `${fld('Starting equipment', area('equip', d.equip, 'e.g. Chain Shirt, Spear, Explorer\'s Pack, 12 GP'), 'wide')}
          <div class="hb-grid">
            ${fld('Armor class at the start', sel('acType', [['none', 'No armor: 10 + Dex'], ['armor', 'Wears armor'], ['unarmored', 'Unarmored Defense: 10 + Dex + another ability']], d.acType, 'data-redraw'))}
            ${d.acType === 'armor' ? `${fld('Armor base AC', numIn('acBase', d.acBase, 10, 20), 'narrow')}
              ${fld('Dexterity bonus', sel('acMaxDex', [['full', 'Full'], ['2', 'Up to +2'], ['0', 'None (heavy armor)']], d.acMaxDex))}
              <label class="check-line"><input type="checkbox" data-k="acShield" data-bool ${d.acShield ? 'checked' : ''}> Carries a shield (+2)</label>` : ''}
            ${d.acType === 'unarmored' ? fld('Second ability', sel('acExtra', abilOpts, d.acExtra)) : ''}
          </div>
          <p class="hb-label">Starting weapons (up to four, they become attacks on the sheet)</p>${checks('weaponsHeld', Object.keys(R.WEAPONS).map(w => [w, w]), d.weaponsHeld, 4)}`)
        + sec('Features by level', `<div class="hb-grid">
            ${fld('Subclass levels', `<input data-k="subclassLevels" data-levels value="${esc(d.subclassLevels.join(', '))}" placeholder="3, 6, 10, 14">`)}
            ${fld('Ability Score Improvement levels', `<input data-k="asiLevels" data-levels value="${esc(d.asiLevels.join(', '))}" placeholder="4, 8, 12, 16">`)}
            <label class="check-line"><input type="checkbox" data-k="epicBoon" data-bool ${d.epicBoon ? 'checked' : ''}> Epic Boon at level 19</label>
          </div>${featureRows(d, Array.from({ length: 20 }, (_, i) => i + 1), 'class features')}`,
        'Subclasses and Ability Score Improvements are added at the levels you list. Players see each feature\'s description on their sheet.')
        + sec('Spellcasting', `<div class="hb-grid">
            ${fld('Spellcasting', sel('caster.type', Object.entries(CASTER_NAME), c.type, 'data-redraw'))}
            ${c.type !== 'none' ? `${fld('Spellcasting ability', sel('caster.abil', abilOpts, c.abil))}
              ${fld('Cantrips at level 1', numIn('caster.cantrips.0', c.cantrips[0], 0, 9), 'narrow')}
              ${fld('at level 4', numIn('caster.cantrips.1', c.cantrips[1], 0, 9), 'narrow')}
              ${fld('at level 10', numIn('caster.cantrips.2', c.cantrips[2], 0, 9), 'narrow')}` : ''}
          </div>
          ${c.type !== 'none' ? `<p class="hb-label">Spells come from these class lists</p>${checks('caster.lists', LISTS.map(l => [l, l]), c.lists)}` : ''}`,
        c.type !== 'none' ? 'Spell slots and prepared spells follow the official table for this kind of caster.' : '');
    }
    if (d.type === 'subclass') {
      const lv = subLevels(d.parent);
      return sec('Subclass', `<div class="hb-grid">
          ${fld('Class', sel('parent', Object.keys(R.CLASSES).map(k => [k, R.CLASSES[k].homebrew ? `${k} (homebrew)` : k]), d.parent, 'data-redraw'))}
          ${fld('Subclass name', txt('name', d.name, 'e.g. Oath of the Tides', 40))}
          ${fld('Short description', txt('blurb', d.blurb, 'Optional', 200), 'wide')}
        </div>`)
        + sec('Combat', `<div class="hb-grid">
            ${fld('Armor class bonus', numIn('acBonus', d.acBonus, 0, 5), 'narrow')}
            ${fld('Extra speed (ft)', numIn('speedBonus', d.speedBonus, 0, 60), 'narrow')}
            ${fld('Extra hit points per level', numIn('hpPerLevel', d.hpPerLevel, 0, 5), 'narrow')}
          </div>
          <p class="hb-label">Attacks the subclass gives (added to the sheet when the subclass is chosen)</p>
          ${d.attacks.map((a, i) => `<div class="hb-row">
            ${fld('Attack name', txt(`attacks.${i}.name`, a.name, 'e.g. Tide Lash', 40))}
            ${fld('Damage die', sel(`attacks.${i}.die`, DICE.map(x => [x, x]), a.die), 'narrow')}
            ${fld('Uses', sel(`attacks.${i}.abil`, [['str', 'Strength'], ['dex', 'Dexterity'], ['finesse', 'The better of the two']], a.abil))}
            <button class="icon-btn" data-del="attacks.${i}" aria-label="Remove this attack" title="Remove">×</button></div>`).join('')}
          ${d.attacks.length < 4 ? '<button class="btn btn-small" data-add="attacks">Add an attack</button>' : ''}`,
        'Leave these at 0 if the subclass doesn\'t change them.')
        + sec('Features & traits', lv.length ? featureRows(d, lv, 'subclass features') : `<p class="detail-note">${esc(d.parent)} has no subclass levels.</p>`,
          `${esc(d.parent)} gets subclass features at level${lv.length > 1 ? 's' : ''} ${lv.join(', ')}.`);
    }
    if (d.type === 'species') {
      return sec('Species', `<div class="hb-grid">
          ${fld('Species name', txt('name', d.name, 'e.g. Owlfolk', 40))}
          ${fld('Speed (ft)', numIn('speed', d.speed, 5, 60), 'narrow')}
          ${fld('Darkvision', sel('darkvision', [[0, 'None'], [60, '60 ft'], [120, '120 ft']], d.darkvision, 'data-num'), 'narrow')}
          ${fld('Short description', txt('blurb', d.blurb, 'One line players see when choosing', 200), 'wide')}
        </div>`)
        + sec('Size', checks('sizes', SIZES.map(s => [s, s]), d.sizes), 'Tick every size a player of this species can choose.')
        + sec('Unique features', `${d.traits.map((t, i) => `<div class="hb-row">
            ${fld('Feature name', txt(`traits.${i}.name`, t.name, 'e.g. Silent Flight', 50))}
            ${fld('What it does', area(`traits.${i}.desc`, t.desc, 'A short description'), 'wide')}
            <button class="icon-btn" data-del="traits.${i}" aria-label="Remove this feature" title="Remove">×</button></div>`).join('')}
          <button class="btn btn-small" data-add="traits">Add a feature</button>`);
    }
    const official = [...OFFICIAL.feat];
    const custom = d.feat && !OFFICIAL.feat.has(d.feat);
    return sec('Background', `<div class="hb-grid">
        ${fld('Background name', txt('name', d.name, 'e.g. Lighthouse Keeper', 40))}
        ${fld('Tool proficiency', txt('tool', d.tool, 'e.g. Navigator\'s Tools'))}
        ${fld('Equipment', area('equip', d.equip, 'e.g. Lantern, Spyglass, Traveler\'s Clothes, 15 GP'), 'wide')}
      </div>`)
      + sec('Ability scores', checks('abil', abilOpts, d.abil, 3), 'Choose three. Players put +2 and +1, or +1 in all three.')
      + sec('Skills', `<div class="hb-grid">${[0, 1].map(i => fld(i ? 'Second skill' : 'First skill', sel(`skills.${i}`, [['', 'Choose a skill'], ...SKILLS.map(s => [s, R.SKILL_NAME[s]])], d.skills[i] || ''))).join('')}</div>`)
      + sec('Origin feat', `<div class="hb-grid">
          ${fld('Feat', sel('featPick', [['', 'Choose a feat'], ...official.map(f => [f, f]), ['__new__', 'Make a new feat…']], custom || d.featNew ? '__new__' : d.feat, 'data-redraw'))}
          ${custom || d.featNew ? `${fld('New feat name', txt('feat', d.feat, 'e.g. Keen-Eyed Watcher', 50))}${fld('What it does', area('featDesc', d.featDesc, 'A short description'), 'wide')}` : ''}
        </div>${!custom && !d.featNew && d.feat ? `<p class="detail-note">${esc(R.ORIGIN_FEATS[d.feat] || '')}</p>` : ''}`);
  }

  function edit(type, existing, opts = {}) {
    const d = existing ? JSON.parse(JSON.stringify(existing)) : blank(type, opts);
    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal hb-modal" role="dialog" aria-modal="true" aria-labelledby="hb-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const lastFocus = document.activeElement;
    const close = () => { document.removeEventListener('keydown', onKey); host.remove(); if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true }); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    function render() {
      const scroll = body.querySelector('.modal-body')?.scrollTop || 0;
      body.innerHTML = `<header class="modal-head"><div><h2 id="hb-title">${existing ? `Edit ${esc(existing.name)}` : `New ${KIND[type].title.toLowerCase()}`}</h2>
          <p class="muted">${existing ? 'Changes apply to new characters and level-ups. Characters already made keep their copy.' : 'It stays in your list of options until you delete it.'}</p></div>
          <button class="icon-btn" data-act="close" aria-label="Close">×</button></header>
        <div class="modal-body">${formHTML(d)}</div>
        <footer class="modal-foot"><span class="foot-hint" data-ref="hint"></span><button class="btn" data-act="close">Cancel</button><button class="btn btn-primary" data-act="save">Save ${KIND[type].one}</button></footer>`;
      body.querySelector('.modal-body').scrollTop = scroll;
      hint();
    }
    const hint = () => { const h = body.querySelector('[data-ref="hint"]'); if (h) h.textContent = problem(clean(d), d.id); };

    host.addEventListener('input', e => {
      const t = e.target;
      if (!t.dataset.k || t.dataset.redraw !== undefined || t.type === 'checkbox') return;
      setField(t);
      hint();
    });
    host.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.toggle) {
        const k = t.dataset.toggle;
        const list = Util.getPath(d, k) || [];
        const max = Number(t.closest('[data-group]').dataset.max) || 0;
        let next = t.checked ? [...list, t.value] : list.filter(x => x !== t.value);
        if (max && next.length > max) next = next.slice(next.length - max); // keep the newest picks
        Util.setPath(d, k, next);
        return render();
      }
      if (!t.dataset.k) return;
      setField(t);
      if (t.dataset.k === 'featPick') {
        d.featNew = t.value === '__new__';
        if (!d.featNew) { d.feat = t.value; d.featDesc = ''; } else if (OFFICIAL.feat.has(d.feat)) d.feat = '';
      }
      if (t.dataset.k === 'caster.type') d.caster.cantrips = (CANTRIPS[t.value] || [0, 0, 0]).slice();
      if (t.dataset.k === 'parent') { const lv = subLevels(d.parent); d.features.forEach(f => { if (!lv.includes(f.lv)) f.lv = lv[0] || 3; }); }
      if (t.dataset.redraw !== undefined || t.tagName === 'SELECT') render(); else hint();
    });
    function setField(t) {
      const k = t.dataset.k;
      if (k === 'featPick') return;
      let v = t.value;
      if (t.dataset.bool !== undefined) v = t.checked;
      else if (t.dataset.num !== undefined) v = Number(v);
      else if (t.dataset.levels !== undefined) v = levels(v);
      Util.setPath(d, k, v);
    }
    host.addEventListener('click', e => {
      if (e.target === host) return close();
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'close') return close();
      if (b.dataset.add) {
        const k = b.dataset.add;
        if (k === 'features') {
          const allowed = d.type === 'subclass' ? subLevels(d.parent) : null;
          const lastLv = d.features.length ? d.features[d.features.length - 1].lv : (allowed ? allowed[0] : 1);
          d.features.push({ lv: lastLv || 1, name: '', desc: '' });
        }
        if (k === 'traits') d.traits.push({ name: '', desc: '' });
        if (k === 'attacks') d.attacks.push({ name: '', die: '1d6', abil: 'str' });
        render();
        const rows = body.querySelectorAll(`[data-k^="${k}."][data-k$=".name"]`);
        rows[rows.length - 1]?.focus();
        return;
      }
      if (b.dataset.del) {
        const [k, i] = b.dataset.del.split('.');
        d[k].splice(Number(i), 1);
        return render();
      }
      if (b.dataset.act === 'save') {
        const c = clean(d);
        const why = problem(c, d.id);
        if (why) { Util.toast(why, 'error'); hint(); return; }
        const saved = save(c);
        close();
        Util.toast(`${saved.name} saved to your homebrew.`);
        if (opts.onSave) opts.onSave(saved);
      }
    });
    render();
    body.querySelector('[data-k="name"]')?.focus();
  }

  /* ---------- Download and upload ---------- */
  function download(list, filename) {
    Util.download(filename, { format: 'campaign-codex-homebrew', version: 1, items: list.map(x => JSON.parse(JSON.stringify(x))) });
  }
  async function upload() {
    const data = await Util.pickJSON();
    const raw = data && data.format === 'campaign-codex-homebrew' && Array.isArray(data.items) ? data.items : null;
    if (!raw) throw new Error('That file isn\'t a Campaign Codex homebrew file.');
    // Classes first, so subclasses for them can be added.
    const sorted = raw.slice(0, 200).map(clean).filter(Boolean).sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
    let added = 0;
    const skipped = [];
    sorted.forEach(d => {
      d.id = byId(d.id) ? Util.uid() : d.id;
      let name = d.name, n = 2;
      while (name && items().some(x => x.type === d.type && x.name.toLowerCase() === name.toLowerCase() && (d.type !== 'subclass' || x.parent === d.parent))) name = cleanName(`${d.name} ${n++}`);
      d.name = name;
      const why = problem(d, d.id);
      if (why) { skipped.push(`${d.name || 'unnamed'}: ${why}`); return; }
      items().push(d);
      added++;
      apply();
    });
    Store.save();
    apply();
    return { added, skipped };
  }

  /* ---------- Manager ---------- */
  function manage(opts = {}) {
    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal hb-modal" role="dialog" aria-modal="true" aria-labelledby="hbm-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const close = () => { document.removeEventListener('keydown', onKey); off(); host.remove(); if (opts.onClose) opts.onClose(); };
    const onKey = e => { if (e.key === 'Escape' && !document.querySelector('.hb-modal [data-act="save"]')) close(); };
    document.addEventListener('keydown', onKey);
    const off = on(() => { if (host.isConnected) render(); });

    const rowHTML = (x, extra = '') => `<li data-id="${esc(x.id)}">
        <span class="hb-name"><b>${esc(x.name)}</b>${extra}</span>
        <button class="link-btn" data-hb="edit">Edit</button>
        <button class="link-btn" data-hb="download">Download</button>
        <button class="link-btn danger" data-hb="delete">Delete</button></li>`;
    const subsOf = name => items().filter(x => x.type === 'subclass' && x.parent === name);
    const simple = (t, title) => {
      const mine = items().filter(x => x.type === t);
      return `<section class="lu-section"><div class="hb-head"><h3>${title}</h3><button class="btn btn-small" data-new="${t}">New ${KIND[t].one}</button></div>
        ${mine.length ? `<ul class="hb-list">${mine.map(x => rowHTML(x)).join('')}</ul>` : '<p class="muted small">None yet.</p>'}</section>`;
    };

    function render() {
      const list = items();
      const classes = list.filter(x => x.type === 'class');
      const mineNames = new Set(classes.map(x => x.name));
      // Subclasses for other classes, grouped by the class they belong to.
      const others = {};
      list.filter(x => x.type === 'subclass' && !mineNames.has(x.parent)).forEach(x => { (others[x.parent] = others[x.parent] || []).push(x); });
      const otherNames = Object.keys(others).sort((a, b) => a.localeCompare(b));
      body.innerHTML = `<header class="modal-head"><div><h2 id="hbm-title">Your homebrew</h2>
          <p class="muted">Classes (with their subclasses), species and backgrounds you've made. They show up as options when you create a character.</p></div>
          <button class="icon-btn" data-act="close" aria-label="Close">×</button></header>
        <div class="modal-body">
          <section class="lu-section"><div class="hb-head"><h3>Classes and their subclasses</h3><button class="btn btn-small" data-new="class">New class</button></div>
            ${classes.length ? `<ul class="hb-list">${classes.map(c => {
              const subs = subsOf(c.name);
              return `${rowHTML(c, `<small>${subs.length} subclass${subs.length === 1 ? '' : 'es'}</small>`)}
                <li class="hb-subs"><ul class="hb-list hb-sublist">${subs.map(s => rowHTML(s)).join('')}
                  <li class="hb-add"><button class="link-btn" data-new="subclass" data-parent="${esc(c.name)}">+ New ${esc(c.name)} subclass</button></li></ul></li>`;
            }).join('')}</ul>` : '<p class="muted small">None yet.</p>'}
          </section>
          <section class="lu-section"><div class="hb-head"><h3>Subclasses for other classes</h3><button class="btn btn-small" data-new="subclass">New subclass</button></div>
            ${otherNames.length ? otherNames.map(n => `<h4 class="hb-parent">${esc(n)}${R.CLASSES[n] ? '' : ' <small class="muted">(this class isn\'t in your options)</small>'}</h4>
              <ul class="hb-list hb-sublist">${others[n].map(s => rowHTML(s)).join('')}</ul>`).join('')
              : '<p class="muted small">Homebrew subclasses for official classes, like a new Fighter subclass, go here.</p>'}
          </section>
          ${simple('species', 'Species')}
          ${simple('background', 'Backgrounds')}
          <p class="muted small">Deleting a homebrew takes it off your list (deleting a class also deletes its subclasses). Characters already made with it keep working.</p>
        </div>
        <footer class="modal-foot"><button class="btn" data-act="upload">Upload homebrew</button>${list.length ? '<button class="btn" data-act="download-all">Download all</button>' : ''}<span class="foot-hint"></span><button class="btn btn-primary" data-act="close">Done</button></footer>`;
    }

    host.addEventListener('click', async e => {
      if (e.target === host) return close();
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.act === 'close') return close();
      if (b.dataset.new) return edit(b.dataset.new, null, { parent: b.dataset.parent });
      if (b.dataset.act === 'download-all') { download(items(), 'campaign-codex-homebrew.json'); return Util.toast('Homebrew downloaded. Send the file to a friend to upload.'); }
      if (b.dataset.act === 'upload') {
        try {
          const { added, skipped } = await upload();
          Util.toast(added ? `Added ${added} homebrew option${added > 1 ? 's' : ''}.${skipped.length ? ` Skipped ${skipped.length}.` : ''}` : `Nothing added. ${skipped[0] || ''}`, added ? 'info' : 'error');
        } catch (err) { Util.toast(err.message, 'error'); }
        return render();
      }
      const row = b.closest('[data-id]');
      const x = row && byId(row.dataset.id);
      if (!x) return;
      const subs = x.type === 'class' ? subsOf(x.name) : [];
      if (b.dataset.hb === 'edit') return edit(x.type, x);
      if (b.dataset.hb === 'download') {
        // A class downloads with its subclasses, so they travel together.
        download([x, ...subs], `${Util.slug(x.name)}-homebrew.json`);
        return Util.toast(subs.length ? `${x.name} and its ${subs.length} subclass${subs.length === 1 ? '' : 'es'} downloaded.` : `${x.name} downloaded.`);
      }
      if (b.dataset.hb === 'delete') {
        if (!b.dataset.armed) {
          b.dataset.armed = '1'; b.textContent = subs.length ? `Click again to delete it and its ${subs.length} subclass${subs.length === 1 ? '' : 'es'}` : 'Click again to delete';
          setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete'; } }, 3000);
          return;
        }
        const gone = new Set([x.id, ...subs.map(s => s.id)]);
        lib().items = items().filter(i => !gone.has(i.id));
        Store.save();
        apply();
        Util.toast(subs.length ? `Deleted ${x.name} and its subclasses.` : `Deleted ${x.name}.`);
      }
    });
    render();
  }

  function on(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  // Changes from another device: put them into the rules before the page redraws.
  window.addEventListener('codex:synced', () => apply());
  apply();

  return { apply, items, find, byId, save, remove, edit, manage, snapshot, describe, isHomebrew, subLevels, on, clean, problem, upload, OFFICIAL };
})();
