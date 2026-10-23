'use strict';

/*
 * D&D 5e (2024 rules) data used by the character creator.
 * Feature names follow the 2024 Player's Handbook; descriptions are short summaries,
 * so check your book for exact wording.
 */
const Rules = (() => {
  const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const ABIL_NAME = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
  const SKILL_NAME = {
    acrobatics: 'Acrobatics', animal: 'Animal Handling', arcana: 'Arcana', athletics: 'Athletics',
    deception: 'Deception', history: 'History', insight: 'Insight', intimidation: 'Intimidation',
    investigation: 'Investigation', medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
    performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion', sleight: 'Sleight of Hand',
    stealth: 'Stealth', survival: 'Survival',
  };
  const ALL_SKILLS = Object.keys(SKILL_NAME);

  /* XP needed to reach each level (index 0 = level 1). */
  const XP = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

  const ORIGIN_FEATS = {
    'Alert': 'Add your proficiency bonus to initiative. You can swap initiative with a willing ally.',
    'Crafter': 'Proficiency with three artisan\'s tools, 20% off nonmagical items, craft gear faster.',
    'Healer': 'Use a healer\'s kit to let a creature spend a hit die; reroll 1s on healing dice.',
    'Lucky': 'Luck points equal to your proficiency bonus to give yourself advantage or an enemy disadvantage.',
    'Magic Initiate (Cleric)': 'Two cleric cantrips and one 1st-level cleric spell, cast free once per long rest.',
    'Magic Initiate (Druid)': 'Two druid cantrips and one 1st-level druid spell, cast free once per long rest.',
    'Magic Initiate (Wizard)': 'Two wizard cantrips and one 1st-level wizard spell, cast free once per long rest.',
    'Musician': 'Proficiency with three instruments; after a rest, give Heroic Inspiration to allies.',
    'Savage Attacker': 'Once per turn, roll weapon damage dice twice and use either result.',
    'Skilled': 'Gain proficiency in any combination of three skills or tools.',
    'Tavern Brawler': 'Unarmed strikes deal 1d4 + Str, reroll 1s, push a target 5 ft, improvised weapon proficiency.',
    'Tough': 'Your hit point maximum increases by 2 for every level.',
  };

  /* ---------- Species ---------- */
  const SPECIES = {
    Aasimar: {
      size: ['Medium', 'Small'], speed: 30, darkvision: 60,
      blurb: 'Mortals touched by celestial power.',
      traits: [
        ['Celestial Resistance', 'Resistance to necrotic and radiant damage.'],
        ['Healing Hands', 'As a Magic action, heal a creature you touch for a number of d4s equal to your proficiency bonus. Once per long rest.'],
        ['Light Bearer', 'You know the Light cantrip (Charisma).'],
        ['Celestial Revelation (level 3)', 'Bonus action, once per long rest: Heavenly Wings, Inner Radiance or Necrotic Shroud for 1 minute; extra damage equal to your proficiency bonus once per turn.'],
      ],
    },
    Dragonborn: {
      size: ['Medium'], speed: 30, darkvision: 60,
      blurb: 'Draconic ancestry, a breath weapon and resistance to match.',
      lineageLabel: 'Draconic ancestry',
      lineages: {
        Black: 'Acid', Blue: 'Lightning', Brass: 'Fire', Bronze: 'Lightning', Copper: 'Acid',
        Gold: 'Fire', Green: 'Poison', Red: 'Fire', Silver: 'Cold', White: 'Cold',
      },
      traits: [
        ['Breath Weapon', 'Replace one attack with a 15-ft cone or 30-ft line. Dexterity save (DC 8 + Con mod + proficiency bonus); {breath} {dtype} damage, half on a success. Uses equal to your proficiency bonus per long rest.'],
        ['Damage Resistance', 'Resistance to {dtype} damage.'],
        ['Draconic Flight (level 5)', 'Bonus action, once per long rest: sprout spectral wings and gain a fly speed equal to your speed for 10 minutes.'],
      ],
    },
    Dwarf: {
      size: ['Medium'], speed: 30, darkvision: 120, hpPerLevel: 1,
      blurb: 'Tough as the stone they were shaped from.',
      traits: [
        ['Dwarven Resilience', 'Resistance to poison damage and advantage on saves to avoid or end the poisoned condition.'],
        ['Dwarven Toughness', 'Your hit point maximum increases by 1 for every level (already added).'],
        ['Stonecunning', 'Bonus action: gain tremorsense 60 ft for 10 minutes while on or touching stone. Uses equal to your proficiency bonus per long rest.'],
      ],
    },
    Elf: {
      size: ['Medium'], speed: 30, darkvision: 60,
      blurb: 'Long-lived, keen-eyed and touched by the Feywild.',
      lineageLabel: 'Elven lineage',
      lineages: {
        Drow: 'Darkvision 120 ft. Dancing Lights cantrip; Faerie Fire at level 3, Darkness at level 5.',
        'High Elf': 'Prestidigitation cantrip (swappable after a long rest); Detect Magic at level 3, Misty Step at level 5.',
        'Wood Elf': 'Speed 35 ft. Druidcraft cantrip; Longstrider at level 3, Pass without Trace at level 5.',
      },
      lineageSpeed: { 'Wood Elf': 35 },
      lineageDarkvision: { Drow: 120 },
      extraSkill: { label: 'Keen Senses skill', from: ['insight', 'perception', 'survival'] },
      traits: [
        ['Elven Lineage', '{lineageText} Lineage spells cast once per long rest without a slot.'],
        ['Fey Ancestry', 'Advantage on saves to avoid or end the charmed condition.'],
        ['Keen Senses', 'Proficiency in one of Insight, Perception or Survival.'],
        ['Trance', 'You don\'t need sleep; a long rest takes 4 hours of meditation.'],
      ],
    },
    Gnome: {
      size: ['Small'], speed: 30, darkvision: 60,
      blurb: 'Small, curious and cunning.',
      lineageLabel: 'Gnomish lineage',
      lineages: {
        'Forest Gnome': 'Minor Illusion cantrip. Speak with Animals always prepared, cast free a number of times equal to your proficiency bonus per long rest.',
        'Rock Gnome': 'Mending and Prestidigitation cantrips. Spend 10 minutes to build a Tiny clockwork device.',
      },
      traits: [
        ['Gnomish Cunning', 'Advantage on Intelligence, Wisdom and Charisma saving throws.'],
        ['Gnomish Lineage', '{lineageText}'],
      ],
    },
    Goliath: {
      size: ['Medium'], speed: 35, darkvision: 0,
      blurb: 'Towering, with the blood of giants.',
      lineageLabel: 'Giant ancestry',
      lineages: {
        "Cloud's Jaunt": 'Bonus action: teleport up to 30 ft.',
        "Fire's Burn": 'When you hit, deal an extra 1d10 fire damage.',
        "Frost's Chill": 'When you hit, deal an extra 1d6 cold damage and reduce speed by 10 ft.',
        "Hill's Tumble": 'When you hit a Large or smaller creature, knock it prone.',
        "Stone's Endurance": 'Reaction: reduce damage taken by 1d12 + Con mod.',
        "Storm's Thunder": 'Reaction when damaged: deal 1d8 thunder damage to an attacker within 60 ft.',
      },
      traits: [
        ['Giant Ancestry', '{lineage}: {lineageText} Uses equal to your proficiency bonus per long rest.'],
        ['Large Form (level 5)', 'Bonus action, once per long rest: become Large for 10 minutes, advantage on Strength checks, +10 ft speed.'],
        ['Powerful Build', 'Advantage on checks to end the grappled condition; count as one size larger for carrying.'],
      ],
    },
    Halfling: {
      size: ['Small'], speed: 30, darkvision: 0,
      blurb: 'Small, brave and remarkably lucky.',
      traits: [
        ['Brave', 'Advantage on saves to avoid or end the frightened condition.'],
        ['Halfling Nimbleness', 'You can move through the space of any creature larger than you.'],
        ['Luck', 'When you roll a 1 on a d20 test, reroll it and use the new roll.'],
        ['Naturally Stealthy', 'You can take the Hide action while obscured only by a creature larger than you.'],
      ],
    },
    Human: {
      size: ['Medium', 'Small'], speed: 30, darkvision: 0,
      blurb: 'Adaptable, ambitious and everywhere.',
      extraSkill: { label: 'Skillful: extra skill', from: ALL_SKILLS },
      extraFeat: true,
      traits: [
        ['Resourceful', 'You gain Heroic Inspiration whenever you finish a long rest.'],
        ['Skillful', 'Proficiency in one skill of your choice.'],
        ['Versatile', 'You gain an origin feat of your choice: {humanFeat}.'],
      ],
    },
    Orc: {
      size: ['Medium'], speed: 30, darkvision: 120,
      blurb: 'Driven by endurance and fierce resolve.',
      traits: [
        ['Adrenaline Rush', 'Take the Dash action as a bonus action and gain temporary HP equal to your proficiency bonus. Uses equal to your proficiency bonus per short or long rest.'],
        ['Relentless Endurance', 'When reduced to 0 HP but not killed, drop to 1 HP instead. Once per long rest.'],
      ],
    },
    Tiefling: {
      size: ['Medium', 'Small'], speed: 30, darkvision: 60,
      blurb: 'Bearers of a fiendish legacy.',
      lineageLabel: 'Fiendish legacy',
      lineages: {
        Abyssal: 'Resistance to poison damage. Poison Spray cantrip; Ray of Sickness at level 3, Hold Person at level 5.',
        Chthonic: 'Resistance to necrotic damage. Chill Touch cantrip; False Life at level 3, Ray of Enfeeblement at level 5.',
        Infernal: 'Resistance to fire damage. Fire Bolt cantrip; Hellish Rebuke at level 3, Darkness at level 5.',
      },
      traits: [
        ['Fiendish Legacy', '{lineageText} Legacy spells cast once per long rest without a slot.'],
        ['Otherworldly Presence', 'You know the Thaumaturgy cantrip.'],
      ],
    },
  };

  /* ---------- Backgrounds ---------- */
  const BACKGROUNDS = {
    Acolyte:     { abil: ['int', 'wis', 'cha'], feat: 'Magic Initiate (Cleric)', skills: ['insight', 'religion'], tool: "Calligrapher's Supplies", equip: "Calligrapher's Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP" },
    Artisan:     { abil: ['str', 'dex', 'int'], feat: 'Crafter', skills: ['investigation', 'persuasion'], tool: "One kind of Artisan's Tools", equip: "Artisan's Tools (same as above), 2 Pouches, Traveler's Clothes, 32 GP" },
    Charlatan:   { abil: ['dex', 'con', 'cha'], feat: 'Skilled', skills: ['deception', 'sleight'], tool: 'Forgery Kit', equip: 'Forgery Kit, Costume, Fine Clothes, 15 GP' },
    Criminal:    { abil: ['dex', 'con', 'int'], feat: 'Alert', skills: ['sleight', 'stealth'], tool: "Thieves' Tools", equip: "2 Daggers, Thieves' Tools, Crowbar, 2 Pouches, Traveler's Clothes, 16 GP" },
    Entertainer: { abil: ['str', 'dex', 'cha'], feat: 'Musician', skills: ['acrobatics', 'performance'], tool: 'One Musical Instrument', equip: "Musical Instrument (same as above), 2 Costumes, Mirror, Perfume, Traveler's Clothes, 11 GP" },
    Farmer:      { abil: ['str', 'con', 'wis'], feat: 'Tough', skills: ['animal', 'nature'], tool: "Carpenter's Tools", equip: "Sickle, Carpenter's Tools, Healer's Kit, Iron Pot, Shovel, Traveler's Clothes, 30 GP" },
    Guard:       { abil: ['str', 'int', 'wis'], feat: 'Alert', skills: ['athletics', 'perception'], tool: 'One Gaming Set', equip: "Spear, Light Crossbow, 20 Bolts, Gaming Set (same as above), Hooded Lantern, Manacles, Quiver, Traveler's Clothes, 12 GP" },
    Guide:       { abil: ['dex', 'con', 'wis'], feat: 'Magic Initiate (Druid)', skills: ['stealth', 'survival'], tool: "Cartographer's Tools", equip: "Shortbow, 20 Arrows, Cartographer's Tools, Bedroll, Quiver, Tent, Traveler's Clothes, 3 GP" },
    Hermit:      { abil: ['con', 'wis', 'cha'], feat: 'Healer', skills: ['medicine', 'religion'], tool: 'Herbalism Kit', equip: "Quarterstaff, Herbalism Kit, Bedroll, Book (philosophy), Lamp, Oil (3 flasks), Traveler's Clothes, 16 GP" },
    Merchant:    { abil: ['con', 'int', 'cha'], feat: 'Lucky', skills: ['animal', 'persuasion'], tool: "Navigator's Tools", equip: "Navigator's Tools, 2 Pouches, Traveler's Clothes, 22 GP" },
    Noble:       { abil: ['str', 'int', 'cha'], feat: 'Skilled', skills: ['history', 'persuasion'], tool: 'One Gaming Set', equip: 'Gaming Set (same as above), Fine Clothes, Perfume, 29 GP' },
    Sage:        { abil: ['con', 'int', 'wis'], feat: 'Magic Initiate (Wizard)', skills: ['arcana', 'history'], tool: "Calligrapher's Supplies", equip: "Quarterstaff, Calligrapher's Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP" },
    Sailor:      { abil: ['str', 'dex', 'wis'], feat: 'Tavern Brawler', skills: ['acrobatics', 'perception'], tool: "Navigator's Tools", equip: "Dagger, Navigator's Tools, Rope, Traveler's Clothes, 20 GP" },
    Scribe:      { abil: ['dex', 'int', 'wis'], feat: 'Skilled', skills: ['investigation', 'perception'], tool: "Calligrapher's Supplies", equip: "Calligrapher's Supplies, Fine Clothes, Lamp, Oil (3 flasks), Parchment (12 sheets), 23 GP" },
    Soldier:     { abil: ['str', 'dex', 'con'], feat: 'Savage Attacker', skills: ['athletics', 'intimidation'], tool: 'One Gaming Set', equip: "Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer's Kit, Quiver, Traveler's Clothes, 14 GP" },
    Wayfarer:    { abil: ['dex', 'wis', 'cha'], feat: 'Lucky', skills: ['insight', 'stealth'], tool: "Thieves' Tools", equip: "2 Daggers, Thieves' Tools, Gaming Set (any), Bedroll, 2 Pouches, Traveler's Clothes, 16 GP" },
  };

  /* ---------- Weapons used by starting equipment ---------- */
  const WEAPONS = {
    Greataxe: ['1d12', 'str', 'slashing'], Handaxe: ['1d6', 'str', 'slashing'], Dagger: ['1d4', 'finesse', 'piercing'],
    Mace: ['1d6', 'str', 'bludgeoning'], Sickle: ['1d4', 'str', 'slashing'], Quarterstaff: ['1d6', 'str', 'bludgeoning'],
    Greatsword: ['2d6', 'str', 'slashing'], Flail: ['1d8', 'str', 'bludgeoning'], Javelin: ['1d6', 'str', 'piercing'],
    Spear: ['1d6', 'str', 'piercing'], Longsword: ['1d8', 'str', 'slashing'], Scimitar: ['1d6', 'finesse', 'slashing'],
    Shortsword: ['1d6', 'finesse', 'piercing'], Longbow: ['1d8', 'dex', 'piercing'], Shortbow: ['1d6', 'dex', 'piercing'],
  };

  /* ---------- Classes ---------- */
  const ASI = 'Ability Score Improvement';
  const SUB = 'Subclass feature';
  const CLASSES = {
    Barbarian: {
      die: 12, primary: 'Strength', saves: ['str', 'con'],
      skills: { n: 2, from: ['animal', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
      armor: 'Light and medium armor, shields', weapons: 'Simple and martial weapons', tools: '',
      priority: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
      ac: { type: 'unarmored', extra: 'con' },
      weaponsHeld: ['Greataxe', 'Handaxe'],
      equip: 'Greataxe, 4 Handaxes, Explorer\'s Pack, 15 GP',
      blurb: 'A fierce warrior fuelled by primal rage.',
      features: {
        1: ['Rage', 'Unarmored Defense', 'Weapon Mastery'], 2: ['Danger Sense', 'Reckless Attack'],
        3: ['Barbarian Subclass', 'Primal Knowledge'], 4: [ASI], 5: ['Extra Attack', 'Fast Movement'],
        6: [SUB], 7: ['Feral Instinct', 'Instinctive Pounce'], 8: [ASI], 9: ['Brutal Strike'], 10: [SUB],
        11: ['Relentless Rage'], 12: [ASI], 13: ['Improved Brutal Strike'], 14: [SUB], 15: ['Persistent Rage'],
        16: [ASI], 17: ['Improved Brutal Strike'], 18: ['Indomitable Might'], 19: ['Epic Boon'], 20: ['Primal Champion'],
      },
      subclasses: {
        'Path of the Berserker': { 3: ['Frenzy'], 6: ['Mindless Rage'], 10: ['Retaliation'], 14: ['Intimidating Presence'] },
        'Path of the Wild Heart': { 3: ['Animal Speaker', 'Rage of the Wilds'], 6: ['Aspect of the Wilds'], 10: ['Nature Speaker'], 14: ['Power of the Wilds'] },
        'Path of the World Tree': { 3: ['Vitality of the Tree'], 6: ['Branches of the Tree'], 10: ['Battering Roots'], 14: ['Travel along the Tree'] },
        'Path of the Zealot': { 3: ['Divine Fury', 'Warrior of the Gods'], 6: ['Fanatical Focus'], 10: ['Zealous Presence'], 14: ['Rage of the Gods'] },
      },
      stats(l, c) {
        const rages = l < 3 ? 2 : l < 6 ? 3 : l < 12 ? 4 : l < 17 ? 5 : 6;
        const dmg = l < 9 ? 2 : l < 16 ? 3 : 4;
        return [`Rage: ${rages} uses per long rest, +${dmg} damage`, `Weapon Mastery: ${l < 4 ? 2 : l < 10 ? 3 : 4} weapons`];
      },
      speedBonus: l => (l >= 5 ? 10 : 0),
    },
    Bard: {
      die: 8, primary: 'Charisma', saves: ['dex', 'cha'],
      skills: { n: 3, from: ALL_SKILLS },
      armor: 'Light armor', weapons: 'Simple weapons', tools: 'Three musical instruments',
      priority: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
      ac: { type: 'armor', base: 11, name: 'Leather Armor' },
      weaponsHeld: ['Dagger'],
      equip: 'Leather Armor, 2 Daggers, Musical Instrument, Entertainer\'s Pack, 19 GP',
      blurb: 'An inspiring performer whose magic is woven into music and words.',
      caster: { type: 'full', abil: 'cha', cantrips: [2, 3, 4], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
      features: {
        1: ['Bardic Inspiration', 'Spellcasting'], 2: ['Expertise', 'Jack of All Trades'], 3: ['Bard Subclass'], 4: [ASI],
        5: ['Font of Inspiration'], 6: [SUB], 7: ['Countercharm'], 8: [ASI], 9: ['Expertise'], 10: ['Magical Secrets'],
        12: [ASI], 14: [SUB], 16: [ASI], 18: ['Superior Inspiration'], 19: ['Epic Boon'], 20: ['Words of Creation'],
      },
      subclasses: {
        'College of Dance': { 3: ['Dazzling Footwork'], 6: ['Inspiring Movement', 'Tandem Footwork'], 14: ['Leading Evasion'] },
        'College of Glamour': { 3: ['Beguiling Magic', 'Mantle of Inspiration'], 6: ['Mantle of Majesty'], 14: ['Unbreakable Majesty'] },
        'College of Lore': { 3: ['Bonus Proficiencies', 'Cutting Words'], 6: ['Magical Discoveries'], 14: ['Peerless Skill'] },
        'College of Valor': { 3: ['Combat Inspiration', 'Martial Training'], 6: ['Extra Attack'], 14: ['Battle Magic'] },
      },
      stats(l, c) {
        const die = l < 5 ? 'd6' : l < 10 ? 'd8' : l < 15 ? 'd10' : 'd12';
        return [`Bardic Inspiration: ${die}, ${Math.max(1, c.mod('cha'))} uses per ${l >= 5 ? 'short or ' : ''}long rest`];
      },
    },
    Cleric: {
      die: 8, primary: 'Wisdom', saves: ['wis', 'cha'],
      skills: { n: 2, from: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
      armor: 'Light and medium armor, shields', weapons: 'Simple weapons', tools: '',
      priority: ['wis', 'con', 'str', 'dex', 'cha', 'int'],
      ac: { type: 'armor', base: 13, maxDex: 2, shield: true, name: 'Chain Shirt and Shield' },
      weaponsHeld: ['Mace'],
      equip: 'Chain Shirt, Shield, Mace, Holy Symbol, Priest\'s Pack, 7 GP',
      blurb: 'A divine champion who channels the power of a god.',
      caster: { type: 'full', abil: 'wis', cantrips: [3, 4, 5], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
      features: {
        1: ['Spellcasting', 'Divine Order'], 2: ['Channel Divinity'], 3: ['Cleric Subclass'], 4: [ASI], 5: ['Sear Undead'],
        6: [SUB], 7: ['Blessed Strikes'], 8: [ASI], 10: ['Divine Intervention'], 12: [ASI], 14: ['Improved Blessed Strikes'],
        16: [ASI], 17: [SUB], 19: ['Epic Boon'], 20: ['Greater Divine Intervention'],
      },
      subclasses: {
        'Knowledge Domain': { 3: ['Blessings of Knowledge', 'Knowledge Domain Spells', 'Mind Magic'], 6: ['Unfettered Mind'], 17: ['Divine Foreknowledge'] },
        'Life Domain': { 3: ['Disciple of Life', 'Life Domain Spells', 'Preserve Life'], 6: ['Blessed Healer'], 17: ['Supreme Healing'] },
        'Light Domain': { 3: ['Light Domain Spells', 'Radiance of the Dawn', 'Warding Flare'], 6: ['Improved Warding Flare'], 17: ['Corona of Light'] },
        'Trickery Domain': { 3: ['Blessing of the Trickster', 'Invoke Duplicity', 'Trickery Domain Spells'], 6: ["Trickster's Transposition"], 17: ['Improved Duplicity'] },
      },
      stats(l) {
        return l >= 2 ? [`Channel Divinity: ${l < 6 ? 2 : l < 18 ? 3 : 4} uses per long rest (regain one on a short rest)`] : [];
      },
    },
    Druid: {
      die: 8, primary: 'Wisdom', saves: ['int', 'wis'],
      skills: { n: 2, from: ['arcana', 'animal', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
      armor: 'Light armor, shields', weapons: 'Simple weapons', tools: 'Herbalism Kit',
      priority: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
      ac: { type: 'armor', base: 11, shield: true, name: 'Leather Armor and Shield' },
      weaponsHeld: ['Sickle', 'Quarterstaff'],
      equip: 'Leather Armor, Shield, Sickle, Druidic Focus (Quarterstaff), Explorer\'s Pack, Herbalism Kit, 9 GP',
      blurb: 'A priest of the old faith who wields nature\'s magic and wild shapes.',
      caster: { type: 'full', abil: 'wis', cantrips: [2, 3, 4], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
      features: {
        1: ['Spellcasting', 'Druidic', 'Primal Order'], 2: ['Wild Shape', 'Wild Companion'], 3: ['Druid Subclass'], 4: [ASI],
        5: ['Wild Resurgence'], 6: [SUB], 7: ['Elemental Fury'], 8: [ASI], 10: [SUB], 12: [ASI], 14: [SUB],
        15: ['Improved Elemental Fury'], 16: [ASI], 18: ['Beast Spells'], 19: ['Epic Boon'], 20: ['Archdruid'],
      },
      subclasses: {
        'Circle of the Land': { 3: ['Circle of the Land Spells', "Land's Aid"], 6: ['Natural Recovery'], 10: ["Nature's Ward"], 14: ["Nature's Sanctuary"] },
        'Circle of the Moon': { 3: ['Circle Forms', 'Circle of the Moon Spells'], 6: ['Improved Circle Forms'], 10: ['Moonlight Step'], 14: ['Lunar Form'] },
        'Circle of the Sea': { 3: ['Circle of the Sea Spells', 'Wrath of the Sea'], 6: ['Aquatic Affinity'], 10: ['Stormborn'], 14: ['Oceanic Gift'] },
        'Circle of the Stars': { 3: ['Star Map', 'Starry Form'], 6: ['Cosmic Omen'], 10: ['Twinkling Constellations'], 14: ['Full of Stars'] },
      },
      stats(l) {
        return l >= 2 ? [`Wild Shape: ${l < 6 ? 2 : l < 17 ? 3 : 4} uses (regain one on a short rest, all on a long rest)`] : [];
      },
    },
    Fighter: {
      die: 10, primary: 'Strength or Dexterity', saves: ['str', 'con'],
      skills: { n: 2, from: ['acrobatics', 'animal', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'] },
      armor: 'All armor, shields', weapons: 'Simple and martial weapons', tools: '',
      priority: ['str', 'con', 'dex', 'wis', 'int', 'cha'],
      ac: { type: 'armor', base: 16, maxDex: 0, name: 'Chain Mail' },
      weaponsHeld: ['Greatsword', 'Flail', 'Javelin'],
      equip: 'Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer\'s Pack, 4 GP',
      blurb: 'A master of weapons, armor and battlefield tactics.',
      features: {
        1: ['Fighting Style', 'Second Wind', 'Weapon Mastery'], 2: ['Action Surge', 'Tactical Mind'], 3: ['Fighter Subclass'],
        4: [ASI], 5: ['Extra Attack', 'Tactical Shift'], 6: [ASI], 7: [SUB], 8: [ASI], 9: ['Indomitable', 'Tactical Master'],
        10: [SUB], 11: ['Two Extra Attacks'], 12: [ASI], 13: ['Indomitable (2 uses)', 'Studied Attacks'], 14: [ASI],
        15: [SUB], 16: [ASI], 17: ['Action Surge (2 uses)', 'Indomitable (3 uses)'], 18: [SUB], 19: ['Epic Boon'], 20: ['Three Extra Attacks'],
      },
      subclasses: {
        'Battle Master': { 3: ['Combat Superiority', 'Student of War'], 7: ['Know Your Enemy'], 10: ['Improved Combat Superiority'], 15: ['Relentless'], 18: ['Ultimate Combat Superiority'] },
        'Champion': { 3: ['Improved Critical', 'Remarkable Athlete'], 7: ['Additional Fighting Style'], 10: ['Heroic Warrior'], 15: ['Superior Critical'], 18: ['Survivor'] },
        'Eldritch Knight': { 3: ['Spellcasting', 'War Bond'], 7: ['War Magic'], 10: ['Eldritch Strike'], 15: ['Arcane Charge'], 18: ['Improved War Magic'] },
        'Psi Warrior': { 3: ['Psionic Power'], 7: ['Telekinetic Adept'], 10: ['Guarded Mind'], 15: ['Bulwark of Force'], 18: ['Telekinetic Master'] },
      },
      stats(l) {
        return [
          `Second Wind: ${l < 4 ? 2 : l < 10 ? 3 : 4} uses, heals 1d10 + ${l}`,
          `Weapon Mastery: ${l < 4 ? 3 : l < 10 ? 4 : l < 16 ? 5 : 6} weapons`,
        ];
      },
    },
    Monk: {
      die: 8, primary: 'Dexterity and Wisdom', saves: ['str', 'dex'],
      skills: { n: 2, from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] },
      armor: 'None', weapons: 'Simple weapons, martial weapons with the Light property', tools: "One artisan's tool or musical instrument",
      priority: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
      ac: { type: 'unarmored', extra: 'wis' },
      weaponsHeld: ['Spear', 'Dagger', 'Unarmed Strike'],
      equip: "Spear, 5 Daggers, Artisan's Tools or Musical Instrument, Explorer's Pack, 11 GP",
      blurb: 'A martial artist who channels inner focus through body and mind.',
      features: {
        1: ['Martial Arts', 'Unarmored Defense'], 2: ["Monk's Focus", 'Unarmored Movement', 'Uncanny Metabolism'],
        3: ['Deflect Attacks', 'Monk Subclass'], 4: [ASI, 'Slow Fall'], 5: ['Extra Attack', 'Stunning Strike'],
        6: ['Empowered Strikes', SUB], 7: ['Evasion'], 8: [ASI], 9: ['Acrobatic Movement'], 10: ['Heightened Focus', 'Self-Restoration'],
        11: [SUB], 12: [ASI], 13: ['Deflect Energy'], 14: ['Disciplined Survivor'], 15: ['Perfect Focus'], 16: [ASI], 17: [SUB],
        18: ['Superior Defense'], 19: ['Epic Boon'], 20: ['Body and Mind'],
      },
      subclasses: {
        'Warrior of Mercy': { 3: ['Hand of Harm', 'Hand of Healing', 'Implements of Mercy'], 6: ["Physician's Touch"], 11: ['Flurry of Healing and Harm'], 17: ['Hand of Ultimate Mercy'] },
        'Warrior of Shadow': { 3: ['Shadow Arts'], 6: ['Shadow Step'], 11: ['Improved Shadow Step'], 17: ['Cloak of Shadows'] },
        'Warrior of the Elements': { 3: ['Elemental Attunement', 'Manipulate Elements'], 6: ['Elemental Burst'], 11: ['Stride of the Elements'], 17: ['Elemental Epitome'] },
        'Warrior of the Open Hand': { 3: ['Open Hand Technique'], 6: ['Wholeness of Body'], 11: ['Fleet Step'], 17: ['Quivering Palm'] },
      },
      martialDie: l => (l < 5 ? 'd6' : l < 11 ? 'd8' : l < 17 ? 'd10' : 'd12'),
      stats(l) {
        const out = [`Martial Arts die: ${this.martialDie(l)}`];
        if (l >= 2) out.push(`Focus Points: ${l}`);
        return out;
      },
      speedBonus: l => (l < 2 ? 0 : l < 6 ? 10 : l < 10 ? 15 : l < 14 ? 20 : l < 18 ? 25 : 30),
    },
    Paladin: {
      die: 10, primary: 'Strength and Charisma', saves: ['wis', 'cha'],
      skills: { n: 2, from: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
      armor: 'All armor, shields', weapons: 'Simple and martial weapons', tools: '',
      priority: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
      ac: { type: 'armor', base: 16, maxDex: 0, shield: true, name: 'Chain Mail and Shield' },
      weaponsHeld: ['Longsword', 'Javelin'],
      equip: 'Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol, Priest\'s Pack, 9 GP',
      blurb: 'A holy warrior bound by a sacred oath.',
      caster: { type: 'half', abil: 'cha', cantrips: null, prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15] },
      features: {
        1: ['Lay On Hands', 'Spellcasting', 'Weapon Mastery'], 2: ['Fighting Style', "Paladin's Smite"], 3: ['Channel Divinity', 'Paladin Subclass'],
        4: [ASI], 5: ['Extra Attack', 'Faithful Steed'], 6: ['Aura of Protection'], 7: [SUB], 8: [ASI], 9: ['Abjure Foes'],
        10: ['Aura of Courage'], 11: ['Radiant Strikes'], 12: [ASI], 14: ['Restoring Touch'], 15: [SUB], 16: [ASI],
        18: ['Aura Expansion'], 19: ['Epic Boon'], 20: [SUB],
      },
      subclasses: {
        'Oath of Devotion': { 3: ['Oath of Devotion Spells', 'Sacred Weapon'], 7: ['Aura of Devotion'], 15: ['Smite of Protection'], 20: ['Holy Nimbus'] },
        'Oath of Glory': { 3: ['Inspiring Smite', 'Oath of Glory Spells', 'Peerless Athlete'], 7: ['Aura of Alacrity'], 15: ['Glorious Defense'], 20: ['Living Legend'] },
        'Oath of the Ancients': { 3: ["Nature's Wrath", 'Oath of the Ancients Spells'], 7: ['Aura of Warding'], 15: ['Undying Sentinel'], 20: ['Elder Champion'] },
        'Oath of Vengeance': { 3: ['Oath of Vengeance Spells', 'Vow of Enmity'], 7: ['Relentless Avenger'], 15: ['Soul of Vengeance'], 20: ['Avenging Angel'] },
      },
      stats(l) {
        const out = [`Lay On Hands: pool of ${5 * l} HP per long rest`];
        if (l >= 3) out.push(`Channel Divinity: ${l < 11 ? 2 : 3} uses per long rest (regain one on a short rest)`);
        return out;
      },
    },
    Ranger: {
      die: 10, primary: 'Dexterity and Wisdom', saves: ['str', 'dex'],
      skills: { n: 3, from: ['animal', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
      armor: 'Light and medium armor, shields', weapons: 'Simple and martial weapons', tools: '',
      priority: ['dex', 'wis', 'con', 'str', 'int', 'cha'],
      ac: { type: 'armor', base: 12, name: 'Studded Leather Armor' },
      weaponsHeld: ['Longbow', 'Scimitar', 'Shortsword'],
      equip: 'Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Druidic Focus (sprig of mistletoe), Explorer\'s Pack, 7 GP',
      blurb: 'A wandering hunter who blends martial skill with nature magic.',
      caster: { type: 'half', abil: 'wis', cantrips: null, prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15] },
      features: {
        1: ['Favored Enemy', 'Spellcasting', 'Weapon Mastery'], 2: ['Deft Explorer', 'Fighting Style'], 3: ['Ranger Subclass'],
        4: [ASI], 5: ['Extra Attack'], 6: ['Roving'], 7: [SUB], 8: [ASI], 9: ['Expertise'], 10: ['Tireless'], 11: [SUB],
        12: [ASI], 13: ['Relentless Hunter'], 14: ["Nature's Veil"], 15: [SUB], 16: [ASI], 17: ['Precise Hunter'],
        18: ['Feral Senses'], 19: ['Epic Boon'], 20: ['Foe Slayer'],
      },
      subclasses: {
        'Beast Master': { 3: ['Primal Companion'], 7: ['Exceptional Training'], 11: ['Bestial Fury'], 15: ['Share Spells'] },
        'Fey Wanderer': { 3: ['Dreadful Strikes', 'Fey Wanderer Spells', 'Otherworldly Glamour'], 7: ['Beguiling Twist'], 11: ['Fey Reinforcements'], 15: ['Misty Wanderer'] },
        'Gloom Stalker': { 3: ['Dread Ambusher', 'Gloom Stalker Spells', 'Umbral Sight'], 7: ['Iron Mind'], 11: ["Stalker's Flurry"], 15: ['Shadowy Dodge'] },
        'Hunter': { 3: ["Hunter's Lore", "Hunter's Prey"], 7: ['Defensive Tactics'], 11: ["Superior Hunter's Prey"], 15: ["Superior Hunter's Defense"] },
      },
      stats(l) {
        return [`Favored Enemy: cast Hunter's Mark ${l < 5 ? 2 : l < 9 ? 3 : l < 13 ? 4 : l < 17 ? 5 : 6} times free per long rest`];
      },
      speedBonus: l => (l >= 6 ? 10 : 0),
    },
    Rogue: {
      die: 8, primary: 'Dexterity', saves: ['dex', 'int'],
      skills: { n: 4, from: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleight', 'stealth'] },
      armor: 'Light armor', weapons: 'Simple weapons, martial weapons with the Finesse or Light property', tools: "Thieves' Tools",
      priority: ['dex', 'con', 'wis', 'int', 'cha', 'str'],
      ac: { type: 'armor', base: 11, name: 'Leather Armor' },
      weaponsHeld: ['Shortsword', 'Shortbow', 'Dagger'],
      equip: "Leather Armor, 2 Daggers, Shortsword, Shortbow, 20 Arrows, Quiver, Thieves' Tools, Burglar's Pack, 8 GP",
      blurb: 'A scoundrel who relies on stealth, skill and precise strikes.',
      features: {
        1: ['Expertise', 'Sneak Attack', "Thieves' Cant", 'Weapon Mastery'], 2: ['Cunning Action'], 3: ['Rogue Subclass', 'Steady Aim'],
        4: [ASI], 5: ['Cunning Strike', 'Uncanny Dodge'], 6: ['Expertise'], 7: ['Evasion', 'Reliable Talent'], 8: [ASI], 9: [SUB],
        10: [ASI], 11: ['Improved Cunning Strike'], 12: [ASI], 13: [SUB], 14: ['Devious Strikes'], 15: ['Slippery Mind'], 16: [ASI],
        17: [SUB], 18: ['Elusive'], 19: ['Epic Boon'], 20: ['Stroke of Luck'],
      },
      subclasses: {
        'Arcane Trickster': { 3: ['Spellcasting', 'Mage Hand Legerdemain'], 9: ['Magical Ambush'], 13: ['Versatile Trickster'], 17: ['Spell Thief'] },
        'Assassin': { 3: ['Assassinate', "Assassin's Tools"], 9: ['Infiltration Expertise'], 13: ['Envenom Weapons'], 17: ['Death Strike'] },
        'Soulknife': { 3: ['Psionic Power', 'Psychic Blades'], 9: ['Soul Blades'], 13: ['Psychic Veil'], 17: ['Rend Mind'] },
        'Thief': { 3: ['Fast Hands', 'Second-Story Work'], 9: ['Supreme Sneak'], 13: ['Use Magic Device'], 17: ["Thief's Reflexes"] },
      },
      stats(l) {
        return [`Sneak Attack: ${Math.ceil(l / 2)}d6 once per turn`, 'Expertise: pick two of your proficient skills on the sheet (click their dot again)'];
      },
    },
    Sorcerer: {
      die: 6, primary: 'Charisma', saves: ['con', 'cha'],
      skills: { n: 2, from: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] },
      armor: 'None', weapons: 'Simple weapons', tools: '',
      priority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
      ac: { type: 'none' },
      weaponsHeld: ['Spear', 'Dagger'],
      equip: "Spear, 2 Daggers, Arcane Focus (crystal), Dungeoneer's Pack, 28 GP",
      blurb: 'A spellcaster with raw magic in their blood.',
      caster: { type: 'full', abil: 'cha', cantrips: [4, 5, 6], prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
      features: {
        1: ['Innate Sorcery', 'Spellcasting'], 2: ['Font of Magic', 'Metamagic'], 3: ['Sorcerer Subclass'], 4: [ASI],
        5: ['Sorcerous Restoration'], 6: [SUB], 7: ['Sorcery Incarnate'], 8: [ASI], 10: ['Metamagic'], 12: [ASI], 14: [SUB],
        16: [ASI], 17: ['Metamagic'], 18: [SUB], 19: ['Epic Boon'], 20: ['Arcane Apotheosis'],
      },
      subclasses: {
        'Aberrant Sorcery': { 3: ['Psionic Spells', 'Telepathic Speech'], 6: ['Psionic Sorcery', 'Psychic Defenses'], 14: ['Revelation in Flesh'], 18: ['Warping Implosion'] },
        'Clockwork Sorcery': { 3: ['Clockwork Spells', 'Restore Balance'], 6: ['Bastion of Law'], 14: ['Trance of Order'], 18: ['Clockwork Cavalcade'] },
        'Draconic Sorcery': { 3: ['Draconic Resilience', 'Draconic Spells'], 6: ['Elemental Affinity'], 14: ['Dragon Wings'], 18: ['Dragon Companion'] },
        'Wild Magic Sorcery': { 3: ['Tides of Chaos', 'Wild Magic Surge'], 6: ['Bend Luck'], 14: ['Controlled Chaos'], 18: ['Tamed Surge'] },
      },
      stats(l) {
        return l >= 2 ? [`Sorcery Points: ${l}`] : [];
      },
    },
    Warlock: {
      die: 8, primary: 'Charisma', saves: ['wis', 'cha'],
      skills: { n: 2, from: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] },
      armor: 'Light armor', weapons: 'Simple weapons', tools: '',
      priority: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
      ac: { type: 'armor', base: 11, name: 'Leather Armor' },
      weaponsHeld: ['Sickle', 'Dagger'],
      equip: "Leather Armor, Sickle, 2 Daggers, Arcane Focus (orb), Book (occult lore), Scholar's Pack, 15 GP",
      blurb: 'A seeker of hidden lore bound to an otherworldly patron.',
      caster: { type: 'pact', abil: 'cha', cantrips: [2, 3, 4], prepared: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15] },
      features: {
        1: ['Eldritch Invocations', 'Pact Magic'], 2: ['Magical Cunning'], 3: ['Warlock Subclass'], 4: [ASI], 6: [SUB], 8: [ASI],
        9: ['Contact Patron'], 10: [SUB], 11: ['Mystic Arcanum (6th level)'], 12: [ASI], 13: ['Mystic Arcanum (7th level)'], 14: [SUB],
        15: ['Mystic Arcanum (8th level)'], 16: [ASI], 17: ['Mystic Arcanum (9th level)'], 19: ['Epic Boon'], 20: ['Eldritch Master'],
      },
      subclasses: {
        'Archfey Patron': { 3: ['Archfey Spells', 'Steps of the Fey'], 6: ['Misty Escape'], 10: ['Beguiling Defenses'], 14: ['Bewitching Magic'] },
        'Celestial Patron': { 3: ['Celestial Spells', 'Healing Light'], 6: ['Radiant Soul'], 10: ['Celestial Resilience'], 14: ['Searing Vengeance'] },
        'Fiend Patron': { 3: ["Dark One's Blessing", 'Fiend Spells'], 6: ["Dark One's Own Luck"], 10: ['Fiendish Resilience'], 14: ['Hurl Through Hell'] },
        'Great Old One Patron': { 3: ['Awakened Mind', 'Great Old One Spells', 'Psychic Spells'], 6: ['Clairvoyant Combatant'], 10: ['Eldritch Hex', 'Thought Shield'], 14: ['Create Thrall'] },
      },
      stats(l) {
        const inv = l < 2 ? 1 : l < 5 ? 3 : l < 7 ? 5 : l < 9 ? 6 : l < 12 ? 7 : l < 15 ? 8 : l < 18 ? 9 : 10;
        return [`Eldritch Invocations known: ${inv}`];
      },
    },
    Wizard: {
      die: 6, primary: 'Intelligence', saves: ['int', 'wis'],
      skills: { n: 2, from: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'] },
      armor: 'None', weapons: 'Simple weapons', tools: '',
      priority: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
      ac: { type: 'none' },
      weaponsHeld: ['Quarterstaff', 'Dagger'],
      equip: "2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar's Pack, 5 GP",
      blurb: 'A scholarly magic-user who masters spells through study.',
      caster: { type: 'full', abil: 'int', cantrips: [3, 4, 5], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25] },
      features: {
        1: ['Arcane Recovery', 'Ritual Adept', 'Spellcasting'], 2: ['Scholar'], 3: ['Wizard Subclass'], 4: [ASI], 5: ['Memorize Spell'],
        6: [SUB], 8: [ASI], 10: [SUB], 12: [ASI], 14: [SUB], 16: [ASI], 18: ['Spell Mastery'], 19: ['Epic Boon'], 20: ['Signature Spells'],
      },
      subclasses: {
        'Abjurer': { 3: ['Abjuration Savant', 'Arcane Ward'], 6: ['Projected Ward'], 10: ['Spell Breaker'], 14: ['Spell Resistance'] },
        'Diviner': { 3: ['Divination Savant', 'Portent'], 6: ['Expert Divination'], 10: ['The Third Eye'], 14: ['Greater Portent'] },
        'Evoker': { 3: ['Evocation Savant', 'Potent Cantrip'], 6: ['Sculpt Spells'], 10: ['Empowered Evocation'], 14: ['Overchannel'] },
        'Illusionist': { 3: ['Illusion Savant', 'Improved Illusions'], 6: ['Phantasmal Creatures'], 10: ['Illusory Self'], 14: ['Illusory Reality'] },
      },
      stats(l) {
        return [`Arcane Recovery: recover spell slots totalling up to ${Math.ceil(l / 2)} levels on a short rest, once per day`];
      },
    },
  };

  /* Spell slots for a full caster at each level (index 0 = level 1). */
  const FULL_SLOTS = [
    [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ];

  function spellSlots(caster, level) {
    if (caster.type === 'full') return FULL_SLOTS[level - 1];
    if (caster.type === 'half') return FULL_SLOTS[Math.ceil(level / 2) - 1];
    if (caster.type === 'pact') {
      const count = level < 2 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4;
      const slotLevel = Math.min(5, Math.ceil(level / 2));
      return { pact: true, count, slotLevel };
    }
    return [];
  }

  function cantripsKnown(caster, level) {
    if (!caster.cantrips) return 0;
    return caster.cantrips[level < 4 ? 0 : level < 10 ? 1 : 2];
  }

  const profBonus = level => 2 + Math.floor((level - 1) / 4);

  return {
    ABIL, ABIL_NAME, SKILL_NAME, ALL_SKILLS, XP, ORIGIN_FEATS,
    SPECIES, BACKGROUNDS, CLASSES, WEAPONS,
    spellSlots, cantripsKnown, profBonus,
  };
})();
