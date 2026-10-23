'use strict';

/*
 * Step-by-step character creator (2024 rules).
 * Species -> Background -> Class -> Level & subclass -> Ability scores -> Review.
 * build() turns the choices into a normal, fully editable character sheet.
 */
const Creator = (() => {
  const R = Rules;
  const STEPS = ['Species', 'Background', 'Class', 'Level & subclass', 'Ability scores', 'Review'];
  const STANDARD = [15, 14, 13, 12, 10, 8];
  const esc = Util.esc;
  const fmt = Util.fmtMod;
  const modOf = s => Math.floor((s - 10) / 2);
  const NEW_BOOKS = ["Player's Handbook (2024)", 'Forgotten Realms: Heroes of Faer\u00fbn'];
  const OLDER = entry => entry && !NEW_BOOKS.includes(entry.source);

  function fresh() {
    return {
      species: null, lineage: null, size: null, humanFeat: 'Skilled',
      background: null, bgMode: '21', plus2: null, plus1: null, bgTouched: false,
      className: null, skills: [], extraSkill: null,
      level: 1, subclass: '', subMode: 'list', subOther: '',
      method: 'standard', base: null, rolled: null, scoresTouched: false,
      name: '',
    };
  }

  /* ---------- Rules math ---------- */
  function bonuses(ch) {
    const out = Object.fromEntries(R.ABIL.map(a => [a, 0]));
    const bg = R.BACKGROUNDS[ch.background];
    if (!bg) return out;
    if (ch.bgMode === '111') bg.abil.forEach(a => { out[a] += 1; });
    else {
      if (ch.plus2) out[ch.plus2] += 2;
      if (ch.plus1) out[ch.plus1] += 1;
    }
    return out;
  }

  function finalScores(ch) {
    const base = ch.base || Object.fromEntries(R.ABIL.map(a => [a, 10]));
    const b = bonuses(ch);
    return Object.fromEntries(R.ABIL.map(a => [a, Math.min(20, base[a] + b[a])]));
  }

  function feats(ch) {
    const list = [];
    if (ch.background) list.push(R.BACKGROUNDS[ch.background].feat);
    if (ch.species === 'Human' && ch.humanFeat) list.push(ch.humanFeat);
    return list;
  }

  function speciesLabel(ch) {
    const sp = R.SPECIES[ch.species];
    if (!sp) return '';
    if (!sp.lineages || !ch.lineage) return ch.species;
    if (ch.species === 'Dragonborn') return `Dragonborn (${ch.lineage})`;
    if (ch.species === 'Goliath') return `Goliath (${ch.lineage.replace(/'s .*/, '')} giant)`;
    if (ch.species === 'Tiefling') return `Tiefling (${ch.lineage})`;
    return `${ch.species} (${ch.lineage})`;
  }

  function fillTrait(text, ch) {
    const sp = R.SPECIES[ch.species];
    const L = ch.level;
    const breath = L < 5 ? '1d10' : L < 11 ? '2d10' : L < 17 ? '3d10' : '4d10';
    return text
      .replace(/\{lineage\}/g, ch.lineage || '')
      .replace(/\{lineageText\}/g, (sp.lineages && sp.lineages[ch.lineage]) || '')
      .replace(/\{dtype\}/g, ((sp.lineages && sp.lineages[ch.lineage]) || '').toLowerCase())
      .replace(/\{breath\}/g, breath)
      .replace(/\{humanFeat\}/g, ch.humanFeat || 'choose one');
  }

  function speedOf(ch) {
    const sp = R.SPECIES[ch.species];
    const cl = R.CLASSES[ch.className];
    if (!sp) return 30;
    const base = (sp.lineageSpeed && sp.lineageSpeed[ch.lineage]) || sp.speed;
    return base + (cl && cl.speedBonus ? cl.speedBonus(ch.level) : 0);
  }

  function darkvisionOf(ch) {
    const sp = R.SPECIES[ch.species];
    return (sp.lineageDarkvision && sp.lineageDarkvision[ch.lineage]) || sp.darkvision;
  }

  function hpOf(ch, scores) {
    const cl = R.CLASSES[ch.className];
    const sp = R.SPECIES[ch.species];
    const con = modOf(scores.con);
    const L = ch.level;
    let hp = Math.max(1, cl.die + con);
    for (let i = 2; i <= L; i++) hp += Math.max(1, cl.die / 2 + 1 + con);
    if (sp && sp.hpPerLevel) hp += sp.hpPerLevel * L;
    if (feats(ch).includes('Tough')) hp += 2 * L;
    return hp;
  }

  function acOf(ch, scores) {
    const ac = R.CLASSES[ch.className].ac;
    return acFor(ac, scores);
  }
  function acFor(ac, scores) {
    const dex = modOf(scores.dex);
    if (ac.type === 'unarmored') return 10 + dex + modOf(scores[ac.extra]);
    if (ac.type === 'armor') {
      const d = ac.maxDex === undefined ? dex : Math.min(dex, ac.maxDex);
      return ac.base + d + (ac.shield ? 2 : 0);
    }
    return 10 + dex;
  }

  /*
   * Attacks made by the creator remember how they're calculated (`auto`), so a level-up or
   * ability score change can recalculate them. Hand-typed attacks have no `auto`.
   */
  function recalcAttack(a, scores, level, className) {
    const au = a.auto;
    if (!au) return a;
    const pb = R.profBonus(level);
    const m = k => modOf(scores[k]);
    const dmg = (dice, mod) => (mod === 0 ? dice : `${dice}${mod > 0 ? '+' : ''}${mod}`);
    const monkCl = R.CLASSES.Monk;
    if (au.kind === 'unarmed') {
      a.bonus = pb + m('str');
      a.damage = String(Math.max(1, 1 + m('str')));
    } else if (au.kind === 'monk-unarmed') {
      const ab = Math.max(m('str'), m('dex'));
      a.bonus = pb + ab;
      a.damage = dmg('1' + monkCl.martialDie(level), ab);
    } else {
      let ab = au.kind === 'finesse' || au.monk ? Math.max(m('str'), m('dex')) : m(au.kind);
      let die = au.die;
      if (au.monk && className === 'Monk') {
        const md = Number(monkCl.martialDie(level).slice(1));
        if (md > Number(die.split('d')[1])) die = '1d' + md;
      }
      a.bonus = pb + ab;
      a.damage = dmg(die, ab);
    }
    return a;
  }

  function attacksOf(ch, scores) {
    const cl = R.CLASSES[ch.className];
    const isMonk = ch.className === 'Monk';
    const out = [];
    cl.weaponsHeld.forEach(name => {
      if (name === 'Unarmed Strike') {
        out.push({ id: Util.uid(), name, auto: { kind: 'monk-unarmed' } });
        return;
      }
      const [die, kind] = R.WEAPONS[name];
      out.push({ id: Util.uid(), name, auto: { kind, die, monk: isMonk && (name === 'Spear' || name === 'Dagger') } });
    });
    if (!isMonk) out.push({ id: Util.uid(), name: 'Unarmed Strike', auto: { kind: 'unarmed' } });
    return out.map(a => recalcAttack(a, scores, ch.level, ch.className));
  }

  function classFeatureLines(ch) {
    const cl = R.CLASSES[ch.className];
    const entry = ch.level >= 3 && ch.subclass ? cl.subclasses[ch.subclass] : null;
    const sub = entry ? entry.features : null;
    const custom = ch.level >= 3 && ch.subclass && !entry;
    const lines = [];
    for (let lv = 1; lv <= ch.level; lv++) {
      const names = [];
      (cl.features[lv] || []).forEach(f => {
        const isSubSlot = f === 'Subclass feature' || / Subclass$/.test(f);
        if (!isSubSlot) return names.push(f);
        if (sub && sub[lv]) names.push(`${ch.subclass}: ${sub[lv].join(', ')}`);
        else if (custom) names.push(`${ch.subclass} feature (homebrew: add the details)`);
        else names.push(lv === 3 ? `${ch.className} subclass (choose one)` : 'Subclass feature');
      });
      if (names.length) lines.push(`Level ${lv}: ${names.join('; ')}`);
    }
    return lines;
  }

  function spellsText(ch, scores) {
    const cl = R.CLASSES[ch.className];
    const sp = R.SPECIES[ch.species];
    const L = ch.level;
    const pb = R.profBonus(L);
    const parts = [];

    const casting = cl.caster || (ch.level >= 3 && (ch.subclass === 'Eldritch Knight' || ch.subclass === 'Arcane Trickster') ? { type: 'third', abil: 'int' } : null);
    if (casting) {
      const abil = casting.abil;
      const m = modOf(scores[abil]);
      parts.push(`Spellcasting ability: ${R.ABIL_NAME[abil]}`);
      parts.push(`Spell save DC: ${8 + pb + m}    Spell attack: ${fmt(pb + m)}`);
      if (casting.type === 'third') {
        parts.push('Cantrips, prepared spells and slots come from your subclass table; check your book.');
      } else {
        const cantrips = R.cantripsKnown(casting, L);
        if (cantrips) parts.push(`Cantrips known: ${cantrips}`);
        parts.push(`Prepared spells: ${casting.prepared[L - 1]}`);
        const slots = R.spellSlots(casting, L);
        if (slots.pact) {
          parts.push(`Pact Magic slots: ${slots.count} slot${slots.count > 1 ? 's' : ''} of level ${slots.slotLevel} (regain on a short rest)`);
        } else {
          const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
          parts.push('Spell slots: ' + slots.map((n, i) => `${ord[i]}: ${n}`).join(', '));
        }
      }
      parts.push('');
    }

    const extra = [];
    const lin = sp.lineages && sp.lineages[ch.lineage];
    if (ch.species === 'Aasimar') extra.push('Light cantrip (Aasimar)');
    if (ch.species === 'Tiefling') extra.push('Thaumaturgy cantrip (Tiefling)');
    if (['Elf', 'Gnome', 'Tiefling'].includes(ch.species) && lin) extra.push(`${ch.lineage}: ${lin.replace(/^(Darkvision 120 ft\. |Speed 35 ft\. |Resistance to \w+ damage\. )/, '')}`);
    feats(ch).filter(f => f.startsWith('Magic Initiate')).forEach(f => {
      extra.push(`${f}: choose two cantrips and one level 1 spell from that list (cast the spell free once per long rest).`);
    });
    if (extra.length) {
      parts.push('Other spells');
      extra.forEach(e => parts.push(`- ${e}`));
      if (['Aasimar', 'Tiefling', 'Elf', 'Gnome'].includes(ch.species)) parts.push('Species spells use Intelligence, Wisdom or Charisma (your choice).');
      parts.push('');
    }
    if (parts.length) parts.push('Spells known or prepared:');
    return parts.join('\n').trim() + (parts.length ? '\n' : '');
  }

  function build(ch) {
    const sp = R.SPECIES[ch.species];
    const bg = R.BACKGROUNDS[ch.background];
    const cl = R.CLASSES[ch.className];
    const L = ch.level;
    const pb = R.profBonus(L);
    const scores = finalScores(ch);
    const myFeats = feats(ch);

    const c = Character.blank();
    c.name = ch.name.trim();
    c.className = ch.className;
    c.subclass = L >= 3 ? ch.subclass : '';
    c.level = L;
    c.species = speciesLabel(ch);
    c.background = ch.background;
    c.xp = R.XP[L - 1];
    c.abilities = scores;
    cl.saves.forEach(a => { c.saves[a] = true; });
    [...bg.skills, ...ch.skills, ch.extraSkill].filter(Boolean).forEach(s => { c.skills[s] = 1; });
    c.speed = speedOf(ch);
    c.ac = acOf(ch, scores);
    c.initMisc = myFeats.includes('Alert') ? pb : 0;
    c.inspiration = ch.species === 'Human';
    const hp = hpOf(ch, scores);
    c.hp = { current: hp, max: hp, temp: 0 };
    c.hitDice = `${L}d${cl.die}`;
    // Hit die result for each level (Con and other bonuses are added separately).
    c.hpLog = Array.from({ length: L }, (_, i) => (i === 0 ? cl.die : cl.die / 2 + 1));
    c.asiLog = {};
    c.attacks = attacksOf(ch, scores);

    // Features & traits
    const f = [];
    f.push(`${c.species}`);
    f.push(`Size ${ch.size}. Speed ${c.speed} ft. ${darkvisionOf(ch) ? `Darkvision ${darkvisionOf(ch)} ft.` : 'No darkvision.'}`);
    sp.traits.forEach(([name, text]) => f.push(`- ${name}: ${fillTrait(text, ch)}`));
    f.push('');
    f.push(`${ch.className} ${L}${c.subclass ? ` (${c.subclass})` : ''}`);
    const subEntry = c.subclass ? cl.subclasses[c.subclass] : null;
    if (subEntry) f.push(`- Subclass from ${subEntry.source}${OLDER(subEntry) ? ' (written for 2014 rules; earlier features arrive at level 3)' : ''}`);
    else if (c.subclass) f.push('- Homebrew subclass: add its features below');
    cl.stats(L, { mod: a => modOf(scores[a]) }).forEach(s => f.push(`- ${s}`));
    classFeatureLines(ch).forEach(s => f.push(s));
    if (L >= 4) f.push('Ability Score Improvements are listed by level; add them to your scores yourself.');
    f.push('');
    f.push(`${ch.background} background`);
    myFeats.forEach(name => f.push(`- Origin feat, ${name}: ${R.ORIGIN_FEATS[name] || ''}`));
    c.features = f.join('\n');

    // Proficiencies & languages
    const languages = ['Common', 'two languages of your choice'];
    if (ch.className === 'Rogue') languages.push("Thieves' Cant");
    if (ch.className === 'Druid') languages.push('Druidic');
    c.proficiencies = [
      `Armor: ${cl.armor}`,
      `Weapons: ${cl.weapons}`,
      `Tools: ${[cl.tools, bg.tool].filter(Boolean).join('; ')}`,
      `Languages: ${languages.join(', ')}`,
      '',
      `Skills from ${ch.background}: ${bg.skills.map(s => R.SKILL_NAME[s]).join(', ')}`,
      `Skills from ${ch.className}: ${ch.skills.map(s => R.SKILL_NAME[s]).join(', ')}`,
      ch.extraSkill ? `Skill from ${ch.species}: ${R.SKILL_NAME[ch.extraSkill]}` : '',
    ].filter((x, i, arr) => x !== '' || arr[i + 1]).join('\n').trim();

    c.equipment = `From ${ch.className}: ${cl.equip}\nFrom ${ch.background}: ${bg.equip}\n\n(Each can be swapped for gold instead: check your book.)`;
    c.spells = spellsText(ch, scores);
    c.creation = { rules: '2024', ...JSON.parse(JSON.stringify(ch)) };
    return c;
  }

  /* ---------- UI ---------- */
  function mount(el, { onDone, onCancel }) {
    const ch = fresh();
    let step = 0;
    // On phones the floating dice button would cover the Next button here.
    document.body.classList.add('no-fab');

    el.innerHTML = `
      <div class="creator">
        <header class="creator-head">
          <div>
            <h1>Create a character</h1>
            <p class="lede">Make each choice and the sheet fills itself in. You can change anything afterwards.</p>
          </div>
          <div class="creator-head-actions">
            <button class="link-btn" data-action="blank">Use a blank sheet instead</button>
            <button class="btn" data-action="cancel">Cancel</button>
          </div>
        </header>
        <ol class="steps" data-ref="steps"></ol>
        <div class="creator-body">
          <section class="creator-main" data-ref="main"></section>
          <aside class="creator-summary panel" data-ref="summary" aria-label="Character so far"></aside>
        </div>
        <footer class="creator-foot">
          <button class="btn" data-action="back">Back</button>
          <span class="foot-hint" data-ref="hint" aria-live="polite"></span>
          <button class="btn btn-primary" data-action="next">Next</button>
        </footer>
      </div>`;

    const ref = n => el.querySelector(`[data-ref="${n}"]`);

    /* Each step returns an error string when it isn't complete yet. */
    function problem(i) {
      if (i === 0 && !ch.species) return 'Choose a species to continue.';
      if (i === 1 && !ch.background) return 'Choose a background to continue.';
      if (i === 1 && ch.bgMode === '21' && (!ch.plus2 || !ch.plus1 || ch.plus2 === ch.plus1)) return 'Pick two different abilities for +2 and +1.';
      if (i === 2 && !ch.className) return 'Choose a class to continue.';
      if (i === 2) {
        const n = R.CLASSES[ch.className].skills.n;
        if (ch.skills.length !== n) return `Choose ${n} class skills (${ch.skills.length} picked).`;
        if (R.SPECIES[ch.species].extraSkill && !ch.extraSkill) return `Choose your ${ch.species} skill.`;
      }
      return '';
    }
    const reachable = i => STEPS.slice(0, i).every((_, j) => !problem(j));

    function renderSteps() {
      ref('steps').innerHTML = STEPS.map((s, i) => `
        <li>
          <button class="step ${i === step ? 'on' : ''} ${i < step && !problem(i) ? 'done' : ''}" data-step="${i}" ${reachable(i) ? '' : 'disabled'} ${i === step ? 'aria-current="step"' : ''}>
            <span class="step-n">${i + 1}</span>${s}
          </button>
        </li>`).join('');
    }

    function renderFoot() {
      el.querySelector('[data-action="back"]').style.visibility = step === 0 ? 'hidden' : 'visible';
      const next = el.querySelector('[data-action="next"]');
      next.textContent = step === STEPS.length - 1 ? 'Create character' : `Next: ${STEPS[step + 1]}`;
      ref('hint').textContent = problem(step);
      next.disabled = Boolean(problem(step));
    }

    function render() {
      renderSteps();
      ref('main').innerHTML = [speciesStep, backgroundStep, classStep, levelStep, abilityStep, reviewStep][step]();
      renderSummary();
      renderFoot();
    }

    function refresh() {
      // Re-render without losing scroll position.
      const main = el.closest('.main') || document.scrollingElement;
      const y = main.scrollTop;
      render();
      main.scrollTop = y;
    }

    /* ---------- Steps ---------- */
    function card(key, title, meta, blurb, on, disabled = false, attr = 'pick') {
      return `<button class="opt ${on ? 'on' : ''}" data-${attr}="${esc(key)}" ${disabled ? 'disabled' : ''} aria-pressed="${on}">
        <span class="opt-title">${esc(title)}</span>
        ${meta ? `<span class="opt-meta">${meta}</span>` : ''}
        ${blurb ? `<span class="opt-blurb">${esc(blurb)}</span>` : ''}
      </button>`;
    }

    function select(name, options, value, label, extra = '') {
      return `<label class="field"><span>${label}</span>
        <select data-set="${name}" ${extra}>
          ${options.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}
        </select></label>`;
    }

    function speciesStep() {
      const grid = Object.entries(R.SPECIES).map(([k, s]) => card(k, k,
        `${s.size.join(' or ')}, speed ${s.speed} ft${s.darkvision ? `, darkvision ${s.darkvision} ft` : ''}`,
        s.blurb, ch.species === k)).join('');
      let detail = '';
      if (ch.species) {
        const sp = R.SPECIES[ch.species];
        detail = `
          <div class="opt-detail panel">
            <h2>${esc(ch.species)}</h2>
            <div class="detail-controls">
              ${sp.lineages ? select('lineage', Object.keys(sp.lineages).map(l => [l, ch.species === 'Dragonborn' ? `${l} (${sp.lineages[l]})` : l]), ch.lineage, sp.lineageLabel) : ''}
              ${sp.size.length > 1 ? select('size', sp.size.map(s => [s, s]), ch.size, 'Size') : ''}
              ${sp.extraFeat ? select('humanFeat', Object.keys(R.ORIGIN_FEATS).map(f => [f, f]), ch.humanFeat, 'Versatile: origin feat') : ''}
            </div>
            ${sp.extraFeat ? `<p class="detail-note">${esc(R.ORIGIN_FEATS[ch.humanFeat])}</p>` : ''}
            <ul class="trait-list">
              ${sp.traits.map(([n, t]) => `<li><b>${esc(n)}.</b> ${esc(fillTrait(t, ch))}</li>`).join('')}
              ${sp.extraSkill ? `<li class="muted">You'll pick the ${esc(sp.extraSkill.label.split(':')[0])} skill on the Class step.</li>` : ''}
            </ul>
          </div>`;
      }
      return `<h2 class="step-title">Choose a species</h2>
        <div class="opt-grid">${grid}</div>${detail}`;
    }

    function backgroundStep() {
      const grid = Object.entries(R.BACKGROUNDS).map(([k, b]) => card(k, k,
        `${b.skills.map(s => R.SKILL_NAME[s]).join(', ')}`,
        `${b.feat}`, ch.background === k)).join('');
      let detail = '';
      if (ch.background) {
        const bg = R.BACKGROUNDS[ch.background];
        const abil = bg.abil.map(a => [a, R.ABIL_NAME[a]]);
        detail = `
          <div class="opt-detail panel">
            <h2>${esc(ch.background)}</h2>
            <div class="detail-block">
              <h3>Ability score increase</h3>
              <p class="detail-note">This background raises ${bg.abil.map(a => R.ABIL_NAME[a]).join(', ')}. Split it one of two ways.${!ch.bgTouched ? ' The suggested picks follow your class once you choose one.' : ''}</p>
              <div class="seg" role="radiogroup">
                <button role="radio" data-bgmode="21" class="${ch.bgMode === '21' ? 'on' : ''}" aria-checked="${ch.bgMode === '21'}">+2 to one, +1 to another</button>
                <button role="radio" data-bgmode="111" class="${ch.bgMode === '111' ? 'on' : ''}" aria-checked="${ch.bgMode === '111'}">+1 to all three</button>
              </div>
              ${ch.bgMode === '21' ? `<div class="detail-controls">
                ${select('plus2', abil, ch.plus2, '+2 to')}
                ${select('plus1', abil.filter(([a]) => a !== ch.plus2), ch.plus1, '+1 to')}
              </div>` : ''}
            </div>
            <dl class="facts">
              <dt>Skills</dt><dd>${bg.skills.map(s => R.SKILL_NAME[s]).join(', ')}</dd>
              <dt>Origin feat</dt><dd><b>${esc(bg.feat)}.</b> ${esc(R.ORIGIN_FEATS[bg.feat])}</dd>
              <dt>Tool</dt><dd>${esc(bg.tool)}</dd>
              <dt>Equipment</dt><dd>${esc(bg.equip)}</dd>
            </dl>
          </div>`;
      }
      return `<h2 class="step-title">Choose a background</h2>
        <div class="opt-grid">${grid}</div>${detail}`;
    }

    function classStep() {
      const grid = Object.entries(R.CLASSES).map(([k, c]) => card(k, k,
        `d${c.die} hit die, ${c.primary}`, c.blurb, ch.className === k)).join('');
      let detail = '';
      if (ch.className) {
        const cl = R.CLASSES[ch.className];
        const sp = R.SPECIES[ch.species];
        const bgSkills = R.BACKGROUNDS[ch.background].skills;
        const taken = new Set([...bgSkills, ch.extraSkill].filter(Boolean));
        const n = cl.skills.n;
        detail = `
          <div class="opt-detail panel">
            <h2>${esc(ch.className)}</h2>
            <dl class="facts">
              <dt>Hit die</dt><dd>d${cl.die}</dd>
              <dt>Saving throws</dt><dd>${cl.saves.map(a => R.ABIL_NAME[a]).join(', ')}</dd>
              <dt>Armor</dt><dd>${esc(cl.armor)}</dd>
              <dt>Weapons</dt><dd>${esc(cl.weapons)}</dd>
              ${cl.tools ? `<dt>Tools</dt><dd>${esc(cl.tools)}</dd>` : ''}
              <dt>Equipment</dt><dd>${esc(cl.equip)}</dd>
            </dl>
            <div class="detail-block">
              <h3>Choose ${n} skills <span class="count ${ch.skills.length === n ? 'ok' : ''}">${ch.skills.length} of ${n}</span></h3>
              <div class="skill-picks">
                ${cl.skills.from.map(s => {
                  const fromBg = bgSkills.includes(s);
                  const fromSp = ch.extraSkill === s;
                  const on = ch.skills.includes(s);
                  const dis = fromBg || fromSp || (!on && ch.skills.length >= n);
                  return `<label class="skill-pick ${on || fromBg || fromSp ? 'on' : ''} ${dis && !on ? 'dis' : ''}">
                    <input type="checkbox" data-skill="${s}" ${on || fromBg || fromSp ? 'checked' : ''} ${fromBg || fromSp || (!on && ch.skills.length >= n) ? 'disabled' : ''}>
                    ${R.SKILL_NAME[s]}${fromBg ? ' <small>background</small>' : ''}${fromSp ? ` <small>${esc(ch.species)}</small>` : ''}
                  </label>`;
                }).join('')}
              </div>
            </div>
            ${sp.extraSkill ? `<div class="detail-block">
              <h3>${esc(sp.extraSkill.label)}</h3>
              <div class="detail-controls">
                ${select('extraSkill', [['', 'Choose a skill'], ...sp.extraSkill.from.filter(s => !ch.skills.includes(s) && !bgSkills.includes(s)).map(s => [s, R.SKILL_NAME[s]])], ch.extraSkill || '', `${ch.species} skill`)}
              </div>
            </div>` : ''}
          </div>`;
        void taken;
      }
      return `<h2 class="step-title">Choose a class</h2>
        <div class="opt-grid">${grid}</div>${detail}`;
    }

    function levelStep() {
      const cl = R.CLASSES[ch.className];
      const L = ch.level;
      const subs = Object.entries(cl.subclasses);
      const core = subs.filter(([, e]) => e.source === "Player's Handbook (2024)");
      const more = subs.filter(([, e]) => e.source !== "Player's Handbook (2024)").sort((a, b) => a[0].localeCompare(b[0]));
      const locked = L < 3;
      const preview = classFeatureLines(ch);
      return `<h2 class="step-title">Choose a level and subclass</h2>
        <div class="level-row panel">
          <div class="level-ctl">
            <button class="btn" data-level="-1" aria-label="Lower level" ${L <= 1 ? 'disabled' : ''}>−</button>
            <label><span class="sr-only">Level</span><input type="number" min="1" max="20" value="${L}" data-set="level" class="level-input"></label>
            <button class="btn" data-level="1" aria-label="Raise level" ${L >= 20 ? 'disabled' : ''}>+</button>
          </div>
          <dl class="facts inline">
            <dt>Proficiency bonus</dt><dd>${fmt(R.profBonus(L))}</dd>
            <dt>Experience</dt><dd>${R.XP[L - 1].toLocaleString()} XP</dd>
            <dt>Hit dice</dt><dd>${L}d${cl.die}</dd>
          </dl>
        </div>

        <h3 class="sub-title">${ch.className} subclass</h3>
        ${locked ? `<p class="detail-note">Every class picks a subclass at level 3. Raise your level to choose one now, or pick it on your sheet later.</p>` : ''}
        <h4 class="group-title">Player's Handbook (2024)</h4>
        <div class="opt-grid subs">
          ${core.map(([name]) => subCard(name, '', locked)).join('')}
        </div>
        <h4 class="group-title">Other official books</h4>
        <div class="opt-grid subs">
          ${more.map(([name, e]) => subCard(name, e.source, locked)).join('')}
        </div>
        ${locked ? '' : `<h4 class="group-title">Something else</h4>
        <div class="opt-grid subs">
          ${card('__other__', 'Other / homebrew', 'Type in any subclass name.', '', ch.subMode === 'other', false, 'sub')}
          ${card('', 'Decide later', 'Leave the subclass blank for now.', '', ch.subMode !== 'other' && !ch.subclass, false, 'sub')}
        </div>`}
        ${locked ? '' : subDetail(cl)}

        <div class="opt-detail panel">
          <h3>Features you'll have at level ${L}</h3>
          <ul class="trait-list compact">${preview.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>`;
    }

    function subCard(name, source, locked) {
      return card(name, name, source ? esc(source) : '', '', ch.subMode !== 'other' && ch.subclass === name, locked, 'sub');
    }

    function subDetail(cl) {
      if (ch.subMode === 'other') {
        return `<div class="opt-detail panel">
          <h3>Other / homebrew subclass</h3>
          <label class="field name-field"><span>Subclass name</span>
            <input data-set="subOther" value="${esc(ch.subOther)}" placeholder="e.g. Oath of the Tides" autocomplete="off">
          </label>
          <p class="detail-note">Your sheet will mark the levels where ${esc(ch.className)} subclass features arrive (${cl.subclassLevels.join(', ')}). Add your homebrew features in the Features box on the sheet.</p>
        </div>`;
      }
      const e = ch.subclass && cl.subclasses[ch.subclass];
      if (!e) return '';
      return `<div class="opt-detail panel">
        <h3>${esc(ch.subclass)}</h3>
        <p class="detail-note">From ${esc(e.source)}.${OLDER(e) ? ' Written for the 2014 rules: features it gave at levels 1 or 2 arrive at level 3 here, so check the book for exact wording.' : ''}${!e.details ? ' Its feature list isn\'t built in yet; your sheet marks the levels where its features arrive so you can fill them in from the book.' : ''}</p>
        <ul class="trait-list compact">
          ${Object.entries(e.features).map(([lv, f]) => `<li><b>Level ${lv}:</b> ${esc(f.join(', '))}</li>`).join('')}
        </ul>
      </div>`;
    }

    function ensureScores(force = false) {
      if (ch.base && !force && ch.scoresTouched) return;
      const pr = R.CLASSES[ch.className].priority;
      const values = ch.method === 'roll' && ch.rolled ? [...ch.rolled].sort((a, b) => b - a) : STANDARD;
      if (ch.method === 'manual' && ch.base) return;
      ch.base = Object.fromEntries(pr.map((a, i) => [a, values[i]]));
    }

    function abilityStep() {
      ensureScores();
      const cl = R.CLASSES[ch.className];
      const b = bonuses(ch);
      const fin = finalScores(ch);
      const pool = ch.method === 'roll' ? ch.rolled : STANDARD;
      const row = a => {
        let input;
        if (ch.method === 'manual') {
          input = `<input type="number" min="3" max="20" value="${ch.base[a]}" data-score="${a}" aria-label="${R.ABIL_NAME[a]} base score">`;
        } else {
          input = `<select data-assign="${a}" aria-label="${R.ABIL_NAME[a]} base score">
            ${pool.map((v, i) => `<option value="${i}" ${valueIndex(a) === i ? 'selected' : ''}>${v}</option>`).join('')}
          </select>`;
        }
        return `<tr>
          <th scope="row">${R.ABIL_NAME[a]}${cl.saves.includes(a) ? ' <small>save</small>' : ''}</th>
          <td>${input}</td>
          <td class="bonus">${b[a] ? '+' + b[a] : ''}</td>
          <td class="final">${fin[a]}</td>
          <td class="mod">${fmt(modOf(fin[a]))}</td>
        </tr>`;
      };
      return `<h2 class="step-title">Set your ability scores</h2>
        <div class="seg" role="radiogroup" aria-label="Method">
          <button role="radio" data-method="standard" class="${ch.method === 'standard' ? 'on' : ''}" aria-checked="${ch.method === 'standard'}">Standard array</button>
          <button role="radio" data-method="roll" class="${ch.method === 'roll' ? 'on' : ''}" aria-checked="${ch.method === 'roll'}">Roll 4d6, drop lowest</button>
          <button role="radio" data-method="manual" class="${ch.method === 'manual' ? 'on' : ''}" aria-checked="${ch.method === 'manual'}">Enter my own</button>
        </div>
        <p class="detail-note">
          ${ch.method === 'standard' ? `The scores 15, 14, 13, 12, 10 and 8 are placed for a ${esc(ch.className)} (best in ${esc(cl.primary)}). Pick a different number for an ability and the two swap.` : ''}
          ${ch.method === 'roll' ? `Rolled: ${ch.rolled.join(', ')}. Highest placed in ${esc(cl.primary)}; pick a different number to swap. <button class="link-btn" data-action="reroll">Roll again</button>` : ''}
          ${ch.method === 'manual' ? 'Type the base scores you rolled or bought. Background bonuses are added on top.' : ''}
        </p>
        <table class="score-table panel">
          <thead><tr><th>Ability</th><th>Base</th><th>${esc(ch.background)}</th><th>Score</th><th>Modifier</th></tr></thead>
          <tbody>${R.ABIL.map(row).join('')}</tbody>
        </table>`;
    }

    /* Which slot of the pool an ability currently holds (pool values can repeat). */
    function valueIndex(a) {
      const pool = ch.method === 'roll' ? ch.rolled : STANDARD;
      const used = new Set();
      for (const ab of R.ABIL) {
        const idx = pool.findIndex((v, i) => v === ch.base[ab] && !used.has(i));
        used.add(idx);
        if (ab === a) return idx;
      }
      return -1;
    }

    function reviewStep() {
      const c = build(ch);
      return `<h2 class="step-title">Name your character</h2>
        <label class="field name-field">
          <span>Character name</span>
          <input data-set="name" value="${esc(ch.name)}" placeholder="e.g. Thalia Brightwater" autocomplete="off">
        </label>
        <div class="review panel">
          <h3>${esc(c.species)} ${esc(c.className)} ${c.level}${c.subclass ? `, ${esc(c.subclass)}` : ''}</h3>
          <p class="muted">${esc(c.background)} background</p>
          <div class="review-grid">
            <div><span>Hit points</span><b>${c.hp.max}</b></div>
            <div><span>Armor class</span><b>${c.ac}</b></div>
            <div><span>Speed</span><b>${c.speed} ft</b></div>
            <div><span>Initiative</span><b>${fmt(modOf(c.abilities.dex) + c.initMisc)}</b></div>
            <div><span>Proficiency</span><b>${fmt(R.profBonus(c.level))}</b></div>
            <div><span>Hit dice</span><b>${c.hitDice}</b></div>
          </div>
          <dl class="facts">
            <dt>Attacks</dt><dd>${c.attacks.map(a => `${esc(a.name)} ${fmt(a.bonus)} (${esc(a.damage)})`).join(', ')}</dd>
            <dt>Equipment</dt><dd>${esc(R.CLASSES[ch.className].equip)}; ${esc(R.BACKGROUNDS[ch.background].equip)}</dd>
          </dl>
          <p class="detail-note">Everything here goes onto your sheet, where you can edit any of it.</p>
        </div>`;
    }

    function renderSummary() {
      const box = ref('summary');
      const rows = [
        ['Species', ch.species ? speciesLabel(ch) : ''],
        ['Background', ch.background || ''],
        ['Class', ch.className || ''],
        ['Level', ch.className ? `${ch.level}${ch.level >= 3 && ch.subclass ? `, ${ch.subclass}` : ''}` : ''],
      ];
      let html = `<h2>Your character</h2><dl class="sum-list">${rows.map(([k, v]) =>
        `<dt>${k}</dt><dd class="${v ? '' : 'empty'}">${v ? esc(v) : 'Not chosen'}</dd>`).join('')}</dl>`;

      if (ch.species && ch.background && ch.className) {
        if (!ch.base) ensureScores();
        const c = build(ch);
        const skills = Object.entries(c.skills).filter(([, v]) => v).map(([k]) => R.SKILL_NAME[k]);
        html += `
          <div class="sum-stats">
            <div><span>HP</span><b>${c.hp.max}</b></div>
            <div><span>AC</span><b>${c.ac}</b></div>
            <div><span>Speed</span><b>${c.speed}</b></div>
          </div>
          <div class="sum-abil">${R.ABIL.map(a => `<div><span>${R.ABIL_NAME[a].slice(0, 3)}</span><b>${c.abilities[a]}</b><small>${fmt(modOf(c.abilities[a]))}</small></div>`).join('')}</div>
          <dl class="sum-list">
            <dt>Saves</dt><dd>${R.CLASSES[ch.className].saves.map(a => R.ABIL_NAME[a]).join(', ')}</dd>
            <dt>Skills</dt><dd>${skills.length ? skills.join(', ') : 'None yet'}</dd>
            <dt>Feats</dt><dd>${feats(ch).map(esc).join(', ')}</dd>
          </dl>`;
      } else if (ch.species) {
        html += `<p class="muted small">Pick a background and class to see hit points, armor class and more.</p>`;
      }
      box.innerHTML = html;
    }

    /* ---------- Events ---------- */
    function pickSpecies(k) {
      if (ch.species === k) return;
      const sp = R.SPECIES[k];
      ch.species = k;
      ch.lineage = sp.lineages ? Object.keys(sp.lineages)[0] : null;
      ch.size = sp.size[0];
      ch.extraSkill = null;
    }

    function defaultBgBonus() {
      const bg = R.BACKGROUNDS[ch.background];
      if (!bg || ch.bgTouched) return;
      const pr = ch.className ? R.CLASSES[ch.className].priority : ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      const sorted = [...bg.abil].sort((a, b) => pr.indexOf(a) - pr.indexOf(b));
      ch.plus2 = sorted[0];
      ch.plus1 = sorted[1];
    }

    function pickClass(k) {
      if (ch.className === k) return;
      ch.className = k;
      ch.skills = [];
      ch.subclass = '';
      ch.subMode = 'list';
      ch.subOther = '';
      ch.extraSkill = null;
      ch.scoresTouched = false;
      if (ch.method === 'manual') ch.method = 'standard';
      ch.base = null;
      defaultBgBonus();
    }

    el.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      const d = btn.dataset;
      if (d.pick !== undefined) {
        if (step === 0) pickSpecies(d.pick);
        if (step === 1) { if (ch.background !== d.pick) { ch.background = d.pick; ch.bgTouched = false; defaultBgBonus(); } }
        if (step === 2) pickClass(d.pick);
        refresh();
        el.querySelector('.opt-detail')?.scrollIntoView({ block: 'nearest', behavior: Util.reducedMotion() ? 'auto' : 'smooth' });
        return;
      }
      if (d.sub !== undefined) {
        if (d.sub === '__other__') {
          ch.subMode = 'other';
          ch.subclass = ch.subOther.trim();
          refresh();
          el.querySelector('[data-set="subOther"]')?.focus({ preventScroll: true });
          return;
        }
        ch.subMode = 'list';
        ch.subclass = d.sub;
        return refresh();
      }
      if (d.bgmode) { ch.bgMode = d.bgmode; ch.bgTouched = true; return refresh(); }
      if (d.level) { ch.level = Util.clamp(ch.level + Number(d.level), 1, 20); if (ch.level < 3) { ch.subclass = ''; ch.subMode = 'list'; } return refresh(); }
      if (d.method) {
        ch.method = d.method;
        if (d.method === 'roll' && !ch.rolled) ch.rolled = rollSet();
        if (d.method !== 'manual') ensureScores(true);
        ch.scoresTouched = false;
        return refresh();
      }
      if (d.step) { step = Number(d.step); return render(); }
      switch (d.action) {
        case 'reroll': ch.rolled = rollSet(); ensureScores(true); return refresh();
        case 'back': step = Math.max(0, step - 1); return render();
        case 'next':
          if (problem(step)) return;
          if (step === STEPS.length - 1) {
            const c = build(ch);
            return onDone(c);
          }
          step++;
          render();
          (el.closest('.main') || document.scrollingElement).scrollTop = 0;
          if (step === STEPS.length - 1) el.querySelector('[data-set="name"]')?.focus();
          return;
        case 'cancel': return onCancel();
        case 'blank': {
          const c = Character.blank();
          return onDone(c, true);
        }
      }
    });

    el.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.set) {
        const k = t.dataset.set;
        if (k === 'level') {
          ch.level = Util.clamp(Util.num(t.value, 1), 1, 20);
          if (ch.level < 3) { ch.subclass = ''; ch.subMode = 'list'; }
        } else if (k === 'name') {
          return;
        } else if (k === 'subOther') {
          ch.subOther = t.value;
          ch.subclass = t.value.trim();
        } else {
          ch[k] = t.value || null;
          if (k === 'plus2' || k === 'plus1') {
            ch.bgTouched = true;
            if (k === 'plus2' && ch.plus1 === ch.plus2) {
              ch.plus1 = R.BACKGROUNDS[ch.background].abil.find(a => a !== ch.plus2);
            }
          }
        }
        return refresh();
      }
      if (t.dataset.skill) {
        const s = t.dataset.skill;
        ch.skills = t.checked ? [...ch.skills, s] : ch.skills.filter(x => x !== s);
        return refresh();
      }
      if (t.dataset.assign) {
        // Swap with whichever ability holds the chosen value.
        const a = t.dataset.assign;
        const pool = ch.method === 'roll' ? ch.rolled : STANDARD;
        const idx = Number(t.value);
        const other = R.ABIL.find(x => x !== a && valueIndex(x) === idx);
        const mine = ch.base[a];
        ch.base[a] = pool[idx];
        if (other) ch.base[other] = mine;
        ch.scoresTouched = true;
        return refresh();
      }
      if (t.dataset.score) {
        ch.base[t.dataset.score] = Util.clamp(Util.num(t.value, 10), 1, 20);
        ch.scoresTouched = true;
        return refresh();
      }
    });

    el.addEventListener('input', e => {
      if (e.target.dataset.set === 'name') ch.name = e.target.value;
      if (e.target.dataset.set === 'subOther') { ch.subOther = e.target.value; ch.subclass = e.target.value.trim(); renderSummary(); }
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.dataset.set === 'name') el.querySelector('[data-action="next"]').click();
    });

    function rollSet() {
      return Array.from({ length: 6 }, () => Dice.evaluate('4d6kh3').total);
    }

    render();
  }

  return { mount, build, classFeatureLines, recalcAttack, acFor, feats };
})();
