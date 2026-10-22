'use strict';

/* DM campaign canvas: an open table you fill with cards and drag around. */
const Campaign = (() => {
  const TYPES = {
    location:  { label: 'Location',  title: 'Name this place',     body: 'What does it look, sound and smell like? Who is here?' },
    npc:       { label: 'NPC',       title: 'Name this character', body: 'Wants, fears, secrets, how they talk…' },
    quest:     { label: 'Quest',     title: 'Name this quest',     body: 'Hook, goal, reward, what goes wrong…' },
    encounter: { label: 'Encounter', title: 'Name this encounter', body: 'Creatures, terrain, tactics, treasure…' },
    item:      { label: 'Item',      title: 'Name this item',      body: 'What it does, where it is, who wants it…' },
    note:      { label: 'Note',      title: 'Title',               body: 'Anything you want to remember.' },
  };
  const COMBAT_TYPES = new Set(['npc', 'encounter']);
  const MIN_Z = 0.3, MAX_Z = 2;

  function blank() {
    return { format: 'campaign-codex-campaign', version: 1, name: '', cards: [], view: { x: 0, y: 0, z: 1 } };
  }
  function campaign() {
    return (Store.state.campaign ||= blank());
  }

  function mount(el) {
    const cp = campaign();

    el.innerHTML = `
      <div class="canvas-page">
        <div class="canvas-bar">
          <input class="campaign-name" data-ref="name" value="${Util.esc(cp.name)}" placeholder="Untitled campaign" aria-label="Campaign name">
          <div class="bar-actions">
            <span class="zoom-read" data-ref="zoom">100%</span>
            <button class="btn" data-action="center" title="Back to the middle of the table">Recenter</button>
            <button class="btn" data-action="export">Download</button>
            <button class="btn" data-action="import">Upload</button>
          </div>
        </div>
        <div class="viewport" data-ref="vp" tabindex="-1">
          <div class="world" data-ref="world"></div>
          <div class="add-group" role="group" aria-label="Add a card">
            <span class="add-label">Add</span>
            ${Object.entries(TYPES).map(([k, t]) => `<button class="add-card type-${k}" data-add="${k}"><span class="swatch"></span>${t.label}</button>`).join('')}
          </div>
          <div class="canvas-empty" data-ref="empty">
            <h1>Your campaign starts here</h1>
            <p>Add your first place, character or quest from the bar below, or double-click anywhere on the table to drop a note.</p>
            <div class="empty-actions">
              <button class="btn btn-primary" data-add="location">Add a location</button>
              <button class="btn" data-add="npc">Add an NPC</button>
              <button class="btn" data-add="quest">Add a quest</button>
            </div>
            <p class="muted small">Drag empty space to move around. Scroll to zoom.</p>
          </div>
        </div>
      </div>`;

    const ref = n => el.querySelector(`[data-ref="${n}"]`);
    const vp = ref('vp');
    const world = ref('world');

    function applyView() {
      const { x, y, z } = cp.view;
      world.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
      vp.style.backgroundPosition = `${x}px ${y}px`;
      vp.style.backgroundSize = `${28 * z}px ${28 * z}px`;
      ref('zoom').textContent = Math.round(z * 100) + '%';
    }

    function cardHTML(card) {
      const t = TYPES[card.type] || TYPES.note;
      return `
        <article class="card type-${card.type}" data-card="${card.id}" style="left:${card.x}px;top:${card.y}px;width:${card.w}px">
          <div class="card-head" data-drag>
            <span class="card-type">${t.label}</span>
            <button class="icon-btn" data-action="delete" aria-label="Delete card" title="Delete">×</button>
          </div>
          <input class="card-title" data-field="title" value="${Util.esc(card.title)}" placeholder="${t.title}" aria-label="${t.label} name">
          <textarea class="card-body" data-field="body" placeholder="${t.body}" rows="3" aria-label="${t.label} details">${Util.esc(card.body)}</textarea>
          ${COMBAT_TYPES.has(card.type) ? `<button class="link-btn card-combat" data-action="to-combat">Add to combat</button>` : ''}
        </article>`;
    }

    function render() {
      world.innerHTML = cp.cards.map(cardHTML).join('');
      world.querySelectorAll('textarea').forEach(autoSize);
      ref('empty').hidden = cp.cards.length > 0;
      applyView();
    }

    function autoSize(t) {
      t.style.height = 'auto';
      t.style.height = t.scrollHeight + 2 + 'px';
    }

    /* Screen point -> world coordinates. */
    function toWorld(clientX, clientY) {
      const r = vp.getBoundingClientRect();
      return { x: (clientX - r.left - cp.view.x) / cp.view.z, y: (clientY - r.top - cp.view.y) / cp.view.z };
    }

    function addCard(type, at) {
      let pos = at;
      if (!pos) {
        const r = vp.getBoundingClientRect();
        pos = toWorld(r.left + r.width / 2, r.top + r.height / 2);
        pos.x -= 130; pos.y -= 80;
        pos = findFreeSpot(pos);
      }
      const card = { id: Util.uid(), type, title: '', body: '', x: Math.round(pos.x), y: Math.round(pos.y), w: 260 };
      cp.cards.push(card);
      Store.save();
      render();
      world.querySelector(`[data-card="${card.id}"] .card-title`)?.focus({ preventScroll: true });
    }

    /* Walk outward from the view centre until a card-sized gap is found. */
    function findFreeSpot(start) {
      const W = 280, H = 200;
      const rects = [...world.querySelectorAll('[data-card]')].map(n => ({
        x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight,
      }));
      const free = p => !rects.some(r => p.x < r.x + r.w + 16 && p.x + W > r.x - 16 && p.y < r.y + r.h + 16 && p.y + H - 40 > r.y - 16);
      const steps = [[0, 0]];
      for (let ring = 1; ring <= 4; ring++) {
        for (let dx = -ring; dx <= ring; dx++) {
          for (let dy = -ring; dy <= ring; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) steps.push([dx, dy]);
          }
        }
      }
      for (const [dx, dy] of steps) {
        const p = { x: start.x + dx * (W + 10), y: start.y + dy * (H + 10) };
        if (free(p)) return p;
      }
      return { x: start.x + 30, y: start.y + 30 };
    }

    function bringToFront(card) {
      const i = cp.cards.indexOf(card);
      if (i > -1 && i < cp.cards.length - 1) {
        cp.cards.splice(i, 1);
        cp.cards.push(card);
        const node = world.querySelector(`[data-card="${card.id}"]`);
        world.appendChild(node);
      }
    }

    // --- Dragging cards and panning the table ---
    let drag = null;
    vp.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const head = e.target.closest('[data-drag]');
      if (head && !e.target.closest('button')) {
        const node = head.closest('[data-card]');
        const card = cp.cards.find(c => c.id === node.dataset.card);
        bringToFront(card);
        drag = { kind: 'card', card, node, sx: e.clientX, sy: e.clientY, ox: card.x, oy: card.y };
        node.classList.add('dragging');
      } else if (e.target === vp || e.target === world) {
        drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: cp.view.x, oy: cp.view.y };
        vp.classList.add('panning');
      } else {
        return;
      }
      vp.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    vp.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (drag.kind === 'card') {
        drag.card.x = Math.round(drag.ox + dx / cp.view.z);
        drag.card.y = Math.round(drag.oy + dy / cp.view.z);
        drag.node.style.left = drag.card.x + 'px';
        drag.node.style.top = drag.card.y + 'px';
      } else {
        cp.view.x = drag.ox + dx;
        cp.view.y = drag.oy + dy;
        applyView();
      }
    });

    const endDrag = () => {
      if (!drag) return;
      drag.node?.classList.remove('dragging');
      vp.classList.remove('panning');
      drag = null;
      Store.save();
    };
    vp.addEventListener('pointerup', endDrag);
    vp.addEventListener('pointercancel', endDrag);

    vp.addEventListener('wheel', e => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const z0 = cp.view.z;
      const z1 = Util.clamp(z0 * Math.exp(-e.deltaY * 0.0015), MIN_Z, MAX_Z);
      cp.view.x = px - (px - cp.view.x) * (z1 / z0);
      cp.view.y = py - (py - cp.view.y) * (z1 / z0);
      cp.view.z = z1;
      applyView();
      Store.save();
    }, { passive: false });

    vp.addEventListener('dblclick', e => {
      if (e.target !== vp && e.target !== world) return;
      const p = toWorld(e.clientX, e.clientY);
      addCard('note', { x: p.x - 130, y: p.y - 24 });
    });

    // --- Editing ---
    world.addEventListener('input', e => {
      const t = e.target;
      const node = t.closest('[data-card]');
      if (!node || !t.dataset.field) return;
      const card = cp.cards.find(c => c.id === node.dataset.card);
      card[t.dataset.field] = t.value;
      if (t.tagName === 'TEXTAREA') autoSize(t);
      Store.save();
    });

    ref('name').addEventListener('input', e => {
      cp.name = e.target.value;
      Store.save();
    });

    el.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.add) return addCard(btn.dataset.add);
      const node = btn.closest('[data-card]');
      const card = node && cp.cards.find(c => c.id === node.dataset.card);
      switch (btn.dataset.action) {
        case 'delete': {
          const idx = cp.cards.indexOf(card);
          cp.cards.splice(idx, 1);
          Store.save();
          render();
          showUndo(card, idx);
          break;
        }
        case 'to-combat': {
          const name = card.title.trim() || TYPES[card.type].label;
          Combat.add({ name, kind: 'enemy', hp: 10, ac: 12 });
          Util.toast(`${name} added to combat. Set HP and AC on the Combat tab.`);
          break;
        }
        case 'center':
          cp.view = { x: 0, y: 0, z: 1 };
          if (cp.cards.length) {
            const r = vp.getBoundingClientRect();
            const xs = cp.cards.map(c => c.x), ys = cp.cards.map(c => c.y);
            const cx = (Math.min(...xs) + Math.max(...xs) + 260) / 2;
            const cy = (Math.min(...ys) + Math.max(...ys) + 160) / 2;
            cp.view.x = r.width / 2 - cx;
            cp.view.y = r.height / 2 - cy;
          }
          applyView();
          Store.save();
          break;
        case 'export':
          Util.download(`${Util.slug(cp.name || 'campaign')}.json`, cp);
          Util.toast('Campaign downloaded.');
          break;
        case 'import':
          Util.pickJSON().then(data => {
            if (!data || !Array.isArray(data.cards)) throw new Error('That file doesn\'t look like a Campaign Codex campaign.');
            Store.state.campaign = Object.assign(blank(), data);
            Store.save();
            mount(el);
            Util.toast(`Uploaded ${data.name || 'campaign'}.`);
          }).catch(err => Util.toast(err.message, 'error'));
          break;
      }
    });

    function showUndo(card, idx) {
      const box = document.getElementById('toasts');
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = `Card deleted. <button class="link-btn">Undo</button>`;
      t.querySelector('button').onclick = () => {
        cp.cards.splice(Math.min(idx, cp.cards.length), 0, card);
        Store.save();
        if (world.isConnected) render();
        t.remove();
      };
      box.appendChild(t);
      setTimeout(() => t.classList.add('out'), 4600);
      setTimeout(() => t.remove(), 5000);
    }

    render();
  }

  return { mount };
})();
