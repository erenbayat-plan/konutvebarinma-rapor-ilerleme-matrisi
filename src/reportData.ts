export interface AnalysisItem {
  id: string;
  category?: string;
  name: string;
  status: 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede';
}

export type ReportStatusType = 
  | 'mavi_depoda_guncel'
  | 'mavi_depoya_gidebilir'
  | 'rapor_okundu_ea'
  | 'rapor_okundu_sidar'
  | 'rapora_yazildi'
  | 'tamamlandi_raporu_yazilabilir'
  | 'analiz_tamamlandi'
  | 'analiz_devam_ediyor'
  | 'baslanmadi'
  // Non-spatial specific
  | 'nm_kontrol_tamamlandi'
  | 'nm_yazildi_kontrol_bekliyor'
  | 'nm_yaziliyor'
  // Legacy mappings for backwards compatibility
  | 'completed'
  | 'review'
  | 'drafting'
  | 'not_started';

export const STATUS_PROGRESS_MAP: Record<ReportStatusType, number> = {
  mavi_depoda_guncel: 100,
  mavi_depoya_gidebilir: 98,
  rapor_okundu_ea: 97,
  rapor_okundu_sidar: 95,
  rapora_yazildi: 90,
  tamamlandi_raporu_yazilabilir: 80,
  analiz_tamamlandi: 70,
  analiz_devam_ediyor: 60,
  baslanmadi: 0,
  // Non-spatial specific
  nm_kontrol_tamamlandi: 75,
  nm_yazildi_kontrol_bekliyor: 50,
  nm_yaziliyor: 25,
  // legacy fallback
  completed: 100,
  review: 95,
  drafting: 60,
  not_started: 0
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  mavi_depoda_guncel: 'Mavi depoda güncel',
  mavi_depoya_gidebilir: 'Mavi depoya gidebilir',
  rapor_okundu_ea: 'Rapor okundu (EA), kontrolleri tamam.',
  rapor_okundu_sidar: 'Rapor okundu (Sidar), kontrolleri tamam.',
  rapora_yazildi: 'Rapora yazıldı, kontrol bekliyor.',
  tamamlandi_raporu_yazilabilir: 'Tamamlandı, raporu yazılabilir.',
  analiz_tamamlandi: 'Analiz tamamlandı, kontrol edilecek.',
  analiz_devam_ediyor: 'Analiz devam ediyor.',
  baslanmadi: 'Başlanmadı.',
  // Non-spatial labels
  nm_kontrol_tamamlandi: 'Kontrol tamamlandı. %75',
  nm_yazildi_kontrol_bekliyor: 'Yazıldı, kontrol bekliyor %50',
  nm_yaziliyor: 'Yazılıyor. %25'
};

// Keys for Spatial Analysis items
export const SPATIAL_STATUS_KEYS: ReportStatusType[] = [
  'mavi_depoda_guncel',
  'mavi_depoya_gidebilir',
  'rapor_okundu_ea',
  'rapor_okundu_sidar',
  'rapora_yazildi',
  'tamamlandi_raporu_yazilabilir',
  'analiz_tamamlandi',
  'analiz_devam_ediyor',
  'baslanmadi'
];

// Keys for NON-Spatial Analysis items
export const NON_SPATIAL_STATUS_KEYS: ReportStatusType[] = [
  'mavi_depoda_guncel',
  'nm_kontrol_tamamlandi',
  'nm_yazildi_kontrol_bekliyor',
  'nm_yaziliyor',
  'baslanmadi'
];

export function getStatusLabel(key: string, isSpatial: boolean): string {
  if (!isSpatial) {
    if (key === 'mavi_depoda_guncel') return 'Mavi depoda güncel %100';
    if (key === 'baslanmadi') return 'Başlanmadı. %0';
  }
  
  const baseLabel = REPORT_STATUS_LABEL[key] || REPORT_STATUS_LABEL[key.replace('nm_', '')] || key;
  
  if (isSpatial && STATUS_PROGRESS_MAP[key as ReportStatusType] !== undefined) {
    return `${baseLabel} %${STATUS_PROGRESS_MAP[key as ReportStatusType]}`;
  }
  
  return baseLabel;
}

