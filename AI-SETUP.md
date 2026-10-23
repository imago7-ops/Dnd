# Setting up AWS: the AI helper and website hosting

This guide moves Campaign Codex onto your Amazon Web Services (AWS) account:

- **The AI helper** (Part C) is a small server that keeps your Claude and ChatGPT keys secret, checks each person's access code, logs every AI request (who, when, what, cost) and enforces a daily limit. One template file builds all of it.
- **The website** (Part D) is hosted on AWS Amplify, which publishes your GitHub repo and updates on every change.

Allow about 45 minutes. Do the parts in order. **Never paste API keys into a chat, the website or a GitHub file**; they only go into the AWS form in Part C.

---

## Part A. Your AWS account (10 min)

1. Create an account at https://aws.amazon.com (a payment card is required).
   - New accounts start on the **Free plan** (credits, 6 months). It closes after 6 months unless you upgrade, so either pick the **Paid plan** now or set a reminder to upgrade. At your usage both cost about $0; you're only billed beyond the free allowances.
2. **Turn on multi-factor authentication (MFA)**: top-right account menu → **Security credentials** → **Assign MFA device**. Do this before anything else.
3. **Set a budget alert**: search the console for **Budgets** → **Create budget** → **Use a template** → **Monthly cost budget**, set **$5**, enter your email. AWS emails you if spending heads past that.
4. Pick a region (top right) close to you, e.g. **US East (Ohio)**, and stay in it for every step.

## Part B. Your AI keys (10 min)

**Claude (Anthropic)**
1. Sign in at https://platform.claude.com.
2. Add credit in billing settings and **set a monthly spend limit**.
3. Create a key at https://platform.claude.com/settings/keys (name it `campaign-codex`) and copy it (starts with `sk-ant-`).

**ChatGPT (OpenAI)**
1. Sign in at https://platform.openai.com.
2. Add credit and **set a monthly budget limit**.
3. Create a key under **API keys** (name it `campaign-codex`) and copy it (starts with `sk-`).

You can use one or both.

## Part C. Create the AI helper (10 min)

