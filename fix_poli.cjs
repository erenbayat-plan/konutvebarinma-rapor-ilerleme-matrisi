const fs = require('fs');

let rawData = fs.readFileSync('poli.json', 'utf8');
// poli.json has "export const POLITIKA_YATIRIM_CHAPTERS: ReportChapterGroup[] = ["
rawData = rawData.replace('export const POLITIKA_YATIRIM_CHAPTERS: ReportChapterGroup[] = ', '');
if (rawData.endsWith(';')) rawData = rawData.slice(0, -1);
if (rawData.endsWith(';\n')) rawData = rawData.slice(0, -2);

const chapters = JSON.parse(rawData);

for (const ch of chapters) {
  let counter = 1;
  let lastLevel3Code = "";
  
  for (const item of ch.items) {
    if (item.code === "") {
      // it's a 4th level item
      item.code = `${lastLevel3Code}.${counter}`;
      counter++;
    } else {
      // it's a regular item, maybe level 3 or level 2
      // Check if it's a level 3
      const parts = item.code.split('.');
      if (parts.length === 3) {
        lastLevel3Code = item.code;
        counter = 1;
      }
    }
  }
}

fs.writeFileSync('poli_fixed.json', JSON.stringify(chapters, null, 2));
