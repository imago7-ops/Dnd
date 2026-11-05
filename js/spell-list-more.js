'use strict';

/* More spells (mostly levels 4 to 9, plus some lower-level ones). Same format as js/spell-list.js. */
const SpellListMore = `
Blade Ward|0|Abj|BSKW|Action|Self|V, S|1 minute|c|Attackers subtract 1d4 from attack rolls against you.
Floating Disk|1|Con|W|Action|30 ft|V, S, M|1 hour|r|A 3-ft floating disk of force follows you and carries up to 500 lb.
Witch Bolt|1|Evo|SKW|Action|60 ft|V, S, M|1 minute|c|Ranged spell attack: 2d12 lightning; each later turn, deal 1d12 more as a bonus action while it stays in range.
Hail of Thorns|1|Con|R|Bonus Action (after a ranged hit)|Self|V|Instant||Thorns burst from the target: creatures within 5 ft make a Dex save or take 2d10 piercing.
Thunderous Smite|1|Evo|P|Bonus Action (after a melee hit)|Self|V|Instant||The hit deals an extra 2d6 thunder, and the target makes a Str save or is pushed 10 ft and knocked prone.
Wrathful Smite|1|Nec|P|Bonus Action (after a melee hit)|Self|V|1 minute||The hit deals an extra 1d6 necrotic, and the target makes a Wis save or is frightened.
Beast Sense|2|Div|DR|Action|Touch|S|1 hour|c,r|See and hear through a willing beast's senses.
Cordon of Arrows|2|Tra|R|Action|5 ft|V, S, M|8 hours||Plant enchanted arrows that fire at creatures entering the area: Dex save or 2d4 piercing.
Shining Smite|2|Tra|P|Bonus Action (after a melee hit)|Self|V|1 minute|c|The hit deals an extra 2d6 radiant; the target glows, can't be invisible, and attacks against it have advantage.
Conjure Barrage|3|Con|R|Action|Self (60-ft cone)|V, S, M|Instant||Spectral weapons fill a 60-ft cone: Dex save or 5d8 force, half on a success.
Crusader's Mantle|3|Evo|P|Action|Self (30 ft)|V|1 minute|c|You and allies nearby deal an extra 1d4 radiant damage with weapon hits.
Lightning Arrow|3|Tra|R|Bonus Action (after a ranged attack)|Self|V, S|Instant||The attack becomes lightning: 4d8 on a hit (half on a miss), and creatures within 10 ft make a Dex save or take 2d8.
Tiny Hut|3|Evo|BW|1 minute|Self (10 ft)|V, S, M|8 hours|r|A dome of force that keeps out creatures and weather while you rest inside.
Faithful Hound|4|Con|W|Action|30 ft|V, S, M|8 hours||An invisible watchdog barks at intruders and bites enemies for 4d8 piercing.
Staggering Smite|4|Enc|P|Bonus Action (after a melee hit)|Self|V|Instant||The hit deals an extra 4d6 psychic, and the target makes a Wis save or is stunned until your next turn.
Arcane Hand|5|Evo|W|Action|120 ft|V, S, M|1 minute|c|A giant hand of force that can punch (5d8 force), shove, grapple or shield you.
Conjure Volley|5|Con|R|Action|150 ft|V, S, M|Instant||A rain of spectral weapons in a 40-ft cylinder: Dex save or 8d8 force, half on a success.
Swift Quiver|5|Tra|R|Bonus Action|Self|V, S, M|1 minute|c|Your quiver never runs out, and you can make two ranged attacks as a bonus action each turn.
Freezing Sphere|6|Evo|W|Action|300 ft|V, S, M|Instant||A frigid globe bursts in a 60-ft sphere: Con save or 10d6 cold, half on a success; it can freeze water.
Instant Summons|6|Con|W|1 minute|Touch|V, S, M|Until dispelled|r|Mark an object; later crush a sapphire to make it appear in your hand.
Divine Word|7|Evo|C|Bonus Action|30 ft|V|Instant||Creatures you choose make a Cha save or are deafened, blinded, stunned or killed depending on their HP; extraplanar ones are sent home.
Magnificent Mansion|7|Con|BW|1 minute|300 ft|V, S, M|24 hours||Open a door to a lavish extradimensional mansion with servants and a feast for up to 100 guests.
Telepathy|8|Div|W|Action|Unlimited|V, S, M|24 hours||A telepathic link with a familiar creature on the same plane, sharing words, images and feelings.
Arcane Eye|4|Div|W|Action|30 ft|V, S, M|1 hour|c|An invisible floating eye with darkvision that you see through and move up to 30 ft each turn.
Aura of Life|4|Abj|CP|Action|Self (30 ft)|V|10 minutes|c|You and allies nearby resist necrotic damage, their HP max can't be reduced, and allies at 0 HP regain 1 HP each turn.
Aura of Purity|4|Abj|CP|Action|Self (30 ft)|V|10 minutes|c|Allies nearby can't be diseased, resist poison, and have advantage on saves against many conditions.
Banishment|4|Abj|CPKSW|Action|60 ft|V, S, M|1 minute|c|A creature makes a Cha save or is sent to a harmless demiplane; extraplanar creatures that stay gone the full minute return home.
Black Tentacles|4|Con|W|Action|90 ft|V, S, M|1 minute|c|Tentacles fill a 20-ft square: difficult terrain, and creatures make a Str save or take 3d6 bludgeoning and are restrained.
Blight|4|Nec|DSKW|Action|30 ft|V, S|Instant||A creature makes a Con save or takes 8d8 necrotic, half on a success. Plants are hit hardest.
Compulsion|4|Enc|B|Action|30 ft|V, S|1 minute|c|Creatures you choose make a Wis save or must move in a direction you pick on their turns.
Confusion|4|Enc|BDSW|Action|90 ft|V, S, M|1 minute|c|Creatures in a 10-ft sphere make a Wis save or act randomly each turn (roll to see what they do).
Conjure Minor Elementals|4|Con|DW|Action|Self (15 ft)|V, S|10 minutes|c|Elemental spirits swirl around you: your attacks deal extra elemental damage and the area is difficult terrain for enemies.
Conjure Woodland Beings|4|Con|DR|Action|Self (10 ft)|V, S|10 minutes|c|Fey spirits around you: enemies that enter or start their turn nearby take 5d8 force (Wis save for half), and you can Disengage as a bonus action.
Control Water|4|Tra|CDW|Action|300 ft|V, S, M|10 minutes|c|Control water in a 100-ft cube: flood, part, redirect it, or make a whirlpool.
Death Ward|4|Abj|CP|Action|Touch|V, S|8 hours||The first time the creature would drop to 0 HP, it drops to 1 instead (or an instant-kill effect is negated).
Dimension Door|4|Con|BSKW|Action|500 ft|V|Instant||Teleport up to 500 ft, optionally bringing one willing creature.
Divination|4|Div|CDW|Action|Self|V, S, M|Instant|r|Ask your god or a power one question about an event within the next 7 days and get a truthful (if cryptic) answer.
Dominate Beast|4|Enc|DRS|Action|60 ft|V, S|1 minute|c|A beast makes a Wis save or is charmed and you can command it telepathically.
Fabricate|4|Tra|W|10 minutes|120 ft|V, S|Instant||Turn raw materials into a finished product (a bridge from wood, clothes from cloth) of matching size.
Fire Shield|4|Evo|DSW|Action|Self|V, S, M|10 minutes||Warm or chill flames around you: resist cold or fire, and creatures that hit you in melee take 2d8 of the other type.
Freedom of Movement|4|Abj|BCDR|Action|Touch|V, S, M|1 hour||A creature ignores difficult terrain and magic that would slow or paralyze it, and can escape grapples easily.
Giant Insect|4|Con|D|Action|60 ft|V, S|10 minutes|c|Summon a giant centipede, spider or wasp spirit that fights for you.
Greater Invisibility|4|Ill|BSW|Action|Touch|V, S|1 minute|c|A creature becomes invisible, even while attacking or casting.
Guardian of Faith|4|Con|C|Action|30 ft|V|8 hours||A spectral guardian: enemies that come near it make a Dex save or take 20 radiant; it fades after dealing 60.
Hallucinatory Terrain|4|Ill|BDKW|10 minutes|300 ft|V, S, M|24 hours||Make natural terrain in a 150-ft cube look, sound and smell like different terrain.
Ice Storm|4|Evo|DSW|Action|300 ft|V, S, M|Instant||Hail in a 20-ft cylinder: Dex save or 2d10 bludgeoning plus 4d6 cold; the ground becomes difficult terrain.
Locate Creature|4|Div|BDPRW|Action|Self|V, S, M|1 hour|c|Sense the direction of a creature you know (or a kind of creature) within 1,000 ft.
Phantasmal Killer|4|Ill|BW|Action|120 ft|V, S|1 minute|c|A creature makes a Wis save or sees its worst fear: 4d10 psychic and disadvantage, repeating each turn.
Polymorph|4|Tra|BDSW|Action|60 ft|V, S, M|1 hour|c|Turn a creature (Wis save if unwilling) into a beast of equal or lower CR; it gets temporary HP equal to the beast's HP.
Private Sanctum|4|Abj|W|10 minutes|120 ft|V, S, M|24 hours||Secure an area against sound, sight, teleportation, scrying and planar travel.
Resilient Sphere|4|Evo|W|Action|30 ft|V, S, M|1 minute|c|Trap a creature in an indestructible bubble of force (Dex save to avoid).
Secret Chest|4|Con|W|Action|Touch|V, S, M|Until dispelled||Hide a chest on the Ethereal Plane and call it back with its small replica.
Stone Shape|4|Tra|CDW|Action|Touch|V, S, M|Instant||Shape a block of stone up to 5 ft into any form: a passage, a weapon, a coffer.
Stoneskin|4|Tra|DRSW|Action|Touch|V, S, M|1 hour|c|A creature resists bludgeoning, piercing and slashing damage.
Wall of Fire|4|Evo|DSW|Action|120 ft|V, S, M|1 minute|c|A 60-ft wall of fire: 5d8 fire to creatures in it (Dex save for half) and to those near one side.
Animate Objects|5|Tra|BSW|Action|120 ft|V, S|1 minute|c|Bring up to ten nonmagical objects to life; they fight for you, and you command them with a bonus action.
Antilife Shell|5|Abj|D|Action|Self (10 ft)|V, S|1 hour|c|A barrier around you that creatures other than constructs and undead can't pass through.
Awaken|5|Tra|BD|8 hours|Touch|V, S, M|Instant||A beast or plant gains Intelligence 10, speech, and is charmed by you for 30 days.
Banishing Smite|5|Con|P|Bonus Action (after a hit)|Self|V|1 minute|c|The hit deals an extra 5d10 force; if that leaves it at 50 HP or fewer, the target is banished.
Circle of Power|5|Abj|P|Action|Self (30 ft)|V|10 minutes|c|You and allies nearby have advantage on saves against spells; a success against half-damage spells means no damage.
Cloudkill|5|Con|SW|Action|120 ft|V, S|10 minutes|c|A 20-ft sphere of poison fog that drifts away from you: Con save or 5d8 poison, half on a success.
Commune|5|Div|C|1 minute|Self|V, S, M|1 minute|r|Ask your deity up to three yes-or-no questions.
Commune with Nature|5|Div|DR|1 minute|Self|V, S|Instant|r|Learn three facts about the land within 3 miles (or 300 ft underground): terrain, water, creatures, plants.
Cone of Cold|5|Evo|DSW|Action|Self (60-ft cone)|V, S, M|Instant||A 60-ft cone of cold: Con save or 8d8 cold, half on a success.
Conjure Elemental|5|Con|DW|Action|60 ft|V, S|10 minutes|c|A spirit of air, earth, fire or water: creatures near it make a Dex save or take 8d8 damage and may be restrained.
Contact Other Plane|5|Div|KW|1 minute|Self|V|1 minute|r|Ask an otherworldly entity five questions (Int save or take psychic damage and become incapacitated).
Contagion|5|Nec|CD|Action|Touch|V, S|7 days||A creature makes a Con save or takes 11d8 necrotic and is poisoned, then may be stricken by a lasting disease.
Creation|5|Ill|SW|1 minute|30 ft|V, S, M|Special||Create a nonliving object of vegetable or mineral matter up to a 5-ft cube; how long it lasts depends on the material.
Destructive Wave|5|Evo|P|Action|Self (30 ft)|V|Instant||Enemies within 30 ft make a Con save or take 5d6 thunder plus 5d6 radiant or necrotic and fall prone.
Dispel Evil and Good|5|Abj|CP|Action|Self|V, S, M|1 minute|c|Shield yourself from aberrations, celestials, elementals, fey, fiends and undead, and break their charms or send them home.
Dominate Person|5|Enc|BSW|Action|60 ft|V, S|1 minute|c|A humanoid makes a Wis save or is charmed and you can command it telepathically.
Dream|5|Ill|BKW|1 minute|Special|V, S, M|8 hours||Speak to a sleeping creature through its dreams, or send a nightmare that keeps it from resting.
Flame Strike|5|Evo|C|Action|60 ft|V, S, M|Instant||A column of fire: Dex save or 5d6 fire plus 5d6 radiant, half on a success.
Geas|5|Enc|BCDPW|1 minute|60 ft|V|30 days||A creature makes a Wis save or must follow a command, taking 5d10 psychic whenever it defies it.
Greater Restoration|5|Abj|BCDPR|Action|Touch|V, S, M|Instant||End exhaustion, a charm or petrification, a curse, or ability score or HP max reduction.
Hallow|5|Abj|C|24 hours|Touch|V, S, M|Until dispelled||Bless or curse an area up to 60 ft: certain creatures can't enter, and you add an extra effect.
Hold Monster|5|Enc|BSKW|Action|90 ft|V, S, M|1 minute|c|A creature makes a Wis save or is paralyzed, repeating the save each turn.
Insect Plague|5|Con|CDS|Action|300 ft|V, S, M|10 minutes|c|Swarming locusts in a 20-ft sphere: Con save or 4d10 piercing, difficult terrain, lightly obscured.
Legend Lore|5|Div|BCW|10 minutes|Self|V, S, M|Instant||Learn significant lore about a famous person, place or object.
Mass Cure Wounds|5|Abj|BCD|Action|60 ft|V, S|Instant||Up to six creatures in a 30-ft sphere regain 5d8 + your spellcasting modifier HP.
Mislead|5|Ill|BW|Action|Self|S|1 hour|c|You turn invisible and an illusory double of you appears, which you can see and hear through.
Modify Memory|5|Enc|BW|Action|30 ft|V, S|1 minute|c|A creature makes a Wis save or you can change its memory of an event from the last 24 hours.
Passwall|5|Tra|W|Action|30 ft|V, S, M|1 hour||Create a passage through a wooden, plaster or stone surface.
Planar Binding|5|Abj|BCDKW|1 hour|60 ft|V, S, M|24 hours||A celestial, elemental, fey or fiend makes a Cha save or must serve you.
Raise Dead|5|Nec|BCP|1 hour|Touch|V, S, M|Instant||Return a creature dead up to 10 days to life, with penalties that fade over a few long rests.
Scrying|5|Div|BCDKW|10 minutes|Self|V, S, M|10 minutes|c|See and hear a creature on the same plane (Wis save, easier if you know it well).
Seeming|5|Ill|BSKW|Action|30 ft|V, S|8 hours||Change the appearance of any number of creatures you can see (unwilling ones get a Cha save).
Telekinesis|5|Tra|SW|Action|60 ft|V, S|10 minutes|c|Move a creature (Str contest) or an object up to 1,000 lb with your mind.
Telepathic Bond|5|Div|W|Action|30 ft|V, S, M|1 hour|r|Link up to eight willing creatures so they can talk telepathically at any distance on the same plane.
Teleportation Circle|5|Con|BSW|1 minute|10 ft|V, M|1 round||Open a portal to a permanent teleportation circle whose sigil you know.
Tree Stride|5|Con|DR|Action|Self|V, S|1 minute|c|Step into a tree and out of another of the same kind within 500 ft.
Wall of Force|5|Evo|W|Action|120 ft|V, S, M|10 minutes|c|An invisible, indestructible wall, dome or sphere of force.
Wall of Stone|5|Evo|DSW|Action|120 ft|V, S, M|10 minutes|c|A wall of solid stone made of ten 10-ft panels; it becomes permanent if you concentrate the full time.
Blade Barrier|6|Evo|C|Action|90 ft|V, S|10 minutes|c|A wall of whirling blades: creatures entering or starting there make a Dex save or take 6d10 slashing.
Chain Lightning|6|Evo|SW|Action|150 ft|V, S, M|Instant||Lightning hits a target and leaps to three more: Dex save or 10d8 lightning each, half on a success.
Circle of Death|6|Nec|SKW|Action|150 ft|V, S, M|Instant||A 60-ft sphere of negative energy: Con save or 8d8 necrotic, half on a success.
Contingency|6|Abj|W|10 minutes|Self|V, S, M|10 days||Store a spell that casts itself when a condition you describe happens.
Create Undead|6|Nec|CKW|1 minute|10 ft|V, S, M|Instant||Raise ghouls (or stronger undead with higher slots) that obey you for 24 hours.
Disintegrate|6|Tra|SW|Action|60 ft|V, S, M|Instant||A green ray: Dex save or 10d6 + 40 force; a creature reduced to 0 HP turns to dust.
Eyebite|6|Nec|BSKW|Action|Self|V, S|1 minute|c|Each turn, target a creature within 60 ft: Wis save or it falls asleep, panics, or sickens.
Find the Path|6|Div|BCD|1 minute|Self|V, S, M|1 day|c|Know the shortest, most direct route to a place you name on the same plane.
Flesh to Stone|6|Tra|DKSW|Action|60 ft|V, S, M|1 minute|c|A creature makes Con saves or is restrained and then turned to stone after three failures.
Forbiddance|6|Abj|C|10 minutes|Touch|V, S, M|1 day|r|Ward an area against teleportation and planar travel, and damage chosen creature types that enter.
Globe of Invulnerability|6|Abj|SW|Action|Self (10 ft)|V, S, M|1 minute|c|Spells of level 5 or lower cast from outside can't affect anything inside the barrier.
Guards and Wards|6|Abj|BW|1 hour|Touch|V, S, M|24 hours||Protect a building with fog, locked doors, webs, confusing corridors and other wards.
Harm|6|Nec|C|Action|60 ft|V, S|Instant||A creature makes a Con save or takes 14d6 necrotic and its HP max drops by that much.
Heal|6|Abj|CD|Action|60 ft|V, S|Instant||A creature regains 70 HP and is cured of blindness, deafness and poison.
Heroes' Feast|6|Con|BCD|10 minutes|30 ft|V, S, M|Instant||A magical feast for twelve: immunity to poison and fear, advantage on Wis saves and +2d10 HP max for 24 hours.
Magic Jar|6|Nec|W|1 minute|Self|V, S, M|Until dispelled||Move your soul into a container and try to possess nearby humanoids (Cha save).
Mass Suggestion|6|Enc|BSKW|Action|60 ft|V, M|24 hours||Up to twelve creatures make a Wis save or follow a reasonable course of action you describe.
Move Earth|6|Tra|DSW|Action|120 ft|V, S, M|2 hours|c|Reshape dirt, sand or clay in a 40-ft square area: raise or lower it, dig trenches, build walls.
Irresistible Dance|6|Enc|BW|Action|30 ft|V|1 minute|c|A creature (Wis save for a weaker effect) dances helplessly: no movement, disadvantage on Dex saves and attacks.
Planar Ally|6|Con|C|10 minutes|60 ft|V, S|Instant||Ask your deity to send a celestial, elemental or fiend to help you, usually for a price.
Programmed Illusion|6|Ill|BW|Action|120 ft|V, S, M|Until dispelled||An illusion with sound that plays when a condition you set is met.
Sunbeam|6|Evo|CDSW|Action|Self (60-ft line)|V, S, M|1 minute|c|A beam of sunlight: Con save or 6d8 radiant and blinded. Repeat each turn as a Magic action.
Transport via Plants|6|Con|D|Action|10 ft|V, S|1 minute||Link two plants so creatures can step into one and out of the other on the same plane.
True Seeing|6|Div|BCKSW|Action|Touch|V, S, M|1 hour||A creature sees through illusions, shapechanges and darkness, sees invisible things and into the Ethereal Plane.
Wall of Ice|6|Evo|W|Action|120 ft|V, S, M|10 minutes|c|A wall of ice: 10d6 cold to creatures where it forms (Dex save for half) and cold to those who pass through a broken section.
Wall of Thorns|6|Con|D|Action|120 ft|V, S, M|10 minutes|c|A wall of thorny brush: 7d8 piercing when it appears (Dex save for half) and more to anyone moving through.
Wind Walk|6|Tra|D|1 minute|30 ft|V, S, M|8 hours||You and up to ten allies become clouds of mist with a fly speed of 300 ft.
Word of Recall|6|Con|C|Action|5 ft|V|Instant||Teleport yourself and up to five willing creatures to a sanctuary you've designated.
Arcane Sword|7|Evo|BW|Action|60 ft|V, S, M|1 minute|c|A floating sword of force: melee spell attacks deal 4d12 + modifier force, moving and attacking as a bonus action.
Conjure Celestial|7|Con|C|Action|90 ft|V, S|10 minutes|c|A pillar of celestial light: heal allies or deal radiant damage to enemies that enter it.
Delayed Blast Fireball|7|Evo|SW|Action|150 ft|V, S, M|1 minute|c|A fireball you can hold back to grow stronger each round (12d6 fire, +1d6 per round) before it explodes.
Etherealness|7|Con|BCSKW|Action|Self|V, S|8 hours||Step into the Ethereal Plane, where you can move through objects and see the normal world dimly.
Finger of Death|7|Nec|SKW|Action|60 ft|V, S|Instant||Con save or 7d8 + 30 necrotic, half on a success; a humanoid killed rises as a zombie under your control.
Fire Storm|7|Evo|CDS|Action|150 ft|V, S|Instant||Ten 10-ft cubes of flame: Dex save or 7d10 fire, half on a success.
Forcecage|7|Evo|BKW|Action|100 ft|V, S, M|1 hour|c|An invisible cage or box of force that traps creatures inside; teleporting out needs a Cha save.
Mirage Arcane|7|Ill|BDW|10 minutes|Sight|V, S|10 days||Make a square mile of terrain look, sound, smell and feel like different terrain.
Plane Shift|7|Con|CDKSW|Action|Touch|V, S, M|Instant||Travel with up to eight creatures to another plane, or banish an unwilling creature (Cha save).
Prismatic Spray|7|Evo|BSW|Action|Self (60-ft cone)|V, S|Instant||Rays of seven colors: each creature in the cone is hit by a random ray (fire, acid, lightning, poison, cold, restrain, or banish).
Project Image|7|Ill|BW|Action|500 miles|V, S, M|1 day|c|An illusory copy of you that you can see, hear and speak through.
Regenerate|7|Tra|BCD|1 minute|Touch|V, S, M|1 hour||A creature regains 4d8 + 15 HP, then 1 HP each turn, and regrows lost body parts.
Resurrection|7|Nec|BC|1 hour|Touch|V, S, M|Instant||Return a creature dead up to a century to life with all its HP, restoring missing body parts.
Reverse Gravity|7|Tra|DW|Action|100 ft|V, S, M|1 minute|c|Gravity reverses in a 50-ft cylinder: everything falls upward (Dex save to grab hold).
Sequester|7|Tra|W|Action|Touch|V, S, M|Until dispelled||Hide a creature or object from divination; a creature is put in suspended animation.
Simulacrum|7|Ill|W|12 hours|Touch|V, S, M|Until dispelled||Create an obedient duplicate of a creature, made of snow, with half its HP.
Symbol|7|Abj|BCDW|1 minute|Touch|V, S, M|Until dispelled or triggered||Inscribe a glyph that triggers an effect like death, fear, sleep or stunning on those who come near.
Teleport|7|Con|BSW|Action|10 ft|V|Instant||Teleport yourself and up to eight others anywhere on the same plane; how well you know the place affects accuracy.
Animal Shapes|8|Tra|D|Action|30 ft|V, S|24 hours||Turn any number of willing creatures into beasts.
Antimagic Field|8|Abj|CW|Action|Self (10 ft)|V, S, M|1 hour|c|A sphere around you where magic doesn't work.
Antipathy/Sympathy|8|Enc|BDW|1 hour|60 ft|V, S, M|10 days||Make a creature or place repel (antipathy) or attract (sympathy) a kind of creature you name.
Clone|8|Nec|W|1 hour|Touch|V, S, M|Instant||Grow an inert duplicate of a creature that its soul moves into if it dies.
Control Weather|8|Tra|CDW|10 minutes|Self (5 miles)|V, S, M|8 hours|c|Change the weather around you: precipitation, temperature and wind.
Demiplane|8|Con|KSW|Action|60 ft|S|1 hour||Create a door to an empty extradimensional room 30 ft on a side.
Dominate Monster|8|Enc|BSKW|Action|60 ft|V, S|1 hour|c|A creature makes a Wis save or is charmed and you can command it telepathically.
Earthquake|8|Tra|CDS|Action|500 ft|V, S, M|1 minute|c|A violent quake in a 100-ft circle: creatures fall prone, the ground cracks, and buildings may collapse.
Feeblemind|8|Enc|BDKW|Action|150 ft|V, S, M|Instant||Int save or 10d6 psychic, and the target's Intelligence and Charisma drop to 1.
Glibness|8|Enc|BK|Action|Self|V|1 hour||Treat Charisma check rolls below 15 as 15, and magic can't tell when you lie.
Holy Aura|8|Abj|C|Action|Self|V, S, M|1 minute|c|You and allies within 30 ft have advantage on saves and attacks against you have disadvantage; fiends and undead that hit are blinded.
Incendiary Cloud|8|Con|DSW|Action|150 ft|V, S|1 minute|c|A 20-ft sphere of burning embers that drifts: Dex save or 10d8 fire, half on a success.
Maze|8|Con|W|Action|60 ft|V, S|10 minutes|c|Banish a creature into a labyrinthine demiplane until it escapes with Int checks.
Mind Blank|8|Abj|BW|Action|Touch|V, S|24 hours||A creature is immune to psychic damage, mind reading, divination and being charmed.
Power Word Stun|8|Enc|BSKW|Action|60 ft|V|Instant||A creature with 150 HP or fewer is stunned (Con save each turn); stronger ones have their speed reduced instead.
Sunburst|8|Evo|CDSW|Action|150 ft|V, S, M|Instant||A 60-ft burst of sunlight: Con save or 12d6 radiant and blinded, half damage on a success.
Tsunami|8|Con|D|1 minute|Sight|V, S|6 rounds|c|A huge wall of water crashes forward: Str save or 6d10 bludgeoning, sweeping creatures along.
Astral Projection|9|Nec|CKW|1 hour|10 ft|V, S, M|Until dispelled||Project yourself and up to eight others into the Astral Plane while your bodies stay behind.
Foresight|9|Div|BDKW|1 minute|Touch|V, S, M|8 hours||A creature can't be surprised, has advantage on d20 tests, and attacks against it have disadvantage.
Gate|9|Con|CSW|Action|60 ft|V, S, M|1 minute|c|Open a portal to another plane, or call a specific creature through it by name.
Imprisonment|9|Abj|KW|1 minute|30 ft|V, S, M|Until dispelled||A creature makes a Wis save or is magically imprisoned (buried, chained, hedged, minimized or slumbering).
Mass Heal|9|Abj|C|Action|60 ft|V, S|Instant||Restore up to 700 HP divided among creatures you choose, curing blindness, deafness and poison.
Meteor Swarm|9|Evo|SW|Action|1 mile|V, S|Instant||Four blazing orbs: creatures in each 40-ft sphere make a Dex save or take 20d6 fire plus 20d6 bludgeoning.
Power Word Heal|9|Enc|BC|Action|60 ft|V|Instant||A creature regains all its HP and is cured of charmed, frightened, paralyzed, poisoned and stunned.
Power Word Kill|9|Enc|BSKW|Action|60 ft|V|Instant||A creature with 100 HP or fewer dies; otherwise it takes 12d12 psychic.
Prismatic Wall|9|Abj|BW|Action|60 ft|V, S|10 minutes||A shimmering wall of seven colored layers, each with its own harmful effect for anything passing through.
Shapechange|9|Tra|DW|Action|Self|V, S, M|1 hour|c|Take the form of any creature you've seen (CR up to your level), keeping your mind and spellcasting.
Storm of Vengeance|9|Con|D|Action|1 mile|V, S|1 minute|c|A massive storm cloud: thunder, acid rain, lightning, hail and freezing winds over successive rounds.
Time Stop|9|Tra|SW|Action|Self|V|Instant||Time stops for others: you take 1d4 + 1 turns in a row, unless you affect another creature.
True Polymorph|9|Tra|BKW|Action|30 ft|V, S, M|1 hour|c|Turn a creature into another creature or an object, or an object into a creature; it can become permanent.
True Resurrection|9|Nec|CD|1 hour|Touch|V, S, M|Instant||Return a creature dead up to 200 years to life with full HP, even without a body.
Weird|9|Ill|KW|Action|120 ft|V, S, M|1 minute|c|Creatures in a 30-ft sphere make a Wis save or are frightened and take 10d10 psychic each turn.
Wish|9|Con|SW|Action|Self|V|Instant||Duplicate any spell of level 8 or lower, or try to alter reality; big wishes carry risk.
`;
