'use strict';

/*
 * Battle maps for the premade campaigns: one for every planned encounter, drawn on the grid
 * with the creatures already placed. Starting a premade campaign adds them; a campaign made
 * from a premade before maps existed can add them from the battle map ("Add this adventure's maps").
 *
 * Each map is drawn as text, one character per 5-foot square:
 *   ' ' nothing     .  floor        #  wall        +  door
 *   ~  water        "  grass        :  dirt/sand   ^  lava/fire    *  ice
 *   =  wood         o  stone        %  magic       b  blood
 * Difficult terrain: ,  floor   &  grass   x  snow/ice   -  shallow water   ;  dirt   r  rocks
 *   P  where the party starts (the squares around it start revealed)
 *   A–Z (not P) creatures, listed in `tokens`. Several of the same letter are numbered in
 *   reading order ("Fog Wisp 1", "Fog Wisp 2"), the same way encounters add them to combat.
 * A creature's square is drawn as the map's `under` terrain unless its token says `on`.
 */
const PremadeMaps = (() => {
  const CODE = {
    ' ': ['.', 0], '.': ['f', 0], '#': ['w', 0], '+': ['d', 0],
    '~': ['1', 0], '"': ['2', 0], ':': ['3', 0], '^': ['4', 0], '*': ['5', 0], '=': ['6', 0], 'o': ['7', 0], '%': ['8', 0], 'b': ['9', 0],
    ',': ['f', 1], '&': ['2', 1], 'x': ['5', 1], '-': ['1', 1], ';': ['3', 1], 'r': ['7', 1],
  };

  const MAPS = {
    /* ---------------- The Lantern of Hollowmere ---------------- */
    hollowmere: [
      {
        key: 'jetty', name: 'Fog on the jetty', under: '=', sight: 6,
        notes: 'Night fog: lightly obscured. Falling off the jetty: DC 10 Athletics to climb out. The villagers stumble toward the water; saving them matters more than killing wisps.',
        tokens: { W: { name: 'Fog Wisp', on: '~' }, V: { name: 'Memory-Lost Villager', kind: 'npc' } },
        rows: [
          '""""""""""""""""""""""""""""""""',
          '"######""""""#######"""""#####""',
          '"#....#""""""#.....#"""""#...#""',
          '"#....+::::::+.....#"""""#...#""',
          '"######:"""""#######"""""##+##""',
          '""""""":"""""""":"""""""""":""""',
          '::::::::::::::::::::::::::::::::',
          '""""""""":"""""""""""""":"""""""',
          '&&&&&&&&&=&&&&&&&&&&&&&&=&&&&&&&',
          '---------=--------------=-------',
          '~~~~~~~~~=~~~~~~~~~~~~~~=~~~~~~~',
          '~~~~~~~~~=~~~~~~~~~~~~~~=~~~~~~~',
          '~~~~~~~~~=~~~~~~~W~~~~~~=~~~~~~~',
          '~~~~~~=======~~~~~~~~=======~~~~',
          '~~~~~~=PP=V==~~~~~~~~===V===~~~~',
          '~~~~~~=======~~~~W~~~=======~~~~',
          '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
          '~~~~~~~~~~~~~~~~~~~~~~~~W~~~~~~~',
          '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
          '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
        ],
      },
      {
        key: 'gullrock', name: 'Landing at Gull Rock', under: 'r', sight: 8,
        notes: 'Slippery rocks are difficult terrain. The boat drifts away after 3 rounds unless someone ties it up. The crabs grab and drag toward the water. Crab nest: 12 gp in a drowned sailor\'s purse.',
        tokens: { C: { name: 'Giant Crab' } },
        rows: [
          '~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
          '~~~~~~~~~~rrrrrrrr~~~~~~~~~~',
          '~~~~~~~rrrrr####rrrrr~~~~~~~',
          '~~~~~~rrrr##....##rrrr~~~~~~',
          '~~~~~rrrr##......##rrrr~~~~~',
          '~~~~~rrrr#........#rrrr~~~~~',
          '~~~~rrrrr#........#rrrrr~~~~',
          '~~~~rrrrr##......##rrrrr~~~~',
          '~~~~rrrrrr##.+..##rrrrrr~~~~',
          '~~~~rrrrrrrr:::rrrrrrrrr~~~~',
          '~~~rrr####rr:rrrrrrrrrrrr~~~',
          '~~~rrr#..+:::rrrrrrrCrrrr~~~',
          '~~~rrr#..#rr:rrrrrrrrrrr~~~~',
          '~~~~rr####rr:rrrrrrrrrr~~~~~',
          '~~~~~rrrrrrr:rrrrrCrrr~~~~~~',
          '~~~~~~rrrrrr:rrrrrrrr~~~~~~~',
          '~~~~~~~~rrrr==rrrrr~~~~~~~~~',
          '~~~~~~~~~~~~==~~~~~~~~~~~~~~',
          '~~~~~~~~~~~=PP=~~~~~~~~~~~~~',
          '~~~~~~~~~~~=PP=~~~~~~~~~~~~~',
        ],
      },
      {
        key: 'chapel', name: 'The Fogmother\'s chapel', under: '-',
        notes: 'Knee-deep water is difficult terrain. Pews give half cover. Memory motes everywhere: touching one costs an action and shows a villager\'s lost memory. The lens sits on the altar.',
        tokens: { F: { name: 'The Fogmother', on: '%' }, W: { name: 'Fog Wisp' } },
        rows: [
          '         ##########         ',
          '        ##%%%%%%%%##        ',
          '       ##---%%F%---##       ',
          '      ##------------##      ',
          '      #--W--------W--#      ',
          '      #--------------#      ',
          '      #=====----=====#      ',
          '      #--------------#      ',
          '      #=====----=====#      ',
          '      #--------------#      ',
          '      #=====----=====#      ',
          '      #--------------#      ',
          '      #=====----=====#      ',
          '      #--------------#      ',
          '      ######-PP-######      ',
          '           #-PP-#           ',
          '           #----#           ',
          '           #~~~~#           ',
          '           #~~~~#           ',
          '           ######           ',
        ],
      },
    ],

    /* ---------------- Beneath the Saltgrave Mines ---------------- */
    saltgrave: [
      {
        key: 'mites', name: 'Ceiling mites', under: '.', sight: 10,
        notes: 'The mites drop from the ceiling: DC 13 Perception to notice them. A loose minecart sits on the slope (the = rails); a good shove sends it rolling down the tunnel.',
        tokens: { M: { name: 'Salt Mite' } },
        rows: [
          '##############################',
          '#PP......====......#,,,,,,,,,#',
          '#PP......====......#,,,,,,,,,#',
          '#####....====....###,,,,,,,,,#',
          '    #....====....#  ##,,,,,,##',
          '    #..M.====.M..#   ##,,,,## ',
          '    #....====....#    #....#  ',
          '    #....====....######....#  ',
          '    #....====..............#  ',
          '    #..M.====......M.......#  ',
          '    #....====..............#  ',
          '    #....====...######.....#  ',
          '    #....====...#    #..M..#  ',
          '    #....====...#    #.....#  ',
          '    ####.====.###    ###+###  ',
          '       #.====.#               ',
          '       #.====.#               ',
          '       ########               ',
        ],
      },
      {
        key: 'kobolds', name: 'Kobold standoff', under: '.',
        notes: 'The cart barricade gives half cover. Parley is possible: Snik trades his rune-key for food or a shiny item. Treasure: the rune-key and 15 gp in salt-crusted coins.',
        tokens: { K: { name: 'Kobold Scavenger' }, S: { name: 'Snik' }, T: { name: 'Tobb', kind: 'npc' } },
        rows: [
          '##############################',
          '#............#..............T#',
          '#..PP........#...............#',
          '#..PP........+.......K...K...#',
          '#............#...============#',
          '#............#....=......=...#',
          '######+#######....=..S...=...#',
          '     #.#     #....=......=...#',
          '     #.#     #...============#',
          '     #.#     #.....K....K....#',
          '     #.#     #...............#',
          '     #.#     ######+##########',
          '     #.#          #.#         ',
          '     #.############.#         ',
          '     #..............#         ',
          '     ################         ',
        ],
      },
      {
        key: 'vault', name: 'The vault guardians', under: '.',
        notes: 'Toppled statues (rocks) give cover. Saying "Brindelvar" stops the guardians; the ghost can tell the party this. The vault holds salt-silver ingots, a +1 warhammer and 200 gp in gems.',
        tokens: { G: { name: 'Dwarven Guardian' }, B: { name: 'Brindel the Smith', kind: 'npc', hidden: true } },
        rows: [
          '##############################',
          '#..........#######...........#',
          '#..........#%%%%%#...........#',
          '#...^^.....#%%B%%#.....rr....#',
          '#...^^.....##%+%##.....rr....#',
          '#..........................rr#',
          '#....rr.......G....G.......rr#',
          '#....rr......................#',
          '#............................#',
          '#..o......o.......o......o...#',
          '#............................#',
          '#...rr..............rr.......#',
          '#............................#',
          '#..o......o.......o......o...#',
          '#............................#',
          '#############.PP.#############',
          '            #.PP.#            ',
          '            ######            ',
        ],
      },
      {
        key: 'spiders', name: 'Spider nest', under: ',', sight: 8,
        notes: 'Webs everywhere: difficult terrain, and flammable (a torch burns a 5-foot square of web away). The last rune-key is inside a cocooned dwarf skeleton (the blood square).',
        tokens: { S: { name: 'Cave Spider', size: 2 } },
        rows: [
          '############################',
          '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
          '#,,,,,,,,,,,,,,,,,,,,,b,,,,#',
          '#,,,,S,,,,,,,,,,,,,,,,,,,,,#',
          '#,,,,,,,,,,,,,,,,,S,,,,,,,,#',
          '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
          '###,,,,,,,,,,,,,,,,,,,,,,###',
          '  #,,,,,,,,,......,,,,,,,#  ',
          '  ###,,,,,..........,,,###  ',
          '    #####............####   ',
          '        #....PP......#      ',
          '        #....PP......#      ',
          '        #######+######      ',
        ],
      },
      {
        key: 'throne', name: 'The hungry throne', under: '.', sight: 12,
        notes: 'The pit (lava squares are the warm, breathing pit): falling in deals 4d6 and you are gone for a while. The broken salt ring (magic squares) has one gap: an action and a bag of salt-silver fixes it. The King uses Crown of Want to pull people toward the pit.',
        tokens: { K: { name: 'The Hollow King', size: 2 }, G: { name: 'Gaunt' } },
        rows: [
          '################################',
          '#..............oooo............#',
          '#..............oKoo............#',
          '#......G.......oooo.......G....#',
          '#..............................#',
          '#....%%%%%%%%%%%%%%%%%%%%%%....#',
          '#....%....................%....#',
          '#....%.......^^^^^^.......%....#',
          '#....%......^^^^^^^^......%....#',
          '#....%......^^^^^^^^...........#',
          '#....%.......^^^^^^.......%....#',
          '#....%....G..........G....%....#',
          '#....%%%%%%%%%%%%%%%%%%%%%%....#',
          '#..............................#',
          '#..............................#',
          '##############.PP.##############',
          '             #.PP.#             ',
          '             ######             ',
        ],
      },
    ],

    /* ---------------- Masks of Velloran ---------------- */
    velloran: [
      {
        key: 'bridge', name: 'Ambush on the Bridge of Sighs', under: 'o', sight: 10,
        notes: 'Narrow bridge with canals on both sides. Festival crowds (grass squares stand for crowded streets: difficult terrain). The agent poses as a festival-goer and attacks from the crowd: its token starts hidden from players. The thugs try to push people into the canals.',
        tokens: { T: { name: 'Canal Thug' }, D: { name: 'Doppelganger Agent', hidden: true, on: '&' } },
        rows: [
          '#######&&&&&&&&&&&&&&&#######',
          '#.....#&&&&&&&&&&D&&&&#.....#',
          '#.....+ooooooooooooooo+.....#',
          '#######ooooooooooooooo#######',
          '~~~~~~~~~~~~ooooo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooToo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooooo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooooo~~~~~~~~~~~~',
          '~~~~~~~~~~~~oTooo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooooo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooooo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooPoo~~~~~~~~~~~~',
          '~~~~~~~~~~~~oPoPo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooPoo~~~~~~~~~~~~',
          '~~~~~~~~~~~~ooooo~~~~~~~~~~~~',
          '#######ooooooooooooooo#######',
          '#.....+ooooTooooooTooo+.....#',
          '#######&&&&&&&&&&&&&&&#######',
        ],
      },
      {
        key: 'archive', name: 'The archive heist', under: '.',
        notes: 'Shelves (wood) block sight; ladders let you climb onto them. Alarm glyphs (magic squares): DC 14 Arcana to disarm. Two of the "clerks" are agents; they try to burn the signatures at the reading table.',
        tokens: { D: { name: 'Doppelganger Agent' } },
        rows: [
          '##############################',
          '#............................#',
          '#.====.====.====.====.====...#',
          '#.====.====.====.====.====...#',
          '#............................#',
          '#.====.====.%%%%.====.====...#',
          '#.====.====.%==%.====.====...#',
          '#...........%==%.......D.....#',
          '#.====.====.%%%%.====.====...#',
          '#.====.====......====.====...#',
          '#.......D....................#',
          '#.====.====.====.====.====...#',
          '#.====.====.====.====.====...#',
          '#............................#',
          '#############+################',
          '         #..PP..#             ',
          '         #..PP..#             ',
          '         ########             ',
        ],
      },
      {
        key: 'masquerade', name: 'The masquerade', under: '.',
        notes: 'Ballroom with a balcony (wood, up the stairs) and a workshop behind a mirror door (the door in the east wall of the balcony). She tries to replace a party member mid-dance with Steal Face, then flees through the canals at half HP. Living masks start hidden on the workshop wall.',
        tokens: { M: { name: 'Mother of Masks' }, D: { name: 'Doppelganger Agent' }, L: { name: 'Living Mask', hidden: true } },
        rows: [
          '##################################',
          '#========================#.......#',
          '#========================#..L.L..#',
          '#==....................==#...L...#',
          '#==....................==#.......#',
          '#==....................==+.......#',
          '#==....................==#.......#',
          '#.........................########',
          '#.............M..........#~~~~~~~#',
          '#.......D..........D.....+~~~~~~~#',
          '#........................#~~~~~~~#',
          '#........................#~~~~~~~#',
          '#........................#########',
          '#........................#        ',
          '#.........PP..PP.........#        ',
          '############+#############        ',
        ],
      },
    ],

    /* ---------------- The Frostmarch Expedition ---------------- */
    frostmarch: [
      {
        key: 'wolves', name: 'Wolves in the snow', under: 'x', sight: 8,
        notes: 'Deep snow is difficult terrain. Glass trees (ice) shatter when hit: 2d6 piercing to creatures next to them. The wolves go for the supply sledge (wood) to scatter the party.',
        tokens: { W: { name: 'Winter Wolf', size: 2 } },
        rows: [
          'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          'xx*xxxxxx*xxxxxxxxxx*xxxxxxx*xxx',
          'xxxxxxWxxxxxxxx*xxxxxxxxxxxxxxxx',
          'xxxxxxxxxx*xxxxxxxxxxxxxWxxxx*xx',
          'x*xxxxxxxxxxxxxxxx*xxxxxxxxxxxxx',
          'xxxxx*xxxxxx::::::::xxxxx*xxxxxx',
          'xxxxxxxxxxx::::::::::xxxxxxxxxxx',
          'xx*xxxxxxx:::PP==P::::xxxxxxx*xx',
          'xxxxxxxxxx:::P:==:P:::xxxxxxxxxx',
          'xxxxx*xxxxx::::::::::xxxxxxxxxxx',
          'xxxxxxxxxxxx::::::::xxxxx*xxxxxx',
          'x*xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          'xxxxxxxxxx*xxxxxx*xxxxxxxxx*xxxx',
          'xxxxxxxxxxxxxxxxxxxxxWxxxxxxxxxx',
          'xxx*xxxxxxxxx*xxxxxxxxxxxxxxx*xx',
          'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        ],
      },
      {
        key: 'bridge', name: 'The bridge trolls', under: '*', sight: 9,
        notes: 'The ice bridge is 10 feet wide over a 200-foot drop (the empty squares). Slippery: DC 12 Acrobatics to Dash. The trolls grapple and throw. Fire is essential; Pip has two flasks of oil.',
        tokens: { T: { name: 'Ice Troll', size: 2 } },
        rows: [
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrrxxxxxxxxrrrrrrrrrrrrr',
          'rrrrrrrrrrrrxxxxxxxxxxrrrrrrrrrrrr',
          'rrrrrrrrrrrrrxxxTxxxxrrrrrrrrrrrrr',
          '               **                 ',
          '               **                 ',
          '               **                 ',
          '               **                 ',
          '               T*                 ',
          '               **                 ',
          '               **                 ',
          '               **                 ',
          '               **                 ',
          '               **                 ',
          'rrrrrrrrrrrrrxxxxxxrrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrxxPPPPxxrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrrxx==xxrrrrrrrrrrrrrrr',
          'rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr',
        ],
      },
      {
        key: 'heart', name: 'Heart of the Spire', under: '*',
        notes: 'A spiral ice ramp climbs around the beating Heart (magic). The Warden raises ice walls; paint walls with the Draw tool as it does. Edric hesitates if Isolde (or someone with her locket) speaks to him.',
        tokens: { R: { name: 'The Rime Warden', size: 2, on: '*' }, S: { name: 'Rime Servant' }, E: { name: 'Edric Varga' } },
        rows: [
          '          ##########          ',
          '       ####********####       ',
          '     ###**************###     ',
          '    ##******######******##    ',
          '   ##****####****####****##   ',
          '   #****##**********##****#   ',
          '  ##***##****%%%%****##***##  ',
          '  #****#****%%%%%%****#****#  ',
          '  #***##***%%%%%%%%***##***#  ',
          '  #***#****%%%%%%%%****#***#  ',
          '  #***#****%%%%%%%%****#***#  ',
          '  #***##***%%%%%%%%***##***#  ',
          '  #****#**S*%%%%%%*R**#****#  ',
          '  ##***##****%%%%****##***##  ',
          '   #****##****E*****##****#   ',
          '   ##****####****####****##   ',
          '    ##******##**##******##    ',
          '     ###*****#**#*****###     ',
          '       #####*S****#####       ',
          '           #*PPPP*#           ',
          '           ########           ',
        ],
      },
    ],
  };

  function build(def) {
    const rows = def.rows;
    const cols = Math.max(...rows.map(r => r.length));
    const m = Battlemap.newMap(def.name, cols, rows.length);
    m.from = def.key;
    m.notes = def.notes || '';
    let terrain = '', diff = '';
    const starts = [];
    const found = [];
    rows.forEach((row, y) => {
      for (let x = 0; x < cols; x++) {
        let ch = row[x] ?? ' ';
        if (ch === 'P') { starts.push({ x, y }); ch = def.under; }
        else if (def.tokens[ch]) { found.push({ ch, x, y }); ch = def.tokens[ch].on || def.under; }
        const [t, d] = CODE[ch] || CODE[' '];
        terrain += t; diff += String(d);
      }
    });
    m.terrain = terrain; m.diff = diff;
    m.starts = starts;

    // Name creatures the way encounters add them to combat: "Fog Wisp 1", "Fog Wisp 2"…
    const counts = {};
    found.forEach(f => { counts[f.ch] = (counts[f.ch] || 0) + 1; });
    const seen = {};
    found.forEach(f => {
      const spec = def.tokens[f.ch];
      seen[f.ch] = (seen[f.ch] || 0) + 1;
      m.tokens.push({
        id: Util.uid(), name: counts[f.ch] > 1 ? `${spec.name} ${seen[f.ch]}` : spec.name,
        kind: spec.kind || 'enemy', size: spec.size || 1, x: f.x, y: f.y,
        cb: null, owner: null, ownerName: '', hidden: Boolean(spec.hidden),
      });
    });

    // Reveal the party's starting area: everything reachable from the start squares without
    // passing a wall or door (within `sight` squares outdoors), plus the walls and doors around it.
    const rev = new Array(cols * rows.length).fill('0');
    const blocks = i => m.terrain[i] === 'w' || m.terrain[i] === 'd' || m.terrain[i] === '.';
    const dist = new Map();
    const queue = starts.map(p => { dist.set(p.y * cols + p.x, 0); return p; });
    const sight = def.sight || 99;
    while (queue.length) {
      const p = queue.shift();
      const i = p.y * cols + p.x;
      rev[i] = '1';
      const d = dist.get(i);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = p.x + dx, y = p.y + dy;
        if ((!dx && !dy) || x < 0 || y < 0 || x >= cols || y >= rows.length) continue;
        const j = y * cols + x;
        if (dist.has(j) || d + 1 > sight) continue;
        dist.set(j, d + 1);
        if (blocks(j)) { if (m.terrain[j] !== '.') rev[j] = '1'; continue; }
        queue.push({ x, y });
      }
    }
    m.fog.rev = rev.join('');
    return Battlemap.normalize(m);
  }

  const forKey = key => (MAPS[key] || []).map(build);
  const keyOf = cp => {
    if (!cp) return null;
    if (cp.premadeKey && MAPS[cp.premadeKey]) return cp.premadeKey;
    const p = typeof Premades !== 'undefined' && Premades.list.find(x => String(cp.source || '').startsWith(`Premade: ${x.name}`));
    return p && MAPS[p.key] ? p.key : null;
  };
  /* The adventure's maps this campaign doesn't have yet. */
  function missing(cp) {
    const key = keyOf(cp);
    if (!key) return [];
    const have = new Set((cp.maps || []).map(m => m.from).filter(Boolean));
    return MAPS[key].filter(d => !have.has(d.key));
  }
  function addMissing(cp) {
    const defs = missing(cp);
    if (!Array.isArray(cp.maps)) cp.maps = [];
    defs.forEach(d => cp.maps.push(build(d)));
    return defs.length;
  }

  return { forKey, missing, addMissing, keyOf, MAPS };
})();