1. Get the template file: in your Dnd folder it's `server/aws/template.yaml`. (Or on GitHub: open the file → **Download raw file**.)
2. In the AWS console, search for **CloudFormation** → **Create stack** → **With new resources (standard)**.
3. Choose **Upload a template file** → pick `template.yaml` → **Next**.
4. **Stack name:** `codex`. Then fill in the form:

   | Setting | What to enter |
   |---|---|
   | AnthropicApiKey | Your Claude key (leave empty to switch Claude off) |
   | OpenAIApiKey | Your OpenAI key (leave empty to switch ChatGPT off) |
   | AccessCodes | One code per person: `Josiah=owlbear-77, Sam=mimic-12`. The **name** is what shows in the activity log. Make codes hard to guess. |
   | AdminCode | A separate password (8+ characters) for viewing the AI activity log |
   | AllowedOrigins | Leave as `https://imago7-ops.github.io` for now (you'll add the Amplify address in Part D) |
   | DailyLimit | Most AI requests per person per day (default 100) |
   | Models / MaxTokens | Leave the defaults |

5. **Next** → **Next** → tick **"I acknowledge that AWS CloudFormation might create IAM resources"** → **Submit**.
6. Wait for the status to say **CREATE_COMPLETE** (1–2 minutes; press refresh).
7. Open the **Outputs** tab and copy **AIHelperAddress** (looks like `https://abc123.lambda-url.us-east-2.on.aws/`).
8. Send that address (only the address) to whoever maintains the site, or put it in `js/ai-config.js` yourself:
   ```js
   window.CODEX_AI_ENDPOINT = 'https://abc123.lambda-url.us-east-2.on.aws/';
   ```

**What the template creates:** a Lambda function (the helper), its public address, a DynamoDB table for the activity log (entries kept 1 year), log files kept 30 days, and the minimum permissions to tie them together.

## Part D. Host the website on Amplify (10 min)

1. In the AWS console, search for **Amplify** → **Create new app** (or **Deploy an app**) → **GitHub** → **Next**.
2. Authorize AWS to read your GitHub, then choose repository **imago7-ops/Dnd** and branch **main** → **Next**.
3. Amplify finds `amplify.yml` in the repo (it tells Amplify there's nothing to build). Leave the settings as they are → **Next** → **Save and deploy**.
4. When it says **Deployed**, copy the address (looks like `https://main.d1a2b3c4.amplifyapp.com`). That's your new site. Every change pushed to GitHub redeploys it automatically.
5. **Allow the new address to use the AI:** CloudFormation → stack `codex` → **Update** → **Use existing template** → **Next** → change **AllowedOrigins** to both addresses, separated by a comma:
   `https://imago7-ops.github.io,https://main.d1a2b3c4.amplifyapp.com`
   Leave every other setting on its existing value → **Next** → **Next** → tick the acknowledgement → **Submit**.

Optional: once you're happy with Amplify, you can turn off GitHub Pages (repo **Settings** → **Pages**). Characters and campaigns are saved per browser **and per site address**, so use **Download** on the old site and **Upload** on the new one to move them.

## Using it

- **Draft with AI:** open a campaign → **Draft with AI** on any section (or **Fill in the blanks with AI** on an entry). Enter your personal access code once; the browser remembers it.
- **AI activity log:** Campaigns page → **AI activity** → enter the admin code. You'll see each request's time, who made it, what they asked for, which AI and model, whether it worked, and its estimated cost, plus wrong-code attempts and daily-limit hits. **Download as spreadsheet** saves it as a CSV.

## Changing things later

Everything is changed the same way: CloudFormation → `codex` → **Update** → **Use existing template**, edit the setting, submit. For example:
- Add a person: append `, Taylor=new-code` to **AccessCodes**.
- Remove someone or change a leaked code: edit **AccessCodes**.
- New API key: paste it into **AnthropicApiKey** / **OpenAIApiKey**.
- Cheaper AI: set **AnthropicModel** to `claude-haiku-5-5` or **OpenAIModel** to `gpt-6-luna`.

## What it costs

| Piece | Free allowance | Your likely cost |
|---|---|---|
| Lambda (AI helper) | 1 million requests a month | $0 |
| DynamoDB (activity log) | Pay per request, fractions of a cent | ~$0 |
| CloudWatch logs (30 days) | 5 GB | $0 |
| Amplify hosting | 15 GB served a month (first 12 months free) | ~$0 (the whole site is under 1 MB) |
| Claude / ChatGPT | Pay per use | about 1 cent per draft |

## Security notes

- Your keys and codes are stored as the Lambda function's settings, encrypted by AWS. Anyone who can sign in to your AWS account can see them, so **keep MFA on** and don't share your AWS login.
- The helper only answers your site's addresses and only for valid access codes, and each person has a daily limit. Wrong-code attempts appear in the activity log.
- The activity log stores what people asked the AI for, so remind DMs not to type real-world private information into AI requests.

## Removing it

CloudFormation → `codex` → **Delete**. The activity log table is kept on purpose (so you don't lose history); delete it under **DynamoDB** → **Tables** if you want it gone.

## If something goes wrong

| Message on the site | Fix |
|---|---|
| "The AI helper isn't connected to this site yet" | `js/ai-config.js` doesn't have the address yet (Part C, step 8). |
| "This site is not allowed to use the AI helper" | Add the site's address to **AllowedOrigins** (Part D, step 5). |
| "That access code is not right" | Check the code in **AccessCodes** (it's case-sensitive). |
| "You've reached today's AI limit" | Wait until midnight UTC, or raise **DailyLimit**. |
| "credit balance is too low" / "quota" | Add credit in that AI's billing page. |
| "Claude/ChatGPT is not switched on" | That AI's key is empty in the stack settings. |
