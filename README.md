# Campaign Codex

A browser-based D&D 5e table companion. No install, no build step, no account: open `index.html` and play.

## What's in the MVP

**First visit:** choose whether you're a **Player** or the **Dungeon Master**
- A campaign notebook with a collapsible section for each part of the campaign: NPCs, Locations, Factions, Bosses, Weather, Abnormalities, Quests, Encounters, Items and loot, Lore and history, and Session notes. Add your own sections too (Gods, Ships, Rumors…).
- Each entry is a row you can expand into a form with fields that suit it: NPC attitude and secrets, faction goals and standing, boss CR, HP and legendary actions, abnormality causes and effects, and so on. Names of locations, factions and NPCs are suggested in related fields.
- Weather entries can roll random conditions for the season, with their effects on travel and combat.
- NPCs and bosses go straight into combat; encounters add every creature listed ("3 Goblin", "Shark x2").
- Search across the whole campaign, expand or collapse everything, and download/upload the campaign as a `.json` file. Cards from the earlier board layout carry over automatically.

**Everyone**
- **Dice tray** on the right of every page: d4–d100 buttons, custom rolls (`2d6+3`, `4d6kh3`, `2d20kl1`, `d%`), advantage/disadvantage for the next d20, crit and fumble highlighting, and a history you can click to roll again.
- **Combat tracker:** add creatures (with a count, e.g. 3 goblins), leave initiative blank to auto-roll, start combat to sort by initiative, then Next turn / Previous with a round counter. Track HP (type an amount, press Enter for damage or Shift+Enter to heal), AC and conditions.

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
js/combat.js       initiative / combat tracker
js/campaign.js     DM campaign notebook
js/app.js          role picker and page routing
```

## Ideas for next steps

- Share a campaign or combat live between the DM and players (needs a small backend, e.g. Supabase or Firebase).
- Spell and monster lookups from the 5e SRD.
- Links between canvas cards, and maps/images on the canvas.
- Player view of the DM's initiative order.
