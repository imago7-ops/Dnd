'use strict';

/* Party room page: the DM hosts (combat tracker, party, chat), players join with a code. */
const Party = (() => {
  const esc = Util.esc;

  function timeAgo(t) {
    const d = new Date(t);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function feedHTML(feed, myName) {
    if (!feed.length) return '<li class="feed-empty">Chat and shared rolls show up here.</li>';
    return feed.map(item => {
      const mine = item.from && myName && item.from === myName;
      if (item.type === 'system') return `<li class="feed-system">${esc(item.text)}</li>`;
      if (item.type === 'chat') {
        return `<li class="feed-chat ${item.dm ? 'from-dm' : ''} ${mine ? 'mine' : ''}">
          <span class="feed-from">${esc(item.from)}</span><span class="feed-time">${timeAgo(item.time)}</span>
          <p>${esc(item.text)}</p></li>`;
      }
      if (item.type === 'roll') {
        const r = item.roll || {};
        const tone = r.nat === 20 ? 'crit' : r.nat === 1 ? 'fumble' : '';
        const mode = r.mode === 'adv' ? ' with advantage' : r.mode === 'dis' ? ' with disadvantage' : '';
        return `<li class="feed-roll ${item.dm ? 'from-dm' : ''}">
          <span class="feed-roll-text"><b>${esc(item.from)}</b> rolled ${esc(r.label)}<small>${esc(r.expr)}${mode}</small></span>
          <span class="feed-total ${tone}">${esc(r.total)}</span></li>`;
      }
      return '';
    }).join('');
  }

  function partyHTML(players, youId, isDM) {
    if (!players.length) return '<p class="muted small">No one has joined yet.</p>';
    return `<ul class="party-list">${players.map(p => {
      const c = p.character;
      const pct = c && c.hp.max > 0 ? Util.clamp(c.hp.current / c.hp.max, 0, 1) * 100 : 0;
      return `<li class="party-member ${p.id === youId ? 'you' : ''}">
        <div class="pm-top">
          <span class="pm-name">${esc(c ? c.name : p.name)}${p.id === youId ? ' <small>(you)</small>' : ''}</span>
          ${c ? `<span class="pm-ac" title="Armor class">AC ${c.ac}</span>` : ''}
        </div>
        ${c ? `<div class="pm-sub">${esc([c.species, c.className && `${c.className} ${c.level}`].filter(Boolean).join(' '))}${c.name !== p.name ? `, played by ${esc(p.name)}` : ''}</div>
        <div class="pm-hp"><div class="hp-bar small"><div class="hp-fill" style="width:${pct}%" data-low="${pct <= 25}"></div></div>
          <span>${c.hp.current} / ${c.hp.max}${c.hp.temp ? ` +${c.hp.temp}` : ''} HP</span><span class="muted">Passive ${c.passive}</span></div>`
        : '<div class="pm-sub">No character sheet shared</div>'}
        ${isDM ? `<div class="pm-actions">${p.inCombat
          ? '<span class="pm-in">In combat</span><button class="link-btn" data-act="remove-player" data-id="' + esc(p.id) + '">Remove</button>'
          : '<button class="btn btn-small" data-act="add-player" data-id="' + esc(p.id) + '">Add to combat</button>'}</div>` : ''}
      </li>`;
    }).join('')}</ul>`;
  }

  function knownHTML(known) {
    if (!known.length) return '<p class="muted small">Nothing yet. The DM reveals things as you discover them.</p>';
    return known.map(sec => `
      <details class="known-sec" style="--c:${sec.color}" open>
        <summary><span class="swatch"></span>${esc(sec.label)} <span class="count">${sec.entries.length}</span></summary>
        <ul>${sec.entries.map(e => `<li>
          <b>${esc(e.name)}</b>
          ${e.fields.length ? `<dl>${e.fields.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
        </li>`).join('')}</ul>
      </details>`).join('');
  }

  function playerCombatHTML(combat, youId) {
    if (!combat || !combat.list.length) return '<p class="muted small">No fight right now. When the DM starts combat, the turn order shows here.</p>';
    return `
      <p class="pc-status">${combat.started ? `Round <b>${combat.round}</b>${combat.list.find(x => x.active) ? `: <b>${esc(combat.list.find(x => x.active).name)}</b>'s turn` : ''}` : 'Combat is being set up.'}</p>
      <ol class="pc-order">${combat.list.map(x => `
        <li class="pc-row kind-${x.kind} ${x.active ? 'active' : ''} ${x.down ? 'down' : ''} ${x.playerId && x.playerId === youId ? 'you' : ''}">
          <span class="pc-init">${esc(x.init)}</span>
          <span class="pc-name">${esc(x.name)}${x.playerId && x.playerId === youId ? ' <small>(you)</small>' : ''}</span>
          <span class="pc-hp ${x.pct === null ? 'word' : ''}">${x.pct !== null ? `<span class="hp-bar small"><span class="hp-fill" style="width:${x.pct}%" data-low="${x.pct <= 25}"></span></span>` : ''}${esc(x.hpText)}</span>
          <span class="pc-conds">${x.conditions.map(c => `<span class="cond static">${esc(c)}</span>`).join('')}</span>
        </li>`).join('')}</ol>`;
  }

  function chatBox(share, label) {
    return `
      <form class="chat-form" data-ref="chat" autocomplete="off">
        <input data-ref="chatText" maxlength="500" placeholder="Message the party" aria-label="Chat message">
        <button class="btn" type="submit">Send</button>
      </form>
      <label class="share-toggle"><input type="checkbox" data-ref="share" ${share ? 'checked' : ''}> ${label}</label>`;
  }

  /* ---------- Page ---------- */
  function mount(el) {
    const isDM = Store.state.role === 'dm';
    let off = null;
    let lastLayout = '';

    function layoutKey() {
      const st = Room.state;
      if (!st.mode) return 'idle';
      if (st.mode === 'guest' && (st.status !== 'open' && st.status !== 'reconnecting')) return 'joining';
      return 'room';
    }

    function render() {
      if (!el.isConnected) { off && off(); return; }
      const key = layoutKey() + (isDM ? '-dm' : '-pl');
      if (key !== lastLayout) { lastLayout = key; build(); }
      update();
    }

    function build() {
      const st = Room.state;
      if (isDM) {
        if (!st.mode) {
          const camps = Campaign.list();
          const pick = Campaign.activeId();
          el.innerHTML = camps.length ? `
            <div class="room-intro">
              <h1>Party room</h1>
              <p class="lede">Host a room for one of your campaigns and give your players its code. They join from their own computers and see the turn order, what they've discovered, the party's rolls and the chat. The combat tracker lives here too.</p>
              <form class="join-form panel" data-ref="hostForm">
                <label class="field"><span>Campaign</span>
                  <select data-ref="hostCampaign">
                    ${camps.map(c => `<option value="${c.id}" ${c.id === pick ? 'selected' : ''}>${esc(c.name || 'Untitled campaign')}</option>`).join('')}
                  </select>
                </label>
                <p class="host-code">Players join with code <b data-ref="hostCode"></b>. It stays the same for this campaign every session.</p>
                <button class="btn btn-primary btn-lg" type="submit">Host this campaign's room</button>
              </form>
              <p class="muted small">Your browser runs the room, so keep this tab open while you play. You can host just for yourself to use the combat tracker.</p>
            </div>` : `
            <div class="room-intro">
              <h1>Party room</h1>
              <p class="lede">Each party room belongs to a campaign, with its own code, combat tracker and chat. Create a campaign first.</p>
              <a class="btn btn-primary btn-lg" href="#/campaign">Go to Campaigns</a>
            </div>`;
          const sel = el.querySelector('[data-ref="hostCampaign"]');
          if (sel) {
            const showCode = () => { el.querySelector('[data-ref="hostCode"]').textContent = Campaign.byId(sel.value).roomCode; };
            sel.addEventListener('change', showCode);
            showCode();
            el.querySelector('[data-ref="hostForm"]').addEventListener('submit', e => { e.preventDefault(); Room.host(sel.value); });
          }
          return;
        }
        const hosted = Campaign.byId(st.campaignId);
        el.innerHTML = `
          <div class="room">
            <header class="room-head">
              <div>
                <h1>Party room</h1>
                <p class="room-campaign">${esc(hosted ? hosted.name || 'Untitled campaign' : '')}</p>
                <p class="lede" data-ref="status"></p>
                <button class="btn" data-act="new-code" hidden>Give this campaign a new code</button>
              </div>
              <div class="room-code-box">
                <span class="room-code-label">Room code</span>
                <span class="room-code" data-ref="code"></span>
                <button class="btn" data-act="copy">Copy</button>
                <button class="btn btn-ghost-danger" data-act="end">End room</button>
              </div>
            </header>
            <div class="room-grid">
              <div class="room-main">
                <div class="room-actions">
                  <button class="btn" data-act="add-party">Add everyone to combat</button>
                  <span class="muted small">Or add players one at a time from the Party list. Players can also roll their own initiative.</span>
                </div>
                <div data-ref="tracker"></div>
              </div>
              <aside class="room-side">
                <section class="panel room-card">
                  <h2>Party <span class="count" data-ref="pcount">0</span></h2>
                  <div data-ref="party"></div>
                </section>
                <section class="panel room-card feed-card">
                  <h2>Table talk</h2>
                  <ol class="feed" data-ref="feed"></ol>
                  ${chatBox(Room.state.shareRolls, 'Share my rolls with the party')}
                </section>
                <section class="panel room-card">
                  <h2>Shared with players</h2>
                  <p class="muted small" data-ref="knownCount"></p>
                  <a class="link-btn" href="#/campaign/${hosted ? hosted.id : ''}">Choose what they know in this campaign</a>
                </section>
              </aside>
            </div>
          </div>`;
        Combat.mount(el.querySelector('[data-ref="tracker"]'), { embedded: true, campaignId: st.campaignId });
        wireChat();
        return;
      }

      // Player
      if (layoutKey() === 'idle' || layoutKey() === 'joining') {
        const chars = Store.state.characters;
        const saved = Room.me;
        const activeId = (saved && saved.charId) || Store.state.activeCharacterId || (chars[0] && chars[0].id);
        const active = chars.find(c => c.id === activeId);
        el.innerHTML = `
          <div class="room-intro">
            <h1>Join a party room</h1>
            <p class="lede">Ask your DM for the room code.</p>
            <form class="join-form panel" data-ref="join" autocomplete="off">
              <label class="field"><span>Room code</span>
                <input class="code-input" name="code" maxlength="${Room.CODE_LEN}" placeholder="${'•'.repeat(Room.CODE_LEN)}" autocapitalize="characters" spellcheck="false" value="${esc((Room.state.code) || '')}" required>
              </label>
              <label class="field"><span>Your name</span>
                <input name="name" maxlength="40" value="${esc((saved && saved.name) || (active && active.name) || '')}" placeholder="How the table knows you" required>
              </label>
              <label class="field"><span>Bring a character</span>
                <select name="char">
                  ${chars.map(c => `<option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>${esc(c.name || 'Unnamed character')}${c.className ? `, ${esc(c.className)} ${c.level}` : ''}</option>`).join('')}
                  <option value="" ${!chars.length ? 'selected' : ''}>No character</option>
                </select>
              </label>
              <p class="join-msg" data-ref="joinMsg" aria-live="polite"></p>
              <button class="btn btn-primary btn-lg" type="submit" data-ref="joinBtn">Join room</button>
            </form>
          </div>`;
        el.querySelector('[data-ref="join"]').addEventListener('submit', e => {
          e.preventDefault();
          const f = e.target.elements;
          Room.join(f.namedItem('code').value, f.namedItem('name').value, f.namedItem('char').value);
        });
        el.querySelector('.code-input').addEventListener('input', e => {
          const pos = e.target.selectionStart;
          e.target.value = Room.cleanCode(e.target.value);
          e.target.setSelectionRange(pos, pos);
        });
        el.querySelector('.code-input').focus();
        return;
      }

      el.innerHTML = `
        <div class="room">
          <header class="room-head">
            <div>
              <h1 data-ref="title">Party room</h1>
              <p class="lede" data-ref="status"></p>
            </div>
            <div class="room-code-box">
              <span class="room-code-label">Room code</span>
              <span class="room-code" data-ref="code"></span>
              <button class="btn btn-ghost-danger" data-act="leave">Leave room</button>
            </div>
          </header>
          <div class="room-grid">
            <div class="room-main">
              <section class="panel room-card">
                <div class="room-card-head">
                  <h2>Turn order</h2>
                  <button class="btn btn-primary" data-act="init" ${Room.me && Room.me.charId ? '' : 'disabled title="Join with a character to roll initiative"'}>Roll initiative</button>
                </div>
                <div data-ref="combat"></div>
              </section>
              <section class="panel room-card">
                <h2>What the party knows</h2>
                <div data-ref="known"></div>
              </section>
            </div>
            <aside class="room-side">
              <section class="panel room-card">
                <h2>Party <span class="count" data-ref="pcount">0</span></h2>
                <div data-ref="party"></div>
              </section>
              <section class="panel room-card feed-card">
                <h2>Table talk</h2>
                <ol class="feed" data-ref="feed"></ol>
                ${chatBox(Room.state.shareRolls, 'Share my rolls with the party')}
              </section>
            </aside>
          </div>
        </div>`;
      wireChat();
    }

    function wireChat() {
      const form = el.querySelector('[data-ref="chat"]');
      if (!form) return;
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = el.querySelector('[data-ref="chatText"]');
        Room.chat(input.value);
        input.value = '';
        input.focus();
      });
      el.querySelector('[data-ref="share"]').addEventListener('change', e => Room.setShareRolls(e.target.checked));
    }

    function setText(ref, text) { const n = el.querySelector(`[data-ref="${ref}"]`); if (n) n.textContent = text; }
    function setHTML(ref, html) { const n = el.querySelector(`[data-ref="${ref}"]`); if (n && n.innerHTML !== html) n.innerHTML = html; }

    function scrollFeed() {
      const f = el.querySelector('[data-ref="feed"]');
      if (f) f.scrollTop = f.scrollHeight;
    }

    function update() {
      const st = Room.state;
      if (!st.mode) return;

      if (!isDM && (layoutKey() === 'joining')) {
        const msg = el.querySelector('[data-ref="joinMsg"]');
        const btn = el.querySelector('[data-ref="joinBtn"]');
        if (msg) {
          msg.textContent = st.status === 'connecting' ? 'Connecting…' : st.status === 'ended' ? 'The DM closed the room.' : st.error;
          msg.className = `join-msg ${st.status === 'error' ? 'error' : ''}`;
        }
        if (btn) btn.disabled = st.status === 'connecting';
        return;
      }

      setText('code', st.code);
      const statusText = {
        connecting: isDM ? 'Opening the room…' : 'Connecting…',
        reconnecting: isDM ? 'Waiting for the room code to become free… (this can take a minute after a reload)' : 'Connection lost. Reconnecting…',
        open: '',
        error: st.error,
      }[st.status] || '';

      if (isDM) {
        const ps = Room.players;
        setText('status', statusText || (ps.length ? `${ps.length} player${ps.length > 1 ? 's' : ''} connected.` : 'Share the code with your players so they can join.'));
        setText('pcount', ps.length);
        setHTML('party', partyHTML(ps, null, true));
        const addAll = el.querySelector('[data-act="add-party"]');
        if (addAll) addAll.disabled = !ps.some(p => !p.inCombat);
        const known = Campaign.publicKnown(st.campaignId).reduce((n, sec) => n + sec.entries.length, 0);
        setText('knownCount', known ? `Players can see ${known} known entr${known > 1 ? 'ies' : 'y'} from your campaign.` : 'Nothing from your campaign is marked Known yet.');
        const before = el.querySelector('[data-ref="feed"]')?.innerHTML;
        setHTML('feed', feedHTML(Room.feed().slice(-100), 'DM'));
        if (el.querySelector('[data-ref="feed"]')?.innerHTML !== before) scrollFeed();
        el.querySelector('.room')?.classList.toggle('is-error', st.status === 'error');
        const nc = el.querySelector('[data-act="new-code"]');
        if (nc) nc.hidden = st.errorCode !== 'taken';
        return;
      }

      const v = st.view;
      setText('status', statusText || (v ? (v.campaign ? `Playing ${v.campaign}.` : 'Connected to your DM.') : 'Waiting for the DM…'));
      if (!v) return;
      setText('pcount', v.players.length);
      setHTML('party', partyHTML(v.players, v.you));
      setHTML('combat', playerCombatHTML(v.combat, v.you));
      setHTML('known', knownHTML(v.known));
      const before = el.querySelector('[data-ref="feed"]')?.innerHTML;
      const myName = Room.me ? Room.me.name : '';
      setHTML('feed', feedHTML(v.feed, myName));
      if (el.querySelector('[data-ref="feed"]')?.innerHTML !== before) scrollFeed();
    }

    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      switch (b.dataset.act) {
        case 'new-code': return Room.newCodeForCampaign();
        case 'copy':
          navigator.clipboard?.writeText(Room.state.code).then(() => Util.toast('Room code copied.'), () => Util.toast(`Room code: ${Room.state.code}`));
          return;
        case 'end':
          if (!b.dataset.armed) {
            b.dataset.armed = '1'; b.textContent = 'Click again to end';
            setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = 'End room'; } }, 3000);
            return;
          }
          Room.leave(); return Util.toast('Room closed.');
        case 'leave': Room.leave(); return Util.toast('You left the room.');
        case 'add-party': {
          const n = Room.addPartyToCombat();
          return Util.toast(n ? `Added ${n} player${n > 1 ? 's' : ''} to combat with rolled initiative.` : 'Everyone in the room is already in combat.');
        }
        case 'add-player': {
          const cb = Room.addPlayer(b.dataset.id);
          if (cb) Util.toast(`${cb.name} added to combat (initiative ${cb.init}).${cb.maxHp ? '' : ' They joined without a character, so set their HP and AC in the tracker.'}`);
          return;
        }
        case 'remove-player': return Room.removePlayer(b.dataset.id);
        case 'init': return Room.rollInitiative();
      }
    });

    off = Room.on(render);
    render();
    scrollFeed();
  }

  return { mount };
})();
