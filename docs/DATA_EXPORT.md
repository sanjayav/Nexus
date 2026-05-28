# GDPR Data Export

Tenant admins can self-serve a full data export under GDPR Art. 20 (right of
data portability) via **Settings → Data export (GDPR) → Download data export**.

Server endpoint: `GET /api/admin/export` — gated `admin.org`.

## Format

A zip archive named `export_<org-slug>_<iso-timestamp>.zip` containing JSON
files at the archive root.

```
export_<org-slug>_<timestamp>.zip
├── manifest.json
├── users.json
├── facilities.json
├── activity_data.json
├── question_assignments.json
├── data_values.json
├── workflow_tasks.json
├── audit_log.json
├── notifications.json
├── reports.json
├── emission_factors_used.json
└── disclosures.json
```

### `manifest.json`

```json
{
  "org": { "id": "...", "name": "...", "slug": "...", "industry": "...", "country": "...", "region": "us", "created_at": "..." },
  "generated_at": "2026-05-29T10:00:00.000Z",
  "schema_version": "2026-05-export-v1",
  "row_cap_per_table": 100000,
  "notes": "Excludes password_hash, MFA secrets, SCIM token hashes, API key hashes. See docs/DATA_EXPORT.md."
}
```

### Per-table contents

| File | Source table | Notes |
|---|---|---|
| `users.json` | `users ⨝ user_roles ⨝ roles` | Strips `password_hash`. No MFA secrets. |
| `facilities.json` | `facilities` | All rows for the org. |
| `activity_data.json` | `activity_data` | Inc. calculator provenance (`source_calculator_id` / `source_method_id`). |
| `question_assignments.json` | `question_assignments` | All assignments for the org. |
| `data_values.json` | `data_value` | The numeric/narrative responses. |
| `workflow_tasks.json` | `workflow_tasks` | Review/approval queue. |
| `audit_log.json` | `audit_log` | Tamper-resistant event log. |
| `notifications.json` | `notifications` | Recipient + body, no email-error PII. |
| `reports.json` | `report_artifacts` | Metadata only — **PDF bytes are not included** (download separately via `/api/org?view=report-pdf`). |
| `emission_factors_used.json` | `emission_factors` | Only EFs referenced by the org's `activity_data.fuel_type`. |
| `disclosures.json` | `data_value ⨝ questionnaire_item` | Convenient join for re-ingest into another system. |

## What is NEVER exported

- `users.password_hash`
- `user_mfa.totp_secret` / recovery codes
- `scim_tokens.token_hash`
- `api_keys.key_hash`
- Any session tokens / JWTs
- Bcrypt salts

These are stripped at the SQL projection level so they can never leak via the
archive — even if the schema gains a new password column later, the export
endpoint's `SELECT` list is allow-listed.

## Limits

- **Row cap per table: 100 000.** v1 export is a single sync zip. Production
  workspaces over the cap should request a paginated/streamed export through
  support — see the `row_cap_per_table` field in `manifest.json`.
- The zip is streamed (`archiver` library) — the full payload is never held in
  RAM. Bandwidth is the practical bottleneck.
- Cold-start of the export endpoint typically completes in <5 s for a
  10-facility tenant.

## Importing into another system

The files are plain JSON — each is an array of row objects matching the source
column shape. To re-ingest into an Aeiforo-compatible target, replay them in
this order:

1. `facilities.json` (parent of activity data)
2. `users.json` then `question_assignments.json`
3. `data_values.json`, `activity_data.json`, `workflow_tasks.json`
4. `reports.json`, `audit_log.json`, `notifications.json` (audit trail)

UUIDs are preserved so cross-table references remain valid.

## Audit trail

Every successful export hits the workspace audit log via the existing
`audit_log` table. Re-downloads do not move/delete data — they're idempotent.
