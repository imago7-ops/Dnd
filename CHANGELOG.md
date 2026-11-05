# Changelog

Every update to Campaign Codex, newest first, grouped by release. Version numbers read **version.patch.hotfix**: 3.3.1 is version 3, patch 3, first hotfix. Times are US Central.

"Who" is the person who asked for the change and the one who wrote it. The full code history, with exact changes for each entry, is on GitHub under **Commits**.

AI drafting requests (who asked the AI for what, and when) are tracked separately in the site's **AI activity** log on the DM's Campaigns page.

## 4.0: Version 4

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-05 14:40 | 4.0 | Requested by imago7-ops, built by Claude | **Homebrew:** players can make their own classes, subclasses, species and backgrounds while creating a character. **Class:** name and description, hit die, main ability and saving throws, skill choices, armor, weapon and tool proficiencies, starting equipment, armor class and weapons, features by level, and optional spellcasting (full, half, third or Pact Magic caster). **Subclass:** for any class, with combat bonuses (AC, speed, hit points per level, attacks) and features at the class's subclass levels. **Species:** sizes, speed, darkvision and unique features. **Background:** ability scores, two skills and an origin feat (official or new). Homebrew stays as an option until you delete it, syncs to your account, works with level up, the Spells tab and Features & traits, and can be downloaded and uploaded to share. Characters keep a copy of their homebrew. |

## 3.3.1: Hotfix

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-05 14:15 | 3.3.1 | Requested by imago7-ops, built by Claude | Hotfixes: attacks set to STR or DEX now update when leveling up changes your scores (before, only the proficiency bonus changed). Attacks made by the character creator show "Auto" instead of "Own" in the STR / DEX picker, since they're worked out from your scores. The campaign guide reads creatures written as "Shark x2", like the notebook does. Uploaded character and campaign files can no longer slip code onto the page through their ids. |

## 3.3: Fourth Patch

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-05 13:54 | 3.3 | Requested by imago7-ops, built by Claude | **Download a character as a PDF:** a printable character sheet (ability scores, saves, skills, combat, attacks, proficiencies, features, equipment, notes, and a spell page with slots to tick). Uploading that PDF later brings the character back exactly. **Attacks:** each attack has a STR / DEX choice that sets its to-hit (and the damage bonus) and follows your ability scores. **Spells:** the Spell notes box is gone. Spells from your species are added to the spell list automatically by level (always prepared, not counted toward your limits), and Magic Initiate has a "Choose them" button for its spells. Anything players had written in Spell notes was moved to Notes. Also fixed: uploading a saved character now keeps its Spells tab. |

## 3.2: Third Patch

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-03 14:05 | 3.2 | Requested by imago7-ops, built by Claude | **Upload a character from a sheet:** players can upload a fillable PDF character sheet (the official sheet, D&D Beyond downloads and most look-alikes, including "secured" PDFs), which is read straight in the browser, or photos, scans and plain PDFs of a sheet, which the AI reads. A summary shows what was read before the character is added; known spells go onto the Spells tab. Photos and scans need the AWS helper updated (AI-SETUP.md, Part F) and an AI access code for each player. |

## 3.1.1: Hotfix

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-02 15:33 | 3.1.1 | Requested by imago7-ops, built by Claude | Party room: the chat (Table talk) is bigger and "What the party knows" smaller, so they're about the same size, each scrolling on its own. Reading older chat no longer jumps to the newest message; a "New messages" button appears instead. |

## 3.1: Second Patch

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-01 17:41 | 3.1 | Requested by imago7-ops, built by Claude | Spell limits: players can only pick as many cantrips and prepared spells as their class and level allow (wizards: spellbook of 6 + 2 per level, and their prepared limit). Bonus spells from a feat, species, item or the DM can be added with "Adding bonus spells" and don't count. |
| 2026-11-01 17:36 | 3.1 | Requested by imago7-ops, built by Claude | Spell picker marks recommended spells for each class with a ★ (listed first, with a "Recommended only" filter). Features & traits has a blank box for homebrew and DM-given features. |
| 2026-11-01 17:30 | 3.1 | Requested by imago7-ops, built by Claude | **Spells tab rebuilt like the official spell sheet:** save DC, attack bonus, cantrips and spell levels with slots to tick off, Long/Short rest, prepared and always-prepared spells, Cast/Hit/damage buttons, warlock Pact Magic and Mystic Arcanum, slot overrides for multiclassing. **Spell picker** with 363 SRD 5.2 spells (search, filter by level and class, short summaries) plus homebrew spells. **Features & traits** now open to short descriptions of every class feature and Player's Handbook subclass feature. |

