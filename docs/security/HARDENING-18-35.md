# Security hardening — items 18–35

This document covers the second batch of security work, following the original
17-item review in [AUDIT.md](./AUDIT.md). Every item below is implemented in the
PHP API (`server/php/`), the browser client (`src/`), or a runnable security
script (`scripts/`).

## Summary

| # | Item | Implementation | Verification |
|---|------|----------------|--------------|
| 18 | Enable RLS | `security.php` `h_rls_policy/can/filter/assert`; applied to every generic CRUD list, read, write and delete, plus `/bootstrap` | `npm run security:integration`, `npm run security:unit` |
| 19 | Test SQL injection | Real prepared statements plus strict validation of ids, emails and field names; adversarial HTTP probes | `npm run security:hack` |
| 20 | Scan hidden secrets | `scripts/scan-secrets.mjs` scans all tracked files and the full git history | `npm run security:secrets` |
| 21 | Rate limit API | Per-session/per-IP/per-account buckets, `Retry-After`, `X-RateLimit-*` headers, tighter public-write and login budgets | integration + hack scripts |
| 22 | Test user isolation | Viewer token cannot read or list another user's record; user list is row-scoped | `npm run security:integration` |
| 23 | Validate all input | `security.php` rule engine (`h_validate`, `h_validate_value`) applied to public and staff writes; unknown fields dropped | unit + integration |
| 24 | Secure all session | Hashed tokens, absolute expiry, idle expiry, rotation endpoint, revocation on logout/password change, client-side single retry | integration + hack |
| 25 | Lock storage | Hardened `.htaccess` files, no public upload directory, least-privilege DB account SQL, storage audit script | `npm run security:storage` |
| 26 | Test IDOR attack | Cross-account reads/writes and email-based booking takeover attempts | integration + hack |
| 27 | Remove secret logs | `h_redact()` + `hayata_log()` applied to exception handlers and email error logging | unit tests |
| 28 | Restrict file upload | Server-side data-URL allowlist with MIME/magic-byte/dimension checks; browser-side type, size and pixel limits | unit tests + hack |
| 29 | Block anon uploads | `h_reject_upload_fields()` on every public endpoint; public forms accept text only | integration + hack |
| 30 | Scan dependencies | `scripts/scan-dependencies.mjs` wraps `npm audit --json`, fails on high/critical | `npm run security:deps` |
| 31 | Trim API responses | Column allowlists, public menu cost/recipe removal, health trimming, permission-gated bootstrap, public booking trimming | integration + hack |
| 32 | Block tampering | Server-computed prices, signed booking payment tokens, single-use payment references, status allowlists, transaction re-checks | unit + hack |
| 33 | Secure server logic | Central validation, key normalisation, atomic transactions, permission checks, no client-controlled cancellation policy | all suites |
| 34 | Test record access | Matrix checks for self/staff/public-booking row access, privilege escalation and anonymous writes | integration + hack |
| 35 | Hack the app | `scripts/hack-the-app.mjs` runs 22 live attack cases and writes `PENTEST.md` | `npm run security:hack` |

---

## 18. Enable RLS

MySQL has no native `CREATE POLICY`, so the equivalent is enforced in the data
access layer. `server/php/security.php` defines a policy per table:

| Table | Owner column | Extra permission for another user's rows |
|---|---|---|
| `users` | `id` | `staff.view` (read), `staff.manage` (write) |
| `api_tokens` | `user_id` | `staff.manage` |
| `public_bookings` | guest email from the signed guest payload | `reservation.view` / `reservation.edit` |
| `audit_logs`, `notification_settings`, `printer_settings` | — | `dashboard.view` / `settings.manage` |
| all other tables | — | route permission only |

`h_rls_filter()` removes rows a caller may not see from list responses,
`h_rls_assert()` aborts with 403 before a single-record read/write/delete, and
every denial is written to the new `security_events` table. `/bootstrap` gates
sensitive collections by the same permissions instead of returning every table
to any signed-in account.

## 19 / 23. SQL injection and input validation

All SQL remains parameterised (`PDO::ATTR_EMULATE_PREPARES => false`). On top of
that:

* `h_validate()` validates typed rules (`email`, `date`, `datetime`, `int`,
  `number`, `bool`, `id`, `enum`, `array`, `text`, `image`) and returns only
  known fields, blocking mass assignment.
* `h_resource_input()` normalises camelCase keys to column names, drops keys
  that are not real columns, and validates identifiers, emails, money,
  quantities and dates before the generic SQL builder sees them.
* Table and column names are still checked against `information_schema` and a
  strict identifier pattern.
* Public stay requests, enquiries, newsletter signups, in-room orders, status
  changes and inventory adjustments all pass through the same validation gate.

Result: injection payloads are rejected with 422 or resolve to no row; no SQL
error text ever appears in a response.

## 20. Scan hidden secrets

`npm run security:secrets` scans every tracked file (skipping example configs
and its own pattern source) and `git log --all -p` for private keys, provider
tokens, JWTs and assignments to `HAYATA_*` secrets. It exits non-zero and
prints a redacted excerpt on a finding.

## 21. Rate limit API

Existing buckets were kept and improved:

* `hayata_rate_limit()` now returns the remaining budget and sends
  `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`.
* A throttled response still sends `Retry-After` with 429.
* Buckets are keyed by HMAC of the session token or `REMOTE_ADDR` (never a
  spoofable `X-Forwarded-For`), so raw addresses and emails are not stored.

