const fs = require('fs');
let content = fs.readFileSync('src/components/ChapterCard.tsx', 'utf8');

// Replace chapter total analyses count
content = content.replace(
/(\s+let totalAnalysesCount = 0;\s+let completedAnalysesCount = 0;\s+sortedItems\.forEach\(item => \{\s+\(item\.analizler \|\| \[\]\)\.forEach\(an => \{\s+totalAnalysesCount\+\+;\s+const currentSt = analysisStatuses\[an\.id\] \|\| an\.status;\s+if \(currentSt === 'Tamamlandı'\) completedAnalysesCount\+\+;\s+\}\);\s+)(\}\);)/,
`$1  if (getHeadingDegree(item.code) === 4) {
      totalAnalysesCount++;
      const st = getStatus(item);
      const prog = typeof st.progress === 'number' ? st.progress : (STATUS_PROGRESS_MAP[st.status] ?? 0);
      if (prog >= 70) completedAnalysesCount++;
    }
  $2`
);

// Replace chapter badge label
content = content.replace(
/\{completedAnalysesCount\}\/\{totalAnalysesCount\} Mekânsal Analiz/,
`{completedAnalysesCount}/{totalAnalysesCount} {chapter.num === '3' ? 'Analiz' : 'Mekânsal Analiz'}`
);

// Replace group analyses calculation
content = content.replace(
/(\s+\(item\.analizler \|\| \[\]\)\.forEach\(an => \{\s+groupTotalAnalyses\+\+;\s+const aSt = analysisStatuses\[an\.id\] \|\| an\.status;\s+if \(aSt === 'Tamamlandı'\) groupCompletedAnalyses\+\+;\s+\}\);\s+)(\}\);)/,
`$1  if (getHeadingDegree(item.code) === 4) {
                      groupTotalAnalyses++;
                      const st = getStatus(item);
                      const prog = typeof st.progress === 'number' ? st.progress : (STATUS_PROGRESS_MAP[st.status] ?? 0);
                      if (prog >= 70) groupCompletedAnalyses++;
                    }
                  $2`
);

// Replace group badge label
content = content.replace(
/\{groupTotalAnalyses > 0 \? \` \· \$\{groupCompletedAnalyses\}\/\$\{groupTotalAnalyses\} Mekânsal Analiz\` : ''\}/,
`{groupTotalAnalyses > 0 ? \` · \${groupCompletedAnalyses}/\${groupTotalAnalyses} \${chapter.num === '3' ? 'Analiz' : 'Mekânsal Analiz'}\` : ''}`
);

fs.writeFileSync('src/components/ChapterCard.tsx', content);
