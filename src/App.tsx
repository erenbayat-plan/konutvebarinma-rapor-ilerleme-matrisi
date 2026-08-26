import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  KONUT_BARINMA_CHAPTERS, 
  POLITIKA_YATIRIM_CHAPTERS,
  REPORT_STATUS_LABEL, 
  REPORT_STATUS_SHORT_LABEL,
  STATUS_PROGRESS_MAP,
  computeAutoStatusForAnalyses,
  SPATIAL_STATUS_KEYS,
  NON_SPATIAL_STATUS_KEYS,
  getStatusLabel,
  ReportStatusType,
  ReportItem, 
  ReportChapterGroup 
} from './reportData';
import { 
  fetchGlobalCloudState, 
  pushGlobalCloudState, 
  queueGlobalCloudPush, 
  subscribeToTabBroadcast, 
  subscribeToCloudState, 
  AppState,
  ReportStatusItem,
  CustomSubSection
} from './syncService';
import { ReportStats } from './components/ReportStats';
import { ChapterCard } from './components/ChapterCard';
import { ExportModal } from './components/ExportModal';
import { HeaderCountdown } from './components/HeaderCountdown';

const REPORT_STATUS_KEY = 'plan2050_kb_report_status_v2';
const CUSTOM_ITEMS_KEY = 'plan2050_kb_custom_items_v2';
const CHAPTER_NOTES_KEY = 'plan2050_kb_chapter_notes_v2';
const ANALYSIS_STATUS_KEY = 'plan2050_kb_analysis_statuses_v2';

