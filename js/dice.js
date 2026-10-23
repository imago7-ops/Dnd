'use strict';

/*
 * Dice engine + the dice tray that sits on the right of every page.
 * Notation: 1d20+5, 2d6+1d4-1, d%, 4d6kh3 (keep highest 3), 2d20kl1 (keep lowest 1).
 */
const Dice = (() => {
  const listeners = new Set();
  const HISTORY_MAX = 60;

  /* Fair random integer in 1..sides using the browser's crypto RNG. */
  function rand(sides) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / sides) * sides;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
    return (x % sides) + 1;
  }

  function parse(expr) {
    const s = String(expr).replace(/\s+/g, '').toLowerCase();
    if (!s) throw new Error('Type a roll like 2d6+3.');
    const re = /([+-])?(?:(\d*)d(\d+|%)(?:(kh|kl)(\d+))?|(\d+))/y;
    const terms = [];
    while (re.lastIndex < s.length) {
      const start = re.lastIndex;
      const m = re.exec(s);
      if (!m || m[0] === '' || (terms.length && !m[1])) {
        throw new Error(`Can't read "${expr}". Try something like 1d20+5.`);
      }
      if (start === 0 && m[1] === '+') { /* leading + is fine */ }
      const sign = m[1] === '-' ? -1 : 1;
      if (m[6] !== undefined) {
        terms.push({ type: 'flat', sign, value: +m[6] });
      } else {
        const count = m[2] === '' ? 1 : +m[2];
        const sides = m[3] === '%' ? 100 : +m[3];
        if (count < 1 || count > 100) throw new Error('Roll between 1 and 100 dice at a time.');
        if (sides < 2 || sides > 1000) throw new Error('Dice need between 2 and 1000 sides.');
        const keepN = m[5] ? Util.clamp(+m[5], 1, count) : null;
        terms.push({ type: 'dice', sign, count, sides, keep: m[4] || null, keepN });
      }
    }
    return terms;
  }

  /* Roll without recording it (used for bulk initiative). */
  function evaluate(expr, opts = {}) {
    const terms = parse(expr);
    let total = 0;
    let nat = null;
    let usedMode = null;
    const parts = [];

    terms.forEach(t => {
      if (t.type === 'flat') {
        total += t.sign * t.value;
        parts.push({ kind: 'flat', sign: t.sign, value: t.value });
        return;
      }
      let { count, sides, keep, keepN } = t;
      if (opts.mode && opts.mode !== 'normal' && sides === 20 && count === 1 && !keep && usedMode === null) {
        count = 2; keep = opts.mode === 'adv' ? 'kh' : 'kl'; keepN = 1; usedMode = opts.mode;
      }
      const dice = Array.from({ length: count }, (_, i) => ({ v: rand(sides), i, kept: true }));
      if (keep) {
        const order = [...dice].sort((a, b) => (keep === 'kh' ? b.v - a.v : a.v - b.v));
        const keepSet = new Set(order.slice(0, keepN).map(d => d.i));
        dice.forEach(d => { d.kept = keepSet.has(d.i); });
      }
      const kept = dice.filter(d => d.kept);
      const sum = kept.reduce((a, d) => a + d.v, 0);
      total += t.sign * sum;
      if (sides === 20 && kept.length === 1 && nat === null) nat = kept[0].v;
      parts.push({ kind: 'dice', sign: t.sign, count, sides, keep, keepN, dice });
    });

    return { total, parts, nat, mode: usedMode };
  }

  /* Roll, record to history and show it in the tray. */
  function roll(expr, label = '', opts = {}) {
    const mode = opts.mode ?? Store.state.diceMode;
    let res;
    try {
      res = evaluate(expr, { mode });
    } catch (e) {
      Util.toast(e.message, 'error');
      return null;
    }
    const entry = {
      id: Util.uid(),
      expr: String(expr).replace(/\s+/g, ''),
      label,
      total: res.total,
      parts: res.parts,
      nat: res.nat,
      mode: res.mode,
      time: Date.now(),
    };
    // Advantage/disadvantage is a one-roll toggle.
    if (res.mode) Store.state.diceMode = 'normal';
    Store.state.rolls.unshift(entry);
    Store.state.rolls.length = Math.min(Store.state.rolls.length, HISTORY_MAX);
    Store.save();
    listeners.forEach(fn => fn(entry));
    return entry;
  }

  function breakdownHTML(entry) {
    return entry.parts.map((p, idx) => {
      const sign = p.sign < 0 ? '− ' : (idx ? '+ ' : '');
      if (p.kind === 'flat') return `<span class="bd-flat">${sign}${p.value}</span>`;
      const faces = p.dice.map(d => {
        const cls = ['bd-die'];
        if (!d.kept) cls.push('dropped');
        if (d.kept && p.sides === 20 && d.v === 20) cls.push('crit');
        if (d.kept && p.sides === 20 && d.v === 1) cls.push('fumble');
        return `<span class="${cls.join(' ')}">${d.v}</span>`;
      }).join('');
      const name = `${p.count}d${p.sides}${p.keep ? p.keep + p.keepN : ''}`;
      return `<span class="bd-group">${sign}<span class="bd-name">${name}</span>${faces}</span>`;
    }).join(' ');
  }

  function modeNote(entry) {
    if (entry.mode === 'adv') return 'with advantage';
    if (entry.mode === 'dis') return 'with disadvantage';
    return '';
  }

  /* ---------- Tray UI ---------- */
  const D20_SVG = `<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,4 91,27 91,73 50,96 9,73 9,27"/><polygon points="50,26 77,70 23,70"/><path d="M9 27L50 26M50 4L50 26M91 27L50 26M91 27L77 70M91 73L77 70M50 96L77 70M50 96L23 70M9 73L23 70M9 27L23 70"/></svg>`;
  const DICE = [4, 6, 8, 10, 12, 20, 100];

  function mount(el) {
    el.innerHTML = `
      <section class="tray" aria-label="Dice">
        <div class="tray-result" data-ref="result">
          <div class="tray-die">${D20_SVG}</div>
          <div class="tray-label" data-ref="label">Roll something</div>
          <div class="tray-total" data-ref="total" aria-live="polite">–</div>
          <div class="tray-break" data-ref="break">Click a die, or any number on your sheet.</div>
        </div>

        <div class="tray-mode" role="radiogroup" aria-label="Next d20 roll">
          <button role="radio" data-mode="dis">Disadvantage</button>
          <button role="radio" data-mode="normal">Normal</button>
          <button role="radio" data-mode="adv">Advantage</button>
        </div>

        <div class="dice-grid">
          ${DICE.map(s => `<button class="die-btn" data-die="${s}" title="Roll 1d${s}">d${s}</button>`).join('')}
        </div>

        <form class="tray-custom" data-ref="form">
          <input type="text" data-ref="expr" placeholder="Custom roll, e.g. 2d6+3" aria-label="Custom roll" autocomplete="off" spellcheck="false">
          <button class="btn btn-primary" type="submit">Roll</button>
        </form>

        <div class="tray-history">
          <div class="tray-history-head">
            <h2>History</h2>
            <button class="link-btn" data-action="clear">Clear</button>
          </div>
          <ol data-ref="list"></ol>
        </div>
      </section>`;

    const ref = n => el.querySelector(`[data-ref="${n}"]`);

    function renderMode() {
      el.querySelectorAll('[data-mode]').forEach(b => {
        const on = b.dataset.mode === Store.state.diceMode;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', on);
      });
    }

    function renderHistory() {
      const list = ref('list');
      const rolls = Store.state.rolls;
      if (!rolls.length) {
        list.innerHTML = `<li class="empty">Your rolls will show up here.</li>`;
        return;
      }
      list.innerHTML = rolls.map(r => `
        <li>
          <button class="hist-item" data-reroll="${r.id}" title="Roll again">
            <span class="hist-main">
              <span class="hist-label">${Util.esc(r.label || r.expr)}</span>
              <span class="hist-expr">${Util.esc(r.expr)} ${modeNote(r)}</span>
            </span>
            <span class="hist-total ${r.nat === 20 ? 'crit' : r.nat === 1 ? 'fumble' : ''}">${r.total}</span>
          </button>
        </li>`).join('');
    }

    function show(entry, animate) {
      const totalEl = ref('total');
      const result = ref('result');
      ref('label').textContent = [entry.label || entry.expr, modeNote(entry)].filter(Boolean).join(' ');
      ref('break').innerHTML = breakdownHTML(entry);
      result.classList.toggle('is-crit', entry.nat === 20);
      result.classList.toggle('is-fumble', entry.nat === 1);

      if (!animate || Util.reducedMotion()) {
        totalEl.textContent = entry.total;
        return;
      }
      // A quick tumble through random numbers before landing.
      result.classList.remove('rolling');
      void result.offsetWidth;
      result.classList.add('rolling');
      const max = Math.max(20, Math.abs(entry.total) + 6);
      let ticks = 0;
      clearInterval(show.timer);
      show.timer = setInterval(() => {
        ticks++;
        if (ticks >= 9) {
          clearInterval(show.timer);
          totalEl.textContent = entry.total;
          result.classList.remove('rolling');
        } else {
          totalEl.textContent = 1 + Math.floor(Math.random() * max);
        }
      }, 38);
    }

    el.addEventListener('click', e => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.mode) {
        Store.state.diceMode = t.dataset.mode;
        Store.save();
        renderMode();
      } else if (t.dataset.die) {
        roll(`1d${t.dataset.die}`, `d${t.dataset.die}`, { mode: t.dataset.die === '20' ? Store.state.diceMode : 'normal' });
      } else if (t.dataset.reroll) {
        const r = Store.state.rolls.find(x => x.id === t.dataset.reroll);
        if (r) roll(r.expr.replace(/2d20k[hl]1/, '1d20'), r.label);
      } else if (t.dataset.action === 'clear') {
        Store.state.rolls = [];
        Store.save();
        renderHistory();
      }
    });

    ref('form').addEventListener('submit', e => {
      e.preventDefault();
      const input = ref('expr');
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      if (roll(v, '')) input.select();
    });

    const onRoll = entry => {
      if (!el.isConnected) { listeners.delete(onRoll); return; }
      if (entry.remote) return;
      show(entry, true);
      renderHistory();
      renderMode();
    };
    listeners.add(onRoll);

    renderMode();
    renderHistory();
    if (Store.state.rolls[0]) show(Store.state.rolls[0], false);
  }

  /* Get told about every recorded roll (used by the party room). */
  function listen(fn) { listeners.add(fn); }

  return { roll, evaluate, parse, mount, listen, breakdownHTML, D20_SVG };
})();