## 3.0.1: Hotfix

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-11-01 17:05 | 3.0.1 | Requested by imago7-ops, built by Claude | Hotfixes: advantage and disadvantage now work on every die and on custom rolls (shows the other roll too). AI drafting reads replies more forgivingly, fixing "not in the expected format" on bosses (line breaks inside fields, replies cut off at the length limit; a cut-off reply keeps what was finished and says so). Combat: Next turn no longer scrolls the page, and skips creatures at 0 HP (player characters still get their turn for death saves). Battle map: Magic and Blood are now see-through overlays like difficult terrain, plus new Fire and Darkness overlays and a Clear overlays brush; older maps convert automatically. |

## 3.0: Version 3

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-25 19:39 | 3.0 | Requested by imago7-ops, built by Claude | **Personalize** for Players and DMs: four themes (Night, Forest, Ember, light Parchment), five accent colors, three text sizes, three font styles and a reduce-motion switch; saved per browser and with your account. Section name hint now reads "e.g. gods, ships, rumors". |
| 2026-10-25 18:17 | 3.0 | Requested by imago7-ops, built by Claude | **Battle maps for the premade campaigns:** 14 ready-made maps, one for every planned encounter (Hollowmere 3, Saltgrave 5, Velloran 3, Frostmarch 3), with the creatures already placed, the party's starting area revealed, and DM notes on terrain and tactics. New premade campaigns get them automatically; campaigns made from a premade earlier get an "Add this adventure's maps" button. Tokens now join up with the combat tracker's creature of the same name ("Fog Wisp 2") when it's added to combat. "Add the party" puts players on the map's start squares. Hidden squares are easier to spot for the DM. |
| 2026-10-25 16:51 | 3.0 | Requested by imago7-ops, built by Claude | Battle map: the DM now builds on a solid white grid with darker grid lines, so squares and drawings are easy to see. Hidden (fog) squares show as a light blue hatch for the DM. Players' view is unchanged. |
| 2026-10-25 16:38 | 3.0 | Requested by imago7-ops, built by Claude | **Battle map** in the Party room. The DM draws on a square grid (floors, walls, doors, difficult terrain, colors, boxes, circles and lines), uploads a map picture (shrunk to fit the campaign) and lines the grid up with it, places tokens for the party, NPCs and monsters, and keeps several maps per campaign, choosing which one players see. **Fog of war:** hidden squares, the parts of the picture under them and any tokens in them never leave the DM's browser. Players move their own token, measure in feet (5-5-5 diagonals) and ping spots or creatures; the DM's browser checks every move. Tokens link to the combat tracker (same names, HP, whose turn it is), and creatures in fog stay off the players' turn order. Works with mouse and touch (pinch to zoom, drag to pan) and has a full-screen mode for phones. Maps save with the campaign, sync to accounts and travel in campaign downloads. |

