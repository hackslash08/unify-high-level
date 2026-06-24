# Unify — HighLevel Integrations Platform

AI-native integration platform that connects third-party apps through a unified connector framework, normalizes data into shared schemas, and syncs contacts into HighLevel.

**Stack:** Vue 3 · TypeScript · shadcn-vue · Firebase (Auth, Firestore, Cloud Functions) · pnpm monorepo

**Demo:** Runs locally (or via ngrok for external testers). Production Firebase Hosting is disabled; backend uses the Functions emulator locally.

---

## What’s Built

| Area | Status |
|------|--------|
| Connector framework + registry | ✅ |
| Unified Zod schemas (Contact, Company, Lead) | ✅ |
| Sync engine → HighLevel API | ✅ |
| Mock Stripe connector (fixture data) | ✅ Working |
| HubSpot connector (Private App token) | ✅ Working |
| Google Contacts connector (OAuth + PKCE) | ✅ Code complete; needs Google Cloud OAuth |
| Vue UI (login, connectors, contacts, sync history, settings) | ✅ |
| Encrypted token storage (AES-256-GCM) | ✅ |
| Unit + integration tests (14 tests) | ✅ |
| Cloud Functions deploy | ⏸ Requires Firebase Blaze plan |
| Firebase Hosting | ⏸ Disabled (local / ngrok only) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable`)
- Firebase CLI (`npm i -g firebase-tools`)
- [HighLevel developer account](https://developers.gohighlevel.com) + marketplace app
- HubSpot Private App token (optional, for HubSpot connector)
- [ngrok](https://ngrok.com/) (optional, for sharing with external testers)

### 1. Install

```bash
pnpm install
```

### 2. Environment

Copy example env files and fill in credentials:

```powershell
# Windows
Copy-Item .env.example .env
Copy-Item apps\web\.env.example apps\web\.env
Copy-Item functions\.env.example functions\.env
```

```bash
# macOS / Linux
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp functions/.env.example functions/.env
```

**Required in `functions/.env`:**

| Variable | Purpose |
|----------|---------|
| `HL_CLIENT_ID`, `HL_CLIENT_SECRET`, `HL_APP_ID` | HighLevel OAuth |
| `HL_REDIRECT_URI` | OAuth callback (see below) |
| `APP_URL` | Frontend base URL for redirects |
| `FUNCTIONS_URL` | API base URL |
| `TOKEN_ENCRYPTION_KEY` | 64-char hex key for token encryption |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot Private App (optional) |

Generate encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**`apps/web/.env`:** Firebase web config (`VITE_FIREBASE_*`) and `VITE_API_BASE_URL=/api` (Vite proxies to the Functions emulator).

Update `.firebaserc` if using a different Firebase project.

### 3. Build workspace packages

```bash
pnpm build
```

### 4. Run locally (recommended for development)

**Terminal 1 — Firebase emulators (Auth, Firestore, Functions):**

```bash
firebase emulators:start
```

**Terminal 2 — Vue dev server:**

```bash
pnpm dev:web
```

Open **http://localhost:5173**

- Emulators: Auth `:9099`, Firestore `:8080`, Functions `:5001`, Emulator UI `:4000`
- Vite proxies `/api` → `http://127.0.0.1:5001/PROJECT_ID/us-central1/api`

Enable **Email/Password** in Firebase Console (production) or use the Auth emulator locally.

### 5. Share with external testers (ngrok)

One command starts Vite, ngrok, and the Functions emulator. Remote users use your ngrok URL; Auth and Firestore use **production** Firebase (not emulators).

```bash
pnpm dev:share
```

Before sharing:

1. Add the printed **ngrok hostname** to Firebase Console → Authentication → Authorized domains
2. Add the printed **HighLevel redirect URL** to your HL marketplace app

Press `Ctrl+C` to stop and restore local env URLs.

### 6. Tests

```bash
pnpm test
```

14 tests across mapping modules, guardrails, and sync-engine integration.

---

## Project Structure

```
highlevel/
├── apps/web/                    # Vue 3 SPA (shadcn-vue)
│   ├── src/views/               # Login, Connectors, Contacts, Sync History, Settings
│   ├── src/lib/api.ts           # Typed API client (Bearer token)
│   └── vite.config.ts           # /api proxy to Functions emulator
├── functions/                   # Express API on Cloud Functions
│   ├── src/routes/api.ts        # Unified REST API
│   ├── src/routes/oauth.ts      # HL + connector OAuth
│   ├── src/services/sync-engine.ts
│   └── src/services/highlevel.ts
├── packages/
│   ├── shared/                  # Zod schemas (Contact, Company, Lead, Sync)
│   └── connectors/              # Connector interface + implementations
│       ├── src/registry.ts
│       ├── src/mock-stripe/
│       ├── src/hubspot/
│       └── src/google-contacts/
├── scripts/share-dev.mjs        # ngrok share mode orchestration
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   └── VIDEO_WALKTHROUGH.md     # Loom / demo script
├── tests/integration/
└── firestore.rules
```

