# Trace · Engineering Discussion Agent

Trace turns engineering meetings into discussions, action items, and open questions. Review each draft against its timestamp, then export an ADR or publish approved work to your team’s tools.

[Quickstart for everyone](quickstart.md) · [Connect your tools](docs/integrations.md) · [Operations](docs/operations.md)

## Start here

1. Install Git and Node.js **22.13 or newer** (Node 24 recommended). npm comes with Node.js.
2. Open a terminal and run:

   ```sh
   git clone https://github.com/Arjun220905/trace-engineering-decision-agent.git
   cd trace-engineering-decision-agent
   npm ci
   npm start
   ```

   If you already downloaded the project, open a terminal in the folder containing this README and start with `npm ci`. If you are in the parent development workspace with the repository under `app/`, use `npm --prefix app ci` and then `npm start` from the parent.

3. Open [Trace on localhost](http://localhost:5173). For fresh setup, leave the workspace ID at `local_seedy`, leave **Username** blank, and enter the default setup password `6969`.
4. In **Workspace settings → Add access**, create a **Workspace member** with the **Admin** role and a password of at least 12 characters. Sign in with that username and password from then on. The setup password stops working once the first admin exists.
5. Open **Meetings → Import transcript** to paste or upload a transcript. The [quickstart](quickstart.md) has an example and shows how to review your first meeting.

Stop Trace with **Ctrl+C** in the original terminal. On macOS or Linux, you can also run `npm stop` in a second terminal in the same folder. If port 5173 is busy, stop the other app using it before retrying.

The first start creates an ignored `.env` with a random session secret and applies database migrations. Local data stays in `.wrangler/state` between restarts. You can import, review, and export without a cloud account or API key. Keep `APP_SESSION_SECRET` stable while using the same database because it also protects saved integration credentials.

## Connect a tool when you need it

Connect **MeetStream** for meeting bots, transcript imports by ID, and audio playback when the recording is available. Connect **Linear, GitHub, Jira Cloud, or Trello** to publish action items. **Notion** receives ADRs, **Slack** receives meeting summaries, and an operator can allow a **signed webhook** destination.

Trace uses built-in extraction rules by default. Connecting Claude adds an opt-in extraction mode that sends the selected transcript to Anthropic. Publishing to a connected tool also sends the selected content outside localhost. See [connection setup and what each tool receives](docs/integrations.md).

## Architecture

`Transcript → timestamped turns → drafts → review → export or publish`

| Where | What belongs there |
| --- | --- |
| [Workspace routes](app/workspace) and [workspace shell](components/trace-workspace.tsx) | Navigation, workspace data, permissions, and updates shared between screens. |
| [Meeting list](components/workspace/meeting-list.tsx) and [draft collections](components/workspace/draft-collection.tsx) | Search, filters, sorting, and links to individual meetings. |
| [Meeting review](components/workspace/meeting-detail.tsx), [recording playback](components/workspace/meeting-recording.tsx), and [draft forms](components/workspace/draft-dialogs.tsx) | Transcript evidence, corrections, and editing. |
| [Import dialog](components/workspace/import-meeting-dialog.tsx) and [meeting import API](app/api/meetings/route.ts) | Upload, MeetStream bot controls, transcript processing, and duplicate import handling. |
| [Publish dialog](components/workspace/publish-dialog.tsx), [publish API](app/api/publish/route.ts), and [recovery API](app/api/publish/recover/route.ts) | Approval controls, delivery history, and retries. |
| [`lib/types.ts`](lib/types.ts), [`lib/extract.ts`](lib/extract.ts), [`lib/review-corrections.ts`](lib/review-corrections.ts) | Shared meeting schema, extraction, and transcript-backed draft corrections. |
| [`lib/meetstream/`](lib/meetstream) | MeetStream bot lifecycle, transcript imports, and recording access. Bot requests enter through [the bot API](app/api/meetstream/bots/route.ts). |
| [`lib/integration-service.ts`](lib/integration-service.ts), [`lib/publish.ts`](lib/publish.ts), [`lib/issue-recovery.ts`](lib/issue-recovery.ts) | Workspace connections, outbound delivery, and Linear/GitHub reconciliation. |
| [`lib/server.ts`](lib/server.ts), [`lib/access.ts`](lib/access.ts), [`db/`](db), [`drizzle/`](drizzle) | Sessions, permissions, database access, schema, and migrations. |
| [`worker/index.ts`](worker/index.ts), [`scripts/run-framework.mjs`](scripts/run-framework.mjs) | Worker entry point and local startup. The local runtime emulates the Worker and D1 database. |

React renders the workspace, Vinext runs the routes, and Cloudflare D1 stores meeting data and delivery history. Drizzle defines the schema and migration files. Workspace permissions are checked on the server. Admins manage users and connections. Reviewers can approve and publish. Editors can import and edit drafts. Viewers can read.

Source evidence is preserved by transcript turn ID. The workspace list loads draft summaries and timestamp labels. Trace fetches the full transcript for an opened meeting or a selected draft that needs its source context. Revisions reject stale edits. The publishing ledger claims each meeting, output, and destination combination before sending it. Repeating a successful publish skips existing claims. After a timeout, check **Activity** before another send. Editing a draft after publication stays in Trace. Update the external record directly if you need it changed. [Delivery and backup details](docs/operations.md)

## Developer checks

Run these commands from the cloned repository.

```sh
npm run typecheck
npm test
npm run test:worker
```

Run `npm run test:api` against a disposable local instance on port 5173. Run `npm run test:local` in a disposable checkout with an existing `.env` and port 5173 free. See [the iteration review](docs/iteration-2-review.md) for previous coverage and remaining live-service checks.

## References and license

The workflow was informed by MeetStream’s [Companion](https://github.com/meetstream-ai/companion), [TypeScript SDK](https://github.com/meetstream-ai/meetstream-node), and [Labs](https://github.com/meetstream-ai/labs).

Application code is [MIT licensed](LICENSE). DM Sans is distributed under the [SIL Open Font License](public/fonts/OFL.txt).
