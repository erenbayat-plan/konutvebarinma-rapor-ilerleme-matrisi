const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Reset selectedChapterFilter when switching tabs
const tabSwitchMevcut = `onClick={() => setActiveTab('mevcut_durum')}`;
const tabSwitchPolitika = `onClick={() => setActiveTab('politika')}`;

code = code.replace(tabSwitchMevcut, `onClick={() => { setActiveTab('mevcut_durum'); setSelectedChapterFilter('all'); }}`);
code = code.replace(tabSwitchPolitika, `onClick={() => { setActiveTab('politika'); setSelectedChapterFilter('all'); }}`);

fs.writeFileSync('src/App.tsx', code);
