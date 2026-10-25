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
  const CODE_LEN = 5;
  const FEED_MAX = 150;
  const SESSION_KEY = 'campaign-codex.room';

  const listeners = new Set();
  const mapListeners = new Set();   // battle map changes (guest)
  const pingListeners = new Set();
  const s = {
    mode: null,        // 'host' | 'guest' | null
    status: 'idle',    // idle | connecting | open | reconnecting | ended | error
    error: '',
    errorCode: '',
    campaignId: null,  // host: which campaign this room belongs to
    code: '',
    view: null,        // guest: last snapshot from the DM
    map: null,         // guest: the battle map as the DM shares it { base, tokens, mine, tiles }
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
  const mapEmit = type => mapListeners.forEach(fn => fn(type));
  const pingEmit = p => pingListeners.forEach(fn => fn(p));

  /* A lasting id for this player (per browser and test profile), so their token and turn follow them across reconnects. */
  function playerKey() {
    const k = 'campaign-codex.player-key' + Store.suffix;
    let v = '';
    try { v = localStorage.getItem(k) || ''; } catch { /* storage blocked */ }
    if (!v) { v = Util.uid() + Util.uid(); try { localStorage.setItem(k, v); } catch { /* ignore */ } }
    return v;
  }
  const emptyMap = () => ({ base: null, tokens: [], mine: [], tiles: new Map() });
  const clip = (v, n) => String(v ?? '').slice(0, n);
  const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LEN);

  function saveSession() {
    try {
      if (!s.mode) sessionStorage.removeItem(SESSION_KEY);
      else sessionStorage.setItem(SESSION_KEY, JSON.stringify({ mode: s.mode, code: s.code, me, shareRolls: s.shareRolls, campaignId: s.campaignId }));
    } catch { /* storage unavailable */ }
  }

  /* The hosted campaign's table-talk history. */
  function feedList() {
    const c = typeof Campaign !== 'undefined' && s.campaignId ? Campaign.byId(s.campaignId) : null;
    if (!c) return [];
    if (!Array.isArray(c.feed)) c.feed = [];
    return c.feed;
  }
  const fight = () => Campaign.combat(s.campaignId) || { round: 1, activeId: null, started: false, combatants: [] };

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
    taken: "Another room is using this campaign's code right now. Wait a minute and try again, or give this campaign a new code.",
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
    const feed = feedList();
    feed.push({ id: Util.uid(), time: Date.now(), ...item });
    if (feed.length > FEED_MAX) feed.splice(0, feed.length - FEED_MAX);
    Store.save();
  }

  function publicCombat() {
    const c = fight();
    // Creatures standing in fog on the shared battle map stay off the players' turn order too.
    const hidden = typeof Battlemap !== 'undefined' ? Battlemap.hiddenCombatants(s.campaignId) : new Set();
    return {
      started: c.started, round: c.round,
      list: c.combatants.filter(x => !hidden.has(x.id)).map(x => {
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
    const cp = Campaign.byId(s.campaignId);
    return {
      code: s.code,
      campaign: clip(cp && cp.name, 80),
      you: forId || null,
      players: [...players.values()].map(p => ({ id: p.id, name: p.name, character: p.character })),
      feed: feedList().slice(-100),
      combat: publicCombat(),
      known: Campaign.publicKnown(s.campaignId),
    };
  }

  let bcastTimer = null;
  function broadcast() {
    if (s.mode !== 'host' || s.status !== 'open') return;
    clearTimeout(bcastTimer);
    bcastTimer = setTimeout(() => {
      const mv = mapView();
      players.forEach(p => { p.conn.send({ t: 'state', state: snapshot(p.id) }); sendMap(p, mv); });
    }, 80);
  }

  /* ---------- Battle map (host) ---------- */
  function mapView() {
    try { return Battlemap.hostView(s.campaignId); }
    catch (e) { console.error(e); return null; }
  }
  /* Send a player what changed on the map: the squares they can see, the tokens in them, and picture tiles they don't have yet. */
  function sendMap(p, mv) {
    if (!mv) return;
    const mapId = mv.base ? mv.base.id : null;
    if (p.mapId !== mapId) { p.mapId = mapId; p.tiles.clear(); } // the player starts the new map with no tiles
    if (p.mapBase !== mv.baseKey) {
      p.mapBase = mv.baseKey;
      // Every so often both sides forget picture tiles that are no longer in use (the fog moved on).
      let prune = false;
      if (p.tiles.size > mv.tiles.length + 40) {
        const keep = new Set(mv.tiles.map(x => x.key));
        p.tiles.forEach(k => { if (!keep.has(k)) p.tiles.delete(k); });
        prune = true;
      }
      p.conn.send({ t: 'mapbase', base: mv.base, prune });
    }
    const mine = mv.mineFor(p.key);
    const tk = mv.tokKey + '|' + mine.join(',');
    if (p.mapTok !== tk) { p.mapTok = tk; p.conn.send({ t: 'maptok', tokens: mv.tokens, mine }); }
    mv.tiles.forEach(tile => {
      if (p.tiles.has(tile.key)) return;
      p.tiles.add(tile.key);
      Battlemap.tileData(tile.key).then(data => {
        if (data && players.get(p.id) === p) p.conn.send({ t: 'tile', key: tile.key, data });
        else if (!data) p.tiles.delete(tile.key);
      }).catch(() => p.tiles.delete(tile.key));
    });
  }
  function sharePing(ping) {
    pingEmit(ping);
    players.forEach(p => p.conn.send({ t: 'ping', ping }));
  }

  function combatChanged() {
    Store.save();
    window.dispatchEvent(new CustomEvent('codex:combat'));
    broadcast();
    emit();
  }

  function linkedCombatant(playerId) {
    return fight().combatants.find(x => x.playerId === playerId);
  }

  function addPlayerToCombat(p, initTotal) {
    const ch = p.character;
    const existing = linkedCombatant(p.id);
    if (existing) {
      existing.init = initTotal;
      if (fight().started) Combat.sortOrder(s.campaignId);
      return existing;
    }
    // Players who joined without a sheet still get a row; the DM can fill in HP and AC.
    const cb = ch
      ? Combat.add({ name: ch.name, kind: 'pc', initBonus: ch.initBonus, init: initTotal, hp: ch.hp.current, maxHp: ch.hp.max, ac: ch.ac }, s.campaignId)
      : Combat.add({ name: p.name, kind: 'pc', initBonus: 0, init: initTotal, hp: 0, maxHp: 0, ac: 10 }, s.campaignId);
    cb.playerId = p.id;
    if (p.key) cb.playerKey = p.key;
    return cb;
  }

  const rollFor = p => {
    const b = p.character ? p.character.initBonus : 0;
    return Dice.evaluate(`1d20${b >= 0 ? '+' : ''}${b}`).total;
  };

  /* DM: add one connected player to combat (initiative rolled for them). */
  function addPlayer(id) {
    const p = players.get(id);
    if (s.mode !== 'host' || !p || linkedCombatant(id)) return null;
    const cb = addPlayerToCombat(p, rollFor(p));
    combatChanged();
    return cb;
  }

  /* DM: take a player back out of combat. */
  function removePlayer(id) {
    const c = fight();
    const cb = linkedCombatant(id);
    if (s.mode !== 'host' || !cb) return;
    if (c.activeId === cb.id) {
      const i = c.combatants.indexOf(cb);
      const next = c.combatants[i + 1] || c.combatants[0];
      c.activeId = next && next.id !== cb.id ? next.id : null;
    }
    c.combatants = c.combatants.filter(x => x !== cb);
    combatChanged();
  }

  function onHostData(p, msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello': {
        p.name = clip(msg.name, 40).trim() || 'Player';
        p.character = sanitizeSummary(msg.character);
        p.key = clip(msg.key, 40).replace(/[^\w-]/g, '');
        // Back after a reconnect: their combat row and map token are theirs again.
        if (p.key) fight().combatants.forEach(cb => { if (cb.playerKey === p.key) cb.playerId = p.id; });
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
      case 'mapmove': {
        const err = Battlemap.playerMove(s.campaignId, p.key, clip(msg.id, 40), msg.x, msg.y);
        if (err) p.conn.send({ t: 'maperr', text: err });
        return; // a successful move saves, which shares it with everyone
      }
      case 'ping': {
        const now = Date.now();
        if (p.lastPing && now - p.lastPing < 500) return;
        p.lastPing = now;
        const ping = Battlemap.checkPing(s.campaignId, msg.x, msg.y, clip(msg.tokenId, 40));
        if (ping) sharePing({ ...ping, name: clip(p.character ? p.character.name : p.name, 40) });
        return;
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
    s.mode = 'host'; s.status = 'connecting'; s.error = ''; s.errorCode = ''; s.code = code; s.shareRolls = isResume ? s.shareRolls : false;
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
        const p = { id: conn.id, name: 'Player', character: null, conn, greeted: false, key: '', tiles: new Set(), mapId: null, mapBase: '', mapTok: '' };
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
        sendMap(p, mapView());
      },
      error(code2) {
        if (s.mode !== 'host') return;
        // Each campaign keeps its code. Right after a reload (or closing a tab) the old room can
        // stay registered for a little while, so wait for it to free up before giving up.
        if (code2 === 'taken' && attempts < (isResume ? 12 : 8)) {
          attempts++;
          s.status = 'reconnecting';
          emit();
          retryTimer = setTimeout(() => { net && net.close(); startHosting(code, isResume); }, 2500);
          return;
        }
        if (s.status === 'open' && code2 !== 'network') return; // a single player's problem
        s.status = 'error'; s.error = errText(code2); s.errorCode = code2;
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
          if (msg.t === 'mapbase' || msg.t === 'maptok' || msg.t === 'tile' || msg.t === 'maperr') onMapData(msg);
          if (msg.t === 'ping' && msg.ping) pingEmit(msg.ping);
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
    hostConn.send({ t: 'hello', name: me.name, character, key: playerKey() });
  }

  /* Guest: the DM shared part of the battle map. */
  function onMapData(msg) {
    if (!s.map) s.map = emptyMap();
    const m = s.map;
    if (msg.t === 'mapbase') {
      const b = msg.base && typeof msg.base === 'object' ? msg.base : null;
      if (!b || !m.base || m.base.id !== b.id) { m.tiles = new Map(); m.tokens = []; m.mine = []; }
      m.base = b;
      if (msg.prune) {
        const keep = new Set(b && b.image ? b.image.tiles.map(t => t.key) : []);
        [...m.tiles.keys()].forEach(k => { if (!keep.has(k)) m.tiles.delete(k); });
      }
    } else if (msg.t === 'maptok') {
      m.tokens = Array.isArray(msg.tokens) ? msg.tokens : [];
      m.mine = Array.isArray(msg.mine) ? msg.mine : [];
    } else if (msg.t === 'tile') {
      if (typeof msg.data === 'string' && /^data:image\/(webp|jpeg|png);/.test(msg.data)) m.tiles.set(String(msg.key), msg.data);
    } else if (msg.t === 'maperr') {
      Util.toast(clip(msg.text, 120), 'error');
    }
    mapEmit(msg.t);
  }

  /* ---------- Public API ---------- */
  /* DM: open the party room for one campaign, using that campaign's own code. */
  function host(campaignId) {
    const c = Campaign.byId(campaignId);
    if (!c) return;
    clearTimeout(retryTimer);
    if (net) net.close();
    players.clear();
    attempts = 0;
    s.campaignId = c.id;
    startHosting(c.roomCode, false);
  }

  /* DM: give the hosted campaign a fresh code (e.g. if someone else is using it). */
  function newCodeForCampaign() {
    const c = Campaign.byId(s.campaignId);
    if (!c) return;
    c.roomCode = Campaign.newRoomCode();
    Store.save();
    host(c.id);
  }

  function join(code, name, charId) {
    clearTimeout(retryTimer);
    if (net) net.close();
    const c = cleanCode(code);
    if (c.length !== CODE_LEN) { s.status = 'error'; s.error = `Room codes are ${CODE_LEN} characters long.`; s.mode = 'guest'; emit(); return; }
    me = { name: clip(name, 40).trim() || 'Player', charId: charId || null };
    s.view = null; s.map = null;
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
    s.mode = null; s.status = 'idle'; s.code = ''; s.view = null; s.map = null; s.error = ''; s.errorCode = ''; s.campaignId = null;
    saveSession();
    emit();
    mapEmit('left');
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
      if (linkedCombatant(p.id)) return;
      addPlayerToCombat(p, rollFor(p));
      n++;
    });
    if (n) combatChanged();
    return n;
  }

  function setShareRolls(v) { s.shareRolls = Boolean(v); saveSession(); emit(); }

  /* Player: ask the DM to move my token. */
  function mapMove(id, x, y) {
    if (s.mode === 'guest' && hostConn) hostConn.send({ t: 'mapmove', id, x, y });
  }
  /* Anyone: flash a spot (or a creature) on the map for the whole table. */
  function ping(x, y, tokenId) {
    if (s.mode === 'guest' && hostConn) { hostConn.send({ t: 'ping', x, y, tokenId: tokenId || null }); return; }
    if (s.mode === 'host') {
      const p = Battlemap.checkPing(s.campaignId, x, y, tokenId);
      if (p) sharePing({ ...p, name: 'DM', dm: true });
    }
  }

  /* Share dice rolls with the room. */
  Dice.listen(entry => {
    if (!s.shareRolls || s.status !== 'open') return;
    if (s.mode === 'host') { feedPush({ type: 'roll', from: 'DM', dm: true, roll: rollSummary(entry) }); broadcast(); emit(); }
    if (s.mode === 'guest' && hostConn) hostConn.send({ t: 'roll', roll: rollSummary(entry) });
  });

  /* Keep the room in step with saves (combat, campaign, character sheet). */
  let charTimer = null;
  let emitTimer = null;
  window.addEventListener('codex:save', () => {
    if (s.mode === 'host') {
      broadcast();
      clearTimeout(emitTimer);
      emitTimer = setTimeout(emit, 120); // keeps the DM's party list in step with the tracker
    }
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
    if (saved.mode === 'host' && Store.state.role === 'dm') {
      const c = Campaign.byId(saved.campaignId);
      if (c) { s.campaignId = c.id; startHosting(c.roomCode, true); }
    }
    if (saved.mode === 'guest' && Store.state.role === 'player' && saved.me) { me = saved.me; startJoining(saved.code, true); }
  }

  return {
    get state() { return s; },
    get players() { return [...players.values()].map(p => ({ id: p.id, key: p.key, name: p.name, character: p.character, inCombat: Boolean(linkedCombatant(p.id)) })); },
    get mapView() { return s.map; },
    onMap(fn) { mapListeners.add(fn); return () => mapListeners.delete(fn); },
    onPing(fn) { pingListeners.add(fn); return () => pingListeners.delete(fn); },
    mapMove, ping,
    get me() { return me; },
    feed: () => feedList(),
    snapshot,
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    host, newCodeForCampaign, join, leave, chat, rollInitiative, addPartyToCombat, addPlayer, removePlayer, setShareRolls, resume, cleanCode,
    CODE_LEN,
  };
})();
