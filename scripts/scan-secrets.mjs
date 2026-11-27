#!/usr/bin/env node
/**
 * Scans tracked files and the full git history for credential-shaped strings.
 * Run with `npm run security:secrets`.
 *
 * This script skips itself (its patterns are written out literally) and the
 * example configuration files, whose values are deliberately empty.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const skip = (path) =>
  path === 'scripts/scan-secrets.mjs' ||
  path.endsWith('.example.php') ||
  path.endsWith('.example') ||
  path.startsWith('docs/security/')

// Patterns are assembled at runtime so the scanner does not report its own
// source as a finding.
const gh = 'gh' + 'p_'
const aws = 'AK' + 'IA'
const patterns = [
  { name: 'private key', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: new RegExp(`${gh}[A-Za-z0-9]{20,}`, 'g') },
  { name: 'AWS access key', re: new RegExp(`${aws}[0-9A-Z]{16}`, 'g') },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: 'Stripe key', re: /sk_live_[A-Za-z0-9]{16,}/g },
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/g },
  { name: 'JWT', re: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { name: 'assigned secret', re: /(?:HAYATA_APP_SECRET|HAYATA_DB_PASS|HAYATA_SMTP_PASSWORD|SMTP_PASSWORD)\s*[=:]\s*['"]?[A-Za-z0-9_\-/+]{16,}['"]?/g },
]

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
}

const findings = []
function scan(label, text) {
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const { name, re } of patterns) {
      re.lastIndex = 0
      if (re.test(line)) findings.push({ label, line: index + 1, name, excerpt: line.trim().slice(0, 160) })
    }
  })
}

const files = git(['ls-files']).split(/\r?\n/).filter(Boolean).filter((file) => !skip(file))
for (const file of files) {
  if (/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|tgz|zip|pdf)$/i.test(file)) continue
  try {
    scan(file, readFileSync(file, 'utf8'))
  } catch {
    // A binary or unreadable path cannot contain a plain-text credential.
  }
}

try {
  scan('git history', git(['log', '--all', '-p']))
} catch {
  console.warn('WARN  could not read git history; only the working tree was scanned')
}

if (findings.length === 0) {
  console.log(`PASS  scanned ${files.length} tracked files plus git history — no secrets found`)
  process.exit(0)
}

console.error(`FAIL  ${findings.length} potential secret(s) found:`)
for (const finding of findings.slice(0, 40)) {
  console.error(`  ${finding.label}:${finding.line} [${finding.name}] ${finding.excerpt}`)
}
process.exit(1)
