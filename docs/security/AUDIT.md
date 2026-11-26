# Hayata Hotel & Suite — Security Audit

**Scope:** the React + TypeScript front end (`src/`), the PHP API (`server/php/`),
the Apache deployment rules, the MySQL schema and the npm dependency tree.

**Status:** all 17 requested items reviewed and implemented. Verification
commands and their results are listed at the end of this document.

---

## Data-integrity fixes found during the audit

These were not in the original list of 17, but they were uncovered while
verifying the features and each of them broke a real user-facing flow. They
were fixed at the data layer, so every client path benefits.

| # | Problem | Root cause | Fix |
|---|---------|-----------|-----|
| A | A query string never reached the server (`/audit-logs?limit=5` was read as one route name) | `apiUrl()` URL-encoded the whole route, including the query string | `src/lib/api-client.ts` encodes only the path and appends the query string as real parameters |
| B | Every write from the browser that carried a timestamp failed with `Invalid datetime format` | Browsers send ISO-8601 (`2026-11-26T03:01:26.425Z`); MySQL `DATETIME` only accepts `2026-11-26 03:01:26` | `h_datetime_value()` in `server/php/api.php` converts the value to the format the column expects, using the column type from `information_schema` |
| C | PHP and MySQL read different clocks | PHP used the server default (`Europe/Berlin`), MySQL used the system zone (`Africa/Lagos`); they diverge twice a year | `HAYATA_APP_TIMEZONE` (default `Africa/Lagos`) is applied to PHP and to the MySQL session, so `NOW()` and every written timestamp describe the same moment |
| D | A ticket could reach the kitchen without its items | The order and its lines were written by two separate requests, so the lines could fail on the foreign key while the order stayed behind | `h_insert_order_with_lines()` writes the order and its lines in one transaction; the client posts them together in one request |
| E | Deleting an order failed with a foreign-key error | `order_items.order_id` references `orders.id` and the lines were not removed first | The delete removes the lines and the order in one transaction |
| F | A repeated order failed on a duplicate key | The line identifier is a primary key for the whole table | A repeat of the same order replaces its lines instead of failing, and a line name that already belongs to another order is given a name of its own |
| G | A limit could hide the newest rows | The list endpoint ordered by the first column, so `LIMIT 100` was not "the last 100" | `h_list_order()` returns the newest rows first for every table that records when a row was written |
| H | A server fault was reported to the browser as "Failed to fetch" | A PHP fatal ended the response halfway through, with no body and no status | A global exception and shutdown handler answers with a JSON `SERVER_ERROR` and writes the details to the error log |

---

## Summary