// Pure short status labels
export const REPORT_STATUS_SHORT_LABEL: Record<string, string> = {
  mavi_depoda_guncel: 'Mavi depoda güncel',
  mavi_depoya_gidebilir: 'Mavi depoya gidebilir',
  rapor_okundu_ea: 'Rapor okundu (EA)',
  rapor_okundu_sidar: 'Rapor okundu (Sidar)',
  rapora_yazildi: 'Rapora yazıldı',
  tamamlandi_raporu_yazilabilir: 'Tamamlandı',
  analiz_tamamlandi: 'Analiz tamamlandı',
  analiz_devam_ediyor: 'Analiz devam ediyor',
  baslanmadi: 'Başlanmadı',
  nm_kontrol_tamamlandi: 'Kontrol tamamlandı',
  nm_yazildi_kontrol_bekliyor: 'Yazıldı, kontrol bekliyor',
  nm_yaziliyor: 'Yazılıyor',
  completed: 'Mavi depoda güncel',
  review: 'Rapor okundu (Sidar)',
  drafting: 'Analiz devam ediyor',
  not_started: 'Başlanmadı'
};

/**
 * Calculates the automated Report Status based on sub-analyses states:
 * 1. All Tamamlandı -> "Tamamlandı, raporu yazılabilir" (%80)
 * 2. Only Tamamlandı and Devam Ediyor (no Başlamadı) -> "Analiz tamamlandı, kontrol edilecek" (%70)
 * 3. Mix of Tamamlandı/Devam Ediyor/Başlamadı -> "Analiz devam ediyor" (%60)
 * 4. All Başlamadı -> "Başlanmadı" (%0)
 */
export function computeAutoStatusForAnalyses(
  analyses: AnalysisItem[],
  currentAnalysisStatuses: Record<string, 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede'> = {}
): { status: ReportStatusType; progress: number } {
  if (!analyses || analyses.length === 0) {
    return { status: 'baslanmadi', progress: 0 };
  }

  let doneCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;

  analyses.forEach(an => {
    const st = currentAnalysisStatuses[an.id] || an.status || 'Başlamadı';
    if (st === 'Tamamlandı') {
      doneCount++;
    } else if (st === 'Devam Ediyor' || st === 'İncelemede') {
      inProgressCount++;
    } else {
      notStartedCount++;
    }
  });

  const total = analyses.length;

  // 1. Altındaki analizlerin tamamı tamamlandığında: "Tamamlandı, raporu yazılabilir %80"
  if (doneCount === total && total > 0) {
    return { status: 'tamamlandi_raporu_yazilabilir', progress: 80 };
  }

  // 2. Sadece Tamamlandı ve Devam Ediyor varsa (hiç Başlamadı yoksa): "Analiz tamamlandı, kontrol edilecek %70"
  if (notStartedCount === 0 && (doneCount > 0 || inProgressCount > 0)) {
    return { status: 'analiz_tamamlandi', progress: 70 };
  }

  // 3. Tamamlandı, Başlamadı ve Devam Ediyor karışımı (analizler devam ediyor): "Analiz devam ediyor %60"
  if (doneCount > 0 || inProgressCount > 0) {
    return { status: 'analiz_devam_ediyor', progress: 60 };
  }

  // 4. Hiçbiri başlamadı: "Başlanmadı %0"
  return { status: 'baslanmadi', progress: 0 };
}

export interface ReportItem {
  id: string;
  level1: string; // 1. GİRİŞ, 2. İSTANBUL PLAN 2050..., etc.
  level1Num: string; // '1', '2', '3', '4', '5'
  level2?: string; // 1.1. Amaç ve Kapsam, 3.1 Konut Alanları Gelişimi ve Konut Morfolojisi
  level3?: string; // 3.1.1. Konut Dokuları ve Yerleşim Tipolojileri
  level4?: string;
  code: string; // '1.1', '2.1.1', '3.1.1', etc.
  title: string;
  sartnameUyum?: string;
  icerikOzeti?: string;
  analizler?: AnalysisItem[];
  defaultStatus?: ReportStatusType;
  defaultPages?: string;
  degree?: number;
  isSpatialAnalysis?: boolean;
}

export interface ReportChapterGroup {
  num: string;
  title: string;
  items: ReportItem[];
}

/**
 * Compares two dot-separated hierarchical codes strictly and numerically.
 * Examples:
 * 3 < 3.1 < 3.1.1 < 3.1.1.1 < 3.1.1.2 < 3.1.2 < 3.2 < 3.2.1 < 3.2.2.1 < 3.2.2.2
 */