export default function App() {
  // Primary persistent state
  const [reportStatus, setReportStatus] = useState<Record<string, ReportStatusItem>>(() => {
    try {
      const saved = localStorage.getItem(REPORT_STATUS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [analysisStatuses, setAnalysisStatuses] = useState<Record<string, 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede'>>(() => {
    try {
      const saved = localStorage.getItem(ANALYSIS_STATUS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [customItems, setCustomItems] = useState<Record<string, CustomSubSection[]>>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_ITEMS_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [chapterNotes, setChapterNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(CHAPTER_NOTES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('all');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [analysisFilter, setAnalysisFilter] = useState<string>('all');
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mevcut_durum' | 'politika'>('mevcut_durum');
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'connected'>('connected');

  const currentChapters = activeTab === 'mevcut_durum' ? KONUT_BARINMA_CHAPTERS : POLITIKA_YATIRIM_CHAPTERS;

  const localVersionRef = useRef(0);
  const isEditingRef = useRef(false);

  // Save to localStorage immediately
  useEffect(() => {
    try {
      localStorage.setItem(REPORT_STATUS_KEY, JSON.stringify(reportStatus));
    } catch (e) { console.error(e); }
  }, [reportStatus]);

  useEffect(() => {
    try {
      localStorage.setItem(ANALYSIS_STATUS_KEY, JSON.stringify(analysisStatuses));
    } catch (e) { console.error(e); }
  }, [analysisStatuses]);

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(customItems));
    } catch (e) { console.error(e); }
  }, [customItems]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAPTER_NOTES_KEY, JSON.stringify(chapterNotes));
    } catch (e) { console.error(e); }
  }, [chapterNotes]);

  // Real-time Cloud Sync & Multi-tab Sync
  useEffect(() => {
    let isMounted = true;

    const applyCloudState = (cloudData: AppState) => {
      if (!isMounted || isEditingRef.current) return;
      if (cloudData.lastUpdated && cloudData.lastUpdated < localVersionRef.current) return;

      if (cloudData.reportStatus) {
        setReportStatus(prev => JSON.stringify(prev) !== JSON.stringify(cloudData.reportStatus) ? cloudData.reportStatus! : prev);
      }
      if (cloudData.analysisStatuses) {
        setAnalysisStatuses(prev => JSON.stringify(prev) !== JSON.stringify(cloudData.analysisStatuses) ? cloudData.analysisStatuses! : prev);
      }
      if (cloudData.customSubSections) {
        setCustomItems(prev => JSON.stringify(prev) !== JSON.stringify(cloudData.customSubSections) ? cloudData.customSubSections! : prev);
      }
      if (cloudData.chapterNotes) {
        setChapterNotes(prev => JSON.stringify(prev) !== JSON.stringify(cloudData.chapterNotes) ? cloudData.chapterNotes! : prev);
      }
      setCloudSyncStatus('synced');
    };

    const unsubscribeTab = subscribeToTabBroadcast((tabState) => {
      if (!isMounted || isEditingRef.current) return;
      if (tabState.reportStatus) setReportStatus(tabState.reportStatus);
      if (tabState.analysisStatuses) setAnalysisStatuses(tabState.analysisStatuses);
      if (tabState.customSubSections) setCustomItems(tabState.customSubSections);
      if (tabState.chapterNotes) setChapterNotes(tabState.chapterNotes);
      setCloudSyncStatus('synced');
    });

    const unsubscribeCloud = subscribeToCloudState(
      applyCloudState,
      () => { if (isMounted) setCloudSyncStatus('connected'); }
    );

    return () => {
      isMounted = false;
      unsubscribeTab();
      unsubscribeCloud();
    };
  }, []);

  const triggerCloudSync = (
    nextReport: Record<string, ReportStatusItem>,
    nextAnalysis: Record<string, 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede'>,
    nextCustom: Record<string, CustomSubSection[]>,
    nextNotes: Record<string, string>
  ) => {
    const newVersion = Date.now();
    localVersionRef.current = newVersion;
    isEditingRef.current = true;
    setCloudSyncStatus('saving');

    queueGlobalCloudPush(
      () => ({
        reportStatus: nextReport,
        analysisStatuses: nextAnalysis,
        customSubSections: nextCustom,
        chapterNotes: nextNotes,
        lastUpdated: newVersion
      }),
      (status) => {
        setCloudSyncStatus(status === 'saving' ? 'saving' : 'synced');
        setTimeout(() => {
          isEditingRef.current = false;
        }, 1000);
      }
    );
  };

  const getItemId = (item: ReportItem) => item.id || `konut_${item.code.replace(/\./g, '_')}`;

  const handleUpdateStatus = (id: string, updates: Partial<ReportStatusItem>) => {
    const current = reportStatus[id] || { status: 'not_started', progress: 0, author: '', targetPages: '', note: '', driveLink: '' };
    const updated = { ...reportStatus, [id]: { ...current, ...updates } };
    setReportStatus(updated);
    triggerCloudSync(updated, analysisStatuses, customItems, chapterNotes);
  };

  const handleUpdateAnalysisStatus = (analysisId: string, status: 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede') => {
    const updatedAnalysis = { ...analysisStatuses, [analysisId]: status };
    setAnalysisStatuses(updatedAnalysis);

    // Find parent report item that contains this analysis
    let parentItem: ReportItem | null = null;
    for (const ch of [...KONUT_BARINMA_CHAPTERS, ...POLITIKA_YATIRIM_CHAPTERS]) {
      for (const it of ch.items) {
        if (it.analizler && it.analizler.some(a => a.id === analysisId)) {
          parentItem = it;
          break;
        }
      }
      if (parentItem) break;
    }

    let nextReportStatus = reportStatus;

    if (parentItem && parentItem.analizler && parentItem.analizler.length > 0) {
      const parentId = getItemId(parentItem);
      const currentParent = reportStatus[parentId];
      const auto = computeAutoStatusForAnalyses(parentItem.analizler, updatedAnalysis);

      // Kural: %70'in üstü (80, 85, 95, 98, 100) manuel kontrol edilebilir.
      // Eğer mevcut durum manuel olarak %70'in üzerine çıkarılmışsa otomatik olarak düşürülmez.
      // %70 ve altındaki durumlarda analizlerin durumuna göre otomatik atanır.
      const currentProg = currentParent?.progress ?? (STATUS_PROGRESS_MAP[currentParent?.status as ReportStatusType] ?? 0);
      const isManualOver70 = currentProg > 70;

      if (!isManualOver70) {
        const currentData = currentParent || {
          status: auto.status,
          progress: auto.progress,
          author: '',
          targetPages: parentItem.defaultPages || '',
          note: '',
          driveLink: ''
        };
        nextReportStatus = {
          ...reportStatus,
          [parentId]: {
            ...currentData,
            status: auto.status,
            progress: auto.progress
          }
        };
        setReportStatus(nextReportStatus);
      }
    }

    triggerCloudSync(nextReportStatus, updatedAnalysis, customItems, chapterNotes);
  };

  const handleAddSubSection = (
    chapterNum: string, 
    title: string, 
    code: string, 
    scope?: string, 
    pages?: string, 
    level2?: string,
    level3?: string,
    level4?: string,
    sartnameUyum?: string
  ) => {
    const newSub: CustomSubSection = {
      id: `custom_${Date.now()}`,
      chapterNum,
      code,
      title,
      level2,
      level3,
      level4,
      sartnameUyum,
      scope: scope || '',
      defaultPages: pages || '8-10 sf'
    };
    const currentList = customItems[chapterNum] || [];
    const updatedList = [...currentList, newSub];
    const updatedCustoms = { ...customItems, [chapterNum]: updatedList };
    setCustomItems(updatedCustoms);

    const id = `konut_${code.replace(/\./g, '_')}`;
    const updatedReport = {
      ...reportStatus,
      [id]: {
        status: 'not_started' as const,
        progress: 0,
        author: '',
        targetPages: pages || '8-10 sf',
        note: '',
        driveLink: ''
      }
    };
    setReportStatus(updatedReport);
    triggerCloudSync(updatedReport, analysisStatuses, updatedCustoms, chapterNotes);
  };

  const handleDeleteSubSection = (id: string, customId?: string) => {
    if (!customId) return;
    const nextCustoms: Record<string, CustomSubSection[]> = {};
    Object.keys(customItems).forEach(chNum => {
      nextCustoms[chNum] = (customItems[chNum] || []).filter(sub => sub.id !== customId);
    });
    setCustomItems(nextCustoms);

    const nextReport = { ...reportStatus };
    delete nextReport[id];
    setReportStatus(nextReport);

    triggerCloudSync(nextReport, analysisStatuses, nextCustoms, chapterNotes);
  };

  const handleUpdateChapterNotes = (chapterNum: string, note: string) => {
    const updatedNotes = { ...chapterNotes, [chapterNum]: note };
    setChapterNotes(updatedNotes);
    triggerCloudSync(reportStatus, analysisStatuses, customItems, updatedNotes);
  };

  const handleResetAll = () => {
    setReportStatus({});
    setAnalysisStatuses({});
    setCustomItems({});
    setChapterNotes({});
    try {
      localStorage.removeItem(REPORT_STATUS_KEY);
      localStorage.removeItem(ANALYSIS_STATUS_KEY);
      localStorage.removeItem(CUSTOM_ITEMS_KEY);
      localStorage.removeItem(CHAPTER_NOTES_KEY);
    } catch {}
    triggerCloudSync({}, {}, {}, {});
  };

  const handleToggleCollapse = (chapterNum: string) => {
    setCollapsedChapters(prev => ({
      ...prev,
      [chapterNum]: !prev[chapterNum]
    }));
  };

  const handleExpandAll = () => {
    setCollapsedChapters({});
  };

  const handleCollapseAll = () => {
    const all: Record<string, boolean> = {};
    currentChapters.forEach(ch => {
      all[ch.num] = true;
    });
    setCollapsedChapters(all);
  };

  // Distinct authors list for filter
  const distinctAuthors = useMemo(() => {
    const set = new Set<string>();
    Object.values(reportStatus).forEach((item: ReportStatusItem) => {
      if (item && item.author && item.author.trim()) {
        set.add(item.author.trim());
      }
    });
    return Array.from(set).sort();
  }, [reportStatus]);

  // Helper to calculate stats for a list of chapters
  const calculateStatsForChapters = (chapters: typeof KONUT_BARINMA_CHAPTERS) => {
    let total = 0;
    let sumProgress = 0;
    let totalEstimatedPages = 0;
    let totalAnalyses = 0;
    let completedAnalyses = 0;
    let draftingAnalyses = 0;

    let maviDepodaGuncel = 0;
    let maviDepoyaGidebilir = 0;
    let raporOkunduEA = 0;
    let raporOkunduSidar = 0;
    let raporaYazildi = 0;
    let tamamlandiRaporuYazilabilir = 0;
    let analizTamamlandi = 0;
    let analizDevamEdiyor = 0;
    let baslanmadi = 0;
    let nmKontrolTamamlandi = 0;
    let nmYazildiKontrolBekliyor = 0;
    let nmYaziliyor = 0;

    chapters.forEach(ch => {
      const defaultItems = ch.items || [];
      const customs = customItems[ch.num] || [];
      
      const allItems: ReportItem[] = [
        ...defaultItems,
        ...customs.map(c => ({
          id: `custom_${c.id}`,
          level1: `${ch.num}. ${ch.title}`,
          level1Num: ch.num,
          level2: c.level2,
          level3: c.level3,
          level4: c.level4,
          code: c.code,
          title: c.title,
          sartnameUyum: c.sartnameUyum,
          icerikOzeti: c.scope,
          defaultPages: c.defaultPages || '8-10 sf'
        }))
      ];

      const getItemStatusAndProgress = (item: ReportItem): { status: ReportStatusType; progress: number } => {
        const children = allItems.filter(i => i.code.startsWith(item.code + '.') && i.code !== item.code);
        const hasChildren = children.length > 0;

        if (hasChildren) {
          const parentPartsLength = item.code.split('.').length;
          const directChildren = children.filter(c => c.code.split('.').length === parentPartsLength + 1);
          const targets = directChildren.length > 0 ? directChildren : children;

          let sumProgress = 0;
          let count = 0;
          targets.forEach(child => {
            const childSt = getItemStatusAndProgress(child);
            sumProgress += childSt.progress;
            count++;
          });

          const progress = count > 0 ? Math.round(sumProgress / count) : 0;
          const hasAnalyses = (item.analizler && item.analizler.length > 0) || targets.some(c => c.analizler && c.analizler.length > 0);
          
          const getAutoStatusFromProgress = (p: number, isSpatial: boolean): ReportStatusType => {
            if (p >= 100) return 'mavi_depoda_guncel';
            if (p >= 98) return isSpatial ? 'mavi_depoya_gidebilir' : 'mavi_depoda_guncel';
            if (p >= 85) return isSpatial ? 'rapor_okundu_sidar' : 'nm_kontrol_tamamlandi';
            if (p >= 75) return isSpatial ? 'rapora_yazildi' : 'nm_kontrol_tamamlandi';
            if (p >= 50) return isSpatial ? 'tamamlandi_raporu_yazilabilir' : 'nm_yazildi_kontrol_bekliyor';
            if (p >= 25) return isSpatial ? 'analiz_tamamlandi' : 'nm_yaziliyor';
            if (p > 0) return isSpatial ? 'analiz_devam_ediyor' : 'nm_yaziliyor';
            return 'baslanmadi';
          };

          return {
            status: getAutoStatusFromProgress(progress, hasAnalyses),
            progress
          };
        }

        const id = getItemId(item);
        const rawStatus = reportStatus[id];
        if (rawStatus) {
          return {
            status: rawStatus.status,
            progress: rawStatus.progress ?? (STATUS_PROGRESS_MAP[rawStatus.status] ?? 0)
          };
        } else if (item.analizler && item.analizler.length > 0) {
          const auto = computeAutoStatusForAnalyses(item.analizler, analysisStatuses);
          return {
            status: auto.status,
            progress: auto.progress
          };
        } else {
          const status = item.defaultStatus || 'baslanmadi';
          return {
            status,
            progress: STATUS_PROGRESS_MAP[status] ?? 0
          };
        }
      };

      allItems.forEach(item => {
        total++;
        const id = getItemId(item);
        const rawStatus = reportStatus[id];
        
        const computed = getItemStatusAndProgress(item);
        const itemStatusType = computed.status;
        const itemProgress = computed.progress;

        const itemState = rawStatus || {
          status: itemStatusType,
          progress: itemProgress,
          author: '',
          targetPages: item.defaultPages || ''
        };

        // Classify statuses
        if (itemStatusType === 'mavi_depoda_guncel' || itemStatusType === 'completed') {
          maviDepodaGuncel++;
        } else if (itemStatusType === 'mavi_depoya_gidebilir') {
          maviDepoyaGidebilir++;
        } else if (itemStatusType === 'rapor_okundu_ea') {
          raporOkunduEA++;
        } else if (itemStatusType === 'rapor_okundu_sidar' || itemStatusType === 'review') {
          raporOkunduSidar++;
        } else if (itemStatusType === 'rapora_yazildi') {
          raporaYazildi++;
        } else if (itemStatusType === 'tamamlandi_raporu_yazilabilir') {
          tamamlandiRaporuYazilabilir++;
        } else if (itemStatusType === 'analiz_tamamlandi') {
          analizTamamlandi++;
        } else if (itemStatusType === 'analiz_devam_ediyor' || itemStatusType === 'drafting') {
          analizDevamEdiyor++;
        } else if (itemStatusType === 'nm_kontrol_tamamlandi') {
          nmKontrolTamamlandi++;
        } else if (itemStatusType === 'nm_yazildi_kontrol_bekliyor') {
          nmYazildiKontrolBekliyor++;
        } else if (itemStatusType === 'nm_yaziliyor') {
          nmYaziliyor++;
        } else {
          baslanmadi++;
        }

        sumProgress += itemProgress;

        const pagesStr = itemState.targetPages || item.defaultPages || '8';
        const numMatches = pagesStr.match(/\d+/g);
        if (numMatches && numMatches.length > 0) {
          const avg = numMatches.reduce((a, b) => a + parseInt(b, 10), 0) / numMatches.length;
          totalEstimatedPages += Math.round(avg);
        } else {
          totalEstimatedPages += 8;
        }

        // Analyses
        (item.analizler || []).forEach(an => {
          totalAnalyses++;
          const anSt = analysisStatuses[an.id] || an.status;
          if (anSt === 'Tamamlandı') completedAnalyses++;
          else if (anSt === 'Devam Ediyor') draftingAnalyses++;
        });
      });
    });

    const totalProgress = total > 0 ? Math.round(sumProgress / total) : 0;
    return {
      total,
      totalProgress,
      totalEstimatedPages,
      authorsCount: distinctAuthors.length,
      totalAnalyses,
      completedAnalyses,
      draftingAnalyses,
      maviDepodaGuncel,
      maviDepoyaGidebilir,
      raporOkunduEA,
      raporOkunduSidar,
      raporaYazildi,
      tamamlandiRaporuYazilabilir,
      analizTamamlandi,
      analizDevamEdiyor,
      baslanmadi,
      nmKontrolTamamlandi,
      nmYazildiKontrolBekliyor,
      nmYaziliyor
    };
  };

  const mevcutStats = useMemo(() => {
    return calculateStatsForChapters(KONUT_BARINMA_CHAPTERS);
  }, [reportStatus, analysisStatuses, customItems, distinctAuthors]);

  const politikaStats = useMemo(() => {
    return calculateStatsForChapters(POLITIKA_YATIRIM_CHAPTERS);
  }, [reportStatus, analysisStatuses, customItems, distinctAuthors]);

  const overallStats = activeTab === 'mevcut_durum' ? mevcutStats : politikaStats;

  // Filter Chapters & Items
  const filteredChapters = useMemo(() => {
    return currentChapters.map(ch => {
      if (selectedChapterFilter !== 'all' && ch.num !== selectedChapterFilter) {
        return null;
      }

      const defaultItems = (ch.items || []).map(s => ({ ...s, isCustom: false }));
      const customs = (customItems[ch.num] || []).map(s => ({
        id: `custom_${s.id}`,
        level1: `${ch.num}. ${ch.title}`,
        level1Num: ch.num,
        level2: s.level2,
        level3: s.level3,
        level4: s.level4,
        code: s.code,
        title: s.title,
        sartnameUyum: s.sartnameUyum,
        icerikOzeti: s.scope,
        defaultPages: s.defaultPages || '8-10 sf',
        isCustom: true,
        customId: s.id
      }));

      let allItems = [...defaultItems, ...customs];

      if (searchTerm) {
        const sLower = searchTerm.toLowerCase();
        allItems = allItems.filter(item => {
          const id = getItemId(item);
          const st = reportStatus[id] || { author: '', note: '', driveLink: '' };
          const analysesMatches = (item.analizler || []).some(a => a.name.toLowerCase().includes(sLower) || (a.category && a.category.toLowerCase().includes(sLower)));
          return (
            item.code.toLowerCase().includes(sLower) ||
            item.title.toLowerCase().includes(sLower) ||
            (item.level2 && item.level2.toLowerCase().includes(sLower)) ||
            (item.level3 && item.level3.toLowerCase().includes(sLower)) ||
            (item.level4 && item.level4.toLowerCase().includes(sLower)) ||
            (item.icerikOzeti && item.icerikOzeti.toLowerCase().includes(sLower)) ||
            (item.sartnameUyum && item.sartnameUyum.toLowerCase().includes(sLower)) ||
            (st.author && st.author.toLowerCase().includes(sLower)) ||
            (st.note && st.note.toLowerCase().includes(sLower)) ||
            analysesMatches ||
            ch.title.toLowerCase().includes(sLower)
          );
        });
      }

      if (statusFilter !== 'all') {
        allItems = allItems.filter(item => {
          const id = getItemId(item);
          const rawStatus = reportStatus[id];
          let currentSt: ReportStatusType;
          if (rawStatus) {
            currentSt = rawStatus.status;
          } else if (item.analizler && item.analizler.length > 0) {
            currentSt = computeAutoStatusForAnalyses(item.analizler, analysisStatuses).status;
          } else {
            currentSt = item.defaultStatus || 'baslanmadi';
          }
          return currentSt === statusFilter;
        });
      }

      if (authorFilter !== 'all') {
        allItems = allItems.filter(item => {
          const id = getItemId(item);
          const st = reportStatus[id] || { author: '' };
          return (st.author || '').trim().toLowerCase() === authorFilter.toLowerCase();
        });
      }

      if (analysisFilter !== 'all') {
        allItems = allItems.filter(item => {
          if (analysisFilter === 'has_analyses') {
            return (item.analizler || []).length > 0;
          }
          if (analysisFilter === 'analyses_done') {
            const anList = item.analizler || [];
            return anList.length > 0 && anList.every(an => (analysisStatuses[an.id] || an.status) === 'Tamamlandı');
          }
          if (analysisFilter === 'analyses_pending') {
            const anList = item.analizler || [];
            return anList.length > 0 && anList.some(an => (analysisStatuses[an.id] || an.status) !== 'Tamamlandı');
          }
          return true;
        });
      }

      if (allItems.length === 0 && (searchTerm || statusFilter !== 'all' || authorFilter !== 'all' || analysisFilter !== 'all')) {
        return null;
      }

      return {
        chapter: ch,
        items: allItems
      };
    }).filter(Boolean) as { chapter: ReportChapterGroup; items: (ReportItem & { isCustom?: boolean; customId?: string })[] }[];
  }, [activeTab, currentChapters, selectedChapterFilter, customItems, searchTerm, statusFilter, authorFilter, analysisFilter, reportStatus, analysisStatuses]);

  return (
    <div className="portal-container" id="konut-portal-app">
      {/* Top Application Toolbar */}
      <header className="portal-toolbar">
        <div className="toolbar-main-brand">
          <div className="brand-titles">
            <div className="brand-primary-row">
              <h1 className="brand-name">Konut ve Barınma Rapor Çatkısı</h1>
              <span className="brand-env-badge">İSTANBUL PLAN 2050</span>
            </div>
            <span className="brand-subtitle">
              İstanbul 2050 Çevre Düzeni Planı · Rapor ve Mekânsal Analiz Takip Matrisi
            </span>
          </div>
        </div>

        {/* Top Right Action Menu */}
        <div className="toolbar-right-actions">
          {/* Geri Sayım Sayacı (Haftasonları Dahil) */}
          <HeaderCountdown />

          <button 
            type="button" 
            className="action-pill-btn btn-export"
            onClick={() => setIsExportOpen(true)}
            title="CSV Matrisi İndir, Raporu Yazdır veya Özet Paylaş"
          >
            <span>Matrisi Dışa Aktar</span>
          </button>
        </div>
      </header>
      
      <div className="portal-tabs-bar">
        <button 
          className={`portal-tab-btn ${activeTab === 'mevcut_durum' ? 'active tab-indigo' : ''}`}
          onClick={() => { setActiveTab('mevcut_durum'); setSelectedChapterFilter('all'); }}
        >
          <span className="tab-title">Konut ve Barınma Alanlarının Mevcut Durumu</span>
          <span className="tab-progress-badge indigo-badge">%{mevcutStats.totalProgress}</span>
        </button>
        <button 
          className={`portal-tab-btn ${activeTab === 'politika' ? 'active tab-amber' : ''}`}
          onClick={() => { setActiveTab('politika'); setSelectedChapterFilter('all'); }}
        >
          <span className="tab-title">Politikalar, Yatırımlar ve Teşviklerin Etkisi</span>
          <span className="tab-progress-badge amber-badge">%{politikaStats.totalProgress}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <main className="portal-main-content">


        {/* Executive Stats Bar */}
        <ReportStats stats={overallStats} />

        {/* Filter & Controls Toolbar */}
        <div className="control-filter-bar">
          <div className="cf-search-box">
            <input
              type="text"
              placeholder="Bölüm başlığı, şartname maddesi, analiz adı veya notlarda ara…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button" 
                className="cf-clear-btn" 
                onClick={() => setSearchTerm('')}
                title="Aramayı Temizle"
              >
                Temizle
              </button>
            )}
          </div>

          <div className="cf-dropdown-group">
            {/* Status Filter */}
            <div className="cf-select-wrap">
              <span className="cf-select-label">Rapor Durumu:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="cf-select"
              >
                <option value="all">Tüm Durumlar ({overallStats.total})</option>
                {[...new Set([...SPATIAL_STATUS_KEYS, ...NON_SPATIAL_STATUS_KEYS])].map(k => (
                  <option key={k} value={k}>{getStatusLabel(k, SPATIAL_STATUS_KEYS.includes(k))}</option>
                ))}
              </select>
            </div>

            {/* Analysis Filter */}
            <div className="cf-select-wrap">
              <span className="cf-select-label">Mekânsal Analiz:</span>
              <select
                value={analysisFilter}
                onChange={e => setAnalysisFilter(e.target.value)}
                className="cf-select"
              >
                <option value="all">Tüm Başlıklar</option>
                <option value="has_analyses">CBS Analizi İçerenler</option>
                <option value="analyses_done">Analizleri Tamamlananlar</option>
                <option value="analyses_pending">Analizi Bekleyenler</option>
              </select>
            </div>

            {/* Chapter Quick Filter */}
            <div className="cf-select-wrap">
              <span className="cf-select-label">Bölüm:</span>
              <select
                value={selectedChapterFilter}
                onChange={e => setSelectedChapterFilter(e.target.value)}
                className="cf-select"
              >
                <option value="all">Tüm Bölümler ({currentChapters.length})</option>
                {currentChapters.map(ch => (
                  <option key={ch.num} value={ch.num}>{ch.num}. {ch.title.slice(0, 38)}…</option>
                ))}
              </select>
            </div>

            {/* Author Filter */}
            {distinctAuthors.length > 0 && (
              <div className="cf-select-wrap">
                <span className="cf-select-label">Yazar:</span>
                <select
                  value={authorFilter}
                  onChange={e => setAuthorFilter(e.target.value)}
                  className="cf-select"
                >
                  <option value="all">Tüm Yazarlar</option>
                  {distinctAuthors.map(auth => (
                    <option key={auth} value={auth}>{auth}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="cf-expand-actions">
            <button
              type="button"
              className="cf-btn-text"
              onClick={handleExpandAll}
              title="Tüm Bölümleri Aç"
            >
              Tümünü Aç
            </button>
            <button
              type="button"
              className="cf-btn-text"
              onClick={handleCollapseAll}
              title="Tüm Bölümleri Kapat"
            >
              Tümünü Daralt
            </button>
          </div>
        </div>



        {/* Chapters Cards List */}
        <div className="chapters-container">
          {filteredChapters.length === 0 ? (
            <div className="empty-results-box">
              <h4>Aramanızla Eşleşen Bölüm veya Analiz Bulunamadı</h4>
              <p>Filtreleri sıfırlayarak tüm Konut ve Barınma rapor çatkısını ve analizlerini görüntüleyebilirsiniz.</p>
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSelectedChapterFilter('all');
                  setAuthorFilter('all');
                  setAnalysisFilter('all');
                }}
              >
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            filteredChapters.map(({ chapter, items }) => (
              <ChapterCard
                key={chapter.num}
                chapter={chapter}
                items={items}
                reportStatus={reportStatus}
                analysisStatuses={analysisStatuses}
                chapterNotes={chapterNotes[chapter.num] || ''}
                isCollapsed={!!collapsedChapters[chapter.num]}
                onToggleCollapse={handleToggleCollapse}
                onUpdateStatus={handleUpdateStatus}
                onUpdateAnalysisStatus={handleUpdateAnalysisStatus}
                onAddSubSection={handleAddSubSection}
                onDeleteSubSection={handleDeleteSubSection}
                onUpdateChapterNotes={handleUpdateChapterNotes}
              />
            ))
          )}
        </div>
      </main>

      {/* Export & Data Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        reportStatus={reportStatus}
        analysisStatuses={analysisStatuses}
        chapterNotes={chapterNotes}
        customSubSections={customItems}
        onResetAll={handleResetAll}
        chapters={currentChapters}
        tabName={activeTab === 'mevcut_durum' ? 'Mevcut_Durum' : 'Politika_Yatirim'}
      />
    </div>
  );
}
