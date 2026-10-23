# Campaign Codex

A browser-based D&D 5e table companion. No install, no build step, no account: open `index.html` and play.

## What's in the MVP

**First visit:** choose whether you're a **Player** or the **Dungeon Master**
- A campaign notebook with a collapsible section for each part of the campaign: NPCs, Locations, Factions, Bosses, Weather, Abnormalities, Quests, Encounters, Items and loot, Lore and history, and Session notes. Add your own sections too (Gods, Ships, Rumors…).
- Each entry is a row you can expand into a form with fields that suit it: NPC attitude and secrets, faction goals and standing, boss CR, HP and legendary actions, abnormality causes and effects, and so on. Names of locations, factions and NPCs are suggested in related fields.
- Mark any entry **Known** or **Hidden** with the switch on its row. New entries start Hidden. Filter to see only what the players know (or only your secrets), and use Reveal all / Hide all on a section.
- Weather entries can roll random conditions for the season, with their effects on travel and combat.
- NPCs and bosses go straight into combat; encounters add every creature listed ("3 Goblin", "Shark x2").
- Search across the whole campaign, expand or collapse everything, and download/upload the campaign as a `.json` file. Cards from the earlier board layout carry over automatically.

**Party room** (both roles)
- The DM clicks **Host a party room** and gets a 5-character code. Players open **Party room**, type the code, pick the character they're bringing, and join from their own computers.
- **DM view:** the combat tracker, "Add the party to combat" (rolls initiative for everyone), the party list with each character's HP, AC and passive Perception, and the table talk feed.
- **Player view:** the live turn order (enemy health shows only as Healthy / Bloodied / Down), a Roll initiative button, "What the party knows" (the DM's entries marked Known, without secret fields), the party list and table talk.
- **Table talk:** chat plus shared dice rolls. Players share rolls by default; the DM's rolls stay private unless they tick "Share my rolls".
- Damage taken on a player's sheet updates the DM's tracker and party list. Reloading the page reconnects automatically.
- How it connects: browsers talk directly to the DM's browser using WebRTC via [PeerJS](https://peerjs.com/) and its free public connection broker, so there's no server or account to set up. The DM's tab has to stay open while you play. Some very strict networks (some schools and offices) block direct connections.

**Everyone**
- **Dice tray** on the right of every page: d4–d100 buttons, custom rolls (`2d6+3`, `4d6kh3`, `2d20kl1`, `d%`), advantage/disadvantage for the next d20, crit and fumble highlighting, and a history you can click to roll again.

Everything saves automatically in your browser's local storage.

## Run it

- **Locally:** double-click `index.html`.
- **Share links:** `https://imago7-ops.github.io/Dnd/#/character` opens the Player page directly, and `#/campaign` opens the DM page.
- **On the web (free):** in your GitHub repo go to **Settings → Pages**, set **Source** to "Deploy from a branch", pick `main` and `/ (root)`, and save. After a minute your site is at `https://imago7-ops.github.io/Dnd/`.

## Project layout

```
index.html         page shell, loads everything below
css/styles.css     all styling (colors live in :root at the top)
js/store.js        helpers + saving to localStorage
js/dice.js         dice engine and the dice tray
js/rules-2024.js   D&D 2024 rules data: species, backgrounds, classes, subclasses
js/creator.js      step-by-step character creator
js/levelup.js      level up / level down dialog
js/character.js    player character sheet
js/campaign.js     DM campaign notebook
js/room.js         party room connections (host, join, sync)
js/party.js        party room page
js/combat.js       combat tracker (shown inside the party room)
js/app.js          role picker and page routing
```

## Ideas for next steps

- Share a campaign or combat live between the DM and players (needs a small backend, e.g. Supabase or Firebase).
- Spell and monster lookups from the 5e SRD.
- Links between canvas cards, and maps/images on the canvas.
- Player view of the DM's initiative order.

## Testing the party room on one computer

Add `?transport=local&profile=NAME` to the address (served from a local web server, e.g. `python -m http.server`) to use an in-browser stand-in for the network. Each tab with a different `profile` keeps its own saved data, so one tab can be the DM and others can be players.
