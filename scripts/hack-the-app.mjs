#!/usr/bin/env node
/**
 * Adversarial ("hack the app") run against a local Hayata API.
 *
 * It tries the attacks a real tester would attempt — SQL injection, IDOR,
 * privilege escalation, anonymous and hostile uploads, price/status tampering,
 * payment replay, secret-file access and rate-limit flooding — and writes the
 * results to docs/security/PENTEST.md.
 *
 * Usage: npm run security:hack
 *   HAYATA_API_TEST_URL=... to target another instance.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url)) + '/..'
const apiBase = process.env.HAYATA_API_TEST_URL || 'http://localhost/hayata-api/api.php'
const fileBase = apiBase.replace(/\/api\.php.*$/, '')

const results = []
function record(name, attack, expected, passed, evidence = '') {
  results.push({ name, attack, expected, passed, evidence })
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${evidence ? ' — ' + evidence : ''}`)
}

async function call(route, method = 'GET', body, token) {
  const url = `${apiBase}?route=${encodeURIComponent(route)}`
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const text = await response.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }
  return { status: response.status, body: json, text, headers: response.headers }
}

async function raw(path) {
  const response = await fetch(`${fileBase}/${path}`)
  return response.status
}

// Clear throttling counters so the flood test is deterministic.
const resetScript = join(root, 'server/php/tests/reset-rate-limits.php')
const phpCandidates = [process.env.PHP_BIN, 'php', 'C:\\xampp\\php\\php.exe'].filter(Boolean)
let reset = false
for (const php of phpCandidates) {
  try {
    execFileSync(php, [resetScript], { stdio: 'ignore' })
    reset = true
    break
  } catch {
    // Try the next location.
  }
}
if (!reset) console.warn('WARN  could not reset rate limits; flood test may finish early')

const iso = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

try {
  const admin = await call('/auth/login', 'POST', { email: 'elena@hayatahotel.com', password: 'demo123' })
  const viewer = await call('/auth/login', 'POST', { email: 'viewer@hayatahotel.com', password: 'demo123' })
  const adminToken = admin.body?.token ?? ''
  const viewerToken = viewer.body?.token ?? ''
  record('attacker cannot sign in with a bogus password',
    'POST /auth/login with wrong password', '401',
    (await call('/auth/login', 'POST', { email: 'elena@hayatahotel.com', password: 'wrong-password-123' })).status === 401)

  // 19. SQL injection --------------------------------------------------------
  const sqliRoute = await call(`/resource/users/${encodeURIComponent("usr-001' OR 1=1--")}`, 'GET', undefined, adminToken)
  record('SQL injection in a record id', 'GET /resource/users/1\' OR 1=1--', 'no rows, no SQL error',
    sqliRoute.status !== 200 && !/sql/i.test(sqliRoute.text), `status ${sqliRoute.status}`)
  const sqliBody = await call('/resource/users', 'POST', { name: 'x', email: "x'); DROP TABLE users;--" }, adminToken)
  record('SQL injection in a form field', "POST email = x'); DROP TABLE users;--", '422 rejected',
    sqliBody.status === 422, `status ${sqliBody.status}`)

  // 26/34. IDOR and record access ------------------------------------------
  const idorRead = await call('/resource/users/usr-001', 'GET', undefined, viewerToken)
  record('IDOR read of another staff record', 'viewer GET /resource/users/usr-001', '403',
    idorRead.status === 403, `status ${idorRead.status}`)
  const idorWrite = await call('/resource/users/usr-001', 'PUT', { name: 'Owned' }, viewerToken)
  record('IDOR write to another staff record', 'viewer PUT /resource/users/usr-001', '403',
    idorWrite.status === 403, `status ${idorWrite.status}`)
  const escalation = await call('/resource/users', 'POST', {
    name: 'Backdoor', email: `backdoor-${Date.now()}@example.com`, password: 'Password1234', roleId: 'SUPER_ADMIN',
  }, viewerToken)
  record('privilege escalation by creating an admin', 'viewer POST /resource/users with SUPER_ADMIN', '403',
    escalation.status === 403, `status ${escalation.status}`)
  const anonWrite = await call('/resource/menu-items', 'POST', { name: 'Free', price: 1 })
  record('anonymous staff write', 'POST /resource/menu-items with no token', '401',
    anonWrite.status === 401, `status ${anonWrite.status}`)

  // 28/29. Upload attacks ---------------------------------------------------
  const anonUpload = await call('/public/enquiries', 'POST', {
    name: 'Guest', email: 'guest@example.com', message: 'Hello', image: 'data:image/png;base64,iVBORw0KGgo=',
  })
  record('anonymous upload in a public form', 'POST /public/enquiries with an image field', '403 UPLOAD_BLOCKED',
    anonUpload.status === 403 && anonUpload.body?.code === 'UPLOAD_BLOCKED', `status ${anonUpload.status}`)
  const types = await call('/resource/room-types', 'GET', undefined, adminToken)
  const firstType = Array.isArray(types.body) ? types.body[0] : undefined
  if (firstType?.id) {
    const svg = await call(`/resource/room-types/${encodeURIComponent(firstType.id)}`, 'PUT',
      { image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==' }, adminToken)
    record('script-bearing SVG upload', 'PUT room type with data:image/svg+xml', '422 rejected',
      svg.status === 422, `status ${svg.status}`)
  }

  // 31/32. Response trimming and mass assignment ---------------------------
  const health = await call('/health')
  record('health endpoint information leak', 'GET /health', 'no database name or environment',
    !health.text.includes('hayata_data') && !health.text.includes('"environment"'))
  const menu = await call('/public/menu')
  const costLeak = Array.isArray(menu.body) && menu.body.some((item) => 'cost' in item || 'recipe' in item)
  record('food-cost leak to guests', 'GET /public/menu', 'no cost or recipe fields', !costLeak)

  const junkMenu = await call('/resource/menu-items', 'POST', {
    id: `hack-${Date.now()}`, name: 'Probe', category: 'Mains', outlet: 'RESTAURANT',
    price: 1, cost: 0, image: '', description: '', station: 'Kitchen', internalFlag: 'leak',
  }, adminToken)
  const hasJunk = junkMenu.body && typeof junkMenu.body === 'object' && !('internalFlag' in junkMenu.body)
  record('mass assignment of an unknown field', 'POST menu item with internalFlag', 'field dropped',
    junkMenu.status === 201 && hasJunk, `status ${junkMenu.status}`)
  if (junkMenu.body?.id) await call(`/resource/menu-items/${junkMenu.body.id}`, 'DELETE', undefined, adminToken)

  // 32. Public booking payment tampering and replay -------------------------
  const publicTypes = await call('/public/room-types')
  const slug = Array.isArray(publicTypes.body) ? publicTypes.body[0]?.slug : undefined
  if (slug) {
    const guest = {
      firstName: 'Test', lastName: 'Guest', email: `hack-${Date.now()}@example.com`,
      phone: '08000000000', acceptTerms: true,
    }
    const created = await call('/public/bookings', 'POST', {
      slug, checkIn: iso(3), checkOut: iso(5), adults: 2, children: 0,
      guest, addOns: {}, promoCode: '',
    })
    const reference = created.body?.reference
    if (reference) {
      const forged = await call(`/public/bookings/${reference}/pay`, 'POST', {
        email: 'attacker@example.com', token: 'a'.repeat(64),
      })
      record('forged booking payment proof', 'POST pay with a fake token and email', '403',
        forged.status === 403, `status ${forged.status}`)
      const paid = await call(`/public/bookings/${reference}/pay`, 'POST', {
        email: guest.email, token: created.body.paymentToken,
      })
      record('legitimate signed payment', 'POST pay with the issued token', '200', paid.status === 200, `status ${paid.status}`)
      const replay = await call(`/public/bookings/${reference}/pay`, 'POST', {
        email: guest.email, token: created.body.paymentToken,
      })
      record('payment replay', 'POST pay twice with the same token', '409', replay.status === 409, `status ${replay.status}`)
      const wrongEmail = await call(`/public/bookings/${reference}/cancel`, 'POST', { email: 'attacker@example.com' })
      record('IDOR cancellation by email guessing', 'POST cancel with a wrong email', '403',
        wrongEmail.status === 403, `status ${wrongEmail.status}`)
      await call(`/resource/public-bookings/${reference}`, 'DELETE', undefined, adminToken)
      await call(`/resource/reservations/res-online-${reference}`, 'DELETE', undefined, adminToken)
    }
  }

  // 25. Secret files and upload directory ----------------------------------
  for (const [label, path] of [
    ['database library', 'db.php'], ['local config', 'config.local.php'],
    ['migration script', 'migrations/003_security_hardening.php'], ['uploads folder', 'uploads/'],
  ]) {
    const status = await raw(path)
    record(`direct access to ${label}`, `GET /${path}`, '403/404', status === 403 || status === 404, `status ${status}`)
  }

  const headers = health.headers
  record('security headers present', 'GET /health',
    'nosniff, DENY, CSP, no X-Powered-By',
    headers.get('x-content-type-options') === 'nosniff' &&
    headers.get('x-frame-options') === 'DENY' &&
    Boolean(headers.get('content-security-policy')) &&
    !headers.has('x-powered-by'))

  // 21. Flood the public API last, because it fills the shared bucket. -------
  let throttled = false
  let retryAfter = ''
  for (let i = 0; i < 75; i++) {
    const response = await call('/public/room-types')
    if (response.status === 429) {
      throttled = true
      retryAfter = response.headers.get('retry-after') ?? ''
      break
    }
  }
  record('rate-limit flood', '75 rapid public requests', '429 with Retry-After',
    throttled && retryAfter !== '', `retry-after ${retryAfter || 'missing'}`)

  await call('/auth/logout', 'POST', undefined, adminToken)
  await call('/auth/logout', 'POST', undefined, viewerToken)
} catch (error) {
  record('test harness', 'unexpected error', 'no error', false, String(error))
}

const passed = results.filter((result) => result.passed).length
const failed = results.length - passed
const generated = new Date().toISOString()
const lines = [
  '# Hayata Hotel & Suite — adversarial security run',
  '',
  `**Target:** ${apiBase}  `,
  `**Run:** ${generated}  `,
  `**Result:** ${passed} passed, ${failed} failed`,
  '',
  'This report is produced by `npm run security:hack`. Each row is a real HTTP',
  'request against a running API; no mock data is substituted.',
  '',
  '| Attack | What was sent | Expected | Result | Evidence |',
  '|---|---|---|---|---|',
  ...results.map((result) =>
    `| ${result.name} | ${result.attack.replace(/\|/g, '\\|')} | ${result.expected} | ${result.passed ? 'PASS' : 'FAIL'} | ${result.evidence.replace(/\|/g, '\\|')} |`
  ),
  '',
  failed === 0
    ? 'All attempts were refused by the server. No exploitable finding in this run.'
    : `${failed} check(s) need investigation before release.`,
  '',
]
const reportPath = join(root, 'docs/security/PENTEST.md')
mkdirSync(dirname(reportPath), { recursive: true })
writeFileSync(reportPath, lines.join('\n'), 'utf8')
console.log(`\nReport written to ${reportPath}`)
process.exitCode = failed === 0 ? 0 : 1
