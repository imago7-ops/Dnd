'use strict';

/*
 * The Spells tab: laid out like the spell page of the official character sheet.
 * Spellcasting class, ability, save DC and attack bonus at the top; cantrips; then each
 * spell level with its slots (tick them off as you use them) and your spells, with a
 * prepared marker. Pick spells from the SRD list (js/spell-list.js) or add your own.
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

  function counts(c) {
    const b = book(c);
    let cantrips = 0, prepared = 0;
    b.list.forEach(e => {
      const lv = levelOfEntry(e);
      if (lv === 0) { if (e.p !== 'a') cantrips++; }
      else if (e.p === 1 || e.p === true) prepared++;
    });
    return { cantrips, prepared };
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
      if (k.cantrips) parts.push(`<span class="${n.cantrips > k.cantrips ? 'over' : ''}">Cantrips <b>${n.cantrips}</b> of ${k.cantrips}</span>`);
      parts.push(`<span class="${n.prepared > k.prepared ? 'over' : ''}">Prepared <b>${n.prepared}</b> of ${k.prepared}</span>`);
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
      <div class="sb-levels" data-ref="sbLevels">${levelsHTML(c)}</div>
      ${slotEditorHTML(c)}
      <label class="fp-text sb-notes"><span class="fp-title">Spell notes</span>
        <textarea data-bind="spells" rows="4" placeholder="Anything else about your spells: species or feat spells, spellbook notes…">${esc(c.spells || '')}</textarea></label>
      <p class="muted small sb-credit">Spell summaries are from the D&amp;D System Reference Document 5.2 (CC-BY-4.0), in short form: check your book for full rules.</p>
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
      if (t.dataset.sb === 'always') { entry.p = t.checked ? 'a' : 1; save(); return redraw(); }
      if (t.dataset.sb === 'src') { entry.src = t.value.trim().slice(0, 60); if (!entry.src) delete entry.src; save(); return redraw(); }
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
  function openPicker(c, done, startLevel) {
    const b = book(c);
    const k = caster(c);
    const maxSlot = (() => {
      const m = slotMax(c, k);
      let top = 0;
      m.forEach((n, i) => { if (n > 0) top = i; });
      if (k && k.slots && k.slots.pact) top = Math.max(top, k.slots.slotLevel);
      if (c.className === 'Warlock') [[6, 11], [7, 13], [8, 15], [9, 17]].forEach(([lv, at]) => { if (levelOf(c) >= at) top = Math.max(top, lv); });
      return top;
    })();
    const lists = k ? k.lists : [];
    const st = { q: '', level: startLevel !== undefined && startLevel !== '' ? Number(startLevel) : 'all', allClasses: !lists.length, allLevels: false };
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
        return true;
      });
    }

    function listHTML() {
      const r = results();
      if (!r.length) return '<p class="sb-empty">No spells match. Try another level, or tick "Every class".</p>';
      return `<ul class="sbp-list">${r.slice(0, 400).map(s => `<li>
        <label class="sbp-item ${has(s.name) ? 'on' : ''}">
          <input type="checkbox" data-pick="${esc(s.name)}" ${has(s.name) ? 'checked' : ''}>
          <span class="sbp-main"><b>${esc(s.name)}</b> <span class="sbp-lvl">${s.level ? `Level ${s.level}` : 'Cantrip'} · ${esc(s.school)}${s.conc ? ' · C' : ''}${s.ritual ? ' · R' : ''}</span>
            <span class="sbp-sum">${esc(s.summary)}</span></span>
        </label></li>`).join('')}</ul>`;
    }

    function render() {
      const n = counts(c);
      body.innerHTML = `
        <header class="modal-head"><div><h2 id="sbp-title">Choose spells</h2>
          <p class="muted">${k ? `${esc(lists.join(', ') || k.className)} list${lists.length > 1 ? 's' : ''}, up to level ${maxSlot}. Cantrips ${n.cantrips}${k.cantrips ? ` of ${k.cantrips}` : ''} · Prepared ${n.prepared} of ${k.prepared}.` : 'Pick any spells, for example from a feat or your species.'}</p></div>
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
        <footer class="modal-foot"><span class="foot-hint muted">Ticked spells are on your sheet. New ones start prepared while you have room.</span><button class="btn btn-primary" data-act="close">Done</button></footer>`;
    }

    function refreshList() {
      body.querySelector('[data-ref="list"]').innerHTML = listHTML();
      const n = counts(c);
      const p = body.querySelector('.modal-head .muted');
      if (p && k) p.textContent = `${lists.join(', ') || k.className} list${lists.length > 1 ? 's' : ''}, up to level ${maxSlot}. Cantrips ${n.cantrips}${k.cantrips ? ` of ${k.cantrips}` : ''} · Prepared ${n.prepared} of ${k.prepared}.`;
    }

    host.addEventListener('click', e => {
      if (e.target === host) return close();
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
      if (t.dataset.pick) {
        const name = t.dataset.pick;
        if (t.checked && !has(name)) {
          const sp = SpellList.byName(name);
          const n = counts(c);
          b.list.push({ n: name, p: sp && sp.level > 0 ? (k && n.prepared >= k.prepared ? 0 : 1) : 0 });
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
      b.list.push(known ? { n: known.name, p: known.level ? 1 : 0 } : { n: name, lvl, custom: true, p: lvl ? 1 : 0 });
      Store.save();
      f.reset();
      refreshList();
      Util.toast(`Added ${name}.`);
    });
    render();
    body.querySelector('[data-ref="q"]').focus();
  }

  return { mount, updateStats, caster, stats, book };
})();
