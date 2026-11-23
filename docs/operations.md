# Deployment and operations

## Sites

The reference runs as a Cloudflare Worker with a `DB` D1 binding, declared in `.openai/hosting.json`. The build entry point is `npm run build`, producing `dist/server/index.js` and its assets. Sites publishing provisions D1 and applies the committed Drizzle migration. Configure production secrets in Sites; local `.env` and `.dev.vars` files are intentionally ignored.

## Access and hosting

Development stays on localhost. Publishing is a separate step that requires the user's explicit request. Build and test commands do not publish.

The application requires `APP_PASSWORD` for initial local setup and `APP_SESSION_SECRET` for session signing and integration encryption. Keep the session secret stable to preserve saved credentials. Creating the first named admin ends password-only access to the original workspace. You can then remove `APP_PASSWORD` from `.env` and restart Trace. Hosted bootstrap requires HTTPS and an application password of at least 20 characters.

Named accounts use salted PBKDF2 password hashes and revocable seven-day HTTP-only sessions. Membership is checked on every request. An admin can create a workspace with an initial admin, add members, and revoke accounts. Reviewers can edit drafts, approve outputs, and publish. Editors can import and edit drafts. Viewers can read. Admins manage credentials, workspace settings, and audit history. Environment integration settings apply only to the original local workspace.

The audit log records sign-in, sign-out, account changes, imports, review changes, settings, and delivery outcomes. Workspace settings show the latest 100 events. Audit history begins when the migration is applied.

## Signed webhook delivery

The server operator sets `TRACE_WEBHOOK_ENDPOINTS` to a JSON object mapping workspace IDs to arrays of exact trusted HTTPS endpoints. Treat these as trusted servers and check where the hostname resolves. In Integrations, configure Signed webhook with an allowed URL and a shared secret of at least 32 characters. The app encrypts the signing secret and sends approved outputs only when a reviewer selects this destination. Redirect responses fail delivery.

Verify `X-Trace-Signature` before parsing the request body. `verifyWebhook` in `lib/webhook.ts` checks HMAC-SHA256 over `deliveryId.timestamp.rawBody`, rejects invalid signatures, and enforces a five-minute time window. The delivery ID and timestamp are in `X-Trace-Delivery` and `X-Trace-Timestamp`. Atomically record each verified delivery ID with the receiver’s processing intent and retain it through the signed timestamp plus five minutes. The event type is `meeting.reviewed`. The approved discussion drafts are in the `discussions` array. Existing receivers that read the old field name should switch to `discussions`. A successful response is any 2xx status.

## Schema updates

Edit `db/schema.ts`, run `npm run db:generate`, inspect the generated migration, and commit both SQL and metadata. Applied migrations are append-only. The portable local startup applies the migration journal to `.wrangler/state`. Never ship user data in migrations.

## Uncertain deliveries

Each publish request attempts up to four new deliveries. Publish again to continue larger plans. Each claim checks the live session, workspace role, meeting revision, and current integration settings before the provider write. A provider request already dispatched can still finish after access is revoked. Provider timeouts, errors, or a Worker interruption can leave a delivery uncertain or pending. The app never retries those claims automatically, including when Publish is clicked again.

1. Open the meeting’s **Activity** tab. On an unconfirmed Linear or GitHub delivery, select **Check Linear** or **Check GitHub**.
2. Trace links a matching issue automatically. Open it to verify its assignee. Linear also checks the issue ID assigned by Trace. GitHub checks open and closed issues in the original repository for the exact delivery marker.
3. If a complete check finds no match, verify the issue is absent in the destination and select **Retry issue**. Trace waits at least 90 seconds after the last attempt and checks again immediately before sending. The existing delivery claim stays in place. A GitHub issue that moved or lost its marker may require manual verification.
4. For older claims with no recorded destination, Trace can link a matching issue but keeps retries off. Jira, Trello, Slack, Notion, and webhook deliveries require manual inspection. A database operator can mark a confirmed delivery as sent after verifying the workspace, original claim, and real URL.

Keep the delivery claim throughout recovery. Editing a draft after publication does not update the external issue.

## Data and deletion

Meetings and transcripts live in D1, with no media files. Local data is in `.wrangler/state`. The reference has no end-user meeting deletion UI. Operators can delete an owner’s stored records under their data-retention process, but must consider the delivery ledger: deleting ledger history and re-importing the same transcript can permit duplicate external tasks. Retain a minimal delivery tombstone when implementing production retention.

Admins provision accounts directly. Integration credentials are encrypted in D1, and meeting content relies on the host’s storage facilities.

## HTTPS and cache isolation

Set `TRACE_PUBLIC_ORIGIN` to the exact canonical HTTPS origin without a trailing slash. The Worker rejects other origins before handling app requests and adds HSTS on the configured HTTPS origin. Login and logout set Secure cookies on HTTPS. Dynamic responses, including workspace HTML, API failures, and redirects, explicitly disallow browser and CDN storage. Keep edge cache overrides off these routes and verify ingress policy in the environment that will serve traffic. The hashed asset policy is independent.

## Database backup and recovery

For **local D1**, stop the source Worker and take a private snapshot of the complete persistence directory. Preserve its layout, including SQLite journals and runtime metadata. Restore to a separate directory and check SQLite integrity and application records before repointing the Worker. Keep the snapshot and `APP_SESSION_SECRET` in separate protected storage. The secret is required to decrypt integration settings.

1. Before starting the restored Worker, clear `sessions` and `login_limits` in the destination only. Reapply member removals and credential revocations made after the snapshot.
2. Start the restored instance with `TRACE_PAUSE_PUBLISHING=1` and hold it out of user traffic.
3. Verify fresh logins, workspace isolation, transcript evidence, integration configuration, audit history, and the delivery ledger.
4. Reconcile downstream writes made after the snapshot and restore their delivery claims before clearing the publishing pause. Preserve pending and uncertain claims until they can be reconciled.
5. For hosted D1, verify Cloudflare Time Travel and the same recovery checks on a disposable database before relying on them for production recovery.

The Worker regression uses dummy data and snapshots an isolated persistence directory. To exercise its HTTPS branch, provide a disposable certificate with both the `127.0.0.1` IP and `localhost` DNS names and its key named `tls-cert.pem` and `tls-key.pem` in `TRACE_TEST_TLS_DIR`. Set `NODE_EXTRA_CA_CERTS` to the certificate path before launching Node. The TLS fixture listens on `127.0.0.1:18443`.
