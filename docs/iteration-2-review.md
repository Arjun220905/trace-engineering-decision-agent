# Iteration 2 review

The first iteration had useful meeting review behavior, but route state lived at `/`, profile controls did nothing, and two navigation entries opened Integrations. Setup also required environment variables and hand-written assignee JSON.

## Changed

- Stable routes for meetings, decisions, actions, integrations, workspace preferences and profile, with canonical meeting/evidence links and a legacy-link redirect.
- Password access from `app/.env`, initially `6969`, with signed cookies, server-side session revocation, expiry, password-change invalidation and bounded login attempts. No header-based sign-in bypass.
- Profile details and workspace defaults saved in D1, with revision checks to reject stale saves.
- Project filtering, persistent sort/filter URLs, meeting order choices, and action priority/owner/deadline sorting.
- Integration setup forms, Linear team/member discovery, GitHub repository/assignee discovery and visible owner mappings. Saved credentials are encrypted, redacted from API reads, and replaceable without restarting.
- Clear differences between access-checked connections and connections that are only configured. Saving never creates an issue or sends a Slack message.

## Verified

Automated checks cover the original extraction and publishing contracts plus password comparison, cookie tampering, expiry, secret/password changes, safe return paths, deterministic sorting, read-only provider discovery, route authentication, stale settings saves, cross-origin rejection, encrypted Slack configuration storage, disconnect behavior and logout revocation. Lifecycle checks start/stop/restart the real local server and rotate the password through `.env`, restoring the original file afterward.

Browser checks in Chromium cover wrong/correct passwords, return to the requested page, profile save and refresh, workspace defaults, sample visibility, sorting and project filters across reloads, Back/Forward, integration validation errors, Linear owner-dropdown behavior with explicitly mocked responses, mobile layout at 390px, and Lock workspace followed by Back. No horizontal overflow was observed on the new mobile surfaces. Screenshots are in ignored `outputs/qa/`.

The review also checked SQL bindings, authenticated data access, CSRF boundaries, credential redaction, encryption context, fixed provider hosts and the publishing ledger. GitHub repository validation was tightened in both setup and publishing after a negative test showed that `../invalid` passed the older pattern. Login attempts are claimed atomically so simultaneous failures cannot bypass the per-minute limit. A browser check also caught double-encoded meeting IDs in login return URLs. Parameters are now normalized before constructing the return path, with unit and API regressions for the encoded ID. Clear filters was updated to clear the project query as well as list state.

## Practical limits

Live provider access and delivery still require the user's real keys. Linear and GitHub discovery/transport contracts are mocked in automated checks; no claim is made that a live customer workspace has been connected. Slack configuration checks format without sending a message. AI and MeetStream keys are checked during actual use. The original recorded walkthrough predates these changes.

This is a single-password, shared-workspace app. Profile email is a contact/display setting, not identity verification. Keep `APP_SESSION_SECRET` stable; restoring encrypted credentials requires the same secret. Unknown external write outcomes continue to require manual reconciliation, preserving duplicate protection rather than automatically replaying a possibly successful request.

## Review coverage

Reviewed the route entry points and workspace layout; all changed authentication, meeting, preference and integration API handlers; the five workspace/login/settings components; authentication, navigation, sorting, preferences, integration configuration/discovery, publishing and server helpers; schema/migration changes; local startup; Vite environment bindings; and the associated tests and documentation.

| Boundary                  | Result                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| SQL/command injection     | Queries use bound values; process control checks its project and PID.                                            |
| Browser output            | React escapes user text; Slack control syntax is escaped.                                                        |
| Authentication and access | Page/API sessions required; spoofed identity headers rejected. Shared workspace scope is explicit.               |
| Cross-origin writes       | Origin checks and SameSite cookies verified.                                                                     |
| Concurrency               | Atomic delivery claims and login limits; revision checks on drafts and preferences.                              |
| Sessions and cryptography | Tampering, expiry, logout and password rotation checked; encrypted credential storage inspected.                 |
| Information exposure      | Keys redacted from responses; actual local session secret absent from build output; `.env` HTTP access rejected. |
| Resource limits           | Bounded requests, provider timeouts, user-discovery caps and login throttling.                                   |
| Workflow                  | Editable evidence-linked drafts and explicit review/publish boundaries retained.                                 |

Live provider credentials, real meeting extraction quality and real external delivery remain outside the verification evidence available in this local run.