Budgets: 240 authenticated requests/minute, 60 public reads/minute, 20 public
writes/minute, plus separate login and notification limits.

## 22 / 26 / 34. User isolation, IDOR and record access

Live tests sign in as a super admin and a viewer and check that the viewer:

* cannot read or edit `usr-001`, even by changing the id in the URL (403);
* sees only its own row in `GET /resource/users`;
* cannot create a `SUPER_ADMIN` account;
* cannot confirm or cancel another guest's booking by guessing an email;
* cannot write without a token (401).

Denials are recorded in `security_events` for monitoring.

## 24. Secure every session

* Tokens are 64 random hex characters, stored only as HMAC-SHA256 hashes.
* Migration 007 adds `last_used_at`; `h_session_touch()` refuses a session idle
  for longer than `HAYATA_SESSION_IDLE_TTL` (default 2 hours) and removes it.
  The check uses an explicit SELECT because MySQL's `rowCount()` reports
  *changed* rows and would otherwise treat a same-second touch as a failure.
* `POST /auth/refresh` rotates a token atomically; the old token dies at once.
  The browser retries a 401 once after rotating, then clears the session.
* Logout and password changes revoke sessions; the bearer token is held in
  `sessionStorage`, never `localStorage`.

## 25. Lock storage

* `server/php/.htaccess` denies every file except `api.php`, blocks dumps,
  logs, backups, keys, directory listings and the uploads folder.
* `server/php/uploads/.htaccess` denies all access and turns off PHP/CGI
  execution, so a future upload directory cannot become a webshell location.
* `server/php/sql/least-privilege.sql` creates an app account with only
  `SELECT, INSERT, UPDATE, DELETE` and explicitly revokes `CREATE`, `DROP`,
  `ALTER`, `FILE`, `GRANT OPTION`, etc.
* `npm run security:storage` audits that all of these rules are present.

## 27. Remove secret logs

`h_redact()` strips bearer tokens, credential key/value pairs, provider tokens
and long high-entropy blobs. `hayata_log()` is the only logging entry point in
the API's exception and shutdown handlers, and `mailer.php` redacts SMTP
exceptions before returning or storing them in `email_log`.

## 28 / 29. Upload restrictions and anonymous uploads

* Client: `src/lib/image-upload.ts` accepts only JPEG/PNG/WebP, caps the source
  file at 12 MB and 20 megapixels, and re-encodes oversized pictures.
* Server: `h_image_data_url()` requires a matching declared MIME, real bytes
  (`finfo`), a readable image (`getimagesizefromstring`), sane dimensions and
  no script/SVG payload. Galleries are capped at eight pictures.
* `h_reject_upload_fields()` refuses image/file keys or data URLs on all public
  endpoints, so an anonymous caller cannot smuggle a picture into an enquiry,
  booking, newsletter signup or in-room order.

## 30. Scan dependencies

`npm run security:deps` runs `npm audit --json`, prints severity counts, and
fails on any high or critical finding. Current run: **0 vulnerabilities**.

## 31. Trim API responses

* `/health` returns only `ok` and `time` (environment only in debug mode).
* `/public/menu` removes `cost` and `recipe`; `/public/bookings/:ref` removes
  the internal `staffReservationId`.
* Column allowlists strip password hashes, role ids, token hashes and
  notification secrets from staff responses, including the bootstrap bundle.
* `/printer-settings` now requires `settings.manage` for reads as well as
  writes, and accepts only known setting keys.

## 32 / 33. Tampering and server logic

* Room-service lines are re-priced from `menu_items`; the client's price and
  name are discarded. Booking totals, discounts and taxes are recomputed on
  the server, and the stay is written in a transaction with availability
  re-checked inside it.
* Cancellation hours come from the room type on the server, not from a query
  parameter.
* Booking confirmation requires an HMAC token bound to reference, total and
  guest email; a payment reference can be claimed only once.
* Status changes are restricted to explicit allowlists per workflow, and
  inventory adjustments and identifiers are validated.

## 35. Hack the app

`npm run security:hack` performs 22 live attacks and writes
[PENTEST.md](./PENTEST.md). The latest run passed all 22 checks.

---

## Commands and results (local run, 28 Nov 2026)

```powershell
npm run build                         # pass
npm run lint                          # pass (pre-existing warnings only)
npm test                              # 34 tests passed
npm run security:secrets              # no secrets in 220 tracked files + history
npm run security:deps                 # 0 vulnerabilities
npm run security:storage              # all lock rules present
npm run security:unit                 # 39 passed, 0 failed
npm run security:integration          # 24 passed, 0 failed (live API)
npm run security:hack                 # 22 passed, 0 failed (live API)
& 'C:\xampp\php\php.exe' server\php\migrate.php   # 007 applied
```

The PHP files must be copied to the folder Apache serves (`hayata-api`) before
the integration and hack suites are run; that copy is a deployment step, not a
repository change.

## Accepted risks

* The demo accounts still share `demo123`. Change every seeded password before
  production use.
* The bearer token remains in `sessionStorage` rather than an HttpOnly cookie;
  rotation, idle expiry and the CSP reduce the impact of a captured token.
* An online booking can still be viewed by reference alone (the confirmation
  page has no email prompt). It is rate limited and reveals no staff ids;
  payment and cancellation require signed/email proof.
* MySQL has no row-level security engine; the policies above are enforced in
  the only code path that reaches the database. Do not grant the app account
  direct database access to any other client.
