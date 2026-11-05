/*
 * Character sheet as a PDF (Download this character).
 * Draws a printable sheet with no outside library, and tucks the full character inside
 * the PDF as an attached file (campaign-codex-character.json), so uploading the PDF to
 * Campaign Codex later brings back the character exactly.
 */
const SheetPDF = (() => {
  /* Character widths (per 1000 units) for the built-in PDF fonts, Windows-1252 codes 32 to 255. */
  const WIDTHS = {"Helvetica":[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,500,222,556,333,1000,556,556,333,1000,667,333,1000,500,611,500,500,222,222,333,333,350,556,1000,333,1000,500,333,944,500,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],"Helvetica-Bold":[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,500,278,556,500,1000,556,556,333,1000,667,333,1000,500,611,500,500,278,278,500,500,350,556,1000,333,1000,556,333,944,500,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556],"Times-Bold":[250,333,555,500,500,1000,833,278,333,333,500,570,250,333,250,278,500,500,500,500,500,500,500,500,500,500,333,333,570,570,570,500,930,722,667,722,722,667,611,778,778,389,500,778,667,944,722,778,611,778,722,556,667,722,722,1000,722,722,667,333,278,333,581,500,333,500,556,444,556,444,333,500,556,278,333,556,278,833,556,500,556,556,444,389,333,556,500,722,500,500,444,394,220,394,520,761,500,500,333,500,500,1000,500,500,333,1000,556,333,1000,500,667,500,500,333,333,500,500,350,500,1000,333,1000,389,333,722,500,444,722,250,333,500,500,500,500,220,500,333,747,300,500,570,333,747,333,400,570,300,300,333,556,540,250,333,300,330,500,750,750,750,500,722,722,722,722,722,722,1000,722,667,667,667,667,389,389,389,389,722,722,778,778,778,778,778,570,778,722,722,722,722,722,611,556,500,500,500,500,500,500,722,444,444,444,444,444,278,278,278,278,500,556,500,500,500,500,500,570,500,556,556,556,556,500,556,500]};
  const FONTS = { R: 'Helvetica', B: 'Helvetica-Bold', T: 'Times-Bold' };
  const W = 612, H = 792, M = 40; // US Letter, margins
  const INK = [0.12, 0.10, 0.09], SOFT = [0.42, 0.38, 0.34], ACC = [0.48, 0.17, 0.12], RULE = [0.80, 0.75, 0.68], FILL = [0.965, 0.945, 0.91];

  /* ---------- Text encoding (Windows-1252, which the built-in fonts use) ---------- */
  const CP = { 0x20ac: 0x80, 0x201a: 0x82, 0x192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x2c6: 0x88, 0x2030: 0x89, 0x160: 0x8a, 0x2039: 0x8b, 0x152: 0x8c, 0x17d: 0x8e,
    0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2dc: 0x98, 0x2122: 0x99, 0x161: 0x9a, 0x203a: 0x9b, 0x153: 0x9c, 0x17e: 0x9e, 0x178: 0x9f };
  function codes(str) {
    const out = [];
    for (const ch of String(str ?? '').normalize('NFC')) {
      const u = ch.codePointAt(0);
      if (u === 9) out.push(32);
      else if (u >= 32 && u < 127) out.push(u);
      else if (u >= 160 && u <= 255) out.push(u);
      else if (CP[u]) out.push(CP[u]);
      else if (u === 0x2212) out.push(45);
      else if (u >= 0x2190 && u <= 0x21ff) out.push(62);
      else if (u >= 32) out.push(63);
    }
    return out;
  }
  const widthOf = (str, f, size) => codes(str).reduce((n, c) => n + (WIDTHS[FONTS[f]][c - 32] || 500), 0) * size / 1000;
  const pdfStr = str => '(' + codes(str).map(c => (c === 40 || c === 41 || c === 92) ? '\\' + String.fromCharCode(c) : c < 127 ? String.fromCharCode(c) : '\\' + c.toString(8).padStart(3, '0')).join('') + ')';
  const num = n => (Math.round(n * 100) / 100).toString();
  const rgb = (c, op) => `${c.map(num).join(' ')} ${op}`;

  /* Split text into lines that fit a width, keeping the writer's own line breaks. */
  function wrap(text, f, size, width) {
    const lines = [];
    String(text ?? '').replace(/\r/g, '').split('\n').forEach(par => {
      if (!par.trim()) { lines.push(''); return; }
      const lead = (/^(\s*(?:[-*•]\s+)?)/.exec(par) || [''])[0];
      const indent = widthOf(lead.replace(/[-*•]/, '•'), f, size);
      let line = '';
      par.split(/(\s+)/).filter(x => x !== '').forEach(word => {
        const tryLine = line + word;
        if (!line || widthOf(tryLine, f, size) <= width - (lines.length && line === '' ? indent : 0)) { line = tryLine; return; }
        lines.push(line.replace(/\s+$/, ''));
        line = /^\s+$/.test(word) ? '' : word;
        while (widthOf(line, f, size) > width) { // a single very long word
          let cut = line.length - 1;
          while (cut > 1 && widthOf(line.slice(0, cut), f, size) > width) cut--;
          lines.push(line.slice(0, cut)); line = line.slice(cut);
        }
      });
      if (line.trim()) lines.push(line.replace(/\s+$/, ''));
    });
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  /* ---------- Page drawing (coordinates from the top-left, in points) ---------- */
  function Page() {
    const ops = [];
    const Y = y => H - y;
    return {
      ops,
      text(x, y, str, { f = 'R', size = 10, color = INK, align = 'left', maxW } = {}) {
        let s = String(str ?? '');
        if (maxW) while (s.length > 1 && widthOf(s, f, size) > maxW) s = s.slice(0, -2) + '…';
        const w = widthOf(s, f, size);
        const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
        ops.push(`BT /${f} ${num(size)} Tf ${rgb(color, 'rg')} ${num(x0)} ${num(Y(y))} Td ${pdfStr(s)} Tj ET`);
        return w;
      },
      rect(x, y, w, h, { fill, stroke = RULE, lw = 0.8, r = 0 } = {}) {
        const path = r ? roundRect(x, Y(y + h), w, h, r) : `${num(x)} ${num(Y(y + h))} ${num(w)} ${num(h)} re`;
        ops.push(`${num(lw)} w ${fill ? rgb(fill, 'rg') + ' ' : ''}${stroke ? rgb(stroke, 'RG') + ' ' : ''}${path} ${fill && stroke ? 'B' : fill ? 'f' : 'S'}`);
      },
      line(x1, y1, x2, y2, { color = RULE, lw = 0.8 } = {}) {
        ops.push(`${num(lw)} w ${rgb(color, 'RG')} ${num(x1)} ${num(Y(y1))} m ${num(x2)} ${num(Y(y2))} l S`);
      },
      dot(x, y, r, { fill = false, color = INK, lw = 0.8 } = {}) {
        const k = 0.5523 * r, cx = x, cy = Y(y);
        const p = `${num(cx + r)} ${num(cy)} m ${num(cx + r)} ${num(cy + k)} ${num(cx + k)} ${num(cy + r)} ${num(cx)} ${num(cy + r)} c ${num(cx - k)} ${num(cy + r)} ${num(cx - r)} ${num(cy + k)} ${num(cx - r)} ${num(cy)} c ${num(cx - r)} ${num(cy - k)} ${num(cx - k)} ${num(cy - r)} ${num(cx)} ${num(cy - r)} c ${num(cx + k)} ${num(cy - r)} ${num(cx + r)} ${num(cy - k)} ${num(cx + r)} ${num(cy)} c`;
        ops.push(`${num(lw)} w ${rgb(color, 'RG')} ${fill ? rgb(color, 'rg') + ' ' : ''}${p} ${fill ? 'B' : 'S'}`);
      },
    };
  }
  function roundRect(x, y, w, h, r) {
    const k = 0.5523 * r;
    return [`${num(x + r)} ${num(y)} m`, `${num(x + w - r)} ${num(y)} l`, `${num(x + w - r + k)} ${num(y)} ${num(x + w)} ${num(y + r - k)} ${num(x + w)} ${num(y + r)} c`,
      `${num(x + w)} ${num(y + h - r)} l`, `${num(x + w)} ${num(y + h - r + k)} ${num(x + w - r + k)} ${num(y + h)} ${num(x + w - r)} ${num(y + h)} c`,
      `${num(x + r)} ${num(y + h)} l`, `${num(x + r - k)} ${num(y + h)} ${num(x)} ${num(y + h - r + k)} ${num(x)} ${num(y + h - r)} c`,
      `${num(x)} ${num(y + r)} l`, `${num(x)} ${num(y + r - k)} ${num(x + r - k)} ${num(y)} ${num(x + r)} ${num(y)} c`, 'h'].join(' ');
  }

  /* ---------- The sheet ---------- */
  const fmt = n => (n >= 0 ? '+' : '') + n;
  const ABBR = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
  const LEVEL_NAME = ['Cantrips', '1st level', '2nd level', '3rd level', '4th level', '5th level', '6th level', '7th level', '8th level', '9th level'];

  function build(c) {
    const K = Character.calc;
    const pages = [];
    const newPage = () => { const p = Page(); pages.push(p); return p; };
    const name = c.name || 'Unnamed character';
    const lvl = Util.clamp(Util.num(c.level, 1), 1, 20);
    const pb = K.prof(c);

    // Box with a small heading label
    const box = (p, x, y, w, h, label) => {
      p.rect(x, y, w, h, { fill: [1, 1, 1], r: 5 });
      if (label) p.text(x + 8, y + 12, label.toUpperCase(), { f: 'B', size: 6.5, color: ACC });
    };
    const statBox = (p, x, y, w, label, value, sub) => {
      p.rect(x, y, w, 48, { fill: FILL, r: 5 });
      p.text(x + w / 2, y + 12, label.toUpperCase(), { f: 'B', size: 6.5, color: ACC, align: 'center' });
      p.text(x + w / 2, y + 35, value, { f: 'T', size: 18, align: 'center', maxW: w - 8 });
      if (sub) p.text(x + w / 2, y + 44, sub, { size: 6, color: SOFT, align: 'center' });
    };

    /* Page 1 */
    const p = newPage();
    p.text(M, M + 22, name, { f: 'T', size: 24, maxW: 400 });
    p.text(W - M, M + 8, 'CAMPAIGN CODEX', { f: 'B', size: 7, color: ACC, align: 'right' });
    p.text(W - M, M + 18, 'Character sheet', { size: 7, color: SOFT, align: 'right' });
    const cls = [c.className, c.subclass].filter(Boolean).join(' · ');
    const info = [`Level ${lvl}${cls ? ' ' + cls : ''}`, c.species, c.background, c.alignment, Util.num(c.xp, 0) ? `${Number(c.xp).toLocaleString()} XP` : ''].filter(Boolean).join('   ·   ');
    p.text(M, M + 40, info, { size: 9.5, color: SOFT, maxW: W - 2 * M });
    p.line(M, M + 50, W - M, M + 50, { color: ACC, lw: 1.4 });

    // Ability scores
    let y = M + 62;
    const aw = (W - 2 * M - 5 * 8) / 6;
    K.ABILITIES.forEach(([k, full], i) => {
      const x = M + i * (aw + 8), score = Util.num(c.abilities[k], 10), m = K.mod(score);
      p.rect(x, y, aw, 68, { fill: FILL, r: 6 });
      p.text(x + aw / 2, y + 13, full.toUpperCase(), { f: 'B', size: 6.5, color: ACC, align: 'center' });
      p.text(x + aw / 2, y + 41, fmt(m), { f: 'T', size: 24, align: 'center' });
      p.rect(x + aw / 2 - 15, y + 49, 30, 14, { fill: [1, 1, 1], r: 7 });
      p.text(x + aw / 2, y + 59, String(score), { f: 'B', size: 8.5, align: 'center' });
    });
    y += 82;

    // Left column: proficiency, saves, skills
    const lx = M, lw = 168;
    statBox(p, lx, y, (lw - 8) / 2, 'Proficiency', fmt(pb));
    statBox(p, lx + (lw - 8) / 2 + 8, y, (lw - 8) / 2, 'Inspiration', c.inspiration ? 'Yes' : '–');
    let ly = y + 58;
    box(p, lx, ly, lw, 22 + 6 * 13, 'Saving throws');
    K.ABILITIES.forEach(([k, full], i) => {
      const yy = ly + 28 + i * 13;
      p.dot(lx + 12, yy - 3, 3, { fill: Boolean(c.saves[k]) });
      p.text(lx + 22, yy, fmt(K.saveBonus(c, k)), { f: 'B', size: 8.5 });
      p.text(lx + 44, yy, full, { size: 8.5 });
    });
    ly += 22 + 6 * 13 + 8;
    const skH = 22 + K.SKILLS.length * 12.4;
    box(p, lx, ly, lw, skH, 'Skills');
    K.SKILLS.forEach(([k, label, a], i) => {
      const yy = ly + 28 + i * 12.4, lev = Util.num(c.skills[k], 0);
      p.dot(lx + 12, yy - 3, 3, { fill: lev >= 1 });
      if (lev >= 2) p.dot(lx + 12, yy - 3, 5, { lw: 0.6 });
      p.text(lx + 22, yy, fmt(K.skillBonus(c, k)), { f: 'B', size: 8.5 });
      p.text(lx + 44, yy, label, { size: 8.5 });
      p.text(lx + lw - 8, yy, ABBR[a], { size: 6.5, color: SOFT, align: 'right' });
    });
    ly += skH + 8;
    p.rect(lx, ly, lw, 22, { fill: FILL, r: 5 });
    p.text(lx + 10, ly + 14.5, 'Passive Perception', { size: 8.5 });
    p.text(lx + lw - 10, ly + 14.5, String(K.passivePerception(c)), { f: 'B', size: 10, align: 'right' });
    ly += 30;
    p.dot(lx + 4, ly - 2.5, 3, { fill: true }); p.text(lx + 11, ly, 'proficient', { size: 6.5, color: SOFT });
    p.dot(lx + 62, ly - 2.5, 3, { fill: true }); p.dot(lx + 62, ly - 2.5, 5, { lw: 0.6 }); p.text(lx + 71, ly, 'expertise', { size: 6.5, color: SOFT });

    // Right column: combat
    const rx = M + lw + 14, rw = W - M - rx;
    const sw = (rw - 3 * 8) / 4;
    statBox(p, rx, y, sw, 'Armor class', String(c.ac ?? 10));
    statBox(p, rx + (sw + 8), y, sw, 'Initiative', fmt(K.initBonus(c)));
    statBox(p, rx + 2 * (sw + 8), y, sw, 'Speed', `${c.speed ?? 30} ft`);
    statBox(p, rx + 3 * (sw + 8), y, sw, 'Hit dice', String(c.hitDice || '–'));
    let ry = y + 58;
    const hp = c.hp || {};
    box(p, rx, ry, rw, 52, 'Hit points');
    const hw = (rw - 24) / 3;
    [['Maximum', hp.max], ['Current', hp.current], ['Temporary', hp.temp || '']].forEach(([l, v], i) => {
      const x = rx + 8 + i * (hw + 4);
      p.text(x + hw / 2, ry + 36, v === '' || v == null ? '' : String(v), { f: 'T', size: 16, align: 'center' });
      p.line(x + 6, ry + 41, x + hw - 6, ry + 41);
      p.text(x + hw / 2, ry + 48, l, { size: 6, color: SOFT, align: 'center' });
    });
    ry += 60;
    const ds = c.deathSaves || {};
    p.text(rx, ry + 8, 'DEATH SAVES', { f: 'B', size: 6.5, color: ACC });
    p.text(rx + 70, ry + 8, 'Successes', { size: 7.5, color: SOFT });
    for (let i = 0; i < 3; i++) p.dot(rx + 116 + i * 11, ry + 5, 3.5, { fill: i < Util.num(ds.success, 0) });
    p.text(rx + 160, ry + 8, 'Failures', { size: 7.5, color: SOFT });
    for (let i = 0; i < 3; i++) p.dot(rx + 198 + i * 11, ry + 5, 3.5, { fill: i < Util.num(ds.fail, 0) });
    ry += 20;

    // Attacks
    const atks = (c.attacks || []).filter(a => a.name || a.damage);
    const rows = Math.max(3, Math.min(atks.length, 10));
    box(p, rx, ry, rw, 34 + rows * 15, 'Weapons, cantrips and attacks');
    p.text(rx + 10, ry + 26, 'Name', { size: 6.5, color: SOFT });
    p.text(rx + rw * 0.52, ry + 26, 'To hit', { size: 6.5, color: SOFT });
    p.text(rx + rw * 0.66, ry + 26, 'Damage and type', { size: 6.5, color: SOFT });
    for (let i = 0; i < rows; i++) {
      const yy = ry + 42 + i * 15, a = atks[i];
      if (i) p.line(rx + 8, yy - 11, rx + rw - 8, yy - 11, { lw: 0.4 });
      if (!a) continue;
      p.text(rx + 10, yy, a.name || '', { f: 'B', size: 8.5, maxW: rw * 0.5 - 14 });
      p.text(rx + rw * 0.52, yy, a.bonus === '' || a.bonus == null ? '' : fmt(Util.num(a.bonus, 0)) + (a.abil ? `  ${ABBR[a.abil]}` : ''), { size: 8.5 });
      p.text(rx + rw * 0.66, yy, a.damage || '', { size: 8.5, maxW: rw * 0.34 - 10 });
    }
    ry += 34 + rows * 15 + 12;

    /* Flowing text sections: first in the space left in the right column, then full pages. */
    let cur = { p, x: rx, w: rw, y: ry, bottom: H - M - 14 };
    const cont = () => { const np = newPage(); np.text(M, M + 10, `${name}, continued`, { f: 'T', size: 12, color: SOFT }); np.line(M, M + 18, W - M, M + 18); cur = { p: np, x: M, w: W - 2 * M, y: M + 34, bottom: H - M - 14 }; };
    const need = h => { if (cur.y + h > cur.bottom) cont(); };
    const section = (title, text) => {
      const body = String(text || '').trim();
      if (!body) return;
      need(40);
      cur.p.text(cur.x, cur.y + 8, title.toUpperCase(), { f: 'B', size: 7.5, color: ACC });
      cur.p.line(cur.x, cur.y + 12, cur.x + cur.w, cur.y + 12, { lw: 0.5 });
      cur.y += 25;
      wrap(body, 'R', 8.8, cur.w).forEach(l => {
        need(11.5);
        if (l) cur.p.text(cur.x, cur.y, l.replace(/^(\s*)[-*]\s/, '$1• '), { size: 8.8 });
        cur.y += l ? 11.5 : 6;
      });
      cur.y += 10;
    };
    section('Proficiencies and languages', c.proficiencies);
    section('Features and traits', [c.features, c.customFeatures].filter(x => String(x || '').trim()).join('\n\n'));
    section('Equipment', c.equipment);
    section('Notes', c.notes);
    section('Spell notes', c.spells);

    /* Spells */
    const list = (c.spellbook && Array.isArray(c.spellbook.list)) ? c.spellbook.list : [];
    const sbk = typeof Spellbook !== 'undefined' ? Spellbook : null;
    const st = sbk ? sbk.stats(c) : null;
    if (list.length || (st && st.k)) {
      const sp = newPage();
      sp.text(M, M + 22, 'Spells', { f: 'T', size: 22 });
      sp.text(W - M, M + 22, name, { size: 9, color: SOFT, align: 'right' });
      sp.line(M, M + 32, W - M, M + 32, { color: ACC, lw: 1.4 });
      let yy = M + 44;
      if (st) {
        const bw = (W - 2 * M - 3 * 8) / 4;
        statBox(sp, M, yy, bw, 'Spellcasting', st.k ? st.k.className : '–');
        statBox(sp, M + (bw + 8), yy, bw, 'Ability', ABBR[st.abil] || '–');
        statBox(sp, M + 2 * (bw + 8), yy, bw, 'Save DC', String(st.dc));
        statBox(sp, M + 3 * (bw + 8), yy, bw, 'Spell attack', fmt(st.atk));
        yy += 62;
      }
      const slots = (() => {
        const out = Array(10).fill(0);
        if (st && st.k && Array.isArray(st.k.slots)) st.k.slots.forEach((n, i) => { out[i + 1] = n; });
        const mx = c.spellbook && c.spellbook.max;
        if (mx) Object.entries(mx).forEach(([lv, n]) => { if (n !== '' && n != null) out[Number(lv)] = Util.num(n, 0); });
        return out;
      })();
      const pact = st && st.k && st.k.slots && st.k.slots.pact ? st.k.slots : null;
      const levelOf = e => { const s = !e.custom && typeof SpellList !== 'undefined' && SpellList.byName(e.n); return s ? s.level : Util.clamp(Util.num(e.lvl, 1), 0, 9); };
      cur = { p: sp, x: M, w: W - 2 * M, y: yy, bottom: H - M - 14 };
      const contSp = () => { const np = newPage(); np.text(M, M + 10, `${name}, spells continued`, { f: 'T', size: 12, color: SOFT }); np.line(M, M + 18, W - M, M + 18); cur = { p: np, x: M, w: W - 2 * M, y: M + 34, bottom: H - M - 14 }; };
      for (let lv = 0; lv <= 9; lv++) {
        const here = list.filter(e => levelOf(e) === lv).sort((a, b) => a.n.localeCompare(b.n));
        const nSlots = pact && lv === pact.slotLevel ? pact.count : slots[lv];
        if (!here.length && !nSlots) continue;
        if (cur.y + (here.length ? 85 : 40) > cur.bottom) contSp(); // keep a heading with its first spell
        const P = cur.p;
        P.rect(M, cur.y, W - 2 * M, 20, { fill: FILL, stroke: null, r: 4 });
        P.text(M + 8, cur.y + 13.5, LEVEL_NAME[lv], { f: 'T', size: 11 });
        if (lv > 0 && nSlots) {
          P.text(M + 120, cur.y + 13, pact && lv === pact.slotLevel ? 'Pact slots' : 'Slots', { size: 7.5, color: SOFT });
          for (let i = 0; i < nSlots; i++) P.rect(M + 160 + i * 13, cur.y + 5, 9, 9, { fill: [1, 1, 1], r: 1.5 });
        }
        if (lv > 0) {
          const lx2 = W - M - 150;
          P.dot(lx2, cur.y + 10.5, 3, { fill: true }); P.text(lx2 + 7, cur.y + 13, 'prepared', { size: 6.5, color: SOFT });
          P.dot(lx2 + 52, cur.y + 10.5, 3, { fill: true, color: ACC }); P.dot(lx2 + 52, cur.y + 10.5, 5, { lw: 0.6, color: ACC }); P.text(lx2 + 61, cur.y + 13, 'always prepared', { size: 6.5, color: SOFT });
        }
        cur.y += 32;
        here.forEach(e => {
          const s = !e.custom && typeof SpellList !== 'undefined' && SpellList.byName(e.n);
          const meta = s ? [s.school, s.time, s.range, s.conc ? 'Concentration' : '', s.ritual ? 'Ritual' : ''].filter(Boolean).join(' · ') : (e.custom ? 'Homebrew or other book' : '');
          const sumLines = s && s.summary ? wrap(s.summary, 'R', 7.8, W - 2 * M - 28) : [];
          const h = 12 + (meta ? 10 : 0) + sumLines.length * 9.8 + 6;
          if (cur.y + h > cur.bottom) contSp();
          const Q = cur.p;
          const always = e.p === 'a', prepared = always || e.p === 1 || e.p === true;
          if (lv > 0) {
            if (always) { Q.dot(M + 8, cur.y - 3, 3, { fill: true, color: ACC }); Q.dot(M + 8, cur.y - 3, 5, { lw: 0.6, color: ACC }); }
            else Q.dot(M + 8, cur.y - 3, 3.2, { fill: prepared });
          }
          Q.text(M + 20, cur.y, s ? s.name : e.n, { f: 'B', size: 9.5 });
          if (e.src) Q.text(W - M, cur.y, e.src, { size: 7, color: SOFT, align: 'right', maxW: 160 });
          let y2 = cur.y + 10;
          if (meta) { Q.text(M + 20, y2, meta, { size: 7, color: SOFT, maxW: W - 2 * M - 28 }); y2 += 10; }
          sumLines.forEach(l => { Q.text(M + 20, y2, l, { size: 7.8 }); y2 += 9.8; });
          cur.y = y2 + 6;
        });
        cur.y += 6;
      }
      if (cur.y + 20 < cur.bottom) cur.p.text(M, cur.y + 6, 'Spell summaries are short forms from the D&D System Reference Document 5.2 (CC-BY-4.0). Check your book for full rules.', { size: 6.5, color: SOFT });
    }

    // Footers
    pages.forEach((pg, i) => {
      pg.line(M, H - M + 4, W - M, H - M + 4, { lw: 0.4 });
      pg.text(M, H - M + 15, 'Made with Campaign Codex. Upload this PDF to Campaign Codex to bring the character back.', { size: 6.5, color: SOFT });
      pg.text(W - M, H - M + 15, `Page ${i + 1} of ${pages.length}`, { size: 6.5, color: SOFT, align: 'right' });
    });
    return pages;
  }

  /* ---------- PDF file assembly ---------- */
  function assemble(pages, c) {
    const enc = new TextEncoder();
    const json = enc.encode(JSON.stringify(c));
    const objs = []; // index = object number - 1; each is an array of string/Uint8Array parts
    const add = parts => { objs.push(parts); return objs.length; };
    const fontIds = {};
    Object.entries(FONTS).forEach(([k, base]) => { fontIds[k] = add([`<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`]); });
    const fontDict = Object.entries(fontIds).map(([k, id]) => `/${k} ${id} 0 R`).join(' ');
    const pagesId = objs.length + 1; objs.push(null); // reserved
    const kids = pages.map(pg => {
      const body = pg.ops.join('\n');
      const cid = add([`<< /Length ${body.length} >>\nstream\n`, body, '\nendstream']);
      return add([`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << ${fontDict} >> >> /Contents ${cid} 0 R >>`]);
    });
    objs[pagesId - 1] = [`<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`];
    // The character itself, attached as a file. /CampaignCodex marks it for the uploader.
    const fileId = add([`<< /Type /EmbeddedFile /Subtype /application#2Fjson /CampaignCodex 1 /Length ${json.length} /Params << /Size ${json.length} >> >>\nstream\n`, json, '\nendstream']);
    const specId = add([`<< /Type /Filespec /F (campaign-codex-character.json) /UF (campaign-codex-character.json) /EF << /F ${fileId} 0 R >> /Desc (Campaign Codex character data) >>`]);
    const catId = add([`<< /Type /Catalog /Pages ${pagesId} 0 R /Names << /EmbeddedFiles << /Names [(campaign-codex-character.json) ${specId} 0 R] >> >> >>`]);
    const now = new Date(), pad = n => String(n).padStart(2, '0');
    const infoId = add([`<< /Title ${pdfStr(`${c.name || 'Character'}: character sheet`)} /Creator (Campaign Codex) /Producer (Campaign Codex) /CreationDate (D:${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}) >>`]);

    const chunks = []; let size = 0;
    const put = x => { const b = typeof x === 'string' ? Uint8Array.from(x, ch => ch.charCodeAt(0) & 255) : x; chunks.push(b); size += b.length; };
    put('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n');
    const offsets = [];
    objs.forEach((parts, i) => { offsets.push(size); put(`${i + 1} 0 obj\n`); parts.forEach(put); put('\nendobj\n'); });
    const xref = size;
    put(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
    put(`trailer\n<< /Size ${objs.length + 1} /Root ${catId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(size); let o = 0;
    chunks.forEach(b => { out.set(b, o); o += b.length; });
    return out;
  }

  function make(c) { return assemble(build(c), c); }

  function download(c) {
    const bytes = make(c);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${Util.slug(c.name || 'character')}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  /* Find the character tucked inside a Campaign Codex PDF. Returns null if there isn't one. */
  function readEmbedded(bytes) {
    let text = '';
    for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const m = /\/CampaignCodex 1 \/Length (\d+)[^]*?>>\s*stream\r?\n/.exec(text);
    if (!m) return null;
    const start = m.index + m[0].length, len = Number(m[1]);
    try { return JSON.parse(new TextDecoder().decode(bytes.subarray(start, start + len))); } catch { return null; }
  }

  return { download, make, readEmbedded };
})();
