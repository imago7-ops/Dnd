'use strict';

/*
 * The Spells tab: laid out like the spell page of the official character sheet.
 * Spellcasting class, ability, save DC and attack bonus at the top; cantrips; then each
 * spell level with its slots (tick them off as you use them) and your spells, with a
 * prepared marker. Pick spells from the built-in list (js/spell-list.js) or add your own.
 *
 * Saved on the character as c.spellbook = {
 *   list: [{ n: name, p: 0 | 1 | 'a' (always prepared), lvl?: custom level, src?: note }],
 *   used: { 1: count… }, pactUsed, arcana: { 6: true… }, abil?: override, max?: { 1: n… } override
 * }
 */
const Spellbook = (() => {
  const esc = Util.esc;
  const R = () => Rules;
  const ORD = ['Cantrips', '1st level', '2nd level', '3rd level', '4th level', '5th level', '6th level', '7th level', '8th level', '9th level'];
  const LIST_OF = { Bard: 'Bard', Cleric: 'Cleric', Druid: 'Druid', Paladin: 'Paladin', Ranger: 'Ranger', Sorcerer: 'Sorcerer', Warlock: 'Warlock', Wizard: 'Wizard' };
  /* Popular, dependable picks for each class: marked with a star in the spell picker. */
  const RECOMMENDED = {
    Bard: ['Vicious Mockery', 'Minor Illusion', 'Mage Hand', 'Healing Word', 'Faerie Fire', 'Dissonant Whispers', 'Sleep', 'Invisibility', 'Suggestion', 'Heat Metal', 'Hold Person', 'Hypnotic Pattern', 'Dispel Magic', 'Fear', 'Polymorph', 'Greater Invisibility', 'Dimension Door', 'Animate Objects', 'Greater Restoration', 'Mass Cure Wounds', 'Irresistible Dance', 'Mass Suggestion', 'Forcecage', 'Teleport', 'Mind Blank', 'Feeblemind', 'Foresight', 'Power Word Heal'],
    Cleric: ['Sacred Flame', 'Guidance', 'Toll the Dead', 'Bless', 'Healing Word', 'Guiding Bolt', 'Cure Wounds', 'Sanctuary', 'Spiritual Weapon', 'Aid', 'Lesser Restoration', 'Hold Person', 'Spirit Guardians', 'Revivify', 'Mass Healing Word', 'Dispel Magic', 'Banishment', 'Death Ward', 'Guardian of Faith', 'Greater Restoration', 'Raise Dead', 'Flame Strike', 'Heal', "Heroes' Feast", 'Resurrection', 'Plane Shift', 'Holy Aura', 'Mass Heal', 'Gate'],
    Druid: ['Guidance', 'Produce Flame', 'Shillelagh', 'Starry Wisp', 'Healing Word', 'Entangle', 'Goodberry', 'Faerie Fire', 'Moonbeam', 'Pass without Trace', 'Heat Metal', 'Spike Growth', 'Call Lightning', 'Conjure Animals', 'Dispel Magic', 'Plant Growth', 'Polymorph', 'Wall of Fire', 'Freedom of Movement', 'Mass Cure Wounds', 'Greater Restoration', 'Wall of Stone', 'Heal', 'Sunbeam', 'Fire Storm', 'Regenerate', 'Animal Shapes', 'Sunburst', 'Shapechange', 'Foresight'],
    Paladin: ['Bless', 'Divine Smite', 'Shield of Faith', 'Command', 'Heroism', 'Aid', 'Find Steed', 'Magic Weapon', 'Lesser Restoration', 'Revivify', 'Aura of Vitality', 'Dispel Magic', "Crusader's Mantle", 'Death Ward', 'Banishment', 'Aura of Life', 'Circle of Power', 'Destructive Wave', 'Greater Restoration'],
    Ranger: ["Hunter's Mark", 'Goodberry', 'Cure Wounds', 'Ensnaring Strike', 'Hail of Thorns', 'Pass without Trace', 'Spike Growth', 'Lesser Restoration', 'Conjure Animals', 'Lightning Arrow', 'Conjure Barrage', 'Freedom of Movement', 'Conjure Woodland Beings', 'Swift Quiver', 'Conjure Volley', 'Tree Stride'],
    Sorcerer: ['Fire Bolt', 'Sorcerous Burst', 'Mage Hand', 'Minor Illusion', 'Prestidigitation', 'Shield', 'Magic Missile', 'Chromatic Orb', 'Sleep', 'Misty Step', 'Scorching Ray', 'Hold Person', 'Mirror Image', 'Fireball', 'Counterspell', 'Haste', 'Hypnotic Pattern', 'Greater Invisibility', 'Polymorph', 'Banishment', 'Cone of Cold', 'Animate Objects', 'Telekinesis', 'Chain Lightning', 'Disintegrate', 'Teleport', 'Finger of Death', 'Sunburst', 'Dominate Monster', 'Wish', 'Meteor Swarm'],
    Warlock: ['Eldritch Blast', 'Minor Illusion', 'Prestidigitation', 'Hex', 'Armor of Agathys', 'Protection from Evil and Good', 'Misty Step', 'Hold Person', 'Darkness', 'Suggestion', 'Counterspell', 'Hypnotic Pattern', 'Hunger of Hadar', 'Fly', 'Banishment', 'Dimension Door', 'Hold Monster', 'Scrying', 'Mass Suggestion', 'Circle of Death', 'Forcecage', 'Plane Shift', 'Dominate Monster', 'Glibness', 'Foresight', 'Power Word Kill'],
    Wizard: ['Fire Bolt', 'Mage Hand', 'Minor Illusion', 'Prestidigitation', 'Ray of Frost', 'Shield', 'Magic Missile', 'Mage Armor', 'Find Familiar', 'Detect Magic', 'Sleep', 'Misty Step', 'Web', 'Hold Person', 'Invisibility', 'Fireball', 'Counterspell', 'Haste', 'Hypnotic Pattern', 'Fly', 'Polymorph', 'Greater Invisibility', 'Banishment', 'Dimension Door', 'Wall of Force', 'Animate Objects', 'Telekinesis', 'Chain Lightning', 'Disintegrate', 'Contingency', 'Forcecage', 'Teleport', 'Simulacrum', 'Maze', 'Mind Blank', 'Wish', 'Time Stop'],
    'Eldritch Knight': ['Shocking Grasp', 'True Strike', 'Blade Ward', 'Shield', 'Magic Missile', 'Find Familiar', 'Misty Step', 'Mirror Image', 'Blur', 'Haste', 'Counterspell', 'Fly', 'Dimension Door'],
    'Arcane Trickster': ['Mage Hand', 'Minor Illusion', 'Message', 'Shield', 'Disguise Self', 'Silent Image', 'Sleep', 'Invisibility', 'Misty Step', 'Mirror Image', 'Hypnotic Pattern', 'Counterspell', 'Fly', 'Greater Invisibility'],
  };
  const recommendedFor = k => new Set((k && (RECOMMENDED[k.className] || [])) || []);

  const THIRD_PREPARED = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];

  const modOf = s => Math.floor((Util.num(s, 10) - 10) / 2);
  const levelOf = c => Util.clamp(Util.num(c.level, 1), 1, 20);

  function book(c) {
    if (!c.spellbook || typeof c.spellbook !== 'object') c.spellbook = {};
    const b = c.spellbook;
    if (!Array.isArray(b.list)) b.list = [];
    if (!b.used || typeof b.used !== 'object') b.used = {};
    if (!b.arcana || typeof b.arcana !== 'object') b.arcana = {};
    b.pactUsed = Util.num(b.pactUsed, 0);
    return b;
  }

  /*
   * Spells your species gives you: always prepared and never counted toward class limits.
   * [name, character level it arrives at]. Matched against the Species field, e.g. "Elf (High Elf)".
   */
  const SPECIES_SPELLS = {
    Aasimar: [['Light', 1]],
    Tiefling: [['Thaumaturgy', 1]],
    Abyssal: [['Poison Spray', 1], ['Ray of Sickness', 3], ['Hold Person', 5]],
    Chthonic: [['Chill Touch', 1], ['False Life', 3], ['Ray of Enfeeblement', 5]],
    Infernal: [['Fire Bolt', 1], ['Hellish Rebuke', 3], ['Darkness', 5]],
    Drow: [['Dancing Lights', 1], ['Faerie Fire', 3], ['Darkness', 5]],
    'High Elf': [['Prestidigitation', 1], ['Detect Magic', 3], ['Misty Step', 5]],
    'Wood Elf': [['Druidcraft', 1], ['Longstrider', 3], ['Pass without Trace', 5]],
    'Forest Gnome': [['Minor Illusion', 1], ['Speak with Animals', 1]],
    'Rock Gnome': [['Mending', 1], ['Prestidigitation', 1]],
  };
  const SPELL_LEVELS = { 'Ray of Sickness': 1, 'Hold Person': 2, 'False Life': 1, 'Ray of Enfeeblement': 2, 'Hellish Rebuke': 1, Darkness: 2, 'Faerie Fire': 1, 'Detect Magic': 1, 'Misty Step': 2, Longstrider: 1, 'Pass without Trace': 2, 'Speak with Animals': 1 };

  function speciesGrants(c) {
    const sp = String(c.species || '');
    const L = levelOf(c);
    const out = [];
    Object.entries(SPECIES_SPELLS).forEach(([key, list]) => {
      if (!new RegExp(`\\b${key}\\b`, 'i').test(sp)) return;
      list.forEach(([n, at]) => { if (L >= at && !out.some(x => x.n === n)) out.push({ n, src: key }); });
    });
    return out;
  }

  /* Add species spells the character should have (and drop ones from a species they no longer are). */
  function syncGranted(c) {
    const b = book(c);
    const want = speciesGrants(c);
    const before = b.list.length;
    b.list = b.list.filter(e => e.auto !== 'species' || want.some(w => w.n === e.n));
    let changed = b.list.length !== before;
    want.forEach(w => {
      const have = b.list.find(e => e.n.toLowerCase() === w.n.toLowerCase());
      if (have) {
        if (!have.src || have.p !== 'a') { have.src = have.src || w.src; have.p = 'a'; changed = true; }
        return;
      }
      const known = typeof SpellList !== 'undefined' && SpellList.byName(w.n);
      b.list.push(known ? { n: known.name, p: 'a', src: w.src, auto: 'species' }
        : { n: w.n, lvl: SPELL_LEVELS[w.n] || 1, custom: true, p: 'a', src: w.src, auto: 'species' });
      changed = true;
    });
    return changed;
  }

  /* Magic Initiate feats on this character: from the background, or named in the features. */
  function magicInitiates(c) {
    const set = new Set();
    const bg = typeof Rules !== 'undefined' && R().BACKGROUNDS && R().BACKGROUNDS[c.background];
    const add = f => { const m = /^Magic Initiate \((\w+)\)/.exec(f || ''); if (m) set.add(m[1]); };
    if (bg) add(bg.feat);
    (String(c.features || '').match(/Magic Initiate \((Cleric|Druid|Wizard)\)/g) || []).forEach(add);
    return [...set];
  }

  function grantsHTML(c) {
    const b = book(c);
    return magicInitiates(c).map(cls => {
      const src = `Magic Initiate (${cls})`;
      const mine = b.list.filter(e => e.src === src);
      const cantrips = mine.filter(e => levelOfEntry(e) === 0).length, firsts = mine.length - cantrips;
      if (cantrips >= 2 && firsts >= 1) return '';
      return `<div class="sb-grant"><span><b>${esc(src)}:</b> choose two ${cls.toLowerCase()} cantrips and one level 1 ${cls.toLowerCase()} spell (${cantrips} of 2 cantrips, ${firsts} of 1 spell chosen). They don't count toward your limits.</span>
        <button class="btn" data-sb="pick-mi" data-cls="${esc(cls)}">Choose them</button></div>`;
    }).join('');
  }

  /* What kind of caster this character is, from class, subclass and level. */
  function caster(c) {
    const L = levelOf(c);
    const cl = typeof Rules !== 'undefined' && R().CLASSES[c.className];
    if (cl && cl.caster) {
      const k = cl.caster;
      return {
        className: c.className, lists: listsFor(c), abil: k.abil, type: k.type,
        cantrips: R().cantripsKnown(k, L), prepared: k.prepared[L - 1], slots: R().spellSlots(k, L),
      };
    }
    const third = cl && L >= 3 && (c.subclass === 'Eldritch Knight' || c.subclass === 'Arcane Trickster');
    if (third) {
      const full = R().spellSlots({ type: 'full' }, Math.ceil(L / 3));
      return {
        className: `${c.subclass}`, lists: ['Wizard'], abil: 'int', type: 'third',
        cantrips: c.subclass === 'Arcane Trickster' ? (L >= 10 ? 4 : 3) : (L >= 10 ? 3 : 2),
        prepared: THIRD_PREPARED[L - 1], slots: full,
      };
    }
    return null;
  }

  function listsFor(c) {
    const own = LIST_OF[c.className];
    if (!own) return [];
    if (c.className === 'Bard' && levelOf(c) >= 10) return ['Bard', 'Cleric', 'Druid', 'Wizard'];
    return [own];
  }

  /* Slot maximums per level (index 1-9), honoring any manual override. */
  function slotMax(c, k) {
    const b = book(c);
    const out = Array(10).fill(0);
    if (k && Array.isArray(k.slots)) k.slots.forEach((n, i) => { out[i + 1] = n; });
    if (b.max) Object.entries(b.max).forEach(([lv, n]) => { if (n !== '' && n != null) out[Number(lv)] = Util.clamp(Util.num(n, 0), 0, 9); });
    return out;
  }

  function stats(c) {
    const k = caster(c);
    const b = book(c);
    const abil = b.abil || (k && k.abil) || 'int';
    const pb = R().profBonus(levelOf(c));
    const m = modOf(c.abilities && c.abilities[abil]);
    return { k, abil, dc: 8 + pb + m, atk: pb + m };
  }

  const info = entry => (entry.custom ? null : SpellList.byName(entry.n));
  const levelOfEntry = e => { const s = info(e); return s ? s.level : Util.clamp(Util.num(e.lvl, 1), 0, 9); };

  /*
   * Spells that count toward the class limits. Always-prepared spells and spells with a
   * source (a feat, species, magic item or the DM) don't count.
   */
  const counted = e => e.p !== 'a' && !e.src;
  const isWizard = c => c.className === 'Wizard';

  function counts(c) {
    const b = book(c);
    let cantrips = 0, prepared = 0, known = 0;
    b.list.forEach(e => {
      const lv = levelOfEntry(e);
      if (!counted(e)) return;
      if (lv === 0) cantrips++;
      else {
        known++;
        if (e.p === 1 || e.p === true) prepared++;
      }
    });
    return { cantrips, prepared, known };
  }

  /* The class's limits: cantrips, spells you can have (wizards: spellbook size), prepared. */
  function limits(c) {
    const k = caster(c);
    if (!k) return null;
    return {
      cantrips: k.cantrips || 0,
      known: isWizard(c) ? 4 + 2 * levelOf(c) : k.prepared,
      prepared: k.prepared,
      wizard: isWizard(c),
    };
  }

  /* Why this spell can't be added right now, or '' if it can. */
  function blockReason(c, level) {
    const lim = limits(c);
    if (!lim) return '';
    const n = counts(c);
    if (level === 0) {
      if (n.cantrips >= lim.cantrips) return lim.cantrips ? `You can have ${lim.cantrips} cantrips at this level. Remove one to choose another.` : 'Your class doesn\'t get cantrips.';
      return '';
    }
    if (n.known >= lim.known) {
      return lim.wizard
        ? `Your spellbook holds ${lim.known} spells at this level (6 at level 1, +2 each level). Remove one to add another.`
        : `You can have ${lim.known} prepared spells at this level. Remove one to choose another.`;
    }
    return '';
  }

  /* ---------- Rendering ---------- */
  function headHTML(c) {
    const s = stats(c);
    return `<div class="sb-head">
      <div class="sb-box wide"><span class="sb-cap">Spellcasting class</span><b>${esc(s.k ? s.k.className : 'None')}</b></div>
      <label class="sb-box"><span class="sb-cap">Ability</span>
        <select data-sb="abil">${R().ABIL.map(a => `<option value="${a}" ${a === s.abil ? 'selected' : ''}>${R().ABIL_NAME[a]}</option>`).join('')}</select></label>
      <div class="sb-box"><span class="sb-cap">Spell save DC</span><b data-sb-out="dc">${s.dc}</b></div>
      <button class="sb-box sb-roll" data-sb="roll-atk" title="Roll a spell attack"><span class="sb-cap">Spell attack</span><b data-sb-out="atk">${Util.fmtMod(s.atk)}</b></button>
    </div>`;
  }

  function metaHTML(c) {
    const s = stats(c);
    const n = counts(c);
    const k = s.k;
    const parts = [];
    if (k) {
      const lim = limits(c);
      if (lim.cantrips) parts.push(`<span class="${n.cantrips > lim.cantrips ? 'over' : ''}">Cantrips <b>${n.cantrips}</b> of ${lim.cantrips}</span>`);
      if (lim.wizard) parts.push(`<span class="${n.known > lim.known ? 'over' : ''}">Spellbook <b>${n.known}</b> of ${lim.known}</span>`);
      parts.push(`<span class="${n.prepared > lim.prepared ? 'over' : ''}">Prepared <b>${n.prepared}</b> of ${lim.prepared}</span>`);
      if (n.cantrips > lim.cantrips || n.known > lim.known || n.prepared > lim.prepared) parts.push('<span class="over">Over your limit: remove or unprepare spells (this can happen after lowering your level).</span>');
      if (k.slots && k.slots.pact) parts.push(`<span>Pact slots: level ${k.slots.slotLevel}, back on a short rest</span>`);
    } else {
      parts.push('<span>No spellcasting class. You can still add spells (from a feat or species) and set slots below.</span>');
    }
    return `<div class="sb-meta">${parts.join('')}</div>
      <div class="sb-actions">
        <button class="btn btn-primary" data-sb="pick">Choose spells</button>
        <button class="btn" data-sb="long">Long rest</button>
        ${k && k.slots && k.slots.pact ? '<button class="btn" data-sb="short">Short rest</button>' : ''}
        <label class="sb-filter"><input type="checkbox" data-sb="only-prepared" ${book(c).onlyPrepared ? 'checked' : ''}> Show prepared only</label>
      </div>`;
  }

  function boxes(n, used, kind) {
    return Array.from({ length: n }, (_, i) => `<button class="sb-slot ${i < used ? 'used' : ''}" data-sb="${kind}" data-i="${i}" aria-label="Slot ${i + 1}${i < used ? ', used' : ''}" aria-pressed="${i < used}"></button>`).join('');
  }

  function rowHTML(c, e, idx, lv, s) {
    const sp = info(e);
    const always = e.p === 'a';
    const prepared = e.p === 1 || e.p === true || always;
    const open = openRows.has(idx);
    const tags = [];
    if (sp && sp.conc) tags.push('<span class="sb-tag" title="Concentration">C</span>');
    if (sp && sp.ritual) tags.push('<span class="sb-tag" title="Ritual">R</span>');
    const atk = sp && /spell attack/i.test(sp.summary);
    const dice = sp && (/(\d+d\d+(?:\s*\+\s*\d+)?)/.exec(sp.summary) || [])[1];
    const save = sp && /\b(Str|Dex|Con|Int|Wis|Cha) save\b/.exec(sp.summary);
    return `<li class="sb-row ${open ? 'open' : ''} ${prepared ? 'prep' : ''}" data-idx="${idx}">
      <div class="sb-line">
        ${lv === 0 ? '<span class="sb-dot cantrip" aria-hidden="true"></span>'
          : `<button class="sb-dot ${always ? 'always' : prepared ? 'on' : ''}" data-sb="prep" aria-pressed="${prepared}" title="${always ? 'Always prepared' : prepared ? 'Prepared. Click to unprepare.' : 'Not prepared. Click to prepare.'}"></button>`}
        <button class="sb-name" data-sb="toggle" aria-expanded="${open}">${esc(e.n)}${tags.join('')}${e.src ? `<small>${esc(e.src)}</small>` : ''}</button>
        <span class="sb-brief">${sp ? `${esc(sp.time.replace(/ \(.*\)$/, ''))} · ${esc(sp.range)}` : 'Custom spell'}</span>
        <span class="sb-quick">
          ${atk ? '<button class="chip-btn" data-sb="atk" title="Roll the spell attack">Hit</button>' : ''}
          ${save ? `<span class="sb-dc" title="Targets make a ${esc(save[1])} save">${esc(save[1])} ${s.dc}</span>` : ''}
          ${dice ? `<button class="chip-btn" data-sb="dmg" data-dice="${esc(dice.replace(/\s+/g, ''))}" title="Roll ${esc(dice)}">${esc(dice.replace(/\s+/g, ''))}</button>` : ''}
          ${lv > 0 ? '<button class="chip-btn" data-sb="cast" title="Cast it: uses your lowest free slot of this level or higher">Cast</button>' : ''}
        </span>
      </div>
      ${open ? `<div class="sb-detail">
        ${sp ? `<p>${esc(sp.summary)}</p>
          <dl class="sb-facts">
            <div><dt>Casting time</dt><dd>${esc(sp.time)}</dd></div><div><dt>Range</dt><dd>${esc(sp.range)}</dd></div>
            <div><dt>Components</dt><dd>${esc(sp.comp)}</dd></div><div><dt>Duration</dt><dd>${sp.conc ? 'Concentration, ' : ''}${esc(sp.dur)}</dd></div>
            <div><dt>School</dt><dd>${esc(sp.school)}${sp.ritual ? ' (ritual)' : ''}</dd></div><div><dt>Classes</dt><dd>${esc(sp.classes.join(', '))}</dd></div>
          </dl>` : `<label class="field"><span>Notes</span><textarea data-sb="note" rows="2">${esc(e.note || '')}</textarea></label>`}
        <div class="sb-detail-actions">
          <label class="field sb-src"><span>Source (optional)</span><input data-sb="src" value="${esc(e.src || '')}" placeholder="e.g. Magic Initiate, Elf lineage, domain"></label>
          ${lv > 0 ? `<label class="check-line"><input type="checkbox" data-sb="always" ${always ? 'checked' : ''}> Always prepared (doesn't count toward your limit)</label>` : ''}
          <button class="btn btn-ghost-danger" data-sb="remove">Remove</button>
        </div>
      </div>` : ''}
    </li>`;
  }

  const openRows = new Set();

  function levelsHTML(c) {
    const b = book(c);
    const s = stats(c);
    const k = s.k;
    const max = slotMax(c, k);
    const pact = k && k.slots && k.slots.pact ? k.slots : null;
    const arcanum = c.className === 'Warlock' ? [[6, 11], [7, 13], [8, 15], [9, 17]].filter(([, at]) => levelOf(c) >= at).map(([lv]) => lv) : [];
    const byLevel = Array.from({ length: 10 }, () => []);
    b.list.forEach((e, idx) => byLevel[levelOfEntry(e)].push([e, idx]));
    const out = [];
    for (let lv = 0; lv <= 9; lv++) {
      let rows = byLevel[lv];
      if (b.onlyPrepared && lv > 0) rows = rows.filter(([e]) => e.p === 1 || e.p === true || e.p === 'a');
      const slots = lv > 0 ? max[lv] : 0;
      const isPact = pact && lv === pact.slotLevel;
      const isArc = arcanum.includes(lv);
      if (!rows.length && !slots && !isPact && !isArc && lv !== 0) continue;
      if (lv === 0 && !rows.length && !(k && k.cantrips)) continue;
      let slotUI = '';
      if (lv > 0) {
        if (isPact) slotUI = `<span class="sb-slots" title="Pact Magic slots">Pact ${boxes(pact.count, Math.min(b.pactUsed, pact.count), 'pact')}</span>`;
        if (slots) slotUI += `<span class="sb-slots">Slots ${boxes(slots, Math.min(Util.num(b.used[lv], 0), slots), `slot-${lv}`)}</span>`;
        if (isArc) slotUI += `<span class="sb-slots" title="Mystic Arcanum: once per long rest">Arcanum ${boxes(1, b.arcana[lv] ? 1 : 0, `arc-${lv}`)}</span>`;
      }
      out.push(`<section class="sb-level">
        <header class="sb-level-head"><span class="sb-lvnum">${lv}</span><h4>${ORD[lv]}</h4>${slotUI}</header>
        ${rows.length ? `<ul class="sb-list">${rows.map(([e, idx]) => rowHTML(c, e, idx, lv, s)).join('')}</ul>`
          : `<p class="sb-empty">${lv === 0 ? 'No cantrips yet.' : 'No spells of this level yet.'} <button class="link-btn" data-sb="pick" data-level="${lv}">Choose some</button></p>`}
      </section>`);
    }
    if (!out.length) out.push('<p class="sb-empty">No spells yet. Use <b>Choose spells</b> to add some.</p>');
    return out.join('');
  }

  function slotEditorHTML(c) {
    const b = book(c);
    const auto = slotMax({ ...c, spellbook: { ...b, max: null } }, caster(c));
    return `<details class="sb-edit-slots"><summary>Change slot numbers (multiclass or homebrew)</summary>
      <div class="sb-slot-grid">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(lv => `<label class="field"><span>Level ${lv}</span>
        <input type="number" min="0" max="9" data-sb="max" data-lv="${lv}" value="${b.max && b.max[lv] !== undefined && b.max[lv] !== '' ? b.max[lv] : ''}" placeholder="${auto[lv]}"></label>`).join('')}</div>
      <p class="muted small">Leave a box empty to use your class's normal number.</p></details>`;
  }

  function render(host, c) {
    book(c);
    host.innerHTML = `<div class="sb">
      ${headHTML(c)}
      ${metaHTML(c)}
      ${grantsHTML(c)}
      <div class="sb-levels" data-ref="sbLevels">${levelsHTML(c)}</div>
      ${slotEditorHTML(c)}
      <p class="muted small sb-credit">Spell summaries are short, in our own words. Spells from the D&amp;D System Reference Document 5.2 are used under CC-BY-4.0. Check your book for full rules.</p>
    </div>`;
  }

  /* Update numbers that depend on ability scores and level, without redrawing. */
  function updateStats(host, c) {
    if (!host) return;
    const s = stats(c);
    host.querySelectorAll('[data-sb-out="dc"]').forEach(n => { n.textContent = s.dc; });
    host.querySelectorAll('[data-sb-out="atk"]').forEach(n => { n.textContent = Util.fmtMod(s.atk); });
  }

  /* ---------- Behavior ---------- */
  function mount(host, c) {
    const save = () => { Store.save(); };
    const redraw = () => { const y = window.scrollY; render(host, c); window.scrollTo(0, y); };
    if (syncGranted(c)) save();
    render(host, c);

    host.addEventListener('click', e => {
      const btn = e.target.closest('[data-sb]');
      if (!btn || btn.tagName === 'INPUT' || btn.tagName === 'SELECT' || btn.tagName === 'TEXTAREA') return;
      const b = book(c);
      const row = btn.closest('[data-idx]');
      const idx = row ? Number(row.dataset.idx) : -1;
      const entry = idx >= 0 ? b.list[idx] : null;
      const s = stats(c);
      const a = btn.dataset.sb;
      if (a === 'pick') return openPicker(c, () => { save(); redraw(); }, btn.dataset.level);
      if (a === 'pick-mi') return openPicker(c, () => { save(); redraw(); }, 'all', { cls: btn.dataset.cls, src: `Magic Initiate (${btn.dataset.cls})` });
      if (a === 'long') {
        b.used = {}; b.pactUsed = 0; b.arcana = {};
        save(); redraw();
        return Util.toast('Long rest: all spell slots are back.');
      }
      if (a === 'short') { b.pactUsed = 0; save(); redraw(); return Util.toast('Short rest: your Pact Magic slots are back.'); }
      if (a === 'roll-atk') return Dice.roll(`1d20${s.atk >= 0 ? '+' : ''}${s.atk}`, 'Spell attack');
      if (a === 'pact' || a.startsWith('slot-') || a.startsWith('arc-')) {
        const i = Number(btn.dataset.i);
        if (a === 'pact') b.pactUsed = btn.classList.contains('used') ? i : i + 1;
        else if (a.startsWith('arc-')) b.arcana[a.slice(4)] = !b.arcana[a.slice(4)];
        else { const lv = a.slice(5); b.used[lv] = btn.classList.contains('used') ? i : i + 1; }
        save(); redraw();
        return;
      }
      if (!entry) return;
      const sp = info(entry);
      const lv = levelOfEntry(entry);
      switch (a) {
        case 'toggle':
          if (openRows.has(idx)) openRows.delete(idx); else openRows.add(idx);
          return redraw();
        case 'prep':
          if (entry.p === 'a') return Util.toast('This one is always prepared. Untick "Always prepared" in its details to change that.');
          if (!(entry.p === 1 || entry.p === true)) {
            const lim = limits(c);
            if (lim && counted(entry) && counts(c).prepared >= lim.prepared) return Util.toast(`You can prepare ${lim.prepared} spells at this level. Unprepare one first.`, 'error');
          }
          entry.p = entry.p === 1 || entry.p === true ? 0 : 1;
          save(); return redraw();
        case 'remove': {
          b.list.splice(idx, 1);
          openRows.clear();
          save(); redraw();
          return Util.toast(`Removed ${entry.n}.`);
        }
        case 'atk': return Dice.roll(`1d20${s.atk >= 0 ? '+' : ''}${s.atk}`, `${entry.n} (spell attack)`);
        case 'dmg': return Dice.roll(btn.dataset.dice, `${entry.n}`, { mode: 'normal' });
        case 'cast': return cast(c, entry, lv, redraw, save);
      }
      void sp;
    });

    host.addEventListener('change', e => {
      const t = e.target;
      if (!t.dataset.sb) return;
      const b = book(c);
      const row = t.closest('[data-idx]');
      const entry = row ? b.list[Number(row.dataset.idx)] : null;
      if (t.dataset.sb === 'abil') { b.abil = t.value; save(); return redraw(); }
      if (t.dataset.sb === 'only-prepared') { b.onlyPrepared = t.checked; save(); return redraw(); }
      if (t.dataset.sb === 'max') {
        b.max = b.max || {};
        if (t.value === '') delete b.max[t.dataset.lv]; else b.max[t.dataset.lv] = Util.clamp(Util.num(t.value, 0), 0, 9);
        save(); return redraw();
      }
      if (!entry) return;
      const wouldCount = next => {
        const before = { ...entry };
        Object.assign(entry, next);
        if (!next.src && 'src' in next) delete entry.src;
        const n = counts(c), lim = limits(c);
        const over = lim && (n.cantrips > lim.cantrips || n.known > lim.known || n.prepared > lim.prepared);
        if (over) { Object.keys(entry).forEach(x => delete entry[x]); Object.assign(entry, before); }
        return !over;
      };
      if (t.dataset.sb === 'always') {
        if (!wouldCount({ p: t.checked ? 'a' : 1 }) && !wouldCount({ p: t.checked ? 'a' : 0 })) { t.checked = !t.checked; return Util.toast('That would put you over your class limit. Remove a spell first.', 'error'); }
        save(); return redraw();
      }
      if (t.dataset.sb === 'src') {
        if (!wouldCount({ src: t.value.trim().slice(0, 60) })) { t.value = entry.src || ''; return Util.toast('Without a source this spell counts toward your class limit, and you\'re already at it.', 'error'); }
        save(); return redraw();
      }
      if (t.dataset.sb === 'note') { entry.note = t.value.slice(0, 1000); save(); }
    });
  }

  function cast(c, entry, lv, redraw, save) {
    const b = book(c);
    const k = caster(c);
    const max = slotMax(c, k);
    const pact = k && k.slots && k.slots.pact ? k.slots : null;
    if (pact && lv <= pact.slotLevel && b.pactUsed < pact.count) {
      b.pactUsed++;
      save(); redraw();
      return Util.toast(`Cast ${entry.n} with a level ${pact.slotLevel} Pact slot (${pact.count - b.pactUsed} left).`);
    }
    for (let s = lv; s <= 9; s++) {
      const used = Util.num(b.used[s], 0);
      if (max[s] > used) {
        b.used[s] = used + 1;
        save(); redraw();
        return Util.toast(`Cast ${entry.n} with a level ${s} slot (${max[s] - used - 1} level ${s} left).${s > lv ? ' That was your lowest free slot.' : ''}`);
      }
    }
    const sp = info(entry);
    if (sp && sp.ritual) return Util.toast(`No slots left, but ${entry.n} is a ritual: you can cast it in 10 extra minutes without a slot.`, 'error');
    return Util.toast(`No free slots of level ${lv} or higher. A long rest brings them back.`, 'error');
  }

  /* ---------- Spell picker ---------- */
  function openPicker(c, done, startLevel, opts = {}) {
    const b = book(c);
    const k = caster(c);
    const maxSlot = (() => {
      const m = slotMax(c, k);
      let top = 0;
      m.forEach((n, i) => { if (n > 0) top = i; });
      if (k && k.slots && k.slots.pact) top = Math.max(top, k.slots.slotLevel);
      if (c.className === 'Warlock') [[6, 11], [7, 13], [8, 15], [9, 17]].forEach(([lv, at]) => { if (levelOf(c) >= at) top = Math.max(top, lv); });
      return opts.cls ? Math.max(top, 1) : top;
    })();
    const lists = opts.cls ? [opts.cls] : k ? k.lists : [];
    const bonusSrc = opts.src || 'Bonus spell';
    const st = { q: '', level: startLevel !== undefined && startLevel !== '' && startLevel !== 'all' ? Number(startLevel) : 'all', allClasses: !lists.length, allLevels: false, recOnly: false, bonus: Boolean(opts.cls) };
    const rec = recommendedFor(k);
    const has = name => b.list.some(e => e.n.toLowerCase() === name.toLowerCase());

    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal sb-picker" role="dialog" aria-modal="true" aria-labelledby="sbp-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const close = () => { document.removeEventListener('keydown', onKey); host.remove(); done(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);

    function results() {
      const q = st.q.toLowerCase();
      return SpellList.all().filter(s => {
        if (st.level !== 'all' && s.level !== st.level) return false;
        if (!st.allClasses && !s.classes.some(x => lists.includes(x))) return false;
        if (!st.allLevels && s.level > maxSlot && s.level > 0) return false;
        if (q && !(`${s.name} ${s.school} ${s.summary}`.toLowerCase().includes(q))) return false;
        if (st.recOnly && !rec.has(s.name)) return false;
        return true;
      }).sort((a, b) => a.level - b.level || (rec.has(b.name) - rec.has(a.name)) || a.name.localeCompare(b.name));
    }

    function headText() {
      if (opts.cls) {
        const mine = book(c).list.filter(e => e.src === bonusSrc);
        const cn = mine.filter(e => levelOfEntry(e) === 0).length;
        return `${bonusSrc}: two ${opts.cls.toLowerCase()} cantrips (${cn} chosen) and one level 1 spell (${mine.length - cn} chosen). They don't count toward your limits.`;
      }
      if (!k) return 'Pick any spells, for example from a feat or your species.';
      const n = counts(c), lim = limits(c);
      const bits = [`${lists.join(', ') || k.className} list${lists.length > 1 ? 's' : ''}, up to level ${maxSlot}`];
      if (lim.cantrips) bits.push(`Cantrips ${n.cantrips} of ${lim.cantrips}${n.cantrips >= lim.cantrips ? ' (full)' : ''}`);
      if (lim.wizard) bits.push(`Spellbook ${n.known} of ${lim.known}${n.known >= lim.known ? ' (full)' : ''}`);
      bits.push(`${lim.wizard ? 'Prepared' : 'Spells'} ${lim.wizard ? n.prepared : n.known} of ${lim.prepared}${!lim.wizard && n.known >= lim.known ? ' (full)' : ''}`);
      return bits.join(' · ');
    }

    function listHTML() {
      const r = results();
      const full = st.bonus ? { 0: false, 1: false } : { 0: Boolean(blockReason(c, 0)), 1: Boolean(blockReason(c, 1)) };
      if (!r.length) return '<p class="sb-empty">No spells match. Try another level, or tick "Every class".</p>';
      return `<ul class="sbp-list">${r.slice(0, 400).map(s => `<li>
        <label class="sbp-item ${has(s.name) ? 'on' : ''} ${!has(s.name) && full[s.level ? 1 : 0] ? 'full' : ''}" ${!has(s.name) && full[s.level ? 1 : 0] ? `title="${esc(blockReason(c, s.level))}"` : ''}>
          <input type="checkbox" data-pick="${esc(s.name)}" ${has(s.name) ? 'checked' : ''} ${!has(s.name) && full[s.level ? 1 : 0] ? 'disabled' : ''}>
          <span class="sbp-main"><b>${esc(s.name)}</b>${rec.has(s.name) ? ' <span class="sbp-rec" title="A popular, dependable pick for your class">★ Recommended</span>' : ''} <span class="sbp-lvl">${s.level ? `Level ${s.level}` : 'Cantrip'} · ${esc(s.school)}${s.conc ? ' · C' : ''}${s.ritual ? ' · R' : ''}</span>
            <span class="sbp-sum">${esc(s.summary)}</span></span>
        </label></li>`).join('')}</ul>`;
    }

    function render() {
      const n = counts(c);
      body.innerHTML = `
        <header class="modal-head"><div><h2 id="sbp-title">${opts.cls ? esc(bonusSrc) : 'Choose spells'}</h2>
          <p class="muted" data-ref="sbpHead">${esc(headText())}</p></div>
          <button class="icon-btn" data-act="close" aria-label="Close">×</button></header>
        <div class="modal-body">
          <div class="sbp-tools">
            <input type="search" data-ref="q" placeholder="Search spells" value="${esc(st.q)}" aria-label="Search spells">
            <div class="sbp-levels" role="group" aria-label="Spell level">
              ${['all', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => l === 'all' || l === 0 || st.allLevels || l <= maxSlot).map(l => `<button class="${st.level === l ? 'on' : ''}" data-lv="${l}">${l === 'all' ? 'All' : l === 0 ? 'Cantrips' : l}</button>`).join('')}
            </div>
            <div class="sbp-checks">
              ${lists.length ? `<label class="check-line"><input type="checkbox" data-ref="allc" ${st.allClasses ? 'checked' : ''}> Every class</label>` : ''}
              <label class="check-line"><input type="checkbox" data-ref="alll" ${st.allLevels ? 'checked' : ''}> Higher levels too</label>
              ${rec.size ? `<label class="check-line"><input type="checkbox" data-ref="reco" ${st.recOnly ? 'checked' : ''}> ★ Recommended only</label>` : ''}
              ${k && !opts.cls ? `<label class="check-line" title="For spells from a feat (like Magic Initiate), your species, a magic item or your DM. They don't count toward your class limits."><input type="checkbox" data-ref="bonus" ${st.bonus ? 'checked' : ''}> Adding bonus spells (feat, species, item or DM)</label>` : ''}
            </div>
          </div>
          <div data-ref="list">${listHTML()}</div>
          <details class="sbp-custom"><summary>Add a spell that isn't listed (homebrew or another book)</summary>
            <form data-ref="custom" class="sbp-custom-form" autocomplete="off">
              <label class="field"><span>Name</span><input name="name" required maxlength="60"></label>
              <label class="field"><span>Level</span><select name="lvl">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => `<option value="${l}">${l ? l : 'Cantrip'}</option>`).join('')}</select></label>
              <button class="btn" type="submit">Add</button>
            </form></details>
        </div>
        <footer class="modal-foot"><span class="foot-hint muted">${rec.size ? '★ marks popular, dependable picks for your class, listed first. ' : ''}You can pick up to your class's limit. Spells from a feat, species or your DM don't count once you give them a source on your sheet.</span><button class="btn btn-primary" data-act="close">Done</button></footer>`;
    }

    function refreshList() {
      body.querySelector('[data-ref="list"]').innerHTML = listHTML();
      const n = counts(c);
      const p = body.querySelector('.modal-head .muted');
      if (p) p.textContent = headText();
      void n;
    }

    host.addEventListener('click', e => {
      if (e.target === host) return close();
      const fullItem = e.target.closest('.sbp-item.full');
      if (fullItem) return Util.toast(fullItem.getAttribute('title') || 'You are at your limit.', 'error');
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.act === 'close') return close();
      if (btn.dataset.lv !== undefined) { st.level = btn.dataset.lv === 'all' ? 'all' : Number(btn.dataset.lv); render(); body.querySelector('[data-ref="q"]').focus(); }
    });
    host.addEventListener('input', e => {
      if (e.target.matches('[data-ref="q"]')) { st.q = e.target.value; refreshList(); }
    });
    host.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('[data-ref="allc"]')) { st.allClasses = t.checked; return refreshList(); }
      if (t.matches('[data-ref="alll"]')) { st.allLevels = t.checked; return render(); }
      if (t.matches('[data-ref="reco"]')) { st.recOnly = t.checked; return refreshList(); }
      if (t.matches('[data-ref="bonus"]')) { st.bonus = t.checked; if (t.checked) { st.allClasses = true; } return render(); }
      if (t.dataset.pick) {
        const name = t.dataset.pick;
        if (t.checked && !has(name)) {
          const sp = SpellList.byName(name);
          if (st.bonus) {
            b.list.push({ n: name, p: sp && sp.level > 0 ? 1 : 0, src: bonusSrc });
          } else {
            const why = blockReason(c, sp ? sp.level : 1);
            if (why) { t.checked = false; return Util.toast(why, 'error'); }
            const n = counts(c), lim = limits(c);
            b.list.push({ n: name, p: sp && sp.level > 0 ? (lim && n.prepared >= lim.prepared ? 0 : 1) : 0 });
          }
        } else if (!t.checked) {
          const i = b.list.findIndex(x => x.n.toLowerCase() === name.toLowerCase());
          if (i >= 0) b.list.splice(i, 1);
          openRows.clear();
        }
        Store.save();
        t.closest('.sbp-item').classList.toggle('on', t.checked);
        refreshList();
        body.querySelector(`[data-pick="${CSS.escape(name)}"]`)?.focus({ preventScroll: true });
      }
    });
    host.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target;
      const name = f.elements.namedItem('name').value.trim();
      if (!name) return;
      if (has(name)) return Util.toast('That spell is already on your sheet.', 'error');
      const lvl = Number(f.elements.namedItem('lvl').value);
      const known = SpellList.byName(name);
      const why = st.bonus ? '' : blockReason(c, known ? known.level : lvl);
      if (why) return Util.toast(why, 'error');
      const extra = st.bonus ? { src: bonusSrc } : {};
      b.list.push(known ? { n: known.name, p: known.level ? 1 : 0, ...extra } : { n: name, lvl, custom: true, p: lvl ? 1 : 0, ...extra });
      Store.save();
      f.reset();
      refreshList();
      Util.toast(`Added ${name}.`);
    });
    render();
    body.querySelector('[data-ref="q"]').focus();
  }

  return { mount, updateStats, caster, stats, book, syncGranted };
})();
