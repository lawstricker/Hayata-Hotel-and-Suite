#!/usr/bin/env node
/**
 * Audits the storage locks that keep application files and credentials out of
 * reach of an HTTP client. Run with `npm run security:storage`.
 *
 * The API stores pictures as validated data URLs in MySQL, so there is no
 * public upload directory. The .htaccess files below keep it that way even if
 * one is added later.
 */
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const checks = [
  {
    file: 'server/php/.htaccess',
    need: [
      'Require all denied',
      'api\\.php',
      'sql|log|bak',
      'Options -Indexes',
      '^uploads/',
    ],
    why: 'only api.php may be executed; dumps, logs and uploads are denied',
  },
  {
    file: 'server/php/uploads/.htaccess',
    need: ['Require all denied', 'php_flag engine off', 'Options -Indexes -ExecCGI'],
    why: 'uploaded content can never be listed or executed as PHP/CGI',
  },
  {
    file: 'server/.htaccess',
    need: ['^(setup|migrate|seed_access)', 'security|access-matrix', '^migrations/', '^uploads/', 'sql|log|bak'],
    why: 'deployment copy denies maintenance scripts, libraries and backups',
  },
  {
    file: 'server/php/sql/least-privilege.sql',
    need: ['GRANT SELECT, INSERT, UPDATE, DELETE', 'REVOKE CREATE, DROP, ALTER'],
    why: 'the runtime database account has no schema or grant privileges',
  },
]

let failed = false
for (const check of checks) {
  const path = join(root, check.file)
  let content = ''
  try {
    content = readFileSync(path, 'utf8')
    statSync(path)
  } catch {
    console.error(`FAIL  ${check.file} is missing`)
    failed = true
    continue
  }
  const missing = check.need.filter((token) => !content.includes(token))
  if (missing.length) {
    console.error(`FAIL  ${check.file}: missing ${missing.length} lock rule(s) — ${check.why}`)
    failed = true
  } else {
    console.log(`PASS  ${check.file} — ${check.why}`)
  }
}

console.log('\nRuntime storage checklist:')
console.log('  * copy server/php/.htaccess next to api.php in the web root')
console.log('  * keep server/php/config.local.php out of the web root and out of git')
console.log('  * run server/php/sql/least-privilege.sql and use that account in production')
console.log('  * on Windows: icacls server\\php\\config.local.php /inheritance:r /grant:r "<service-user>:(R)"')

process.exitCode = failed ? 1 : 0
