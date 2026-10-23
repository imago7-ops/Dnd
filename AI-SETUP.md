# Setting up the AI helper

The DM's **Draft with AI** buttons use Claude and/or ChatGPT. Your API keys must stay secret, so they live on a small free **Cloudflare Worker** (a tiny server), not in the website. The website talks to the Worker; the Worker adds your key and asks the AI.

You'll need about 20 minutes. Do the steps in order.

---

## 1. Get your AI keys (one or both)

**Claude (Anthropic)**
1. Go to https://platform.claude.com and sign in or create an account.
2. Add a payment method and some credit in the Console's billing settings. A few dollars goes a long way (drafting one NPC costs roughly a cent).
3. **Set a monthly spend limit** in the Console's billing / limits settings so a mistake can never cost more than you're comfortable with.
4. Open https://platform.claude.com/settings/keys, click **Create key**, name it `campaign-codex`, and copy it. It starts with `sk-ant-` and is shown only once.

**ChatGPT (OpenAI)**
1. Go to https://platform.openai.com and sign in or create an account.
2. Add billing credit, and **set a monthly budget limit** in the billing / limits settings.
3. Create an API key under **API keys**, name it `campaign-codex`, and copy it (starts with `sk-`).

Keep the keys somewhere private for the next step. Never paste them into the website, a chat, or a GitHub file.

## 2. Create the Worker

1. Make a free account at https://dash.cloudflare.com.
2. Go to **Workers & Pages** → **Create** → **Create Worker** (start from "Hello World").
3. Name it `codex-ai` and click **Deploy**.
4. Click **Edit code**. Delete everything in the editor, then open `server/ai-worker.js` from this repo, copy all of it, and paste it in.
5. Click **Deploy**.
6. Copy the Worker's address shown at the top. It looks like `https://codex-ai.YOUR-NAME.workers.dev`.

## 3. Add your keys and an access code

In the Worker, go to **Settings** → **Variables and Secrets** → **Add**. Add each of these with type **Secret**:

| Variable name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Claude key (skip if you're not using Claude) |
| `OPENAI_API_KEY` | your OpenAI key (skip if you're not using ChatGPT) |
| `ACCESS_CODE` | a password you make up, e.g. `owlbear-77` |

Click **Deploy** after adding them.

The **access code** is what stops strangers from using your keys: the website is public, so anyone could find the Worker's address, but only people who know the code can make it spend money. Give the code only to DMs you trust, and change it (edit the secret) if it leaks.

Optional settings (type **Text**):

| Variable name | What it does |
|---|---|
| `ALLOWED_ORIGINS` | Websites allowed to use the Worker. Default `https://imago7-ops.github.io`. |
| `ANTHROPIC_MODEL` | Claude model. Default `claude-sonnet-5-5` (good and affordable). |
| `OPENAI_MODEL` | OpenAI model. Default `gpt-6.1-sol`. |
| `MAX_TOKENS` | Longest reply allowed. Default `1500`. |

## 4. Connect the website

Send the Worker address from step 2 to whoever maintains the site (or edit `js/ai-config.js` yourself) so it reads:

```js
window.CODEX_AI_ENDPOINT = 'https://codex-ai.YOUR-NAME.workers.dev';
```

Once that's pushed, open the site as the DM, open a campaign, click **Draft with AI** on any section, enter the access code once, and draft away.

## 5. Check it's working

Open the Worker address in your browser. You should see a short message saying the site isn't allowed; that's correct (it only answers your website). On the site, the Draft with AI dialog shows "Claude" and/or "ChatGPT" in the AI menu when your keys are in place.

**If something goes wrong**, the dialog shows the message from the AI service, for example:
- "That access code is not right": re-type the code.
- "credit balance is too low" or "quota": add credit in that AI's billing page.
- "not switched on": that AI's key isn't added in step 3.

## Is this allowed?

Yes. Anthropic and OpenAI sell API access so people can build their models into apps and websites. You're responsible for following their usage policies, keeping your keys private, and the costs on your account. The prompts ask the AI for original material rather than text copied from published D&D books.
