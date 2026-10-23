'use strict';

/*
 * Party room networking.
 *
 * The DM's browser hosts the room; players connect straight to it with a 5-character code.
 * Connections use WebRTC through PeerJS (loaded from a CDN only when a room is used), so no
 * server or account is needed. The DM is the single source of truth: players send actions
 * (hello, chat, roll, character update, initiative) and the DM sends back a full snapshot.
 *
 * Add ?transport=local to the URL to use an in-browser stand-in (tabs on the same site),
 * which is how the room is tested without internet access.
 */
const Room = (() => {
  const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
  const PREFIX = 'campaign-codex-room-';
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I
  const CODE_LEN = 5;
  const FEED_MAX = 150;
  const SESSION_KEY = 'campaign-codex.room';

  const listeners = new Set();
  const s = {
    mode: null,        // 'host' | 'guest' | null
    status: 'idle',    // idle | connecting | open | reconnecting | ended | error
    error: '',
    code: '',
    view: null,        // guest: last snapshot from the DM
    shareRolls: true,
  };
  let net = null;       // active transport handle
  const players = new Map(); // host: connId -> { id, name, character, conn }
  let hostConn = null;  // guest: connection to DM
  let me = null;        // guest: { name, charId }
  let retryTimer = null;
  let attempts = 0;

  /* ---------- Small helpers ---------- */
  const emit = () => listeners.forEach(fn => fn());
  const clip = (v, n) => String(v ?? '').slice(0, n);
  function newCode() {
    const buf = new Uint32Array(CODE_LEN);
    crypto.getRandomValues(buf);
    return Array.from(buf, x => CODE_CHARS[x % CODE_CHARS.length]).join('');
  }
  const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);

  function saveSession() {
    try {
      if (!s.mode) sessionStorage.removeItem(SESSION_KEY);
      else sessionStorage.setItem(SESSION_KEY, JSON.stringify({ mode: s.mode, code: s.code, me, shareRolls: s.shareRolls }));
    } catch { /* storage unavailable */ }
  }

  function roomData() {
    return (Store.state.room ||= { feed: [] });
  }

  /* ---------- Transports ---------- */
  function loadPeerJS() {
    if (window.Peer) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = PEERJS_URL;
      tag.onload = () => (window.Peer ? resolve() : reject(new Error('lib')));
      tag.onerror = () => reject(new Error('lib'));
      document.head.appendChild(tag);
    });
  }

  function wrapPeerConn(c) {
    return {
      id: c.peer,
      send(d) { if (c.open) c.send(d); },
      onData(fn) { c.on('data', fn); },
      onClose(fn) { let done = false; const once = () => { if (!done) { done = true; fn(); } }; c.on('close', once); c.on('error', once); },
      close() { c.close(); },
    };
  }

  const PeerTransport = {
    async host(code, h) {
      await loadPeerJS();
      const peer = new window.Peer(PREFIX + code);
      peer.on('open', () => h.open());
      peer.on('connection', c => c.on('open', () => h.connection(wrapPeerConn(c))));
      peer.on('error', e => h.error(e.type === 'unavailable-id' ? 'taken' : (e.type || 'network')));
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
      return { close() { peer.destroy(); } };
    },
    async join(code, h) {
      await loadPeerJS();
      const peer = new window.Peer();
      peer.on('open', () => {
        const c = peer.connect(PREFIX + code, { reliable: true });
        c.on('open', () => h.open(wrapPeerConn(c)));
      });
      peer.on('error', e => h.error(e.type === 'peer-unavailable' ? 'no-room' : (e.type || 'network')));
      return { close() { peer.destroy(); } };
    },
  };

  /* In-browser stand-in using BroadcastChannel; only for testing (?transport=local). */
  const LocalTransport = (() => {
    const myId = 'local-' + Math.random().toString(36).slice(2, 10);
    let channel = null;
    const handlers = new Set();
    function ch() {
      if (!channel) {
        channel = new BroadcastChannel('campaign-codex-local-net');
        channel.onmessage = ev => handlers.forEach(fn => fn(ev.data));
      }
      return channel;
    }
    function conn(peerId, room) {
      const dataFns = [], closeFns = [];
      const c = {
        id: peerId, open: true,
        send(d) { if (c.open) ch().postMessage({ kind: 'data', room, from: myId, to: peerId, data: d }); },
        onData(fn) { dataFns.push(fn); },
        onClose(fn) { closeFns.push(fn); },
        close() { if (!c.open) return; c.open = false; ch().postMessage({ kind: 'bye', room, from: myId, to: peerId }); },
        _data(d) { dataFns.forEach(fn => fn(d)); },
        _closed() { if (!c.open) return; c.open = false; closeFns.forEach(fn => fn()); },
      };
      return c;
    }
    return {
      async host(code, h) {
        const conns = new Map();
        const fn = m => {
          if (m.room !== code) return;
          if (m.kind === 'hello') {
            const c = conn(m.from, code);
            conns.set(m.from, c);
            ch().postMessage({ kind: 'welcome', room: code, from: myId, to: m.from });
            h.connection(c);
          } else if (m.to === myId && conns.has(m.from)) {
            if (m.kind === 'data') conns.get(m.from)._data(m.data);
            if (m.kind === 'bye') { conns.get(m.from)._closed(); conns.delete(m.from); }
          }
        };
        handlers.add(fn);
        ch();
        setTimeout(() => h.open(), 30);
        const unload = () => conns.forEach(c => c.close());
        window.addEventListener('pagehide', unload);
        return { close() { conns.forEach(c => c.close()); handlers.delete(fn); window.removeEventListener('pagehide', unload); } };
      },
      async join(code, h) {
        let c = null;
        const fn = m => {
          if (m.room !== code || m.to !== myId) return;
          if (m.kind === 'welcome' && !c) { clearTimeout(t); c = conn(m.from, code); h.open(c); }
          else if (c && m.kind === 'data') c._data(m.data);
          else if (c && m.kind === 'bye') c._closed();
        };
        handlers.add(fn);
        ch().postMessage({ kind: 'hello', room: code, from: myId });
        const t = setTimeout(() => { if (!c) h.error('no-room'); }, 1500);
        const unload = () => c && c.close();
        window.addEventListener('pagehide', unload);
        return { close() { if (c) c.close(); handlers.delete(fn); window.removeEventListener('pagehide', unload); } };
      },
    };
  })();

  const transport = () => (/[?&]transport=local\b/.test(location.search) ? LocalTransport : PeerTransport);

  const ERRORS = {
    'no-room': "No room is open with that code. Check the code with your DM, and make sure their Party room page is open.",
    taken: 'That room code is busy. Try hosting again.',
    lib: "Couldn't load the connection library. Check your internet connection and try again.",
    timeout: "Couldn't reach the room. Check the code and your internet connection, then try again.",
    'browser-incompatible': "This browser can't make direct connections. Try a recent Chrome, Edge, Firefox or Safari.",
    network: 'Lost the connection to the room server. Check your internet connection.',
  };
  const errText = code => ERRORS[code] || `Connection problem (${code}). Try again in a moment.`;

  /* ---------- Character summary shared with the room ---------- */
  function summary(charId) {
    const c = Store.state.characters.find(x => x.id === charId);
    if (!c) return null;
    const mod = v => Math.floor((Util.num(v, 10) - 10) / 2);
    const lvl = Util.clamp(Util.num(c.level, 1), 1, 20);
    const pb = 2 + Math.floor((lvl - 1) / 4);
    return {
      name: clip(c.name || 'Unnamed character', 60),
      className: clip(c.className, 40), subclass: clip(c.subclass, 60), level: lvl, species: clip(c.species, 60),
      hp: { current: Util.num(c.hp.current, 0), max: Util.num(c.hp.max, 0), temp: Util.num(c.hp.temp, 0) },
      ac: Util.num(c.ac, 10),
      initBonus: Character.initBonus(c),
      passive: 10 + mod(c.abilities.wis) + Util.num(c.skills.perception, 0) * pb,
    };
  }

  function sanitizeSummary(x) {
    if (!x || typeof x !== 'object') return null;
    return {
      name: clip(x.name, 60), className: clip(x.className, 40), subclass: clip(x.subclass, 60),
      level: Util.clamp(Util.num(x.level, 1), 1, 20), species: clip(x.species, 60),
      hp: { current: Util.num(x.hp && x.hp.current, 0), max: Util.num(x.hp && x.hp.max, 0), temp: Util.num(x.hp && x.hp.temp, 0) },
      ac: Util.num(x.ac, 10), initBonus: Util.num(x.initBonus, 0), passive: Util.num(x.passive, 10),
    };
  }

  function rollSummary(r) {
    return { label: clip(r.label || r.expr, 80), expr: clip(r.expr, 60), total: Util.num(r.total, 0), nat: r.nat === 20 || r.nat === 1 ? r.nat : null, mode: r.mode === 'adv' || r.mode === 'dis' ? r.mode : null };
  }

  /* ---------- Host ---------- */
  function feedPush(item) {
    const feed = roomData().feed;
    feed.push({ id: Util.uid(), time: Date.now(), ...item });
    if (feed.length > FEED_MAX) feed.splice(0, feed.length - FEED_MAX);
    Store.save();
  }

  function publicCombat() {
    const c = Store.state.combat;
    return {
      started: c.started, round: c.round,
      list: c.combatants.map(x => {
        const pct = x.maxHp > 0 ? Util.clamp(x.hp / x.maxHp, 0, 1) : 1;
        const isEnemy = x.kind === 'enemy';
        let hpText;
        if (isEnemy) hpText = x.maxHp > 0 && x.hp <= 0 ? 'Down' : pct <= 0.5 ? 'Bloodied' : 'Healthy';
        else hpText = `${x.hp} / ${x.maxHp}`;
        return { id: x.id, name: x.name, kind: x.kind, init: x.init, hpText, pct: isEnemy ? null : Math.round(pct * 100), down: x.maxHp > 0 && x.hp <= 0, conditions: x.conditions.slice(0, 20), active: c.started && c.activeId === x.id, playerId: x.playerId || null };
      }),
    };
  }

  function snapshot(forId) {
    const cp = Store.state.campaign;
    return {
      code: s.code,
      campaign: clip(cp && cp.name, 80),
      you: forId || null,
      players: [...players.values()].map(p => ({ id: p.id, name: p.name, character: p.character })),
      feed: roomData().feed.slice(-100),
      combat: publicCombat(),
      known: typeof Campaign !== 'undefined' ? Campaign.publicKnown() : [],
    };
  }

  let bcastTimer = null;
  function broadcast() {
    if (s.mode !== 'host' || s.status !== 'open') return;
    clearTimeout(bcastTimer);
    bcastTimer = setTimeout(() => {
      players.forEach(p => p.conn.send({ t: 'state', state: snapshot(p.id) }));
    }, 80);
  }

  function combatChanged() {
    Store.save();
    window.dispatchEvent(new CustomEvent('codex:combat'));
    broadcast();
    emit();
  }

  function linkedCombatant(playerId) {
    return Store.state.combat.combatants.find(x => x.playerId === playerId);
  }

  function addPlayerToCombat(p, initTotal) {
    const ch = p.character;
    if (!ch) return null;
    const existing = linkedCombatant(p.id);
    if (existing) {
      existing.init = initTotal;
      if (Store.state.combat.started) Combat.sortOrder();
      return existing;
    }
    const cb = Combat.add({ name: ch.name, kind: 'pc', initBonus: ch.initBonus, init: initTotal, hp: ch.hp.current, maxHp: ch.hp.max, ac: ch.ac });
    cb.playerId = p.id;
    return cb;
  }

  function onHostData(p, msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello': {
        p.name = clip(msg.name, 40).trim() || 'Player';
        p.character = sanitizeSummary(msg.character);
        if (!p.greeted) { p.greeted = true; feedPush({ type: 'system', text: `${p.name} joined the room.` }); }
        break;
      }
      case 'char': {
        p.character = sanitizeSummary(msg.character);
        const cb = linkedCombatant(p.id);
        if (cb && p.character) {
          cb.hp = p.character.hp.current; cb.maxHp = p.character.hp.max; cb.ac = p.character.ac; cb.name = p.character.name;
          combatChanged();
          return;
        }
        break;
      }
      case 'chat': {
        const text = clip(msg.text, 500).trim();
        if (text) feedPush({ type: 'chat', from: p.name, text });
        break;
      }
      case 'roll': {
        feedPush({ type: 'roll', from: p.character ? p.character.name : p.name, roll: rollSummary(msg.roll || {}) });
        break;
      }
      case 'init': {
        if (!p.character) return;
        addPlayerToCombat(p, Util.num(msg.total, 10));
        combatChanged();
        return;
      }
      default: return;
    }
    broadcast();
    emit();
  }

  function startHosting(code, isResume) {
    s.mode = 'host'; s.status = 'connecting'; s.error = ''; s.code = code; s.shareRolls = isResume ? s.shareRolls : false;
    saveSession();
    emit();
    transport().host(code, {
      open() {
        attempts = 0;
        s.status = 'open';
        if (!isResume) feedPush({ type: 'system', text: `Room ${code} is open.` });
        saveSession();
        emit();
      },
      connection(conn) {
        const p = { id: conn.id, name: 'Player', character: null, conn, greeted: false };
        players.set(conn.id, p);
        conn.onData(msg => onHostData(p, msg));
        conn.onClose(() => {
          if (!players.has(conn.id)) return;
          players.delete(conn.id);
          if (p.greeted) feedPush({ type: 'system', text: `${p.name} left the room.` });
          broadcast();
          emit();
        });
        conn.send({ t: 'state', state: snapshot(conn.id) });
      },
      error(code2) {
        if (s.mode !== 'host') return;
        // After a page reload the old room may still be registered for a few seconds.
        if (code2 === 'taken' && isResume && attempts < 12) {
          attempts++;
          s.status = 'reconnecting';
          emit();
          retryTimer = setTimeout(() => { net && net.close(); startHosting(code, true); }, 2500);
          return;
        }
        if (code2 === 'taken' && !isResume) { net && net.close(); return startHosting(newCode(), false); }
        if (s.status === 'open' && code2 !== 'network') return; // a single player's problem
        s.status = 'error'; s.error = errText(code2);
        emit();
      },
    }).then(h => { net = h; }).catch(e => { s.status = 'error'; s.error = errText(e.message === 'lib' ? 'lib' : 'network'); emit(); });
  }

  /* ---------- Guest ---------- */
  function startJoining(code, isRetry) {
    s.mode = 'guest'; s.code = code; s.error = '';
    s.status = isRetry ? 'reconnecting' : 'connecting';
    saveSession();
    emit();
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      net && net.close();
      fail('timeout');
    }, 20000);
    function fail(code2) {
      if (s.mode !== 'guest') return;
      if (isRetry && attempts < 20) { attempts++; retryTimer = setTimeout(() => startJoining(code, true), 3000); return; }
      s.status = 'error'; s.error = errText(code2);
      s.mode = null; saveSession(); s.mode = 'guest';
      emit();
    }
    transport().join(code, {
      open(conn) {
        if (settled && s.status === 'error') { conn.close(); return; }
        settled = true; clearTimeout(timeout);
        attempts = 0;
        hostConn = conn;
        s.status = 'open';
        conn.onData(msg => {
          if (!msg || typeof msg !== 'object') return;
          if (msg.t === 'state') { s.view = msg.state; emit(); }
          if (msg.t === 'closed') { s.status = 'ended'; s.view = null; hostConn = null; net && net.close(); s.mode = null; saveSession(); s.mode = 'guest'; emit(); }
        });
        conn.onClose(() => {
          if (hostConn !== conn || s.mode !== 'guest' || s.status === 'ended') return;
          hostConn = null;
          s.status = 'reconnecting';
          emit();
          net && net.close();
          retryTimer = setTimeout(() => startJoining(code, true), 2000);
        });
        sendHello();
        emit();
      },
      error(code2) {
        if (settled && s.status === 'open') return;
        settled = true; clearTimeout(timeout);
        fail(code2);
      },
    }).then(h => { net = h; }).catch(e => { clearTimeout(timeout); fail(e.message === 'lib' ? 'lib' : 'network'); });
  }

  let lastSent = '';
  function sendHello() {
    if (!hostConn) return;
    const character = me.charId ? summary(me.charId) : null;
    lastSent = JSON.stringify(character);
    hostConn.send({ t: 'hello', name: me.name, character });
  }

  /* ---------- Public API ---------- */
  function host() {
    clearTimeout(retryTimer);
    if (net) net.close();
    players.clear();
    attempts = 0;
    startHosting(newCode(), false);
  }

  function join(code, name, charId) {
    clearTimeout(retryTimer);
    if (net) net.close();
    const c = cleanCode(code);
    if (c.length !== CODE_LEN) { s.status = 'error'; s.error = `Room codes are ${CODE_LEN} characters long.`; s.mode = 'guest'; emit(); return; }
    me = { name: clip(name, 40).trim() || 'Player', charId: charId || null };
    s.view = null;
    s.shareRolls = true;
    attempts = 0;
    startJoining(c, false);
  }

  function leave() {
    clearTimeout(retryTimer);
    if (s.mode === 'host') {
      players.forEach(p => p.conn.send({ t: 'closed' }));
      feedPush({ type: 'system', text: 'The room was closed.' });
    }
    const handle = net;
    setTimeout(() => handle && handle.close(), 150);
    net = null; hostConn = null; players.clear();
    s.mode = null; s.status = 'idle'; s.code = ''; s.view = null; s.error = '';
    saveSession();
    emit();
  }

  function chat(text) {
    const t = clip(text, 500).trim();
    if (!t) return;
    if (s.mode === 'host' && s.status === 'open') { feedPush({ type: 'chat', from: 'DM', dm: true, text: t }); broadcast(); emit(); }
    if (s.mode === 'guest' && hostConn) hostConn.send({ t: 'chat', text: t });
  }

  function rollInitiative() {
    if (s.mode !== 'guest' || !hostConn || !me.charId) return;
    const c = Store.state.characters.find(x => x.id === me.charId);
    if (!c) return;
    const b = Character.initBonus(c);
    const r = Dice.roll(`1d20${b >= 0 ? '+' : ''}${b}`, 'Initiative');
    if (r) hostConn.send({ t: 'init', total: r.total });
  }

  function addPartyToCombat() {
    if (s.mode !== 'host') return 0;
    let n = 0;
    players.forEach(p => {
      if (!p.character || linkedCombatant(p.id)) return;
      const b = p.character.initBonus;
      addPlayerToCombat(p, Dice.evaluate(`1d20${b >= 0 ? '+' : ''}${b}`).total);
      n++;
    });
    if (n) combatChanged();
    return n;
  }

  function setShareRolls(v) { s.shareRolls = Boolean(v); saveSession(); emit(); }

  /* Share dice rolls with the room. */
  Dice.listen(entry => {
    if (!s.shareRolls || s.status !== 'open') return;
    if (s.mode === 'host') { feedPush({ type: 'roll', from: 'DM', dm: true, roll: rollSummary(entry) }); broadcast(); emit(); }
    if (s.mode === 'guest' && hostConn) hostConn.send({ t: 'roll', roll: rollSummary(entry) });
  });

  /* Keep the room in step with saves (combat, campaign, character sheet). */
  let charTimer = null;
  window.addEventListener('codex:save', () => {
    if (s.mode === 'host') broadcast();
    if (s.mode === 'guest' && hostConn && me && me.charId) {
      clearTimeout(charTimer);
      charTimer = setTimeout(() => {
        const character = summary(me.charId);
        const json = JSON.stringify(character);
        if (json !== lastSent) { lastSent = json; hostConn.send({ t: 'char', character }); }
      }, 400);
    }
  });

  /* Pick up where we left off after a page reload. */
  function resume() {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { /* ignore */ }
    if (!saved || !saved.code) return;
    s.shareRolls = saved.shareRolls !== false;
    if (saved.mode === 'host' && Store.state.role === 'dm') startHosting(saved.code, true);
    if (saved.mode === 'guest' && Store.state.role === 'player' && saved.me) { me = saved.me; startJoining(saved.code, true); }
  }

  return {
    get state() { return s; },
    get players() { return [...players.values()].map(p => ({ id: p.id, name: p.name, character: p.character })); },
    get me() { return me; },
    feed: () => roomData().feed,
    snapshot,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    host, join, leave, chat, rollInitiative, addPartyToCombat, setShareRolls, resume, cleanCode,
    CODE_LEN,
  };
})();
