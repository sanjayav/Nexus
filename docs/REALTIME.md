# Realtime collaboration

Nexus uses [Liveblocks](https://liveblocks.io) to power multi-user presence in
the disclosure editor. When two users open the same framework, they see each
other's avatars in the progress bar and a small avatar overlay on whichever
cell each peer has focused.

The integration is **optional**. If `LIVEBLOCKS_SECRET_KEY` is unset the
editor still loads — it simply renders no avatars and no remote-cursor
indicators. The auth endpoint (`/api/liveblocks-auth`) returns a soft `503` so
the client falls back without surfacing any error.

## Why Liveblocks

- Generous free tier (100 MAUs, 25 simultaneous connections per room).
- Hosted infrastructure — no Redis / WebSocket gateway to operate.
- Tiny React surface (`useOthers`, `useUpdateMyPresence`) that maps cleanly
  to our cell-level presence model.

## What's broadcast

Per-user `Presence` payload (see `src/lib/liveblocks.ts`):

| Field          | Why                                                       |
| -------------- | --------------------------------------------------------- |
| `userId`       | Stable identity for avatar deduplication                  |
| `name`         | Avatar tooltip                                            |
| `email`        | Already visible to auditors via comments / audit logs     |
| `color`        | Per-user palette tint, deterministic from userId          |
| `activeCellId` | Which questionnaire cell the user is currently focused on |
| `selectionAt`  | Timestamp; allows remote viewers to fade stale focus      |

User-info (`name`, `email`, `color`) is injected server-side via the auth
endpoint — clients cannot forge the identity of another user.

## Room scoping

Rooms are **org-scoped**: `nexus:<orgId>:framework:<frameworkId>`. The auth
endpoint reads `t.org` from the caller's JWT and only allows access to
rooms matching `nexus:<orgId>:*`, so a user can never join another tenant's
room — even if they guess the room id.

## Provisioning

1. Sign up at <https://liveblocks.io> (free tier is fine for v1).
2. Create a new project. Copy the **secret** key (it starts with `sk_`).
3. Add it to Vercel:
   - **Production** + **Preview** environments
   - Variable name: `LIVEBLOCKS_SECRET_KEY`
4. Redeploy. The disclosure editor will start showing avatars within a few
   seconds of two users opening the same framework.

For local development, drop the same value into `.env.local`:

```
LIVEBLOCKS_SECRET_KEY=sk_dev_...
```

Then run `npm run dev:all` and open the editor in two browser windows logged
in as different users.

## Troubleshooting

| Symptom                                 | Likely cause                                          |
| --------------------------------------- | ----------------------------------------------------- |
| No avatars even with two users          | `LIVEBLOCKS_SECRET_KEY` unset → endpoint returns 503  |
| Avatars appear but disappear            | Client lost auth token (re-login needed)              |
| `Liveblocks auth failed (401)`          | JWT_SECRET mismatch or token expired                  |
| `Liveblocks auth failed (403)`          | User lacks `dashboard.view` permission                |

## Cost ceilings

Free tier is **100 MAUs / 25 simultaneous connections per room**. The
realistic worst case for an internal sustainability team is < 10 simultaneous
editors per framework, well under the cap. If we outgrow free, the Starter
tier ($99/mo) covers 5k MAUs and 100 simultaneous connections.
