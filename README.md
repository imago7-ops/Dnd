# Campaign Codex

A browser-based D&D 5e (2024 rules) table companion. No install and no build step. Accounts are optional.

**Live site:** https://imago7-ops.github.io/Dnd/

## What it does

**First visit:** sign in, create an account (email, password and a username), or continue without one. Then choose whether you're a **Player** or the **Dungeon Master**. Switch any time with "Switch role" in the top bar.

**Accounts:** signed-in characters and campaigns sync to every device you use. Changes save in the browser first and reach your account a few seconds later. The account menu (your username, top right) has Sync now, Change username, Sign out and Delete account. Without an account, everything stays in that one browser.

**Works on phones and desktops.** On phones the layout stacks into one column, the dice tray opens from a floating **Dice** button, and rolls you make from your sheet pop up at the bottom of the screen.

### Player
- **Step-by-step character creator:** species, background, class, level and subclass, ability scores, then a name. It fills in the whole sheet: scores with background bonuses, saves, skills, HP, AC, speed, initiative, hit dice, starting attacks, species traits, class and subclass features by level, origin feats, proficiencies and languages, starting equipment, and spellcasting (save DC, attack, cantrips, prepared spells, slots). Everything stays editable. You can also start from a blank sheet or upload a saved character.
- **Subclasses:** all 123 official ones (Player's Handbook 2024 plus Xanathar's, Tasha's, Sword Coast, Wildemount, Fizban's, Van Richten's, Bigby's, Dragonlance, Heroes of Faerûn and the 2014 core books), plus an "Other / homebrew" option.
- **Sheet in folders:** Character info, Ability scores, Skills, Combat, Spells, Features & traits, Proficiencies, Equipment and Notes. Quick stats (HP, AC, initiative, speed, proficiency) stay visible above them. Tap any number to roll it. Less-used actions live in the **More** menu.
- **Level up or down:** click "Level up" or change the Level field. Choose average or rolled HP, an Ability Score Improvement or feat, and a subclass at level 3; everything that depends on level updates (HP including Constitution changes, hit dice, scores, AC, initiative, speed, attacks, class resources, features, spellcasting). Lowering the level undoes it.
- Keep several characters and download them as backup files.

### Dungeon Master
- **Campaigns library:** as many campaigns as you like, each a folder with its own notes, combat tracker, table-talk history and permanent party room code.
- **Premade campaigns:** start a new campaign from scratch, from one of four original ready-to-run adventures (village mystery, dungeon crawl, city intrigue, wilderness expedition; levels 1 to 8), or as an empty notebook named after an official adventure you own. Encounters add their creatures to combat with the right HP and AC.
- **Campaign notebook:** collapsible sections for NPCs, Locations, Factions, Bosses, Monsters and enemies, Weather, Abnormalities, Quests, Encounters, Items and loot, Lore and history, and Session notes, plus your own sections. Each entry expands into a form with fields that suit it.
- **Session folders and tags:** Session notes hold one folder per session (party level, date, plan and key scenes, what happened, prep). Tag any entry ("Session 3") and the session's folder lists everything tagged for it under **In this session**; the **All tags** menu shows just one tag's entries. New sessions are numbered and tagged automatically. The premade campaigns come with every session planned and every entry tagged.
- **Campaign guide:** a full-screen walkthrough of the whole campaign in order. The overview has the timeline and quest arc; each session has its goal, its steps in the order to run them (names in a step open right there with full details), everything the session uses (quests, encounters with creature stats, places, people, monsters, treasure, events), prep and rewards, a notes box and a "played" checkbox. Reveal things to players or add creatures to combat straight from the guide. It opens automatically when you start a premade campaign, and from **Open the campaign guide** in any campaign with numbered sessions.
- **Known / Hidden** switch on every entry (new entries start Hidden), with a filter and Reveal all / Hide all per section.
- Weather entries can roll random conditions for the season. NPCs and bosses go straight into combat; encounters add every creature listed ("3 Goblin", "Shark x2").
- Search the whole campaign and download/upload campaigns as `.json` files.
- **AI drafting (Claude or ChatGPT):** "Draft with AI" on every section turns a few words ("a nervous gnome cartographer who sells forged maps") into a full entry, using the campaign's summary and existing names so it fits your world. "Fill in the blanks with AI" completes only the empty fields of an entry. Runs through your own AI helper on AWS, with a personal access code per person, a daily limit, and an **AI activity** log (when, who, what, which AI, cost) on the Campaigns page. Needs the one-time setup in [AI-SETUP.md](AI-SETUP.md).

