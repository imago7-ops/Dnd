# Campaign Codex

A browser-based D&D 5e table companion. No install, no build step, no account: open `index.html` and play.

## What's in the MVP

**First visit:** choose whether you're a **Player** or the **Dungeon Master**. You can switch any time with "Switch role" in the top bar.

**Player**
- Create a new character with the step-by-step creator (2024 rules): species, background, class, level and subclass, ability scores, then a name. It fills in the whole sheet for you: ability scores with background bonuses, saves, skills, HP, AC, speed, initiative, hit dice, starting attacks, species traits, class and subclass features by level, origin feats, proficiencies and languages, starting equipment, and spellcasting (save DC, attack bonus, cantrips, prepared spells, spell slots). Every field stays editable.
- Subclasses: all 123 official ones, grouped as Player's Handbook (2024) and other official books (Xanathar's, Tasha's, Sword Coast, Wildemount, Fizban's, Van Richten's, Bigby's, Dragonlance, Heroes of Faerûn and the 2014 core books), plus an "Other / homebrew" option where you type any name.
- Or start from a blank sheet, or upload a character you saved before (`.json`).
- Full 5e sheet: abilities, saving throws, 18 skills (click the dot for proficiency, twice for expertise), AC, initiative, speed, HP with damage/heal, hit dice, death saves, attacks, features, equipment, spells and notes.
- Proficiency bonus and every modifier calculate themselves from your level and scores.
- "Roll scores" (4d6, drop lowest) or "Standard array" to fill abilities.
- Click any number on the sheet to roll it.
- Keep several characters and switch between them. Download a character to back it up or move it to another computer.

**Dungeon Master**
- An empty campaign canvas. Add Location, NPC, Quest, Encounter, Item and Note cards from the bar at the bottom, or double-click the table to drop a note.
- Drag cards by their header, drag empty space to pan, scroll to zoom, "Recenter" to find your cards again.
- NPC and Encounter cards have "Add to combat".
- Download/upload the whole campaign as a `.json` file.

**Everyone**
- **Dice tray** on the right of every page: d4–d100 buttons, custom rolls (`2d6+3`, `4d6kh3`, `2d20kl1`, `d%`), advantage/disadvantage for the next d20, crit and fumble highlighting, and a history you can click to roll again.
- **Combat tracker:** add creatures (with a count, e.g. 3 goblins), leave initiative blank to auto-roll, start combat to sort by initiative, then Next turn / Previous with a round counter. Track HP (type an amount, press Enter for damage or Shift+Enter to heal), AC and conditions.

Everything saves automatically in your browser's local storage.

## Run it

- **Locally:** double-click `index.html`.
- **On the web (free):** in your GitHub repo go to **Settings → Pages**, set **Source** to "Deploy from a branch", pick `main` and `/ (root)`, and save. After a minute your site is at `https://imago7-ops.github.io/Dnd/`.

## Project layout

```
index.html         page shell, loads everything below
css/styles.css     all styling (colors live in :root at the top)
js/store.js        helpers + saving to localStorage
js/dice.js         dice engine and the dice tray
js/rules-2024.js   D&D 2024 rules data: species, backgrounds, classes, subclasses
js/creator.js      step-by-step character creator
js/character.js    player character sheet
js/combat.js       initiative / combat tracker
js/campaign.js     DM campaign canvas
js/app.js          role picker and page routing
```

## Ideas for next steps

- Share a campaign or combat live between the DM and players (needs a small backend, e.g. Supabase or Firebase).
- Spell and monster lookups from the 5e SRD.
- Links between canvas cards, and maps/images on the canvas.
- Player view of the DM's initiative order.
