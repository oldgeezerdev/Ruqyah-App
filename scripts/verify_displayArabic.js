const fs = require('fs');
const path = require('path');

const versesPath = path.resolve(__dirname, '..', 'data', 'verses.json');
const raw = fs.readFileSync(versesPath, 'utf8');
const data = JSON.parse(raw);

const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
const toArabicNumber = (n) => String(n).split('').map(d => arabicDigits[Number(d)]).join('');
const markerRegex = /\u06DD([٠-٩]+)/g; // ۝ + Arabic-Indic digits
const adjacentMarkersRegex = /\u06DD[٠-٩]+\s*\u06DD[٠-٩]+/; // marker followed directly by another marker

function isRange(str) {
  return /^(\d+)-(\d+)$/.test(str);
}

function parseRange(str) {
  const m = str.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return { start: Number(m[1]), end: Number(m[2]) };
}

function collectEntries(json) {
  const entries = [];
  if (Array.isArray(json.coreVerses)) entries.push(...json.coreVerses);
  if (json.openingVerses && Array.isArray(json.openingVerses)) entries.push(...json.openingVerses);
  if (json.targetedVerses && typeof json.targetedVerses === 'object') {
    for (const key of Object.keys(json.targetedVerses)) {
      const arr = json.targetedVerses[key];
      if (Array.isArray(arr)) entries.push(...arr);
    }
  }
  return entries;
}

const entries = collectEntries(data);
let singlesChecked = 0;
let multisChecked = 0;
let issues = [];

function hasTextBeforeEachMarker(display) {
  const parts = display.split(/\u06DD[٠-٩]+/);
  // For N markers, we expect N+1 parts; text must exist before each marker => all parts except last should contain non-whitespace
  for (let i = 0; i < parts.length - 1; i++) {
    if (!parts[i] || parts[i].trim().length === 0) return false;
  }
  return true;
}

for (const v of entries) {
  const verseStr = v.verse;
  const disp = v.displayArabic || '';

  // Count markers and capture digits
  let m;
  const digitsFound = [];
  while ((m = markerRegex.exec(disp)) !== null) {
    digitsFound.push(m[1]);
  }

  if (!verseStr) {
    // Skip non-verse entries (e.g., metadata or placeholders)
    continue;
  }

  if (isRange(verseStr)) {
    const { start, end } = parseRange(verseStr);
    const expectedCount = end - start + 1;
    multisChecked++;

    if (digitsFound.length !== expectedCount) {
      issues.push({ surah: v.surah, verse: verseStr, reason: `Marker count ${digitsFound.length} != expected ${expectedCount}` });
      continue;
    }

    // Expect actual verse numbers start..end in Arabic-Indic digits
    for (let i = 0; i < expectedCount; i++) {
      const expectedDigit = toArabicNumber(start + i);
      if (digitsFound[i] !== expectedDigit) {
        issues.push({ surah: v.surah, verse: verseStr, reason: `Wrong marker at index ${i}: found ${digitsFound[i]} != expected ${expectedDigit}` });
        break;
      }
    }

    // Must end with last verse marker (actual end value)
    const expectedLast = `\u06DD${toArabicNumber(end)}`;
    if (!disp.endsWith(expectedLast)) {
      issues.push({ surah: v.surah, verse: verseStr, reason: 'Does not end with last verse marker' });
    }

    // No adjacent markers
    if (adjacentMarkersRegex.test(disp)) {
      issues.push({ surah: v.surah, verse: verseStr, reason: 'Adjacent markers found (no text between markers)' });
    }

    // Ensure text before each marker
    if (!hasTextBeforeEachMarker(disp)) {
      issues.push({ surah: v.surah, verse: verseStr, reason: 'Marker appears without preceding verse text' });
    }

  } else {
    // Single verse
    singlesChecked++;
    const n = Number(verseStr);
    if (!Number.isFinite(n)) {
      issues.push({ surah: v.surah, verse: verseStr, reason: 'Non-numeric single verse value' });
      continue;
    }
    const expectedSingleEnd = `\u06DD${toArabicNumber(n)}`;
    if (!disp.endsWith(expectedSingleEnd)) {
      issues.push({ surah: v.surah, verse: verseStr, reason: `Single verse does not end with expected marker ${expectedSingleEnd}` });
    }
    if (digitsFound.length !== 1) {
      issues.push({ surah: v.surah, verse: verseStr, reason: `Single verse contains ${digitsFound.length} markers (expected 1)` });
    }
  }
}

const totalChecked = singlesChecked + multisChecked;
if (issues.length === 0) {
  console.log(`OK: Verified ${totalChecked} entries (singles=${singlesChecked}, multis=${multisChecked}). All markers correct.`);
  process.exit(0);
} else {
  console.log(`FAIL: Verified ${totalChecked} entries (singles=${singlesChecked}, multis=${multisChecked}). Issues=${issues.length}`);
  for (const issue of issues) {
    console.log(`- [${issue.surah}] verse=${issue.verse} :: ${issue.reason}`);
  }
  process.exit(1);
}