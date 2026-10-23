# Campaign Codex

A browser-based D&D 5e (2024 rules) table companion. No install, no build step, no account.

**Live site:** https://imago7-ops.github.io/Dnd/

## What it does

**First visit:** choose whether you're a **Player** or the **Dungeon Master**. Switch any time with "Switch role" in the top bar.

**Works on phones and desktops.** On phones the layout stacks into one column, the dice tray opens from a floating **Dice** button, and rolls you make from your sheet pop up at the bottom of the screen.

### Player
- **Step-by-step character creator:** species, background, class, level and subclass, ability scores, then a name. It fills in the whole sheet: scores with background bonuses, saves, skills, HP, AC, speed, initiative, hit dice, starting attacks, species traits, class and subclass features by level, origin feats, proficiencies and languages, starting equipment, and spellcasting (save DC, attack, cantrips, prepared spells, slots). Everything stays editable. You can also start from a blank sheet or upload a saved character.
- **Subclasses:** all 123 official ones (Player's Handbook 2024 plus Xanathar's, Tasha's, Sword Coast, Wildemount, Fizban's, Van Richten's, Bigby's, Dragonlance, Heroes of Faerûn and the 2014 core books), plus an "Other / homebrew" option.
- **Sheet in folders:** Character info, Ability scores, Skills, Combat, Spells, Features & traits, Proficiencies, Equipment and Notes. Quick stats (HP, AC, initiative, speed, proficiency) stay visible above them. Tap any number to roll it. Less-used actions live in the **More** menu.
- **Level up or down:** click "Level up" or change the Level field. Choose average or rolled HP, an Ability Score Improvement or feat, and a subclass at level 3; everything that depends on level updates (HP including Constitution changes, hit dice, scores, AC, initiative, speed, attacks, class resources, features, spellcasting). Lowering the level undoes it.
- Keep several characters and download them as backup files.

### Dungeon Master
- **Campaigns library:** as many campaigns as you like, each a folder with its own notes, combat tracker, table-talk history and permanent party room code.
- **Campaign notebook:** collapsible sections for NPCs, Locations, Factions, Bosses, Weather, Abnormalities, Quests, Encounters, Items and loot, Lore and history, and Session notes, plus your own sections. Each entry expands into a form with fields that suit it.
- **Known / Hidden** switch on every entry (new entries start Hidden), with a filter and Reveal all / Hide all per section.
- Weather entries can roll random conditions for the season. NPCs and bosses go straight into combat; encounters add every creature listed ("3 Goblin", "Shark x2").
- Search the whole campaign and download/upload campaigns as `.json` files.

### Party room (both roles)
- The DM picks a campaign and clicks **Host this campaign's room**. Each campaign has its own 5-character code that stays the same every session. Players open **Party room**, type the code, choose their character and join.
- **DM view:** the combat tracker, Add to combat / Remove for each player (initiative rolled for them), "Add everyone to combat", the party list with HP, AC and passive Perception, and table talk.
- **Player view:** live turn order (enemy health shows as Healthy / Bloodied / Down), Roll initiative, "What the party knows" (the DM's Known entries without secret fields), the party list and table talk.
- **Table talk:** chat plus shared dice rolls. Players share rolls by default; the DM's rolls stay private unless they tick "Share my rolls".
- Damage on a player's sheet updates the DM's tracker. Reloading reconnects automatically.
- Connections go directly to the DM's browser using WebRTC via [PeerJS](https://peerjs.com/) and its free public broker, so the DM's tab must stay open while you play. Some strict networks block direct connections.

### Everyone
- **Dice tray:** d4–d100, custom rolls (`2d6+3`, `4d6kh3`, `2d20kl1`, `d%`), advantage/disadvantage for the next d20, crit and fumble highlighting, and a history you can tap to roll again.

Everything saves automatically in your browser. Data is per browser and per site address, so use Download/Upload to move characters or campaigns between devices.

## Run it

- **On the web:** https://imago7-ops.github.io/Dnd/ (GitHub Pages, deployed from `main`).
- **Locally:** double-click `index.html`.

## Project layout

```
index.html         page shell, loads everything below
css/styles.css     all styling (colors live in :root at the top; phone rules at the bottom)
js/store.js        helpers + saving to localStorage
js/dice.js         dice engine and the dice tray
js/rules-2024.js   D&D 2024 rules data: species, backgrounds, classes, subclasses
js/creator.js      step-by-step character creator
js/levelup.js      level up / level down dialog
js/character.js    player character sheet (folders)
js/campaign.js     DM campaigns library and notebook
js/combat.js       combat tracker (shown inside the party room)
js/room.js         party room connections (host, join, sync)
js/party.js        party room page
js/app.js          role picker, page routing, phone dice button
```

## Ideas for next steps

- Voice or video chat in the party room.
- Spell and monster lookups from the 5e SRD.
- Maps and images in the campaign notebook.
- Online accounts so characters and campaigns sync across devices.

## Testing the party room on one computer

Add `?transport=local&profile=NAME` to the address (served from a local web server, e.g. `python -m http.server`) to use an in-browser stand-in for the network. Each tab with a different `profile` keeps its own saved data, so one tab can be the DM and others can be players.
