'use strict';

/*
 * Character import for players: one Upload button for
 *  - Campaign Codex files (.json)          read as-is
 *  - fillable PDF character sheets         read from the PDF's form fields, in the browser
 *    (the official sheet, D&D Beyond exports and most look-alikes)
 *  - photos, scans and PDFs without fields read by the AI helper (needs an AI access code)
 * Whatever was read is shown for checking before the character is added.
 */
const CharImport = (() => {
  const esc = Util.esc;
  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABIL_WORD = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' };
  const SKILLS = {
    acrobatics: 'dex', animal: 'wis', arcana: 'int', athletics: 'str', deception: 'cha', history: 'int', insight: 'wis',
    intimidation: 'cha', investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis', performance: 'cha',
    persuasion: 'cha', religion: 'int', sleight: 'dex', stealth: 'dex', survival: 'wis',
  };
  const SKILL_ORDER = Object.keys(SKILLS);
  const CLASS_NAMES = ['Artificer', 'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard'];
  const HIT_DIE = { Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10, Sorcerer: 6, Wizard: 6 };
  const MAX_PDF = 3.8e6;
  const MAX_FILES = 4;

  const modOf = s => Math.floor((Util.num(s, 10) - 10) / 2);
  const pbFor = lv => 2 + Math.floor((Util.clamp(lv, 1, 20) - 1) / 4);
  const intOf = v => { const m = /-?\d+/.exec(String(v ?? '')); return m ? Number(m[0]) : null; };

  /* ---------- Reading form fields from a PDF (no library needed) ---------- */
  function latin1(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    return s;
  }
  async function inflate(u8) {
    const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function decodeText(raw) {
    if (raw.charCodeAt(0) === 0xFE && raw.charCodeAt(1) === 0xFF) {
      let out = '';
      for (let i = 2; i + 1 < raw.length; i += 2) out += String.fromCharCode((raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1));
      return out;
    }
    return raw;
  }
  /* Read a PDF value at position i: (literal), <hex>, /Name or "12 0 R". Returns { value, kind }. */
  function readValue(str, i) {
    while (i < str.length && /\s/.test(str[i])) i++;
    const ch = str[i];
    if (ch === '(') {
      let depth = 0, out = '';
      for (let j = i; j < str.length; j++) {
        const c = str[j];
        if (c === '\\') {
          const n = str[j + 1];
          const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
          if (map[n] !== undefined) { out += map[n]; j++; continue; }
          if (/[0-7]/.test(n)) { const m = /^[0-7]{1,3}/.exec(str.slice(j + 1, j + 4))[0]; out += String.fromCharCode(parseInt(m, 8)); j += m.length; continue; }
          if (n === '\r' || n === '\n') { j++; if (n === '\r' && str[j + 1] === '\n') j++; continue; }
          continue;
        }
        if (c === '(') { depth++; if (depth > 1) out += c; continue; }
        if (c === ')') { depth--; if (depth === 0) return { value: out, kind: 'text' }; out += c; continue; }
        out += c;
      }
      return { value: out, kind: 'text' };
    }
    if (ch === '<' && str[i + 1] !== '<') {
      const end = str.indexOf('>', i);
      const hex = str.slice(i + 1, end).replace(/\s+/g, '');
      let raw = '';
      for (let j = 0; j < hex.length; j += 2) raw += String.fromCharCode(parseInt((hex[j] + (hex[j + 1] || '0')), 16));
      return { value: raw, kind: 'text' };
    }
    if (ch === '/') {
      const m = /^\/([^\s/<>[\]()]*)/.exec(str.slice(i));
      return { value: m ? m[1].replace(/#([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))) : '', kind: 'name' };
    }
    const ref = /^(\d+)\s+(\d+)\s+R/.exec(str.slice(i));
    if (ref) return { value: Number(ref[1]), kind: 'ref' };
    return { value: '', kind: 'none' };
  }


  /* ---------- Opening "secured" PDFs (no password to open, but encrypted) ---------- */
  const bytesOf = str => Uint8Array.from(str, ch => ch.charCodeAt(0) & 255);
  const strOf = u8 => latin1(u8);
  function md5(u8) {
    const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
    const len = u8.length, n = ((len + 8) >> 6) + 1, w = new Uint32Array(n * 16);
    for (let i = 0; i < len; i++) w[i >> 2] |= u8[i] << ((i % 4) * 8);
    w[len >> 2] |= 0x80 << ((len % 4) * 8);
    w[n * 16 - 2] = (len * 8) >>> 0; w[n * 16 - 1] = Math.floor(len / 2 ** 29);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let o = 0; o < w.length; o += 16) {
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; } else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; } else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const t = d; d = c; c = b;
        const x = (a + f + K[i] + w[o + g]) >>> 0, r = S[(i >> 4) * 4 + (i % 4)];
        b = (b + ((x << r) | (x >>> (32 - r)))) >>> 0; a = t;
      }
      a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
    }
    const out = new Uint8Array(16);
    [a0, b0, c0, d0].forEach((v, i) => { for (let j = 0; j < 4; j++) out[i * 4 + j] = (v >>> (8 * j)) & 255; });
    return out;
  }
  function rc4(key, data) {
    const S = new Uint8Array(256).map((_, i) => i);
    for (let i = 0, j = 0; i < 256; i++) { j = (j + S[i] + key[i % key.length]) & 255; [S[i], S[j]] = [S[j], S[i]]; }
    const out = new Uint8Array(data.length);
    for (let k = 0, i = 0, j = 0; k < data.length; k++) {
      i = (i + 1) & 255; j = (j + S[i]) & 255; [S[i], S[j]] = [S[j], S[i]];
      out[k] = data[k] ^ S[(S[i] + S[j]) & 255];
    }
    return out;
  }
  const cat = (...parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; parts.forEach(p => { out.set(p, o); o += p.length; }); return out; };
  const aesKey = (raw, use) => crypto.subtle.importKey('raw', raw, 'AES-CBC', false, [use]);
  async function aesDecrypt(key, data) { // data = IV + ciphertext, PKCS#7 padded
    if (data.length < 32 || data.length % 16) return new Uint8Array(0);
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv: data.subarray(0, 16) }, await aesKey(key, 'decrypt'), data.subarray(16)));
  }
  async function aesEncryptRaw(key, iv, data) { // no padding: drop the padding block WebCrypto adds
    const out = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, await aesKey(key, 'encrypt'), data));
    return out.subarray(0, data.length);
  }
  async function aesDecryptRaw(key, iv, data) { // no padding: append a block that decrypts to valid padding
    const pad = await aesEncryptRaw(key, data.subarray(data.length - 16), new Uint8Array(16).fill(16));
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, await aesKey(key, 'decrypt'), cat(data, pad)));
  }
  const sha = async (alg, u8) => new Uint8Array(await crypto.subtle.digest(alg, u8));
  async function hash2B(salt, rev) { // empty user password
    let K = await sha('SHA-256', salt);
    if (rev < 6) return K;
    for (let round = 0; ; round++) {
      const K1 = new Uint8Array(K.length * 64);
      for (let i = 0; i < 64; i++) K1.set(K, i * K.length);
      const E = await aesEncryptRaw(K.subarray(0, 16), K.subarray(16, 32), K1);
      const m = E.subarray(0, 16).reduce((x, y) => x + y, 0) % 3;
      K = await sha(['SHA-256', 'SHA-384', 'SHA-512'][m], E);
      if (round >= 63 && E[E.length - 1] <= round - 31) break;
    }
    return K.subarray(0, 32);
  }
  const PAD = bytesOf('\x28\xbf\x4e\x5e\x4e\x75\x8a\x41\x64\x00\x4e\x56\xff\xfa\x01\x08\x2e\x2e\x00\xb6\xd0\x68\x3e\x80\x2f\x0c\xa9\xfe\x64\x53\x69\x7a');
  /* Work out the decryption key for a PDF that opens without a password. Returns null if it needs one. */
  async function securityHandler(text, objs) {
    const ref = /\/Encrypt\s+(\d+)\s+\d+\s+R/.exec(text);
    const dict = ref ? objs.get(Number(ref[1])) : (/\/Encrypt\s*(<<[\s\S]*?>>)/.exec(text) || [])[1];
    if (!dict) return null;
    const get = name => { const m = new RegExp(`/${name}(?![A-Za-z])\\s*`).exec(dict); return m ? readValue(dict, m.index + m[0].length) : { value: '', kind: 'none' }; };
    const num = name => Number((new RegExp(`/${name}\\s+(-?\\d+)`).exec(dict) || [])[1]);
    if (!/\/Filter\s*\/Standard/.test(dict)) return null;
    const R = num('R'), V = num('V');
    const aes = /\/CFM\s*\/AESV2/.test(dict), aes256 = R >= 5 || /\/CFM\s*\/AESV3/.test(dict);
    if (aes256) {
      const U = bytesOf(get('U').value), UE = bytesOf(get('UE').value);
      if (U.length < 48 || UE.length < 32) return null;
      const check = await hash2B(U.subarray(32, 40), R);
      if (strOf(check) !== strOf(U.subarray(0, 32))) return null; // needs a password
      const fileKey = await aesDecryptRaw(await hash2B(U.subarray(40, 48), R), new Uint8Array(16), UE.subarray(0, 32));
      return { decrypt: async (data) => aesDecrypt(fileKey, data) };
    }
    const n = R === 2 ? 5 : V >= 4 ? 16 : Util.clamp((num('Length') || 40) / 8, 5, 16);
    const O = bytesOf(get('O').value).subarray(0, 32), U = bytesOf(get('U').value);
    const P = num('P') | 0;
    const id = (() => { const m = /\/ID\s*\[\s*/.exec(text); return m ? bytesOf(readValue(text, m.index + m[0].length).value) : new Uint8Array(0); })();
    const noMeta = R >= 4 && /\/EncryptMetadata\s+false/.test(dict);
    let key = md5(cat(PAD, O, Uint8Array.of(P & 255, (P >> 8) & 255, (P >> 16) & 255, (P >>> 24) & 255), id, noMeta ? Uint8Array.of(255, 255, 255, 255) : new Uint8Array(0))).subarray(0, n);
    if (R >= 3) for (let i = 0; i < 50; i++) key = md5(key).subarray(0, n);
    // Check the key against /U (empty password).
    if (R === 2 ? strOf(rc4(key, PAD)) !== strOf(U.subarray(0, 32)) : (() => {
      let x = rc4(key, md5(cat(PAD, id)));
      for (let i = 1; i <= 19; i++) x = rc4(key.map(b => b ^ i), x);
      return strOf(x) !== strOf(U.subarray(0, 16));
    })()) return null;
    return {
      decrypt: async (data, objNum, gen = 0) => {
        const k = md5(cat(key, Uint8Array.of(objNum & 255, (objNum >> 8) & 255, (objNum >> 16) & 255, gen & 255, (gen >> 8) & 255), aes ? bytesOf('sAlT') : new Uint8Array(0))).subarray(0, Math.min(n + 5, 16));
        return aes ? aesDecrypt(k, data) : rc4(k, data);
      },
      v: V,
    };
  }

  async function pdfFields(bytes) {
    const text = latin1(bytes);
    if (!text.startsWith('%PDF')) throw new Error('That file isn\'t a PDF.');
    const objs = new Map();      // number -> body text
    const packed = new Set();    // objects that came out of an object stream (their strings aren't encrypted separately)
    const streams = [];
    const re = /(\d+)\s+(\d+)\s+obj\b/g;
    let m;
    const starts = [];
    while ((m = re.exec(text))) starts.push([Number(m[1]), m.index + m[0].length]);
    for (let k = 0; k < starts.length; k++) {
      const [num, at] = starts[k];
      const end = text.indexOf('endobj', at);
      const body = text.slice(at, end < 0 ? (starts[k + 1] ? starts[k + 1][1] : text.length) : end);
      objs.set(num, body);
      if (/\/Type\s*\/ObjStm/.test(body)) streams.push([num, at, body]);
    }
    let sec = null;
    if (/\/Encrypt\s/.test(text)) {
      try { sec = await securityHandler(text, objs); } catch { sec = null; }
      if (!sec) return { fields: new Map(), encrypted: true };
    }
    // Object streams pack many objects into one compressed stream.
    for (const [num, at, body] of streams) {
      const s0 = body.search(/stream\r?\n/);
      if (s0 < 0) continue;
      const dataStart = at + s0 + body.slice(s0).match(/stream\r?\n/)[0].length;
      const len = Number((/\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(body.slice(0, s0)) || [])[1]);
      let dataEnd = len ? dataStart + len : text.indexOf('endstream', dataStart);
      if (!len) while (dataEnd > dataStart && /[\r\n]/.test(text[dataEnd - 1])) dataEnd--;
      let raw = bytes.subarray(dataStart, dataEnd);
      try {
        if (sec) raw = await sec.decrypt(raw, num);
        if (/\/FlateDecode/.test(body.slice(0, s0))) raw = await inflate(raw);
      } catch { continue; }
      const s = latin1(raw);
      const n = Number((/\/N\s+(\d+)/.exec(body) || [])[1] || 0);
      const first = Number((/\/First\s+(\d+)/.exec(body) || [])[1] || 0);
      const head = s.slice(0, first).trim().split(/\s+/).map(Number);
      for (let i = 0; i < n; i++) {
        const onum = head[i * 2], off = head[i * 2 + 1], next = i + 1 < n ? head[(i + 1) * 2 + 1] : s.length - first;
        objs.set(onum, s.slice(first + off, first + next));
        packed.add(onum);
      }
    }
    const textOf = async (v, num) => {
      if (v.kind !== 'text') return String(v.value ?? '');
      let raw = v.value;
      if (sec && !packed.has(num)) { try { raw = strOf(await sec.decrypt(bytesOf(raw), num)); } catch { raw = ''; } }
      return decodeText(raw);
    };
    const fields = new Map();
    for (const [num, body] of objs) {
      const tm = /\/T\s*(?=[(<])/.exec(body);
      if (!tm) continue;
      const name = await textOf(readValue(body, tm.index + tm[0].length), num);
      const vm = /\/V(?![A-Za-z])\s*/.exec(body);
      if (!name || !vm) continue;
      let v = readValue(body, vm.index + vm[0].length), from = num;
      if (v.kind === 'ref') { from = v.value; const o = objs.get(v.value); v = o ? readValue(o.trim(), 0) : { value: '', kind: 'none' }; }
      const value = (await textOf(v, from)).trim();
      if (!value) continue;
      if (!fields.has(name) || !fields.get(name)) fields.set(name, value);
    }
    return { fields, encrypted: false };
  }

  /* ---------- Turning sheet fields into a character ---------- */
  const key = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const ALIASES = {
    name: ['charactername', 'name', 'charname'],
    classlevel: ['classlevel', 'classandlevel', 'classlevel1', 'class'],
    background: ['background'],
    species: ['race', 'species', 'racespecies', 'speciesrace'],
    alignment: ['alignment'],
    xp: ['xp', 'experiencepoints', 'experience'],
    pb: ['profbonus', 'proficiencybonus', 'prof'],
    ac: ['ac', 'armorclass', 'armourclass'],
    speed: ['speed'],
    hpmax: ['hpmax', 'maxhp', 'hitpointmaximum', 'hpmaximum', 'maxhitpoints'],
    hpcur: ['hpcurrent', 'currenthp', 'currenthitpoints'],
    hptemp: ['hptemp', 'temphp', 'temporaryhitpoints'],
    hd: ['hdtotal', 'hd', 'hitdice', 'totalhitdice'],
    features: ['featuresandtraits', 'featurestraits', 'feattraits', 'features', 'featurestraits1', 'featurestraits2', 'featurestraits3', 'additionalfeaturestraits'],
    profs: ['proficiencieslang', 'proficienciesandlanguages', 'otherproficienciesandlanguages', 'proficiencies'],
    equipment: ['equipment', 'equipment1', 'equipment2', 'treasure'],
    attacksText: ['attacksspellcasting', 'attacksandspellcasting'],
    personality: ['personalitytraits'], ideals: ['ideals'], bonds: ['bonds'], flaws: ['flaws'],
    backstory: ['backstory', 'characterbackstory'], allies: ['allies', 'alliesorganizations', 'factionname'],
  };
  const SKILL_KEYS = {
    acrobatics: ['acrobatics'], animal: ['animal', 'animalhandling'], arcana: ['arcana'], athletics: ['athletics'],
    deception: ['deception'], history: ['history'], insight: ['insight'], intimidation: ['intimidation'],
    investigation: ['investigation'], medicine: ['medicine'], nature: ['nature'], perception: ['perception'],
    performance: ['performance'], persuasion: ['persuasion'], religion: ['religion'], sleight: ['sleightofhand', 'sleight'],
    stealth: ['stealth'], survival: ['survival'],
  };
  // The official fillable sheet marks proficiency with numbered check boxes.
  const OFFICIAL_SAVE_BOX = { str: 11, dex: 18, con: 19, int: 20, wis: 21, cha: 22 };
  const OFFICIAL_SKILL_BOX = Object.fromEntries(SKILL_ORDER.map((s, i) => [s, 23 + i]));

  function parseClassLevel(text) {
    const t = String(text || '');
    const found = CLASS_NAMES.filter(cn => new RegExp(`\\b${cn}\\b`, 'i').test(t));
    const nums = (t.match(/\b\d{1,2}\b/g) || []).map(Number).filter(n => n >= 1 && n <= 20);
    const level = nums.length ? Util.clamp(nums.reduce((a, b) => a + b, 0), 1, 20) : 1;
    let subclass = '';
    const paren = /\(([^)]+)\)/.exec(t);
    if (paren && !/\d/.test(paren[1])) subclass = paren[1].trim();
    return { className: found[0] || '', level, multi: found.length > 1 ? t.trim() : '', subclass };
  }

  function fromFields(fields) {
    const byKey = new Map();
    for (const [name, value] of fields) {
      const k = key(name);
      if (!byKey.has(k)) byKey.set(k, value);
    }
    const get = list => { for (const k of list) if (byKey.has(k)) return byKey.get(k); return ''; };
    const all = prefix => [...byKey.entries()].filter(([k]) => prefix.test(k)).map(([, v]) => v);
    let recognized = 0;
    const seen = v => { if (v !== '' && v != null) recognized++; return v; };

    const cl = parseClassLevel(seen(get(ALIASES.classlevel)));
    const abilities = {};
    ABIL.forEach(a => {
      const v = intOf(seen(get([a, ABIL_WORD[a], `${a}score`, `${ABIL_WORD[a]}score`])));
      if (v != null && v >= 1 && v <= 30) abilities[a] = v;
    });
    const pbField = intOf(get(ALIASES.pb));
    const pb = pbField != null && pbField >= 2 && pbField <= 6 ? pbField : pbFor(cl.level);
    const isOn = v => /^(yes|on|true|1|x|checked)$/i.test(String(v || '').trim());
    const box = n => isOn(get([`checkbox${n}`]));

    const saveProf = ABIL.filter(a => {
      const bonus = intOf(get([`st${ABIL_WORD[a]}`, `${a}save`, `${ABIL_WORD[a]}save`, `savingthrow${ABIL_WORD[a]}`]));
      const prof = isOn(get([`${a}saveprof`, `st${ABIL_WORD[a]}prof`])) || box(OFFICIAL_SAVE_BOX[a]);
      if (bonus != null) recognized++;
      return prof || (bonus != null && abilities[a] != null && bonus - modOf(abilities[a]) >= pb);
    });
    const skillProf = {};
    SKILL_ORDER.forEach(s => {
      const bonus = intOf(get(SKILL_KEYS[s]));
      if (bonus != null) recognized++;
      const a = SKILLS[s];
      let lvl = 0;
      if (bonus != null && abilities[a] != null) {
        const diff = bonus - modOf(abilities[a]);
        if (diff >= pb * 2) lvl = 2; else if (diff >= pb) lvl = 1;
      }
      if (!lvl && (isOn(get([`${SKILL_KEYS[s][0]}prof`])) || box(OFFICIAL_SKILL_BOX[s]))) lvl = 1;
      if (lvl) skillProf[s] = lvl;
    });

    const attacks = [];
    for (let i = 1; i <= 6; i++) {
      const name = get(i === 1 ? ['wpnname', 'wpnname1', 'weapon1name', 'attack1'] : [`wpnname${i}`, `weapon${i}name`, `attack${i}`]);
      if (!name) continue;
      recognized++;
      attacks.push({ name, bonus: intOf(get([`wpn${i}atkbonus`, `weapon${i}atkbonus`, `weapon${i}bonus`])) ?? 0, damage: get([`wpn${i}damage`, `weapon${i}damage`]).replace(/\s+/g, ' ').trim() });
    }

    // Spell names: the official sheet uses "Spells 1014"…, D&D Beyond "spellName0"…
    const spells = [...new Set(all(/^(spells\d+|spellname\d*|spell\d+name|cantrip\d+)$/).map(v => v.trim()).filter(v => v && v.length < 60))];
    recognized += spells.length ? 1 : 0;

    const joinAll = list => [...new Set(list.map(k => [...byKey.entries()].filter(([kk]) => kk === k).map(([, v]) => v)).flat().filter(Boolean))].join('\n\n');
    const money = ['cp', 'sp', 'ep', 'gp', 'pp'].map(c => [c, intOf(get([c]))]).filter(([, n]) => n);
    const notes = [
      ['Personality traits', get(ALIASES.personality)], ['Ideals', get(ALIASES.ideals)], ['Bonds', get(ALIASES.bonds)], ['Flaws', get(ALIASES.flaws)],
      ['Backstory', get(ALIASES.backstory)], ['Allies and organizations', get(ALIASES.allies)],
    ].filter(([, v]) => v).map(([h, v]) => `${h}: ${v}`);
    if (cl.multi) notes.unshift(`Classes on the sheet: ${cl.multi}`);
    const attacksText = get(ALIASES.attacksText);

    const sheet = {
      name: seen(get(ALIASES.name)), className: cl.className, subclass: cl.subclass, level: cl.level,
      species: seen(get(ALIASES.species)), background: seen(get(ALIASES.background)), alignment: get(ALIASES.alignment),
      xp: intOf(get(ALIASES.xp)) || 0, abilities, saveProf, skillProf,
      ac: intOf(seen(get(ALIASES.ac))), speed: intOf(get(ALIASES.speed)),
      hpMax: intOf(seen(get(ALIASES.hpmax))), hpCurrent: intOf(get(ALIASES.hpcur)), hpTemp: intOf(get(ALIASES.hptemp)),
      hitDice: get(ALIASES.hd), attacks, spells,
      features: joinAll(ALIASES.features), proficiencies: joinAll(ALIASES.profs),
      equipment: [joinAll(ALIASES.equipment), money.length ? `Coins: ${money.map(([c, n]) => `${n} ${c.toUpperCase()}`).join(', ')}` : ''].filter(Boolean).join('\n\n'),
      notes: [attacksText ? `From the attacks box: ${attacksText}` : '', ...notes].filter(Boolean).join('\n\n'),
    };
    recognized += Object.keys(abilities).length;
    return { sheet, recognized };
  }

  /* The common shape (from form fields or the AI) -> a Campaign Codex character. */
  function toCharacter(sheet) {
    const c = Character.blank();
    const lv = Util.clamp(Util.num(sheet.level, 1), 1, 20);
    c.name = String(sheet.name || '').slice(0, 80);
    c.className = CLASS_NAMES.find(n => n.toLowerCase() === String(sheet.className || '').toLowerCase()) || String(sheet.className || '');
    c.subclass = String(sheet.subclass || '');
    c.level = lv;
    c.species = String(sheet.species || '');
    c.background = String(sheet.background || '');
    c.alignment = String(sheet.alignment || '');
    c.xp = Util.num(sheet.xp, 0);
    ABIL.forEach(a => { const v = intOf(sheet.abilities && sheet.abilities[a]); if (v != null) c.abilities[a] = Util.clamp(v, 1, 30); });
    (sheet.saveProf || []).forEach(a => { if (a in c.saves) c.saves[a] = true; });
    Object.entries(sheet.skillProf || {}).forEach(([s, v]) => { if (s in c.skills) c.skills[s] = Util.clamp(Util.num(v, 0), 0, 2); });
    if (sheet.ac != null) c.ac = Util.clamp(Util.num(sheet.ac, 10), 1, 40);
    if (sheet.speed != null) c.speed = Util.clamp(Util.num(sheet.speed, 30), 0, 200);
    const max = Util.num(sheet.hpMax, 0);
    if (max > 0) c.hp = { max, current: sheet.hpCurrent != null && Util.num(sheet.hpCurrent, max) > 0 ? Util.num(sheet.hpCurrent, max) : max, temp: Util.num(sheet.hpTemp, 0) };
    c.hitDice = /^\d+d\d+/i.test(String(sheet.hitDice || '').trim()) ? String(sheet.hitDice).trim() : `${lv}d${HIT_DIE[c.className] || 8}`;
    const atks = (sheet.attacks || []).filter(a => a && a.name).slice(0, 12).map(a => ({ id: Util.uid(), name: String(a.name).slice(0, 60), bonus: Util.num(intOf(a.bonus), 0), damage: String(a.damage || '').slice(0, 40) }));
    if (atks.length) c.attacks = atks;
    c.features = String(sheet.features || '');
    c.proficiencies = String(sheet.proficiencies || '');
    c.equipment = String(sheet.equipment || '');
    c.notes = String(sheet.notes || '');
    // Spells: ones in the spell list go onto the Spells tab; others are added as homebrew spells.
    const list = [];
    (sheet.spells || []).forEach(raw => {
      const text = String(raw || '');
      const n = text.replace(/\s*\(.*\)\s*$/, '').trim();
      if (!n || list.some(e => e.n.toLowerCase() === n.toLowerCase())) return;
      const s = typeof SpellList !== 'undefined' && SpellList.byName(n);
      if (s) return list.push({ n: s.name, p: s.level ? 1 : 0 });
      const lvl = /cantrip/i.test(text) ? 0 : Util.clamp(Util.num((/(\d)/.exec(text.slice(n.length)) || [])[1], 1), 0, 9);
      list.push({ n: n.slice(0, 60), lvl, custom: true, p: lvl ? 1 : 0 });
    });
    c.spellbook = { list, used: {}, arcana: {}, pactUsed: 0 };
    if (sheet.spellNotes) c.notes = [c.notes, `Spell notes from the sheet:\n${String(sheet.spellNotes)}`].filter(Boolean).join('\n\n');
    c.spells = '';
    c.imported = { from: sheet._from || 'sheet', at: Date.now() };
    return c;
  }

  /* ---------- Reading with the AI (photos, scans, PDFs without fields) ---------- */
  function toBase64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
    return btoa(s);
  }
  async function shrinkImage(file) {
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch { throw new Error(`Couldn't open "${file.name}". Use a JPG or PNG photo (iPhone HEIC photos: share or export them as JPG first).`); }
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.85));
    return { type: 'image/jpeg', data: toBase64(new Uint8Array(await blob.arrayBuffer())) };
  }

  const AI_SYSTEM = [
    'You read photos, scans and PDFs of Dungeons & Dragons 5th edition character sheets and transcribe them.',
    'Copy only what is written on the sheet. Never invent or guess missing values; leave them out.',
    'Reply with one JSON object and nothing else. Inside text values, write line breaks as \\n.',
  ].join(' ');
  const AI_PROMPT = `Transcribe this character sheet into JSON with these keys (leave out any you can't read):
- "name", "className" (one of ${CLASS_NAMES.join(', ')}), "subclass", "level" (total character level, number), "species" (or race), "background", "alignment", "xp" (number)
- "abilities": {"str","dex","con","int","wis","cha"} as the ability SCORES (e.g. 16), not modifiers
- "saveProf": list of abilities with saving throw proficiency, e.g. ["str","con"]
- "skillProf": object of proficient skills: 1 = proficient, 2 = expertise. Skill keys: ${SKILL_ORDER.join(', ')}
- "ac", "speed" (feet), "hpMax", "hpCurrent", "hpTemp" (numbers), "hitDice" (e.g. "5d10")
- "attacks": list of {"name","bonus" (number),"damage" (e.g. "1d8+3 slashing")}
- "spells": list of spell names (cantrips and leveled), exactly as written
- "spellNotes": anything else on the spell page (spellcasting class, slots, notes)
- "features": features and traits, one per line as "Name: what it does" if written
- "proficiencies": armor, weapons, tools and languages
- "equipment": equipment and coins
- "notes": personality traits, ideals, bonds, flaws, backstory and anything else
If several pages are included, combine them. If the sheet lists more than one class, use the main one for "className" and put the full class list in "notes".`;

  async function readWithAI(files, opts) {
    const attachments = [];
    for (const f of files) {
      if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
        const buf = new Uint8Array(await f.arrayBuffer());
        if (buf.length > MAX_PDF) throw new Error('That PDF is too large for the AI (about 4 MB max). Try photos of the pages instead.');
        attachments.push({ type: 'application/pdf', data: toBase64(buf) });
      } else attachments.push(await shrinkImage(f));
    }
    const res = await AI.ask({ system: AI_SYSTEM, prompt: AI_PROMPT, provider: opts.provider, code: opts.code, meta: { action: 'import', kind: 'character sheet', request: files.map(f => f.name).join(', ').slice(0, 200) }, attachments });
    const raw = AI.parseJSON(res.text);
    const sheet = {
      ...raw,
      abilities: raw.abilities && typeof raw.abilities === 'object' ? raw.abilities : {},
      saveProf: Array.isArray(raw.saveProf) ? raw.saveProf.map(x => String(x).slice(0, 3).toLowerCase()) : [],
      skillProf: raw.skillProf && typeof raw.skillProf === 'object' ? Object.fromEntries(Object.entries(raw.skillProf).map(([k, v]) => [key(k).replace(/^sleightofhand$/, 'sleight').replace(/^animalhandling$/, 'animal'), v])) : {},
      attacks: Array.isArray(raw.attacks) ? raw.attacks : [],
      spells: Array.isArray(raw.spells) ? raw.spells : [],
      _from: 'ai',
    };
    return { sheet, truncated: Boolean(raw.__truncated), who: res.who };
  }

  /* ---------- The dialog ---------- */
  function pick() {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.json,application/json,.pdf,application/pdf,image/*';
      input.onchange = () => resolve([...input.files].slice(0, MAX_FILES));
      input.click();
    });
  }

  function summaryHTML(c, how) {
    const scores = ABIL.map(a => `<div><dt>${a.toUpperCase()}</dt><dd>${c.abilities[a]}</dd></div>`).join('');
    const skills = SKILL_ORDER.filter(s => c.skills[s]).map(s => (c.skills[s] === 2 ? `${s} (expertise)` : s)).join(', ');
    const saves = ABIL.filter(a => c.saves[a]).map(a => a.toUpperCase()).join(', ');
    const line = [c.species, c.className ? `${c.className} ${c.level}${c.subclass ? ` (${c.subclass})` : ''}` : `Level ${c.level}`, c.background].filter(Boolean).join(' · ');
    const nSpells = c.spellbook.list.length;
    const missing = [];
    if (!c.name) missing.push('name');
    if (!c.className) missing.push('class');
    if (!c.species) missing.push('species');
    return `<p class="imp-how ${how.ai ? 'ai' : ''}">${how.ai ? `Read by ${esc(how.provider)} from your ${esc(how.what)}. AI can misread handwriting or small print, so check everything below; you can edit it all on the sheet afterwards.` : 'Read straight from the PDF\'s form fields.'}${how.truncated ? ' The reply was cut short, so the end of the sheet (often notes or spells) may be missing.' : ''}</p>
      <div class="imp-card">
        <h3>${esc(c.name || 'Unnamed character')}</h3>
        <p class="muted">${esc(line || 'Class and species not found')}</p>
        <dl class="imp-scores">${scores}</dl>
        <dl class="imp-facts">
          <div><dt>AC</dt><dd>${c.ac}</dd></div><div><dt>HP</dt><dd>${c.hp.current} / ${c.hp.max}</dd></div><div><dt>Speed</dt><dd>${c.speed} ft</dd></div><div><dt>Hit dice</dt><dd>${esc(c.hitDice)}</dd></div>
        </dl>
        <p><b>Saving throws:</b> ${esc(saves || 'none marked')}</p>
        <p><b>Skills:</b> ${esc(skills || 'none marked')}</p>
        <p><b>Attacks:</b> ${esc(c.attacks.map(a => a.name).join(', ') || 'none')}</p>
        <p><b>Spells:</b> ${nSpells ? `${nSpells} found` : 'none found'}</p>
        <p><b>Features, proficiencies, equipment, notes:</b> ${[c.features && 'features', c.proficiencies && 'proficiencies', c.equipment && 'equipment', c.notes && 'notes'].filter(Boolean).join(', ') || 'none found'}</p>
        ${missing.length ? `<p class="imp-warn">Not found: ${esc(missing.join(', '))}. Fill these in on the sheet.</p>` : ''}
      </div>`;
  }

  /*
   * Run the whole import. done(character) is called with the character to add.
   * JSON files are handed back via onJSON so the existing upload keeps working.
   */
  async function start({ onJSON, done }) {
    const files = await pick();
    if (!files.length) return;
    if (files.length === 1 && (/\.json$/i.test(files[0].name) || files[0].type === 'application/json')) {
      try { return onJSON(JSON.parse(await files[0].text())); }
      catch { return Util.toast(`"${files[0].name}" isn't a valid character file.`, 'error'); }
    }
    if (files.some(f => /\.json$/i.test(f.name))) return Util.toast('Upload a character file (.json) on its own.', 'error');

    const host = document.createElement('div');
    host.className = 'modal-backdrop';
    host.innerHTML = `<div class="modal imp-modal" role="dialog" aria-modal="true" aria-labelledby="imp-title"><div data-ref="body"></div></div>`;
    document.body.appendChild(host);
    const body = host.querySelector('[data-ref="body"]');
    const close = () => { document.removeEventListener('keydown', onKey); host.remove(); };
    const onKey = e => { if (e.key === 'Escape' && !busy) close(); };
    document.addEventListener('keydown', onKey);
    let busy = false;
    const head = sub => `<header class="modal-head"><div><h2 id="imp-title">Import a character</h2><p class="muted">${sub}</p></div><button class="icon-btn" data-act="close" aria-label="Close">×</button></header>`;
    const what = files.length > 1 ? `${files.length} pictures` : (/\.pdf$/i.test(files[0].name) ? 'PDF' : 'picture');

    const showResult = (c, how) => {
      body.innerHTML = `${head(esc(files.map(f => f.name).join(', ')))}
        <div class="modal-body">${summaryHTML(c, how)}</div>
        <footer class="modal-foot"><span class="foot-hint"></span><button class="btn" data-act="close">Cancel</button><button class="btn btn-primary" data-act="add">Add this character</button></footer>`;
      body.querySelector('[data-act="add"]').onclick = () => { close(); done(c); };
    };

    // 1. A fillable PDF? Read its form fields.
    if (files.length === 1 && (/\.pdf$/i.test(files[0].name) || files[0].type === 'application/pdf')) {
      body.innerHTML = `${head('Reading the PDF…')}<div class="modal-body"><p class="ai-wait">Looking for the sheet's form fields…</p></div>`;
      try {
        const pdfBytes = new Uint8Array(await files[0].arrayBuffer());
        // A sheet downloaded from Campaign Codex carries the whole character inside it.
        const own = typeof SheetPDF !== 'undefined' && SheetPDF.readEmbedded(pdfBytes);
        if (own) { close(); return onJSON(own); }
        const { fields, encrypted } = await pdfFields(pdfBytes);
        if (encrypted) {
          close();
          return Util.toast('That PDF is locked with a password. Open it, save a copy without the password (or take photos of it), then upload that.', 'error');
        }
        const { sheet, recognized } = fromFields(fields);
        if (recognized >= 8 && (sheet.name || sheet.className || Object.keys(sheet.abilities).length >= 4)) {
          sheet._from = 'pdf';
          return showResult(toCharacter(sheet), { ai: false });
        }
      } catch (e) {
        if (/isn't a PDF/.test(e.message)) { close(); return Util.toast(e.message, 'error'); }
      }
    }

    // 2. Otherwise, the AI reads it.
    const st = await AI.status();
    const s = AI.settings();
    const pdf = files.some(f => /\.pdf$/i.test(f.name));
    const renderAsk = (error = '') => {
      if (!st.connected) {
        body.innerHTML = `${head('This one needs the AI to read it')}<div class="modal-body"><p>This ${what} doesn't have fillable form fields, so it has to be read by the AI, and the AI helper isn't reachable right now${st.error ? ` (${esc(st.error)})` : ''}.</p><p class="muted">You can still make the character with <b>Create a new character</b> and copy the details over.</p></div><footer class="modal-foot"><span class="foot-hint"></span><button class="btn" data-act="close">Close</button></footer>`;
        return;
      }
      if (!st.imports) {
        body.innerHTML = `${head('This one needs the AI to read it')}<div class="modal-body"><p>This ${what} doesn't have fillable form fields, so it has to be read by the AI. The site owner needs to update the AWS helper first (AI-SETUP.md, Part F).</p></div><footer class="modal-foot"><span class="foot-hint"></span><button class="btn" data-act="close">Close</button></footer>`;
        return;
      }
      const providers = st.providers.filter(p => !(pdf && p === 'openai'));
      if (!providers.length) {
        body.innerHTML = `${head('This one needs the AI to read it')}<div class="modal-body"><p>Reading PDFs needs Claude, which isn't switched on for this site. Upload photos of the pages instead.</p></div><footer class="modal-foot"><span class="foot-hint"></span><button class="btn" data-act="close">Close</button></footer>`;
        return;
      }
      const prov = providers.includes(s.provider) ? s.provider : providers[0];
      body.innerHTML = `${head(`${esc(what[0].toUpperCase() + what.slice(1))} without form fields: the AI will read it`)}
        <div class="modal-body"><section class="lu-section">
          <p>The AI reads the ${what} and fills in a sheet for you to check. Clear, well-lit photos work best; one picture per page, up to ${MAX_FILES}.</p>
          <div class="ai-opts">
            ${providers.length > 1 ? `<label class="field"><span>AI</span><select data-ref="provider">${providers.map(p => `<option value="${p}" ${p === prov ? 'selected' : ''}>${p === 'openai' ? 'ChatGPT' : 'Claude'}</option>`).join('')}</select></label>` : ''}
            ${st.needsCode ? `<label class="field"><span>Your AI access code</span><input data-ref="code" type="password" value="${esc(s.code || '')}" autocomplete="off" placeholder="From the site owner"></label>` : ''}
          </div>
          ${error ? `<p class="ai-error">${esc(error)}</p>` : ''}
        </section></div>
        <footer class="modal-foot"><span class="foot-hint muted">${pdf ? 'PDFs are read by Claude.' : ''}</span><button class="btn" data-act="close">Cancel</button><button class="btn btn-ai" data-act="read"><span aria-hidden="true">✦</span> Read it with AI</button></footer>`;
      body.querySelector('[data-act="read"]').onclick = async () => {
        const provider = body.querySelector('[data-ref="provider"]')?.value || prov;
        const code = body.querySelector('[data-ref="code"]')?.value.trim() || '';
        if (st.needsCode && !code) return renderAsk('Enter your AI access code. Ask the site owner if you don\'t have one.');
        AI.saveSettings({ provider, code });
        busy = true;
        body.innerHTML = `${head('Reading…')}<div class="modal-body"><p class="ai-wait">The AI is reading your ${what}. This can take up to a minute…</p></div>`;
        try {
          const out = await readWithAI(files, { provider, code });
          busy = false;
          showResult(toCharacter(out.sheet), { ai: true, provider: provider === 'openai' ? 'ChatGPT' : 'Claude', what, truncated: out.truncated });
        } catch (e) {
          busy = false;
          renderAsk(e.message || 'The AI couldn\'t read it. Try again, or try clearer photos.');
        }
      };
    };
    renderAsk();
    host.addEventListener('click', e => {
      if (busy) return;
      if (e.target === host || e.target.closest('[data-act="close"]')) close();
    });
  }

  return { start, pdfFields, fromFields, toCharacter, parseClassLevel };
})();