export function compareHierarchicalCodes(codeA?: string | null, codeB?: string | null): number {
  if (!codeA && !codeB) return 0;
  if (!codeA) return 1;
  if (!codeB) return -1;

  const cleanA = String(codeA).trim().replace(/\.+$/, '');
  const cleanB = String(codeB).trim().replace(/\.+$/, '');

  const partsA = cleanA.split('.').filter(Boolean);
  const partsB = cleanB.split('.').filter(Boolean);

  const minLen = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < minLen; i++) {
    const pA = partsA[i];
    const pB = partsB[i];

    const numA = parseInt(pA, 10);
    const numB = parseInt(pB, 10);
    const isNumA = !isNaN(numA) && String(numA) === pA;
    const isNumB = !isNaN(numB) && String(numB) === pB;

    if (isNumA && isNumB) {
      if (numA !== numB) {
        return numA - numB;
      }
    } else {
      const cmp = pA.localeCompare(pB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }

  return partsA.length - partsB.length;
}

export { KONUT_BARINMA_CHAPTERS } from './data/konutBarinmaChapters';

export const POLITIKA_YATIRIM_CHAPTERS: ReportChapterGroup[] = [
  {
    "num": "1",
    "title": "1. GİRİŞ",
    "items": [
      {
        "id": "pol_1_1",
        "level1": "1. GİRİŞ",
        "level1Num": "1",
        "level2": "1.1. Amaç ve Kapsam",
        "code": "1.1",
        "title": "Amaç ve Kapsam",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "2-4 sf"
      },
      {
        "id": "pol_1_2",
        "level1": "1. GİRİŞ",
        "level1Num": "1",
        "level2": "1.2 İstanbul Plan 2050 - Konut ve Barınma Yaklaşımı",
        "code": "1.2",
        "title": "İstanbul Plan 2050 - Konut ve Barınma Yaklaşımı",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "2-4 sf"
      }
    ]
  },
  {
    "num": "2",
    "title": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
    "items": [
      {
        "id": "pol_2_1_1",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.1. Küresel Konut ve Barınma Sorununun Değişen Tarihsel Çerçevesi",
        "level3": "2.1.1. 1940–1970: Refah Devleti ve Sosyal Konutun Yükselişi",
        "code": "2.1.1",
        "title": "1940–1970: Refah Devleti ve Sosyal Konutun Yükselişi",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_1_2",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.1. Küresel Konut ve Barınma Sorununun Değişen Tarihsel Çerçevesi",
        "level3": "2.1.2. 1970’ler: Hak Söyleminin Güçlenmesi ve Krizler",
        "code": "2.1.2",
        "title": "1970’ler: Hak Söyleminin Güçlenmesi ve Krizler",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_1_3",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.1. Küresel Konut ve Barınma Sorununun Değişen Tarihsel Çerçevesi",
        "level3": "2.1.3. 1980–2000: Neoliberal Dönüşüm ve Kurumsal Değişim",
        "code": "2.1.3",
        "title": "1980–2000: Neoliberal Dönüşüm ve Kurumsal Değişim",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_1_4",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.1. Küresel Konut ve Barınma Sorununun Değişen Tarihsel Çerçevesi",
        "level3": "2.1.4. 2000’ler–Günümüz: Küreselleşme, Kentsel Dönüşüm ve Hak Mücadelesi",
        "code": "2.1.4",
        "title": "2000’ler–Günümüz: Küreselleşme, Kentsel Dönüşüm ve Hak Mücadelesi",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_2",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.2. Konut Politikalarına Yönelik Yaklaşımlar ve Uygulamalar",
        "code": "2.2",
        "title": "Konut Politikalarına Yönelik Yaklaşımlar ve Uygulamalar",
        "defaultStatus": "baslanmadi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_3",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.3. Konut Politikalarını Şekillendiren Güncel Uluslararası Politika Çerçeveleri ve Finansman Araçları",
        "code": "2.3",
        "title": "Konut Politikalarını Şekillendiren Güncel Uluslararası Politika Çerçeveleri ve Finansman Araçları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_1",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.1. Planlı Dönem Öncesi Konut Politikası",
        "code": "2.4.1",
        "title": "Planlı Dönem Öncesi Konut Politikası",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_2",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.2. 1960-1980 Arası Planlı Dönemde Konut Politikası",
        "code": "2.4.2",
        "title": "1960-1980 Arası Planlı Dönemde Konut Politikası",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_3",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.3. 1980-1990 Arası Planlı Dönemde Konut Politikası",
        "code": "2.4.3",
        "title": "1980-1990 Arası Planlı Dönemde Konut Politikası",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_4",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.4. 1990-2000 Arası Planlı Dönemde Konut Politikası",
        "code": "2.4.4",
        "title": "1990-2000 Arası Planlı Dönemde Konut Politikası",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_5",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.5. 2000-2011 Arası Planlı Dönemde Konut Politikası",
        "code": "2.4.5",
        "title": "2000-2011 Arası Planlı Dönemde Konut Politikası",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_6",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.6. 2011-2018 Arası Planlı Dönemde Konut Politikası",
        "code": "2.4.6",
        "title": "2011-2018 Arası Planlı Dönemde Konut Politikası",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_7",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.7. 2018’den Günümüze Konut Politikası",
        "code": "2.4.7",
        "title": "2018’den Günümüze Konut Politikası",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_2_4_8",
        "level1": "2. DÜNYADA VE TÜRKİYE’DE KONUT REJİMİNE GENEL BAKIŞ",
        "level1Num": "2",
        "level2": "2.4. Türkiye’de Konut Politikaları ve Konut Rejiminin Seyri",
        "level3": "2.4.8. Türkiye’de Konut Politikaları ve Planlamasına Dair Genel Değerlendirme",
        "code": "2.4.8",
        "title": "Türkiye’de Konut Politikaları ve Planlamasına Dair Genel Değerlendirme",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      }
    ]
  },
  {
    "num": "3",
    "title": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
    "items": [
      {
        "id": "pol_3_1_1",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.1. Osmanlı Son Döneminde Konut ve Kentsel Yapılanma (1838–1923)",
        "code": "3.1.1",
        "title": "Osmanlı Son Döneminde Konut ve Kentsel Yapılanma (1838–1923)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_1_2",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.2. Erken Cumhuriyet Dönemi (1923–1950): Konut Politikaları, İlk Planlama Deneyimleri ve 1. On Yıllık İmar ÇDP",
        "code": "3.1.2",
        "title": "Erken Cumhuriyet Dönemi (1923–1950): Konut Politikaları, İlk Planlama Deneyimleri ve 1. On Yıllık İmar ÇDP",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_1_3",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.3. Hızlı Kentleşme Dönemi (1950–1960): Gecekondu Olgusu, Konut Sorunu ve İstanbul Belediyesi İmar Tevsii Hududu",
        "code": "3.1.3",
        "title": "Hızlı Kentleşme Dönemi (1950–1960): Gecekondu Olgusu, Konut Sorunu ve İstanbul Belediyesi İmar Tevsii Hududu",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_1_4",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.4. Planlı Kalkınma Döneminde Konut Üretimi, Kurumsallaşma ve Mekânsal Planlama (1960–1980): Toplu Konut Politikaları, Kurumsal Yapılanma ve İstanbul Metropolitan Alan Nazım Planı",
        "code": "3.1.4",
        "title": "Planlı Kalkınma Döneminde Konut Üretimi, Kurumsallaşma ve Mekânsal Planlama (1960–1980)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_1_5",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.5. Neoliberal Dönüşüm Sürecinde Konut Piyasası ve Planlama Yaklaşımları (1980–1999): Finansallaşma, Kentsel Büyüme Dinamikleri ve İstanbul Büyükşehir / Metropolitan Alan Nazım Planları",
        "code": "3.1.5",
        "title": "Neoliberal Dönüşüm Sürecinde Konut Piyasası ve Planlama Yaklaşımları (1980–1999)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_1_6",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.6. Kentsel Dönüşüm ve Toplu Konut Politikalarının Yaygınlaşması (2000–2017): Dönüşüm Odaklı Mekânsal Müdahaleler ve İstanbul İl Çevre Düzeni Planı",
        "code": "3.1.6",
        "title": "Kentsel Dönüşüm ve Toplu Konut Politikalarının Yaygınlaşması (2000–2017)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_1_7",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.7. Yeni Ekonomik Dinamikler, Konut Politikaları ve Güncel Planlama Yaklaşımları (2018–2026): İstanbul İl Çevre Düzeni Planı Revizyonları, Piyasa Dinamikleri ve Planlama Gündemi",
        "code": "3.1.7",
        "title": "Yeni Ekonomik Dinamikler, Konut Politikaları ve Güncel Planlama Yaklaşımları (2018–2026)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_1_8",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.1. İstanbul’da Konut Gelişimi, Konut Politikaları ve Planlama Dinamiklerine Tarihsel Bakış",
        "level3": "3.1.8. İstanbul’da Kent Vizyonu Gündemi, Konut ve Barınmaya Bakış",
        "code": "3.1.8",
        "title": "İstanbul’da Kent Vizyonu Gündemi, Konut ve Barınmaya Bakış",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "defaultPages": "5-10 sf"
      },
      {
        "id": "pol_3_2_1",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri",
        "code": "3.2.1",
        "title": "İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "pol_3_2_1_1",
        "code": "3.2.1.1",
        "title": "İstanbul genelinde metro, tramvay ve raylı sistem yatırımları (1990’lar–günümüz, sürekli süreç)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_2",
        "code": "3.2.1.2",
        "title": "Marmaray",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_3",
        "code": "3.2.1.3",
        "title": "Yavuz Sultan Selim Köprüsü ve Kuzey Marmara Otoyolu",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_4",
        "code": "3.2.1.4",
        "title": "Avrasya Tüneli",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_5",
        "code": "3.2.1.5",
        "title": "İstanbul Havalimanı ve İstanbul Havalimanı Şehri",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_6",
        "code": "3.2.1.6",
        "title": "Dolmabahçe–Levazım Tüneli",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_7",
        "code": "3.2.1.7",
        "title": "Büyük İstanbul Tüneli",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_8",
        "code": "3.2.1.8",
        "title": "İstanbul Kuzey Demiryolu Geçiş Projesi (INRAIL)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_9",
        "code": "3.2.1.9",
        "title": "Ankara–İstanbul Süper Hızlı Tren Güzergahı",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_1_10",
        "code": "3.2.1.10",
        "title": "HIZRAY",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.1. İstanbul’da Büyüme ve Gayrimenkul Eksenli Kentleşmeyi Yönlendiren Mega Projelerin Etkileri"
      },
      {
        "id": "pol_3_2_2",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri",
        "code": "3.2.2",
        "title": "Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "pol_3_2_2_1",
        "code": "3.2.2.1",
        "title": "İstinye Turizm Alanı",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_2_2",
        "code": "3.2.2.2",
        "title": "Ataköy Turizm Merkezi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_2_3",
        "code": "3.2.2.3",
        "title": "Galata Kulesi ve Çevresi Turizm Merkezi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_2_4",
        "code": "3.2.2.4",
        "title": "Beyoğlu Tophane–Salıpazarı",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_2_5",
        "code": "3.2.2.5",
        "title": "Tuzla Akfırat Tepeören",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_2_6",
        "code": "3.2.2.6",
        "title": "Küçükçekmece Yat Limanı",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_2_7",
        "code": "3.2.2.7",
        "title": "Şehir Hastaneleri Projesi (Kartal Dr. Lütfi Kırdar Şehir Hastanesi, Başakşehir Çam ve Sakura Şehir Hastanesi, İstanbul Prof. Dr. Cemil Taşcıoğlu Şehir Hastanesi )",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_2_8",
        "code": "3.2.2.8",
        "title": "Ar-Ge Merkezleri",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.2. Kentsel Hizmet ve Yatırım Alanları Bağlamında İstanbul'da Konut ve Yerleşim Dinamikleri"
      },
      {
        "id": "pol_3_2_3",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri",
        "code": "3.2.3",
        "title": "İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "pol_3_2_3_1",
        "code": "3.2.3.1",
        "title": "Kayaşehir / Kayabaşı Uydukent",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_2",
        "code": "3.2.3.2",
        "title": "Kiptaş Karanfilköy",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_3",
        "code": "3.2.3.3",
        "title": "Kiptaş Silivri 4. etap",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_4",
        "code": "3.2.3.4",
        "title": "Kiptaş BAYRAMPAŞA KENTSEL DÖNÜŞÜM PROJESİ",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_5",
        "code": "3.2.3.5",
        "title": "Emlak Konut Majör Gölyaka, Avcılar",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_6",
        "code": "3.2.3.6",
        "title": "Ataşehir / Arsa - Varyap Meridian, Ülker Sports Area etc",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_7",
        "code": "3.2.3.7",
        "title": "Başakşehir _Emlak Konut",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_8",
        "code": "3.2.3.8",
        "title": "Beykoz Düşler Vadisi _Emlak Konut",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_9",
        "code": "3.2.3.9",
        "title": "TOKİ Bezirganbahçe Konutları",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_10",
        "code": "3.2.3.10",
        "title": "Okmeydanı Fetihtepe 3550 Ada Şehir Yenileme Projesi _TOKİ",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_3_11",
        "code": "3.2.3.11",
        "title": "Arnavutköy, Taşoluk, 2. Bölge (606 Konut) _TOKİ",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.3. İstanbul'da Toplu/Sosyal Konut ve Büyük Ölçekli Konut Projeleri"
      },
      {
        "id": "pol_3_2_4",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm",
        "code": "3.2.4",
        "title": "İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "pol_3_2_4_1",
        "code": "3.2.4.1",
        "title": "Sulukule Kentsel Yenileme Projesi",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_4_2",
        "code": "3.2.4.2",
        "title": "Tarlabaşı Kentsel Yenileme Projesi",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_4_3",
        "code": "3.2.4.3",
        "title": "Süleymaniye Kentsel Yenileme Projesi",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_4_4",
        "code": "3.2.4.4",
        "title": "Fener–Balat–Ayvansaray Kentsel Yenileme Projesi",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_4_5",
        "code": "3.2.4.5",
        "title": "Fikirtepe Kentsel Dönüşümü",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_4_6",
        "code": "3.2.4.6",
        "title": "Yeni Şehir ve Kanal İstanbul Projesi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_4_7",
        "code": "3.2.4.7",
        "title": "Kamu Arazilerinin Dönüşümü ve Yeni Yerleşim Alanlarının Üretimi (Hasdal Kışlası, Maltepe Piyade Atış Okulu, Esenler Topkule Kışlası, Erenköy Gümrük Müdürlüğü) -- Tuzla, Aydınlı, 4. Bölge 3. Etap - Tuzla Pİyade Okulu - Esenler Damlakent",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_4_8",
        "code": "3.2.4.8",
        "title": "Sanayi Alanlarının Dönüşümü ve Konut Gelişimi (örn:Maltepe–Dragos hattı)",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.4. İstanbul’da Rezerv Alan Politikaları ve Kentsel Dönüşüm"
      },
      {
        "id": "pol_3_2_5",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları",
        "code": "3.2.5",
        "title": "Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "pol_3_2_5_1",
        "code": "3.2.5.1",
        "title": "Konut Finansmanı Sistemi (Mortgage) Uygulaması",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_2",
        "code": "3.2.5.2",
        "title": "Türkiye Kalkınma Fonu",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_3",
        "code": "3.2.5.3",
        "title": "Kredi Garanti Fonu (KGF) Desteği: Kentsel Dönüşüm Destek Paketi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_4",
        "code": "3.2.5.4",
        "title": "İlçe Belediyelerinden uygulama örnekleri (kira desteği, dönüşüm desteği vb)",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_5",
        "code": "3.2.5.5",
        "title": "100 Bin Sosyal Konut Projesi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_6",
        "code": "3.2.5.6",
        "title": "“Vatandaşlık karşılığı konut” düzenlemesi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_7",
        "code": "3.2.5.7",
        "title": "100 Bin Sosyal Konut ve 15 Bin Sosyal Kiralık Konut Projesi (500 Bin Sosyal Konut - Yüzyılın Konut Projesi)",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_8",
        "code": "3.2.5.8",
        "title": "İlk Evim – İlk Arsam – İlk İşyerim Projeleri",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_9",
        "code": "3.2.5.9",
        "title": "KİPTAŞ destek programları: İstanbul Yenileniyor",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_10",
        "code": "3.2.5.10",
        "title": "Tek Yapı Dönüştürme Projesi (İstanbul Yenileniyor)",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_11",
        "code": "3.2.5.11",
        "title": "İlçe Belediyelerinden uygulama örnekleri",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_12",
        "code": "3.2.5.12",
        "title": "2018 İmar Barışı",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_13",
        "code": "3.2.5.13",
        "title": "Kira artış oranı sınırı (%25)",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_14",
        "code": "3.2.5.14",
        "title": "Konutların turizm amaçlı kiralanmasının düzenlenmesi (“Airbnb Yasası”)",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_15",
        "code": "3.2.5.15",
        "title": "Dönüşüm Projeleri Özel Hesabı",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_16",
        "code": "3.2.5.16",
        "title": "Riskli binalar için kira desteği",
        "defaultStatus": "nm_yaziliyor",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_17",
        "code": "3.2.5.17",
        "title": "Geçici konut tahsisi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_18",
        "code": "3.2.5.18",
        "title": "Kentsel dönüşümde KDV indirimi (%18 → %1)",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_19",
        "code": "3.2.5.19",
        "title": "Riskli binalar için kentsel dönüşüm mali destek paketi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_20",
        "code": "3.2.5.20",
        "title": "Afet Yeniden İmar Fonu",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_21",
        "code": "3.2.5.21",
        "title": "İstanbul Kentsel Dönüşüm Kredi Programı - “Yarısı Bizden” Kampanyası + 3 Milyon Destek",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_5_22",
        "code": "3.2.5.22",
        "title": "Kentsel Dönüşüm Destek Paketi",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.5. Konut Üretimini ve Talebini Etkileyen Teşvik ve Finansman Mekanizmaları"
      },
      {
        "id": "pol_3_2_6",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları",
        "code": "3.2.6",
        "title": "Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "pol_3_2_6_1",
        "code": "3.2.6.1",
        "title": "İBB Sosyal Konut ve Kiracı Destek Programları",
        "defaultStatus": "nm_kontrol_tamamlandi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları"
      },
      {
        "id": "pol_3_2_6_2",
        "code": "3.2.6.2",
        "title": "Sosyal Yardımlaşma ve Dayanışma Genel Müdürlüğü (SYDGM) Konut Yardımları",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları"
      },
      {
        "id": "pol_3_2_6_3",
        "code": "3.2.6.3",
        "title": "Türkiye Konut Edindirme Yardımı (Kira Yardımı Uygulamaları)",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları"
      },
      {
        "id": "pol_3_2_6_4",
        "code": "3.2.6.4",
        "title": "Öğrencilere barınma desteği, yurtlar",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları"
      },
      {
        "id": "pol_3_2_6_5",
        "code": "3.2.6.5",
        "title": "Engelli Bireylere Yönelik Erişilebilir Konut Standartları",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları"
      },
      {
        "id": "pol_3_2_6_6",
        "code": "3.2.6.6",
        "title": "Aile ve Sosyal Hizmetler Bakanlığı çocuk, yaşlı ve engelli bakım politikaları",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları"
      },
      {
        "id": "pol_3_2_6_7",
        "code": "3.2.6.7",
        "title": "Göçmen ve sığınmacı barınma politikaları",
        "defaultStatus": "baslanmadi",
        "level1": "3. POLİTİKA, PLAN, YATIRIM VE TEŞVİKLER BAĞLAMINDA İSTANBUL’DA KONUT VE BARINMA",
        "level1Num": "3",
        "level2": "3.2. Yakın Dönem Politika, Yatırım ve Teşviklerin İstanbul’da Konut ve Barınmaya Etkileri",
        "level3": "3.2.6. Kırılgan Grupların Barınma İhtiyacına Yönelik Politika ve Destek Mekanizmaları"
      }
    ]
  },
  {
    "num": "4",
    "title": "4. SONUÇ: İSTANBUL’DA TOPLUMSAL REFAH VE NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMAYI YENIDEN DÜŞÜNMEK",
    "items": [
      {
        "id": "pol_4",
        "level1": "4. SONUÇ: İSTANBUL’DA TOPLUMSAL REFAH VE NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMAYI YENIDEN DÜŞÜNMEK",
        "level1Num": "4",
        "level2": "4. SONUÇ: İSTANBUL’DA TOPLUMSAL REFAH VE NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMAYI YENIDEN DÜŞÜNMEK",
        "code": "4",
        "title": "SONUÇ: İSTANBUL’DA TOPLUMSAL REFAH VE NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMAYI YENIDEN DÜŞÜNMEK",
        "defaultStatus": "baslanmadi",
        "defaultPages": "5-10 sf"
      }
    ]
  }
];