| # | Item | Status | Where |
|---|------|--------|-------|
| 1 | Hide API keys | Done | `server/php/config.php`, `server/php/config.local.example.php`, `.gitignore`, `src/lib/api-client.ts` |
| 2 | Protect admin routes | Done | `src/app/staff-routes.tsx`, `src/components/auth-route.tsx`, `server/php/api.php` |
| 3 | Users access own data | Done | `server/php/api.php` (resource CRUD), `h_public_user()` |
| 4 | Block XSS | Done | `server/php/db.php` (`hayata_clean_text`), no `innerHTML`/`eval` in `src/` |
| 5 | Check CORS settings | Done | `server/php/db.php` (`hayata_apply_cors`) |
| 6 | Disable debug mode | Done | `server/php/config.php`, `server/php/.htaccess` |
| 7 | Remove unused packages | Done | `package.json` |
| 8 | Secure database | Done | `server/php/db.php` (`hayata_pdo`) |
| 9 | Secrets in git history | Done | scanned, clean — see [§9](#9-secrets-in-git-history) |
| 10 | Check env variables | Done | `server/php/config.php`, `.env.example` |
| 11 | Proper authentication | Done | `server/php/api.php`, `src/store/authStore.ts`, `src/lib/auth-api.ts` |
| 12 | Sanitize forms | Done | `server/php/db.php` (`hayata_sanitize`, `hayata_clean_text`) |
| 13 | Rate limiting | Done | `server/php/db.php` (`hayata_rate_limit`) |
| 14 | Update dependencies | Done | `package.json`, `package-lock.json` |
| 15 | Check exposed files | Done | `server/php/.htaccess`, `server/.htaccess` |
| 16 | Hash passwords | Done | `server/php/setup.php`, `server/php/api.php` |
| 17 | Full security audit | Done | this document |

---

## 1. Hide API keys

**Before.** Database credentials and the token-signing secret were written in
plain text in a committed PHP file, and the browser held its bearer token in
`localStorage` where any injected script could read it.

**Now.**

* Server secrets are never committed. `server/php/config.php` reads every
  value from the process environment. The only file-based fallback is
  `server/php/config.local.php`, which is listed in `.gitignore` and is
  therefore untracked. `server/php/config.local.example.php` documents the
  keys with empty values.
* The browser only ever receives `VITE_API_BASE_URL` and `VITE_USE_SERVER`
  from `.env.example`. These are not secrets: the first is the address of the
  API and the second is a feature flag. No credential is exposed to the bundle.
* The bearer token is kept in `sessionStorage`, not `localStorage`, so it is
  dropped when the browser session ends. A token written by an earlier
  version is moved across once on first read (`src/lib/api-client.ts`).
* The SMTP password is never sent to the browser. `GET /notifications/settings`
  returns `hasPassword: true|false` instead of the value, and the stored
  secret is only ever read on the server.

**Verification.** `GET /notifications/settings` → `{"hasPassword":false,…}` with
no `password` key. `git check-ignore server/php/config.local.php` → matched.

## 2. Protect admin routes

* Every staff screen sits behind `RequireAuth` and a `PermissionRoute`
  (`src/app/staff-routes.tsx`). Unauthenticated users are redirected to the
  login screen; a user without the permission gets the "not authorised"
  screen instead of the page.
* The browser guard is convenience only. **The server is the authority**: each
  API route calls `hayata_require_user()` or `hayata_require_permission()`
  before touching data, so editing a URL in the address bar gains nothing.
* `/notifications/settings` (GET and PUT), `/notifications/test` and
  `/notifications/log` require `settings.manage`.
* Writes to `orders`, `order_items` and `menu_items` require the outlet
  permission (`restaurant.orders`, `restaurant.menu`) rather than the
  administrator-only `settings.manage`.
* The signed-in session is confirmed against the server: a token the server
  refuses produces a 401, which clears the token and ends the browser session
  (`src/lib/api-client.ts` → `hayata:session-expired`).

## 3. Users access own data

`GET /resource/users/:id` is readable by the owner or by a holder of
`staff.view`. `PUT /resource/users/:id` is restricted to the owner, and a
non-owner needs `staff.manage`; an owner can never change their own role or
password through this route (that is what `/auth/password` is for).
`DELETE /resource/users/:id` refuses to delete the caller's own account.

Every user response passes through `h_public_user()`, which removes
`password_hash` and `role_id` — including from the list endpoint.

## 4. Block XSS

* No `dangerouslySetInnerHTML`, `innerHTML`, `eval` or `new Function` exists
  anywhere in `src/`. React escapes all interpolated text.
* The API strips HTML from every free-text field that a guest can fill in
  (enquiries, booking guest details) with `hayata_clean_text()`.
* All input is stripped of null bytes and control characters by
  `hayata_sanitize()`, which blocks null-byte and header/log injection.
* The API always answers `Content-Type: application/json`, so a response can
  never be coaxed into being rendered as a page.
* The security headers include `Content-Security-Policy: default-src 'none';
  frame-ancestors 'none'; base-uri 'none'` and `X-Content-Type-Options:
  nosniff`.

## 5. CORS settings

`hayata_apply_cors()` reads an explicit allowlist (`HAYATA_CORS_ORIGINS`).
There is no wildcard and no origin reflection:

* An origin on the list is echoed back with `Access-Control-Allow-Credentials: true`.
* Any other origin receives **no** `Access-Control-Allow-Origin` header.
* `Vary: Origin` is always sent, so a cache cannot serve one origin's
  response to another.
* Preflight (`OPTIONS`) returns `204` with the policy and nothing else.

## 6. Debug mode

* `HAYATA_DEBUG` defaults to `false`. When it is off, `display_errors` is
  `0`, `log_errors` is `1` and errors go to the PHP error log instead of the
  response body.
* `server/php/.htaccess` sets `php_flag display_errors off`,
  `php_flag log_errors on` and `php_flag expose_php off`.
* The `X-Powered-By` header is removed by both `.htaccess` files.
* The API never returns a stack trace; failures answer with a short error code
  such as `CONFIG_ERROR` or `VALIDATION`.

## 7. Remove unused packages

Every direct dependency was checked against real import statements in
`src/`, `scripts/`, the test files and the build configuration.

**Removed:** `@radix-ui/react-popover` and `@radix-ui/react-scroll-area` — no
source imported either of them. (Popover stays installed transitively because
`@puckeditor/core` depends on it.)

**Verified as genuinely used and therefore kept:** `@hookform/resolvers`,
`react-hook-form`, `zod`, `msw`, `xlsx`, `@tanstack/react-query`,
`@tanstack/react-table`, `decimal.js` and `jspdf`. All nine are imported by
application, mock or test code, so removing them would break the build.

## 8. Secure database

`hayata_pdo()` opens the connection with:

| Setting | Value | Why |
|---|---|---|
| `PDO::ATTR_ERRMODE` | `PDO::ERRMODE_EXCEPTION` | errors are never swallowed |
| `PDO::ATTR_EMULATE_PREPARES` | `false` | real prepared statements, so input is never interpolated into SQL |
| `PDO::ATTR_DEFAULT_FETCH_MODE` | `PDO::FETCH_ASSOC` | predictable result shape |
| `PDO::ATTR_STRINGIFY_FETCHES` | `false` | numbers stay numbers |
| `Pdo\Mysql::ATTR_MULTI_STATEMENTS` | `false` | stacked queries are refused |
| session `sql_mode` | `STRICT_TRANS_TABLES, …` | silent truncation and invalid dates are errors, not warnings |

Table and column names used in the generic CRUD are validated against
`SHOW COLUMNS` (`h_table_columns`) and against a strict identifier pattern
(`h_unsafe_sql_columns`), so a request body can never inject SQL through a
field name.

**Production recommendation.** Use a dedicated least-privilege database user
instead of `root`: it needs `SELECT`, `INSERT`, `UPDATE`, `DELETE` on the
application tables only, and no `DROP`/`ALTER` outside the migration run.

## 9. Secrets in git history

A full scan of the working tree and of every commit in the repository was run
(`git log --all -p` plus a regular-expression sweep for private keys, cloud
access keys, live API keys, GitHub tokens and hardcoded `HAYATA_*` values).

**Result: no secret-shaped strings in any commit, and no deleted file that
used to hold one.** The repository has 6 commits and no history rewrite was
necessary.

Two hardening steps were taken as a result of the scan:

* The one hardcoded value that remained — the token-signing fallback in
  `db.php` — is now confined to `HAYATA_APP_ENV=development`. Any other
  environment refuses to start without `HAYATA_APP_SECRET`
  (`server/php/config.php`).
* `server/php/config.local.php` is explicitly listed in `.gitignore` and is
  confirmed ignored by `git check-ignore`.

If a secret is ever committed by accident, rotate it first and then rewrite
the history — `git filter-repo --path <file> --invert-paths` plus a force
push, and a `git reflog expire --expire=now --all` on every clone.

## 10. Check env variables

`server/php/config.php` reads:

`HAYATA_DB_HOST`, `HAYATA_DB_NAME`, `HAYATA_DB_USER`, `HAYATA_DB_PASS`,
`HAYATA_DB_PORT`, `HAYATA_APP_ENV`, `HAYATA_DEBUG`, `HAYATA_APP_SECRET`,
`HAYATA_APP_TIMEZONE`, `HAYATA_CORS_ORIGINS`, `HAYATA_TOKEN_TTL`,
`HAYATA_RATE_LIMIT_MAX`, `HAYATA_RATE_LIMIT_WINDOW`, `HAYATA_LOGIN_MAX_ATTEMPTS`,
`HAYATA_LOGIN_LOCKOUT`, `HAYATA_MAIL_TRANSPORT`, `HAYATA_SMTP_HOST`,
`HAYATA_SMTP_PORT`, `HAYATA_SMTP_USERNAME`, `HAYATA_SMTP_PASSWORD`,
`HAYATA_SMTP_SECURE`, `HAYATA_SMTP_FROM_EMAIL`, `HAYATA_SMTP_FROM_NAME`.

Real environment variables always win over the local file. Values are
validated and clamped (port range, token lifetime minimum, CORS allowlist
formatting) before use.

**Deployment checklist.** Set `HAYATA_APP_ENV=production`,
`HAYATA_DB_PASS`, `HAYATA_APP_SECRET` (≥ 32 random bytes),
`HAYATA_CORS_ORIGINS` (the real site origin), `HAYATA_APP_TIMEZONE` (the
timezone the property operates in) and the SMTP values. The API refuses to
boot without the first three.

`HAYATA_APP_TIMEZONE` is applied to PHP and to the MySQL session, so the two
read the same clock. When the database has no timezone tables loaded, the API
falls back to the current UTC offset of that zone instead of failing.

## 11. Proper authentication

* **Server-side only.** The browser never checks a password. `authStore.login`
  calls the API and stores the returned user; the previous client-side
  `demo123` comparison was removed, so the shipped bundle cannot be used to
  sign in without a credential.
* **Tokens are hashed at rest.** The database stores
  `hash_hmac('sha256', $token, $app_secret)`, never the bearer token. A
  database dump therefore does not yield usable sessions. Migration `003`
  re-hashed the existing tokens so signed-in staff stayed signed in.
* **Logout revokes.** `POST /auth/logout` deletes the token row. The
  endpoint reads the token through the same helper as the session lookup
  (`hayata_bearer_token()`), which also covers Apache configurations that do
  not copy `Authorization` into `$_SERVER`.
* **Password change.** `POST /auth/password` requires the current password,
  demands at least 10 characters with letters and numbers, re-hashes with
  `password_hash()`, and revokes every other session for that account.
* **Lockout.** Sign-in attempts are throttled per address and per account;
  after `HAYATA_LOGIN_MAX_ATTEMPTS` failures the account is locked for
  `HAYATA_LOGIN_LOCKOUT` seconds.
* **No user enumeration.** A missing account and a wrong password both run a
  hash comparison and return the same message and status.
* **Hash upgrades.** `password_needs_rehash()` transparently upgrades a hash
  when the algorithm or cost factor changes.

## 12. Sanitize forms

* Every request body passes through `hayata_sanitize()`, which removes null
  bytes and control characters from strings and arrays.
* Public free-text fields (enquiry name/subject/message, booking first name,
  last name, email, phone, country, notes and requests) are additionally
  stripped of HTML with `hayata_clean_text()`.
* Values are escaped when they are rendered into the HTML email body
  (`htmlspecialchars`).
* Addresses are checked with `filter_var(..., FILTER_VALIDATE_EMAIL)`.
* The public message length is capped at 5 000 characters and the request body
  at 2 MB (`413 PAYLOAD_TOO_LARGE`).
* The browser validates its own forms with `zod` + `react-hook-form` before
  sending anything.

## 13. Rate limiting

A `rate_limits` table stores the counters. The bucket key is
`hash_hmac('sha256', $bucket, $app_secret)`, so the table never contains a
raw IP address or e-mail address.

| Scope | Budget |
|---|---|
| Signed-in API calls | 240 requests / 60 s, per session |
| Public reads | 60 requests / 60 s, per address |
| Public writes | 20 requests / 60 s, per address |
| Login, per address | 3 × `HAYATA_LOGIN_MAX_ATTEMPTS` / lockout window |
| Login, per account | `HAYATA_LOGIN_MAX_ATTEMPTS` / lockout window |

A throttled request answers `429` with `Retry-After`.

## 14. Update dependencies

* `npm audit` reports **0 vulnerabilities** (previously 1 high severity).
* `xlsx` was the remaining high-severity finding: the copy on the npm registry
  (`0.18.5`) has a prototype-pollution advisory (GHSA-4r6h-8v6p-xvw6) and a
  ReDoS advisory (GHSA-5pgg-2g8v-p4x9) with no fixed release published to npm.
  It is now pinned to the vendor's patched build, `0.20.3`, from SheetJS's
  own distribution point:
  `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`.
* All in-range updates were applied with `npm update`, and the pinned
  `msw` (`3.0.7` → `3.0.8`) and `vitest` (`5.1.1` → `5.1.2`) patch releases
  were taken.
* **Deliberately deferred** (major versions with breaking changes, each
  needing its own change window and regression pass): `@tanstack/react-table`
  8 → 9, `@vitejs/plugin-react` 4 → 6, `vite` 6 → 8, `typescript` 5 → 7,
  `@types/node` 24 → 26, `msw` 3 → 4.

## 15. Check exposed files

`server/php/.htaccess` is the file that belongs next to `api.php` in the
folder Apache serves:

```apache
<FilesMatch "^(?!api\.php$)">
    Require all denied
</FilesMatch>
```

Only `api.php` is reachable. Every library (`db.php`, `config.php`,
`mailer.php`, `access-matrix.php`), every maintenance script (`setup.php`,
`migrate.php`, `seed_access.php`) and the whole `migrations/` folder return
403. Directory listings are off, `expose_php` is off, and dotfiles are denied.

`server/.htaccess` is the deployment-time copy for the parent folder; it adds
`mod_rewrite` rules that block the same files and deny dotfiles.

Also verified: `public/` contains only `favicon.svg`, `icons.svg`,
`mockServiceWorker.js`, `robots.txt` and `sitemap.xml`. No `.env`, key,
certificate or backup file is reachable, and `robots.txt` does not disclose
any private path.

## 16. Hash passwords

* Passwords are stored with `password_hash($password, PASSWORD_DEFAULT)`
  (bcrypt), never in plain text and never with a fast hash.
* `password_verify()` checks a sign-in, and `password_needs_rehash()`
  upgrades the stored hash when the default cost changes.
* The seeded demo accounts still use the shared `demo123` password for the
  demonstration only. **Before going live, change every seeded password and
  give each account its own.** The seed source is `server/php/setup.php`.
* The password hash is removed from every response by `h_public_user()`, and
  a password change never appears in the audit trail by value — only the word
  `password` is recorded.

## 17. Full security audit

### Response headers

Every API response carries:

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'; base-uri 'none'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `Cache-Control` | `no-store` |

The header is defined once, in PHP. The `.htaccess` files only remove
`X-Powered-By`, so no header is ever sent twice.

### Audit trail

Every write through the generic CRUD is written to `audit_logs` by
`h_audit()`, together with the actor, the module, the action, the changed
fields and the source address. The dashboard activity log reads this table
through `GET /audit-logs`, which supports filtering by module, actor, action
and date range, free-text search, summary counters and a CSV export.

### Findings still open (accepted, with reasons)

| Finding | Severity | Decision |
|---|---|---|
| Seeded accounts share the password `demo123` | Medium | Deliberate for the demo. Change every password before go-live. |
| The bearer token lives in `sessionStorage` | Low | A script injected into the page could still read it. The stronger fix is an `HttpOnly`, `Secure`, `SameSite=Strict` cookie with CSRF tokens, which needs a change to the whole API contract. The CSP and the absence of `innerHTML` reduce the injection surface in the meantime. |
| The client-side permission list in `useRbacStore` can be edited in the browser | Low | By design it is only a display filter. Every write is re-checked against the database permissions on the server. |
| `md5`/SHA-1 style hashes are not used for passwords | — | Confirmed: only `password_hash()` is used. |
| MySQL runs as `root` in the local development setup | Medium | The local `config.local.php` uses `root` for convenience. Use a least-privilege account in production. |

### Manual test results

| Check | Expected | Result |
|---|---|---|
| `GET /health` | 200 | 200 |
| `POST /auth/login` | 200 + 64-character token | pass |
| Security headers present | all six | pass |
| Allowed CORS origin | echoed | `http://localhost:5173` |
| Hostile CORS origin | not echoed | empty |
| Stored token vs. raw token | different | different |
| `GET /resource/users` | no password field | no leak |
| `GET /auth/me` with own token | 200 | 200 |
| `GET /notifications/settings` | `hasPassword`, no password | pass |
| Repeated failed logins | 429 | 429 |
| `POST /auth/logout` then `GET /auth/me` | 401 | 401 |
| `GET /audit-logs` with filters | 200 + counters | 200 |
| Notification settings round-trip | password never returned | pass |
| An order posted with an ISO-8601 timestamp | stored as a MySQL datetime | pass |
| An order posted with its line items | the ticket carries the items | pass |
| Deleting an order that has line items | 200 | 200 |
| `npm audit` | 0 vulnerabilities | 0 |
| `npm run build` / `lint` / `test` | pass | pass |

### Commands used to verify

```powershell
npm run build
npm run lint
npm test
npm audit
& 'C:\xampp\php\php.exe' -l server\php\api.php        # and every other PHP file
& 'C:\xampp\php\php.exe' server\php\migrate.php
git check-ignore -v server/php/config.local.php
git log --all -p | Select-String -Pattern 'secret|password|token|PRIVATE KEY'
```
