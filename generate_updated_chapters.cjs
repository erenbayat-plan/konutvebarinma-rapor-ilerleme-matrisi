const fs = require('fs');

const rows = JSON.parse(fs.readFileSync('parsed_rows.json', 'utf8'));

// Map Turkish status text to ReportStatusType
function mapStatus(text) {
  if (!text) return 'baslanmadi';
  const t = text.trim();
  if (t.includes('Tamamlandı, raporu yazılabilir')) return 'tamamlandi_raporu_yazilabilir';
  if (t.includes('Analiz tamamlandı, kontrol edilecek')) return 'analiz_tamamlandi';
  if (t.includes('Analiz devam ediyor')) return 'analiz_devam_ediyor';
  if (t.includes('Başlanmadı')) return 'baslanmadi';
  return 'baslanmadi';
}

// Clean text helper
function cleanText(t) {
  if (!t) return '';
  return t.replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
}

// Filter out header rows
const dataRows = rows.slice(6).filter(r => r.some(c => c.trim() !== ''));

let currentL1 = '';
let currentL2 = '';
let currentL3 = '';

let chapter1 = [];
let chapter2 = [];
let chapter3 = [];
let chapter4 = [];
let chapter5 = [];

let c3SubIndex = {}; // e.g. "3.1.1" -> counter for 4th level items

dataRows.forEach((r, idx) => {
  const col1 = cleanText(r[0]); // 1. Düzey
  const col2 = cleanText(r[1]); // 2. Düzey
  const col3 = cleanText(r[2]); // 3. Düzey
  const col4 = cleanText(r[3]); // Analiz (4. Düzey)
  const col5 = cleanText(r[4]); // Status

  if (col1) currentL1 = col1;
  if (col2) currentL2 = col2;
  if (col3) currentL3 = col3;

  // Let's print out rows to trace
  console.log(`Row ${idx+1}: L1="${col1}" | L2="${col2}" | L3="${col3}" | L4="${col4}" | ST="${col5}"`);
});
