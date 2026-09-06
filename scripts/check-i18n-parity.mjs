// i18n key-parity check: en / hi / or dictionaries must expose identical
// leaf-key sets, otherwise a language silently falls back to raw keys or English.
// Usage: node scripts/check-i18n-parity.mjs   (exit 0 = parity OK)
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const translationsUrl = pathToFileURL(path.join(root, 'frontend', 'src', 'i18n', 'translations.js')).href;

function flatten(obj, prefix = '') {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const leaf of flatten(v, key)) out.add(leaf);
    } else {
      out.add(key);
    }
  }
  return out;
}

const { translations } = await import(translationsUrl);
const sets = {
  en: flatten(translations.en),
  hi: flatten(translations.hi),
  or: flatten(translations.or),
};
const all = new Set([...sets.en, ...sets.hi, ...sets.or]);
let bad = 0;
for (const lang of ['en', 'hi', 'or']) {
  const missing = [...all].filter((k) => !sets[lang].has(k));
  if (missing.length) {
    bad += missing.length;
    console.error(`[${lang}] missing ${missing.length} key(s):`);
    for (const k of missing.slice(0, 40)) console.error(`   - ${k}`);
    if (missing.length > 40) console.error(`   … and ${missing.length - 40} more`);
  }
}
if (bad) {
  console.error(`\n✗ i18n parity FAILED: ${bad} missing key(s) across languages.`);
  process.exit(1);
}
console.log(`✓ i18n parity OK — en ${sets.en.size} · hi ${sets.hi.size} · or ${sets.or.size} keys, no gaps.`);
