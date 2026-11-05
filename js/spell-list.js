'use strict';

/*
 * D&D spells (2024 rules) with short summaries in our own words. Spells from the System
 * Reference Document 5.2 are used under CC-BY-4.0: SRD 5.2 by Wizards of the Coast LLC is licensed under CC-BY-4.0
 * (https://creativecommons.org/licenses/by/4.0/). Check your book for the full rules.
 *
 * One spell per line: Name|level|school|classes|casting time|range|components|duration|flags|summary
 *   classes: B bard, C cleric, D druid, P paladin, R ranger, S sorcerer, K warlock, W wizard
 *   flags: c concentration, r ritual
 */
const SpellList = (() => {
  const RAW = `
Acid Splash|0|Evo|SW|Action|60 ft|V, S|Instant||Hurl acid at one creature or two within 5 ft of each other: Dex save or 1d6 acid (more dice at levels 5, 11, 17).
Chill Touch|0|Nec|SKW|Action|Touch|V, S|Instant||Melee spell attack: 1d10 necrotic, and the target can't regain HP until your next turn. Damage grows with level.
Dancing Lights|0|Ill|BSW|Action|120 ft|V, S, M|1 minute|c|Create up to four torch-like lights that you can move or combine into a glowing humanoid shape.
Druidcraft|0|Tra|D|Action|30 ft|V, S|Instant||Small nature tricks: predict the weather, make a flower bloom, a harmless sensory effect, or light/snuff a candle.
Eldritch Blast|0|Evo|K|Action|120 ft|V, S|Instant||Ranged spell attack: 1d10 force. Fires extra beams at levels 5, 11 and 17.
Elementalism|0|Tra|DSW|Action|30 ft|V, S|Instant||Minor elemental effects: a puff of wind, a spray of water, a small flame, a shaped bit of earth, or a light breeze.
Fire Bolt|0|Evo|SW|Action|120 ft|V, S|Instant||Ranged spell attack: 1d10 fire; ignites flammable objects. Damage grows with level.
Friends|0|Enc|BSKW|Action|10 ft|S, M|1 minute|c|A humanoid makes a Wis save or you have advantage on Charisma checks to influence it. It realizes afterwards.
Guidance|0|Div|CD|Action|Touch|V, S|1 minute|c|A willing creature adds 1d4 to one ability check of a skill you choose before the spell ends.
Light|0|Evo|BCSW|Action|Touch|V, M|1 hour||An object sheds bright light in a 20-ft radius and dim light 20 ft beyond.
Mage Hand|0|Con|BSKW|Action|30 ft|V, S|1 minute||A spectral hand that can carry up to 10 lb, open doors and containers, or pour a vial. It can't attack.
Mending|0|Tra|BCDSW|1 minute|Touch|V, S, M|Instant||Repair one break or tear in an object no larger than 1 ft in any direction.
Message|0|Tra|BDSW|Action|120 ft|S, M|1 round||Whisper a message to a creature; only it hears, and it can whisper back.
Minor Illusion|0|Ill|BSKW|Action|30 ft|S, M|1 minute||Create a sound or a still image no bigger than a 5-ft cube. An Investigation check reveals it.
Poison Spray|0|Nec|DSKW|Action|30 ft|V, S|Instant||Ranged spell attack: 1d12 poison. Damage grows with level.
Prestidigitation|0|Tra|BSKW|Action|10 ft|V, S|Up to 1 hour||Harmless tricks: sparks, clean or soil an item, chill or warm food, a small mark, a trinket or illusion in your hand.
Produce Flame|0|Con|D|Bonus Action|Self|V, S|10 minutes||A flame in your hand gives light; you can hurl it as a Magic action: ranged spell attack, 1d8 fire (grows with level).
Ray of Frost|0|Evo|SW|Action|60 ft|V, S|Instant||Ranged spell attack: 1d8 cold and the target's speed drops by 10 ft until your next turn. Damage grows with level.
Resistance|0|Abj|CD|Action|Touch|V, S|1 minute|c|Choose a damage type: once per turn, the willing creature reduces damage of that type by 1d4.
Sacred Flame|0|Evo|C|Action|60 ft|V, S|Instant||Dex save or 1d8 radiant; cover doesn't help. Damage grows with level.
Shillelagh|0|Tra|D|Bonus Action|Self|V, S, M|1 minute||Your club or quarterstaff uses your spellcasting ability, deals a d8 (bigger with level), and can deal force damage.
Shocking Grasp|0|Evo|SW|Action|Touch|V, S|Instant||Melee spell attack: 1d8 lightning, and the target can't make opportunity attacks until its next turn.
Sorcerous Burst|0|Evo|S|Action|120 ft|V, S|Instant||Ranged spell attack: 1d8 of a damage type you choose; 8s explode into extra dice.
Spare the Dying|0|Nec|CD|Action|15 ft|V, S|Instant||A creature at 0 HP becomes stable. Range grows with level.
Starry Wisp|0|Evo|BD|Action|60 ft|V, S|Instant||Ranged spell attack: 1d8 radiant, and the target sheds light and can't be invisible until your next turn.
Thaumaturgy|0|Tra|C|Action|30 ft|V|Up to 1 minute||Minor wonders: booming voice, flickering flames, tremors, a sudden sound, doors flying open, or changed eyes.
Thorn Whip|0|Tra|D|Action|30 ft|V, S, M|Instant||Melee spell attack: 1d6 piercing, and pull a Large or smaller target up to 10 ft toward you.
Thunderclap|0|Evo|BDSKW|Action|Self (5 ft)|S|Instant||Every creature within 5 ft makes a Con save or takes 1d6 thunder. Damage grows with level.
Toll the Dead|0|Nec|CKW|Action|60 ft|V, S|Instant||Wis save or 1d8 necrotic, or 1d12 if the target is already wounded. Damage grows with level.
True Strike|0|Div|BSKW|Action|Self|S, M|Instant||Make one weapon attack using your spellcasting ability; it can deal radiant damage, and extra radiant at higher levels.
Vicious Mockery|0|Enc|B|Action|60 ft|V|Instant||Wis save or 1d6 psychic and disadvantage on its next attack roll. Damage grows with level.
Word of Radiance|0|Evo|C|Action|Self (5 ft)|V, M|Instant||Creatures you choose within 5 ft make a Con save or take 1d6 radiant. Damage grows with level.
Alarm|1|Abj|RW|1 minute|30 ft|V, S, M|8 hours|r|Ward a door, window or area up to a 20-ft cube; you get a mental or audible alert when something enters.
Animal Friendship|1|Enc|BDR|Action|30 ft|V, S, M|24 hours||A beast makes a Wis save or is charmed by you for the duration.
Armor of Agathys|1|Abj|K|Bonus Action|Self|V, S, M|1 hour||Gain 5 temporary HP; while you have them, creatures that hit you in melee take 5 cold damage. Scales with slot level.
Arms of Hadar|1|Con|K|Action|Self (10 ft)|V, S|Instant||Creatures within 10 ft make a Str save or take 2d6 necrotic and can't take reactions; half damage on a success.
Bane|1|Enc|BCK|Action|30 ft|V, S, M|1 minute|c|Up to three creatures make a Cha save or subtract 1d4 from attack rolls and saving throws.
Bless|1|Enc|CP|Action|30 ft|V, S, M|1 minute|c|Up to three creatures add 1d4 to attack rolls and saving throws.
Burning Hands|1|Evo|SW|Action|Self (15-ft cone)|V, S|Instant||A 15-ft cone of flame: Dex save or 3d6 fire, half on a success.
Charm Person|1|Enc|BDSKW|Action|30 ft|V, S|1 hour||A humanoid makes a Wis save (with advantage if you're fighting it) or is charmed and treats you as a friend.
Chromatic Orb|1|Evo|SW|Action|90 ft|V, S, M|Instant||Ranged spell attack: 3d8 of acid, cold, fire, lightning, poison or thunder. Matching dice can make it leap to another target.
Color Spray|1|Ill|BSW|Action|Self (15-ft cone)|V, S, M|Instant||Creatures in a 15-ft cone make a Con save or are blinded until your next turn.
Command|1|Enc|BCP|Action|60 ft|V|Instant||A creature makes a Wis save or follows a one-word command on its next turn (Approach, Drop, Flee, Grovel, Halt).
Compelled Duel|1|Enc|P|Bonus Action|30 ft|V|1 minute|c|A creature makes a Wis save or has disadvantage attacking anyone but you and can't willingly move away from you.
Comprehend Languages|1|Div|BSKW|Action|Self|V, S, M|1 hour|r|Understand any spoken or written language you hear or touch.
Create or Destroy Water|1|Tra|CD|Action|30 ft|V, S, M|Instant||Create up to 10 gallons of clean water or rain, or destroy that much water or fog.
Cure Wounds|1|Abj|BCDPR|Action|Touch|V, S|Instant||A creature you touch regains 2d8 + your spellcasting modifier HP. +2d8 per slot level above 1.
Detect Evil and Good|1|Div|CP|Action|Self|V, S|10 minutes|c|Sense aberrations, celestials, elementals, fey, fiends and undead within 30 ft, and consecrated or desecrated places.
Detect Magic|1|Div|BCDPRSKW|Action|Self|V, S|10 minutes|c,r|Sense magic within 30 ft and see a faint aura around magical creatures and objects, learning their school.
Detect Poison and Disease|1|Div|CDPR|Action|Self|V, S, M|10 minutes|c,r|Sense poisons, poisonous or venomous creatures, and magical contagions within 30 ft.
Disguise Self|1|Ill|BSW|Action|Self|V, S|1 hour||Change how you look (including clothes and gear) for the duration. An Investigation check can see through it.
Dissonant Whispers|1|Enc|B|Action|60 ft|V|Instant||Wis save or 3d6 psychic and the target must use its reaction to move away from you; half damage on a success.
Divine Favor|1|Tra|P|Bonus Action|Self|V, S|1 minute||Your weapon attacks deal an extra 1d4 radiant damage on a hit.
Divine Smite|1|Evo|P|Bonus Action (after a melee hit)|Self|V|Instant||The target takes an extra 2d8 radiant damage (+1d8 against fiends and undead). +1d8 per slot level above 1.
Ensnaring Strike|1|Con|R|Bonus Action (after a weapon hit)|Self|V|1 minute|c|Thorny vines grab the target: Str save or restrained, taking 1d6 piercing each turn.
Entangle|1|Con|D|Action|90 ft|V, S|1 minute|c|Grasping plants fill a 20-ft square: difficult terrain, and creatures make a Str save or are restrained.
Expeditious Retreat|1|Tra|SKW|Bonus Action|Self|V, S|10 minutes|c|Take the Dash action now and as a bonus action on each of your turns.
Faerie Fire|1|Evo|BD|Action|60 ft|V|1 minute|c|Objects and creatures in a 20-ft cube glow (Dex save); attacks against them have advantage and they can't be invisible.
False Life|1|Nec|SW|Action|Self|V, S, M|Instant||Gain 2d4 + 4 temporary HP. +5 per slot level above 1.
Feather Fall|1|Tra|BSW|Reaction (when falling)|60 ft|V, M|1 minute||Up to five falling creatures fall slowly (60 ft per round) and take no falling damage.
Find Familiar|1|Con|W|1 hour|10 ft|V, S, M|Instant|r|Summon a spirit familiar in a small animal form that can scout, help, and deliver your touch spells.
Fog Cloud|1|Con|DRSW|Action|120 ft|V, S|1 hour|c|A 20-ft-radius sphere of thick fog that heavily obscures the area.
Goodberry|1|Con|DR|Action|Self|V, S, M|24 hours||Create ten berries; eating one restores 1 HP and provides a day's nourishment.
Grease|1|Con|W|Action|60 ft|V, S, M|1 minute||Slippery grease covers a 10-ft square: difficult terrain, and creatures there make a Dex save or fall prone.
Guiding Bolt|1|Evo|C|Action|120 ft|V, S|1 round||Ranged spell attack: 4d6 radiant, and the next attack against the target has advantage. +1d6 per slot level above 1.
Healing Word|1|Abj|BCD|Bonus Action|60 ft|V|Instant||A creature you can see regains 2d4 + your spellcasting modifier HP. +2d4 per slot level above 1.
Hellish Rebuke|1|Evo|K|Reaction (when damaged)|60 ft|V, S|Instant||The creature that damaged you makes a Dex save or takes 2d10 fire, half on a success.
Heroism|1|Enc|BP|Action|Touch|V, S|1 minute|c|A willing creature can't be frightened and gains temporary HP equal to your spellcasting modifier each turn.
Hex|1|Enc|K|Bonus Action|90 ft|V, S, M|1 hour|c|Curse a creature: your attacks deal it an extra 1d6 necrotic, and it has disadvantage on checks of one ability you choose.
Hideous Laughter|1|Enc|BW|Action|30 ft|V, S, M|1 minute|c|A creature makes a Wis save or falls prone laughing, incapacitated. It repeats the save when damaged and each turn.
Hunter's Mark|1|Div|R|Bonus Action|90 ft|V|1 hour|c|Mark a creature: your weapon hits deal it an extra 1d6 force, and you have advantage on checks to find it. Move the mark when it drops to 0 HP.
Ice Knife|1|Con|DSW|Action|60 ft|S, M|Instant||Ranged spell attack: 1d10 piercing; then it explodes, and creatures within 5 ft make a Dex save or take 2d6 cold.
Identify|1|Div|BW|1 minute|Touch|V, S, M|Instant|r|Learn a magic item's properties and how to use it, or which spells affect a creature or object.
Illusory Script|1|Ill|BKW|1 minute|Touch|S, M|10 days|r|Write a message only creatures you choose can read; to others it looks like something else.
Inflict Wounds|1|Nec|C|Action|Touch|V, S|Instant||A creature you touch makes a Con save or takes 2d10 necrotic, half on a success. +1d10 per slot level above 1.
Jump|1|Tra|DRSW|Bonus Action|Touch|V, S, M|1 minute||A creature can jump up to 30 ft by spending 10 ft of movement.
Longstrider|1|Tra|BDRW|Action|Touch|V, S, M|1 hour||A creature's speed increases by 10 ft.
Mage Armor|1|Abj|SW|Action|Touch|V, S, M|8 hours||A creature without armor has a base AC of 13 + its Dexterity modifier.
Magic Missile|1|Evo|SW|Action|120 ft|V, S|Instant||Three darts of force that always hit, each dealing 1d4 + 1. One more dart per slot level above 1.
Protection from Evil and Good|1|Abj|CPKW|Action|Touch|V, S, M|10 minutes|c|Aberrations, celestials, elementals, fey, fiends and undead have disadvantage attacking the target, and can't charm, frighten or possess it.
Purify Food and Drink|1|Tra|CDP|Action|10 ft|V, S|Instant|r|Remove poison and rot from food and drink in a 5-ft sphere.
Ray of Sickness|1|Nec|SW|Action|60 ft|V, S|Instant||Ranged spell attack: 2d8 poison, and the target is poisoned until the end of your next turn.
Sanctuary|1|Abj|C|Bonus Action|30 ft|V, S, M|1 minute||Anyone who tries to attack or cast a harmful spell at the protected creature must make a Wis save or choose another target.
Searing Smite|1|Evo|P|Bonus Action (after a melee hit)|Self|V|1 minute||The hit deals an extra 1d6 fire, and the target burns for 1d6 each turn until it makes a Con save.
Shield|1|Abj|SW|Reaction (when hit)|Self|V, S|1 round||+5 AC until your next turn, including against the triggering attack, and no damage from Magic Missile.
Shield of Faith|1|Abj|CP|Bonus Action|60 ft|V, S, M|10 minutes|c|A creature gains +2 AC.
Silent Image|1|Ill|BSW|Action|60 ft|V, S, M|10 minutes|c|Create a visual illusion up to a 15-ft cube that you can move. An Investigation check reveals it.
Sleep|1|Enc|BSW|Action|60 ft|V, S, M|1 minute|c|Creatures in a 5-ft sphere make a Wis save or become incapacitated, then fall unconscious if they fail again.
Speak with Animals|1|Div|BDRK|Action|Self|V, S|10 minutes|r|You can understand and talk with beasts.
Thunderwave|1|Evo|BDSW|Action|Self (15-ft cube)|V, S|Instant||A wave of thunder: Con save or 2d8 thunder and pushed 10 ft; half damage and no push on a success.
Unseen Servant|1|Con|BKW|Action|60 ft|V, S, M|1 hour|r|An invisible, mindless force that does simple tasks like fetching, cleaning and carrying.
Acid Arrow|2|Evo|W|Action|90 ft|V, S, M|Instant||Ranged spell attack: 4d4 acid now and 2d4 at the end of its next turn; half the first damage on a miss.
Aid|2|Abj|BCDPR|Action|30 ft|V, S, M|8 hours||Up to three creatures' current and maximum HP increase by 5. +5 per slot level above 2.
Alter Self|2|Tra|SW|Action|Self|V, S|1 hour|c|Change your body: breathe and swim underwater, change your appearance, or grow natural weapons (1d6 + spell modifier).
Animal Messenger|2|Enc|BDR|Action|30 ft|V, S, M|24 hours|r|A Tiny beast carries a short message to a place and person you describe.
Arcane Lock|2|Abj|W|Action|Touch|V, S, M|Until dispelled||Magically lock a door, window or container; you and those you name can open it.
Arcane Vigor|2|Abj|SW|Bonus Action|Self|V, S|Instant||Spend one or two of your Hit Dice to heal yourself, adding your spellcasting modifier.
Augury|2|Div|C|1 minute|Self|V, S, M|Instant|r|Get an omen (weal, woe, both or neither) about a course of action in the next 30 minutes.
Barkskin|2|Tra|DR|Bonus Action|Touch|V, S, M|1 hour||A willing creature's AC can't be lower than 17.
Blindness/Deafness|2|Tra|BCSW|Action|120 ft|V|1 minute||A creature makes a Con save or is blinded or deafened (your choice), repeating the save each turn.
Blur|2|Ill|SW|Action|Self|V|1 minute|c|Your body blurs: attacks against you have disadvantage unless the attacker doesn't rely on sight.
Calm Emotions|2|Enc|BC|Action|60 ft|V, S|1 minute|c|Humanoids in a 20-ft sphere make a Cha save or have charm and fear suppressed, or become indifferent toward creatures you choose.
Continual Flame|2|Evo|CDW|Action|Touch|V, S, M|Until dispelled||A heatless flame as bright as a torch burns on an object forever.
Darkness|2|Evo|SKW|Action|60 ft|V, M|10 minutes|c|Magical darkness fills a 15-ft sphere; even darkvision can't see through it.
Darkvision|2|Tra|DRSW|Action|Touch|V, S, M|8 hours||A willing creature gains darkvision out to 150 ft.
Detect Thoughts|2|Div|BSW|Action|Self|V, S, M|1 minute|c|Sense thoughts of creatures within 30 ft and read surface thoughts; probe deeper with a Wis save.
Enhance Ability|2|Tra|BCDRSW|Action|Touch|V, S, M|1 hour|c|A creature has advantage on checks with one ability you choose.
Enlarge/Reduce|2|Tra|BDSW|Action|30 ft|V, S, M|1 minute|c|A creature or object grows (advantage on Str checks, +1d4 weapon damage) or shrinks (disadvantage, -1d4). Unwilling targets get a Con save.
Enthrall|2|Enc|BK|Action|60 ft|V, S|1 minute|c|Creatures that can hear you make a Wis save or have disadvantage on Perception checks to notice anyone but you.
Find Steed|2|Con|P|Action|30 ft|V, S|Instant||Summon an otherworldly steed (celestial, fey or fiend) that serves as your loyal mount.
Find Traps|2|Div|CDR|Action|120 ft|V, S|Instant||Sense whether there are traps in range and learn their general nature.
Flame Blade|2|Evo|D|Bonus Action|Self|V, S, M|10 minutes|c|A fiery blade in your hand: melee spell attacks deal 3d6 fire.
Flaming Sphere|2|Evo|DW|Action|60 ft|V, S, M|1 minute|c|A 5-ft ball of fire you can roll around; creatures next to it make a Dex save or take 2d6 fire.
Gentle Repose|2|Nec|CPW|Action|Touch|V, S, M|10 days|r|A corpse doesn't decay and can't become undead, and the time limit on raising it is extended.
Gust of Wind|2|Evo|DRSW|Action|Self (60-ft line)|V, S, M|1 minute|c|A strong wind in a 60-ft line: Str save or be pushed 15 ft; it also disperses gas and extinguishes flames.
Heat Metal|2|Tra|BD|Action|60 ft|V, S, M|1 minute|c|A metal object glows red hot: whoever touches it takes 2d8 fire and may drop it. Repeat the damage as a bonus action.
Hold Person|2|Enc|BCDSKW|Action|60 ft|V, S, M|1 minute|c|A humanoid makes a Wis save or is paralyzed, repeating the save each turn.
Invisibility|2|Ill|BSKW|Action|Touch|V, S, M|1 hour|c|A creature becomes invisible until it attacks, deals damage or casts a spell.
Knock|2|Tra|BSW|Action|60 ft|V|Instant||Unlock a locked door, chest or shackles, or suppress an Arcane Lock. It makes a loud knock.
Lesser Restoration|2|Abj|BCDPR|Bonus Action|Touch|V, S|Instant||End one condition on a creature: blinded, deafened, paralyzed or poisoned.
Levitate|2|Tra|SW|Action|60 ft|V, S, M|10 minutes|c|A creature or object rises up to 20 ft and hangs there; you can move it up or down.
Locate Animals or Plants|2|Div|BDR|Action|Self|V, S, M|Instant|r|Learn the direction and distance to the closest beast or plant of a kind you name within 5 miles.
Locate Object|2|Div|BCDPRW|Action|Self|V, S, M|10 minutes|c|Sense the direction of an object you know within 1,000 ft.
Magic Mouth|2|Ill|BW|1 minute|30 ft|V, S, M|Until dispelled|r|Plant a spoken message on an object that plays when a condition you set is met.
Magic Weapon|2|Tra|PRW|Bonus Action|Touch|V, S|1 hour||A nonmagical weapon becomes +1 to attack and damage (+2 or +3 with higher slots).
Mirror Image|2|Ill|BSKW|Action|Self|V, S|1 minute||Three illusory duplicates: when you're attacked, roll to see if a duplicate is hit instead and destroyed.
Misty Step|2|Con|SKW|Bonus Action|Self|V|Instant||Teleport up to 30 ft to a space you can see.
Moonbeam|2|Evo|D|Action|120 ft|V, S, M|1 minute|c|A 5-ft cylinder of moonlight: creatures there make a Con save or take 2d10 radiant. Move it as a Magic action.
Pass without Trace|2|Abj|DR|Action|Self|V, S, M|1 hour|c|You and allies within 30 ft get +10 to Stealth checks and can't be tracked without magic.
Phantasmal Force|2|Ill|BSW|Action|60 ft|V, S, M|1 minute|c|An illusion only one creature perceives (Int save) and believes is real; it can deal 2d8 psychic each turn.
Prayer of Healing|2|Abj|CP|10 minutes|30 ft|V|Instant||Up to five creatures regain 2d8 + your spellcasting modifier HP.
Protection from Poison|2|Abj|CDPR|Action|Touch|V, S|1 hour||End poisoning on a creature; it resists poison damage and has advantage on saves against being poisoned.
Ray of Enfeeblement|2|Nec|KW|Action|60 ft|V, S|1 minute|c|A creature makes a Con save or deals half damage with Strength attacks (it also has disadvantage on Str checks).
Rope Trick|2|Tra|W|Action|Touch|V, S, M|1 hour||A rope rises to an invisible extradimensional space where up to eight creatures can hide.
Scorching Ray|2|Evo|SW|Action|120 ft|V, S|Instant||Three rays: each is a ranged spell attack dealing 2d6 fire. One more ray per slot level above 2.
See Invisibility|2|Div|BSW|Action|Self|V, S, M|1 hour||See invisible creatures and objects and into the Ethereal Plane.
Shatter|2|Evo|BSKW|Action|60 ft|V, S, M|Instant||A ringing burst in a 10-ft sphere: Con save or 3d8 thunder, half on a success.
Silence|2|Ill|BCR|Action|120 ft|V, S|10 minutes|c,r|No sound in a 20-ft sphere: creatures there are deafened, immune to thunder, and can't cast spells with verbal components.
Spider Climb|2|Tra|SKW|Action|Touch|V, S, M|1 hour|c|A creature can climb walls and ceilings with its hands free and gains a climb speed.
Spike Growth|2|Tra|DR|Action|150 ft|V, S, M|10 minutes|c|Hidden thorns in a 20-ft radius: difficult terrain, and creatures take 2d4 piercing for every 5 ft they move through.
Spiritual Weapon|2|Evo|C|Bonus Action|60 ft|V, S|1 minute|c|A floating spectral weapon: when cast and as a bonus action each turn, move it and make a melee spell attack for 1d8 + modifier force.
Suggestion|2|Enc|BSKW|Action|30 ft|V, M|8 hours|c|A creature makes a Wis save or follows a reasonable-sounding course of action you describe.
Warding Bond|2|Abj|CP|Action|Touch|V, S, M|1 hour||A willing creature gets +1 AC and saves and resistance to all damage, but you take the same damage it does.
Web|2|Con|SW|Action|60 ft|V, S, M|1 hour|c|Sticky webs fill a 20-ft cube: difficult terrain, and creatures make a Dex save or are restrained. Webs burn.
Zone of Truth|2|Enc|BCP|Action|60 ft|V, S|10 minutes||Creatures in a 15-ft sphere make a Cha save or can't knowingly lie.
Animate Dead|3|Nec|CW|1 minute|10 ft|V, S, M|Instant||Raise a skeleton or zombie from bones or a corpse that obeys you for 24 hours. More undead with higher slots.
Aura of Vitality|3|Abj|CDP|Action|Self (30 ft)|V|1 minute|c|A healing aura: as a bonus action each turn, heal one creature in it 2d6 HP.
Beacon of Hope|3|Abj|C|Action|30 ft|V, S|1 minute|c|Chosen creatures have advantage on Wis saves and death saves and regain the maximum from healing.
Bestow Curse|3|Nec|BCW|Action|Touch|V, S|1 minute|c|A creature makes a Wis save or is cursed: disadvantage on one ability, losing turns, extra necrotic damage from you, or another effect you set.
Blinding Smite|3|Evo|P|Bonus Action (after a melee hit)|Self|V|1 minute||The hit deals an extra 3d8 radiant and the target is blinded until it makes a Con save.
Blink|3|Tra|SW|Action|Self|V, S|1 minute||At the end of each of your turns, roll: on 11+ you vanish into the Ethereal Plane until your next turn.
Call Lightning|3|Con|D|Action|120 ft|V, S|10 minutes|c|A storm cloud above you: call a bolt down each turn, Dex save or 3d10 lightning in a 5-ft radius.
Clairvoyance|3|Div|BCSW|10 minutes|1 mile|V, S, M|10 minutes|c|Create an invisible sensor at a familiar or obvious place within a mile and see or hear through it.
Conjure Animals|3|Con|DR|Action|60 ft|V, S|10 minutes|c|A pack of spirit animals in a 10-ft cube: creatures near it make a Dex save or take 3d10 slashing. You can move it.
Counterspell|3|Abj|SKW|Reaction (when a creature casts)|60 ft|S|Instant||The caster makes a Con save or its spell fails and the slot isn't spent.
Create Food and Water|3|Con|CP|Action|30 ft|V, S|Instant||Create enough food and water for fifteen humanoids or five steeds for a day.
Daylight|3|Evo|CDPRS|Action|60 ft|V, S|1 hour||A 60-ft sphere of bright light that dispels magical darkness of level 3 or lower.
Dispel Magic|3|Abj|BCDPRSKW|Action|120 ft|V, S|Instant||End spells of level 3 or lower on a creature, object or effect; higher-level spells need an ability check.
Elemental Weapon|3|Tra|DPR|Action|Touch|V, S|1 hour|c|A weapon becomes +1 and deals an extra 1d4 acid, cold, fire, lightning or thunder damage.
Fear|3|Ill|BKSW|Action|Self (30-ft cone)|V, S, M|1 minute|c|Creatures in a 30-ft cone make a Wis save or drop what they hold, become frightened and must run away.
Feign Death|3|Nec|BCDW|Action|Touch|V, S, M|1 hour|r|A willing creature appears dead: it's blinded and incapacitated but resists all damage except psychic.
Fireball|3|Evo|SW|Action|150 ft|V, S, M|Instant||A 20-ft-radius explosion: Dex save or 8d6 fire, half on a success. +1d6 per slot level above 3.
Fly|3|Tra|SKW|Action|Touch|V, S, M|10 minutes|c|A willing creature gains a fly speed of 60 ft.
Gaseous Form|3|Tra|SKW|Action|Touch|V, S, M|1 hour|c|A willing creature becomes misty: fly 10 ft, slip through cracks, resist nonmagical damage, but can't attack or cast.
Glyph of Warding|3|Abj|BCW|1 hour|Touch|V, S, M|Until triggered||Inscribe a glyph that explodes (5d8 damage) or releases a stored spell when triggered.
Haste|3|Tra|SW|Action|30 ft|V, S, M|1 minute|c|A creature's speed doubles, +2 AC, advantage on Dex saves and an extra limited action each turn. When it ends, the target loses a turn.
Hunger of Hadar|3|Con|K|Action|150 ft|V, S, M|1 minute|c|A 20-ft sphere of freezing darkness: creatures take 2d6 cold at the start of their turn and acid at the end unless they save.
Hypnotic Pattern|3|Ill|BSKW|Action|120 ft|S, M|1 minute|c|Creatures in a 30-ft cube make a Wis save or are charmed and incapacitated until shaken or damaged.
Lightning Bolt|3|Evo|SW|Action|Self (100-ft line)|V, S, M|Instant||A 100-ft line of lightning: Dex save or 8d6 lightning, half on a success. +1d6 per slot level above 3.
Magic Circle|3|Abj|CPKW|1 minute|10 ft|V, S, M|1 hour||A cylinder that keeps chosen kinds of creatures (celestials, fiends, undead…) out, or trapped in.
Major Image|3|Ill|BSKW|Action|120 ft|V, S, M|10 minutes|c|A convincing illusion up to a 20-ft cube with sound, smell and temperature.
Mass Healing Word|3|Abj|BC|Bonus Action|60 ft|V|Instant||Up to six creatures regain 2d4 + your spellcasting modifier HP.
Meld into Stone|3|Tra|C|Action|Touch|V, S|8 hours|r|Step into a stone surface and stay hidden inside it.
Nondetection|3|Abj|BRW|Action|Touch|V, S, M|8 hours||A creature, place or object can't be targeted or perceived by divination magic.
Phantom Steed|3|Ill|W|1 minute|30 ft|V, S|1 hour|r|A quasi-real horse with speed 100 ft appears for you to ride.
Plant Growth|3|Tra|BDR|Action (or 8 hours)|150 ft|V, S|Instant||Overgrow a 100-ft area (movement costs 4 times as much), or enrich land for a year of extra harvest.
Protection from Energy|3|Abj|CDRSW|Action|Touch|V, S|1 hour|c|A creature resists acid, cold, fire, lightning or thunder damage (your choice).
Remove Curse|3|Abj|CPKW|Action|Touch|V, S|Instant||End all curses on a creature or object.
Revivify|3|Nec|CDPR|Action|Touch|V, S, M|Instant||A creature that died within the last minute returns to life with 1 HP.
Sending|3|Div|BCW|Action|Unlimited|V, S, M|Instant||Send a 25-word message to a creature you know; it hears you and can reply.
Sleet Storm|3|Con|DSW|Action|150 ft|V, S, M|1 minute|c|Freezing rain in a 40-ft cylinder: heavily obscured, difficult terrain, Dex save or prone, and concentration checks.
Slow|3|Tra|SW|Action|120 ft|V, S, M|1 minute|c|Up to six creatures make a Wis save or have half speed, -2 AC and Dex saves, and limited actions.
Speak with Dead|3|Nec|BC|Action|10 ft|V, S, M|10 minutes||A corpse answers up to five questions with what it knew in life.
Speak with Plants|3|Tra|BDR|Action|Self|V, S|10 minutes||Talk with plants and have them move aside or entangle.
Spirit Guardians|3|Con|C|Action|Self (15 ft)|V, S, M|10 minutes|c|Spirits circle you: enemies that enter or start their turn near you make a Wis save or take 3d8 radiant or necrotic; half speed near you.
Stinking Cloud|3|Con|BSW|Action|90 ft|V, S, M|1 minute|c|A 20-ft sphere of nauseating gas: Con save or poisoned and can't act much.
Tongues|3|Div|BCKSW|Action|Touch|V, M|1 hour||A creature understands any spoken language and is understood by any creature with a language.
Vampiric Touch|3|Nec|KSW|Action|Self|V, S|1 minute|c|Melee spell attack: 3d6 necrotic and you heal half the damage. Repeat as a Magic action.
Water Breathing|3|Tra|DRSW|Action|30 ft|V, S, M|24 hours|r|Up to ten creatures can breathe underwater.
Water Walk|3|Tra|CDRS|Action|30 ft|V, S, M|1 hour|r|Up to ten creatures can walk on liquid surfaces.
Wind Wall|3|Evo|DR|Action|120 ft|V, S, M|1 minute|c|A wall of strong wind deals 4d8 bludgeoning when it appears, blocks small flying creatures, gas and arrows.
`;
  const SCHOOL = { Abj: 'Abjuration', Con: 'Conjuration', Div: 'Divination', Enc: 'Enchantment', Evo: 'Evocation', Ill: 'Illusion', Nec: 'Necromancy', Tra: 'Transmutation' };
  const CLASS = { B: 'Bard', C: 'Cleric', D: 'Druid', P: 'Paladin', R: 'Ranger', S: 'Sorcerer', K: 'Warlock', W: 'Wizard' };
  let list = null;
  function all() {
    if (list) return list;
    list = (RAW + '\n' + (typeof SpellListMore !== 'undefined' ? SpellListMore : '')).split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const [name, lvl, school, classes, time, range, comp, dur, flags, summary] = line.split('|');
      return {
        name, level: Number(lvl), school: SCHOOL[school] || school,
        classes: [...classes].map(c => CLASS[c]).filter(Boolean),
        time, range, comp, dur, conc: /c/.test(flags || ''), ritual: /r/.test(flags || ''), summary,
      };
    }).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    return list;
  }
  const byName = n => all().find(s => s.name.toLowerCase() === String(n || '').toLowerCase()) || null;
  return { all, byName };
})();
