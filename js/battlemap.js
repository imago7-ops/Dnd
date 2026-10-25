'use strict';

/*
 * Battle map for the party room.
 *
 * Maps belong to a campaign (campaign.maps) and save and sync with it. The DM's browser is in charge:
 * it draws and edits the map, and Room sends players a filtered copy that leaves out everything under
 * fog of war. Hidden squares, the parts of an uploaded picture under them, and tokens standing in
 * them never leave the DM's browser. Players send requests ("move my token", "ping") that the DM's
 * browser checks and applies.
 *
 * Coordinates are in squares: square (x, y) covers x..x+1, y..y+1. A token at (x, y) with size n
 * covers n by n squares starting there.
 */
const Battlemap = (() => {
  const esc = Util.esc;
  const MAX_DIM = 100;
  const DOC_LIMIT = 340000;          // bytes, compressed; the account server takes up to 350 KB per campaign
  const IMG_MAX_SIDE = 2000;
  const IMG_MAX_BYTES = 230000;
  const TILE = 512;                  // players get the picture in tiles of this many image pixels

  /* ---------- Terrain ---------- */
  // One character per square. '.' empty, f floor, w wall, d door, 1-9 colors. Difficult terrain is a separate layer.
  const COLORS = {
    1: ['Water', '#2d5e85'], 2: ['Grass', '#3b6a36'], 3: ['Dirt and sand', '#94784b'], 4: ['Lava and fire', '#a8432c'],
    5: ['Ice', '#7fb0c0'], 6: ['Wood', '#6a4a2e'], 7: ['Stone', '#5d6170'], 8: ['Magic', '#6a4b8c'], 9: ['Blood', '#7a2730'],
  };
  const BRUSHES = [
    ['f', 'Floor', '#343a4b'], ['w', 'Wall', '#0c0e14'], ['d', 'Door', '#7a5532'], ['x', 'Difficult terrain', 'hatch'],
    ...Object.entries(COLORS).map(([k, [n, c]]) => [k, n, c]),
    ['.', 'Eraser', 'erase'],
  ];
  const KIND_COLOR = { pc: '#5cbfae', ally: '#7ea6e8', enemy: '#dd6352', npc: '#e3b654' };
  const KIND_NAME = { pc: 'Player character', ally: 'Ally', enemy: 'Enemy', npc: 'NPC' };
  const SIZES = [[1, 'Medium or smaller (1 square)'], [2, 'Large (2×2)'], [3, 'Huge (3×3)'], [4, 'Gargantuan (4×4)']];

  const clip = (v, n) => String(v ?? '').slice(0, n);
  const fill = (n, ch) => ch.repeat(Math.max(0, n));
  const fixStr = (s, n, ch, ok) => {
    s = typeof s === 'string' ? s : '';
    if (ok) s = s.replace(new RegExp(`[^${ok}]`, 'g'), ch);
    return s.length === n ? s : (s + fill(n, ch)).slice(0, n);
  };
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }

  /* ---------- Model ---------- */
  function newMap(name, cols = 30, rows = 20) {
    const n = cols * rows;
    return {
      id: Util.uid(), name: name || 'New map', cols, rows, ft: 5, grid: true,
      terrain: fill(n, '.'), diff: fill(n, '0'),
      fog: { on: true, rev: fill(n, '0') },
      image: null, tokens: [],
    };
  }

  function normalize(m) {
    m.cols = Util.clamp(Util.num(m.cols, 30), 2, MAX_DIM);
    m.rows = Util.clamp(Util.num(m.rows, 20), 2, MAX_DIM);
    const n = m.cols * m.rows;
    m.name = clip(m.name || 'Map', 60);
    m.ft = Util.clamp(Util.num(m.ft, 5), 1, 100);
    m.grid = m.grid !== false;
    m.terrain = fixStr(m.terrain, n, '.', '.fwd1-9');
    m.diff = fixStr(m.diff, n, '0', '01');
    if (!m.fog || typeof m.fog !== 'object') m.fog = { on: true, rev: '' };
    m.fog.on = m.fog.on !== false;
    m.fog.rev = fixStr(m.fog.rev, n, '0', '01');
    if (!Array.isArray(m.tokens)) m.tokens = [];
    if (m.notes != null) m.notes = clip(m.notes, 1000);
    if (Array.isArray(m.starts)) m.starts = m.starts.filter(p => p && p.x >= 0 && p.y >= 0 && p.x < m.cols && p.y < m.rows).slice(0, 12);
    if (m.image && (!m.image.data || !m.image.w)) m.image = null;
    return m;
  }

  function mapsOf(cp) {
    if (!cp) return [];
    if (!Array.isArray(cp.maps)) cp.maps = [];
    cp.maps.forEach(normalize);
    return cp.maps;
  }
  function shownMap(cp) {
    if (!cp || !cp.shownMapId) return null;
    return mapsOf(cp).find(m => m.id === cp.shownMapId) || null;
  }

  /* Change the number of squares, keeping everything where it is. */
  function resize(m, cols, rows) {
    cols = Util.clamp(cols, 2, MAX_DIM); rows = Util.clamp(rows, 2, MAX_DIM);
    if (cols === m.cols && rows === m.rows) return;
    const remap = (str, ch) => {
      let out = '';
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) out += x < m.cols && y < m.rows ? str[y * m.cols + x] : ch;
      return out;
    };
    m.terrain = remap(m.terrain, '.'); m.diff = remap(m.diff, '0'); m.fog.rev = remap(m.fog.rev, '0');
    m.cols = cols; m.rows = rows;
    m.tokens.forEach(t => { t.x = Util.clamp(t.x, 0, cols - t.size); t.y = Util.clamp(t.y, 0, rows - t.size); });
  }

  /* Where the picture sits, in squares. s = square size in image pixels, ox/oy = where a grid line falls. */
  function geom(im) {
    const x0 = (im.ox > 0.01 ? 1 : 0) - im.ox / im.s;
    const y0 = (im.oy > 0.01 ? 1 : 0) - im.oy / im.s;
    return { x0, y0, gw: im.w / im.s, gh: im.h / im.s };
  }
  function fitToImage(m) {
    const im = m.image;
    im.s = Math.max(Number(im.s) || 70, Math.max(im.w, im.h) / (MAX_DIM - 1), 4);
    im.ox = ((Number(im.ox) || 0) % im.s + im.s) % im.s;
    im.oy = ((Number(im.oy) || 0) % im.s + im.s) % im.s;
    const g = geom(im);
    resize(m, Math.ceil(g.x0 + g.gw - 1e-6), Math.ceil(g.y0 + g.gh - 1e-6));
  }

  const visOf = m => (m.fog.on ? m.fog.rev : fill(m.cols * m.rows, '1'));
  function tokenSeen(m, t, vis) {
    if (t.hidden) return false;
    for (let y = t.y; y < t.y + t.size; y++) for (let x = t.x; x < t.x + t.size; x++) {
      if (x >= 0 && y >= 0 && x < m.cols && y < m.rows && vis[y * m.cols + x] === '1') return true;
    }
    return false;
  }

  /* Tokens placed by name (premade maps, or typed in) join up with the combat tracker's creature of
     the same name ("Goblin 2") once it's added to combat. */
  function linkByName(m, fight) {
    if (!m || !fight || !fight.combatants.length) return;
    const live = id => id && fight.combatants.some(c => c.id === id);
    const used = new Set(m.tokens.map(t => t.cb).filter(live));
    m.tokens.forEach(t => {
      if (t.owner || live(t.cb)) return;
      const n = String(t.name || '').trim().toLowerCase();
      const cb = n && fight.combatants.find(c => !used.has(c.id) && !c.playerKey && String(c.name).trim().toLowerCase() === n);
      if (cb) { t.cb = cb.id; used.add(cb.id); }
    });
  }

  function cbFor(t, fight) {
    if (!fight) return null;
    return (t.cb && fight.combatants.find(c => c.id === t.cb)) || (t.owner && fight.combatants.find(c => c.playerKey && c.playerKey === t.owner)) || null;
  }

  function tokenView(t, fight, forPlayers) {
    const cb = cbFor(t, fight);
    const pct = cb && cb.maxHp > 0 ? Util.clamp(cb.hp / cb.maxHp, 0, 1) : null;
    const kind = KIND_COLOR[t.kind] ? t.kind : 'enemy';
    const v = {
      id: t.id, x: t.x, y: t.y, size: t.size, name: clip(cb ? cb.name : t.name, 40) || 'Token', kind,
      color: /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : KIND_COLOR[kind],
      active: Boolean(cb && fight.started && fight.activeId === cb.id),
      down: Boolean(cb && cb.maxHp > 0 && cb.hp <= 0),
      bloodied: pct !== null && pct <= 0.5 && pct > 0,
      hp: forPlayers && kind !== 'pc' ? null : pct,
    };
    if (!forPlayers) { v.hidden = Boolean(t.hidden); v.linked = Boolean(cb); v.owner = t.owner || null; }
    return v;
  }

  /* ---------- What players get (computed by the DM's browser) ---------- */
  const tileJobs = new Map();   // tile key -> what to draw
  const tileCache = new Map();  // tile key -> data URL
  const imgCache = new Map();   // data URL hash -> Promise<HTMLImageElement>

  function loadImage(src) {
    const k = hash(src.slice(0, 2000)) + src.length;
    if (!imgCache.has(k)) {
      if (imgCache.size > 12) imgCache.clear();
      imgCache.set(k, new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('image'));
        img.src = src;
      }));
    }
    return imgCache.get(k);
  }

  /* Squares (cols c0..c1, rows r0..r1) that touch a rectangle of the picture. */
  function cellsUnder(m, g, px, py, pw, ph) {
    const s = m.image.s;
    return {
      c0: Math.max(0, Math.floor(g.x0 + px / s)), c1: Math.min(m.cols - 1, Math.floor(g.x0 + (px + pw) / s - 1e-9)),
      r0: Math.max(0, Math.floor(g.y0 + py / s)), r1: Math.min(m.rows - 1, Math.floor(g.y0 + (py + ph) / s - 1e-9)),
    };
  }

  const EMPTY_VIEW = { base: null, baseKey: 'none', tokens: [], tokKey: 'none', tiles: [], mineFor: () => [] };

  function hostView(campaignId) {
    const cp = Campaign.byId(campaignId);
    const m = shownMap(cp);
    if (!m) return EMPTY_VIEW;
    const vis = visOf(m);
    let terrain = '', diff = '';
    for (let i = 0; i < vis.length; i++) {
      const seen = vis[i] === '1';
      terrain += seen ? m.terrain[i] : '.';
      diff += seen ? m.diff[i] : '0';
    }
    let image = null;
    const tiles = [];
    if (m.image) {
      const im = m.image, g = geom(im), ih = hash(im.data) + im.data.length;
      const nx = Math.ceil(im.w / TILE), ny = Math.ceil(im.h / TILE);
      for (let ty = 0; ty < ny; ty++) for (let tx = 0; tx < nx; tx++) {
        const px = tx * TILE, py = ty * TILE, pw = Math.min(TILE, im.w - px), ph = Math.min(TILE, im.h - py);
        const r = cellsUnder(m, g, px, py, pw, ph);
        let bits = '';
        for (let y = r.r0; y <= r.r1; y++) bits += vis.slice(y * m.cols + r.c0, y * m.cols + r.c1 + 1);
        if (!bits.includes('1')) continue; // nothing of this tile can be seen: it is never sent
        const key = `${m.id}.${ih}.${im.s}.${im.ox}.${im.oy}.${tx}.${ty}.${hash(bits)}`;
        tiles.push({ key, x: px, y: py, w: pw, h: ph });
        if (!tileJobs.has(key)) {
          if (tileJobs.size > 2000) tileJobs.clear();
          tileJobs.set(key, { campaignId, mapId: m.id, px, py, pw, ph });
        }
      }
      image = { w: im.w, h: im.h, s: im.s, ox: im.ox, oy: im.oy, tiles };
    }
    linkByName(m, Campaign.combat(campaignId));
    const base = { id: m.id, name: m.name, cols: m.cols, rows: m.rows, ft: m.ft, grid: m.grid, terrain, diff, vis, image };
    const fight = Campaign.combat(campaignId);
    const shown = m.tokens.filter(t => tokenSeen(m, t, vis));
    const tokens = shown.map(t => tokenView(t, fight, true));
    return {
      base, baseKey: hash(JSON.stringify(base)),
      tokens, tokKey: hash(JSON.stringify(tokens)),
      tiles,
      mineFor: key => (key ? shown.filter(t => t.owner === key).map(t => t.id) : []),
    };
  }

  /* Draw one tile of the picture with every hidden square painted over, then encode it. */
  async function tileData(key) {
    if (tileCache.has(key)) return tileCache.get(key);
    const job = tileJobs.get(key);
    if (!job) return null;
    const m = mapsOf(Campaign.byId(job.campaignId)).find(x => x.id === job.mapId);
    if (!m || !m.image) return null;
    const img = await loadImage(m.image.data);
    const cv = document.createElement('canvas');
    cv.width = job.pw; cv.height = job.ph;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, job.px, job.py, job.pw, job.ph, 0, 0, job.pw, job.ph);
    const g = geom(m.image), s = m.image.s, vis = visOf(m);
    const r = cellsUnder(m, g, job.px, job.py, job.pw, job.ph);
    ctx.fillStyle = '#000';
    for (let y = r.r0; y <= r.r1; y++) for (let x = r.c0; x <= r.c1; x++) {
      if (vis[y * m.cols + x] === '1') continue;
      const ax = Math.floor((x - g.x0) * s - job.px) - 1, ay = Math.floor((y - g.y0) * s - job.py) - 1;
      const bx = Math.ceil((x + 1 - g.x0) * s - job.px) + 1, by = Math.ceil((y + 1 - g.y0) * s - job.py) + 1;
      ctx.fillRect(ax, ay, bx - ax, by - ay);
    }
    const data = encode(cv, 0.8);
    if (tileCache.size > 300) tileCache.clear();
    tileCache.set(key, data);
    return data;
  }

  let webpOK = null;
  function encode(cv, q) {
    if (webpOK === null) {
      const t = document.createElement('canvas'); t.width = t.height = 2;
      webpOK = t.toDataURL('image/webp').startsWith('data:image/webp');
    }
    return cv.toDataURL(webpOK ? 'image/webp' : 'image/jpeg', q);
  }

  /* Combatants whose token is on the shown map but out of the players' sight. */
  function hiddenCombatants(campaignId) {
    const out = new Set();
    const cp = Campaign.byId(campaignId);
    const m = shownMap(cp);
    if (!m) return out;
    const fight = Campaign.combat(campaignId);
    linkByName(m, fight);
    const vis = visOf(m);
    m.tokens.forEach(t => {
      if (tokenSeen(m, t, vis)) return;
      const cb = cbFor(t, fight);
      if (cb) out.add(cb.id);
    });
    return out;
  }

  /* A player asked to move their token. Returns an error message, or '' when it moved. */
  function playerMove(campaignId, ownerKey, id, x, y) {
    const cp = Campaign.byId(campaignId);
    const m = shownMap(cp);
    if (!m || !ownerKey) return 'There is no map to move on.';
    const t = m.tokens.find(k => k.id === id);
    const vis = visOf(m);
    if (!t || t.owner !== ownerKey || !tokenSeen(m, t, vis)) return "You can only move your own character's token.";
    x = Math.round(Number(x)); y = Math.round(Number(y));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x + t.size > m.cols || y + t.size > m.rows) return "That's off the map.";
    for (let yy = y; yy < y + t.size; yy++) for (let xx = x; xx < x + t.size; xx++) {
      const i = yy * m.cols + xx;
      if (vis[i] !== '1') return "You can't see that far yet.";
      if (m.terrain[i] === 'w') return "There's a wall in the way.";
    }
    t.x = x; t.y = y;
    Store.save();
    return '';
  }

  /* Checks a ping: inside the map, and only names a token the players can see. */
  function checkPing(campaignId, x, y, tokenId) {
    const m = shownMap(Campaign.byId(campaignId));
    x = Number(x); y = Number(y);
    if (!m || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > m.cols || y > m.rows) return null;
    const t = tokenId && m.tokens.find(k => k.id === tokenId);
    const ok = t && tokenSeen(m, t, visOf(m));
    return { mapId: m.id, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, tokenId: ok ? t.id : null };
  }

  /* ---------- Sizes ---------- */
  async function gzipSize(obj) {
    const json = JSON.stringify(obj);
    if (!window.CompressionStream) return Math.round(json.length * 0.45);
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    return (await new Response(stream).arrayBuffer()).byteLength;
  }
  const docOf = cp => cp;

  /* Shrink an uploaded picture so the whole campaign still fits in one account document. */
  async function prepareImage(file, cp, m) {
    if (!/^image\//.test(file.type)) throw new Error("That file isn't a picture.");
    const src = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error("Couldn't read that picture."));
      r.readAsDataURL(file);
    });
    const img = await loadImage(src).catch(() => { throw new Error("Couldn't open that picture. Try a JPG, PNG or WebP."); });
    const saved = m.image;
    m.image = null;
    const rest = await gzipSize(docOf(cp)).finally(() => { m.image = saved; });
    const budget = Math.min(IMG_MAX_BYTES, DOC_LIMIT - rest - 6000);
    if (budget < 40000) throw new Error('This campaign is too full for another picture. Remove a picture from another map first.');
    let side = Math.min(IMG_MAX_SIDE, Math.max(img.naturalWidth, img.naturalHeight));
    const qualities = [0.82, 0.72, 0.62, 0.52, 0.45];
    for (let round = 0; round < 8; round++) {
      const k = side / Math.max(img.naturalWidth, img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      for (const q of qualities) {
        const data = encode(cv, q);
        if (data.length * 0.76 <= budget) return { data, w, h, scaled: k < 1, origW: img.naturalWidth };
      }
      side = Math.round(side * 0.8);
      if (side < 500) break;
    }
    throw new Error("That picture is too detailed to fit. Try a smaller picture.");
  }

  /* ---------- Shapes on the grid ---------- */
  function lineCells(a, b) {
    const out = [];
    let x0 = a.x, y0 = a.y;
    const dx = Math.abs(b.x - x0), dy = -Math.abs(b.y - y0), sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      out.push({ x: x0, y: y0 });
      if (x0 === b.x && y0 === b.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return out;
  }
  function shapeCells(kind, a, b) {
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    const out = [];
    if (kind === 'line') return lineCells(a, b);
    if (kind === 'circle') {
      // Circle centred on the first square, reaching the second.
      const r = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) + 0.5;
      for (let y = Math.floor(a.y - r); y <= Math.ceil(a.y + r); y++) for (let x = Math.floor(a.x - r); x <= Math.ceil(a.x + r); x++) {
        if ((x - a.x) ** 2 + (y - a.y) ** 2 <= r * r) out.push({ x, y });
      }
      return out;
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (kind === 'outline' && x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      out.push({ x, y });
    }
    return out;
  }

  /* ---------- Drawing ---------- */
  const TERRAIN_FILL = { f: '#343a4b', w: '#0c0e14', d: '#343a4b' };

  function drawScene(ctx, v, cam, W, H, extra) {
    const s = cam.scale;
    ctx.fillStyle = '#0b0d13';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(s, s);
    const { cols, rows } = v;
    const c0 = Math.max(0, Math.floor(-cam.x / s)), c1 = Math.min(cols - 1, Math.floor((W - cam.x) / s));
    const r0 = Math.max(0, Math.floor(-cam.y / s)), r1 = Math.min(rows - 1, Math.floor((H - cam.y) / s));
    const px = 1 / s;

    // The DM builds on a plain white sheet so every square is easy to see.
    const white = v.isDM;
    ctx.fillStyle = white ? '#ffffff' : '#1a1e2a';
    ctx.fillRect(0, 0, cols, rows);

    // Picture
    if (v.image) {
      const g = geom(v.image);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, cols, rows); ctx.clip();
      if (v.image.el) ctx.drawImage(v.image.el, g.x0, g.y0, g.gw, g.gh);
      else (v.image.tiles || []).forEach(t => {
        const el = v.tileEls && v.tileEls.get(t.key);
        if (el) ctx.drawImage(el, g.x0 + t.x / v.image.s, g.y0 + t.y / v.image.s, t.w / v.image.s + px * 0.5, t.h / v.image.s + px * 0.5);
      });
      ctx.restore();
    }

    // Squares
    const over = v.image ? 0.55 : 1;
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) {
      const i = y * cols + x, ch = v.terrain[i];
      if (ch === '.') continue;
      if (ch === 'w') {
        ctx.fillStyle = TERRAIN_FILL.w; ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = 'rgba(160,170,195,.16)'; ctx.fillRect(x, y, 1, 0.08);
        continue;
      }
      if (ch === 'f' || ch === 'd') {
        ctx.globalAlpha = ch === 'f' ? over * 0.85 : 1;
        ctx.fillStyle = TERRAIN_FILL.f; ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
        if (ch === 'd') {
          const wall = (xx, yy) => xx >= 0 && yy >= 0 && xx < cols && yy < rows && v.terrain[yy * cols + xx] === 'w';
          const across = wall(x - 1, y) || wall(x + 1, y) || !(wall(x, y - 1) || wall(x, y + 1));
          ctx.fillStyle = '#8a6036';
          if (across) ctx.fillRect(x, y + 0.36, 1, 0.28); else ctx.fillRect(x + 0.36, y, 0.28, 1);
          ctx.strokeStyle = '#c99a5b'; ctx.lineWidth = Math.max(px, 0.03);
          if (across) ctx.strokeRect(x + 0.04, y + 0.36, 0.92, 0.28); else ctx.strokeRect(x + 0.36, y + 0.04, 0.28, 0.92);
        }
        continue;
      }
      if (COLORS[ch]) {
        ctx.globalAlpha = v.image ? 0.6 : 0.92;
        ctx.fillStyle = COLORS[ch][1]; ctx.fillRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      }
    }
    // Difficult terrain: amber hatching
    ctx.strokeStyle = white && !v.image ? 'rgba(176,112,0,.9)' : 'rgba(227,182,84,.6)';
    ctx.lineWidth = Math.max(px * 1.2, 0.04);
    ctx.beginPath();
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) {
      if (v.diff[y * cols + x] !== '1') continue;
      for (let k = 0.25; k < 2; k += 0.5) {
        const ax = x + Math.max(0, k - 1), ay = y + Math.min(1, k), bx = x + Math.min(1, k), by = y + Math.max(0, k - 1);
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      }
    }
    ctx.stroke();

    // Grid
    if (v.grid && s >= 6) {
      ctx.strokeStyle = v.image ? 'rgba(0,0,0,.35)' : white ? 'rgba(21,24,35,.28)' : 'rgba(235,229,214,.10)';
      ctx.lineWidth = px;
      ctx.beginPath();
      for (let x = c0; x <= c1 + 1; x++) { ctx.moveTo(x, r0); ctx.lineTo(x, r1 + 1); }
      for (let y = r0; y <= r1 + 1; y++) { ctx.moveTo(c0, y); ctx.lineTo(c1 + 1, y); }
      ctx.stroke();
      if (v.image) {
        ctx.strokeStyle = 'rgba(235,229,214,.18)';
        ctx.beginPath();
        for (let x = c0; x <= c1 + 1; x++) { ctx.moveTo(x + px, r0); ctx.lineTo(x + px, r1 + 1); }
        for (let y = r0; y <= r1 + 1; y++) { ctx.moveTo(c0, y + px); ctx.lineTo(c1 + 1, y + px); }
        ctx.stroke();
      }
    }

    // Fog: the DM sees through it; players have nothing under it to see.
    if (v.vis) {
      for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) {
        if (v.vis[y * cols + x] === '1') continue;
        // DM: drawn squares under fog are dimmed; empty ones keep the white sheet with a faint tint.
        ctx.fillStyle = v.isDM ? (v.image || v.terrain[y * cols + x] !== '.' ? 'rgba(6,7,12,.5)' : 'rgba(70,100,170,.12)') : '#06070b';
        ctx.fillRect(x - px * 0.5, y - px * 0.5, 1 + px, 1 + px);
      }
      if (v.isDM) {
        ctx.strokeStyle = v.image ? 'rgba(126,166,232,.16)' : 'rgba(70,100,170,.22)';
        ctx.lineWidth = px;
        ctx.beginPath();
        for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) {
          if (v.vis[y * cols + x] === '1') continue;
          ctx.moveTo(x, y + 0.5); ctx.lineTo(x + 0.5, y); ctx.moveTo(x, y + 1); ctx.lineTo(x + 1, y);
          ctx.moveTo(x + 0.5, y + 1); ctx.lineTo(x + 1, y + 0.5);
        }
        ctx.stroke();
      }
    }

    // Shape / fog rectangle preview
    if (extra.preview && extra.preview.length) {
      ctx.fillStyle = extra.previewColor || 'rgba(92,191,174,.35)';
      extra.preview.forEach(c => { if (c.x >= 0 && c.y >= 0 && c.x < cols && c.y < rows) ctx.fillRect(c.x, c.y, 1, 1); });
    }
    if (extra.hover && extra.hover.length) {
      ctx.strokeStyle = 'rgba(116,211,194,.8)';
      ctx.lineWidth = px * 1.5;
      extra.hover.forEach(c => { if (c.x >= 0 && c.y >= 0 && c.x < cols && c.y < rows) ctx.strokeRect(c.x + px, c.y + px, 1 - 2 * px, 1 - 2 * px); });
    }

    // Tokens
    const now = performance.now();
    v.tokens.forEach(t => {
      const drag = extra.dragId === t.id ? extra.dragTo : null;
      const pos = drag || t;
      drawToken(ctx, t, pos.x, pos.y, s, px, {
        selected: extra.selected === t.id, mine: v.mine && v.mine.includes(t.id), isDM: v.isDM, ghost: Boolean(drag), now,
      });
      if (drag) drawToken(ctx, t, t.x, t.y, s, px, { faded: true });
    });

    // Pings
    (extra.pings || []).forEach(p => {
      const age = (now - p.at) / 1000;
      if (age > 3) return;
      const pulse = (age % 1);
      ctx.strokeStyle = p.color; ctx.globalAlpha = Math.max(0, 1 - age / 3);
      ctx.lineWidth = Math.max(3 * px, 0.08);
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.3 + pulse * 1.4, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, 0.18, 0, Math.PI * 2); ctx.fillStyle = p.color; ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.restore();

    // Labels in screen space (crisp at any zoom)
    ctx.font = '600 12px "Alegreya Sans", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (s >= 22) v.tokens.forEach(t => {
      const pos = extra.dragId === t.id ? extra.dragTo : t;
      label(ctx, t.name, cam.x + (pos.x + t.size / 2) * s, cam.y + (pos.y + t.size) * s + 2, t.active ? '#e3b654' : '#ebe5d6');
    });
    (extra.pings || []).forEach(p => {
      const age = (now - p.at) / 1000;
      if (age > 3) return;
      ctx.globalAlpha = Math.max(0, 1 - age / 3);
      label(ctx, p.name, cam.x + p.x * s, cam.y + p.y * s - 34, p.color);
      ctx.globalAlpha = 1;
    });
    if (extra.ruler) {
      const { a, b, text } = extra.ruler;
      const ax = cam.x + (a.x + 0.5) * s, ay = cam.y + (a.y + 0.5) * s, bx = cam.x + (b.x + 0.5) * s, by = cam.y + (b.y + 0.5) * s;
      ctx.strokeStyle = '#e3b654'; ctx.lineWidth = 3; ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e3b654';
      [[ax, ay], [bx, by]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); });
      ctx.font = '800 15px "Alegreya Sans", system-ui, sans-serif';
      label(ctx, text, bx, by + 12, '#e3b654', true);
    }
  }

  function label(ctx, text, x, y, color, big) {
    const w = ctx.measureText(text).width + 10, h = big ? 22 : 17;
    ctx.fillStyle = 'rgba(11,13,19,.82)';
    roundRect(ctx, x - w / 2, y, w, h, 5); ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + (big ? 3 : 2));
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function initials(name) {
    const words = String(name || '?').trim().split(/\s+/);
    const num = /^\d+$/.test(words[words.length - 1]) && words.length > 1 ? words.pop() : '';
    const letters = words.slice(0, num ? 1 : 2).map(w => w[0] || '').join('').toUpperCase();
    return (letters + num).slice(0, 3) || '?';
  }

  function drawToken(ctx, t, x, y, s, px, o) {
    const r = t.size / 2, cx = x + r, cy = y + r;
    ctx.save();
    if (o.faded) ctx.globalAlpha = 0.25;
    else if (o.ghost) ctx.globalAlpha = 0.85;
    else if (t.hidden) ctx.globalAlpha = 0.5;
    if (t.active && !o.faded) {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(227,182,84,.28)'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = '#151823'; ctx.fill();
    ctx.lineWidth = Math.max(r * 0.14, 2.5 * px);
    ctx.strokeStyle = t.color; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = t.color + '40'; ctx.fill();
    if (t.active && !o.faded) {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(r * 0.07, 2 * px); ctx.strokeStyle = '#e3b654'; ctx.stroke();
    }
    if (o.selected) {
      ctx.setLineDash([0.12, 0.08]);
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(r * 0.05, 1.5 * px); ctx.strokeStyle = '#74d3c2'; ctx.stroke();
      ctx.setLineDash([]);
    }
    if (o.mine) {
      ctx.beginPath(); ctx.arc(cx + r * 0.6, cy - r * 0.6, r * 0.16, 0, Math.PI * 2);
      ctx.fillStyle = '#74d3c2'; ctx.fill();
    }
    // HP bar (DM sees all; players see player characters)
    if (t.hp !== null && t.hp !== undefined && s >= 20 && !o.faded) {
      const w = t.size * 0.7, bx = cx - w / 2, by = y + t.size * 0.9;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(bx, by, w, 0.1);
      ctx.fillStyle = t.hp <= 0.25 ? '#dd6352' : t.hp <= 0.5 ? '#e3b654' : '#5cbfae';
      ctx.fillRect(bx, by, w * t.hp, 0.1);
    } else if (t.bloodied && !o.faded) {
      ctx.beginPath(); ctx.arc(cx - r * 0.6, cy - r * 0.6, r * 0.14, 0, Math.PI * 2);
      ctx.fillStyle = '#dd6352'; ctx.fill();
    }
    // Initials
    const fs = Math.min(r * 0.62, r * 1.6 / Math.max(2, initials(t.name).length));
    ctx.fillStyle = '#ebe5d6';
    ctx.font = `800 ${fs}px "Alegreya Sans", system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(initials(t.name), cx, cy + fs * 0.05);
    if (t.down) {
      ctx.strokeStyle = '#dd6352'; ctx.lineWidth = Math.max(r * 0.12, 2 * px);
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.5, cy - r * 0.5); ctx.lineTo(cx + r * 0.5, cy + r * 0.5);
      ctx.moveTo(cx + r * 0.5, cy - r * 0.5); ctx.lineTo(cx - r * 0.5, cy + r * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- Page section ---------- */
  const TOOLS_DM = [
    ['move', 'Move', 'Drag tokens to move them, or drag the map to look around. Tap a token to edit it.'],
    ['draw', 'Draw', 'Paint squares with the brush. Difficult terrain goes on top of what is already there.'],
    ['shape', 'Shapes', 'Drag from one square to another to draw the shape with the brush.'],
    ['fog', 'Fog', 'Players only see revealed squares. Paint or drag a box to reveal or hide.'],
    ['tokens', 'Tokens', 'Add tokens for the party, for everyone in combat, or one at a time.'],
    ['measure', 'Measure', 'Drag to measure. Diagonals count as one square (5-5-5).'],
    ['ping', 'Ping', 'Tap a spot or a creature to flash it for everyone.'],
  ];
  const TOOLS_PL = [
    ['move', 'Move', 'Drag your token to move it. Drag the map to look around; pinch or scroll to zoom.'],
    ['measure', 'Measure', 'Drag to measure. Diagonals count as one square (5-5-5).'],
    ['ping', 'Ping', 'Tap a spot or a creature to flash it for everyone.'],
  ];
  const ICONS = {
    move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
    draw: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    shape: '<rect x="3" y="3" width="10" height="10" rx="1"/><circle cx="16" cy="16" r="5"/>',
    fog: '<path d="M4 9h11a3 3 0 1 0-3-3"/><path d="M3 13h16a3 3 0 1 1-3 3"/><path d="M5 17h7"/>',
    tokens: '<circle cx="9" cy="10" r="5"/><circle cx="16" cy="15" r="5"/>',
    measure: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
    ping: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
  };
  const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

  function mount(host, opts) {
    const isDM = Boolean(opts.isDM);
    const campaignId = opts.campaignId || null;
    const ui = {
      tool: 'move', brush: 'w', shape: 'rect', fogMode: 'reveal', fogShape: 'brush', fogSize: 1,
      selected: null, placing: null, ruler: null, editingId: null,
    };
    const cam = { scale: 32, x: 0, y: 0, fitted: '', user: false }; // user: they zoomed or panned themselves
    const pings = [];
    const undo = new Map(); // map id -> stack
    let pending = null;     // player's requested move, shown until the DM answers
    let preview = null, hover = null, dragTok = null;
    let lastMapId = null;

    const cp = () => (isDM ? Campaign.byId(campaignId) : null);
    function current() {
      if (!isDM) return null;
      const c = cp();
      const maps = mapsOf(c);
      let m = maps.find(x => x.id === ui.editingId);
      if (!m) { m = shownMap(c) || maps[0] || null; ui.editingId = m ? m.id : null; }
      return m;
    }

    host.innerHTML = `
      <section class="panel room-card bm" data-ref="bmCard">
        <div class="bm-head">
          <h2>Battle map</h2>
          <div class="bm-maps" data-ref="maps"></div>
          <button class="btn bm-full-btn" data-bm="full" aria-pressed="false" title="Fill the screen">Full screen</button>
        </div>
        <div class="bm-body" data-ref="body">
          <div class="bm-tools" role="toolbar" aria-label="Map tools">
            ${(isDM ? TOOLS_DM : TOOLS_PL).map(([k, n]) => `<button class="bm-tool" data-tool="${k}" aria-pressed="false">${icon(k)}<span>${n}</span></button>`).join('')}
            ${isDM ? '<button class="bm-tool bm-undo" data-bm="undo" title="Undo the last drawing or fog change"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg><span>Undo</span></button>' : ''}
          </div>
          <div class="bm-opts" data-ref="opts"></div>
          ${isDM ? '<p class="bm-notes" data-ref="notes" hidden></p>' : ''}
          <div class="bm-stage" data-ref="stage">
            <canvas data-ref="canvas" aria-label="Battle map"></canvas>
            <div class="bm-empty" data-ref="empty" hidden></div>
            <div class="bm-zoom">
              <button data-bm="zoom-in" aria-label="Zoom in">+</button>
              <button data-bm="zoom-out" aria-label="Zoom out">−</button>
              <button data-bm="fit" aria-label="Fit the map to the screen" title="Fit">⤢</button>
            </div>
            <p class="bm-readout" data-ref="readout" aria-live="polite"></p>
          </div>
          <div class="bm-under" data-ref="under"></div>
        </div>
      </section>`;

    const $ = r => host.querySelector(`[data-ref="${r}"]`);
    const card = $('bmCard'), stage = $('stage'), canvas = $('canvas');
    const ctx = canvas.getContext('2d');

    /* ----- What to draw ----- */
    const tileEls = new Map();
    function viewModel() {
      if (isDM) {
        const m = current();
        if (!m) return null;
        const fight = Campaign.combat(campaignId);
        linkByName(m, fight);
        const imgEl = m.image ? imgFor(m.image.data) : null;
        return {
          id: m.id, cols: m.cols, rows: m.rows, ft: m.ft, grid: m.grid, terrain: m.terrain, diff: m.diff,
          vis: m.fog.on ? m.fog.rev : null, isDM: true,
          image: m.image ? { ...m.image, el: imgEl } : null,
          tokens: m.tokens.map(t => tokenView(t, fight, false)),
        };
      }
      const mv = Room.mapView;
      if (!mv || !mv.base) return null;
      const b = mv.base;
      if (tileEls.size > 80) {
        const keep = new Set(b.image ? b.image.tiles.map(t => t.key) : []);
        [...tileEls.keys()].forEach(k => { if (!keep.has(k)) tileEls.delete(k); });
      }
      if (b.image) b.image.tiles.forEach(t => {
        if (tileEls.has(t.key) || !mv.tiles.has(t.key)) return;
        tileEls.set(t.key, null);
        const el = new Image();
        el.onload = () => { tileEls.set(t.key, el); redraw(); };
        el.src = mv.tiles.get(t.key);
      });
      let tokens = mv.tokens;
      if (pending) tokens = tokens.map(t => (t.id === pending.id ? { ...t, x: pending.x, y: pending.y } : t));
      return { ...b, isDM: false, tokens, mine: mv.mine, tileEls };
    }
    const decoded = new Map();
    function imgFor(src) {
      const k = hash(src.slice(0, 2000)) + src.length;
      if (decoded.has(k)) return decoded.get(k);
      decoded.set(k, null);
      loadImage(src).then(el => { decoded.set(k, el); redraw(); }).catch(() => {});
      return null;
    }

    /* ----- Canvas size and camera ----- */
    let W = 0, H = 0, dpr = 1;
    function sizeCanvas() {
      const r = stage.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const nw = Math.max(50, Math.round(r.width)), nh = Math.max(50, Math.round(r.height));
      if (nw !== W || nh !== H) {
        // Keep looking at the same spot; refit if they haven't moved the view themselves.
        if (!cam.user) cam.fitted = '';
        else { cam.x += (nw - W) / 2; cam.y += (nh - H) / 2; }
      }
      W = nw; H = nh;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      redraw();
    }
    function fit(v) {
      v = v || viewModel();
      if (!v) return;
      cam.scale = Util.clamp(Math.min((W - 24) / v.cols, (H - 24) / v.rows), 6, 120);
      cam.x = (W - v.cols * cam.scale) / 2;
      cam.y = (H - v.rows * cam.scale) / 2;
      cam.user = false;
      redraw();
    }
    function zoomAt(f, sx, sy) {
      const ns = Util.clamp(cam.scale * f, 6, 160);
      const k = ns / cam.scale;
      cam.x = sx - (sx - cam.x) * k; cam.y = sy - (sy - cam.y) * k; cam.scale = ns;
      cam.user = true;
      redraw();
    }
    const toWorld = p => ({ x: (p.x - cam.x) / cam.scale, y: (p.y - cam.y) / cam.scale });
    const cellAt = w => ({ x: Math.floor(w.x), y: Math.floor(w.y) });

    let frame = 0;
    function redraw() {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    }
    function paint() {
      frame = 0;
      if (!host.isConnected) return cleanup();
      const v = viewModel();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!v) { ctx.fillStyle = '#0b0d13'; ctx.fillRect(0, 0, W, H); return; }
      if (cam.fitted !== v.id + ':' + v.cols + 'x' + v.rows) {
        cam.fitted = v.id + ':' + v.cols + 'x' + v.rows;
        fit(v);
      }
      // On a small screen the whole map can be tiny: start players close to their own token instead.
      const own = !isDM && !cam.user && cam.centered !== v.id && v.mine && v.tokens.find(t => v.mine.includes(t.id));
      if (own && cam.scale < 24) {
        cam.scale = 30;
        cam.x = W / 2 - (own.x + own.size / 2) * cam.scale;
        cam.y = H / 2 - (own.y + own.size / 2) * cam.scale;
        cam.centered = v.id; cam.user = true;
      }
      const now = performance.now();
      while (pings.length && now - pings[0].at > 3200) pings.shift();
      drawScene(ctx, v, cam, W, H, {
        preview: preview && preview.cells, previewColor: preview && preview.color, hover,
        selected: ui.selected, dragId: dragTok && dragTok.id, dragTo: dragTok && dragTok.to,
        pings, ruler: ui.ruler && rulerText(ui.ruler, v),
      });
      if (pings.length) redraw();
    }

    function rulerText(r, v) {
      const sq = Math.max(Math.abs(r.b.x - r.a.x), Math.abs(r.b.y - r.a.y));
      return { a: r.a, b: r.b, text: `${sq * v.ft} ft${sq ? ` · ${sq} square${sq > 1 ? 's' : ''}` : ''}` };
    }

    /* ----- Toolbar and panels ----- */
    function setTool(k) {
      ui.tool = k; ui.placing = null; preview = null;
      if (k !== 'measure') ui.ruler = null;
      host.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === k)));
      renderOpts();
      redraw();
    }

    function brushRow() {
      return `<div class="bm-brushes" role="group" aria-label="Brush">${BRUSHES.map(([k, n, c]) => `
        <button class="bm-brush ${ui.brush === k ? 'on' : ''}" data-brush="${k}" title="${n}" aria-label="${n}" aria-pressed="${ui.brush === k}">
          <span class="sw ${c === 'hatch' ? 'sw-hatch' : c === 'erase' ? 'sw-erase' : ''} ${k === 'd' ? 'sw-door' : ''}" ${c.startsWith('#') ? `style="background:${c}"` : ''}></span>
          <span class="bm-brush-name">${n}</span></button>`).join('')}</div>`;
    }

    function renderOpts() {
      const box = $('opts');
      const tools = isDM ? TOOLS_DM : TOOLS_PL;
      const hint = (tools.find(t => t[0] === ui.tool) || [])[2] || '';
      const m = current();
      let html = '';
      if (isDM && ui.tool === 'draw') html = brushRow();
      if (isDM && ui.tool === 'shape') {
        html = `<div class="seg" role="group" aria-label="Shape">${[['rect', 'Filled box'], ['outline', 'Box outline'], ['circle', 'Circle'], ['line', 'Line']].map(([k, n]) => `<button data-shape="${k}" class="${ui.shape === k ? 'on' : ''}">${n}</button>`).join('')}</div>${brushRow()}`;
      }
      if (isDM && ui.tool === 'fog' && m) {
        html = `
          <div class="seg" role="group" aria-label="Reveal or hide">
            <button data-fogmode="reveal" class="${ui.fogMode === 'reveal' ? 'on' : ''}">Reveal</button>
            <button data-fogmode="hide" class="${ui.fogMode === 'hide' ? 'on' : ''}">Hide</button>
          </div>
          <div class="seg" role="group" aria-label="How">
            <button data-fogshape="brush" data-size="1" class="${ui.fogShape === 'brush' && ui.fogSize === 1 ? 'on' : ''}">Brush</button>
            <button data-fogshape="brush" data-size="3" class="${ui.fogShape === 'brush' && ui.fogSize === 3 ? 'on' : ''}">Big brush</button>
            <button data-fogshape="rect" class="${ui.fogShape === 'rect' ? 'on' : ''}">Box</button>
          </div>
          <button class="btn btn-small" data-bm="reveal-all">Reveal all</button>
          <button class="btn btn-small" data-bm="hide-all">Hide all</button>
          <label class="bm-check"><input type="checkbox" data-bm="fog-on" ${m.fog.on ? 'checked' : ''}> Fog of war on</label>`;
      }
      if (isDM && ui.tool === 'tokens' && m) {
        html = `
          <button class="btn btn-small" data-bm="add-party">Add the party</button>
          <button class="btn btn-small" data-bm="add-combat">Add everyone in combat</button>
          <form class="bm-addtok" data-ref="addTok" autocomplete="off">
            <input name="name" maxlength="40" placeholder="Name, e.g. Goblin" aria-label="Token name" required>
            <select name="kind" aria-label="Side">${['enemy', 'ally', 'npc'].map(k => `<option value="${k}">${KIND_NAME[k]}</option>`).join('')}</select>
            <select name="size" aria-label="Size">${SIZES.map(([k, n]) => `<option value="${k}">${n.split(' (')[0]}</option>`).join('')}</select>
            <button class="btn btn-small btn-primary" type="submit">${ui.placing ? 'Tap the map…' : 'Place'}</button>
          </form>`;
      }
      box.innerHTML = `${html}<p class="bm-hint">${esc(ui.placing ? `Tap the map where ${ui.placing.name} goes.` : hint)}</p>`;
      const f = box.querySelector('[data-ref="addTok"]');
      if (f) f.addEventListener('submit', e => {
        e.preventDefault();
        const d = new FormData(f);
        const name = clip(String(d.get('name')).trim(), 40);
        if (!name) return;
        ui.placing = { name, kind: String(d.get('kind')), size: Util.clamp(Util.num(d.get('size'), 1), 1, 4) };
        renderOpts();
      });
    }

    function renderMaps() {
      const box = $('maps');
      if (!isDM) {
        const mv = Room.mapView;
        box.innerHTML = mv && mv.base ? `<span class="bm-name">${esc(mv.base.name)}</span>` : '';
        return;
      }
      const c = cp();
      const maps = mapsOf(c);
      const m = current();
      const shown = c && c.shownMapId;
      const extra = typeof PremadeMaps !== 'undefined' ? PremadeMaps.missing(c).length : 0;
      const notes = $('notes');
      if (notes) {
        notes.hidden = !(m && m.notes);
        notes.innerHTML = m && m.notes ? `<b>DM notes</b> ${esc(m.notes)}` : '';
      }
      const addPremade = extra ? `<button class="btn btn-small" data-bm="premade">Add this adventure's maps (${extra})</button>` : '';
      box.innerHTML = maps.length ? `
        <select data-bm="pick" aria-label="Map to edit">${maps.map(x => `<option value="${x.id}" ${m && x.id === m.id ? 'selected' : ''}>${esc(x.name)}${x.id === shown ? ' (players see this)' : ''}</option>`).join('')}</select>
        <button class="btn btn-small" data-bm="new">New map</button>
        ${m && m.id === shown ? '<button class="btn btn-small" data-bm="unshow">Stop showing players</button>' : '<button class="btn btn-small btn-primary" data-bm="show">Show players this map</button>'}${addPremade}`
        : `<button class="btn btn-small btn-primary" data-bm="new">Make a map</button>${addPremade}`;
    }

    function renderUnder() {
      const box = $('under');
      if (!isDM) { box.innerHTML = ''; return; }
      const m = current();
      if (!m) { box.innerHTML = ''; return; }
      const t = ui.selected && m.tokens.find(k => k.id === ui.selected);
      const fight = Campaign.combat(campaignId);
      const cb = t && cbFor(t, fight);
      const players = Room.players;
      const tokHTML = t ? `
        <div class="bm-tok panel" data-ref="tokEd">
          <div class="bm-tok-head"><b>${esc(cb ? cb.name : t.name)}</b>
            <button class="icon-btn" data-bm="deselect" aria-label="Close">×</button></div>
          <div class="bm-tok-grid">
            <label class="field"><span>Name</span><input data-tok="name" maxlength="40" value="${esc(t.name)}" ${cb ? 'disabled title="Named by the combat tracker"' : ''}></label>
            <label class="field"><span>Side</span><select data-tok="kind">${Object.entries(KIND_NAME).map(([k, n]) => `<option value="${k}" ${t.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field"><span>Size</span><select data-tok="size">${SIZES.map(([k, n]) => `<option value="${k}" ${t.size === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <label class="field"><span>Moved by</span><select data-tok="owner">
              <option value="">Only the DM</option>
              ${players.filter(p => p.key).map(p => `<option value="${esc(p.key)}" ${t.owner === p.key ? 'selected' : ''}>${esc(p.character ? p.character.name : p.name)}</option>`).join('')}
              ${t.owner && !players.some(p => p.key === t.owner) ? `<option value="${esc(t.owner)}" selected>${esc(t.ownerName || 'A player (not connected)')}</option>` : ''}
            </select></label>
          </div>
          <p class="muted small">${cb ? `Linked to the combat tracker: ${esc(cb.name)}, ${cb.hp} / ${cb.maxHp} HP.` : 'Not in the combat tracker.'}</p>
          <div class="bm-tok-actions">
            <label class="bm-check"><input type="checkbox" data-tok="hidden" ${t.hidden ? 'checked' : ''}> Hidden from players</label>
            ${cb ? '' : '<button class="btn btn-small" data-bm="tok-combat">Add to combat</button>'}
            <button class="btn btn-small btn-ghost-danger" data-bm="tok-remove">Remove token</button>
          </div>
        </div>` : '';
      const im = m.image;
      const across = im ? Math.round(im.w / im.s * 100) / 100 : 0;
      box.innerHTML = `${tokHTML}
        <details class="bm-settings" data-ref="settings" ${box.querySelector('[data-ref="settings"]')?.open ? 'open' : ''}>
          <summary>Map settings</summary>
          <div class="bm-set-grid">
            <label class="field"><span>Map name</span><input data-set="name" maxlength="60" value="${esc(m.name)}"></label>
            <label class="field narrow"><span>Squares across</span><input data-set="${im ? 'across' : 'cols'}" type="number" min="2" max="${MAX_DIM}" step="${im ? '0.1' : '1'}" value="${im ? across : m.cols}"></label>
            <label class="field narrow"><span>Squares down</span><input data-set="rows" type="number" min="2" max="${MAX_DIM}" value="${m.rows}" ${im ? 'disabled title="Set by the picture and the square size"' : ''}></label>
            <label class="field narrow"><span>Feet per square</span><input data-set="ft" type="number" min="1" max="100" value="${m.ft}"></label>
            <label class="bm-check"><input type="checkbox" data-set="grid" ${m.grid ? 'checked' : ''}> Grid lines</label>
          </div>
          <div class="bm-set-img">
            <h3>Picture</h3>
            ${im ? `
              <p class="muted small">${im.w} × ${im.h} pixels. Line the grid up with the picture's own squares.</p>
              <div class="bm-align">
                <label class="field narrow"><span>Square size (px)</span><input data-set="s" type="number" min="4" step="0.5" value="${Math.round(im.s * 100) / 100}"></label>
                <div class="bm-nudge"><span>Square size</span><button class="btn btn-small" data-nudge="s:-0.5">−</button><button class="btn btn-small" data-nudge="s:0.5">+</button></div>
                <div class="bm-nudge"><span>Move grid sideways</span><button class="btn btn-small" data-nudge="ox:-1" aria-label="Move grid left">◀</button><button class="btn btn-small" data-nudge="ox:1" aria-label="Move grid right">▶</button></div>
                <div class="bm-nudge"><span>Move grid up or down</span><button class="btn btn-small" data-nudge="oy:-1" aria-label="Move grid up">▲</button><button class="btn btn-small" data-nudge="oy:1" aria-label="Move grid down">▼</button></div>
              </div>
              <div class="bm-img-actions"><button class="btn btn-small" data-bm="upload">Replace picture</button><button class="btn btn-small btn-ghost-danger" data-bm="rm-image">Remove picture</button></div>`
              : `<p class="muted small">Upload a map picture to play on, then draw on top of it if you like. Large pictures are shrunk to fit your campaign.</p>
                 <button class="btn btn-small" data-bm="upload">Upload a picture</button>`}
            <p class="bm-size small" data-ref="size"></p>
          </div>
          <div class="bm-set-foot">
            <button class="btn btn-small" data-bm="dup">Copy this map</button>
            <button class="btn btn-small btn-ghost-danger" data-bm="del">Delete this map</button>
          </div>
        </details>`;
      measureSize();
    }

    let sizeTimer = null;
    function measureSize() {
      clearTimeout(sizeTimer);
      sizeTimer = setTimeout(async () => {
        const el = $('size');
        const c = cp();
        if (!el || !c) return;
        const n = await gzipSize(docOf(c));
        const pct = Math.round(n / 350000 * 100);
        el.textContent = `Campaign size: ${Math.max(1, Math.round(n / 1000))} KB of 350 KB (${pct}%). Pictures use most of it.`;
        el.classList.toggle('warn', n > DOC_LIMIT * 0.9);
      }, 300);
    }

    function renderEmpty() {
      const e = $('empty');
      const v = viewModel();
      if (card.classList.contains('bm-none') === Boolean(v)) { card.classList.toggle('bm-none', !v); sizeCanvas(); }
      host.querySelector('[data-bm="full"]').hidden = !v;
      if (v) { e.hidden = true; return; }
      if (card.classList.contains('bm-fullscreen')) toggleFull(false);
      e.hidden = false;
      const extra = isDM && typeof PremadeMaps !== 'undefined' ? PremadeMaps.missing(cp()).length : 0;
      e.innerHTML = isDM
        ? `<p>No maps in this campaign yet.</p><div class="bm-empty-actions"><button class="btn btn-primary" data-bm="new">Make a map</button>${extra ? `<button class="btn" data-bm="premade">Add this adventure's ${extra} maps</button>` : ''}</div>`
        : '<p>The DM hasn\'t shared a map yet.</p>';
    }

    function readout(text) { $('readout').textContent = text || ''; }

    function renderAll() {
      if (!host.isConnected) return cleanup();
      const v = viewModel();
      const mapId = v ? v.id : null;
      if (mapId !== lastMapId) { lastMapId = mapId; ui.selected = null; ui.ruler = null; pending = null; }
      renderMaps();
      renderEmpty();
      if (isDM) renderUnder();
      host.querySelector('.bm-tools').hidden = !v;
      $('opts').hidden = !v;
      redraw();
    }

    /* ----- Editing (DM) ----- */
    function pushUndo(m) {
      const st = undo.get(m.id) || [];
      st.push({ terrain: m.terrain, diff: m.diff, rev: m.fog.rev, cols: m.cols, rows: m.rows });
      if (st.length > 30) st.shift();
      undo.set(m.id, st);
    }
    function commit() {
      Store.save();
      redraw();
    }
    const setAt = (str, i, ch) => (str[i] === ch ? str : str.slice(0, i) + ch + str.slice(i + 1));
    function paintCells(m, cells, brush) {
      cells.forEach(({ x, y }) => {
        if (x < 0 || y < 0 || x >= m.cols || y >= m.rows) return;
        const i = y * m.cols + x;
        if (brush === 'x') m.diff = setAt(m.diff, i, '1');
        else if (brush === '.') { m.terrain = setAt(m.terrain, i, '.'); m.diff = setAt(m.diff, i, '0'); }
        else m.terrain = setAt(m.terrain, i, brush);
      });
    }
    function fogCells(m, cells, reveal) {
      cells.forEach(({ x, y }) => {
        if (x < 0 || y < 0 || x >= m.cols || y >= m.rows) return;
        m.fog.rev = setAt(m.fog.rev, y * m.cols + x, reveal ? '1' : '0');
      });
    }
    function brushArea(c, size) {
      const out = [];
      const h = Math.floor(size / 2);
      for (let y = c.y - h; y <= c.y + h; y++) for (let x = c.x - h; x <= c.x + h; x++) out.push({ x, y });
      return out;
    }

    /* The nearest open square (no wall, no token), in sight of the players when possible. */
    function freeSpot(m, size, near, seen) {
      const vis = visOf(m);
      const ok = (x, y) => {
        if (x < 0 || y < 0 || x + size > m.cols || y + size > m.rows) return false;
        for (let yy = y; yy < y + size; yy++) for (let xx = x; xx < x + size; xx++) {
          if (m.terrain[yy * m.cols + xx] === 'w') return false;
          if (seen && vis[yy * m.cols + xx] !== '1') return false;
          if (m.tokens.some(t => xx >= t.x && xx < t.x + t.size && yy >= t.y && yy < t.y + t.size)) return false;
        }
        return true;
      };
      const cx = Util.clamp(Math.floor(near.x), 0, m.cols - 1), cy = Util.clamp(Math.floor(near.y), 0, m.rows - 1);
      for (let r = 0; r < Math.max(m.cols, m.rows); r++) {
        for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
          if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) === r && ok(x, y)) return { x, y };
        }
      }
      return seen ? freeSpot(m, size, near, false) : { x: cx, y: cy };
    }
    const viewCenter = () => toWorld({ x: W / 2, y: H / 2 });

    function addToken(m, spec, at) {
      const size = Util.clamp(Util.num(spec.size, 1), 1, 4);
      // Premade maps mark where the party starts: use a free start square first.
      const start = !at && spec.kind === 'pc' && size === 1 && (m.starts || []).find(p => !m.tokens.some(t => p.x >= t.x && p.x < t.x + t.size && p.y >= t.y && p.y < t.y + t.size));
      if (start) at = { x: start.x + 0.5, y: start.y + 0.5 };
      const pos = at ? { x: Util.clamp(Math.floor(at.x - (size - 1) / 2), 0, m.cols - size), y: Util.clamp(Math.floor(at.y - (size - 1) / 2), 0, m.rows - size) } : freeSpot(m, size, viewCenter(), spec.kind === 'pc' && m.fog.on && m.fog.rev.includes('1'));
      const t = {
        id: Util.uid(), name: clip(spec.name, 40) || 'Token', kind: KIND_COLOR[spec.kind] ? spec.kind : 'enemy', size,
        x: pos.x, y: pos.y, cb: spec.cb || null, owner: spec.owner || null, ownerName: spec.ownerName || '', hidden: false,
      };
      m.tokens.push(t);
      return t;
    }

    /* ----- Pointer input ----- */
    const ptrs = new Map();
    let g = null;            // the current gesture
    let spaceDown = false;
    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    function tokenAt(v, w) {
      for (let i = v.tokens.length - 1; i >= 0; i--) {
        const t = v.tokens[i];
        if (w.x >= t.x && w.x < t.x + t.size && w.y >= t.y && w.y < t.y + t.size) return t;
      }
      return null;
    }

    function startGesture(e, p) {
      const v = viewModel();
      if (!v) return null;
      const w = toWorld(p);
      if (e.button === 1 || e.button === 2 || spaceDown) return { type: 'pan', last: p };
      const m = isDM ? current() : null;
      const base = { start: p, moved: false };
      if (ui.placing && isDM) return { ...base, type: 'place', w };
      switch (ui.tool) {
        case 'draw': {
          pushUndo(m);
          const c = cellAt(w);
          paintCells(m, [c], ui.brush);
          redraw();
          return { ...base, type: 'paint', last: c };
        }
        case 'shape': {
          const c = cellAt(w);
          return { ...base, type: 'shape', a: c, b: c };
        }
        case 'fog': {
          pushUndo(m);
          const c = cellAt(w);
          if (ui.fogShape === 'rect') return { ...base, type: 'fogrect', a: c, b: c };
          fogCells(m, brushArea(c, ui.fogSize), ui.fogMode === 'reveal');
          redraw();
          return { ...base, type: 'fogpaint', last: c };
        }
        case 'measure': {
          const c = cellAt(w);
          ui.ruler = { a: c, b: c };
          redraw();
          return { ...base, type: 'measure' };
        }
        case 'ping': return { ...base, type: 'ping' };
        default: {
          const t = tokenAt(v, w);
          const canMove = t && (isDM || (v.mine && v.mine.includes(t.id)));
          const lp = setTimeout(() => { if (g && !g.moved) { doPing(w, t); g = { type: 'none' }; } }, 550);
          if (canMove) return { ...base, type: 'token', id: t.id, size: t.size, grab: { x: w.x - t.x, y: w.y - t.y }, from: { x: t.x, y: t.y }, lp, tap: t };
          return { ...base, type: 'pan', last: p, lp, tap: t };
        }
      }
    }

    function moveGesture(p) {
      if (!g) return;
      if (!g.moved && g.start && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 6) { g.moved = true; clearTimeout(g.lp); }
      const w = toWorld(p);
      const m = isDM ? current() : null;
      switch (g.type) {
        case 'pan':
          cam.x += p.x - g.last.x; cam.y += p.y - g.last.y; g.last = p;
          cam.user = true;
          redraw(); break;
        case 'paint': {
          const c = cellAt(w);
          if (c.x !== g.last.x || c.y !== g.last.y) { paintCells(m, lineCells(g.last, c), ui.brush); g.last = c; redraw(); }
          break;
        }
        case 'fogpaint': {
          const c = cellAt(w);
          if (c.x !== g.last.x || c.y !== g.last.y) {
            lineCells(g.last, c).forEach(cc => fogCells(m, brushArea(cc, ui.fogSize), ui.fogMode === 'reveal'));
            g.last = c; redraw();
          }
          break;
        }
        case 'shape':
        case 'fogrect': {
          g.b = cellAt(w);
          const cells = g.type === 'shape' ? shapeCells(ui.shape, g.a, g.b) : shapeCells('rect', g.a, g.b);
          const col = g.type === 'fogrect' ? (ui.fogMode === 'reveal' ? 'rgba(227,182,84,.3)' : 'rgba(6,7,12,.6)') : 'rgba(92,191,174,.35)';
          preview = { cells, color: col };
          if (g.type === 'shape') readout(`${Math.abs(g.b.x - g.a.x) + 1} × ${Math.abs(g.b.y - g.a.y) + 1} squares`);
          redraw();
          break;
        }
        case 'measure':
          ui.ruler.b = cellAt(w);
          redraw(); break;
        case 'token': {
          if (!g.moved) break;
          const v = viewModel();
          const to = { x: Util.clamp(Math.round(w.x - g.grab.x), 0, v.cols - g.size), y: Util.clamp(Math.round(w.y - g.grab.y), 0, v.rows - g.size) };
          dragTok = { id: g.id, to };
          const sq = Math.max(Math.abs(to.x - g.from.x), Math.abs(to.y - g.from.y));
          readout(`Moving ${sq * v.ft} ft (${sq} square${sq === 1 ? '' : 's'})`);
          redraw();
          break;
        }
      }
    }

    function endGesture(p) {
      if (!g) return;
      clearTimeout(g.lp);
      const w = p ? toWorld(p) : null;
      const m = isDM ? current() : null;
      const v = viewModel();
      switch (g.type) {
        case 'place':
          if (w && m && ui.placing) {
            const t = addToken(m, ui.placing, w);
            ui.placing = null; ui.selected = t.id;
            renderOpts(); commit(); renderUnder();
          }
          break;
        case 'paint': case 'fogpaint': commit(); measureSize(); break;
        case 'shape':
          if (m) { pushUndo(m); paintCells(m, shapeCells(ui.shape, g.a, g.b), ui.brush); commit(); }
          preview = null; readout(''); break;
        case 'fogrect':
          if (m) { fogCells(m, shapeCells('rect', g.a, g.b), ui.fogMode === 'reveal'); commit(); }
          preview = null; break;
        case 'ping':
          if (!g.moved && w) doPing(w, tokenAt(v, w));
          break;
        case 'token': {
          const drop = dragTok;
          dragTok = null; readout('');
          if (!g.moved) { tapToken(g.tap); break; }
          if (!drop) break;
          if (isDM) {
            const t = m.tokens.find(k => k.id === g.id);
            if (t && (t.x !== drop.to.x || t.y !== drop.to.y)) { t.x = drop.to.x; t.y = drop.to.y; commit(); }
          } else if (drop.to.x !== g.from.x || drop.to.y !== g.from.y) {
            const ok = v.vis[drop.to.y * v.cols + drop.to.x] === '1';
            if (!ok) { Util.toast("You can't see that far yet.", 'error'); break; }
            pending = { id: g.id, x: drop.to.x, y: drop.to.y };
            setTimeout(() => { if (pending && pending.id === g.id) { pending = null; redraw(); } }, 4000);
            Room.mapMove(g.id, drop.to.x, drop.to.y);
          }
          redraw();
          break;
        }
        case 'pan':
          if (!g.moved && g.start) tapToken(g.tap);
          break;
      }
      g = null;
      redraw();
    }

    function tapToken(t) {
      if (!isDM) return;
      ui.selected = t ? t.id : null;
      renderUnder();
      redraw();
    }

    function doPing(w, t) {
      const v = viewModel();
      if (!v) return;
      const at = t ? { x: t.x + t.size / 2, y: t.y + t.size / 2 } : w;
      Room.ping(at.x, at.y, t ? t.id : null);
    }

    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button > 2) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      const p = pos(e);
      ptrs.set(e.pointerId, p);
      if (ptrs.size === 2) {
        // Two fingers: pinch to zoom and drag to pan. Undo any half-done edit.
        if (g) {
          clearTimeout(g.lp);
          if (['paint', 'fogpaint'].includes(g.type) && isDM) { const m = current(); const st = undo.get(m.id); const last = st && st.pop(); if (last) { m.terrain = last.terrain; m.diff = last.diff; m.fog.rev = last.rev; } }
          preview = null; dragTok = null;
        }
        const [a, b] = [...ptrs.values()];
        g = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
        redraw();
        return;
      }
      if (ptrs.size > 2) return;
      g = startGesture(e, p);
    });
    canvas.addEventListener('pointermove', e => {
      const p = pos(e);
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, p);
      if (g && g.type === 'pinch') {
        if (ptrs.size < 2) return;
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        cam.x += mid.x - g.mid.x; cam.y += mid.y - g.mid.y;
        zoomAt(d / g.d, mid.x, mid.y);
        g.d = d; g.mid = mid;
        return;
      }
      if (g && ptrs.has(e.pointerId)) return moveGesture(p);
      // Hover outline for brushes (mouse only)
      if (e.pointerType === 'mouse' && isDM && (ui.tool === 'draw' || ui.tool === 'fog')) {
        const c = cellAt(toWorld(p));
        hover = ui.tool === 'fog' && ui.fogShape === 'brush' ? brushArea(c, ui.fogSize) : [c];
        redraw();
      }
    });
    const up = e => {
      if (!ptrs.has(e.pointerId)) return;
      const p = pos(e);
      ptrs.delete(e.pointerId);
      if (g && g.type === 'pinch') { if (!ptrs.size) g = null; return; }
      if (e.type === 'pointercancel') { g && clearTimeout(g.lp); g = null; dragTok = null; preview = null; redraw(); return; }
      endGesture(p);
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { if (hover) { hover = null; redraw(); } });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const p = pos(e);
      if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
      else { cam.x -= e.deltaX; cam.user = true; redraw(); }
    }, { passive: false });
    const onKey = e => {
      if (!host.isConnected) return cleanup();
      if (e.target.matches && e.target.matches('input, textarea, select')) return;
      if (e.code === 'Space') { spaceDown = e.type === 'keydown'; if (spaceDown && stage.matches(':hover')) e.preventDefault(); }
      if (e.type === 'keydown' && e.key === 'Escape' && card.classList.contains('bm-fullscreen')) toggleFull(false);
      if (e.type === 'keydown' && isDM && (e.key === 'Delete' || e.key === 'Backspace') && ui.selected) removeSelected();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    function removeSelected() {
      const m = current();
      if (!m) return;
      m.tokens = m.tokens.filter(t => t.id !== ui.selected);
      ui.selected = null;
      commit(); renderUnder();
    }

    function toggleFull(on) {
      on = on ?? !card.classList.contains('bm-fullscreen');
      card.classList.toggle('bm-fullscreen', on);
      document.body.classList.toggle('bm-lock', on);
      const b = host.querySelector('[data-bm="full"]');
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'Exit full screen' : 'Full screen';
      requestAnimationFrame(sizeCanvas);
    }

    /* ----- Buttons and fields ----- */
    host.addEventListener('click', async e => {
      const tb = e.target.closest('[data-tool]');
      if (tb) return setTool(tb.dataset.tool);
      const br = e.target.closest('[data-brush]');
      if (br) { ui.brush = br.dataset.brush; return renderOpts(); }
      const sh = e.target.closest('[data-shape]');
      if (sh) { ui.shape = sh.dataset.shape; return renderOpts(); }
      const fm = e.target.closest('[data-fogmode]');
      if (fm) { ui.fogMode = fm.dataset.fogmode; return renderOpts(); }
      const fs = e.target.closest('[data-fogshape]');
      if (fs) { ui.fogShape = fs.dataset.fogshape; ui.fogSize = Util.num(fs.dataset.size, 1); return renderOpts(); }
      const nd = e.target.closest('[data-nudge]');
      if (nd) {
        const m = current();
        const [k, d] = nd.dataset.nudge.split(':');
        m.image[k] = Number(m.image[k]) + Number(d);
        fitToImage(m); commit(); renderUnder();
        return;
      }
      const b = e.target.closest('[data-bm]');
      if (!b || b.tagName === 'SELECT' || (b.tagName === 'INPUT')) return;
      const c = cp();
      const m = current();
      switch (b.dataset.bm) {
        case 'full': return toggleFull();
        case 'zoom-in': return zoomAt(1.25, W / 2, H / 2);
        case 'zoom-out': return zoomAt(0.8, W / 2, H / 2);
        case 'fit': return fit();
        case 'new': {
          const maps = mapsOf(c);
          const nm = newMap(`Map ${maps.length + 1}`);
          maps.push(nm);
          if (!c.shownMapId) c.shownMapId = nm.id;
          ui.editingId = nm.id;
          commit(); renderAll();
          const set = $('settings'); if (set) set.open = true;
          Util.toast(`${nm.name} made. Draw on it, upload a picture in Map settings, then reveal what the party can see with Fog.`);
          return;
        }
        case 'premade': {
          const n = PremadeMaps.addMissing(c);
          const maps = mapsOf(c);
          if (n) ui.editingId = maps[maps.length - n].id;
          cam.fitted = '';
          commit(); renderAll();
          return Util.toast(n ? `Added ${n} map${n > 1 ? 's' : ''}, one for each planned encounter, with the creatures in place. Pick one, then "Show players this map".` : 'This campaign already has all of its maps.');
        }
        case 'show': c.shownMapId = m.id; commit(); renderMaps(); return Util.toast(`Players now see ${m.name}.`);
        case 'unshow': c.shownMapId = null; commit(); renderMaps(); return Util.toast('Players no longer see a map.');
        case 'undo': {
          const st = m && undo.get(m.id);
          const last = st && st.pop();
          if (!last) return Util.toast('Nothing to undo.');
          if (last.cols !== m.cols || last.rows !== m.rows) return Util.toast('The map changed size, so that can\'t be undone.', 'error');
          m.terrain = last.terrain; m.diff = last.diff; m.fog.rev = last.rev;
          return commit();
        }
        case 'reveal-all': case 'hide-all':
          pushUndo(m);
          m.fog.rev = fill(m.cols * m.rows, b.dataset.bm === 'reveal-all' ? '1' : '0');
          return commit();
        case 'add-party': {
          let n = 0;
          Room.players.forEach(p => {
            if (!p.key || m.tokens.some(t => t.owner === p.key)) return;
            const cb = Campaign.combat(campaignId).combatants.find(x => x.playerKey === p.key);
            addToken(m, { name: p.character ? p.character.name : p.name, kind: 'pc', owner: p.key, ownerName: p.character ? p.character.name : p.name, cb: cb && cb.id });
            n++;
          });
          if (n) commit();
          return Util.toast(n ? `Added ${n} player token${n > 1 ? 's' : ''}. Each player can move their own.` : Room.players.length ? 'Everyone in the room already has a token.' : 'No players are in the room yet.');
        }
        case 'add-combat': {
          let n = 0;
          Campaign.combat(campaignId).combatants.forEach(cb => {
            if (m.tokens.some(t => cbFor(t, Campaign.combat(campaignId)) === cb)) return;
            addToken(m, { name: cb.name, kind: cb.kind === 'pc' ? 'pc' : cb.kind === 'ally' ? 'ally' : 'enemy', cb: cb.id, owner: cb.playerKey || null, ownerName: cb.name });
            n++;
          });
          if (n) commit();
          return Util.toast(n ? `Added ${n} token${n > 1 ? 's' : ''} from the combat tracker.` : 'Everyone in combat already has a token. Add creatures in the combat tracker first.');
        }
        case 'deselect': ui.selected = null; renderUnder(); return redraw();
        case 'tok-remove': return removeSelected();
        case 'tok-combat': {
          const t = m.tokens.find(k => k.id === ui.selected);
          if (!t) return;
          const cb = Combat.add({ name: t.name, kind: t.kind === 'pc' ? 'pc' : t.kind === 'ally' || t.kind === 'npc' ? 'ally' : 'enemy', hp: 10, ac: 12 }, campaignId);
          if (t.owner) cb.playerKey = t.owner;
          t.cb = cb.id;
          window.dispatchEvent(new CustomEvent('codex:combat'));
          commit(); renderUnder();
          return Util.toast(`${t.name} added to combat. Set their HP and AC in the tracker.`);
        }
        case 'upload': return pickImage();
        case 'rm-image':
          m.image = null; commit(); renderUnder(); return Util.toast('Picture removed. Your drawing stays.');
        case 'dup': {
          const copy = JSON.parse(JSON.stringify(m));
          copy.id = Util.uid(); copy.name = clip(`${m.name} (copy)`, 60); copy.tokens = [];
          const maps = mapsOf(c);
          if (copy.image) {
            const size = await gzipSize(docOf(c));
            if (size + m.image.data.length * 0.76 > DOC_LIMIT) { copy.image = null; Util.toast('Copied without the picture: the campaign has no room for a second copy of it.', 'error'); }
          }
          maps.push(copy); ui.editingId = copy.id; commit(); renderAll();
          return;
        }
        case 'del': {
          if (!b.dataset.armed) {
            b.dataset.armed = '1'; b.textContent = 'Click again to delete';
            setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'Delete this map'; } }, 3000);
            return;
          }
          c.maps = mapsOf(c).filter(x => x.id !== m.id);
          if (c.shownMapId === m.id) c.shownMapId = null;
          ui.editingId = null; commit(); renderAll();
          return Util.toast(`Deleted ${m.name}.`);
        }
      }
    });

    host.addEventListener('change', e => {
      const t = e.target;
      const m = current();
      if (t.dataset.bm === 'pick') { ui.editingId = t.value; ui.selected = null; cam.fitted = ''; return renderAll(); }
      if (t.dataset.bm === 'fog-on') { m.fog.on = t.checked; commit(); return; }
      if (t.dataset.set && m) {
        const k = t.dataset.set;
        if (k === 'name') m.name = clip(t.value.trim(), 60) || m.name;
        if (k === 'ft') m.ft = Util.clamp(Util.num(t.value, 5), 1, 100);
        if (k === 'grid') m.grid = t.checked;
        if (k === 'cols' || k === 'rows') { pushUndo(m); resize(m, Util.num(k === 'cols' ? t.value : m.cols, m.cols), Util.num(k === 'rows' ? t.value : m.rows, m.rows)); undo.delete(m.id); }
        if (k === 'across') { const n = Util.clamp(Number(t.value) || 10, 2, MAX_DIM - 1); m.image.s = m.image.w / n; fitToImage(m); }
        if (k === 's') { m.image.s = Number(t.value) || m.image.s; fitToImage(m); }
        commit(); renderMaps(); renderUnder();
        return;
      }
      if (t.dataset.tok && m) {
        const tok = m.tokens.find(k => k.id === ui.selected);
        if (!tok) return;
        const k = t.dataset.tok;
        if (k === 'name') tok.name = clip(t.value.trim(), 40) || tok.name;
        if (k === 'kind') tok.kind = t.value;
        if (k === 'size') { tok.size = Util.clamp(Util.num(t.value, 1), 1, 4); tok.x = Math.min(tok.x, m.cols - tok.size); tok.y = Math.min(tok.y, m.rows - tok.size); }
        if (k === 'hidden') tok.hidden = t.checked;
        if (k === 'owner') {
          tok.owner = t.value || null;
          const p = Room.players.find(x => x.key === t.value);
          if (p) tok.ownerName = p.character ? p.character.name : p.name;
        }
        commit(); renderUnder();
      }
    });

    function pickImage() {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files[0];
        const m = current();
        if (!file || !m) return;
        Util.toast('Preparing the picture…');
        try {
          const res = await prepareImage(file, cp(), m);
          const first = !m.image;
          // Guess the square size: many battle map pictures are drawn at 70 pixels per square.
          const guess = first ? res.w / Util.clamp(Math.round(res.origW / 70), 8, MAX_DIM - 1) : m.image.s * (res.w / m.image.w);
          m.image = { data: res.data, w: res.w, h: res.h, s: guess, ox: 0, oy: 0 };
          fitToImage(m);
          undo.delete(m.id);
          commit(); renderUnder(); cam.fitted = '';
          const set = $('settings'); if (set) set.open = true;
          Util.toast(`Picture added${res.scaled ? ' (shrunk to fit your campaign)' : ''}. Now line the grid up with it under Map settings.`);
        } catch (err) {
          Util.toast(err.message, 'error');
        }
      };
      input.click();
    }

    /* ----- Live updates ----- */
    function onPing(p) {
      const v = viewModel();
      if (!v || p.mapId !== v.id) return;
      pings.push({ ...p, at: performance.now(), color: p.dm ? '#e3b654' : '#74d3c2' });
      redraw();
    }
    const offPing = Room.onPing(onPing);
    const offMap = Room.onMap(type => {
      if (!host.isConnected) return cleanup();
      if (type === 'maptok' || type === 'maperr') pending = null;
      renderMaps(); renderEmpty();
      host.querySelector('.bm-tools').hidden = !viewModel();
      $('opts').hidden = !viewModel();
      redraw();
    });
    const offRoom = Room.on(() => { if (!host.isConnected) return cleanup(); if (isDM && ui.selected) renderUnder(); });
    let saveTimer = null;
    const onSave = () => {
      if (!host.isConnected) return cleanup();
      redraw();
      // Keep the token editor in step with the combat tracker, unless someone is typing in it.
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const a = document.activeElement;
        if (isDM && ui.selected && !(a && host.contains(a) && a.matches('input, select'))) renderUnder();
      }, 250);
    };
    window.addEventListener('codex:save', onSave);
    const ro = new ResizeObserver(() => sizeCanvas());
    ro.observe(stage);

    let cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      offPing(); offMap(); offRoom();
      window.removeEventListener('codex:save', onSave);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      document.body.classList.remove('bm-lock');
      ro.disconnect();
    }

    setTool('move');
    renderAll();
    sizeCanvas();
    return { refresh: renderAll };
  }

  return { mount, hostView, tileData, hiddenCombatants, playerMove, checkPing, mapsOf, shownMap, newMap, normalize };
})();
