'use strict';

/*
 * Campaign guide: a full-screen walkthrough of a campaign, session by session.
 *
 * Built from the campaign itself: the Session notes entries tagged "Session 1", "Session 2"…
 * give the order and the plan, and every other entry with the same tag (NPCs, places, quests,
 * encounters, items, events) is laid out with that session. Names mentioned in a plan's steps
 * become chips you can open right there. Works for premade campaigns and your own.
 */
const Guide = (() => {
  const esc = Util.esc;

  /* ---------- Reading the campaign ---------- */
  function sessionNum(e) {
    for (const t of e.tags || []) {
      const m = /^session\s+(\d+)$/i.exec(t);
      if (m) return Number(m[1]);
    }
    const m = /^session\s+(\d+)\b/i.exec(e.f.name || '');
    return m ? Number(m[1]) : null;
  }

  function model(cp) {
    const sesSec = cp.sections.find(s => s.type === 'sessions');
    const ses = sesSec ? sesSec.entries : [];
    const sessions = ses.map(e => ({ e, n: sessionNum(e) })).filter(x => x.n != null).sort((a, b) => a.n - b.n);
    const overview = ses.filter(e => sessionNum(e) == null);
    const all = cp.sections.filter(s => s.type !== 'sessions').flatMap(sec => sec.entries.map(e => ({ sec, e, t: Campaign.typeOf(sec) })));
    return { sesSec, sessions, overview, all };
  }
  const has = cp => model(cp).sessions.length > 0;
  const taggedFor = (m, n) => m.all.filter(x => (x.e.tags || []).some(t => t.toLowerCase() === `session ${n}`));

  /* "Session 2: The dark lighthouse" -> "The dark lighthouse" */
  const titleOf = e => String(e.f.name || '').replace(/^session\s+\d+\s*[:.\-–]?\s*/i, '') || `Session ${sessionNum(e)}`;

  /* Split a plan into a goal and numbered steps. */
  function parsePlan(text) {
    const out = { goal: '', beats: [] };
    String(text || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      const goal = /^goal\s*:\s*(.+)$/i.exec(line);
      if (goal && !out.goal) { out.goal = goal[1].charAt(0).toUpperCase() + goal[1].slice(1); return; }
      const num = /^(\d+)[.)]\s+(.+)$/.exec(line) || /^[-•*]\s+(.+)$/.exec(line);
      if (num) out.beats.push(num[2] || num[1]);
      else if (out.beats.length) out.beats[out.beats.length - 1] += ` ${line}`;
      else out.beats.push(line);
    });
    return out;
  }

  /* Which entries a step mentions: full names, names without "The", and distinctive first names. */
  const TITLES = new Set(['the', 'sister', 'brother', 'captain', 'councillor', 'lord', 'lady', 'master', 'king', 'queen', 'sir', 'level', 'old', 'mother', 'father']);
  function namePatterns(x) {
    const name = String(x.e.f.name || '').trim();
    if (name.length < 3) return [];
    const pats = new Set([name, name.replace(/^the\s+/i, '')]);
    if (['npcs', 'bosses'].includes(x.sec.type)) {
      name.split(/\s+/).forEach(w => { if (w.length >= 4 && /^[A-Z]/.test(w) && !TITLES.has(w.toLowerCase())) pats.add(w.replace(/[^\w'-]/g, '')); });
    }
    return [...pats].filter(p => p.length >= 3);
  }
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function mentions(text, pool) {
    const found = [];
    pool.forEach(x => {
      let best = -1;
      namePatterns(x).forEach(p => {
        const m = new RegExp(`(^|[^\\w])${reEsc(p)}(?:e?s)?(?![\\w])`, 'i').exec(text);
        if (m && (best < 0 || m.index < best)) best = m.index;
      });
      if (best >= 0) found.push({ x, at: best });
    });
    return found.sort((a, b) => a.at - b.at).map(f => f.x);
  }

  /* ---------- The pop-out ---------- */
  const GROUPS = [
    ['Quests', ['quests']], ['Encounters', ['encounters']], ['Places', ['locations']], ['People', ['npcs']],
    ['Villains and monsters', ['bosses', 'monsters']], ['Factions', ['factions']], ['Treasure', ['items']],
    ['Events and conditions', ['weather', 'abnormalities']], ['Lore', ['lore']],
  ];

  function open(cp, opts = {}) {
    const m0 = model(cp);
    if (!m0.sessions.length) return Util.toast('Add sessions tagged "Session 1", "Session 2"… to Session notes to use the guide.', 'error');
    const save = () => { cp.updated = Date.now(); Store.save(); };
    let step = Util.clamp(Number(cp.guideStep) || 0, 0, m0.sessions.length); // 0 = overview
    let openCard = ''; // key of the expanded card
    const host = document.createElement('div');
    host.className = 'guide-backdrop';
    host.innerHTML = `<div class="guide" role="dialog" aria-modal="true" aria-label="Campaign guide"><aside class="guide-side" data-ref="side"></aside><div class="guide-main" data-ref="main"></div></div>`;
    document.body.appendChild(host);
    document.body.classList.add('guide-open');
    const side = host.querySelector('[data-ref="side"]');
    const main = host.querySelector('[data-ref="main"]');
    const lastFocus = document.activeElement;

    function close() {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', close);
      host.remove();
      document.body.classList.remove('guide-open');
      if (opts.onClose) opts.onClose();
      if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    }
    function onKey(e) {
      if (e.key === 'Escape') return close();
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') go(step + 1);
      if (e.key === 'ArrowLeft') go(step - 1);
    }
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', close); // moving to another page closes the guide

    function go(n) {
      const m = model(cp);
      step = Util.clamp(n, 0, m.sessions.length);
      cp.guideStep = step;
      openCard = '';
      save();
      render();
      main.scrollTop = 0;
    }

    /* ---------- Pieces ---------- */
    function sideHTML(m) {
      return `<div class="guide-brand"><span class="guide-kicker">Campaign guide</span><b>${esc(cp.name || 'Untitled campaign')}</b></div>
        <ol class="guide-steps">
          <li><button class="guide-step ${step === 0 ? 'on' : ''}" data-go="0"><span class="gs-num">★</span><span>Overview</span></button></li>
          ${m.sessions.map((s, i) => `<li><button class="guide-step ${step === i + 1 ? 'on' : ''} ${s.e.played ? 'played' : ''}" data-go="${i + 1}">
            <span class="gs-num">${s.e.played ? '✓' : s.n}</span><span>${esc(titleOf(s.e))}${s.e.f.level ? `<small>Level ${esc(s.e.f.level)}</small>` : ''}</span></button></li>`).join('')}
        </ol>
        <label class="guide-jump"><span class="sr-only">Go to</span><select data-ref="jump">
          <option value="0" ${step === 0 ? 'selected' : ''}>Overview</option>
          ${m.sessions.map((s, i) => `<option value="${i + 1}" ${step === i + 1 ? 'selected' : ''}>${s.e.played ? '✓ ' : ''}Session ${s.n}: ${esc(titleOf(s.e))}</option>`).join('')}
        </select></label>`;
    }

    function knownBtn(x) {
      return `<button class="vis-mini ${x.e.known ? 'known' : ''}" data-known="${x.e.id}" aria-pressed="${Boolean(x.e.known)}" title="${x.e.known ? 'Players know this. Click to hide it.' : 'Hidden from players. Click to reveal it.'}">${x.e.known ? 'Known' : 'Hidden'}</button>`;
    }

    function statsFor(name) {
      const key = name.trim().toLowerCase();
      const hit = model(cp).all.find(x => ['monsters', 'bosses', 'npcs'].includes(x.sec.type) && String(x.e.f.name || '').trim().toLowerCase() === key);
      return hit ? { hp: Number(hit.e.f.hp) || 10, ac: Number(hit.e.f.ac) || 12, cr: hit.e.f.cr, x: hit } : null;
    }
    function creatureLines(text) {
      return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
        const m = /^(\d+)\s*[x×]?\s+(.+)$/i.exec(line);
        const count = m ? Number(m[1]) : 1;
        const name = m ? m[2] : line;
        return { count, name, stats: statsFor(name) };
      });
    }

    /* Everything about one entry, read-only, with quick actions. */
    function detailHTML(x) {
      const skip = new Set(['name']);
      const rows = x.t.fields.filter(([k]) => !skip.has(k) && String(x.e.f[k] || '').trim())
        .map(([k, label]) => {
          if (k === 'creatures') {
            return `<div class="gd-row wide"><dt>${esc(label.replace(/\s*\(.*\)$/, ''))}</dt><dd><ul class="gd-creatures">${creatureLines(x.e.f.creatures).map(c =>
              `<li><b>${c.count > 1 ? `${c.count} × ` : ''}${esc(c.name)}</b>${c.stats ? ` <span class="muted">AC ${c.stats.ac}, HP ${c.stats.hp}${c.stats.cr ? `, CR ${esc(c.stats.cr)}` : ''}</span> <button class="link-btn" data-card="${c.stats.x.e.id}">stats</button>` : ''}</li>`).join('')}</ul></dd></div>`;
          }
          const v = String(x.e.f[k]);
          const wide = v.length > 60 || v.includes('\n');
          return `<div class="gd-row ${wide ? 'wide' : ''}"><dt>${esc(label)}</dt><dd>${esc(v).replace(/\n/g, '<br>')}</dd></div>`;
        }).join('');
      const canFight = x.t.combat;
      return `<div class="gd-card" style="--c:${x.t.color}">
        <dl class="gd-fields">${rows || '<p class="muted small">Nothing written here yet.</p>'}</dl>
        <div class="gd-actions">
          ${knownBtn(x)}
          ${canFight ? `<button class="btn btn-small" data-fight="${x.e.id}">${x.t.combat === 'creatures' ? 'Add creatures to combat' : 'Add to combat'}</button>` : ''}
          <button class="link-btn" data-jump="${x.sec.id}|${x.e.id}">Edit in the notebook</button>
        </div>
      </div>`;
    }

    function rowHTML(x, key) {
      const isOpen = openCard === key;
      const summary = x.t.summary.map(k => x.e.f[k]).filter(Boolean).join(', ');
      return `<div class="gk-item ${isOpen ? 'open' : ''}" style="--c:${x.t.color}">
        <button class="gk-head" data-open="${esc(key)}" aria-expanded="${isOpen}">
          <span class="chev" aria-hidden="true"></span><span class="gk-name">${esc(x.e.f.name || `Unnamed ${x.t.one}`)}</span>
          <span class="gk-meta">${esc(summary)}</span><span class="gk-vis ${x.e.known ? 'known' : ''}">${x.e.known ? 'Known' : 'Hidden'}</span>
        </button>
        ${isOpen ? detailHTML(x) : ''}
      </div>`;
    }

    function overviewHTML(m) {
      const ov = m.overview[0];
      const first = s => parsePlan(s.e.f.plan).goal || parsePlan(s.e.f.plan).beats[0] || s.e.f.summary || '';
      const quests = m.all.filter(x => x.sec.type === 'quests');
      const sessionsOf = x => (x.e.tags || []).map(t => (/^session\s+(\d+)$/i.exec(t) || [])[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
      const played = m.sessions.filter(s => s.e.played).length;
      const nextIdx = m.sessions.findIndex(s => !s.e.played);
      return `<header class="guide-head">
          <div><span class="guide-kicker">Overview</span><h2>${esc(cp.name || 'Untitled campaign')}</h2>
          ${cp.pitch ? `<p class="lede">${esc(cp.pitch)}</p>` : ''}</div>
          <button class="icon-btn guide-x" data-act="close" aria-label="Close the guide">×</button>
        </header>
        <div class="guide-stats">
          <span><b>${m.sessions.length}</b> sessions</span>
          ${m.sessions[0] && m.sessions[0].e.f.level ? `<span>Levels <b>${esc(String(m.sessions[0].e.f.level).split(/\s+to\s+/)[0])}</b> to <b>${esc(String(m.sessions[m.sessions.length - 1].e.f.level).split(/\s+to\s+/).pop())}</b></span>` : ''}
          <span><b>${played}</b> played</span>
          <span>Room code <b>${esc(cp.roomCode || '')}</b></span>
        </div>
        ${ov ? `<section class="guide-sec"><h3>${esc(ov.f.name || 'Campaign overview')}</h3>
          ${['plan', 'summary', 'prep'].filter(k => ov.f[k]).map(k => `<p>${esc(ov.f[k]).replace(/\n/g, '<br>')}</p>`).join('')}</section>` : ''}
        <section class="guide-sec"><h3>Timeline</h3>
          <ol class="guide-timeline">${m.sessions.map((s, i) => `<li class="${s.e.played ? 'played' : ''}">
            <button class="gt-item" data-go="${i + 1}"><span class="gt-num">${s.e.played ? '✓' : s.n}</span>
              <span class="gt-body"><b>${esc(titleOf(s.e))}</b>${s.e.f.level ? ` <small>Level ${esc(s.e.f.level)}</small>` : ''}<span>${esc(first(s))}</span></span></button></li>`).join('')}</ol>
        </section>
        ${quests.length ? `<section class="guide-sec"><h3>Quest arc</h3><ul class="guide-quests">${quests.map(x => {
          const ss = sessionsOf(x);
          return `<li><span class="gq-span">${ss.length ? (ss.length > 1 ? `Sessions ${ss[0]}–${ss[ss.length - 1]}` : `Session ${ss[0]}`) : 'Any time'}</span>
            <b>${esc(x.e.f.name || 'Quest')}</b>${x.e.f.giver ? ` <span class="muted">from ${esc(x.e.f.giver)}</span>` : ''}${x.e.f.status ? ` <span class="badge" data-tone="${esc(String(x.e.f.status).toLowerCase().replace(/\s+/g, '-'))}">${esc(x.e.f.status)}</span>` : ''}</li>`;
        }).join('')}</ul></section>` : ''}
        <section class="guide-sec guide-tips"><h3>How to use this guide</h3>
          <p>Each session lists its steps in order. Names in a step open right there: tap one for the full details, reveal it to your players, or add its creatures to the combat tracker. Under the steps is everything the session uses. Mark a session played when you're done, and the guide reopens where you left off.</p></section>
        <footer class="guide-foot"><span></span>
          <button class="btn btn-primary btn-lg" data-go="${nextIdx >= 0 ? nextIdx + 1 : 1}">${nextIdx > 0 ? `Continue with Session ${m.sessions[nextIdx].n}` : 'Start with Session 1'} →</button></footer>`;
    }

    function sessionHTML(m) {
      const s = m.sessions[step - 1];
      const e = s.e;
      const kit = taggedFor(m, s.n);
      const plan = parsePlan(e.f.plan);
      const pool = m.all;
      const beats = plan.beats.map((text, i) => {
        const ms = mentions(text, pool);
        const openHere = ms.find(x => openCard === `b${i}:${x.e.id}`);
        return `<li class="gb">
          <div class="gb-text">${esc(text)}</div>
          ${ms.length ? `<div class="gb-chips">${ms.map(x => `<button class="g-chip ${openCard === `b${i}:${x.e.id}` ? 'on' : ''}" style="--c:${x.t.color}" data-open="b${i}:${x.e.id}" aria-expanded="${openCard === `b${i}:${x.e.id}`}"><span class="g-chip-kind">${esc(x.t.one)}</span>${esc(x.e.f.name)}</button>`).join('')}</div>` : ''}
          ${openHere ? `<div class="gb-detail"><h4>${esc(openHere.e.f.name)}</h4>${detailHTML(openHere)}</div>` : ''}
        </li>`;
      }).join('');
      const groups = GROUPS.map(([label, types]) => {
        const items = kit.filter(x => types.includes(x.sec.type));
        if (!items.length) return '';
        return `<div class="gk-group"><h4>${esc(label)} <span class="count">${items.length}</span></h4>${items.map(x => rowHTML(x, `k:${x.e.id}`)).join('')}</div>`;
      }).join('');
      const prev = m.sessions[step - 2];
      const next = m.sessions[step];
      return `<header class="guide-head">
          <div><span class="guide-kicker">Session ${s.n} of ${m.sessions.length}${e.f.level ? ` · Party level ${esc(e.f.level)}` : ''}</span>
            <h2>${esc(titleOf(e))}</h2>
            ${plan.goal ? `<p class="guide-goal"><b>Goal:</b> ${esc(plan.goal)}</p>` : ''}</div>
          <button class="icon-btn guide-x" data-act="close" aria-label="Close the guide">×</button>
        </header>
        ${beats ? `<section class="guide-sec"><h3>Run it in this order</h3><ol class="guide-beats">${beats}</ol></section>`
          : `<section class="guide-sec"><p class="muted">No plan written for this session yet. Add one under "Plan and key scenes" in the notebook, one step per line ("1. …").</p></section>`}
        ${groups ? `<section class="guide-sec"><h3>What this session uses</h3><div class="guide-kit">${groups}</div></section>`
          : `<section class="guide-sec"><p class="muted">Nothing is tagged "Session ${s.n}" yet. Tag NPCs, places and encounters in the notebook to see them here.</p></section>`}
        ${e.f.prep ? `<section class="guide-sec guide-prep"><h3>Prep and rewards</h3><p>${esc(e.f.prep).replace(/\n/g, '<br>')}</p></section>` : ''}
        <section class="guide-sec"><h3>After the session</h3>
          <label class="field"><span>What happened (notes for next time)</span><textarea data-summary rows="3" placeholder="What the party did, who they met, loose ends…">${esc(e.f.summary || '')}</textarea></label>
          <label class="guide-played"><input type="checkbox" data-played ${e.played ? 'checked' : ''}> Session played${e.f.date ? ` <span class="muted">(${esc(e.f.date)})</span>` : ''}</label>
        </section>
        <footer class="guide-foot">
          <button class="btn" data-go="${step - 1}">← ${prev ? `Session ${prev.n}` : 'Overview'}</button>
          ${next ? `<button class="btn btn-primary" data-go="${step + 1}">Session ${next.n}: ${esc(titleOf(next.e))} →</button>` : '<span class="muted">End of the campaign</span>'}
        </footer>`;
    }

    function render() {
      const m = model(cp);
      if (step > m.sessions.length) step = m.sessions.length;
      side.innerHTML = sideHTML(m);
      main.innerHTML = step === 0 ? overviewHTML(m) : sessionHTML(m);
      main.querySelectorAll('textarea').forEach(t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; });
    }

    const findById = id => model(cp).all.find(x => x.e.id === id);

    host.addEventListener('click', e => {
      if (e.target === host) return close();
      const b = e.target.closest('button, [data-go]');
      if (!b) return;
      if (b.dataset.act === 'close') return close();
      if (b.dataset.go !== undefined) return go(Number(b.dataset.go));
      if (b.dataset.open) {
        openCard = openCard === b.dataset.open ? '' : b.dataset.open;
        render();
        main.querySelector(`[data-open="${CSS.escape(b.dataset.open)}"]`)?.focus({ preventScroll: true });
        return;
      }
      if (b.dataset.card) {
        // "stats" link inside an encounter: open that creature's card in the list below.
        openCard = `k:${b.dataset.card}`;
        render();
        main.querySelector(`[data-open="k:${CSS.escape(b.dataset.card)}"]`)?.scrollIntoView({ block: 'center', behavior: Util.reducedMotion() ? 'auto' : 'smooth' });
        return;
      }
      if (b.dataset.known) {
        const x = findById(b.dataset.known);
        if (!x) return;
        x.e.known = !x.e.known;
        save(); render();
        main.querySelector(`[data-known="${CSS.escape(x.e.id)}"]`)?.focus({ preventScroll: true });
        return Util.toast(x.e.known ? `${x.e.f.name} is now known to your players.` : `${x.e.f.name} is hidden again.`);
      }
      if (b.dataset.fight) {
        const x = findById(b.dataset.fight);
        if (!x) return;
        if (x.t.combat === 'single') {
          Combat.add({ name: x.e.f.name || x.t.one, kind: 'enemy', hp: Number(x.e.f.hp) || 10, ac: Number(x.e.f.ac) || 12 }, cp.id);
          return Util.toast(`${x.e.f.name} added to combat in the Party room.`);
        }
        const list = creatureLines(x.e.f.creatures);
        if (!list.length) return Util.toast('This encounter has no creatures listed yet.', 'error');
        let total = 0;
        list.forEach(c => {
          const n = Util.clamp(c.count, 1, 20);
          for (let i = 1; i <= n; i++) Combat.add({ name: n > 1 ? `${c.name} ${i}` : c.name, kind: 'enemy', hp: c.stats ? c.stats.hp : 10, ac: c.stats ? c.stats.ac : 12 }, cp.id);
          total += n;
        });
        return Util.toast(`${total} creature${total > 1 ? 's' : ''} added to combat in the Party room.`);
      }
      if (b.dataset.jump) {
        const [secId, id] = b.dataset.jump.split('|');
        close();
        if (opts.onJump) opts.onJump(secId, id);
      }
    });
    host.addEventListener('change', e => {
      if (e.target.matches('[data-ref="jump"]')) return go(Number(e.target.value));
      if (e.target.matches('[data-played]')) {
        const s = model(cp).sessions[step - 1];
        s.e.played = e.target.checked;
        if (s.e.played && !s.e.f.date) s.e.f.date = new Date().toISOString().slice(0, 10);
        save(); render();
        if (s.e.played) Util.toast(`Session ${s.n} marked as played.`);
      }
    });
    host.addEventListener('input', e => {
      if (e.target.matches('[data-summary]')) {
        const s = model(cp).sessions[step - 1];
        s.e.f.summary = e.target.value;
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 2 + 'px';
        save();
      }
    });

    render();
    main.querySelector('[data-go], button')?.focus({ preventScroll: true });
  }

  return { open, has, parsePlan, mentions };
})();
