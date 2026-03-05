#!/usr/bin/env node
// Bundle script — concatenates ES modules into app.bundle.js (no build tool deps).
// Run: node scripts/bundle.js  OR  npm run bundle

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'app', 'modules');
const APP_FILE = path.join(ROOT, 'app', 'app.js');
const OUT_FILE = path.join(ROOT, 'app', 'app.bundle.js');

// Order matters — dependencies must come before dependants.
const MODULE_ORDER = [
  'constants.js',
  'state.js',
  'data-loader.js',
  'namespace-browser.js',
  'graph-renderer.js',
  'filter-manager.js',
  'detail-panel.js',
  'warnings-panel.js',
  'search.js',
];

const HEADER = `// ============================================================
// app.bundle.js — Single-file build, no ES modules required.
// Works with file:// protocol (no server needed).
// ============================================================
`;

/**
 * Strip import declarations and export keywords from a module source.
 * - Lines starting with `import ` are removed entirely.
 * - Leading `export ` (or `export default `) is stripped from declarations.
 * The WORKER_CODE template string is safe because the anchor `^import\s` only
 * matches at the beginning of a real source line, not inside a template literal.
 */
function stripModule(code) {
  return code
    .split('\n')
    .filter((line) => !/^import\s/.test(line))
    .map((line) => line.replace(/^export\s+(?:default\s+)?/, ''))
    .join('\n');
}

function padComment(name) {
  const base = `// ── ${name} `;
  const total = 60;
  return base + '─'.repeat(Math.max(4, total - base.length));
}

let output = HEADER;

for (const mod of MODULE_ORDER) {
  const filePath = path.join(MODULES_DIR, mod);
  if (!fs.existsSync(filePath)) {
    // constants.js may not exist yet on first run before P2c — skip gracefully
    console.warn(`[bundle] Warning: ${mod} not found, skipping.`);
    continue;
  }
  const code = fs.readFileSync(filePath, 'utf-8');
  const stripped = stripModule(code);
  output += `\n${padComment(mod)}\n`;
  output += stripped + '\n';
}

// app.js (root-level entry, imports all modules — all those are stripped)
const appCode = fs.readFileSync(APP_FILE, 'utf-8');
const appStripped = stripModule(appCode);
output += `\n${padComment('app.js')}\n`;
output += appStripped + '\n';

fs.writeFileSync(OUT_FILE, output, 'utf-8');
console.log(`[bundle] Written → ${path.relative(ROOT, OUT_FILE)}`);
