# Live ERP / SaaS connectors

Nexus ships ten first-class adapters for the highest-impact ESG data
sources. Each is one file under `api/_connectors/providers/` and is
registered in `api/_connectors/registry.ts`. The framework is designed
so that adding the 11th provider is a self-contained PR: one new file,
one line in the registry, one entry in the env-var doc.

## Architecture

```
api/_connectors/
  index.ts        — shared types (ConnectorDefinition, SyncRow, …)
  registry.ts     — exports CONNECTORS record + getConnector(id)
  providers/
    sapS4hana.ts
    oracleFusion.ts
    netsuite.ts
    workday.ts
    salesforce.ts
    snowflake.ts
    aws.ts
    gcp.ts
    azure.ts
    genericRest.ts

api/connectors/
  oauth/
    start.ts                 POST → returns authorize URL
    callback/[provider].ts   GET  → exchanges code → upserts connection
  sync.ts                    POST → triggers a live sync
  connections.ts             GET  → list connections + adapter catalogue
  connections/[id].ts        GET  → one connection + 20 sync runs
                             DEL  → soft-disconnect (clears tokens)
  templates.ts               GET  → CSV templates (unchanged)
  import.ts                  POST → CSV ingestion path (unchanged)
  imports.ts                 GET  → CSV import history (unchanged)
```

Tokens are encrypted at rest via `api/_crypto.ts` (AES-256-GCM, key
derived from `MFA_ENC_KEY` or `JWT_SECRET`). The encrypted columns are
never returned by the listing endpoints; they're only decrypted inside
`POST /api/connectors/sync` and held in memory for the duration of the
adapter call.

## Per-provider setup

Each provider's customer needs to register Nexus as an OAuth app (or
provision an API key) on their side. The redirect URI to register is
always:

```
${APP_BASE_URL}/api/connectors/oauth/callback/<provider_id>
```

| Provider | Provider id | Env vars (Nexus side) | Scopes / permissions |
|---|---|---|---|
| SAP S/4HANA Cloud | `sap_s4hana` | `SAP_OAUTH_CLIENT_ID`, `SAP_OAUTH_CLIENT_SECRET` | `API_BILLING_DOCUMENT_SRV_0001` |
| Oracle Fusion ERP | `oracle_fusion` | `ORACLE_OAUTH_CLIENT_ID`, `ORACLE_OAUTH_CLIENT_SECRET` | `urn:opc:resource:consumer::all` |
| NetSuite | `netsuite` | _none_ (per-customer TBA creds) | SuiteQL access on `transaction`, `expenseCategory` |
| Workday | `workday` | `WORKDAY_OAUTH_CLIENT_ID`, `WORKDAY_OAUTH_CLIENT_SECRET` | `Staffing` (WQL access to `allWorkers`) |
| Salesforce | `salesforce` | `SALESFORCE_OAUTH_CLIENT_ID`, `SALESFORCE_OAUTH_CLIENT_SECRET` | `api`, `refresh_token`, `offline_access` |
| Snowflake | `snowflake` | _none_ (per-customer key-pair JWT) | warehouse + db + schema specified per-connection |
| AWS Cost Explorer | `aws` | _none_ (per-customer IAM key) | `ce:GetCostAndUsage` |
| Google Cloud Billing | `gcp` | `GCP_OAUTH_CLIENT_ID`, `GCP_OAUTH_CLIENT_SECRET` | `cloud-billing.readonly`, `bigquery.readonly` |
| Microsoft Azure / M365 | `azure` | `AZURE_OAUTH_CLIENT_ID`, `AZURE_OAUTH_CLIENT_SECRET`, `AZURE_TENANT_ID` | `https://management.azure.com/user_impersonation`, `offline_access` |
| Generic REST | `generic_rest` | _none_ (customer supplies endpoint + auth header) | n/a |

### Snowflake — key-pair setup

```bash
openssl genrsa -out rsa_key.pem 2048
openssl rsa -in rsa_key.pem -pubout -out rsa_key.pub
```

Register the public key on the Snowflake user:

```sql
ALTER USER my_user SET RSA_PUBLIC_KEY = 'MIIBIjAN...';
```

Then in Nexus paste the PEM private key, account locator, warehouse,
database, schema, and a SQL template that produces:

```
period_year, period_month, scope, category, facility_code, activity_value, activity_unit
```

Date placeholders `:from_date` and `:to_date` are bound at sync time.

### AWS Cost Explorer — IAM policy

Minimal IAM policy attached to the access key:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ce:GetCostAndUsage"],
    "Resource": "*"
  }]
}
```

### Generic REST — field map

The customer supplies a JSON field map like:

```json
{
  "periodYear": "year",
  "periodMonth": "month",
  "scope": "scope",
  "category": "category",
  "facilityCode": "site",
  "activityValue": "kwh",
  "activityUnit": "unit"
}
```

…and a JSON pointer (e.g. `data.rows`) telling Nexus where the array
lives inside the response payload.

## Idempotency

Sync rows are upserted into `activity_data` with a synthesized notes
suffix of `[src=<provider>:<rowId>]`. Combined with the existing
unique constraints on `activity_data`, re-running a sync over the same
window does not duplicate rows.

## Failure modes

Every adapter is required to return `{ rows: [], result: { errors } }`
rather than throw on a partial-failure shape (bad row in an otherwise
good response). Hard failures (HTTP 401/403/network outage) throw —
the sync endpoint catches and records them on the `connector_sync_runs`
row + the connection's `last_sync_error` column.

When server-side env vars are missing the start endpoint returns
**503 with a clear "X / Y not configured" body** — never crashes.
