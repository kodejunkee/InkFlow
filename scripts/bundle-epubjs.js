/**
 * Bundle epub.js dist into a TypeScript constant for WebView inlining.
 *
 * Usage: node scripts/bundle-epubjs.js
 *
 * Reads node_modules/epubjs/dist/epub.min.js and writes
 * src/reader/epubjsBundle.ts exporting the source as a string.
 */

const fs = require('fs');
const path = require('path');

const EPUBJS_PATH = path.resolve(__dirname, '..', 'node_modules', 'epubjs', 'dist', 'epub.min.js');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'reader', 'epubjsBundle.ts');

if (!fs.existsSync(EPUBJS_PATH)) {
  console.error('ERROR: epub.min.js not found. Run `npm install epubjs` first.');
  process.exit(1);
}

const source = fs.readFileSync(EPUBJS_PATH, 'utf-8');

// Escape backticks and dollar signs for template literal safety
const escaped = source
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

const output = `// AUTO-GENERATED — do not edit manually.
// Run \`node scripts/bundle-epubjs.js\` to regenerate.
// Source: node_modules/epubjs/dist/epub.min.js

export const EPUBJS_SOURCE = \`${escaped}\`;
`;

// Ensure output directory exists
const outDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');

const sizeKB = Math.round(source.length / 1024);
console.log(`✓ Bundled epub.js (${sizeKB} KB) → src/reader/epubjsBundle.ts`);
