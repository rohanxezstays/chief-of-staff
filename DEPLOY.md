# Deploy the board to a permanent phone-friendly link

This puts the board on the internet at a fixed https URL, password-protected,
with data stored in a private GitHub Gist so edits survive restarts. No PC
needs to stay on.

## What's already done for you

- **Gist datastore** created (secret) — holds `board.json` and `leads.json`,
  seeded with your current data. Its ID is kept out of this repo on purpose
  (anyone with the ID can read the gist); use the ID shared with you privately.
- Server already supports cloud mode via env vars (below). Nothing else to code.

## One-time setup (about 10 minutes)

### 1. Create a GitHub token (lets the server read/write the gist)

1. Go to https://github.com/settings/tokens?type=beta (fine-grained token).
2. **Generate new token.** Name: `chief-of-staff`. Expiration: 1 year.
3. Under **Account permissions → Gists**, set **Read and write**.
4. Generate, copy the token (starts `github_pat_...`). You'll paste it in step 3.

### 2. Create a Render account + service

1. Sign up free at https://render.com (log in with GitHub — easiest).
2. **New → Web Service** → connect the `chief-of-staff` repo
   (https://github.com/rohanxezstays/chief-of-staff).
3. Render auto-detects Node from `render.yaml`. Leave defaults. Instance type: **Free**.

### 3. Set three environment variables (in Render → your service → Environment)

| Key | Value |
|-----|-------|
| `GIST_ID` | the gist ID shared with you privately |
| `GITHUB_TOKEN` | the token from step 1 |
| `BOARD_PASSWORD` | any password you choose — you'll type it to open the board |

Click **Save** → Render redeploys.

### 4. Open it

Render gives a URL like `https://chief-of-staff-xxxx.onrender.com`.
Open it on your phone → browser asks for login → username: anything,
password: your `BOARD_PASSWORD`. Add to home screen for an app icon.

## Good to know

- **Free tier sleeps** after ~15 min idle; first open then takes ~30s to wake.
  Fine for personal use. Paid tier ($7/mo) stays always-on if you want.
- **Data lives in the gist**, versioned automatically — every save is a gist
  revision you can roll back.
- **Password protects everything**, including leads. Only people with the
  password can view or edit.
- **Your desktop app is unchanged** — it still runs locally against
  `data/board.json`. The cloud copy is separate; to keep them in sync, pick
  one as your primary (the cloud one, once deployed, is the shareable truth).
