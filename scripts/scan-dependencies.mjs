#!/usr/bin/env node
/** Audits the npm dependency tree. Run with `npm run security:deps`. */
import { execSync } from 'node:child_process'

let stdout = ''
try {
  stdout = execSync('npm audit --json', { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
} catch (error) {
  // npm exits non-zero when findings exist; its JSON report is still useful.
  stdout = (error.stdout ?? '').toString()
  if (!stdout) {
    console.error('FAIL  npm audit did not produce a report')
    console.error((error.stderr ?? '').toString().trim().slice(0, 800))
    process.exit(1)
  }
}

let report
try {
  report = JSON.parse(stdout)
} catch {
  console.error('FAIL  npm audit returned invalid JSON')
  process.exit(1)
}

const counts = report.metadata?.vulnerabilities ?? {}
const total = counts.total ?? 0
console.log(
  `npm audit: ${total} vulnerabilities ` +
  `(critical ${counts.critical ?? 0}, high ${counts.high ?? 0}, ` +
  `moderate ${counts.moderate ?? 0}, low ${counts.low ?? 0})`
)

if (report.error) {
  console.error(`FAIL  ${report.error.code ?? 'audit error'}: ${report.error.summary ?? ''}`)
  process.exit(1)
}

const packages = Object.entries(report.vulnerabilities ?? {})
  .filter(([, info]) => ['critical', 'high'].includes(info.severity))
for (const [name, info] of packages) {
  const fix = info.fixAvailable ? JSON.stringify(info.fixAvailable) : 'no published fix'
  console.error(`  ${info.severity}: ${name} — ${fix}`)
}

process.exitCode = total === 0 || (counts.critical === 0 && counts.high === 0) ? 0 : 1
if (process.exitCode === 0) console.log('PASS  no critical or high-severity dependency findings')