---

## Connectors

| ID | Auth type | Status | Notes |
|----|-----------|--------|-------|
| `mock-stripe` | `oauth2` (simulated) | ✅ Working | Full OAuth consent → callback → token exchange; fixture data |
| `hubspot` | `oauth2` | ✅ With credentials | HubSpot Public App OAuth; private token dev fallback |
| `google-contacts` | `oauth2` + PKCE | Code ready | Needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |

### Adding a new connector

1. Create `packages/connectors/src/my-connector/index.ts` implementing `Connector`
2. Add mapping in `packages/connectors/src/mappings/`
3. Register in `packages/connectors/src/registry.ts`
4. Add unit tests for mappings

No changes required to sync engine, unified API, or UI plumbing.

---

## OAuth Redirect URIs

Register these in your **HighLevel marketplace app** (and Google Cloud Console for Google Contacts).

**Local (emulators + `pnpm dev:web`):**

```
http://127.0.0.1:5001/YOUR_PROJECT_ID/us-central1/api/oauth/hl/callback
```

With Vite proxy + ngrok share mode, use the URL printed by `pnpm dev:share`:

```
https://YOUR-NGROK-HOST.ngrok-free.app/api/oauth/hl/callback
```

**Production (after Blaze upgrade + deploy):**

```
https://YOUR_PROJECT.web.app/api/oauth/hl/callback
```

Also set `APP_URL` and `FUNCTIONS_URL` in `functions/.env` to match the environment you are running.

---

## API Reference

**Local base URL:** `http://127.0.0.1:5001/PROJECT_ID/us-central1/api`  
**Via Vite proxy:** `http://localhost:5173/api`

All endpoints require `Authorization: Bearer <Firebase ID Token>` except OAuth callbacks.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/me` | User profile + HL connection status |
| GET | `/connectors` | Connector metadata for UI |
| GET | `/connections` | User’s connections |
| DELETE | `/connections/:id` | Disconnect |
| GET | `/contacts?source=` | Unified contacts from connected sources |
| POST | `/contacts` | Push contact to a source connector |
| POST | `/sync` | Manual sync (external → HighLevel) |
| POST | `/webhook/simulate` | Trigger sync via webhook simulation |
| GET | `/sync-runs` | Sync history |
| GET | `/sync-runs/:id/errors` | Per-record sync errors |
| GET | `/oauth/hl/authorize` | Start HighLevel OAuth |
| GET | `/oauth/hl/callback` | HighLevel OAuth callback |
| GET | `/oauth/connector/:id/authorize` | Start connector OAuth / connect |
| GET | `/oauth/connector/:id/callback` | Connector OAuth callback |

Full product spec: [docs/PRD.md](./docs/PRD.md)  
**OAuth flows:** [docs/OAUTH.md](./docs/OAUTH.md)  
Architecture diagrams: [docs/architecture.md](./docs/architecture.md)  
**Video demo script:** [docs/VIDEO_WALKTHROUGH.md](./docs/VIDEO_WALKTHROUGH.md)

---

## Deployment

Cloud Functions require a **Firebase Blaze (pay-as-you-go)** plan. Hosting is currently **disabled**; the app is intended to run locally or via `pnpm dev:share`.

```bash
firebase login
firebase use your-project-id

# After Blaze upgrade
pnpm deploy:functions    # Deploy API only
pnpm deploy:hosting      # Re-enable hosting + deploy UI (optional)
```

Environment variables for production are loaded from `functions/.env` at deploy time (no Secret Manager binding in current setup).

---

## Security

- OAuth flows run **server-side only**; tokens never reach the browser
- Tokens stored in Firestore `tokens` collection, **AES-256-GCM encrypted**
- Firestore rules: users read own data; `tokens`, `oauthStates`, `syncLocks` are server-only
- Sync guardrails: 1000 record cap, 60 req/min rate limit, per-connection concurrency lock

---

## AI-First SDLC

This project was built with AI assistance across the SDLC. Representative prompts and human decisions are documented in [docs/PRD.md §12](./docs/PRD.md) and the [video walkthrough](./docs/VIDEO_WALKTHROUGH.md).

**Human decisions:**
- pnpm workspaces over Nx for assignment scope
- Mock Stripe for predictable demo data; HubSpot via Private App for a real second connector
- Firestore locks vs Redis for concurrency
- Local + ngrok sharing instead of Blaze deploy for external testing

---

## License

Private — assignment submission. Invite `highlevel-dev` on GitHub.
