import React, { useState, useMemo } from 'react';
import type { ReportChapterGroup, ReportItem, ReportStatusType } from '../reportData';
import { 
  REPORT_STATUS_LABEL, 
  STATUS_PROGRESS_MAP, 
  computeAutoStatusForAnalyses,
  SPATIAL_STATUS_KEYS,
  NON_SPATIAL_STATUS_KEYS,
  getStatusLabel
} from '../reportData';
import type { ReportStatusItem } from '../syncService';

interface ChapterCardProps {
  chapter: ReportChapterGroup;
  items: (ReportItem & { customId?: string; isCustom?: boolean })[];
  reportStatus: Record<string, ReportStatusItem>;
  analysisStatuses: Record<string, 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede'>;
  chapterNotes: string;
  isCollapsed: boolean;
  onToggleCollapse: (chapterNum: string) => void;
  onUpdateStatus: (id: string, updates: Partial<ReportStatusItem>) => void;
  onUpdateAnalysisStatus: (analysisId: string, status: 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede') => void;
  onAddSubSection?: (
    chapterNum: string, 
    title: string, 
    code: string, 
    scope?: string, 
    pages?: string, 
    level2?: string,
    level3?: string,
    level4?: string,
    sartnameUyum?: string
  ) => void;
  onDeleteSubSection: (id: string, customId?: string) => void;
  onUpdateChapterNotes: (chapterNum: string, note: string) => void;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  items,
  reportStatus,
  analysisStatuses,
  chapterNotes,
  isCollapsed,
  onToggleCollapse,
  onUpdateStatus,
  onUpdateAnalysisStatus,
  onDeleteSubSection,
  onUpdateChapterNotes
}) => {
  const [showChapterNote, setShowChapterNote] = useState(false);
  // Expanded detail drawers by item ID
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  // Collapsed 2nd-level sub-groups (e.g. "3.1", "3.2", "4.1")
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const getItemId = (item: ReportItem) => item.id || `konut_${item.code.replace(/\./g, '_')}`;

  const getStatus = (item: ReportItem): ReportStatusItem => {
    const id = getItemId(item);
    if (reportStatus[id]) return reportStatus[id];
    if (item.analizler && item.analizler.length > 0) {
      const auto = computeAutoStatusForAnalyses(item.analizler, analysisStatuses);
      return {
        status: auto.status,
        progress: auto.progress,
        author: '',
        targetPages: item.defaultPages || '',
        note: '',
        driveLink: ''
      };
    }
    const st = item.defaultStatus || 'baslanmadi';
    const defProg = STATUS_PROGRESS_MAP[st] ?? 0;
    return {
      status: st,
      progress: defProg,
      author: '',
      targetPages: item.defaultPages || '',
      note: '',
      driveLink: ''
    };
  };

  // Chapter overall statistics
  const totalCount = items.length;
  const completedCount = items.filter(item => {
    const st = getStatus(item);
    return st.status === 'mavi_depoda_guncel' || st.status === 'mavi_depoya_gidebilir' || st.status === 'completed' || st.progress >= 98;
  }).length;

  const sumProgress = items.reduce((acc, item) => {
    const st = getStatus(item);
    const itemProg = typeof st.progress === 'number' ? st.progress : (STATUS_PROGRESS_MAP[st.status] ?? 0);
    return acc + itemProg;
  }, 0);
  const chapterProgress = totalCount > 0 ? Math.round(sumProgress / totalCount) : 0;

  // Analysis statistics in this chapter
  let totalAnalysesCount = 0;
  let completedAnalysesCount = 0;
  items.forEach(item => {
    (item.analizler || []).forEach(an => {
      totalAnalysesCount++;
      const currentSt = analysisStatuses[an.id] || an.status;
      if (currentSt === 'Tamamlandı') completedAnalysesCount++;
    });
  });

  // Group items by 2nd-level hierarchy (e.g., 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)
  const sectionGroups = useMemo(() => {
    const groupsMap = new Map<string, { groupCode: string; groupTitle: string; items: (ReportItem & { customId?: string; isCustom?: boolean })[] }>();

    items.forEach(item => {
      // Check if code matches 3-level pattern e.g. "3.1.1", "2.1.3", "4.2.1"
      const subMatch = item.code.match(/^(\d+\.\d+)\.(\d+)/);
      let groupKey: string;
      let groupTitle: string;

      if (subMatch) {
        groupKey = subMatch[1]; // e.g. "3.1"
        if (item.level2) {
          groupTitle = item.level2.replace(/^\d+\.\d+\.?\s*/, '').trim();
        } else {
          groupTitle = groupKey;
        }
      } else {
        // Standalone 2nd level item like "1.1", "1.2", "2.2", "3.6", "4.3", "5.1"
        groupKey = item.code;
        groupTitle = item.title;
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          groupCode: groupKey,
          groupTitle,
          items: []
        });
      }
      groupsMap.get(groupKey)!.items.push(item);
    });

    return Array.from(groupsMap.values()).map(g => {
      const isParentGroup = g.items.length > 1 || (g.items.length === 1 && g.items[0].code !== g.groupCode);
      return {
        ...g,
        isParentGroup
      };
    });
  }, [items]);

  const toggleDetail = (id: string) => {
    setExpandedDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleGroupCollapse = (groupCode: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupCode]: !prev[groupCode] }));
  };

  return (
    <div className={`chapter-card ${isCollapsed ? 'collapsed' : ''}`} id={`chapter-${chapter.num}`}>
      {/* Chapter Head */}
      <div className="chapter-head" onClick={() => onToggleCollapse(chapter.num)}>
        <div className="chapter-head-left">
          <span className="chapter-num-badge">{chapter.num}.</span>
          <div className="chapter-titles-wrap">
            <h3 className="chapter-title">{chapter.title}</h3>
            {totalAnalysesCount > 0 && (
              <div className="chapter-meta-line">
                <span className="chapter-analysis-badge">
                  {completedAnalysesCount}/{totalAnalysesCount} Mekânsal Analiz
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="chapter-head-right" onClick={e => e.stopPropagation()}>
          <div className="chapter-mini-progress">
            <span className="ch-prog-text">
              <b>{completedCount}/{totalCount}</b> Tamamlandı (%{chapterProgress})
            </span>
            <div className="chapter-mini-track">
              <span 
                style={{ 
                  width: `${chapterProgress}%`, 
                  background: chapterProgress === 100 ? 'var(--ok)' : 'var(--brand)' 
                }}
              />
            </div>
          </div>

          <button 
            type="button"
            className={`btn-text-subtle ${chapterNotes ? 'has-content' : ''}`}
            title="Bölüm Genel Notları & Koordinasyon Yönergesi"
            onClick={() => setShowChapterNote(prev => !prev)}
          >
            {chapterNotes ? 'Notlar (Dolu)' : 'Notlar'}
          </button>

          <button
            type="button"
            className="btn-text-subtle btn-collapse-toggle"
            title={isCollapsed ? 'Bölümü Genişlet' : 'Bölümü Daralt'}
            onClick={() => onToggleCollapse(chapter.num)}
          >
            {isCollapsed ? 'Aç' : 'Kapat'}
          </button>
        </div>
      </div>

      {/* Chapter Overall Note Drawer */}
      {showChapterNote && (
        <div className="chapter-general-note-bar">
          <div className="cgn-header">
            <span className="cgn-title">
              {chapter.num}. Genel Koordinasyon & Metodoloji Notları
            </span>
            <button 
              type="button" 
              className="cgn-close" 
              onClick={() => setShowChapterNote(false)}
            >
              Kapat
            </button>
          </div>
          <textarea
            className="cgn-textarea"
            placeholder="Bu ana bölüm için genel araştırma kapsamı, veri kaynakları, İBB birimleri protokolleri veya çalışma takvimi notlarını girin…"
            value={chapterNotes || ''}
            onChange={e => onUpdateChapterNotes(chapter.num, e.target.value)}
          />
        </div>
      )}

      {/* Chapter Body Table - Clean & Streamlined */}
      {!isCollapsed && (
        <div className="chapter-body">
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: '85px' }}>Kod</th>
                  <th>Başlık / Alt Başlıklar</th>
                  <th style={{ width: '230px' }}>Rapor Durumu</th>
                  <th style={{ width: '130px' }}>İlerleme</th>
                  <th style={{ width: '170px' }}>Sorumlu Yazar</th>
                </tr>
              </thead>
              <tbody>
                {sectionGroups.map((group) => {
                  const isGroupCollapsed = !!collapsedGroups[group.groupCode];

                  // Calculate group statistics if it is a parent group
                  let groupTotalAnalyses = 0;
                  let groupCompletedAnalyses = 0;
                  let groupCompletedCount = 0;
                  let groupProgressSum = 0;

                  group.items.forEach(item => {
                    const st = getStatus(item);
                    if (st.status === 'completed' || st.status === 'mavi_depoda_guncel' || st.status === 'mavi_depoya_gidebilir' || st.progress >= 98) {
                      groupCompletedCount++;
                    }
                    groupProgressSum += typeof st.progress === 'number' ? st.progress : (STATUS_PROGRESS_MAP[st.status] ?? 0);
                    (item.analizler || []).forEach(an => {
                      groupTotalAnalyses++;
                      const aSt = analysisStatuses[an.id] || an.status;
                      if (aSt === 'Tamamlandı') groupCompletedAnalyses++;
                    });
                  });

                  const groupProgress = group.items.length > 0 ? Math.round(groupProgressSum / group.items.length) : 0;

                  return (
                    <React.Fragment key={`group_${group.groupCode}`}>
                      {/* 2. Düzey Başlık Çubuğu (Örn: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2 vb.) - Tıklanabilir & Katlanabilir */}
                      {group.isParentGroup && (
                        <tr 
                          className={`section-group-header-row ${isGroupCollapsed ? 'is-collapsed' : 'is-expanded'}`}
                          onClick={() => toggleGroupCollapse(group.groupCode)}
                          title={`${group.groupTitle} alt başlıklarını ${isGroupCollapsed ? 'genişletmek' : 'daraltmak'} için tıklayın`}
                        >
                          <td colSpan={5} className="section-group-header-cell">
                            <div className="sgh-content">
                              <div className="sgh-left">
                                <span className="sgh-code-badge">{group.groupCode}</span>
                                <span className="sgh-title">{group.groupTitle}</span>
                                <span className="sgh-count-pill">
                                  {group.items.length} Alt Başlık
                                  {groupTotalAnalyses > 0 ? ` · ${groupCompletedAnalyses}/${groupTotalAnalyses} Mekânsal Analiz` : ''}
                                </span>
                              </div>
                              <div className="sgh-right">
                                <div className="sgh-progress-wrap">
                                  <span className="sgh-prog-text">{groupCompletedCount}/{group.items.length} Tamamlandı</span>
                                  <div className="sgh-mini-track">
                                    <span 
                                      style={{ 
                                        width: `${groupProgress}%`, 
                                        background: groupProgress === 100 ? 'var(--ok)' : 'var(--brand-accent)' 
                                      }} 
                                    />
                                  </div>
                                </div>
                                <span className="sgh-collapse-hint">
                                  {isGroupCollapsed ? 'Genişlet' : 'Daralt'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* 3. Düzey Alt Başlık Satırları (Örn: 3.1.1, 3.1.2) veya Bağımsız 2. Düzey Satırları (1.1, 3.6 vb.) - Grup açıkken gösterilir */}
                      {(!group.isParentGroup || !isGroupCollapsed) && group.items.map((item, idx) => {
                        const id = getItemId(item);
                        const st = getStatus(item);
                        const isDetailOpen = !!expandedDetails[id];
                        const analyses = item.analizler || [];
                        const hasAnalyses = analyses.length > 0;
                        const analysesDoneCount = analyses.filter(a => (analysisStatuses[a.id] || a.status) === 'Tamamlandı').length;
                        const hasChildren = group.items.some(i => i.code.startsWith(item.code + '.') && i.code !== item.code);
                        
                        // Find parent code, e.g. '3.2.1' for '3.2.1.1'
                        const parts = item.code.split('.');
                        let isHiddenByParent = false;
                        for (let i = parts.length - 1; i > 1; i--) {
                          const pCode = parts.slice(0, i).join('.');
                          if (collapsedGroups[pCode]) {
                            isHiddenByParent = true;
                            break;
                          }
                        }
                        
                        if (isHiddenByParent) return null;


                        return (
                          <React.Fragment key={item.id || item.code || idx}>
                            <tr 
                              className={`sub-section-row ${group.isParentGroup ? 'is-sub-row' : 'is-root-row'} ${st.progress === 100 || st.status === 'mavi_depoda_guncel' ? 'row-completed' : ''} ${isDetailOpen ? 'row-expanded-active' : ''} ${(analyses.length > 0 || hasChildren) ? 'is-clickable' : ''}`}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest('select, input, textarea, button, a')) return;
                                if (analyses.length > 0) {
                                  toggleDetail(id);
                                } else if (hasChildren) {
                                  toggleGroupCollapse(item.code);
                                }
                              }}
                              title={analyses.length > 0 ? `${item.title} analizlerini ${isDetailOpen ? 'kapatmak' : 'görmek'} için tıklayın` : (hasChildren ? `Alt başlıkları ${collapsedGroups[item.code] ? 'genişletmek' : 'daraltmak'} için tıklayın` : undefined)}
                            >
                              {/* Kod */}
                              <td className="sec-code" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: `${(parts.length - 2) * 24}px`, flexShrink: 0 }} />
                                <div style={{ width: '20px', display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                                  {hasChildren && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleGroupCollapse(item.code);
                                      }}
                                      style={{
                                        background: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-light)',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        padding: '0',
                                        color: 'var(--text-main)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      {collapsedGroups[item.code] ? '▶' : '▼'}
                                    </button>
                                  )}
                                </div>
                                <span className={`sec-code-badge ${group.isParentGroup ? 'sub-code-badge' : 'main-code-badge'}`}>
                                  {item.code}
                                </span>
                              </td>

                              {/* Başlık */}
                              <td className="sec-title-cell">
                                <div className="sub-title-main">
                                  <span className="sub-title-text">{item.title}</span>
                                  {item.isCustom && (
                                    <span className="custom-tag">Eklenen</span>
                                  )}
                                  {analyses.length > 0 && (
                                    <span
                                      className={`inline-analysis-count-badge ${isDetailOpen ? 'is-open' : ''}`}
                                    >
                                      {analysesDoneCount}/{analyses.length} Analiz {isDetailOpen ? '▲' : '▼'}
                                    </span>
                                  )}
                                  {item.isCustom && (
                                    <button
                                      type="button"
                                      className="action-btn delete-btn"
                                      title="Bu başlığı sil"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`"${item.title}" başlığı silinsin mi?`)) {
                                          onDeleteSubSection(id, item.customId);
                                        }
                                      }}
                                    >
                                      Sil
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* Rapor Durumu */}
                              <td>
                                <select
                                  className={`report-status-select st-${st.status}`}
                                  value={st.status}
                                  onChange={e => {
                                    const newSt = e.target.value as ReportStatusType;
                                    const autoProg = STATUS_PROGRESS_MAP[newSt] ?? 0;
                                    onUpdateStatus(id, { 
                                      status: newSt,
                                      progress: autoProg
                                    });
                                  }}
                                >
                                  {(hasAnalyses ? SPATIAL_STATUS_KEYS : NON_SPATIAL_STATUS_KEYS).map(k => (
                                    <option key={k} value={k}>{getStatusLabel(k, hasAnalyses)}</option>
                                  ))}
                                </select>
                              </td>

                              {/* İlerleme Sütunu (Otomatik Yüzde & İlerleme Çubuğu) */}
                              <td>
                                <div className="progress-display-cell">
                                  <div className="pdc-bar-wrap">
                                    <span className="pdc-percent">%{st.progress ?? (STATUS_PROGRESS_MAP[st.status] ?? 0)}</span>
                                    <div className="pdc-track">
                                      <div 
                                        className="pdc-fill" 
                                        style={{ 
                                          width: `${st.progress ?? (STATUS_PROGRESS_MAP[st.status] ?? 0)}%`,
                                          background: 
                                            (st.progress >= 98 || st.status === 'mavi_depoda_guncel' || st.status === 'mavi_depoya_gidebilir') ? 'var(--ok)' :
                                            st.progress >= 80 ? 'var(--status-review)' :
                                            st.progress >= 40 ? 'var(--status-draft)' : 'var(--line-strong)'
                                        }} 
                                      />
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Sorumlu Yazar */}
                              <td>
                                <div className="author-input-wrapper">
                                  <input
                                    type="text"
                                    className="author-input"
                                    placeholder="Yazar ekle…"
                                    value={st.author || ''}
                                    onChange={e => onUpdateStatus(id, { author: e.target.value })}
                                  />
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Detail Drawer (Tıklandığında SADECE Analizler Gösterilir) */}
                            {isDetailOpen && analyses.length > 0 && (
                              <tr className="note-expanded-row">
                                <td colSpan={5}>
                                  <div className="detail-expanded-panel compact-analyses-panel">
                                    {/* Top Bar with metadata */}
                                    <div className="dep-top-bar">
                                      <div className="dep-top-left">
                                        <span className="dep-code-pill">{item.code}</span>
                                        <h4 className="dep-item-title">{item.title} — Mekânsal ve CBS Analizleri</h4>
                                      </div>
                                      <div className="dep-top-right">
                                        <span className="dep-analyses-count-pill">
                                          {analysesDoneCount} / {analyses.length} Tamamlandı
                                        </span>
                                      </div>
                                    </div>

                                    {/* Sadece Mekânsal ve CBS Analizleri Izgarası */}
                                    <div className="dep-analyses-grid-compact">
                                      {analyses.map(an => {
                                        const currentStatus = analysisStatuses[an.id] || an.status;
                                        return (
                                          <div 
                                            key={an.id} 
                                            className={`dep-analysis-card status-${currentStatus}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const nextSt = 
                                                currentStatus === 'Tamamlandı' ? 'Devam Ediyor' :
                                                currentStatus === 'Devam Ediyor' ? 'Başlamadı' :
                                                currentStatus === 'Başlamadı' ? 'Tamamlandı' : 'Tamamlandı';
                                              onUpdateAnalysisStatus(an.id, nextSt);
                                            }}
                                            title="Durumu değiştirmek için tıklayın (Tamamlandı / Devam Ediyor / Başlamadı)"
                                          >
                                            <div className="dac-head">
                                              <span className="dac-name">{an.name}</span>
                                              <span className={`dac-badge st-${currentStatus}`}>{currentStatus}</span>
                                            </div>
                                            {an.category && (
                                              <span className="dac-category">{an.category}</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
