# Aeiforo programmatic API

This document covers programmatic access to the Aeiforo Sustainability
Reporting platform via API keys. API keys are intended for CI pipelines,
BI tools, and ERP push connectors. They are distinct from SCIM tokens
(which are only for identity-provider user sync).

## Base URL

```
https://<your-workspace>.aeiforo.com/api
```

For local development the base URL is `http://localhost:5173/api` (proxied
through Vite to the Vercel functions runtime).

## Authentication

All API key requests use a bearer token in the `Authorization` header.
Tokens are prefixed with `aei_`. The auth pipeline detects this prefix and
resolves the calling org and allowed scopes from the `api_keys` table; JWT
session tokens (no prefix) continue to work for user-driven flows.

```
Authorization: Bearer aei_<32-byte-base64url>
```

Tokens are revealed exactly once at creation time. The server stores only a
SHA-256 hash — there is no way to recover a lost token. If a key is lost or
compromised, revoke it from `Admin → API keys` and issue a new one.

## Scopes

Scopes are the same string identifiers as user permissions, so an admin can
mentally model an API key as "a user with exactly these permissions".

| Scope            | Grants                                                    |
| ---------------- | --------------------------------------------------------- |
| `data.view`      | Read activity data, facilities, emission factors          |
| `data.upload`    | Push activity data and run CSV imports                    |
| `data.approve`   | Approve submitted data values                             |
| `reports.view`   | Read published reports and disclosure responses           |
| `reports.create` | Create / edit reports and drafts                          |
| `analytics.view` | Read analytics summaries and anomalies                    |
| `workflow.view`  | Read workflow tasks and assignment queues                 |

Pick the minimum set of scopes a client needs — keys with broad scopes are a
larger blast radius if leaked.

## Rate limits

Sensitive endpoints are rate-limited per org / per IP. When a limit is hit
the server responds `429 Too Many Requests` with a `retryAfter` field (in
seconds) and a `Retry-After` header.

| Endpoint                            | Window | Max | Key            |
| ----------------------------------- | ------ | --- | -------------- |
| `POST /auth/login`                  | 60s    | 10  | per client IP  |
| `POST /auth/register`               | 600s   | 5   | per client IP  |
| `POST /auth/sso/initiate`           | 600s   | 5   | per client IP  |
| `POST /ai/draft`                    | 60s    | 20  | per org        |
| `POST /connectors/import`           | 300s   | 10  | per org        |

The other read-only endpoints (GET) are not rate-limited at the application
layer — Vercel's platform limits still apply.

## Example: CSV import

Push a one-shot batch of activity rows through an existing connector
template. The template `id` can be obtained from
`GET /api/connectors/templates`.

```bash
curl -X POST https://demo.aeiforo.com/api/connectors/import \
  -H "Authorization: Bearer aei_REPLACE_WITH_YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "11111111-2222-3333-4444-555555555555",
    "fileName": "march-2026-electricity.csv",
    "rows": [
      {
        "facility_code": "F-ALPHA",
        "period_year": 2026,
        "period_month": 3,
        "activity_value": 285000,
        "activity_unit": "MWh"
      },
      {
        "facility_code": "F-BETA",
        "period_year": 2026,
        "period_month": 3,
        "activity_value": 200000,
        "activity_unit": "MWh"
      }
    ]
  }'
```

Successful responses include the `importId`, the total row count, and the
counts of imported vs. failed rows. Failed-row diagnostics are written to
the `connector_imports.errors` JSONB column and returned in the response.

## Health probe

`/api/health` is the only fully-public endpoint. It returns booleans for
each integration (never raw secret values) and a DB latency reading. Use it
from external uptime checks or your own admin dashboard.

```bash
curl https://demo.aeiforo.com/api/health
```

## Managing keys

Keys are managed at `Admin → API keys` in the dashboard. Required permission
is `admin.users`. The same screen exposes the revocation control — revoked
keys return `401 Invalid API key` immediately.

## Bootstrap setup endpoint

`POST /api/setup` provisions all tables and seeds reference data on a fresh
database. It is **token-gated** for safety:

- If `SETUP_TOKEN` is unset, the endpoint returns `503` and is effectively
  disabled. This is the default in production.
- If `SETUP_TOKEN` is set, callers must present the same value, either in
  the `x-setup-token` request header (preferred) or as `?token=…` in the
  query string. Bad/missing tokens return `401`.

The seed itself is idempotent (every `CREATE TABLE` is `IF NOT EXISTS` and
every reference insert is `ON CONFLICT DO NOTHING`), so re-runs by an
authenticated operator are safe — the gate is purely to prevent random
external POSTs from spinning up table-create traffic on the database.

Recommended workflow:

1. Generate a long random token (`openssl rand -hex 32`) and set it as the
   Vercel project env var `SETUP_TOKEN`.
2. Trigger setup once: `curl -X POST -H "x-setup-token: <token>" https://<host>/api/setup`.
3. Delete or rotate `SETUP_TOKEN` to keep the endpoint disabled in steady
   state.
