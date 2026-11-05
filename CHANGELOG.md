# Changelog

Every update to Campaign Codex, newest first, grouped by release. Times are US Central.

"Who" is the person who asked for the change and the one who wrote it. The full code history, with exact changes for each entry, is on GitHub under **Commits**.

AI drafting requests (who asked the AI for what, and when) are tracked separately in the site's **AI activity** log on the DM's Campaigns page.

## Third Patch (2.5)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-03 14:05 | 2.5 | Requested by imago7-ops, built by Claude | **Upload a character from a sheet:** players can upload a fillable PDF character sheet (the official sheet, D&D Beyond downloads and most look-alikes, including "secured" PDFs), which is read straight in the browser, or photos, scans and plain PDFs of a sheet, which the AI reads. A summary shows what was read before the character is added; known spells go onto the Spells tab. Photos and scans need the AWS helper updated (AI-SETUP.md, Part F) and an AI access code for each player. |

## Hotfix (2.4 to 2.4.2)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-03 13:18 | 2.4.2 | Requested by imago7-ops, built by Claude | Removed the "Ideas for next steps" list from the README. |
| 2026-11-03 10:40 | 2.4.1 | Requested by imago7-ops, built by Claude | Features & traits: short descriptions for the older subclasses too (Xanathar's, Tasha's, Sword Coast, the 2014 Player's Handbook and DMG, Fizban's, Van Richten's, Wildemount, Bigby's and Dragonlance), about 350 features in all. |
| 2026-11-03 10:05 | 2.4 | Requested by imago7-ops, built by Claude | **Battle maps from the campaign page:** a new Battle maps button at the top of every campaign opens the full map editor, so DMs can draw maps, place tokens, set fog and choose which map players will see before opening the party room. |

## Hotfix (2.3.3)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-02 15:33 | 2.3.3 | Requested by imago7-ops, built by Claude | Party room: the chat (Table talk) is bigger and "What the party knows" smaller, so they're about the same size, each scrolling on its own. Reading older chat no longer jumps to the newest message; a "New messages" button appears instead. |

## Second Patch (2.3 to 2.3.2)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-01 17:41 | 2.3.2 | Requested by imago7-ops, built by Claude | Spell limits: players can only pick as many cantrips and prepared spells as their class and level allow (wizards: spellbook of 6 + 2 per level, and their prepared limit). Bonus spells from a feat, species, item or the DM can be added with "Adding bonus spells" and don't count. |
| 2026-11-01 17:36 | 2.3.1 | Requested by imago7-ops, built by Claude | Spell picker marks recommended spells for each class with a ★ (listed first, with a "Recommended only" filter). Features & traits has a blank box for homebrew and DM-given features. |
| 2026-11-01 17:30 | 2.3 | Requested by imago7-ops, built by Claude | **Spells tab rebuilt like the official spell sheet:** save DC, attack bonus, cantrips and spell levels with slots to tick off, Long/Short rest, prepared and always-prepared spells, Cast/Hit/damage buttons, warlock Pact Magic and Mystic Arcanum, slot overrides for multiclassing. **Spell picker** with 363 SRD 5.2 spells (search, filter by level and class, short summaries) plus homebrew spells. **Features & traits** now open to short descriptions of every class feature and Player's Handbook subclass feature. |

## Hotfix (2.2.1)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-01 17:05 | 2.2.1 | Requested by imago7-ops, built by Claude | Hotfixes: advantage and disadvantage now work on every die and on custom rolls (shows the other roll too). AI drafting reads replies more forgivingly, fixing "not in the expected format" on bosses (line breaks inside fields, replies cut off at the length limit; a cut-off reply keeps what was finished and says so). Combat: Next turn no longer scrolls the page, and skips creatures at 0 HP (player characters still get their turn for death saves). Battle map: Magic and Blood are now see-through overlays like difficult terrain, plus new Fire and Darkness overlays and a Clear overlays brush; older maps convert automatically. |

## Version 3.0 (2.0 to 2.2)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-25 19:39 | 2.2 | Requested by imago7-ops, built by Claude | **Personalize** for Players and DMs: four themes (Night, Forest, Ember, light Parchment), five accent colors, three text sizes, three font styles and a reduce-motion switch; saved per browser and with your account. Section name hint now reads "e.g. gods, ships, rumors". |
| 2026-10-25 18:17 | 2.1 | Requested by imago7-ops, built by Claude | **Battle maps for the premade campaigns:** 14 ready-made maps, one for every planned encounter (Hollowmere 3, Saltgrave 5, Velloran 3, Frostmarch 3), with the creatures already placed, the party's starting area revealed, and DM notes on terrain and tactics. New premade campaigns get them automatically; campaigns made from a premade earlier get an "Add this adventure's maps" button. Tokens now join up with the combat tracker's creature of the same name ("Fog Wisp 2") when it's added to combat. "Add the party" puts players on the map's start squares. Hidden squares are easier to spot for the DM. |
| 2026-10-25 16:51 | 2.0.1 | Requested by imago7-ops, built by Claude | Battle map: the DM now builds on a solid white grid with darker grid lines, so squares and drawings are easy to see. Hidden (fog) squares show as a light blue hatch for the DM. Players' view is unchanged. |
| 2026-10-25 16:38 | 2.0 | Requested by imago7-ops, built by Claude | **Battle map** in the Party room. The DM draws on a square grid (floors, walls, doors, difficult terrain, colors, boxes, circles and lines), uploads a map picture (shrunk to fit the campaign) and lines the grid up with it, places tokens for the party, NPCs and monsters, and keeps several maps per campaign, choosing which one players see. **Fog of war:** hidden squares, the parts of the picture under them and any tokens in them never leave the DM's browser. Players move their own token, measure in feet (5-5-5 diagonals) and ping spots or creatures; the DM's browser checks every move. Tokens link to the combat tracker (same names, HP, whose turn it is), and creatures in fog stay off the players' turn order. Works with mouse and touch (pinch to zoom, drag to pan) and has a full-screen mode for phones. Maps save with the campaign, sync to accounts and travel in campaign downloads. |

