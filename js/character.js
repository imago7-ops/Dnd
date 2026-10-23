'use strict';

/* Player character sheet (D&D 5e). */
const Character = (() => {
  const ABILITIES = [
    ['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'],
    ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma'],
  ];
  const ABIL_NAME = Object.fromEntries(ABILITIES);
  const SKILLS = [
    ['acrobatics', 'Acrobatics', 'dex'], ['animal', 'Animal Handling', 'wis'],
    ['arcana', 'Arcana', 'int'], ['athletics', 'Athletics', 'str'],
    ['deception', 'Deception', 'cha'], ['history', 'History', 'int'],
    ['insight', 'Insight', 'wis'], ['intimidation', 'Intimidation', 'cha'],
    ['investigation', 'Investigation', 'int'], ['medicine', 'Medicine', 'wis'],
    ['nature', 'Nature', 'int'], ['perception', 'Perception', 'wis'],
    ['performance', 'Performance', 'cha'], ['persuasion', 'Persuasion', 'cha'],
    ['religion', 'Religion', 'int'], ['sleight', 'Sleight of Hand', 'dex'],
    ['stealth', 'Stealth', 'dex'], ['survival', 'Survival', 'wis'],
  ];
  const CLASSES = { Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10, Monk: 8, Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6, Artificer: 8 };
  const SPECIES = ['Aasimar', 'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human', 'Orc', 'Tiefling'];
  const ALIGNMENTS = ['Lawful good', 'Neutral good', 'Chaotic good', 'Lawful neutral', 'True neutral', 'Chaotic neutral', 'Lawful evil', 'Neutral evil', 'Chaotic evil', 'Unaligned'];

  function blank() {
    return {
      id: Util.uid(),
      format: 'campaign-codex-character',
      version: 1,
      name: '', className: '', subclass: '', level: 1, species: '', background: '', alignment: '', xp: 0,
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      saves: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
      skills: Object.fromEntries(SKILLS.map(([k]) => [k, 0])), // 0 none, 1 proficient, 2 expertise
      ac: 10, speed: 30, initMisc: 0, inspiration: false,
      hp: { current: 10, max: 10, temp: 0 },
      hitDice: '1d8',
      deathSaves: { success: 0, fail: 0 },
      attacks: [{ id: Util.uid(), name: 'Unarmed strike', bonus: 2, damage: '1' }],
      features: '', proficiencies: '', equipment: '', spells: '', notes: '',
    };
  }

  /* Accept an uploaded file and fill any gaps with defaults. */
  function normalize(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('That file doesn\'t contain a character.');
    if (!('abilities' in data) && !('name' in data)) throw new Error('That file doesn\'t look like a Campaign Codex character.');
    const c = blank();
    for (const k of Object.keys(c)) {
      if (data[k] === undefined) continue;
      if (c[k] && typeof c[k] === 'object' && !Array.isArray(c[k])) Object.assign(c[k], data[k]);
      else c[k] = data[k];
    }
    if (!Array.isArray(c.attacks)) c.attacks = [];
    c.attacks.forEach(a => { a.id ||= Util.uid(); });
    if (Store.state.characters.some(x => x.id === c.id)) c.id = Util.uid();
    return c;
  }

  /* ---------- Math ---------- */
  const mod = score => Math.floor((Util.num(score, 10) - 10) / 2);
  const prof = c => 2 + Math.floor((Util.clamp(Util.num(c.level, 1), 1, 20) - 1) / 4);
  const saveBonus = (c, a) => mod(c.abilities[a]) + (c.saves[a] ? prof(c) : 0);
  const skillBonus = (c, key) => {
    const [, , a] = SKILLS.find(s => s[0] === key);
    return mod(c.abilities[a]) + (c.skills[key] || 0) * prof(c);
  };
  const initBonus = c => mod(c.abilities.dex) + Util.num(c.initMisc, 0);
  const passivePerception = c => 10 + skillBonus(c, 'perception');

  function active() {
    const s = Store.state;
    return s.characters.find(c => c.id === s.activeCharacterId) || s.characters[0] || null;
  }

  function rollD20(bonus, label) {
    const b = Util.num(bonus, 0);
    return Dice.roll(`1d20${b >= 0 ? '+' : ''}${b}`, label);
  }

  /* ---------- Views ---------- */
  function mount(el) {
    const s = Store.state;
    if (!s.characters.length) return mountStart(el);
    if (!active()) s.activeCharacterId = s.characters[0].id;
    s.activeCharacterId = active().id;
    mountSheet(el);
  }

  /* Open the step-by-step creator; it hands back a finished character. */
  function createNew(el) {
    const host = document.createElement('div');
    el.onclick = el.oninput = el.onchange = null;
    el.replaceChildren(host);
    (el.closest('.main') || document.scrollingElement).scrollTop = 0;
    Creator.mount(host, {
      onDone(c, isBlank) {
        Store.state.characters.push(c);
        Store.state.activeCharacterId = c.id;
        Store.save();
        mountSheet(el, isBlank || !c.name);
        (el.closest('.main') || document.scrollingElement).scrollTop = 0;
        if (!isBlank) Util.toast(`${c.name || 'Your character'} is ready. Everything on the sheet can still be edited.`);
      },
      onCancel() { mount(el); },
    });
  }

  async function upload(el) {
    try {
      const data = await Util.pickJSON();
      const c = normalize(data);
      Store.state.characters.push(c);
      Store.state.activeCharacterId = c.id;
      Store.save();
      mountSheet(el);
      Util.toast(`Uploaded ${c.name || 'character'}.`);
    } catch (e) {
      Util.toast(e.message, 'error');
    }
  }

  function mountStart(el) {
    el.innerHTML = `
      <div class="start">
        <h1>Make your character</h1>
        <p class="lede">Start a fresh 5e sheet, or bring in a character you saved from Campaign Codex before.</p>
        <div class="start-grid">
          <button class="start-card" data-action="new">
            <span class="start-title">Create a new character</span>
            <span class="start-desc">Choose your species, background, class, subclass and level. Your hit points, armor class, skills, attacks, features and spells fill themselves in.</span>
          </button>
          <button class="start-card" data-action="upload">
            <span class="start-title">Upload a character file</span>
            <span class="start-desc">Pick a .json file you downloaded from your sheet, on this computer or another one.</span>
          </button>
        </div>
      </div>`;
    el.onclick = e => {
      const a = e.target.closest('[data-action]')?.dataset.action;
      if (a === 'new') createNew(el);
      if (a === 'upload') upload(el);
    };
  }

  function field(label, path, value, opts = {}) {
    const type = opts.type || 'text';
    const list = opts.list ? ` list="${opts.list}"` : '';
    const extra = opts.attrs || '';
    return `<label class="field ${opts.cls || ''}" style="grid-column: span ${opts.span || 1}">
      <span>${label}</span>
      <input type="${type}" data-bind="${path}" value="${Util.esc(value)}"${list} ${extra} ${opts.placeholder ? `placeholder="${Util.esc(opts.placeholder)}"` : ''}>
    </label>`;
  }

  function pips(path, count, filled, cls) {
    return Array.from({ length: 3 }, (_, i) =>
      `<button class="pip ${cls} ${i < filled ? 'on' : ''}" data-pip="${path}" data-n="${i + 1}" aria-label="${cls} ${i + 1}"></button>`
    ).join('');
  }

  function mountSheet(el, focusName = false) {
    const c = active();
    const chars = Store.state.characters;

    el.innerHTML = `
      <div class="sheet">
        <div class="sheet-bar">
          ${chars.length > 1 ? `
            <label class="char-switch">
              <span class="sr-only">Switch character</span>
              <select data-action="switch">
                ${chars.map(x => `<option value="${x.id}" ${x.id === c.id ? 'selected' : ''}>${Util.esc(x.name || 'Unnamed character')}</option>`).join('')}
              </select>
            </label>` : ''}
          <div class="bar-actions">
            <button class="btn btn-primary" data-action="level-up" ${Util.num(c.level, 1) >= 20 ? 'disabled' : ''}>Level up</button>
            <button class="btn" data-action="new">New character</button>
            <button class="btn" data-action="upload">Upload</button>
            <button class="btn" data-action="download">Download</button>
            <button class="btn btn-ghost-danger" data-action="delete">Delete</button>
          </div>
        </div>

        <header class="identity panel">
          <input class="char-name" data-bind="name" value="${Util.esc(c.name)}" placeholder="Character name" aria-label="Character name">
          <div class="identity-grid">
            ${field('Class', 'className', c.className, { list: 'dl-classes', span: 2 })}
            ${field('Subclass', 'subclass', c.subclass, { span: 2, list: 'dl-subclasses' })}
            ${field('Level', 'level', c.level, { type: 'number', attrs: 'min="1" max="20"', cls: 'narrow' })}
            ${field('Species', 'species', c.species, { list: 'dl-species', span: 2 })}
            ${field('Background', 'background', c.background, { span: 3 })}
            ${field('Alignment', 'alignment', c.alignment, { list: 'dl-align', span: 3 })}
            ${field('XP', 'xp', c.xp, { type: 'number', attrs: 'min="0"', cls: 'narrow' })}
          </div>
          <datalist id="dl-classes">${Object.keys(CLASSES).map(x => `<option value="${x}">`).join('')}</datalist>
          <datalist id="dl-subclasses">${subclassOptions(c.className)}</datalist>
          <datalist id="dl-species">${SPECIES.map(x => `<option value="${x}">`).join('')}</datalist>
          <datalist id="dl-align">${ALIGNMENTS.map(x => `<option value="${x}">`).join('')}</datalist>
        </header>

        <section class="vitals">
          <div class="vital panel">
            <span class="vital-label">Armor class</span>
            <input class="vital-input" type="number" data-bind="ac" value="${c.ac}" aria-label="Armor class">
          </div>
          <div class="vital panel">
            <span class="vital-label">Initiative</span>
            <button class="vital-roll" data-roll="init" data-out="init" title="Roll initiative"></button>
            <label class="vital-sub">misc <input type="number" data-bind="initMisc" value="${c.initMisc}" aria-label="Initiative misc bonus"></label>
          </div>
          <div class="vital panel">
            <span class="vital-label">Speed</span>
            <input class="vital-input" type="number" data-bind="speed" value="${c.speed}" aria-label="Speed in feet">
            <span class="vital-sub">feet</span>
          </div>
          <div class="vital panel">
            <span class="vital-label">Proficiency</span>
            <span class="vital-value" data-out="prof"></span>
            <span class="vital-sub">from level</span>
          </div>

          <div class="vital vital-hp panel">
            <div class="hp-top">
              <span class="vital-label">Hit points</span>
              <div class="hp-bar"><div class="hp-fill" data-out="hpfill"></div></div>
            </div>
            <div class="hp-row">
              <label class="hp-num"><input type="number" data-bind="hp.current" value="${c.hp.current}" aria-label="Current HP"><span>current</span></label>
              <span class="hp-slash">/</span>
              <label class="hp-num"><input type="number" data-bind="hp.max" value="${c.hp.max}" aria-label="Max HP"><span>max</span></label>
              <label class="hp-num temp"><input type="number" data-bind="hp.temp" value="${c.hp.temp}" aria-label="Temporary HP"><span>temp</span></label>
              <div class="hp-adjust">
                <input type="number" min="0" data-ref="hpamt" placeholder="0" aria-label="Amount">
                <button class="btn btn-danger" data-action="damage">Damage</button>
                <button class="btn btn-heal" data-action="heal">Heal</button>
              </div>
            </div>
          </div>

          <div class="vital vital-stack panel">
            <div class="stack-row">
              <span class="vital-label">Hit dice</span>
              <input class="mini-input" data-bind="hitDice" value="${Util.esc(c.hitDice)}" aria-label="Hit dice">
              <button class="chip-btn" data-roll="hitdie" title="Roll one hit die plus Constitution">Roll</button>
            </div>
            <div class="stack-row">
              <span class="vital-label">Death saves</span>
              <span class="pips">${pips('deathSaves.success', 3, c.deathSaves.success, 'success')}</span>
              <span class="pips">${pips('deathSaves.fail', 3, c.deathSaves.fail, 'fail')}</span>
              <button class="chip-btn" data-roll="death">Roll</button>
            </div>
            <label class="stack-row check">
              <input type="checkbox" data-bind="inspiration" ${c.inspiration ? 'checked' : ''}>
              <span>Heroic inspiration</span>
            </label>
          </div>
        </section>

        <section class="sheet-cols">
          <div class="panel abilities">
            <div class="panel-head">
              <h2>Abilities</h2>
              <div class="head-actions">
                <button class="link-btn" data-action="roll-stats" title="Roll 4d6, drop the lowest, six times">Roll scores</button>
                <button class="link-btn" data-action="std-array" title="15, 14, 13, 12, 10, 8 in order">Standard array</button>
              </div>
            </div>
            <div class="ability-grid">
              ${ABILITIES.map(([k, name]) => `
                <div class="ability">
                  <span class="ability-name">${name}</span>
                  <button class="ability-mod" data-roll="check:${k}" data-out="mod:${k}" title="Roll a ${name} check"></button>
                  <input class="ability-score" type="number" min="1" max="30" data-bind="abilities.${k}" value="${c.abilities[k]}" aria-label="${name} score">
                </div>`).join('')}
            </div>
            <h3 class="sub-head">Saving throws</h3>
            <ul class="rows">
              ${ABILITIES.map(([k, name]) => `
                <li class="row">
                  <input type="checkbox" class="prof-check" data-bind="saves.${k}" ${c.saves[k] ? 'checked' : ''} aria-label="Proficient in ${name} saves">
                  <button class="row-roll" data-roll="save:${k}">
                    <span>${name}</span><b data-out="save:${k}"></b>
                  </button>
                </li>`).join('')}
            </ul>
          </div>

          <div class="panel skills">
            <div class="panel-head">
              <h2>Skills</h2>
              <span class="hint">Click the dot to mark proficiency, twice for expertise</span>
            </div>
            <ul class="rows">
              ${SKILLS.map(([k, name, a]) => `
                <li class="row">
                  <button class="prof-dot" data-skill="${k}" data-level="${c.skills[k] || 0}" aria-label="${name} proficiency"></button>
                  <button class="row-roll" data-roll="skill:${k}">
                    <span>${name} <small>${ABIL_NAME[a].slice(0, 3)}</small></span><b data-out="skill:${k}"></b>
                  </button>
                </li>`).join('')}
            </ul>
            <div class="passive">Passive perception <b data-out="passive"></b></div>
          </div>

          <div class="panel attacks">
            <div class="panel-head">
              <h2>Attacks</h2>
              <button class="link-btn" data-action="add-attack">Add attack</button>
            </div>
            <div class="attack-list" data-ref="attacks">${attacksHTML(c)}</div>
          </div>
        </section>

        <section class="sheet-notes">
          ${noteBox('Features & traits', 'features', c.features, 'Class features, species traits, feats…', 'wide')}
          ${noteBox('Proficiencies & languages', 'proficiencies', c.proficiencies, 'Armor, weapons, tools, languages…')}
          ${noteBox('Equipment', 'equipment', c.equipment, 'Armor, weapons, gear, coin…')}
          ${noteBox('Spells', 'spells', c.spells, 'Spell slots, cantrips, prepared spells…')}
          ${noteBox('Notes', 'notes', c.notes, 'Backstory, allies, goals, session notes…')}
        </section>
      </div>`;

    updateDerived(el, c);
    wire(el);
    el.querySelectorAll('textarea').forEach(autoSize);
    if (focusName) el.querySelector('.char-name').focus();
  }

  function subclassOptions(className) {
    const cl = typeof Rules !== 'undefined' && Rules.CLASSES[className];
    return cl ? Object.keys(cl.subclasses).map(x => `<option value="${Util.esc(x)}">`).join('') : '';
  }

  function noteBox(title, key, value, ph, cls = '') {
    return `<label class="panel note-box ${cls}">
      <h2>${title}</h2>
      <textarea data-bind="${key}" placeholder="${ph}" rows="4">${Util.esc(value)}</textarea>
    </label>`;
  }

  function attacksHTML(c) {
    if (!c.attacks.length) return `<p class="empty-line">No attacks yet. Add your weapons and cantrips here.</p>`;
    return `
      <div class="attack-head"><span>Name</span><span>To hit</span><span>Damage</span><span></span></div>
      ${c.attacks.map(a => `
        <div class="attack" data-attack="${a.id}">
          <input data-atk="name" value="${Util.esc(a.name)}" placeholder="Longsword" aria-label="Attack name">
          <div class="atk-cell">
            <input type="number" data-atk="bonus" value="${Util.esc(a.bonus)}" aria-label="Attack bonus">
            <button class="chip-btn" data-roll="atk:${a.id}" title="Roll to hit">Hit</button>
          </div>
          <div class="atk-cell">
            <input data-atk="damage" value="${Util.esc(a.damage)}" placeholder="1d8+3" aria-label="Damage" spellcheck="false">
            <button class="chip-btn" data-roll="dmg:${a.id}" title="Roll damage">Dmg</button>
          </div>
          <button class="icon-btn" data-action="del-attack" aria-label="Remove attack" title="Remove">×</button>
        </div>`).join('')}`;
  }

  function updateDerived(el, c) {
    const set = (key, text) => { const n = el.querySelector(`[data-out="${key}"]`); if (n) n.textContent = text; };
    ABILITIES.forEach(([k]) => {
      set(`mod:${k}`, Util.fmtMod(mod(c.abilities[k])));
      set(`save:${k}`, Util.fmtMod(saveBonus(c, k)));
    });
    SKILLS.forEach(([k]) => set(`skill:${k}`, Util.fmtMod(skillBonus(c, k))));
    set('prof', Util.fmtMod(prof(c)));
    set('init', Util.fmtMod(initBonus(c)));
    set('passive', passivePerception(c));
    const max = Math.max(1, Util.num(c.hp.max, 1));
    const pct = Util.clamp(Util.num(c.hp.current, 0) / max, 0, 1) * 100;
    const fill = el.querySelector('[data-out="hpfill"]');
    if (fill) {
      fill.style.width = pct + '%';
      fill.dataset.low = pct <= 25 ? 'true' : 'false';
    }
  }

  function autoSize(t) {
    t.style.height = 'auto';
    t.style.height = Math.max(96, t.scrollHeight + 2) + 'px';
  }

  function wire(el) {
    const c = active();

    el.oninput = e => {
      const t = e.target;
      // Level changes go through the level-up dialog once the field is committed.
      if (t.dataset.bind === 'level') return;
      if (t.dataset.bind) {
        let v;
        if (t.type === 'checkbox') v = t.checked;
        else if (t.type === 'number') v = t.value === '' ? 0 : Number(t.value);
        else v = t.value;
        Util.setPath(c, t.dataset.bind, v);
        if (t.tagName === 'TEXTAREA') autoSize(t);
        if (t.dataset.bind === 'name') {
          const opt = el.querySelector(`select[data-action="switch"] option[value="${c.id}"]`);
          if (opt) opt.textContent = c.name || 'Unnamed character';
        }
        if (t.dataset.bind === 'className') {
          const dl = el.querySelector('#dl-subclasses');
          if (dl) dl.innerHTML = subclassOptions(t.value);
        }
        if (t.dataset.bind.startsWith('abilities.') && c.attacks.some(a => a.auto)) {
          c.attacks.forEach(a => { if (a.auto && typeof Creator !== 'undefined') Creator.recalcAttack(a, c.abilities, Util.clamp(Util.num(c.level, 1), 1, 20), c.className); });
          el.querySelector('[data-ref="attacks"]').innerHTML = attacksHTML(c);
        }
        if (t.dataset.bind === 'className' && CLASSES[t.value] && /^\d+d\d+$/.test(c.hitDice)) {
          c.hitDice = `${c.level}d${CLASSES[t.value]}`;
          el.querySelector('[data-bind="hitDice"]').value = c.hitDice;
        }
      } else if (t.dataset.atk) {
        const a = c.attacks.find(x => x.id === t.closest('[data-attack]').dataset.attack);
        a[t.dataset.atk] = t.dataset.atk === 'bonus' ? Util.num(t.value, 0) : t.value;
        // Once hand-edited, an attack is no longer recalculated automatically.
        if (t.dataset.atk !== 'name') delete a.auto;
      } else {
        return;
      }
      Store.save();
      updateDerived(el, c);
    };
    el.onchange = e => {
      if (e.target.dataset.bind === 'level') return changeLevel(el, c, e.target.value);
      el.oninput(e);
    };

    el.onclick = e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.roll) return doRoll(c, btn.dataset.roll, el);
      if (btn.dataset.skill) {
        const k = btn.dataset.skill;
        c.skills[k] = ((c.skills[k] || 0) + 1) % 3;
        btn.dataset.level = c.skills[k];
        Store.save();
        return updateDerived(el, c);
      }
      if (btn.dataset.pip) {
        const path = btn.dataset.pip;
        const n = Number(btn.dataset.n);
        const cur = Util.getPath(c, path);
        Util.setPath(c, path, cur === n ? n - 1 : n);
        Store.save();
        return mountSheet(el);
      }
      switch (btn.dataset.action) {
        case 'level-up': return changeLevel(el, c, Util.num(c.level, 1) + 1);
        case 'new': return createNew(el);
        case 'upload': return upload(el);
        case 'download':
          Util.download(`${Util.slug(c.name || 'character')}.json`, c);
          return Util.toast('Character downloaded.');
        case 'delete': {
          if (!confirmDelete(btn)) return;
          const s = Store.state;
          s.characters = s.characters.filter(x => x.id !== c.id);
          s.activeCharacterId = s.characters[0]?.id || null;
          Store.save();
          Util.toast(`Deleted ${c.name || 'character'}.`);
          return mount(el);
        }
        case 'damage':
        case 'heal': return adjustHP(c, el, btn.dataset.action);
        case 'add-attack':
          c.attacks.push({ id: Util.uid(), name: '', bonus: prof(c) + mod(c.abilities.str), damage: '' });
          Store.save();
          el.querySelector('[data-ref="attacks"]').innerHTML = attacksHTML(c);
          el.querySelector('[data-attack]:last-child input')?.focus();
          return;
        case 'del-attack': {
          const id = btn.closest('[data-attack]').dataset.attack;
          c.attacks = c.attacks.filter(a => a.id !== id);
          Store.save();
          el.querySelector('[data-ref="attacks"]').innerHTML = attacksHTML(c);
          return;
        }
        case 'roll-stats': return setScores(c, el, ABILITIES.map(() => Dice.evaluate('4d6kh3').total), 'Rolled 4d6, dropped the lowest.');
        case 'std-array': return setScores(c, el, [15, 14, 13, 12, 10, 8], 'Standard array applied. Swap scores by typing over them.');
      }
    };

    const sw = el.querySelector('select[data-action="switch"]');
    if (sw) sw.onchange = () => {
      Store.state.activeCharacterId = sw.value;
      Store.save();
      mountSheet(el);
    };

    el.querySelector('[data-ref="hpamt"]').onkeydown = e => {
      if (e.key === 'Enter') adjustHP(c, el, e.shiftKey ? 'heal' : 'damage');
    };
  }

  /* Open the level-up dialog; the sheet only changes if the player applies it. */
  function changeLevel(el, c, value) {
    const field = el.querySelector('[data-bind="level"]');
    const from = Util.clamp(Util.num(c.level, 1), 1, 20);
    const to = Util.clamp(Util.num(value, from), 1, 20);
    if (to === from) { field.value = from; return; }
    LevelUp.open(c, to, {
      onApply(result) {
        const list = Store.state.characters;
        const i = list.findIndex(x => x.id === c.id);
        list[i] = result;
        Store.save();
        mountSheet(el);
        Util.toast(to > from ? `${result.name || 'Character'} is now level ${to}.` : `${result.name || 'Character'} is back to level ${to}.`);
      },
      onCancel() { field.value = from; },
    });
  }

  /* Two-click delete: first click arms the button. */
  function confirmDelete(btn) {
    if (btn.dataset.armed) return true;
    btn.dataset.armed = '1';
    const old = btn.textContent;
    btn.textContent = 'Click again to delete';
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = old; } }, 3000);
    return false;
  }

  function setScores(c, el, scores, msg) {
    ABILITIES.forEach(([k], i) => { c.abilities[k] = scores[i]; });
    Store.save();
    ABILITIES.forEach(([k]) => { el.querySelector(`[data-bind="abilities.${k}"]`).value = c.abilities[k]; });
    updateDerived(el, c);
    Util.toast(`${msg} ${scores.join(', ')}`);
  }

  function adjustHP(c, el, kind) {
    const input = el.querySelector('[data-ref="hpamt"]');
    const amt = Math.abs(Util.num(input.value, 0));
    if (!amt) { input.focus(); return; }
    const hp = c.hp;
    if (kind === 'damage') {
      const fromTemp = Math.min(Util.num(hp.temp, 0), amt);
      hp.temp = Util.num(hp.temp, 0) - fromTemp;
      hp.current = Math.max(0, Util.num(hp.current, 0) - (amt - fromTemp));
    } else {
      hp.current = Math.min(Util.num(hp.max, 0), Util.num(hp.current, 0) + amt);
      if (hp.current > 0) c.deathSaves = { success: 0, fail: 0 };
    }
    Store.save();
    input.value = '';
    el.querySelector('[data-bind="hp.current"]').value = hp.current;
    el.querySelector('[data-bind="hp.temp"]').value = hp.temp;
    updateDerived(el, c);
    Util.toast(kind === 'damage' ? `Took ${amt} damage.` : `Healed ${amt}.`, kind === 'damage' ? 'error' : 'info');
  }

  function doRoll(c, spec, el) {
    const who = c.name || 'Character';
    const [kind, key] = spec.split(':');
    if (kind === 'check') return rollD20(mod(c.abilities[key]), `${ABIL_NAME[key]} check`);
    if (kind === 'save') return rollD20(saveBonus(c, key), `${ABIL_NAME[key]} save`);
    if (kind === 'skill') return rollD20(skillBonus(c, key), SKILLS.find(s => s[0] === key)[1]);
    if (kind === 'init') return rollD20(initBonus(c), 'Initiative');
    if (kind === 'atk' || kind === 'dmg') {
      const a = c.attacks.find(x => x.id === key);
      if (!a) return;
      if (kind === 'atk') return rollD20(a.bonus, `${a.name || 'Attack'} to hit`);
      if (!String(a.damage).trim()) return Util.toast('Add a damage roll first, like 1d8+3.', 'error');
      return Dice.roll(a.damage, `${a.name || 'Attack'} damage`, { mode: 'normal' });
    }
    if (kind === 'hitdie') {
      const m = /d(\d+)/.exec(c.hitDice || '');
      const sides = m ? m[1] : '8';
      const con = mod(c.abilities.con);
      return Dice.roll(`1d${sides}${con >= 0 ? '+' : ''}${con}`, 'Hit die', { mode: 'normal' });
    }
    if (kind === 'death') {
      const r = Dice.roll('1d20', 'Death save');
      if (!r) return;
      const ds = c.deathSaves;
      if (r.nat === 20) {
        c.hp.current = 1; c.deathSaves = { success: 0, fail: 0 };
        Util.toast('Natural 20! Back up with 1 HP.');
      } else if (r.nat === 1) ds.fail = Math.min(3, ds.fail + 2);
      else if (r.total >= 10) ds.success = Math.min(3, ds.success + 1);
      else ds.fail = Math.min(3, ds.fail + 1);
      if (c.deathSaves.success === 3) Util.toast('Three successes: stable.');
      if (c.deathSaves.fail === 3) Util.toast('Three failures.', 'error');
      Store.save();
      return mountSheet(el);
    }
  }

  return { mount, active, initBonus, blank };
})();
