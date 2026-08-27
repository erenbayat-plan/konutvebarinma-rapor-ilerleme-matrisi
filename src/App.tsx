import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  KONUT_BARINMA_CHAPTERS, 
  POLITIKA_YATIRIM_CHAPTERS,
  STATUS_PROGRESS_MAP,
  computeAutoStatusForAnalyses,
  SPATIAL_STATUS_KEYS,
  NON_SPATIAL_STATUS_KEYS,
  getStatusLabel,
  compareHierarchicalCodes,
  ReportStatusType,
  ReportItem, 
  ReportChapterGroup,
  AnalysisItem
} from './reportData';
import { 
  queueGlobalCloudPush, 
  subscribeToTabBroadcast, 
  subscribeToCloudState, 
  AppState,
  ReportStatusItem,
  CustomSubSection,
  SectionOverride
} from './syncService';
import { ReportStats } from './components/ReportStats';
import { ChapterCard } from './components/ChapterCard';
import { ExportModal } from './components/ExportModal';
import { HeaderCountdown } from './components/HeaderCountdown';
import type { HeadingFormData } from './components/HeadingModal';

const REPORT_STATUS_KEY = 'plan2050_kb_report_status_v2';
const CUSTOM_ITEMS_KEY = 'plan2050_kb_custom_items_v2';
const CHAPTER_NOTES_KEY = 'plan2050_kb_chapter_notes_v2';
const ANALYSIS_STATUS_KEY = 'plan2050_kb_analysis_statuses_v2';
const SECTION_OVERRIDES_KEY = 'plan2050_kb_section_overrides_v2';
const CHAPTER_ORDERS_KEY = 'plan2050_kb_chapter_orders_v2';

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

  const [sectionOverrides, setSectionOverrides] = useState<Record<string, SectionOverride>>(() => {
    try {
      const saved = localStorage.getItem(SECTION_OVERRIDES_KEY);
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

  const [chapterOrders, setChapterOrders] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(CHAPTER_ORDERS_KEY);
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
  const [, setCloudSyncStatus] = useState<'synced' | 'saving' | 'connected'>('connected');

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
      localStorage.setItem(SECTION_OVERRIDES_KEY, JSON.stringify(sectionOverrides));
    } catch (e) { console.error(e); }
  }, [sectionOverrides]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAPTER_NOTES_KEY, JSON.stringify(chapterNotes));
    } catch (e) { console.error(e); }
  }, [chapterNotes]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAPTER_ORDERS_KEY, JSON.stringify(chapterOrders));
    } catch (e) { console.error(e); }
  }, [chapterOrders]);

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
      if (cloudData.sectionOverrides) {
        setSectionOverrides(prev => JSON.stringify(prev) !== JSON.stringify(cloudData.sectionOverrides) ? cloudData.sectionOverrides! : prev);
      }
      if (cloudData.chapterNotes) {
        setChapterNotes(prev => JSON.stringify(prev) !== JSON.stringify(cloudData.chapterNotes) ? cloudData.chapterNotes! : prev);
      }
      if (cloudData.chapterOrders) {
        setChapterOrders(prev => JSON.stringify(prev) !== JSON.stringify(cloudData.chapterOrders) ? cloudData.chapterOrders! : prev);
      }
      setCloudSyncStatus('synced');
    };

    const unsubscribeTab = subscribeToTabBroadcast((tabState) => {
      if (!isMounted || isEditingRef.current) return;
      if (tabState.reportStatus) setReportStatus(tabState.reportStatus);
      if (tabState.analysisStatuses) setAnalysisStatuses(tabState.analysisStatuses);
      if (tabState.customSubSections) setCustomItems(tabState.customSubSections);
      if (tabState.sectionOverrides) setSectionOverrides(tabState.sectionOverrides);
      if (tabState.chapterNotes) setChapterNotes(tabState.chapterNotes);
      if (tabState.chapterOrders) setChapterOrders(tabState.chapterOrders);
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
    nextNotes: Record<string, string>,
    nextOverrides: Record<string, SectionOverride>,
    nextOrders: Record<string, string[]> = chapterOrders
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
        sectionOverrides: nextOverrides,
        chapterOrders: nextOrders,
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

  const getItemId = (item: ReportItem, tab: 'mevcut_durum' | 'politika' = activeTab) => {
    if (item.id) return item.id;
    const prefix = tab === 'politika' ? 'pol_' : 'konut_';
    return `${prefix}${item.code.replace(/\./g, '_')}`;
  };

  const getChapterKey = (tab: 'mevcut_durum' | 'politika', chapterNum: string) => `${tab}_${chapterNum}`;

  const getCustomItemsForChapter = (
    customsMap: Record<string, CustomSubSection[]>, 
    tab: 'mevcut_durum' | 'politika', 
    chapterNum: string
  ): CustomSubSection[] => {
    const prefixedKey = `${tab}_${chapterNum}`;
    if (customsMap[prefixedKey]) return customsMap[prefixedKey];
    // Backward compatibility: If no tab-prefixed key exists, check un-prefixed key for 'mevcut_durum'
    if (tab === 'mevcut_durum' && customsMap[chapterNum]) {
      return customsMap[chapterNum];
    }
    return [];
  };

  const getChapterNote = (
    notesMap: Record<string, string>, 
    tab: 'mevcut_durum' | 'politika', 
    chapterNum: string
  ): string => {
    const prefixedKey = `${tab}_${chapterNum}`;
    if (notesMap[prefixedKey] !== undefined) return notesMap[prefixedKey];
    if (tab === 'mevcut_durum' && notesMap[chapterNum] !== undefined) {
      return notesMap[chapterNum];
    }
    return '';
  };

  const getChapterOrder = (
    ordersMap: Record<string, string[]>, 
    tab: 'mevcut_durum' | 'politika', 
    chapterNum: string
  ): string[] => {
    const prefixedKey = `${tab}_${chapterNum}`;
    if (ordersMap[prefixedKey] !== undefined) return ordersMap[prefixedKey];
    if (tab === 'mevcut_durum' && ordersMap[chapterNum] !== undefined) {
      return ordersMap[chapterNum];
    }
    return [];
  };

  const handleUpdateStatus = (id: string, updates: Partial<ReportStatusItem>) => {
    const current = reportStatus[id] || { status: 'not_started', progress: 0, author: '', targetPages: '', note: '', driveLink: '' };
    const updated = { ...reportStatus, [id]: { ...current, ...updates } };
    setReportStatus(updated);
    triggerCloudSync(updated, analysisStatuses, customItems, chapterNotes, sectionOverrides, chapterOrders);
  };

  const handleUpdateAnalysisStatus = (analysisId: string, status: 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede') => {
    const updatedAnalysis = { ...analysisStatuses, [analysisId]: status };
    setAnalysisStatuses(updatedAnalysis);

    let parentItem: ReportItem | null = null;
    let parentReportKey: 'mevcut_durum' | 'politika' = activeTab;

    // Search active report first
    for (const ch of currentChapters) {
      for (const it of ch.items) {
        const itemAnalyses = sectionOverrides[it.id]?.analizler || it.analizler || [];
        if (itemAnalyses.some(a => a.id === analysisId)) {
          parentItem = { ...it, analizler: itemAnalyses };
          parentReportKey = activeTab;
          break;
        }
      }
      if (parentItem) break;
    }

    // Search active report custom items
    if (!parentItem) {
      for (const ch of currentChapters) {
        const list = getCustomItemsForChapter(customItems, activeTab, ch.num);
        for (const sub of list) {
          if (sub.analizler && sub.analizler.some(a => a.id === analysisId)) {
            parentItem = {
              id: sub.id,
              level1: '',
              level1Num: ch.num,
              code: sub.code,
              title: sub.title,
              analizler: sub.analizler
            };
            parentReportKey = activeTab;
            break;
          }
        }
        if (parentItem) break;
      }
    }

    // Fallback: search other report
    if (!parentItem) {
      const otherTab = activeTab === 'mevcut_durum' ? 'politika' : 'mevcut_durum';
      const otherChapters = activeTab === 'mevcut_durum' ? POLITIKA_YATIRIM_CHAPTERS : KONUT_BARINMA_CHAPTERS;
      for (const ch of otherChapters) {
        for (const it of ch.items) {
          const itemAnalyses = sectionOverrides[it.id]?.analizler || it.analizler || [];
          if (itemAnalyses.some(a => a.id === analysisId)) {
            parentItem = { ...it, analizler: itemAnalyses };
            parentReportKey = otherTab;
            break;
          }
        }
        if (parentItem) break;
      }
      if (!parentItem) {
        for (const ch of otherChapters) {
          const list = getCustomItemsForChapter(customItems, otherTab, ch.num);
          for (const sub of list) {
            if (sub.analizler && sub.analizler.some(a => a.id === analysisId)) {
              parentItem = {
                id: sub.id,
                level1: '',
                level1Num: ch.num,
                code: sub.code,
                title: sub.title,
                analizler: sub.analizler
              };
              parentReportKey = otherTab;
              break;
            }
          }
          if (parentItem) break;
        }
      }
    }

    let nextReportStatus = reportStatus;

    if (parentItem && parentItem.analizler && parentItem.analizler.length > 0) {
      const parentId = getItemId(parentItem, parentReportKey);
      const currentParent = reportStatus[parentId];
      const auto = computeAutoStatusForAnalyses(parentItem.analizler, updatedAnalysis);

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

    triggerCloudSync(nextReportStatus, updatedAnalysis, customItems, chapterNotes, sectionOverrides, chapterOrders);
  };

  // --- Headings Actions (2nd, 3rd, and 4th Degree) ---

  const handleAddSubSection = (
    chapterNum: string, 
    formData: HeadingFormData, 
    degree: 2 | 3 | 4, 
    parentCode?: string
  ) => {
    const parts = formData.code.split('.').filter(Boolean);
    let level2 = '';
    let level3 = '';
    let level4 = '';

    if (degree === 2) {
      level2 = `${formData.code} ${formData.title}`;
      level3 = '';
      level4 = '';
    } else if (degree === 3) {
      level2 = parentCode || `${parts[0]}.${parts[1]}`;
      level3 = `${formData.code} ${formData.title}`;
    } else if (degree === 4) {
      level2 = `${parts[0]}.${parts[1]}`;
      level3 = parentCode || `${parts[0]}.${parts[1]}.${parts[2]}`;
      level4 = `${formData.code} ${formData.title}`;
    }

    const idPrefix = activeTab === 'politika' ? 'pol_' : 'konut_';
    const newSubId = `${idPrefix}custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newSub: CustomSubSection = {
      id: newSubId,
      chapterNum,
      code: formData.code,
      title: formData.title,
      level2,
      level3,
      level4,
      sartnameUyum: formData.sartnameUyum || '',
      scope: formData.icerikOzeti || '',
      defaultPages: formData.defaultPages || '8-10 sf',
      analizler: []
    };

    const chapterKey = getChapterKey(activeTab, chapterNum);
    const currentList = getCustomItemsForChapter(customItems, activeTab, chapterNum);
    const updatedCustomsList = [...currentList, newSub].sort((a, b) => compareHierarchicalCodes(a.code, b.code));
    const updatedCustoms = { ...customItems, [chapterKey]: updatedCustomsList };
    setCustomItems(updatedCustoms);

    const statusId = `${idPrefix}${formData.code.replace(/\./g, '_')}`;
    const initialStatus: ReportStatusItem = {
      status: 'baslanmadi' as ReportStatusType,
      progress: 0,
      author: '',
      targetPages: formData.defaultPages || '8-10 sf',
      note: '',
      driveLink: ''
    };

    const updatedReport = {
      ...reportStatus,
      [statusId]: initialStatus,
      [newSubId]: initialStatus
    };
    setReportStatus(updatedReport);

    triggerCloudSync(updatedReport, analysisStatuses, updatedCustoms, chapterNotes, sectionOverrides, chapterOrders);
  };

  const handleEditSubSection = (
    item: ReportItem & { customId?: string; isCustom?: boolean },
    updates: HeadingFormData
  ) => {
    const oldId = getItemId(item, activeTab);
    const idPrefix = activeTab === 'politika' ? 'pol_' : 'konut_';
    const newId = `${idPrefix}${updates.code.replace(/\./g, '_')}`;

    let nextCustoms = customItems;
    let nextOverrides = sectionOverrides;
    const nextReport = { ...reportStatus };

    if (item.isCustom && item.customId) {
      const nextList: Record<string, CustomSubSection[]> = { ...customItems };
      const currentChapterNum = item.level1Num || '1';
      const chapterKey = getChapterKey(activeTab, currentChapterNum);
      const currentItems = getCustomItemsForChapter(customItems, activeTab, currentChapterNum);

      nextList[chapterKey] = currentItems.map(sub => {
        if (sub.id === item.customId) {
          return {
            ...sub,
            code: updates.code,
            title: updates.title,
            defaultPages: updates.defaultPages || sub.defaultPages,
            scope: updates.icerikOzeti !== undefined ? updates.icerikOzeti : sub.scope,
            sartnameUyum: updates.sartnameUyum !== undefined ? updates.sartnameUyum : sub.sartnameUyum
          };
        }
        return sub;
      });
      nextCustoms = nextList;
      setCustomItems(nextCustoms);
    } else {
      nextOverrides = {
        ...sectionOverrides,
        [item.id]: {
          ...sectionOverrides[item.id],
          code: updates.code,
          title: updates.title,
          defaultPages: updates.defaultPages,
          scope: updates.icerikOzeti,
          sartnameUyum: updates.sartnameUyum
        }
      };
      setSectionOverrides(nextOverrides);
    }

    // If code changed, migrate reportStatus
    if (oldId !== newId && nextReport[oldId]) {
      nextReport[newId] = {
        ...nextReport[oldId],
        targetPages: updates.defaultPages || nextReport[oldId].targetPages
      };
      delete nextReport[oldId];
      setReportStatus(nextReport);
    }

    triggerCloudSync(nextReport, analysisStatuses, nextCustoms, chapterNotes, nextOverrides, chapterOrders);
  };

  const handleEditSubSectionGroup = (
    chapterNum: string,
    groupCode: string,
    updates: { code: string; title: string }
  ) => {
    const nextCustoms = { ...customItems };
    const nextOverrides = { ...sectionOverrides };
    const nextReport = { ...reportStatus };
    const idPrefix = activeTab === 'politika' ? 'pol_' : 'konut_';
    const chapterKey = getChapterKey(activeTab, chapterNum);

    // Update custom items belonging to this group in active report
    const currentCustoms = getCustomItemsForChapter(customItems, activeTab, chapterNum);
    nextCustoms[chapterKey] = currentCustoms.map(sub => {
      if (sub.code === groupCode) {
        const oldId = `${idPrefix}${sub.code.replace(/\./g, '_')}`;
        const newId = `${idPrefix}${updates.code.replace(/\./g, '_')}`;
        if (oldId !== newId && nextReport[oldId]) {
          nextReport[newId] = nextReport[oldId];
          delete nextReport[oldId];
        }
        return {
          ...sub,
          code: updates.code,
          title: updates.title,
          level2: `${updates.code} ${updates.title}`
        };
      }
      if (sub.code.startsWith(groupCode + '.')) {
        const newSubCode = updates.code !== groupCode 
          ? sub.code.replace(new RegExp('^' + groupCode.replace(/\./g, '\\.')), updates.code)
          : sub.code;
        const oldId = `${idPrefix}${sub.code.replace(/\./g, '_')}`;
        const newId = `${idPrefix}${newSubCode.replace(/\./g, '_')}`;
        if (oldId !== newId && nextReport[oldId]) {
          nextReport[newId] = nextReport[oldId];
          delete nextReport[oldId];
        }
        return {
          ...sub,
          code: newSubCode,
          level2: `${updates.code} ${updates.title}`
        };
      }
      return sub;
    });

    // Update default items ONLY in the active report's chapters
    for (const ch of currentChapters) {
      if (ch.num !== chapterNum) continue;
      for (const it of ch.items) {
        if (it.code === groupCode) {
          const oldId = getItemId(it, activeTab);
          const newId = `${idPrefix}${updates.code.replace(/\./g, '_')}`;
          if (oldId !== newId && nextReport[oldId]) {
            nextReport[newId] = nextReport[oldId];
            delete nextReport[oldId];
          }
          nextOverrides[it.id] = {
            ...nextOverrides[it.id],
            code: updates.code,
            title: updates.title,
            level2: `${updates.code} ${updates.title}`
          };
        } else if (it.code.startsWith(groupCode + '.')) {
          const newItCode = updates.code !== groupCode 
            ? it.code.replace(new RegExp('^' + groupCode.replace(/\./g, '\\.')), updates.code)
            : it.code;
          const oldId = getItemId(it, activeTab);
          const newId = `${idPrefix}${newItCode.replace(/\./g, '_')}`;
          if (oldId !== newId && nextReport[oldId]) {
            nextReport[newId] = nextReport[oldId];
            delete nextReport[oldId];
          }
          nextOverrides[it.id] = {
            ...nextOverrides[it.id],
            code: newItCode,
            level2: `${updates.code} ${updates.title}`
          };
        }
      }
    }

    setCustomItems(nextCustoms);
    setSectionOverrides(nextOverrides);
    setReportStatus(nextReport);
    triggerCloudSync(nextReport, analysisStatuses, nextCustoms, chapterNotes, nextOverrides, chapterOrders);
  };

  const handleDeleteSubSection = (
    item: ReportItem & { customId?: string; isCustom?: boolean }
  ) => {
    const oldId = getItemId(item, activeTab);
    let nextCustoms = customItems;
    let nextOverrides = sectionOverrides;
    const nextReport = { ...reportStatus };

    if (item.isCustom && item.customId) {
      const nextList: Record<string, CustomSubSection[]> = { ...customItems };
      const currentChapterNum = item.level1Num || '1';
      const chapterKey = getChapterKey(activeTab, currentChapterNum);
      const currentItems = getCustomItemsForChapter(customItems, activeTab, currentChapterNum);

      nextList[chapterKey] = currentItems.filter(
        sub => sub.id !== item.customId && !sub.code.startsWith(item.code + '.')
      );
      nextCustoms = nextList;
      setCustomItems(nextCustoms);
    } else {
      nextOverrides = {
        ...sectionOverrides,
        [item.id]: {
          ...sectionOverrides[item.id],
          deleted: true
        }
      };
      // Mark child items in active report as deleted
      for (const ch of currentChapters) {
        for (const it of ch.items) {
          if (it.code.startsWith(item.code + '.') && it.code !== item.code) {
            nextOverrides[it.id] = {
              ...nextOverrides[it.id],
              deleted: true
            };
          }
        }
      }
      setSectionOverrides(nextOverrides);
    }

    delete nextReport[oldId];
    if (item.customId) delete nextReport[item.customId];
    setReportStatus(nextReport);

    triggerCloudSync(nextReport, analysisStatuses, nextCustoms, chapterNotes, nextOverrides, chapterOrders);
  };

  const handleDeleteSubSectionGroup = (
    chapterNum: string,
    groupCode: string
  ) => {
    const nextCustoms = { ...customItems };
    const nextOverrides = { ...sectionOverrides };
    const nextReport = { ...reportStatus };
    const idPrefix = activeTab === 'politika' ? 'pol_' : 'konut_';
    const chapterKey = getChapterKey(activeTab, chapterNum);

    // Remove from customs in active report
    const currentCustoms = getCustomItemsForChapter(customItems, activeTab, chapterNum);
    nextCustoms[chapterKey] = currentCustoms.filter(sub => {
      const isMatch = sub.code === groupCode || sub.code.startsWith(groupCode + '.');
      if (isMatch) {
        const id = `${idPrefix}${sub.code.replace(/\./g, '_')}`;
        delete nextReport[id];
        delete nextReport[sub.id];
      }
      return !isMatch;
    });

    // Mark deleted in overrides ONLY for active report
    for (const ch of currentChapters) {
      if (ch.num !== chapterNum) continue;
      for (const it of ch.items) {
        if (it.code === groupCode || it.code.startsWith(groupCode + '.')) {
          nextOverrides[it.id] = {
            ...nextOverrides[it.id],
            deleted: true
          };
          const id = getItemId(it, activeTab);
          delete nextReport[id];
        }
      }
    }

    setCustomItems(nextCustoms);
    setSectionOverrides(nextOverrides);
    setReportStatus(nextReport);
    triggerCloudSync(nextReport, analysisStatuses, nextCustoms, chapterNotes, nextOverrides, chapterOrders);
  };

  // --- Spatial Analyses Actions ---

  const handleAddAnalysis = (
    item: ReportItem & { customId?: string; isCustom?: boolean },
    data: { name: string; category?: string; status: 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede' }
  ) => {
    const newAnalysisId = `an_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newAnalysis: AnalysisItem = {
      id: newAnalysisId,
      name: data.name,
      category: data.category,
      status: data.status
    };

    const currentAnalyses = item.analizler || [];
    const updatedAnalyses = [...currentAnalyses, newAnalysis];

    const nextAnalysisStatuses = {
      ...analysisStatuses,
      [newAnalysisId]: data.status
    };
    setAnalysisStatuses(nextAnalysisStatuses);

    let nextCustoms = customItems;
    let nextOverrides = sectionOverrides;

    if (item.isCustom && item.customId) {
      const nextList: Record<string, CustomSubSection[]> = { ...customItems };
      const currentChapterNum = item.level1Num || '1';
      const chapterKey = getChapterKey(activeTab, currentChapterNum);
      const currentItems = getCustomItemsForChapter(customItems, activeTab, currentChapterNum);

      nextList[chapterKey] = currentItems.map(sub => {
        if (sub.id === item.customId) {
          return { ...sub, analizler: updatedAnalyses };
        }
        return sub;
      });
      nextCustoms = nextList;
      setCustomItems(nextCustoms);
    } else {
      nextOverrides = {
        ...sectionOverrides,
        [item.id]: {
          ...sectionOverrides[item.id],
          analizler: updatedAnalyses
        }
      };
      setSectionOverrides(nextOverrides);
    }

    // Recalculate parent auto-status
    const parentId = getItemId(item, activeTab);
    const auto = computeAutoStatusForAnalyses(updatedAnalyses, nextAnalysisStatuses);
    const currentParent = reportStatus[parentId];
    const currentProg = currentParent?.progress ?? (STATUS_PROGRESS_MAP[currentParent?.status as ReportStatusType] ?? 0);

    let nextReportStatus = reportStatus;
    if (currentProg <= 70) {
      nextReportStatus = {
        ...reportStatus,
        [parentId]: {
          ...(currentParent || { author: '', note: '', driveLink: '', targetPages: item.defaultPages || '' }),
          status: auto.status,
          progress: auto.progress
        }
      };
      setReportStatus(nextReportStatus);
    }

    triggerCloudSync(nextReportStatus, nextAnalysisStatuses, nextCustoms, chapterNotes, nextOverrides, chapterOrders);
  };

  const handleEditAnalysis = (
    item: ReportItem & { customId?: string; isCustom?: boolean },
    analysisId: string,
    updates: { name: string; category?: string; status: 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede' }
  ) => {
    const updatedAnalyses = (item.analizler || []).map(a => {
      if (a.id === analysisId) {
        return {
          ...a,
          name: updates.name,
          category: updates.category,
          status: updates.status
        };
      }
      return a;
    });

    const nextAnalysisStatuses = {
      ...analysisStatuses,
      [analysisId]: updates.status
    };
    setAnalysisStatuses(nextAnalysisStatuses);

    let nextCustoms = customItems;
    let nextOverrides = sectionOverrides;

    if (item.isCustom && item.customId) {
      const nextList: Record<string, CustomSubSection[]> = { ...customItems };
      const currentChapterNum = item.level1Num || '1';
      const chapterKey = getChapterKey(activeTab, currentChapterNum);
      const currentItems = getCustomItemsForChapter(customItems, activeTab, currentChapterNum);

      nextList[chapterKey] = currentItems.map(sub => {
        if (sub.id === item.customId) {
          return { ...sub, analizler: updatedAnalyses };
        }
        return sub;
      });
      nextCustoms = nextList;
      setCustomItems(nextCustoms);
    } else {
      nextOverrides = {
        ...sectionOverrides,
        [item.id]: {
          ...sectionOverrides[item.id],
          analizler: updatedAnalyses
        }
      };
      setSectionOverrides(nextOverrides);
    }

    // Recalculate parent auto-status
    const parentId = getItemId(item, activeTab);
    const auto = computeAutoStatusForAnalyses(updatedAnalyses, nextAnalysisStatuses);
    const currentParent = reportStatus[parentId];
    const currentProg = currentParent?.progress ?? (STATUS_PROGRESS_MAP[currentParent?.status as ReportStatusType] ?? 0);

    let nextReportStatus = reportStatus;
    if (currentProg <= 70) {
      nextReportStatus = {
        ...reportStatus,
        [parentId]: {
          ...(currentParent || { author: '', note: '', driveLink: '', targetPages: item.defaultPages || '' }),
          status: auto.status,
          progress: auto.progress
        }
      };
      setReportStatus(nextReportStatus);
    }

    triggerCloudSync(nextReportStatus, nextAnalysisStatuses, nextCustoms, chapterNotes, nextOverrides, chapterOrders);
  };

  const handleDeleteAnalysis = (
    item: ReportItem & { customId?: string; isCustom?: boolean },
    analysisId: string
  ) => {
    const updatedAnalyses = (item.analizler || []).filter(a => a.id !== analysisId);

    const nextAnalysisStatuses = { ...analysisStatuses };
    delete nextAnalysisStatuses[analysisId];
    setAnalysisStatuses(nextAnalysisStatuses);

    let nextCustoms = customItems;
    let nextOverrides = sectionOverrides;

    if (item.isCustom && item.customId) {
      const nextList: Record<string, CustomSubSection[]> = { ...customItems };
      const currentChapterNum = item.level1Num || '1';
      const chapterKey = getChapterKey(activeTab, currentChapterNum);
      const currentItems = getCustomItemsForChapter(customItems, activeTab, currentChapterNum);

      nextList[chapterKey] = currentItems.map(sub => {
        if (sub.id === item.customId) {
          return { ...sub, analizler: updatedAnalyses };
        }
        return sub;
      });
      nextCustoms = nextList;
      setCustomItems(nextCustoms);
    } else {
      nextOverrides = {
        ...sectionOverrides,
        [item.id]: {
          ...sectionOverrides[item.id],
          analizler: updatedAnalyses
        }
      };
      setSectionOverrides(nextOverrides);
    }

    // Recalculate parent auto-status
    const parentId = getItemId(item, activeTab);
    const auto = computeAutoStatusForAnalyses(updatedAnalyses, nextAnalysisStatuses);
    const currentParent = reportStatus[parentId];
    const currentProg = currentParent?.progress ?? (STATUS_PROGRESS_MAP[currentParent?.status as ReportStatusType] ?? 0);

    let nextReportStatus = reportStatus;
    if (currentProg <= 70) {
      nextReportStatus = {
        ...reportStatus,
        [parentId]: {
          ...(currentParent || { author: '', note: '', driveLink: '', targetPages: item.defaultPages || '' }),
          status: auto.status,
          progress: auto.progress
        }
      };
      setReportStatus(nextReportStatus);
    }

    triggerCloudSync(nextReportStatus, nextAnalysisStatuses, nextCustoms, chapterNotes, nextOverrides, chapterOrders);
  };

  const handleUpdateChapterNotes = (chapterNum: string, note: string) => {
    const chapterKey = getChapterKey(activeTab, chapterNum);
    const updatedNotes = { ...chapterNotes, [chapterKey]: note };
    setChapterNotes(updatedNotes);
    triggerCloudSync(reportStatus, analysisStatuses, customItems, updatedNotes, sectionOverrides, chapterOrders);
  };

  const handleReorderItems = (chapterNum: string, newOrder: string[]) => {
    const chapterKey = getChapterKey(activeTab, chapterNum);
    const nextOrders = { ...chapterOrders, [chapterKey]: newOrder };
    setChapterOrders(nextOrders);
    triggerCloudSync(reportStatus, analysisStatuses, customItems, chapterNotes, sectionOverrides, nextOrders);
  };

  const handleResetAll = () => {
    setReportStatus({});
    setAnalysisStatuses({});
    setCustomItems({});
    setSectionOverrides({});
    setChapterNotes({});
    setChapterOrders({});
    try {
      localStorage.removeItem(REPORT_STATUS_KEY);
      localStorage.removeItem(ANALYSIS_STATUS_KEY);
      localStorage.removeItem(CUSTOM_ITEMS_KEY);
      localStorage.removeItem(SECTION_OVERRIDES_KEY);
      localStorage.removeItem(CHAPTER_NOTES_KEY);
      localStorage.removeItem(CHAPTER_ORDERS_KEY);
    } catch {}
    triggerCloudSync({}, {}, {}, {}, {}, {});
  };

  const handleToggleCollapse = (chapterKey: string) => {
    setCollapsedChapters(prev => ({
      ...prev,
      [chapterKey]: !prev[chapterKey]
    }));
  };

  const handleExpandAll = () => {
    setCollapsedChapters(prev => {
      const next = { ...prev };
      currentChapters.forEach(ch => {
        delete next[`${activeTab}_${ch.num}`];
      });
      return next;
    });
  };

  const handleCollapseAll = () => {
    setCollapsedChapters(prev => {
      const next = { ...prev };
      currentChapters.forEach(ch => {
        next[`${activeTab}_${ch.num}`] = true;
      });
      return next;
    });
  };

  // Distinct authors list for filter
  const distinctAuthors = useMemo(() => {
    const set = new Set<string>();
    Object.values(reportStatus).forEach((item: ReportStatusItem) => {
      if (item.author && item.author.trim()) {
        set.add(item.author.trim());
      }
    });
    return Array.from(set).sort();
  }, [reportStatus]);

  // Dynamic calculation for Stats
  const calculateStatsForChapters = (chapters: ReportChapterGroup[], tab: 'mevcut_durum' | 'politika') => {
    let total = 0;
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

    let sumProgress = 0;
    let totalEstimatedPages = 0;
    let totalAnalyses = 0;
    let completedAnalyses = 0;
    let draftingAnalyses = 0;

    chapters.forEach(ch => {
      const defaultItems = (ch.items || []).map(s => {
        const override = sectionOverrides[s.id];
        if (override?.deleted) return null;
        return {
          ...s,
          title: override?.title || s.title,
          code: override?.code || s.code,
          defaultPages: override?.defaultPages || s.defaultPages,
          icerikOzeti: override?.scope !== undefined ? override.scope : s.icerikOzeti,
          sartnameUyum: override?.sartnameUyum !== undefined ? override.sartnameUyum : s.sartnameUyum,
          analizler: override?.analizler !== undefined ? override.analizler : s.analizler
        };
      }).filter(Boolean) as ReportItem[];

      const customs = getCustomItemsForChapter(customItems, tab, ch.num);
      
      const allItems: ReportItem[] = [
        ...defaultItems,
        ...customs.map(c => ({
          id: c.id,
          level1: `${ch.num}. ${ch.title}`,
          level1Num: ch.num,
          level2: c.level2,
          level3: c.level3,
          level4: c.level4,
          code: c.code,
          title: c.title,
          sartnameUyum: c.sartnameUyum,
          icerikOzeti: c.scope,
          defaultPages: c.defaultPages || '8-10 sf',
          analizler: c.analizler || [],
          defaultStatus: 'baslanmadi' as ReportStatusType
        }))
      ].sort((a, b) => compareHierarchicalCodes(a.code, b.code));

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

        const id = getItemId(item, tab);
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
        }
        const st = item.defaultStatus || 'baslanmadi';
        return {
          status: st,
          progress: STATUS_PROGRESS_MAP[st] ?? 0
        };
      };

      allItems.forEach(item => {
        total++;
        const id = getItemId(item, tab);
        const itemState = reportStatus[id] || { author: '', targetPages: item.defaultPages || '', note: '', driveLink: '' };
        
        const { status: itemStatusType, progress: itemProgress } = getItemStatusAndProgress(item);

        if (itemStatusType === 'mavi_depoda_guncel' || itemStatusType === 'completed') {
          maviDepodaGuncel++;
        } else if (itemStatusType === 'mavi_depoya_gidebilir') {
          maviDepoyaGidebilir++;
        } else if (itemStatusType === 'rapor_okundu_ea') {
          raporOkunduEA++;
        } else if (itemStatusType === 'rapor_okundu_sidar') {
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
    return calculateStatsForChapters(KONUT_BARINMA_CHAPTERS, 'mevcut_durum');
  }, [reportStatus, analysisStatuses, customItems, sectionOverrides, distinctAuthors]);

  const politikaStats = useMemo(() => {
    return calculateStatsForChapters(POLITIKA_YATIRIM_CHAPTERS, 'politika');
  }, [reportStatus, analysisStatuses, customItems, sectionOverrides, distinctAuthors]);

  const overallStats = activeTab === 'mevcut_durum' ? mevcutStats : politikaStats;

  // Filter Chapters & Items
  const filteredChapters = useMemo(() => {
    return currentChapters.map(ch => {
      if (selectedChapterFilter !== 'all' && ch.num !== selectedChapterFilter) {
        return null;
      }

      const defaultItems = (ch.items || []).map(s => {
        const override = sectionOverrides[s.id];
        if (override?.deleted) return null;
        return {
          ...s,
          title: override?.title || s.title,
          code: override?.code || s.code,
          defaultPages: override?.defaultPages || s.defaultPages,
          icerikOzeti: override?.scope !== undefined ? override.scope : s.icerikOzeti,
          sartnameUyum: override?.sartnameUyum !== undefined ? override.sartnameUyum : s.sartnameUyum,
          analizler: override?.analizler !== undefined ? override.analizler : s.analizler,
          isCustom: false
        };
      }).filter(Boolean) as (ReportItem & { isCustom?: boolean; customId?: string })[];

      const customs = getCustomItemsForChapter(customItems, activeTab, ch.num).map(s => ({
        id: s.id,
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
        analizler: s.analizler || [],
        isCustom: true,
        customId: s.id,
        defaultStatus: 'baslanmadi' as ReportStatusType
      }));

      let allItems = [...defaultItems, ...customs].sort((a, b) => compareHierarchicalCodes(a.code, b.code));

      if (searchTerm) {
        const sLower = searchTerm.toLowerCase();
        allItems = allItems.filter(item => {
          const id = getItemId(item, activeTab);
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
          const id = getItemId(item, activeTab);
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
          const id = getItemId(item, activeTab);
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
  }, [activeTab, currentChapters, selectedChapterFilter, customItems, sectionOverrides, searchTerm, statusFilter, authorFilter, analysisFilter, reportStatus, analysisStatuses]);

  const activeCustomSubSections = useMemo(() => {
    const result: Record<string, CustomSubSection[]> = {};
    currentChapters.forEach(ch => {
      result[ch.num] = getCustomItemsForChapter(customItems, activeTab, ch.num);
    });
    return result;
  }, [customItems, activeTab, currentChapters]);

  const activeChapterNotes = useMemo(() => {
    const result: Record<string, string> = {};
    currentChapters.forEach(ch => {
      result[ch.num] = getChapterNote(chapterNotes, activeTab, ch.num);
    });
    return result;
  }, [chapterNotes, activeTab, currentChapters]);

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
                key={`${activeTab}_${chapter.num}`}
                reportKey={activeTab}
                chapter={chapter}
                items={items}
                chapterOrder={getChapterOrder(chapterOrders, activeTab, chapter.num)}
                reportStatus={reportStatus}
                analysisStatuses={analysisStatuses}
                chapterNotes={getChapterNote(chapterNotes, activeTab, chapter.num)}
                isCollapsed={!!collapsedChapters[`${activeTab}_${chapter.num}`]}
                onToggleCollapse={(num) => handleToggleCollapse(`${activeTab}_${num}`)}
                onUpdateStatus={handleUpdateStatus}
                onUpdateAnalysisStatus={handleUpdateAnalysisStatus}
                onAddSubSection={handleAddSubSection}
                onEditSubSection={handleEditSubSection}
                onDeleteSubSection={handleDeleteSubSection}
                onEditSubSectionGroup={handleEditSubSectionGroup}
                onDeleteSubSectionGroup={handleDeleteSubSectionGroup}
                onAddAnalysis={handleAddAnalysis}
                onEditAnalysis={handleEditAnalysis}
                onDeleteAnalysis={handleDeleteAnalysis}
                onUpdateChapterNotes={handleUpdateChapterNotes}
                onReorderItems={handleReorderItems}
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
        chapterNotes={activeChapterNotes}
        customSubSections={activeCustomSubSections}
        onResetAll={handleResetAll}
        chapters={currentChapters}
        tabName={activeTab === 'mevcut_durum' ? 'Mevcut_Durum' : 'Politika_Yatirim'}
      />
    </div>
  );
}
