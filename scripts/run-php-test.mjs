#!/usr/bin/env node
/** Runs a PHP CLI test, finding PHP on PATH or in the default XAMPP folder. */
import { spawnSync } from 'node:child_process'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/run-php-test.mjs <php-file>')
  process.exit(1)
}

const candidates = [process.env.PHP_BIN, 'php', 'C:\\xampp\\php\\php.exe'].filter(Boolean)
for (const php of candidates) {
  const result = spawnSync(php, [file], { stdio: 'inherit', shell: false })
  if (!result.error) process.exit(result.status ?? 1)
}
console.error('PHP was not found. Set PHP_BIN to the php.exe path.')
process.exit(1)