### Party room (both roles)
- The DM picks a campaign and clicks **Host this campaign's room**. Each campaign has its own 5-character code that stays the same every session. Players open **Party room**, type the code, choose their character and join.
- **DM view:** the combat tracker, Add to combat / Remove for each player (initiative rolled for them), "Add everyone to combat", the party list with HP, AC and passive Perception, and table talk.
- **Player view:** live turn order (enemy health shows as Healthy / Bloodied / Down), Roll initiative, "What the party knows" (the DM's Known entries without secret fields), the party list and table talk.
- **Battle map:** see below.
- **Table talk:** chat plus shared dice rolls. Players share rolls by default; the DM's rolls stay private unless they tick "Share my rolls".
- Damage on a player's sheet updates the DM's tracker. Reloading reconnects automatically.
- Connections go directly to the DM's browser using WebRTC via [PeerJS](https://peerjs.com/) and its free public broker, so the DM's tab must stay open while you play. Some strict networks block direct connections.

### Battle map (in the party room)
- **Make maps (DM):** each campaign keeps as many maps as you like. Draw on a square grid with Floor, Wall, Door, Difficult terrain and colors (water, grass, sand, lava, ice, wood, stone, magic, blood), or use Shapes for filled boxes, outlines, circles and lines. Undo takes back the last stroke. Or upload a picture of a map and draw on top of it.
- **Pictures:** big pictures are shrunk (about 2000 pixels, compressed) so the whole campaign still fits in your account; Map settings shows how much room is left. Line the grid up with the picture's own squares with "Squares across", "Square size" and the arrow buttons. Each square is 5 feet unless you change it.
- **Pick what players see:** "Show players this map" chooses the map on the players' screens; "Stop showing players" hides it.
- **Fog of war:** players see only revealed squares. Use the Fog tool to reveal or hide with a brush or a box, or Reveal all / Hide all. Hidden squares, the parts of the picture under them and tokens standing in them are never sent to players' browsers, and creatures in fog are left off the players' turn order.
- **Tokens:** "Add the party" places a token for every player in the room (each player can move their own), "Add everyone in combat" places the combat tracker's creatures, or name a token and tap where it goes. Tap a token to rename it, change its side or size (up to Gargantuan), choose which player moves it, hide it from players, add it to combat or remove it. Tokens show the tracker's names and health, and a gold ring marks whose turn it is.
- **Players:** drag your own token to move it (the DM's browser checks the move: no moving into fog or walls), measure distances in feet with diagonals counting as one square (5-5-5), and ping a spot or a creature so everyone sees a brief highlight with your name. A long press also pings.
- **Mouse and touch:** drag to pan, scroll or pinch to zoom, the ⤢ button fits the whole map. **Full screen** fills a phone screen with the map. On the DM's drawing tools, pan with two fingers (or the right mouse button, or hold Space).
- **Premade maps:** each premade campaign comes with a map for every planned encounter, creatures already placed, the party's starting area revealed and DM notes (seen only by you) on terrain and tactics. Pick the map, click "Show players this map", then "Add the party" to put everyone on the start squares. A campaign started from a premade before maps existed shows an **Add this adventure's maps** button instead.
- Tokens join up with the combat tracker by name: add an encounter's creatures to combat and "Goblin 2" on the map becomes the tracker's Goblin 2, with its health and turn.
- Maps save with the campaign, so they sync to your account and come along in campaign downloads.

### Everyone
- **Personalize** (palette button in the top bar, or in the account menu): theme (Night, Forest, Ember or the light Parchment), accent color, text size, fonts, and reduce motion. Saved per browser, and with your account when you sign in.
- **Dice tray:** d4–d100, custom rolls (`2d6+3`, `4d6kh3`, `2d20kl1`, `d%`), advantage/disadvantage for the next d20, crit and fumble highlighting, and a history you can tap to roll again.

Everything saves automatically in your browser, and to your account if you're signed in. Without an account, data is per browser and per site address, so use Download/Upload to move characters or campaigns between devices.

## Run it

- **On the web:** https://imago7-ops.github.io/Dnd/ (GitHub Pages, deployed from `main`).
- **On AWS Amplify:** connect this repo in Amplify (settings are in `amplify.yml`); see [AI-SETUP.md](AI-SETUP.md), Part D.
- **What changed and when:** see [CHANGELOG.md](CHANGELOG.md).
- **Locally:** double-click `index.html`.

## Project layout

```
index.html         page shell, loads everything below
css/styles.css     all styling (colors live in :root at the top; phone rules at the bottom)
js/store.js        helpers + saving to localStorage
js/look.js         Personalize: themes, accent colors, text size, fonts
js/dice.js         dice engine and the dice tray
js/rules-2024.js   D&D 2024 rules data: species, backgrounds, classes, subclasses
js/creator.js      step-by-step character creator
js/levelup.js      level up / level down dialog
js/character.js    player character sheet (folders)
js/premades.js     Starter campaigns and the official adventure list
js/premade-maps.js battle maps for the starter campaigns' encounters
js/guide.js        campaign guide (session-by-session walkthrough)
js/campaign.js     DM campaigns library and notebook
js/ai.js           AI drafting dialog (talks to the AI helper)
js/ai-config.js    address of the AI helper
js/account.js      sign-in screen, account menu and syncing to your account
server/aws/index.js          the AI helper (AWS Lambda): keeps API keys secret, logs requests, saves account data
server/aws/template.yaml     one-click AWS CloudFormation template (built from index.js), incl. Cognito accounts
server/aws/build-template.py rebuilds template.yaml after editing index.js
amplify.yml        AWS Amplify hosting settings
js/combat.js       combat tracker (shown inside the party room)
js/battlemap.js    battle map: drawing, pictures, tokens, fog of war, and what players are sent
js/room.js         party room connections (host, join, sync)
js/party.js        party room page
js/app.js          role picker, page routing, phone dice button
```

## Ideas for next steps

- Voice or video chat in the party room.
- Spell and monster lookups from the 5e SRD.
- Pictures in the campaign notebook (NPC portraits, handouts).
- Lighting and line of sight on the battle map.
- Online accounts so characters and campaigns sync across devices.

## Testing the party room on one computer

Add `?transport=local&profile=NAME` to the address (served from a local web server, e.g. `python -m http.server`) to use an in-browser stand-in for the network. Each tab with a different `profile` keeps its own saved data, so one tab can be the DM and others can be players.
