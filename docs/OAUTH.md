# OAuth 2.0 in Unify

Unify uses **server-side OAuth 2.0 authorization code flow** for all integrations. Tokens are exchanged on the backend, encrypted, and never exposed to the browser.

## Flows implemented

| Integration | OAuth type | User experience |
|-------------|------------|-----------------|
| **HighLevel** | Real OAuth 2.0 | Redirect → HL marketplace → choose location → callback |
| **Mock Stripe** | Simulated OAuth 2.0 | Redirect → consent screen → approve → callback → token exchange |
| **HubSpot** | Real OAuth 2.0 | Redirect → HubSpot authorize → callback (falls back to Private App token if OAuth not configured) |
| **Google Contacts** | Real OAuth 2.0 + PKCE | Redirect → Google consent → callback |

## Endpoints

| Step | Endpoint |
|------|----------|
| Start HL OAuth | `GET /oauth/hl/authorize` |
| HL callback | `GET /oauth/hl/callback` |
| Start connector OAuth | `GET /oauth/connector/:id/authorize` |
| Connector callback | `GET /oauth/connector/:id/callback` |
| Mock consent (Stripe) | `GET /oauth/mock/consent` |
| Mock approve | `GET /oauth/mock/approve` |

## Redirect URIs to register

**HighLevel marketplace app:**
```
http://127.0.0.1:5001/YOUR_PROJECT/us-central1/api/oauth/hl/callback
```

**HubSpot public app:**
```
http://127.0.0.1:5001/YOUR_PROJECT/us-central1/api/oauth/connector/hubspot/callback
```

**Google Cloud Console:**
```
http://127.0.0.1:5001/YOUR_PROJECT/us-central1/api/oauth/connector/google-contacts/callback
```

## Environment variables

```env
# HighLevel
HL_CLIENT_ID=
HL_CLIENT_SECRET=
HL_REDIRECT_URI=

# HubSpot OAuth (preferred)
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=

# HubSpot Private App (dev fallback only)
HUBSPOT_PRIVATE_APP_TOKEN=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

## Security

- `state` parameter prevents CSRF on all OAuth starts
- PKCE used for Google Contacts
- Tokens stored AES-256-GCM encrypted in Firestore `tokens` collection
- OAuth callbacks are the only unauthenticated API routes
