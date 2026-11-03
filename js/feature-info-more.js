'use strict';

/*
 * Short, plain-language summaries of subclass features from other official books
 * (Xanathar's, Tasha's, Sword Coast, the 2014 Player's Handbook and DMG, and more).
 * Most of these were written for the 2014 rules: "Focus Points" means ki, and features
 * from levels 1 and 2 arrive at level 3 on this site. Written in our own words; check
 * the book for the exact rules. PB = proficiency bonus.
 */
(() => {
  if (typeof FeatureInfo === 'undefined' || !FeatureInfo.extend) return;

  const SHARED = {
    'Circle Spells': 'Your circle\'s spells are always prepared for you as you level; they don\'t count against your prepared spells.',
    'Oath Spells': 'Your oath\'s spells are always prepared for you as you level; they don\'t count against your prepared spells.',
    'Oathbreaker Spells': 'Extra spells (mostly fear and death magic) that are always prepared for you as you level.',
  };
  const DOMAIN = 'Your domain\'s spells are always prepared for you as you level; they don\'t count against your prepared spells.';

  FeatureInfo.extend({
    /* ---------- Barbarian ---------- */
    'Path of the Ancestral Guardian': {
      'Ancestral Protectors': 'While raging, the first creature you hit on your turn has disadvantage on attacks against anyone but you, and anyone else it hits has resistance to that damage, until the start of your next turn.',
      'Spirit Shield': 'Reaction while raging, when a creature you can see within 30 ft takes damage: reduce it by 2d6 (3d6 at level 10, 4d6 at 14).',
      'Consult the Spirits': 'Cast Augury or Clairvoyance without a spell slot or components (Wisdom is your spellcasting ability). Once per short or long rest.',
      'Vengeful Ancestors': 'When Spirit Shield reduces damage, the attacker takes force damage equal to the amount you prevented.',
    },
    'Path of the Battlerager': {
      'Battlerager Armor': 'While raging in spiked armor: bonus action for one armor-spike attack (1d4 piercing, Strength). When you grapple or try to, the target takes 3 piercing damage.',
      'Reckless Abandon': 'When you attack recklessly while raging, gain temporary HP equal to your Constitution modifier (minimum 1).',
      'Battlerager Charge': 'You can Dash as a bonus action while raging.',
      'Spiked Retribution': 'While raging in spiked armor, a creature within 5 ft that hits you with a melee attack takes 3 piercing damage.',
    },
    'Path of the Beast': {
      'Form of the Beast': 'When you rage, grow a natural weapon: Bite (1d8; once per turn heal PB HP if you are below half), Claws (1d6, and one extra claw attack when you attack with them), or Tail (1d8, 10 ft reach; reaction to add 1d8 to your AC against a hit).',
      'Bestial Soul': 'Your natural weapons count as magical. After each rest, choose: swim speed and water breathing, climb speed, or a jump boost.',
      'Infectious Fury': 'When you hit with a natural weapon while raging, the target makes a Wisdom save or must attack another creature with its reaction, or takes 2d12 psychic damage. PB uses per long rest.',
      'Call the Hunt': 'When you rage, choose allies within 30 ft (up to your Constitution modifier): they deal +1d6 damage once per turn and you gain 5 temporary HP per ally. PB uses per long rest.',
    },
    'Path of the Giant': {
      "Giant's Power": 'Learn Druidcraft or Thaumaturgy, and the Giant language.',
      "Giant's Havoc": 'While raging, thrown weapon attacks add your Rage damage, and you can become Large with 5 ft more reach.',
      'Elemental Cleaver': 'When you rage, infuse a weapon with acid, cold, fire, lightning or thunder: it deals that type, +1d6 damage, and can be thrown (20/60 ft), flying back to you.',
      'Mighty Impel': 'Bonus action while raging: hurl a Medium or smaller creature in reach to a space up to 30 ft away. An unwilling creature makes a Strength save.',
      'Demiurgic Colossus': 'Your raging reach grows by 10 ft and you can become Large or Huge; Elemental Cleaver deals 2d6 and Mighty Impel works on Large creatures.',
    },
    'Path of the Storm Herald': {
      'Storm Aura': 'While raging, you have a 10 ft aura: Desert (fire damage to creatures of your choice), Sea (lightning damage to one creature, Dexterity save for half) or Tundra (temporary HP to allies). Use it again with a bonus action.',
      'Storm Soul': 'Resistance from your storm (fire, lightning or cold) plus a minor benefit, like ignoring extreme heat or cold or breathing underwater.',
      'Shielding Storm': 'Creatures of your choice in your aura gain your Storm Soul resistance.',
      'Raging Storm': 'A reaction from your aura: Desert burns a creature that hits you, Sea knocks a creature you hit prone, Tundra drops a creature\'s speed to 0 (saves apply).',
    },
    'Path of the Totem Warrior': {
      'Spirit Seeker': 'Cast Beast Sense and Speak with Animals as rituals.',
      'Totem Spirit': 'Choose a totem that works while raging: Bear (resistance to all damage but psychic), Eagle (opportunity attacks against you have disadvantage; Dash as a bonus action), Elk (+15 ft speed), Tiger (longer jumps) or Wolf (allies get advantage on melee attacks against enemies next to you).',
      'Aspect of the Beast': 'A lasting benefit from a totem: Bear (carry more), Eagle (sharp sight), Elk (faster travel), Tiger (two skills) or Wolf (track and sneak while traveling fast).',
      'Spirit Walker': 'Cast Commune with Nature as a ritual.',
      'Totemic Attunement': 'A stronger totem power while raging: Bear (nearby enemies have disadvantage attacking others), Eagle (fly), Elk (bowl over creatures as you move), Tiger (bonus-action attack after a charge) or Wolf (knock creatures prone on a hit).',
    },
    'Path of Wild Magic': {
      'Magic Awareness': 'Action: sense spells and magic items within 60 ft and their school of magic. PB uses per long rest.',
      'Wild Surge': 'When you rage, roll on the Wild Magic table for a random effect, like a necrotic burst, a teleport, a glowing weapon or a protective aura.',
      'Bolstering Magic': 'Action: touch a creature to give it +1d3 to attacks and ability checks for 10 minutes, or let it regain a spell slot of level 1d3. PB uses per long rest.',
      'Unstable Backlash': 'Reaction while raging, when you take damage or fail a save: replace your current Wild Surge with a new roll.',
      'Controlled Surge': 'When you roll on the Wild Magic table, roll twice and pick (if both match, choose any effect).',
    },

    /* ---------- Bard ---------- */
    'College of Creation': {
      'Mote of Potential': 'Your Bardic Inspiration comes with a mote: on an ability check roll the die twice and pick; on an attack it bursts for thunder damage around the target; on a save the creature also gains temporary HP.',
      'Performance of Creation': 'Action: create a nonmagical item worth up to 20 gp × bard level (Medium, larger at higher levels) that lasts PB hours. Once per long rest, or spend a 2nd-level or higher slot.',
      'Animating Performance': 'Action: animate a Large or smaller nonmagical object as a Dancing Item that fights for you for 1 hour. Once per long rest, or spend a 3rd-level or higher slot.',
      'Creative Crescendo': 'Performance of Creation can make several items at once (up to your Charisma modifier), with no gold limit.',
    },
    'College of Eloquence': {
      'Silver Tongue': 'On Persuasion and Deception checks, treat a d20 roll of 9 or lower as a 10.',
      'Unsettling Words': 'Bonus action: spend a Bardic Inspiration; a creature within 60 ft subtracts the roll from its next saving throw before your next turn.',
      'Unfailing Inspiration': 'If a creature adds your Bardic Inspiration and still fails, it keeps the die.',
      'Universal Speech': 'Action: up to your Charisma modifier creatures within 60 ft understand you for 1 hour. Once per long rest, or spend a spell slot.',
      'Infectious Inspiration': 'Reaction when a creature succeeds with your Bardic Inspiration: give another creature within 60 ft a Bardic Inspiration die for free. Charisma modifier uses per long rest.',
    },
    'College of Spirits': {
      'Guiding Whispers': 'Learn the Guidance cantrip, with a range of 60 ft.',
      'Spiritual Focus': 'Use a candle, crystal ball, skull, spirit board or tarokka deck as your focus. From level 6, add 1d6 to one damage or healing roll of a bard spell cast through it.',
      'Tales from Beyond': 'Bonus action: spend a Bardic Inspiration to roll a random spirit tale. Later, use an action to tell it to a creature for its effect (damage, healing, teleporting, frightening and more).',
      'Spirit Session': 'An hour-long ritual with willing creatures (up to PB): learn one divination or necromancy spell from any class list, of a level you can cast, until your next long rest.',
      'Mystical Connection': 'When you use Tales from Beyond, roll twice and choose the tale.',
    },
    'College of Swords': {
      'Bonus Proficiencies': 'Proficiency with medium armor and the scimitar; you can use a melee weapon you are proficient with as a spellcasting focus.',
      'Fighting Style': 'Choose Dueling (+2 damage with a one-handed weapon) or Two-Weapon Fighting.',
      'Blade Flourish': 'When you take the Attack action, +10 ft speed this turn. Once per turn on a hit, spend a Bardic Inspiration for a flourish: Defensive (add the die to damage and AC), Slashing (damage another nearby creature too) or Mobile (push the target and follow it).',
      'Extra Attack': 'When you take the Attack action, you attack twice instead of once.',
      "Master's Flourish": 'When you use a Blade Flourish, you can roll a d6 instead of spending a Bardic Inspiration.',
    },
    'College of Whispers': {
      'Psychic Blades': 'Once per turn when you hit with a weapon, spend a Bardic Inspiration for extra psychic damage (2d6, growing with level).',
      'Words of Terror': 'Talk alone with a creature for a minute: it makes a Wisdom save or is frightened of you or someone you choose for an hour. Once per short or long rest.',
      'Mantle of Whispers': 'Reaction when a humanoid dies near you: catch its shadow, then use an action to take on its looks for an hour and recall basic facts about its life. Once per short or long rest.',
      'Shadow Lore': 'Action: a creature within 30 ft makes a Wisdom save or is charmed for 8 hours, obeying you because it believes you know its darkest secret. Once per long rest.',
    },

    /* ---------- Cleric ---------- */
    'Arcana Domain': {
      'Domain Spells': DOMAIN,
      'Arcane Initiate': 'Proficiency in Arcana, and learn two wizard cantrips that count as cleric cantrips.',
      'Channel Divinity: Arcane Abjuration': 'Action: a celestial, elemental, fey or fiend within 30 ft makes a Wisdom save or is turned for 1 minute. At higher levels, weak ones are banished instead.',
      'Spell Breaker': 'When you heal an ally with a spell of 1st level or higher, you can also end one spell on it of that slot\'s level or lower.',
      'Arcane Mastery': 'Choose one wizard spell each of levels 6, 7, 8 and 9 as extra domain spells.',
    },
    'Death Domain': {
      'Domain Spells': DOMAIN,
      'Bonus Proficiency': 'Proficiency with martial weapons.',
      'Reaper': 'Necromancy cantrips that target one creature can target two creatures within 5 ft of each other.',
      'Channel Divinity: Touch of Death': 'When you hit with a melee attack, deal extra necrotic damage equal to 5 + twice your cleric level.',
      'Inescapable Destruction': 'Necrotic damage from your cleric spells and Channel Divinity ignores resistance to necrotic damage.',
      'Improved Reaper': 'Necromancy spells of levels 1 to 5 that target one creature can target a second one within 5 ft of the first.',
    },
    'Forge Domain': {
      'Domain Spells': DOMAIN,
      'Bonus Proficiencies': 'Proficiency with heavy armor and smith\'s tools.',
      'Blessing of the Forge': 'At the end of a long rest, touch a nonmagical weapon or armor: it gets +1 (to attacks and damage, or to AC) until your next long rest.',
      "Channel Divinity: Artisan's Blessing": 'An hour-long ritual that makes a metal item worth up to 100 gp, using up that much metal.',
      'Soul of the Forge': 'Resistance to fire damage, and +1 AC while wearing heavy armor.',
      'Saint of Forge and Fire': 'Immunity to fire damage, and resistance to nonmagical bludgeoning, piercing and slashing while in heavy armor.',
    },
    'Grave Domain': {
      'Domain Spells': DOMAIN,
      'Circle of Mortality': 'Healing a creature at 0 HP uses the maximum on each die. Learn Spare the Dying, which you can cast as a bonus action at 30 ft.',
      'Eyes of the Grave': 'Action: sense undead within 60 ft until the end of your next turn. Wisdom modifier uses per long rest.',
      'Channel Divinity: Path to the Grave': 'Action: curse a creature within 30 ft; the next hit on it by you or an ally deals double damage (vulnerability).',
      "Sentinel at Death's Door": 'Reaction: turn a critical hit on you or an ally within 30 ft into a normal hit. Wisdom modifier uses per long rest.',
      'Keeper of Souls': 'Once per turn when an enemy dies within 60 ft, you or an ally within 60 ft regains HP equal to its number of Hit Dice.',
    },
    'Nature Domain': {
      'Domain Spells': DOMAIN,
      'Acolyte of Nature': 'Learn one druid cantrip, and gain proficiency in Animal Handling, Nature or Survival.',
      'Bonus Proficiency': 'Proficiency with heavy armor.',
      'Channel Divinity: Charm Animals and Plants': 'Action: beasts and plant creatures within 30 ft make a Wisdom save or are charmed by you for 1 minute.',
      'Dampen Elements': 'Reaction when you or a creature within 30 ft takes acid, cold, fire, lightning or thunder damage: grant resistance to it.',
      'Master of Nature': 'Bonus action: command creatures charmed by your Charm Animals and Plants.',
    },
    'Order Domain': {
      'Domain Spells': DOMAIN,
      'Bonus Proficiencies': 'Proficiency with heavy armor, and in Intimidation or Persuasion.',
      'Voice of Authority': 'When you cast a 1st-level or higher spell on an ally, it can use its reaction to make one weapon attack against a creature you choose.',
      "Channel Divinity: Order's Demand": 'Action: creatures of your choice within 30 ft make a Wisdom save or are charmed until the end of your next turn, and can be made to drop what they hold.',
      'Embodiment of the Law': 'Cast enchantment spells of 1st level or higher as a bonus action instead of an action. Wisdom modifier uses per long rest.',
      "Order's Wrath": 'Once per turn when you deal extra damage with a weapon or cantrip, curse the target: the next ally who hits it before your next turn deals +2d8 psychic.',
    },
    'Peace Domain': {
      'Domain Spells': DOMAIN,
      'Implement of Peace': 'Proficiency in Insight, Performance or Persuasion.',
      'Emboldening Bond': 'Action: bond willing creatures within 30 ft (up to PB) for 10 minutes. Once per turn, when near another bonded creature, each can add 1d4 to an attack, check or save. PB uses per long rest.',
      'Channel Divinity: Balm of Peace': 'Action: move up to your speed without provoking opportunity attacks; creatures of your choice you pass within 5 ft of regain 2d6 + Wisdom modifier HP.',
      'Protective Bond': 'Reaction: when a bonded creature takes damage, another bonded creature within 30 ft can teleport next to it and take the damage instead.',
      'Expansive Bond': 'Your bond works at 60 ft, and a creature taking damage through Protective Bond has resistance to it.',
    },
    'Tempest Domain': {
      'Domain Spells': DOMAIN,
      'Bonus Proficiencies': 'Proficiency with martial weapons and heavy armor.',
      'Wrath of the Storm': 'Reaction when a creature within 5 ft hits you: it makes a Dexterity save, taking 2d8 lightning or thunder damage (half on a success). Wisdom modifier uses per long rest.',
      'Channel Divinity: Destructive Wrath': 'When you roll lightning or thunder damage, deal the maximum instead of rolling.',
      'Thunderbolt Strike': 'When you deal lightning damage to a Large or smaller creature, you can push it up to 10 ft away.',
      'Stormborn': 'Fly speed equal to your walking speed whenever you are outdoors.',
    },
    'Twilight Domain': {
      'Domain Spells': DOMAIN,
      'Bonus Proficiencies': 'Proficiency with martial weapons and heavy armor.',
      'Eyes of Night': 'Darkvision out to 300 ft. Action: share it with willing creatures (up to your Wisdom modifier) for 1 hour, once per long rest or by spending a spell slot.',
      'Vigilant Blessing': 'Action: you or a creature you touch has advantage on the next initiative roll.',
      'Channel Divinity: Twilight Sanctuary': 'Action: a 30 ft sphere of twilight around you for 1 minute. Creatures of your choice ending their turn in it gain 1d6 + cleric level temporary HP or end being charmed or frightened.',
      'Steps of Night': 'Bonus action in dim light or darkness: fly speed equal to your walking speed for 1 minute. PB uses per long rest.',
      'Twilight Shroud': 'You and your allies have half cover while in your Twilight Sanctuary.',
    },

    /* ---------- Druid ---------- */
    'Circle of Dreams': {
      'Balm of the Summer Court': 'A pool of d6s equal to your druid level. Bonus action: spend up to half your level in dice to heal a creature within 120 ft, which also gains 1 temporary HP per die. Refills on a long rest.',
      'Hearth of Moonlight and Shadow': 'During a rest, a 30 ft area around your camp gives +5 to Stealth and Perception, and its light can\'t be seen from outside.',
      'Hidden Paths': 'Bonus action: teleport up to 60 ft, or action: teleport a willing creature you touch up to 30 ft. Wisdom modifier uses per long rest.',
      'Walker in Dreams': 'After a short rest, once per long rest: cast Dream, Scrying, or Teleportation Circle (to where you last long rested) without a spell slot.',
    },
    'Circle of the Shepherd': {
      'Speech of the Woods': 'Learn Sylvan, and you can talk with beasts as if by Speak with Animals.',
      'Spirit Totem': 'Bonus action: summon a spirit with a 30 ft aura for 1 minute: Bear (temporary HP and advantage on Strength for allies), Hawk (give allies advantage on attacks; better Perception) or Unicorn (better detection; your healing spells also heal everyone in it). Once per short or long rest.',
      'Mighty Summoner': 'Beasts and fey you summon get +2 HP per Hit Die, and their natural weapons count as magical.',
      'Guardian Spirit': 'Beasts and fey you summon that end their turn in your Spirit Totem aura regain HP equal to half your druid level.',
      'Faithful Summons': 'When you drop to 0 HP or are incapacitated against your will, four beasts appear to protect you for an hour. Once per long rest.',
    },
    'Circle of Spores': {
      'Circle Spells': SHARED['Circle Spells'],
      'Halo of Spores': 'Reaction when a creature you can see moves into or starts its turn within 10 ft: it makes a Constitution save or takes 1d4 necrotic damage (more at higher levels). You also learn Chill Touch.',
      'Symbiotic Entity': 'Action: spend a Wild Shape use to gain 4 temporary HP per druid level for 10 minutes. While they last, Halo of Spores damage doubles and melee weapon hits deal +1d6 necrotic.',
      'Fungal Infestation': 'Reaction when a Small or Medium beast or humanoid dies within 10 ft: raise it as a 1 HP zombie for an hour. Wisdom modifier uses per long rest.',
      'Spreading Spores': 'Bonus action while Symbiotic Entity is on: a 10 ft cube of spores within 30 ft deals your Halo of Spores damage to creatures that enter or start there.',
      'Fungal Body': 'You can\'t be blinded, deafened, frightened or poisoned, and critical hits against you are normal hits unless you are incapacitated.',
    },
    'Circle of Wildfire': {
      'Circle Spells': SHARED['Circle Spells'],
      'Summon Wildfire Spirit': 'Action: spend a Wild Shape use to summon a fire spirit within 30 ft for 1 hour (creatures near where it appears make a Dexterity save or take 2d6 fire). It acts on your turn, makes fire attacks and can teleport itself and allies.',
      'Enhanced Bond': 'While your spirit is out, add 1d8 to one fire damage or healing roll of your spells, and you can cast spells from the spirit\'s position.',
      'Cauterizing Flames': 'When a creature dies near you or your spirit, a flame lingers in its space; reaction when a creature enters it: heal it or burn it for 2d10 + Wisdom modifier. PB uses per long rest.',
      'Blazing Revival': 'When you drop to 0 HP with your spirit within 120 ft, it vanishes and you regain half your HP and stand up. Once per long rest.',
    },

    /* ---------- Fighter ---------- */
    'Arcane Archer': {
      'Arcane Archer Lore': 'Proficiency in Arcana or Nature, and learn Prestidigitation or Druidcraft.',
      'Arcane Shot': 'Learn two Arcane Shot options (such as Banishing, Beguiling, Bursting, Grasping, Piercing, Seeking or Shadow Arrow). Once per turn when you hit with an arrow, add one. Two uses per short or long rest; you learn more options as you level.',
      'Curving Shot': 'Bonus action when you miss with a magic arrow: reroll the attack against a different target within 60 ft.',
      'Magic Arrow': 'Your nonmagical arrows count as magical for getting past resistance.',
      'Additional Arcane Shot option': 'Learn one more Arcane Shot option.',
      'Ever-Ready Shot': 'If you have no Arcane Shot uses left when you roll initiative, you regain one.',
      'Improved Arcane Shots': 'Your Arcane Shot options deal more damage.',
    },
    'Cavalier': {
      'Bonus Proficiency': 'Proficiency in Animal Handling, History, Insight, Performance or Persuasion, or one language.',
      'Born to the Saddle': 'Advantage on saves to stay mounted, you land on your feet from short falls off a mount, and mounting or dismounting costs only 5 ft of movement.',
      'Unwavering Mark': 'When you hit a creature in melee, mark it until the end of your next turn: it has disadvantage attacking anyone else near you, and if it damages someone else you get a bonus-action attack with advantage and extra damage. Strength modifier uses per long rest.',
      'Warding Maneuver': 'Reaction when you or a creature within 5 ft is hit: add 1d8 to its AC; if the attack still hits, the damage is halved (resistance). Constitution modifier uses per long rest.',
      'Hold the Line': 'Creatures provoke opportunity attacks from you when they move 5 ft or more within your reach, and a hit drops their speed to 0 for the turn.',
      'Ferocious Charger': 'Once per turn, if you move 10 ft in a straight line and then hit, the target makes a Strength save or is knocked prone.',
      'Vigilant Defender': 'You get an extra reaction for opportunity attacks on every creature\'s turn except your own.',
    },
    'Echo Knight': {
      'Manifest Echo': 'Bonus action: create a shadowy echo of yourself within 15 ft (AC 14 + PB, 1 HP). You can attack from its space, swap places with it, and move it.',
      'Unleash Incarnation': 'When you take the Attack action, make one extra melee attack from your echo\'s position. Constitution modifier uses per long rest.',
      'Echo Avatar': 'Action: see and hear through your echo for up to 10 minutes; it can travel up to 1,000 ft away.',
      'Shadow Martyr': 'Reaction: move your echo next to an ally who is attacked so the attack hits the echo instead. Once per short or long rest.',
      'Reclaim Potential': 'When your echo is destroyed by damage, gain temporary HP equal to 2d6 + Constitution modifier. Constitution modifier uses per long rest.',
      'Legion of One': 'You can have two echoes at once, and regain an Unleash Incarnation use if you have none when you roll initiative.',
    },
    'Rune Knight': {
      'Bonus Proficiencies': 'Proficiency with smith\'s tools, and learn the Giant language.',
      'Rune Carver': 'Learn two runes (more as you level) and carve them into your gear after a long rest. Each rune gives a constant benefit and a special effect usable once per short or long rest.',
      "Giant's Might": 'Bonus action: become Large for 1 minute, with advantage on Strength checks and saves and +1d6 damage once per turn. PB uses per long rest.',
      'Runic Shield': 'Reaction when a creature within 60 ft is hit: the attacker rerolls the d20 and must use the new roll. PB uses per long rest.',
      'Great Stature': 'You grow 3d4 inches taller, and Giant\'s Might extra damage becomes 1d8.',
      'Master of Runes': 'You can use each rune\'s special effect twice per short or long rest.',
      'Runic Juggernaut': 'Giant\'s Might extra damage becomes 1d10, you can become Huge, and your reach grows 5 ft while enlarged.',
    },
    'Samurai': {
      'Bonus Proficiency': 'Proficiency in History, Insight, Performance or Persuasion, or one language.',
      'Fighting Spirit': 'Bonus action: advantage on weapon attacks this turn and temporary HP (5, rising to 10 and 15). Three uses per long rest.',
      'Elegant Courtier': 'Add your Wisdom modifier to Persuasion checks, and gain Wisdom save proficiency (or Intelligence or Charisma if you already have it).',
      'Tireless Spirit': 'If you have no Fighting Spirit uses left when you roll initiative, you regain one.',
      'Rapid Strike': 'Once per turn, when you have advantage on an attack, give it up to make an extra attack.',
      'Strength before Death': 'Reaction when you drop to 0 HP (and don\'t die): take an extra turn right away. Once per long rest.',
    },

    /* ---------- Monk ("Focus Points" are ki in the original book) ---------- */
    'Way of the Ascendant Dragon': {
      'Draconic Disciple': 'Unarmed strikes can deal acid, cold, fire, lightning or poison damage; reroll a failed Intimidation or Persuasion check once per long rest; learn Draconic.',
      'Breath of the Dragon': 'Replace one attack with a 20 ft cone or 30 ft line of elemental breath (Dexterity save, two Martial Arts dice, half on a success). PB uses per long rest; spend Focus for more.',
      'Wings Unfurled': 'When you use Step of the Wind, sprout spectral wings and fly until the end of your turn. PB uses per long rest.',
      'Aspect of the Wyrm': 'Bonus action: a 10 ft aura for 1 minute that either frightens enemies or gives you and allies resistance to your element. Once per long rest, or spend Focus.',
      'Ascendant Aspect': 'Blindsight 10 ft, stronger Breath of the Dragon, and your Aspect of the Wyrm bursts with elemental damage on nearby enemies when it starts.',
    },
    'Way of the Astral Self': {
      'Arms of the Astral Self': 'Bonus action (1 Focus Point): spectral arms for 10 minutes. Nearby creatures make a Dexterity save or take force damage; use Wisdom for Strength checks and unarmed strikes, with 5 ft more reach.',
      'Visage of the Astral Self': 'Add a spectral face: darkvision 120 ft that sees through magical darkness, advantage on Insight and Intimidation, and a voice only one creature hears or that carries far.',
      'Body of the Astral Self': 'With arms and visage active: reaction to reduce elemental or force damage by 1d10 + Wisdom modifier, and once per turn add a Martial Arts die to an arm hit.',
      'Awakened Astral Self': 'Spend Focus to summon your full astral self for 10 minutes: +2 AC and an extra arm attack when you attack.',
    },
    'Way of the Drunken Master': {
      'Bonus Proficiencies': 'Proficiency in Performance and with brewer\'s supplies.',
      'Drunken Technique': 'When you use Flurry of Blows, you also Disengage and gain +10 ft speed for the turn.',
      'Tipsy Sway': 'Stand up from prone using only 5 ft of movement. Reaction when a melee attack misses you (1 Focus Point): redirect it at another creature within 5 ft.',
      "Drunkard's Luck": 'Spend Focus Points to cancel disadvantage on an ability check, attack roll or save.',
      'Intoxicated Frenzy': 'Flurry of Blows can make up to three extra attacks, as long as each targets a different creature.',
    },
    'Way of the Kensei': {
      'Path of the Kensei': 'Choose kensei weapons (melee and ranged) that count as monk weapons. +2 AC after an unarmed strike while holding one (Agile Parry), a bonus action for +1d4 ranged damage, and proficiency with calligrapher\'s or painter\'s supplies.',
      'One with the Blade': 'Kensei weapons count as magical; once per turn spend Focus Points to add a Martial Arts die per point to a hit.',
      'Sharpen the Blade': 'Bonus action: spend up to 3 Focus Points to give a kensei weapon +1 per point to attack and damage for 1 minute.',
      'Unerring Accuracy': 'Once per turn, reroll a missed attack with a monk weapon.',
    },
    'Way of the Long Death': {
      'Touch of Death': 'When you drop a creature within 5 ft to 0 HP, gain temporary HP equal to your Wisdom modifier + monk level.',
      'Hour of Reaping': 'Action: creatures within 30 ft that can see you make a Wisdom save or are frightened until the end of your next turn.',
      'Mastery of Death': 'When you drop to 0 HP, spend 1 Focus Point to drop to 1 HP instead.',
      'Touch of the Long Death': 'Action: touch a creature and spend 1 to 10 Focus Points; it makes a Constitution save, taking 2d10 necrotic per point (half on a success).',
    },
    'Way of the Sun Soul': {
      'Radiant Sun Bolt': 'A ranged spell attack (30 ft) for a Martial Arts die + Dexterity radiant damage, usable in place of your attacks; spend Focus to fire two as a bonus action.',
      'Searing Arc Strike': 'After the Attack action, spend 2 Focus Points to cast Burning Hands as a bonus action (more points for a stronger version).',
      'Searing Sunburst': 'Action: a 20 ft burst of light within 150 ft; Constitution save or 2d6 radiant. Spend up to 3 Focus Points for +2d6 each.',
      'Sun Shield': 'Shed bright light at will; reaction when hit by a melee attack: the attacker takes 5 + Wisdom modifier radiant damage.',
    },

    /* ---------- Paladin ---------- */
    'Oath of Conquest': {
      'Oath Spells': SHARED['Oath Spells'],
      'Channel Divinity: Conquering Presence': 'Action: creatures of your choice within 30 ft make a Wisdom save or are frightened of you for 1 minute (they save again each turn).',
      'Guided Strike': 'Channel Divinity: add +10 to an attack roll after you see the roll.',
      'Aura of Conquest': 'Frightened enemies within 10 ft of you have speed 0 and take psychic damage (half your paladin level) when they start their turn there.',
      'Scornful Rebuke': 'A creature that hits you takes psychic damage equal to your Charisma modifier.',
      'Invincible Conqueror': 'Action, for 1 minute: resistance to all damage, an extra attack when you take the Attack action, and critical hits on 19 or 20. Once per long rest.',
    },
    'Oath of the Crown': {
      'Oath Spells': SHARED['Oath Spells'],
      'Channel Divinity: Champion Challenge': 'Action: creatures of your choice within 30 ft make a Wisdom save or can\'t willingly move more than 30 ft away from you.',
      'Turn the Tide': 'Channel Divinity, bonus action: creatures of your choice within 30 ft at half HP or less regain 1d6 + Charisma modifier HP.',
      'Divine Allegiance': 'Reaction when a creature within 5 ft takes damage: take the damage instead.',
      'Unyielding Spirit': 'Advantage on saves against being paralyzed or stunned.',
      'Exalted Champion': 'Action, for 1 hour: resistance to nonmagical weapon damage, and you and nearby allies have advantage on death saves and Wisdom saves. Once per long rest.',
    },
    'Oath of Redemption': {
      'Oath Spells': SHARED['Oath Spells'],
      'Channel Divinity: Emissary of Peace': 'Bonus action: +5 to Persuasion checks for 10 minutes.',
      'Rebuke the Violent': 'Channel Divinity, reaction when a creature within 30 ft damages someone else: it makes a Wisdom save, taking radiant damage equal to the damage it dealt (half on a success).',
      'Aura of the Guardian': 'Reaction when a creature within 10 ft takes damage: take the damage instead.',
      'Protective Spirit': 'At the end of your turn, if you are below half HP, regain 1d6 + half your paladin level HP.',
      'Emissary of Redemption': 'Resistance to all damage from creatures, and a creature that damages you takes radiant damage equal to half of it. Ends against a creature you attack or harm.',
    },
    'Oath of the Watchers': {
      'Oath Spells': SHARED['Oath Spells'],
      "Channel Divinity: Watcher's Will": 'Action: you and creatures of your choice within 30 ft (up to your Charisma modifier) have advantage on Intelligence, Wisdom and Charisma saves for 1 minute.',
      'Abjure the Extraplanar': 'Channel Divinity, action: aberrations, celestials, elementals, fey and fiends within 30 ft make a Wisdom save or are turned for 1 minute.',
      'Aura of the Sentinel': 'You and creatures of your choice within 10 ft add your proficiency bonus to initiative.',
      'Vigilant Rebuke': 'Reaction when you or a creature within 30 ft succeeds on an Intelligence, Wisdom or Charisma save: the creature that forced it takes 2d8 + Charisma modifier force damage.',
      'Mortal Bulwark': 'Bonus action, for 1 minute: truesight 120 ft, advantage on attacks against extraplanar creatures, and a hit can banish them home (Charisma save). Once per long rest, or spend a 5th-level slot.',
    },
    'Oathbreaker': {
      'Oathbreaker Spells': SHARED['Oathbreaker Spells'],
      'Channel Divinity: Control Undead': 'Action: an undead within 30 ft makes a Wisdom save or obeys you for 24 hours (its challenge rating can\'t be higher than your paladin level).',
      'Dreadful Aspect': 'Channel Divinity, action: creatures of your choice within 30 ft make a Wisdom save or are frightened for 1 minute.',
      'Aura of Hate': 'You and fiends and undead within 10 ft add your Charisma modifier to melee weapon damage.',
      'Supernatural Resistance': 'Resistance to bludgeoning, piercing and slashing damage from nonmagical weapons.',
      'Dread Lord': 'Action, for 1 minute: a 30 ft aura of gloom dims the light, frightened enemies in it take 4d10 psychic each turn, and you can strike with shadows as a bonus action. Once per long rest.',
    },

    /* ---------- Ranger ---------- */
    'Drakewarden': {
      'Draconic Gift': 'Learn Thaumaturgy and the Draconic language.',
      'Drake Companion': 'Action: summon a Small drake that fights beside you, with an elemental bite and a reaction to add elemental damage to an ally\'s hit. Free once per long rest, or spend a spell slot.',
      'Bond of Fang and Scale': 'Your drake grows to Medium, can be ridden and flies; you gain resistance to its element, and its bite deals more damage.',
      "Drake's Breath": 'Action: you or your drake breathe a 30 ft cone of acid, cold, fire, lightning or poison (Dexterity save, 8d6, half on a success). Once per long rest, or spend a 3rd-level slot.',
      'Perfected Bond': 'Your drake grows to Large, its bite deals more, and it can use its reaction to halve damage it takes.',
    },
    'Horizon Walker': {
      'Horizon Walker Magic': 'Extra spells always prepared for you as you level.',
      'Detect Portal': 'Action: sense the direction of the nearest planar portal within 1 mile. Once per short or long rest.',
      'Planar Warrior': 'Bonus action: choose a creature within 30 ft; your next hit on it this turn deals force damage and +1d8 (2d8 at level 11).',
      'Ethereal Step': 'Bonus action: step into the Ethereal Plane until the end of your turn. Once per short or long rest.',
      'Distant Strike': 'When you take the Attack action, teleport 10 ft before each attack; if you hit two different creatures, make one more attack against a third.',
      'Spectral Defense': 'Reaction when an attack hits you: take half its damage (resistance).',
    },
    'Monster Slayer': {
      'Monster Slayer Magic': 'Extra spells always prepared for you as you level.',
      "Hunter's Sense": 'Action: learn a creature\'s immunities, resistances and vulnerabilities (within 60 ft). Wisdom modifier uses per long rest.',
      "Slayer's Prey": 'Bonus action: mark a creature within 60 ft; your first hit on it each turn deals +1d6 damage.',
      'Supernatural Defense': 'Add 1d6 to saves your Slayer\'s Prey target forces and to checks to escape its grapple.',
      "Magic-User's Nemesis": 'Reaction when a creature within 60 ft casts a spell or teleports: it makes a Wisdom save or the spell or teleport fails. Once per short or long rest.',
      "Slayer's Counter": 'Reaction when your Slayer\'s Prey target forces you to save: attack it, and if you hit, you automatically succeed on the save.',
    },
    'Swarmkeeper': {
      'Swarmkeeper Magic': 'Extra spells always prepared for you as you level, plus the Mage Hand cantrip (your swarm does the work).',
      'Gathered Swarm': 'Once per turn when you hit, your swarm adds 1d6 piercing, pushes the target 15 ft (Strength save), or moves you 5 ft.',
      'Writhing Tide': 'Bonus action: your swarm lifts you, giving a 10 ft fly speed for 1 minute. PB uses per long rest.',
      'Mighty Swarm': 'Gathered Swarm damage becomes 1d8, a push also knocks the target prone, and moving with the swarm gives you half cover.',
      'Swarming Dispersal': 'Reaction when you take damage: take half (resistance) and teleport up to 30 ft. PB uses per long rest.',
    },

    /* ---------- Rogue ---------- */
    'Inquisitive': {
      'Ear for Deceit': 'On Insight checks to tell if someone is lying, treat a d20 roll of 7 or lower as an 8.',
      'Eye for Detail': 'Bonus action: a Perception check to spot a hidden creature or object, or an Investigation check to find clues.',
      'Insightful Fighting': 'Bonus action: Insight against a creature\'s Deception. If you win, you can Sneak Attack it without advantage for 1 minute.',
      'Steady Eye': 'Advantage on Perception and Investigation checks if you move no more than half your speed that turn.',
      'Unerring Eye': 'Action: sense illusions, shapechangers and other magic meant to deceive within 30 ft. Wisdom modifier uses per long rest.',
      'Eye for Weakness': 'Sneak Attack against your Insightful Fighting target deals +3d6.',
    },
    'Mastermind': {
      'Master of Intrigue': 'Proficiency with the disguise kit, forgery kit and one gaming set, two languages, and you can mimic speech and accents.',
      'Master of Tactics': 'Help as a bonus action, and you can help an ally attack a creature up to 30 ft from you.',
      'Insightful Manipulator': 'Watch a creature for a minute to learn how it compares to you in two of: Intelligence, Wisdom, Charisma, class levels.',
      'Misdirection': 'Reaction when attacked while another creature within 5 ft gives you cover: the attack targets that creature instead.',
      'Soul of Deceit': 'Your thoughts can\'t be read unless you allow it, you can present false thoughts, and magic can\'t tell when you lie.',
    },
    'Phantom': {
      'Whispers of the Dead': 'After a rest, gain one skill or tool proficiency of your choice until you change it.',
      'Wails from the Grave': 'When you deal Sneak Attack damage, a second creature within 30 ft takes necrotic damage equal to half your Sneak Attack dice. PB uses per long rest.',
      'Tokens of the Departed': 'Reaction when a creature dies near you: make a soul trinket (up to PB). Holding one gives advantage on death saves and Constitution saves; spend one for a free Wails from the Grave or to ask the spirit a question.',
      'Ghost Walk': 'Bonus action: ghostly form for 10 minutes: fly 10 ft, hover, attacks against you have disadvantage, and you can pass through creatures and objects. Once per long rest, or destroy a trinket.',
      "Death's Friend": 'Wails from the Grave also damages the first target, and you gain a soul trinket after a long rest if you have none.',
    },
    'Scout': {
      'Skirmisher': 'Reaction when an enemy ends its turn within 5 ft: move up to half your speed without provoking opportunity attacks.',
      'Survivalist': 'Proficiency and expertise in Nature and Survival.',
      'Superior Mobility': 'Your walking speed (and climbing and swimming speeds, if any) increases by 10 ft.',
      'Ambush Master': 'Advantage on initiative; the first creature you hit in the first round gives everyone advantage against it until your next turn.',
      'Sudden Strike': 'Bonus action when you take the Attack action: one more attack, which can Sneak Attack a different target.',
    },
    'Swashbuckler': {
      'Fancy Footwork': 'When you make a melee attack against a creature, it can\'t make opportunity attacks against you for the rest of your turn.',
      'Rakish Audacity': 'Add your Charisma modifier to initiative. You can Sneak Attack without advantage when you are within 5 ft of the target and no one else is next to you.',
      'Panache': 'Action: Persuasion against a creature\'s Insight. A hostile creature has disadvantage attacking anyone but you; a friendly one is charmed for 1 minute.',
      'Elegant Maneuver': 'Bonus action: advantage on your next Acrobatics or Athletics check this turn.',
      'Master Duelist': 'When you miss, reroll the attack with advantage. Once per short or long rest.',
    },

    /* ---------- Sorcerer ---------- */
    'Divine Soul': {
      'Divine Magic': 'You can choose spells from the cleric list too, and gain one bonus spell based on your affinity (good, evil, law, chaos or neutrality).',
      'Favored by the Gods': 'When you fail a save or miss an attack, add 2d4 to the roll. Once per short or long rest.',
      'Empowered Healing': 'Spend 1 Sorcery Point to reroll healing dice for you or an ally within 5 ft.',
      'Otherworldly Wings': 'Bonus action: grow spectral wings for a 30 ft fly speed.',
      'Unearthly Recovery': 'Bonus action when below half HP: regain HP equal to half your maximum. Once per long rest.',
    },
    'Lunar Sorcery': {
      'Lunar Embodiment': 'Extra spells for each lunar phase (Full, New and Crescent Moon). Choose your phase after each rest.',
      'Moon Fire': 'Learn Sacred Flame, which can target two creatures at once.',
      'Lunar Boons': 'Metamagic on spells of your current phase\'s schools costs 1 fewer Sorcery Point. PB uses per long rest.',
      'Waxing and Waning': 'Bonus action: spend 1 Sorcery Point to change your lunar phase.',
      'Lunar Empowerment': 'A constant benefit from your current phase, like shedding light, slipping into darkness, or resisting radiant and necrotic damage.',
      'Lunar Phenomenon': 'Bonus action: a powerful burst based on your phase (blinding light and healing, a necrotic shroud, or a teleport). Once per long rest, or spend Sorcery Points.',
    },
    'Shadow Magic': {
      'Eyes of the Dark': 'Darkvision 120 ft. Spend 2 Sorcery Points to cast Darkness, and you can see through it.',
      'Strength of the Grave': 'When damage drops you to 0 HP (not radiant or a critical hit), make a Charisma save to drop to 1 HP instead. Once per long rest.',
      'Hound of Ill Omen': 'Bonus action, 3 Sorcery Points: a shadow hound hunts a creature within 120 ft; while it is near, the target has disadvantage on saves against your spells.',
      'Shadow Walk': 'Bonus action in dim light or darkness: teleport up to 120 ft to another spot in dim light or darkness.',
      'Umbral Form': 'Bonus action, 6 Sorcery Points: shadow form for 1 minute, with resistance to all damage but force and radiant, and you can move through creatures and objects.',
    },
    'Storm Sorcery': {
      'Wind Speaker': 'Speak, read and write Primordial (and its dialects).',
      'Tempestuous Magic': 'Before or after casting a 1st-level or higher spell, bonus action: fly 10 ft without provoking opportunity attacks.',
      'Heart of the Storm': 'Resistance to lightning and thunder; when you cast a lightning or thunder spell, creatures of your choice within 10 ft take half your sorcerer level in damage.',
      'Storm Guide': 'Action: stop the rain or change the wind\'s direction around you.',
      "Storm's Fury": 'Reaction when hit in melee: the attacker takes lightning damage equal to your sorcerer level and makes a Strength save or is pushed 20 ft.',
      'Wind Soul': 'Immunity to lightning and thunder, a 60 ft fly speed, and you can share flight with a few allies for an hour (once per short or long rest).',
    },

    /* ---------- Warlock ---------- */
    'The Fathomless': {
      'Tentacle of the Deeps': 'Bonus action: a spectral tentacle appears for 1 minute; it attacks for 1d8 cold and slows the target by 10 ft (bonus action to attack again). PB uses per long rest.',
      'Gift of the Sea': 'Swim speed 40 ft and you can breathe underwater.',
      'Oceanic Soul': 'Resistance to cold damage, and you can talk with any creature that speaks a language while both of you are underwater.',
      'Guardian Coil': 'Reaction: your tentacle reduces damage to a creature within 10 ft of it by 1d8 (2d8 at level 10).',
      'Grasping Tentacles': 'Evard\'s Black Tentacles is always prepared and free once per long rest; casting it gives you temporary HP and damage can\'t break your concentration on it.',
      'Fathomless Plunge': 'Action: teleport yourself and up to five willing creatures to a body of water you have seen within 1 mile. Once per short or long rest.',
    },
    'The Genie': {
      "Genie's Vessel": 'A tiny vessel is your focus. You can rest inside it for a while (Bottled Respite), and once per turn add extra damage equal to your PB (Genie\'s Wrath, type based on your genie). Extra spells from your genie kind.',
      'Elemental Gift': 'Resistance to your genie\'s damage type, and bonus action: fly 30 ft for 10 minutes. PB uses per long rest.',
      'Sanctuary Vessel': 'Bring up to five willing creatures into your vessel; a short rest inside restores extra HP.',
      'Limited Wish': 'Action: cast any 6th-level or lower spell with a 1-action casting time, without components. Once every 1d4 long rests.',
    },
    'The Hexblade': {
      "Hexblade's Curse": 'Bonus action: curse a creature within 30 ft for 1 minute: +PB damage against it, critical hits on 19 or 20, and you heal when it dies. Once per short or long rest.',
      'Hex Warrior': 'Proficiency with medium armor, shields and martial weapons. Use Charisma for attacks with one chosen weapon (or your pact weapon).',
      'Accursed Specter': 'When you slay a humanoid, raise its spirit as a specter that serves you until your next long rest. Once per long rest.',
      'Armor of Hexes': 'When your cursed target hits you, roll a d6: on a 4 or higher, the attack misses.',
      'Master of Hexes': 'When your cursed target dies, move the curse to another creature within 30 ft.',
    },
    'The Undead': {
      'Form of Dread': 'Bonus action, for 1 minute: temporary HP (1d10 + warlock level), immune to frightened, and once per turn a hit can frighten the target (Wisdom save). PB uses per long rest.',
      'Grave Touched': 'You don\'t need to eat, drink or breathe. Once per turn you can make an attack deal necrotic damage, with an extra damage die in Form of Dread.',
      'Necrotic Husk': 'Resistance to necrotic (immunity in Form of Dread). When you drop to 0 HP, drop to 1 instead and burst with necrotic damage around you. Once per long rest.',
      'Spirit Projection': 'Action: send your spirit out of your body for up to an hour; it can fly and cast spells while your body rests safely.',
    },
    'The Undying': {
      'Among the Dead': 'Learn Spare the Dying, advantage on saves against disease, and undead must make a Wisdom save to attack you.',
      'Defy Death': 'When you succeed on a death save or stabilize someone with Spare the Dying, regain 1d8 + Constitution modifier HP. Once per long rest.',
      'Undying Nature': 'Hold your breath indefinitely, don\'t need food, water or sleep, and age slowly.',
      'Indestructible Life': 'Bonus action: regain 1d8 + warlock level HP and reattach severed body parts. Once per short or long rest.',
    },

    /* ---------- Wizard ---------- */
    'Chronurgy Magic': {
      'Chronal Shift': 'Reaction: make a creature within 30 ft reroll an attack, check or save after seeing the result. Two uses per long rest.',
      'Temporal Awareness': 'Add your Intelligence modifier to initiative.',
      'Momentary Stasis': 'Action: a Large or smaller creature within 60 ft makes a Constitution save or is frozen (incapacitated, speed 0) until the end of your next turn or until it takes damage. Intelligence modifier uses per long rest.',
      'Arcane Abeyance': 'When you cast a spell of 4th level or lower, store it in a bead that someone else can release later. Once per short or long rest.',
      'Convergent Future': 'Reaction: decide that an attack, check or save within 60 ft succeeds or fails. You gain a level of exhaustion.',
    },
    'School of Conjuration': {
      'Conjuration Savant': 'Copying conjuration spells into your spellbook takes half the time and gold.',
      'Minor Conjuration': 'Action: conjure a small nonmagical object (up to 3 ft, 10 lb) that lasts an hour.',
      'Benign Transposition': 'Action: teleport up to 30 ft, or swap places with a willing Small or Medium creature. Once per long rest, or after casting a conjuration spell.',
      'Focused Conjuration': 'Damage can\'t break your concentration on conjuration spells.',
      'Durable Summons': 'Creatures you summon or create with conjuration spells have 30 temporary HP.',
    },
    'School of Enchantment': {
      'Enchantment Savant': 'Copying enchantment spells into your spellbook takes half the time and gold.',
      'Hypnotic Gaze': 'Action: a creature within 5 ft makes a Wisdom save or is charmed, incapacitated and stuck in place as long as you keep using your action to hold it.',
      'Instinctive Charm': 'Reaction when a creature within 30 ft attacks you: it makes a Wisdom save or must attack the closest other creature instead.',
      'Split Enchantment': 'Enchantment spells that target one creature can target a second one too.',
      'Alter Memories': 'Creatures you charm don\'t realize it, and you can make one forget some of the time it spent charmed.',
    },
    'Graviturgy Magic': {
      'Adjust Density': 'Action: halve or double the weight of a Large or smaller creature for 1 minute (concentration), changing its speed and its Strength checks and saves.',
      'Gravity Well': 'When you hit a creature with a spell or it fails a save against one, you can move it 5 ft.',
      'Violent Attraction': 'Reaction: add 1d10 to a weapon hit within 60 ft, or 2d10 to a creature\'s falling damage. Intelligence modifier uses per long rest.',
      'Event Horizon': 'Action, for 1 minute (concentration): enemies that start their turn within 30 ft take 2d10 force damage and have speed 0 (Strength save for half and normal movement). Once per long rest, or spend a 3rd-level slot.',
    },
    'School of Necromancy': {
      'Necromancy Savant': 'Copying necromancy spells into your spellbook takes half the time and gold.',
      'Grim Harvest': 'When a spell of 1st level or higher kills a creature, regain HP equal to twice the spell\'s level (three times for necromancy). Not for undead or constructs.',
      'Undead Thralls': 'Animate Dead is added to your spellbook and raises one extra creature; your undead have extra HP and add your PB to damage.',
      'Inured to Undeath': 'Resistance to necrotic damage, and your maximum HP can\'t be reduced.',
      'Command Undead': 'Action: an undead within 60 ft makes a Charisma save or obeys you (smarter undead get advantage and more chances to break free).',
    },
    'Order of Scribes': {
      'Wizardly Quill': 'Bonus action: create a magical quill. Copying spells takes 2 minutes per spell level, and it can erase what it writes.',
      'Awakened Spellbook': 'Your spellbook is your focus; swap a spell\'s damage type for one from another spell of the same level in it; once per long rest cast a ritual at its normal casting time.',
      'Manifest Mind': 'Bonus action: your spellbook\'s spirit appears within 60 ft; you can see and hear through it and cast spells from it. PB uses per long rest.',
      'Master Scrivener': 'After a long rest, make a free spell scroll of a 1st- or 2nd-level spell from your book, cast one level higher.',
      'One with the Word': 'Advantage on Arcana checks. Reaction when you take damage: your spellbook takes it instead, losing some spells until you recover them.',
    },
    'School of Transmutation': {
      'Transmutation Savant': 'Copying transmutation spells into your spellbook takes half the time and gold.',
      'Minor Alchemy': 'Spend 10 minutes to turn an object of wood, stone, iron, copper or silver into another of those materials for an hour.',
      "Transmuter's Stone": 'Make a stone that grants one benefit: darkvision 60 ft, +10 ft speed, Constitution save proficiency, or resistance to an element. You can change the benefit when you cast a transmutation spell.',
      'Shapechanger': 'Cast Polymorph on yourself without a slot, turning into a beast of challenge rating 1 or lower. Once per short or long rest.',
      'Master Transmuter': 'Destroy your Transmuter\'s Stone for a big effect: transform an object, cure all ailments and heal fully, cast Raise Dead, or turn back age.',
    },
    'War Magic': {
      'Arcane Deflection': 'Reaction when hit or failing a save: +2 AC against that attack or +4 to the save. Afterwards you can only cast cantrips until the end of your next turn.',
      'Tactical Wit': 'Add your Intelligence modifier to initiative.',
      'Power Surge': 'Store power surges (one after each long rest, more by ending spells with Dispel Magic or Counterspell). Once per turn, spend one for extra force damage equal to half your wizard level.',
      'Durable Magic': 'While concentrating on a spell, +2 AC and +2 to all saves.',
      'Deflecting Shroud': 'When you use Arcane Deflection, up to three creatures within 60 ft take force damage equal to half your wizard level.',
    },
  }, SHARED);
})();
