# EU / APAC Data Residency

The platform supports per-tenant data residency by routing each org's DB
calls to a region-scoped Neon project. This is a **scaffold** — the code
hooks are in place; ops still has to provision the EU / APAC Neon
projects and migrate org data on cutover.

## Environment variables

Set in Vercel project settings (Production + Preview):

| Variable             | Required | Purpose                                                     |
| -------------------- | -------- | ----------------------------------------------------------- |
| `DATABASE_URL`       | yes      | Default ("us") Neon connection string.                      |
| `DATABASE_URL_EU`    | optional | Neon project hosted in `eu-central` (Frankfurt) for GDPR.   |
| `DATABASE_URL_APAC`  | optional | Neon project hosted in `ap-southeast` (Singapore).          |

If `DATABASE_URL_EU` is unset and an EU-scoped org logs in, the API will
**fall back to `DATABASE_URL` with a console warning**, so the platform
keeps working in non-production environments before ops provisions the
EU project.

## How it works

- `organisations.region` (TEXT, `'us'|'eu'|'apac'`, default `'us'`)
  records the tenant's data-residency choice — see `api/setup.ts`.
- `api/auth/register.ts` accepts an optional `region` field on the
  signup request and stamps the new org row with it.
- `api/auth/login.ts` reads `organisations.region` and embeds it in the
  JWT as `org_region`.
- `api/_auth.ts` exposes `getDbForToken(token)` — call this from any
  route handler that needs region-correct DB access.
- `api/_db.ts` `getDb(region)` selects the right connection. Existing
  callers using `getDb()` with no argument continue to hit
  `DATABASE_URL` exactly as before — no behaviour change.

## Cutover for an existing org

Flipping `organisations.region` from `'us'` to `'eu'` is **not** enough
on its own. The org's row tree (org_entities, org_members,
question_assignments, data_value, evidence, audit_event, notifications,
report_artifacts, etc.) lives in the source region's DB and must be
physically migrated. Steps:

1. Provision `DATABASE_URL_EU` (Neon EU project).
2. Run schema bootstrap (`POST /api/setup` against the EU URL).
3. Export the org's row tree from the source DB
   (`pg_dump --data-only --table=... WHERE org_id = '<uuid>'`).
4. Load into the EU DB.
5. Flip `organisations.region` and have the user re-login to mint a
   token with the new `org_region`.
6. Soft-delete (or hard-delete after retention) the source rows.

Aim to script step 3-5 for repeatability; the rest is operational.

## Auditing

Until full migration tooling lands, keep the cutover audit-trailed in
the workflow log so a regulator can show "data left US on YYYY-MM-DD
hh:mm UTC".
