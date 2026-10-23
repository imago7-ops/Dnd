'use strict';

/* Initiative and combat tracker, shared by players and the DM. */
const Combat = (() => {
  const CONDITIONS = ['Blinded', 'Charmed', 'Concentrating', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'];
  const KINDS = { pc: 'Player', enemy: 'Enemy', ally: 'Ally' };

  // Each campaign has its own fight. The tracker on screen works on `targetId`.
  let targetId = null;
  const scratch = { round: 1, activeId: null, started: false, combatants: [] };
  const st = (id = targetId) => Campaign.combat(id) || scratch;

  function sortOrder(id) {
    st(id).combatants.sort((a, b) => (b.init - a.init) || (b.initBonus - a.initBonus) || a.name.localeCompare(b.name));
  }

  /* Add from anywhere (sheet, campaign notebook). */
  function add(c, campaignId) {
    const fight = st(campaignId || targetId);
    const cb = {
      id: Util.uid(),
      name: c.name || 'Unnamed',
      kind: c.kind || 'enemy',
      initBonus: Util.num(c.initBonus, 0),
      init: c.init ?? Dice.evaluate(`1d20${Util.num(c.initBonus, 0) >= 0 ? '+' : ''}${Util.num(c.initBonus, 0)}`).total,
      hp: Util.num(c.hp, 0),
      maxHp: Util.num(c.maxHp ?? c.hp, 0),
      ac: Util.num(c.ac, 10),
      conditions: [],
    };
    fight.combatants.push(cb);
    if (fight.started) {
      // Keep whoever is acting now as the active creature after re-sorting.
      sortOrder(campaignId || targetId);
    }
    Store.save();
    return cb;
  }

  function mount(el, opts = {}) {
    targetId = opts.campaignId || null;
    const isPlayer = Store.state.role === 'player' && !opts.embedded;
    const me = isPlayer ? Character.active() : null;

    el.innerHTML = `
      <div class="combat">
        <div class="combat-top">
          <div>
            ${opts.embedded ? '<h2>Combat tracker</h2>' : '<h1>Combat</h1>'}
            <p class="lede" data-ref="status"></p>
          </div>
          <div class="turn-controls" data-ref="turn"></div>
        </div>

        <form class="panel add-form" data-ref="form" autocomplete="off">
          <label class="field grow"><span>Name</span><input name="name" placeholder="Goblin" required></label>
          <label class="field narrow"><span>Count</span><input name="count" type="number" min="1" max="20" value="1"></label>
          <label class="field narrow"><span>Init bonus</span><input name="initBonus" type="number" value="0"></label>
          <label class="field narrow"><span>Initiative</span><input name="init" type="number" placeholder="Roll"></label>
          <label class="field narrow"><span>HP</span><input name="hp" type="number" min="0" value="7"></label>
          <label class="field narrow"><span>AC</span><input name="ac" type="number" min="0" value="12"></label>
          <label class="field"><span>Side</span>
            <select name="kind">
              <option value="enemy">Enemy</option>
              <option value="ally">Ally</option>
              <option value="pc">Player</option>
            </select>
          </label>
          <button class="btn btn-primary" type="submit">Add to combat</button>
        </form>
        ${me ? `<button class="btn add-me" data-action="add-me">Add ${Util.esc(me.name || 'my character')} to combat</button>` : ''}

        <div class="order" data-ref="list"></div>
      </div>`;

    const ref = n => el.querySelector(`[data-ref="${n}"]`);

    function render() {
      const s = st();
      const list = ref('list');
      const status = ref('status');
      const turn = ref('turn');

      if (!s.combatants.length) {
        status.textContent = 'Add everyone in the fight. Leave initiative blank and it rolls for you.';
        turn.innerHTML = '';
        list.innerHTML = `<div class="empty-state">
          <p>No one's in the fight yet.</p>
          <p class="muted">Add monsters, allies and players above. They'll be sorted by initiative when you start.</p>
        </div>`;
        return;
      }

      const activeIdx = s.combatants.findIndex(c => c.id === s.activeId);
      const current = s.combatants[activeIdx];
      status.textContent = s.started
        ? `Round ${s.round}${current ? `. ${current.name}'s turn.` : ''}`
        : `${s.combatants.length} in the fight. Start combat when everyone's in.`;

      turn.innerHTML = s.started ? `
          <span class="round-badge">Round <b>${s.round}</b></span>
          <button class="btn" data-action="prev">Previous</button>
          <button class="btn btn-primary" data-action="next">Next turn</button>
          <button class="btn btn-ghost-danger" data-action="end">End combat</button>`
        : `<button class="btn" data-action="clear">Clear all</button>
           <button class="btn btn-primary" data-action="start">Start combat</button>`;

      list.innerHTML = `
        <div class="order-head">
          <span>Init</span><span>Name</span><span>AC</span><span>Hit points</span><span>Conditions</span><span></span>
        </div>
        ${s.combatants.map(c => rowHTML(c, s.started && c.id === s.activeId)).join('')}`;
    }

    function rowHTML(c, isActive) {
      const pct = c.maxHp > 0 ? Util.clamp(c.hp / c.maxHp, 0, 1) * 100 : 0;
      const down = c.maxHp > 0 && c.hp <= 0;
      return `
        <div class="combatant ${isActive ? 'active' : ''} ${down ? 'down' : ''} kind-${c.kind}" data-id="${c.id}">
          <input class="init-input" type="number" data-field="init" value="${c.init}" aria-label="Initiative for ${Util.esc(c.name)}">
          <div class="cb-name">
            <input data-field="name" value="${Util.esc(c.name)}" aria-label="Name">
            <span class="kind-tag">${KINDS[c.kind]}${down ? ', down' : ''}</span>
          </div>
          <input class="ac-input" type="number" data-field="ac" value="${c.ac}" aria-label="Armor class">
          <div class="cb-hp">
            <div class="cb-hp-nums">
              <input type="number" data-field="hp" value="${c.hp}" aria-label="Current HP">
              <span>/</span>
              <input type="number" data-field="maxHp" value="${c.maxHp}" aria-label="Max HP">
            </div>
            <div class="hp-bar small"><div class="hp-fill" style="width:${pct}%" data-low="${pct <= 25}"></div></div>
            <div class="cb-hp-adjust">
              <input type="number" min="0" placeholder="0" data-ref="amt" aria-label="Damage or healing amount">
              <button class="chip-btn danger" data-action="dmg" title="Damage (Enter)">−</button>
              <button class="chip-btn heal" data-action="heal" title="Heal (Shift+Enter)">+</button>
            </div>
          </div>
          <div class="cb-conds">
            ${c.conditions.map(x => `<button class="cond" data-action="rm-cond" data-cond="${x}" title="Remove ${x}">${x} <span aria-hidden="true">×</span></button>`).join('')}
            <select data-action="add-cond" aria-label="Add condition">
              <option value="">Add condition</option>
              ${CONDITIONS.filter(x => !c.conditions.includes(x)).map(x => `<option>${x}</option>`).join('')}
            </select>
          </div>
          <button class="icon-btn" data-action="remove" aria-label="Remove ${Util.esc(c.name)}" title="Remove">×</button>
        </div>`;
    }

    function find(node) {
      const row = node.closest('[data-id]');
      return row && st().combatants.find(c => c.id === row.dataset.id);
    }

    function applyHP(c, row, kind) {
      const input = row.querySelector('[data-ref="amt"]');
      const amt = Math.abs(Util.num(input.value, 0));
      if (!amt) { input.focus(); return; }
      c.hp = kind === 'dmg' ? Math.max(0, c.hp - amt) : Math.min(c.maxHp || Infinity, c.hp + amt);
      Store.save();
      render();
    }

    function advance(dir) {
      const s = st();
      const n = s.combatants.length;
      if (!n) return;
      let i = s.combatants.findIndex(c => c.id === s.activeId);
      if (i < 0) i = 0;
      else {
        i += dir;
        if (i >= n) { i = 0; s.round++; }
        if (i < 0) { i = s.round > 1 ? n - 1 : 0; if (s.round > 1) s.round--; }
      }
      s.activeId = s.combatants[i].id;
      Store.save();
      render();
      el.querySelector('.combatant.active')?.scrollIntoView({ block: 'nearest', behavior: Util.reducedMotion() ? 'auto' : 'smooth' });
    }

    ref('form').addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = String(f.get('name')).trim();
      if (!name) return;
      const count = Util.clamp(Util.num(f.get('count'), 1), 1, 20);
      const initRaw = String(f.get('init')).trim();
      for (let i = 1; i <= count; i++) {
        add({
          name: count > 1 ? `${name} ${i}` : name,
          kind: f.get('kind'),
          initBonus: f.get('initBonus'),
          init: initRaw === '' ? undefined : Util.num(initRaw, 0),
          hp: f.get('hp'),
          ac: f.get('ac'),
        });
      }
      if (st().started) sortOrder();
      const fields = e.target.elements;
      fields.namedItem('name').value = '';
      fields.namedItem('init').value = '';
      fields.namedItem('count').value = 1;
      fields.namedItem('name').focus();
      render();
    });

    el.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const s = st();
      const c = find(btn);
      switch (btn.dataset.action) {
        case 'start':
          sortOrder();
          s.started = true; s.round = 1; s.activeId = s.combatants[0]?.id;
          Store.save(); render();
          break;
        case 'next': advance(1); break;
        case 'prev': advance(-1); break;
        case 'end':
          s.started = false; s.round = 1; s.activeId = null;
          Store.save(); render();
          Util.toast('Combat ended. Combatants kept so you can review HP.');
          break;
        case 'clear':
          s.combatants = []; Store.save(); render();
          break;
        case 'remove':
          if (s.activeId === c.id) {
            const i = s.combatants.indexOf(c);
            const next = s.combatants[i + 1] || s.combatants[0];
            s.activeId = next && next.id !== c.id ? next.id : null;
          }
          s.combatants = s.combatants.filter(x => x !== c);
          Store.save(); render();
          break;
        case 'dmg':
        case 'heal': applyHP(c, btn.closest('[data-id]'), btn.dataset.action); break;
        case 'rm-cond':
          c.conditions = c.conditions.filter(x => x !== btn.dataset.cond);
          Store.save(); render();
          break;
        case 'add-me': {
          const ch = Character.active();
          if (!ch) return;
          const r = Dice.roll(`1d20${Character.initBonus(ch) >= 0 ? '+' : ''}${Character.initBonus(ch)}`, `${ch.name || 'Character'} initiative`);
          add({ name: ch.name || 'My character', kind: 'pc', initBonus: Character.initBonus(ch), init: r ? r.total : 10, hp: ch.hp.current, maxHp: ch.hp.max, ac: ch.ac });
          render();
          break;
        }
      }
    });

    el.addEventListener('change', e => {
      const t = e.target;
      const c = find(t);
      if (!c) return;
      if (t.dataset.action === 'add-cond' && t.value) {
        c.conditions.push(t.value);
        Store.save(); render();
        return;
      }
      if (t.dataset.field) {
        const f = t.dataset.field;
        c[f] = f === 'name' ? t.value : Util.num(t.value, 0);
        if (f === 'init' && st().started) sortOrder();
        Store.save(); render();
      }
    });

    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.dataset.ref === 'amt') {
        e.preventDefault();
        const c = find(e.target);
        applyHP(c, e.target.closest('[data-id]'), e.shiftKey ? 'heal' : 'dmg');
      }
    });

    // Re-draw when the party room changes combat (a player rolled initiative, etc.).
    const onExternal = () => {
      if (!el.isConnected) { window.removeEventListener('codex:combat', onExternal); return; }
      if (el.contains(document.activeElement) && document.activeElement.matches('input, select')) return;
      render();
    };
    window.addEventListener('codex:combat', onExternal);

    render();
  }

  return { mount, add, sortOrder };
})();
