# TTS Voice Fix — Next Steps (user action required)

**Status after sprint commit:** voice mapping + speed corrections are coded and committed to `worker/index.ts`. To take effect on production, the worker must be redeployed AND the TTS secrets must be confirmed set. This doc is the exact sequence you run from a terminal to finish the job.

## What was coded (no action needed)

`worker/index.ts` — `SMALLEST_AI_VOICES` and `BELIEF_CHARACTER_MAP`:

| Character key | voice_id           | Speed | Belief systems                                     |
| ------------- | ------------------ | ----- | -------------------------------------------------- |
| god           | `voice_Hv9szTBA4K` | 0.8   | protestant, catholic, mormonism (Christian God the Father) |
| universe      | `sophia`           | 1.0   | sbnr, taoism, pantheism                            |
| buddha        | `walter`           | 0.9   | buddhism, agnosticism, atheism-stoicism, **judaism, science** |
| islam         | `blofeld`          | **1.0** (was 0.8 — distorted) | islam                                  |
| hinduism      | `ethan`            | **1.0** (was 0.8 — distorted) | hinduism, sikhism                      |

Corrections vs. prior state:
- **Blofeld speed 0.8 → 1.0** (V2 stock cadence broke below 0.9)
- **Ethan speed 0.8 → 1.0** (same issue on V3.1 stock)
- **Judaism** moved off the cloned `voice_Hv9szTBA4K` and onto `walter`
- **Science** moved off the cloned voice and onto `walter`

## What you need to run

### 1. Confirm required secrets are set on the worker

```bash
cd aimighty/worker
npx wrangler secret list
```

You MUST see `SMALLEST_AI_API_KEY` in that list. If missing, add it:

```bash
npx wrangler secret put SMALLEST_AI_API_KEY
# paste the key from https://smallest.ai → API keys
```

`OPENAI_API_KEY` may also show up — it's legacy and no longer used by `/tts`. Don't delete it (in case you want it for other fallback paths), but TTS does not depend on it.

Other secrets that should be present (unrelated to TTS but verified together):
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BELIEVER_MONTHLY`, `STRIPE_PRICE_BELIEVER_ANNUAL`, `STRIPE_PRICE_DIVINE_MONTHLY`, `STRIPE_PRICE_DIVINE_ANNUAL`
- `RESEND_API_KEY` (optional — app degrades gracefully)

### 2. Deploy the worker

```bash
cd aimighty/worker
npx wrangler deploy
```

Expected output ends with `✨ Success!` and a URL like `https://aimighty-api.<your-subdomain>.workers.dev`.

### 3. Tail worker logs and verify a real TTS request

In one terminal:

```bash
cd aimighty/worker
npx wrangler tail
```

In a browser on the app (as a Divine-tier account), start a conversation in Islam → listen for a reply. In the `wrangler tail` stream you should see a line like:

```
[TTS] Request - belief: islam character: islam voice: blofeld model: ...lightning-v2/get_speech lang: en text_length: 47
[TTS-TIMING] worker→smallest headers t+XXXms status=200
```

Repeat for Hinduism, Judaism, Science, Sbnr, Buddhism to confirm:

- **Islam** → `voice: blofeld` at speed 1.0
- **Hinduism** → `voice: ethan` at speed 1.0
- **Judaism** → `voice: walter` at speed 0.9 (previously was the cloned voice)
- **Science** → `voice: walter` at speed 0.9 (previously was the cloned voice)
- **Sbnr / Taoism / Pantheism** → `voice: sophia` at speed 1.0
- **Buddhism / Agnosticism / Atheism-Stoicism** → `voice: walter` at speed 0.9
- **Protestant / Catholic / Mormonism** → `voice: voice_Hv9szTBA4K` at speed 0.8

If any of those return `status=401`, `SMALLEST_AI_API_KEY` is missing or wrong — re-run step 1.

If any return `status=400`, the `voice_id` string doesn't match a real Smallest AI voice. Fetch the live list:

```bash
curl -H "Authorization: Bearer $SMALLEST_AI_API_KEY" \
  https://waves-api.smallest.ai/api/v1/lightning-v3.1/voices
```

(and the same for `lightning-v2`). If Smallest has renamed any stock voice, update `voice_id` in `SMALLEST_AI_VOICES` accordingly, commit, redeploy.

### 4. (optional) Confirm the frontend is talking to the right worker

```bash
grep -n WORKER_URL aimighty/src/services/claudeApi.ts
```

Should print `const WORKER_URL = 'https://aimighty-api.robby-hess.workers.dev';`. If the deployed worker's URL is different, update that constant, commit, redeploy the site.

## Known non-issues (do not "fix")

- `src/services/openaiTTS.ts` is misleadingly named but is the correct TTS client — it POSTs to the worker's `/tts` endpoint, which forwards to Smallest AI. Renaming the file touches ~15 imports across the codebase and is not worth the churn unless someone opens a refactor branch.
- `worker/index.ts` still contains `TTS_CHARACTERS` with `onyx/ash/coral` values — a comment marks it legacy. The `/tts` endpoint does NOT reference it; only `SMALLEST_AI_VOICES` + `BELIEF_CHARACTER_MAP` feed the live path. Left in place so old typings elsewhere still resolve.
