/**
 * Bundle JSZip dist into a TypeScript constant for WebView inlining.
 */

const fs = require('fs');
const path = require('path');

const JSZIP_PATH = path.resolve(__dirname, '..', 'node_modules', 'jszip', 'dist', 'jszip.min.js');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'src', 'reader', 'jszipBundle.ts');

if (!fs.existsSync(JSZIP_PATH)) {
  console.error('ERROR: jszip.min.js not found. Run `npm install jszip` first.');
  process.exit(1);
}

const source = fs.readFileSync(JSZIP_PATH, 'utf-8');

// Escape backticks and dollar signs for template literal safety
const escaped = source
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$/g, '\\$');

const output = `// AUTO-GENERATED — do not edit manually.
// Source: node_modules/jszip/dist/jszip.min.js

export const JSZIP_SOURCE = \`${escaped}\`;
`;

fs.writeFileSync(OUTPUT_PATH, output, 'utf-8');

const sizeKB = Math.round(source.length / 1024);
console.log(`Done: bundled JSZip (${sizeKB} KB) → src/reader/jszipBundle.ts`);