## 2.0.1: Hotfix

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-25 11:40 | 2.0.1 | Requested by imago7-ops, built by Claude | **Campaign guide** for DMs: a full-screen, session-by-session walkthrough (overview with timeline and quest arc; each session's goal, steps in order with clickable names, everything it uses, prep, notes and a played checkbox). Reveal entries and add creatures to combat from the guide. Opens automatically for premade campaigns. |

## 2.0: Version 2

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-25 11:20 | 2.0 | Requested by imago7-ops, built by Claude | **Accounts:** sign in with email, password and a username (Amazon Cognito), with email verification, password reset, optional invite code, change username, sign out and delete account. Characters and campaigns sync across devices. **Session folders and tags:** one folder per session listing everything tagged for it, a tag filter, and auto-numbered new sessions; every premade campaign now has session-by-session plans and tagged entries. The AI helper now shows its "not allowed" message to unlisted sites. Requires updating the AWS stack (AI-SETUP.md, Part E). |
| 2026-10-24 10:45 | 2.0 | Requested by imago7-ops, built by Claude | **New campaign** now asks: create your own, use a premade campaign (four original ready-to-run adventures for levels 1 to 8), or start from an official book you own. Encounter creatures added to combat use the campaign's monster HP and AC. Fixed the Campaigns page being too wide on phones. |
| 2026-10-24 10:04 | 2.0 | imago7-ops | Connected the site to the AWS AI helper (address added to `js/ai-config.js`). |
| 2026-10-23 12:00 | 2.0 | Requested by imago7-ops, built by Claude (AI assistant) | Moved the AI helper to **AWS** (one-click CloudFormation template). Each person gets their own AI access code. New **AI activity** log on the DM's Campaigns page (when, who, what, which AI, cost) with CSV download. Daily per-person AI limit. Settings file for hosting the website on **AWS Amplify**. Added this changelog. |
| 2026-10-23 11:27 | 2.0 | Requested by imago7-ops, built by Claude | AI drafting for DMs with Claude or ChatGPT: "Draft with AI" on every campaign section and "Fill in the blanks with AI" on entries. New **Monsters and enemies** section. |

## 1.1: First Patch

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-23 11:09 | 1.1 | Claude | Rewrote the README to cover every feature. |
| 2026-10-23 11:08 | 1.1 | Requested by imago7-ops, built by Claude | Mobile-friendly layout. Player sheet split into folders (Character info, Ability scores, Skills, Combat, Spells, Features & traits, Proficiencies, Equipment, Notes) with quick stats. Floating dice button and roll pop-ups on phones. Simpler DM toolbars. |

## 1.0: Version 1

| When | Version | Who | What changed |
|---|---|---|---|
| 2026-10-22 22:50 | 1.0 | Requested by imago7-ops, built by Claude | **Campaigns library**: multiple campaigns, each with its own notes, combat tracker, chat history and permanent party room code. |
| 2026-10-22 22:41 | 1.0 | Requested by imago7-ops (for a friend helping as DM), built by Claude | DM can add or remove individual players in the combat tracker. |
| 2026-10-22 22:31 | 1.0 | Claude | Added `.nojekyll` so GitHub Pages publishes the site. |
| 2026-10-22 22:19 | 1.0 | Requested by imago7-ops, built by Claude | **Party room**: DM hosts with a 5-character code, players join; shared turn order, chat, rolls and Known entries. Combat tracker moved into the room. |
| 2026-10-22 22:08 | 1.0 | Requested by imago7-ops, built by Claude | Known / Hidden switch on every campaign entry. |
| 2026-10-22 21:57 | 1.0 | Requested by imago7-ops, built by Claude | Replaced the DM board with collapsible campaign sections (NPCs, locations, factions, bosses, weather, abnormalities and more). |
| 2026-10-22 19:38 | 1.0 | Requested by imago7-ops, built by Claude | Level up / level down for existing characters. |
| 2026-10-22 19:22 | 1.0 | Requested by imago7-ops, built by Claude | Subclasses from all official books, plus Other / homebrew. |
| 2026-10-22 19:05 | 1.0 | Requested by imago7-ops, built by Claude | Step-by-step character creator (2024 rules). |
| 2026-10-22 18:51 | 1.0 | Requested by imago7-ops, built by Claude | First version: Player / DM choice, character sheet, dice roller, combat tracker, DM board. |


## Adding to this log

When you (or anyone) change the site, add a row with the date and time, the release number, who made the change, and a one-line summary. New features start the next patch (3.3 to 3.4) and fixes are the next hotfix (3.3 to 3.3.1), each as its own section above the last one. A new version number (4.0) is the site owner's call.