## Hotfix (1.15)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-25 11:40 | 1.15 | Requested by imago7-ops, built by Claude | **Campaign guide** for DMs: a full-screen, session-by-session walkthrough (overview with timeline and quest arc; each session's goal, steps in order with clickable names, everything it uses, prep, notes and a played checkbox). Reveal entries and add creatures to combat from the guide. Opens automatically for premade campaigns. |

## Version 2.0 (1.11 to 1.14)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-25 11:20 | 1.14 | Requested by imago7-ops, built by Claude | **Accounts:** sign in with email, password and a username (Amazon Cognito), with email verification, password reset, optional invite code, change username, sign out and delete account. Characters and campaigns sync across devices. **Session folders and tags:** one folder per session listing everything tagged for it, a tag filter, and auto-numbered new sessions; every premade campaign now has session-by-session plans and tagged entries. The AI helper now shows its "not allowed" message to unlisted sites. Requires updating the AWS stack (AI-SETUP.md, Part E). |
| 2026-10-24 10:45 | 1.13 | Requested by imago7-ops, built by Claude | **New campaign** now asks: create your own, use a premade campaign (four original ready-to-run adventures for levels 1 to 8), or start from an official book you own. Encounter creatures added to combat use the campaign's monster HP and AC. Fixed the Campaigns page being too wide on phones. |
| 2026-10-24 10:04 | 1.12.1 | imago7-ops | Connected the site to the AWS AI helper (address added to `js/ai-config.js`). |
| 2026-10-23 12:00 | 1.12 | Requested by imago7-ops, built by Claude (AI assistant) | Moved the AI helper to **AWS** (one-click CloudFormation template). Each person gets their own AI access code. New **AI activity** log on the DM's Campaigns page (when, who, what, which AI, cost) with CSV download. Daily per-person AI limit. Settings file for hosting the website on **AWS Amplify**. Added this changelog. |
| 2026-10-23 11:27 | 1.11 | Requested by imago7-ops, built by Claude | AI drafting for DMs with Claude or ChatGPT: "Draft with AI" on every campaign section and "Fill in the blanks with AI" on entries. New **Monsters and enemies** section. |

## First Patch (1.10 to 1.10.1)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-23 11:09 | 1.10.1 | Claude | Rewrote the README to cover every feature. |
| 2026-10-23 11:08 | 1.10 | Requested by imago7-ops, built by Claude | Mobile-friendly layout. Player sheet split into folders (Character info, Ability scores, Skills, Combat, Spells, Features & traits, Proficiencies, Equipment, Notes) with quick stats. Floating dice button and roll pop-ups on phones. Simpler DM toolbars. |

## Version 1.0 (1.0 to 1.9)

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-22 22:50 | 1.9 | Requested by imago7-ops, built by Claude | **Campaigns library**: multiple campaigns, each with its own notes, combat tracker, chat history and permanent party room code. |
| 2026-10-22 22:41 | 1.8 | Requested by imago7-ops (for a friend helping as DM), built by Claude | DM can add or remove individual players in the combat tracker. |
| 2026-10-22 22:31 | 1.7.1 | Claude | Added `.nojekyll` so GitHub Pages publishes the site. |
| 2026-10-22 22:19 | 1.7 | Requested by imago7-ops, built by Claude | **Party room**: DM hosts with a 5-character code, players join; shared turn order, chat, rolls and Known entries. Combat tracker moved into the room. |
| 2026-10-22 22:08 | 1.6 | Requested by imago7-ops, built by Claude | Known / Hidden switch on every campaign entry. |
| 2026-10-22 21:57 | 1.5 | Requested by imago7-ops, built by Claude | Replaced the DM board with collapsible campaign sections (NPCs, locations, factions, bosses, weather, abnormalities and more). |
| 2026-10-22 19:38 | 1.4 | Requested by imago7-ops, built by Claude | Level up / level down for existing characters. |
| 2026-10-22 19:22 | 1.3 | Requested by imago7-ops, built by Claude | Subclasses from all official books, plus Other / homebrew. |
| 2026-10-22 19:05 | 1.2 | Requested by imago7-ops, built by Claude | Step-by-step character creator (2024 rules). |
| 2026-10-22 18:51 | 1.0 | Requested by imago7-ops, built by Claude | First version: Player / DM choice, character sheet, dice roller, combat tracker, DM board. |


## Adding to this log

When you (or anyone) change the site, add a row at the top of the newest release's table (or start a new release section above it) with the date and time, a version number, who made the change, and a one-line summary.
