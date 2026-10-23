'use strict';

/*
 * Level up (or down) an existing character.
 * Everything tied to level is recalculated: HP, hit dice, proficiency-based numbers,
 * Ability Score Improvements or feats, subclass at level 3, AC, initiative, speed,
 * attacks, class resources, the features list and spellcasting.
 * The sheet's own edits are kept: changes are applied as differences, not overwrites.
 */
const LevelUp = (() => {
  const R = Rules;
  const esc = Util.esc;
  const fmt = Util.fmtMod;
  const modOf = s => Math.floor((Util.num(s, 10) - 10) / 2);
  const ORD = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];
  const clone = o => JSON.parse(JSON.stringify(o));
  const ASI_NAME = 'Ability Score Improvement';

  /* ---------- Facts about a character ---------- */
  function info(c) {
    const cl = R.CLASSES[c.className] || null;
    const m = /^\s*(\d+)\s*d\s*(\d+)\s*$/.exec(String(c.hitDice || ''));
    const die = cl ? cl.die : (m ? Number(m[2]) : 8);
    const spName = Object.keys(R.SPECIES).find(s => String(c.species || '').startsWith(s));
    const feats = [];
    if (c.creation) feats.push(...Creator.feats(c.creation));
    Object.values(c.asiLog || {}).forEach(x => { if (x.feat) feats.push(x.feat.trim()); });
    return { cl, die, sp: spName ? R.SPECIES[spName] : null, feats };
  }
  const hasFeat = (feats, name) => feats.some(f => f.toLowerCase() === name.toLowerCase());

  function asiLevels(cl) {
    if (!cl) return [4, 8, 12, 16, 19];
    return Object.entries(cl.features)
      .filter(([, list]) => list.includes(ASI_NAME) || list.includes('Epic Boon'))
      .map(([lv]) => Number(lv));
  }

  function defaultLog(c, die, level) {
    return Array.from({ length: level }, (_, i) => (i === 0 ? die : die / 2 + 1));
  }

  function hpFormula(log, level, scores, sp, feats) {
    const dice = log.slice(0, level).reduce((a, b) => a + b, 0);
    const perLevel = modOf(scores.con) + (sp && sp.hpPerLevel ? sp.hpPerLevel : 0) + (hasFeat(feats, 'Tough') ? 2 : 0);
    return dice + level * perLevel;
  }

  /* Apply a plan to a copy of the character and return the copy. */
  function applyPlan(src, plan) {
    const x = clone(src);
    const from = Util.clamp(Util.num(src.level, 1), 1, 20);
    const to = plan.to;
    const before = info(x);
    const oldScores = { ...x.abilities };
    const oldPb = R.profBonus(from);
    const newPb = R.profBonus(to);
    x.asiLog = x.asiLog || {};
    const oldLog = x.hpLog && x.hpLog.length >= from ? x.hpLog.slice(0, from) : defaultLog(x, before.die, from);
    const log = oldLog.slice();
    const notes = {};

    if (to > from) {
      for (let lv = from + 1; lv <= to; lv++) {
        log[lv - 1] = plan.hpMethod === 'roll' ? plan.rolls[lv] : before.die / 2 + 1;
      }
      Object.entries(plan.asi).forEach(([lvStr, ch]) => {
        const lv = Number(lvStr);
        if (lv <= from || lv > to) return;
        const changes = {};
        const cap = lv === 19 ? 30 : 20;
        const add = (a, n) => {
          if (!a) return;
          const room = Math.max(0, cap - Util.num(x.abilities[a], 10));
          const inc = Math.min(n, room);
          if (inc > 0) { x.abilities[a] = Util.num(x.abilities[a], 10) + inc; changes[a] = (changes[a] || 0) + inc; }
        };
        if (ch.type === '2') add(ch.a, 2);
        if (ch.type === '11') { add(ch.a, 1); add(ch.b, 1); }
        if (ch.type === 'feat' && ch.boonAbility) add(ch.boonAbility, 1);
        x.asiLog[lv] = { changes, feat: ch.type === 'feat' ? String(ch.feat || '').trim() : '' };
        const parts = Object.entries(changes).map(([a, n]) => `+${n} ${R.ABIL_NAME[a]}`);
        if (ch.type === 'feat') parts.unshift(`feat: ${String(ch.feat || '').trim()}`);
        notes[lv] = parts.join(', ');
      });
      if (from < 3 && to >= 3 && plan.subclass !== undefined) x.subclass = plan.subclass;
    } else if (to < from) {
      log.length = to;
      Object.keys(x.asiLog).map(Number).filter(lv => lv > to).forEach(lv => {
        Object.entries(x.asiLog[lv].changes || {}).forEach(([a, n]) => { x.abilities[a] = Util.num(x.abilities[a], 10) - n; });
        delete x.asiLog[lv];
      });
      if (to < 3) x.subclass = '';
    }

    x.level = to;
    x.hpLog = log;
    const after = info(x);
    const newScores = x.abilities;

    // Hit points: new dice, plus Con changes applied to every level (2024 rule).
    const delta = hpFormula(log, to, newScores, after.sp, after.feats) - hpFormula(oldLog, from, oldScores, before.sp, before.feats);
    x.hp.max = Math.max(1, Util.num(x.hp.max, 1) + delta);
    x.hp.current = to > from
      ? Util.num(x.hp.current, 0) + Math.max(0, delta)
      : Math.min(Util.num(x.hp.current, 0), x.hp.max);
    if (to > from && delta < 0) x.hp.current = Math.min(x.hp.current, x.hp.max);

    // Hit dice, XP
    if (/^\s*\d+\s*d\s*\d+\s*$/.test(String(x.hitDice || '')) || before.cl) x.hitDice = `${to}d${after.die}`;
    const xp = Util.num(x.xp, 0);
    if (xp < R.XP[to - 1] || (to < 20 && xp >= R.XP[to])) x.xp = R.XP[to - 1];

    // Class-driven numbers
    const cl = after.cl;
    if (cl) {
      if (cl.speedBonus) x.speed = Util.num(x.speed, 30) + cl.speedBonus(to) - cl.speedBonus(from);
      x.ac = Util.num(x.ac, 10) + Creator.acFor(cl.ac, newScores) - Creator.acFor(cl.ac, oldScores);
    }
    const alertBefore = hasFeat(before.feats, 'Alert') ? oldPb : 0;
    const alertAfter = hasFeat(after.feats, 'Alert') ? newPb : 0;
    x.initMisc = Util.num(x.initMisc, 0) + alertAfter - alertBefore;

    // Attacks
    x.attacks.forEach(a => {
      if (a.auto) Creator.recalcAttack(a, newScores, to, x.className);
      else if (a.bonus !== '' && Number.isFinite(Number(a.bonus))) a.bonus = Number(a.bonus) + newPb - oldPb;
    });

    if (cl) {
      x.features = updateFeatures(x, cl, from, to, oldScores, newScores, notes, src.subclass);
      x.spells = updateSpells(x, cl, newScores);
    }
    return x;
  }

  function updateFeatures(x, cl, from, to, oldScores, newScores, notes, oldSub) {
    let lines = String(x.features || '').split('\n');
    const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hdrRe = new RegExp(`^${reEsc(x.className)} \\d+( \\(.*\\))?$`);
    let hi = lines.findIndex(l => hdrRe.test(l));
    const header = `${x.className} ${to}${x.subclass ? ` (${x.subclass})` : ''}`;
    if (hi >= 0) lines[hi] = header;

    // Class resources (Rage uses, Sneak Attack dice…)
    const oldStats = cl.stats(from, { mod: a => modOf(oldScores[a]) }).map(s => `- ${s}`);
    const newStats = cl.stats(to, { mod: a => modOf(newScores[a]) }).map(s => `- ${s}`);
    const first = lines.findIndex(l => oldStats.includes(l));
    lines = lines.filter(l => !oldStats.includes(l));
    if (first >= 0) lines.splice(first, 0, ...newStats);
    else if (hi >= 0) lines.splice(hi + 1, 0, ...newStats);

    // Subclass source line
    if (x.subclass !== oldSub) {
      lines = lines.filter(l => !/^- (Subclass from |Homebrew subclass)/.test(l));
      hi = lines.findIndex(l => hdrRe.test(l));
      if (x.subclass && hi >= 0) {
        const e = cl.subclasses[x.subclass];
        lines.splice(hi + 1, 0, e ? `- Subclass from ${e.source}` : '- Homebrew subclass: add its features below');
      }
    }

    // Per-level feature lines
    const lvRe = /^Level (\d+): /;
    if (to < from) {
      lines = lines.filter(l => { const m = lvRe.exec(l); return !m || Number(m[1]) <= to; });
    } else if (to > from) {
      const fresh = Creator.classFeatureLines({ className: x.className, subclass: x.subclass, level: to })
        .filter(l => Number(lvRe.exec(l)[1]) > from)
        .map(l => {
          const lv = Number(lvRe.exec(l)[1]);
          if (!notes[lv]) return l;
          return l.replace(ASI_NAME, `${ASI_NAME} (${notes[lv]})`).replace('Epic Boon', `Epic Boon (${notes[lv]})`);
        });
      // If a subclass was just picked, refresh the level 3 line too.
      if (from >= 3 || !x.subclass) { /* nothing */ }
      let last = -1;
      lines.forEach((l, i) => { if (lvRe.test(l)) last = i; });
      if (last >= 0) lines.splice(last + 1, 0, ...fresh);
      else {
        if (lines.join('').trim() === '') lines = [];
        else lines.push('');
        lines.push(`${x.className} features gained by levelling up`, ...fresh);
      }
    }
    return lines.join('\n');
  }

  function castingFor(x, cl) {
    if (cl.caster) return cl.caster;
    if (x.level >= 3 && (x.subclass === 'Eldritch Knight' || x.subclass === 'Arcane Trickster')) return { type: 'third', abil: 'int' };
    return null;
  }

  function spellLines(x, cl, scores) {
    const casting = castingFor(x, cl);
    if (!casting) return null;
    const L = x.level;
    const pb = R.profBonus(L);
    const m = modOf(scores[casting.abil]);
    const out = {
      ability: `Spellcasting ability: ${R.ABIL_NAME[casting.abil]}`,
      dc: `Spell save DC: ${8 + pb + m}    Spell attack: ${fmt(pb + m)}`,
    };
    if (casting.type === 'third') return out;
    const cantrips = R.cantripsKnown(casting, L);
    if (cantrips) out.cantrips = `Cantrips known: ${cantrips}`;
    out.prepared = `Prepared spells: ${casting.prepared[L - 1]}`;
    const slots = R.spellSlots(casting, L);
    if (slots.pact) out.slots = `Pact Magic slots: ${slots.count} slot${slots.count > 1 ? 's' : ''} of level ${slots.slotLevel} (regain on a short rest)`;
    else out.slots = 'Spell slots: ' + slots.map((n, i) => `${ORD[i]}: ${n}`).join(', ');
    return out;
  }

  function updateSpells(x, cl, scores) {
    const s = spellLines(x, cl, scores);
    let text = String(x.spells || '');
    if (!s) return text;
    if (!/^Spell save DC:/m.test(text)) {
      const block = [s.ability, s.dc, s.cantrips, s.prepared, s.slots].filter(Boolean).join('\n');
      return text.trim() ? `${block}\n\n${text}` : `${block}\n`;
    }
    const swap = (re, line) => {
      if (!line) return;
      if (re.test(text)) text = text.replace(re, line);
      else text = text.replace(/^(Spell save DC:.*)$/m, `$1\n${line}`);
    };
    swap(/^Spell save DC:.*$/m, s.dc);
    swap(/^Cantrips known:.*$/m, s.cantrips);
    swap(/^Prepared spells:.*$/m, s.prepared);
    swap(/^(Spell slots|Pact Magic slots):.*$/m, s.slots);
    return text;
  }

  /* ---------- Dialog ---------- */
  function open(c, to, { onApply, onCancel }) {
    const from = Util.clamp(Util.num(c.level, 1), 1, 20);
    to = Util.clamp(Util.num(to, from), 1, 20);
    const base = info(c);
    const cl = base.cl;
    const up = to > from;
    const plan = { to, hpMethod: 'avg', rolls: {}, asi: {}, subclass: undefined, subMode: 'list', subOther: '' };
    const newAsi = asiLevels(cl).filter(lv => lv > from && lv <= to);
    const needSub = up && cl && from < 3 && to >= 3 && !c.subclass;
    if (!needSub && up && from < 3 && to >= 3) plan.subclass = c.subclass;

    // Sensible defaults: put increases into the class's main ability.
    const priority = cl ? cl.priority : ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    let running = { ...c.abilities };
    newAsi.forEach(lv => {
      if (lv === 19) {
        plan.asi[lv] = { type: 'feat', feat: '', boonAbility: priority[0] };
        return;
      }
      const a = priority.find(k => Util.num(running[k], 10) <= 18) || priority[0];
      plan.asi[lv] = { type: '2', a, b: priority.find(k => k !== a), feat: '' };
      running[a] = Util.num(running[a], 10) + 2;
    });
    for (let lv = from + 1; lv <= to; lv++) plan.rolls[lv] = Dice.evaluate(`1d${base.die}`).total;

    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="lu-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const lastFocus = document.activeElement;

    function problem() {
      for (const lv of newAsi) {
        const a = plan.asi[lv];
        if (a.type === '11' && (!a.a || !a.b || a.a === a.b)) return `Level ${lv}: pick two different abilities.`;
        if (a.type === 'feat' && !String(a.feat || '').trim()) return `Level ${lv}: type the feat you're taking.`;
      }
      return '';
    }

    function abilSelect(lv, key, value, exclude) {
      return `<select data-asi="${lv}" data-key="${key}" aria-label="Ability">
        ${R.ABIL.filter(a => a !== exclude).map(a => `<option value="${a}" ${a === value ? 'selected' : ''}>${R.ABIL_NAME[a]} (${c.abilities[a]})</option>`).join('')}
      </select>`;
    }

    function render() {
      const preview = applyPlan(c, plan);
      const oldPb = R.profBonus(from), newPb = R.profBonus(to);
      const changes = [];
      const row = (label, a, b) => { if (String(a) !== String(b)) changes.push(`<tr><th>${label}</th><td>${esc(a)}</td><td aria-hidden="true">→</td><td><b>${esc(b)}</b></td></tr>`); };
      row('Proficiency bonus', fmt(oldPb), fmt(newPb));
      row('Hit point maximum', c.hp.max, preview.hp.max);
      row('Hit dice', c.hitDice, preview.hitDice);
      row('Armor class', c.ac, preview.ac);
      row('Speed', `${c.speed} ft`, `${preview.speed} ft`);
      R.ABIL.forEach(a => row(R.ABIL_NAME[a], c.abilities[a], preview.abilities[a]));
      if (cl) {
        const os = spellLines(c, cl, c.abilities), ns = spellLines(preview, cl, preview.abilities);
        if (ns) {
          row('Spell save DC', os ? os.dc.split('    ')[0].replace('Spell save DC: ', '') : '–', ns.dc.split('    ')[0].replace('Spell save DC: ', ''));
          if (ns.cantrips) row('Cantrips known', os && os.cantrips ? os.cantrips.replace('Cantrips known: ', '') : '–', ns.cantrips.replace('Cantrips known: ', ''));
          row('Prepared spells', os && os.prepared ? os.prepared.replace('Prepared spells: ', '') : '–', ns.prepared ? ns.prepared.replace('Prepared spells: ', '') : '–');
          if (ns.slots) row('Spell slots', os && os.slots ? os.slots.replace(/^(Spell slots|Pact Magic slots): /, '') : '–', ns.slots.replace(/^(Spell slots|Pact Magic slots): /, ''));
        }
        const ost = cl.stats(from, { mod: a => modOf(c.abilities[a]) });
        const nst = cl.stats(to, { mod: a => modOf(preview.abilities[a]) });
        nst.forEach(line => { if (!ost.includes(line)) changes.push(`<tr><th>Class</th><td colspan="3"><b>${esc(line)}</b></td></tr>`); });
      }
      const atkChanges = preview.attacks.filter((a, i) => c.attacks[i] && (String(c.attacks[i].bonus) !== String(a.bonus) || c.attacks[i].damage !== a.damage));
      atkChanges.forEach(a => {
        const old = c.attacks.find(o => o.id === a.id);
        changes.push(`<tr><th>${esc(a.name || 'Attack')}</th><td>${fmt(old.bonus)}, ${esc(old.damage)}</td><td aria-hidden="true">→</td><td><b>${fmt(a.bonus)}, ${esc(a.damage)}</b></td></tr>`);
      });

      const newFeatureLines = cl && up
        ? Creator.classFeatureLines({ className: c.className, subclass: preview.subclass, level: to }).filter(l => Number(/^Level (\d+)/.exec(l)[1]) > from)
        : [];
      const avg = base.die / 2 + 1;
      const con = modOf(preview.abilities.con);
      const err = problem();

      body.innerHTML = `
        <header class="modal-head">
          <div>
            <h2 id="lu-title">${up ? 'Level up' : 'Level down'}: ${from} → ${to}</h2>
            <p class="muted">${esc(c.name || 'Your character')}${c.className ? `, ${esc(c.className)}` : ''}</p>
          </div>
          <button class="icon-btn" data-act="cancel" aria-label="Close">×</button>
        </header>
        <div class="modal-body">
          ${!cl && c.className ? `<p class="detail-note">${esc(c.className)} isn't a class this site knows, so only level, hit points, hit dice and proficiency will change.</p>` : ''}
          ${!c.className ? `<p class="detail-note">No class set on this sheet, so only level, hit points, hit dice and proficiency will change.</p>` : ''}

          ${up ? `<section class="lu-section">
            <h3>Hit points</h3>
            <div class="seg" role="radiogroup">
              <button role="radio" data-hp="avg" class="${plan.hpMethod === 'avg' ? 'on' : ''}" aria-checked="${plan.hpMethod === 'avg'}">Take the average (${avg})</button>
              <button role="radio" data-hp="roll" class="${plan.hpMethod === 'roll' ? 'on' : ''}" aria-checked="${plan.hpMethod === 'roll'}">Roll d${base.die}</button>
            </div>
            <ul class="hp-gains">
              ${Array.from({ length: to - from }, (_, i) => from + 1 + i).map(lv => {
                const die = plan.hpMethod === 'roll' ? plan.rolls[lv] : avg;
                return `<li><span>Level ${lv}</span><b>${die}</b><span class="muted">${plan.hpMethod === 'roll' ? `rolled on d${base.die}` : 'average'} ${con >= 0 ? '+' : '−'} ${Math.abs(con)} Con</span></li>`;
              }).join('')}
            </ul>
            ${plan.hpMethod === 'roll' ? '<button class="link-btn" data-act="reroll">Roll again</button>' : ''}
            <p class="detail-note">Hit points go from <b>${c.hp.max}</b> to <b>${preview.hp.max}</b>${Object.keys(plan.asi).length ? ', including any Constitution increase below (it counts for every level)' : ''}.</p>
          </section>` : `<section class="lu-section">
            <p class="detail-note">Lowering the level removes the hit points, ability increases and features gained above level ${to}.</p>
          </section>`}

          ${needSub ? `<section class="lu-section">
            <h3>Choose a subclass</h3>
            <p class="detail-note">${esc(c.className)}s pick a subclass at level 3.</p>
            <select data-act="subclass" aria-label="Subclass">
              <option value="" ${!plan.subclass && plan.subMode !== 'other' ? 'selected' : ''}>Decide later</option>
              ${Object.entries(cl.subclasses).map(([n, e]) => `<option value="${esc(n)}" ${plan.subclass === n && plan.subMode !== 'other' ? 'selected' : ''}>${esc(n)} (${esc(e.source)})</option>`).join('')}
              <option value="__other__" ${plan.subMode === 'other' ? 'selected' : ''}>Other / homebrew…</option>
            </select>
            ${plan.subMode === 'other' ? `<input class="lu-text" data-act="subother" value="${esc(plan.subOther)}" placeholder="Subclass name" aria-label="Homebrew subclass name">` : ''}
          </section>` : ''}

          ${newAsi.map(lv => {
            const a = plan.asi[lv];
            const boon = lv === 19;
            return `<section class="lu-section">
              <h3>Level ${lv}: ${boon ? 'Epic Boon' : 'Ability Score Improvement'}</h3>
              ${boon ? `<p class="detail-note">Choose an Epic Boon feat. It also raises one ability by 1 (up to 30).</p>
                <div class="lu-row">
                  <input class="lu-text" data-asi="${lv}" data-key="feat" value="${esc(a.feat)}" placeholder="Epic Boon name, e.g. Boon of Fortitude" aria-label="Epic Boon">
                  <label class="field"><span>+1 to</span>${abilSelect(lv, 'boonAbility', a.boonAbility)}</label>
                </div>` : `
                <div class="seg" role="radiogroup">
                  <button role="radio" data-asi="${lv}" data-type="2" class="${a.type === '2' ? 'on' : ''}" aria-checked="${a.type === '2'}">+2 to one ability</button>
                  <button role="radio" data-asi="${lv}" data-type="11" class="${a.type === '11' ? 'on' : ''}" aria-checked="${a.type === '11'}">+1 to two abilities</button>
                  <button role="radio" data-asi="${lv}" data-type="feat" class="${a.type === 'feat' ? 'on' : ''}" aria-checked="${a.type === 'feat'}">Take a feat instead</button>
                </div>
                <div class="lu-row">
                  ${a.type === '2' ? `<label class="field"><span>+2 to</span>${abilSelect(lv, 'a', a.a)}</label>` : ''}
                  ${a.type === '11' ? `<label class="field"><span>+1 to</span>${abilSelect(lv, 'a', a.a)}</label><label class="field"><span>and +1 to</span>${abilSelect(lv, 'b', a.b, a.a)}</label>` : ''}
                  ${a.type === 'feat' ? `<input class="lu-text" data-asi="${lv}" data-key="feat" value="${esc(a.feat)}" placeholder="Feat name, e.g. War Caster" aria-label="Feat name">` : ''}
                </div>
                ${a.type === 'feat' ? '<p class="detail-note">If the feat raises an ability score, add that on the sheet afterwards. Tough and Alert are applied automatically.</p>' : '<p class="detail-note">Scores can\'t go above 20.</p>'}`}
            </section>`;
          }).join('')}

          <section class="lu-section">
            <h3>What changes</h3>
            ${changes.length ? `<table class="lu-changes">${changes.join('')}</table>` : '<p class="detail-note">Nothing else changes at this level.</p>'}
          </section>

          ${newFeatureLines.length ? `<section class="lu-section">
            <h3>New features</h3>
            <ul class="trait-list compact">${newFeatureLines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
            <p class="detail-note">These are added to the Features box on your sheet.</p>
          </section>` : ''}
        </div>
        <footer class="modal-foot">
          <span class="foot-hint">${esc(err)}</span>
          <button class="btn" data-act="cancel">Cancel</button>
          <button class="btn btn-primary" data-act="apply" ${err ? 'disabled' : ''}>${up ? `Level up to ${to}` : `Go down to level ${to}`}</button>
        </footer>`;
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      host.remove();
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    function onKey(e) { if (e.key === 'Escape') { close(); onCancel && onCancel(); } }
    document.addEventListener('keydown', onKey);

    host.addEventListener('click', e => {
      if (e.target === host) { close(); onCancel && onCancel(); return; }
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.hp) { plan.hpMethod = b.dataset.hp; return render(); }
      if (b.dataset.type) {
        const a = plan.asi[b.dataset.asi];
        a.type = b.dataset.type;
        if (a.type === '11' && a.b === a.a) a.b = R.ABIL.find(k => k !== a.a);
        return render();
      }
      switch (b.dataset.act) {
        case 'reroll':
          for (let lv = from + 1; lv <= to; lv++) plan.rolls[lv] = Dice.evaluate(`1d${base.die}`).total;
          return render();
        case 'cancel': close(); return onCancel && onCancel();
        case 'apply': {
          if (problem()) return;
          const result = applyPlan(c, plan);
          close();
          return onApply(result);
        }
      }
    });

    host.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.act === 'subclass') {
        plan.subMode = t.value === '__other__' ? 'other' : 'list';
        plan.subclass = t.value === '__other__' ? plan.subOther.trim() : t.value;
        render();
        if (plan.subMode === 'other') host.querySelector('[data-act="subother"]').focus();
        return;
      }
      if (t.dataset.asi && t.tagName === 'SELECT') {
        const a = plan.asi[t.dataset.asi];
        a[t.dataset.key] = t.value;
        if (a.type === '11' && a.a === a.b) a.b = R.ABIL.find(k => k !== a.a);
        render();
      }
    });
    host.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.act === 'subother') { plan.subOther = t.value; plan.subclass = t.value.trim(); }
      if (t.dataset.asi && t.dataset.key === 'feat') {
        plan.asi[t.dataset.asi].feat = t.value;
        const btn = host.querySelector('[data-act="apply"]');
        const err = problem();
        btn.disabled = Boolean(err);
        host.querySelector('.modal-foot .foot-hint').textContent = err;
      }
    });

    render();
    host.querySelector('.modal button.btn-primary, .modal .seg button')?.focus();
  }

  return { open, applyPlan };
})();
