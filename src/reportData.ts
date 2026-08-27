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
}

export interface ReportChapterGroup {
  num: string;
  title: string;
  items: ReportItem[];
}

export const KONUT_BARINMA_CHAPTERS: ReportChapterGroup[] = [
  {
    "num": "1",
    "title": "GİRİŞ",
    "items": [
      {
        "id": "konut_1_1",
        "level1": "1. GİRİŞ",
        "level1Num": "1",
        "level2": "1.1. Amaç ve Kapsam",
        "code": "1.1",
        "title": "Amaç ve Kapsam",
        "sartnameUyum": "Şartnamede yer almamaktadır; rapor bütünlüğü ve okuma akışının sağlanması amacıyla eklenmiştir.",
        "icerikOzeti": "Bu bölümde, çalışmanın amacı, kapsamı, yöntemi ve raporun genel yaklaşımı açıklanacaktır. Analiz sürecinde kullanılan veri kaynakları, temel kavramlar, çalışma kurgusu ve konut ile barınma alanında ele alınan temel tartışma eksenleri ortaya konulacaktır.",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      },
      {
        "id": "konut_1_2",
        "level1": "1. GİRİŞ",
        "level1Num": "1",
        "level2": "1.2. Politika Düzeyinden Sosyomekansal Düzeye İstanbul’da Konut ve Barınmaya Genel Bakış",
        "code": "1.2",
        "title": "Politika Düzeyinden Sosyomekansal Düzeye İstanbul’da Konut ve Barınmaya Genel Bakış",
        "sartnameUyum": "Şartnamenin 6.4.3.1. maddesindeki \"İstanbul’da konut sorunları ve konuta ilişkin mevcut politikalar değerlendirilecektir\" ifadelerine tekabül etmektedir.",
        "icerikOzeti": "Bu bölümde, İstanbul’un konut ve barınma yapısını şekillendiren temel dinamikler genel hatlarıyla ele alınacaktır.",
        "defaultStatus": "baslanmadi",
        "defaultPages": "8-10 sf"
      }
    ]
  },
  {
    "num": "2",
    "title": "İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ",
    "items": [
      {
        "id": "konut_2_1_1",
        "level1": "2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ",
        "level1Num": "2",
        "level2": "2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları",
        "level3": "2.1.1. Kentsel ve Sosyal Adalet",
        "code": "2.1.1",
        "title": "Kentsel ve Sosyal Adalet",
        "defaultStatus": "baslanmadi",
        "defaultPages": "4-6 sf"
      },
      {
        "id": "konut_2_1_2",
        "level1": "2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ",
        "level1Num": "2",
        "level2": "2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları",
        "level3": "2.1.2. Barınma Güvencesi ve Konut Hakkı",
        "code": "2.1.2",
        "title": "Barınma Güvencesi ve Konut Hakkı",
        "defaultStatus": "baslanmadi",
        "defaultPages": "4-6 sf"
      },
      {
        "id": "konut_2_1_3",
        "level1": "2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ",
        "level1Num": "2",
        "level2": "2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları",
        "level3": "2.1.3. Barınma Konforu ve Yaşam Çevresi",
        "code": "2.1.3",
        "title": "Barınma Konforu ve Yaşam Çevresi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "4-6 sf"
      },
      {
        "id": "konut_2_1_4",
        "level1": "2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ",
        "level1Num": "2",
        "level2": "2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları",
        "level3": "2.1.4. Konut Alanlarında Sosyal Etkileşim ve Sivil İnisiyatif",
        "code": "2.1.4",
        "title": "Konut Alanlarında Sosyal Etkileşim ve Sivil İnisiyatif",
        "defaultStatus": "baslanmadi",
        "defaultPages": "4-6 sf"
      },
      {
        "id": "konut_2_1_5",
        "level1": "2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ",
        "level1Num": "2",
        "level2": "2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları",
        "level3": "2.1.5. Konut Alanlarında Dirençlilik - Metabolik Bütünlük",
        "code": "2.1.5",
        "title": "Konut Alanlarında Dirençlilik - Metabolik Bütünlük",
        "defaultStatus": "baslanmadi",
        "defaultPages": "4-6 sf"
      },
      {
        "id": "konut_2_2",
        "level1": "2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ",
        "level1Num": "2",
        "level2": "2.2. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Analitik Düzeyleri",
        "code": "2.2",
        "title": "Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Analitik Düzeyleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      }
    ]
  },
  {
    "num": "3",
    "title": "İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
    "items": [
      {
        "id": "konut_3_1_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1",
        "title": "Konut Dokuları ve Yerleşim Tipolojileri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "12-16 sf"
      },
      {
        "id": "konut_3_1_1_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.1",
        "title": "İstanbul'da Konut Alanları",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.2",
        "title": "Konut Alanlarının Kentsel ve Kırsal Tipolojisi",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.3",
        "title": "Konut Sunum Biçimleri ve Üretim Aktörleri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.4",
        "title": "Yapı ve Konut Tipolojileri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.5",
        "title": "Konut Yoğunluğu",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_6",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.6",
        "title": "Nüfus Yoğunluğu",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_7",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.7",
        "title": "Sokak Dokusu, Parsel Örüntüsü ve Yapı Nizamı İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_8",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.8",
        "title": "Kıyı Bölgesi Konut Karakteri Analizi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_9",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.9",
        "title": "Merkez Bölgesi Konut Karakteri Analizi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_10",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.10",
        "title": "Çeper Bölgesi Konut Karakteri Analizi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_1_11",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.1 Konut Dokuları ve Yerleşim Tipolojileri",
        "code": "3.1.1.11",
        "title": "Eşik Bölgelerindeki Konut Alanları Analizi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.2 Planlama Kararları ve Gelişme Dinamikleri",
        "code": "3.1.2",
        "title": "Planlama Kararları ve Gelişme Dinamikleri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "6-8 sf"
      },
      {
        "id": "konut_3_1_2_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.2 Planlama Kararları ve Gelişme Dinamikleri",
        "code": "3.1.2.1",
        "title": "Planların getirdiği yoğunluk",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_2_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.2 Planlama Kararları ve Gelişme Dinamikleri",
        "code": "3.1.2.2",
        "title": "Nüfus Yoğunluğu",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.3 Doğal Eşikler ve Çevresel Konfor Koşulları",
        "code": "3.1.3",
        "title": "Doğal Eşikler ve Çevresel Konfor Koşulları",
        "defaultStatus": "analiz_tamamlandi",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_1_3_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.3 Doğal Eşikler ve Çevresel Konfor Koşulları",
        "code": "3.1.3.1",
        "title": "Tarım Alanları Üzerindeki Yerleşim Baskısı",
        "defaultStatus": "analiz_tamamlandi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_3_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.3 Doğal Eşikler ve Çevresel Konfor Koşulları",
        "code": "3.1.3.2",
        "title": "Orman Alanları Üzerindeki Yerleşim Baskısı",
        "defaultStatus": "analiz_tamamlandi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_3_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.3 Doğal Eşikler ve Çevresel Konfor Koşulları",
        "code": "3.1.3.3",
        "title": "Koruma Alanları Üzerindeki Yerleşim Baskısı",
        "defaultStatus": "analiz_tamamlandi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_3_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.3 Doğal Eşikler ve Çevresel Konfor Koşulları",
        "code": "3.1.3.4",
        "title": "Su Havzaları Üzerindeki Yerleşim Baskısı",
        "defaultStatus": "analiz_tamamlandi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_1_3_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.1 Konut Alanları Gelişimi ve Konut Morfolojisi",
        "level3": "3.1.3 Doğal Eşikler ve Çevresel Konfor Koşulları",
        "code": "3.1.3.5",
        "title": "Çevresel Konfor Koşulları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1",
        "title": "Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "10-12 sf"
      },
      {
        "id": "konut_3_2_1_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.1",
        "title": "Heyelan Duyarlılığı ve Konut Alanları",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.2",
        "title": "Heyelana Maruz Bölgelerde Yer Alan Konut Alanları",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.3",
        "title": "Tsunami Riski Altındaki Konut Alanları Analizi",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.4",
        "title": "Afete Maruz Bölgelerde Yer Alan Konut Alanları",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.5",
        "title": "Deprem Senaryosuna Göre Çok Ağır ve Ağır Hasarlı Yapıların Konut Alanlarıyla İlişkisi",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1_6",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.6",
        "title": "Taşkın Tehlikesi Altındaki Konut Alanları Analizi",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1_7",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.7",
        "title": "Acil Müdahale Erişimi Açısından Konut Alanları",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_1_8",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık",
        "code": "3.2.1.8",
        "title": "Dolgu Alanlarında Yer Alan Konut Alanları",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.2 Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri",
        "code": "3.2.2",
        "title": "Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "10-14 sf"
      },
      {
        "id": "konut_3_2_2_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.2 Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri",
        "code": "3.2.2.1",
        "title": "6306 Sayılı Kanun Kapsamında Rezerv Yapı Alanı Olarak Belirlenen Alanlar",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_2_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.2 Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri",
        "code": "3.2.2.2",
        "title": "6306 Sayılı Kanun Kapsamında Riskli Alan Olarak Belirlenen Alanlar",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_2_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.2 Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri",
        "code": "3.2.2.3",
        "title": "5366 Sayılı Kanun Kapsamında Kentsel Yenileme Alanları",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_2_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.2 Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri",
        "code": "3.2.2.4",
        "title": "5393 Sayılı Belediye Kanunu’nun 69. ve 73. Maddeleri Kapsamında Kentsel Dönüşüm ve Gelişim Alanları",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_2_2_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.2 Afet Riski ve Kentsel Dönüşüm",
        "level3": "3.2.2 Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri",
        "code": "3.2.2.5",
        "title": "Kentsel Dönüşüm ve Gelişim Proje Alanı",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.1 Arz Dinamikleri ve Aktör Yapısı",
        "code": "3.3.1",
        "title": "Arz Dinamikleri ve Aktör Yapısı",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_3_1_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.1 Arz Dinamikleri ve Aktör Yapısı",
        "code": "3.3.1.1",
        "title": "İnşaatın GSYH İçindeki Payı Share of construction in GDP",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_1_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.1 Arz Dinamikleri ve Aktör Yapısı",
        "code": "3.3.1.2",
        "title": "Kamu Aktörlerinin Ürettiği Toplu Konut Alanları",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_1_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.1 Arz Dinamikleri ve Aktör Yapısı",
        "code": "3.3.1.3",
        "title": "Yeni Yapı Ruhsatı Alan Bağımsız Birim Sayısındaki Eğilim",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_1_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.1 Arz Dinamikleri ve Aktör Yapısı",
        "code": "3.3.1.4",
        "title": "Yeni Yapı Ruhsatı Alan Bağımsız Birim - Üretim Profili Kümeleri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_1_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.1 Arz Dinamikleri ve Aktör Yapısı",
        "code": "3.3.1.5",
        "title": "Yeni Yapı Ruhsatı Alan Bağımsız Birimlerde Baskın Üretim Aktörleri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.2 Konut Talebi",
        "code": "3.3.2",
        "title": "Konut Talebi",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_3_2_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.2 Konut Talebi",
        "code": "3.3.2.1",
        "title": "Konut Satış Sayıları",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_2_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.2 Konut Talebi",
        "code": "3.3.2.2",
        "title": "Konut Satış Trendleri Analizi (İlçe Profil Kümeleri)",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_2_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.2 Konut Talebi",
        "code": "3.3.2.3",
        "title": "Konut Satış Trendleri Analizi",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_2_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.2 Konut Talebi",
        "code": "3.3.2.4",
        "title": "İpotekli Konut Borçluluğu ve GSYH İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.3 Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları",
        "code": "3.3.3",
        "title": "Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "10-12 sf"
      },
      {
        "id": "konut_3_3_3_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.3 Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları",
        "code": "3.3.3.1",
        "title": "Konut Fiyat Değişimi",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_3_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.3 Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları",
        "code": "3.3.3.2",
        "title": "Konut Fiyatı / Hanehalkı Yıllık Gelir Oranı (F/G House Price-to-Income Ratio (PIR)",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_3_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.3 Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları",
        "code": "3.3.3.3",
        "title": "Kiralık Konut Fiyat Değişimleri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_3_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.3 Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları",
        "code": "3.3.3.4",
        "title": "Kira Artış Oranı (Yıllık, bölge bazlı medyan %) Annual Rent Increase Rate (% median, by sub-market)",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_3_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.3 Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları",
        "code": "3.3.3.5",
        "title": "Kira Yükü Oranı (Kira / Gelir %) Rent-to-Income Ratio (RIR) (OECD HC1.2)",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.4 Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku",
        "code": "3.3.4",
        "title": "Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_3_4_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.4 Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku",
        "code": "3.3.4.1",
        "title": "Boş Konut Oranı",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_4_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.4 Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku",
        "code": "3.3.4.2",
        "title": "Konut Fiyatı Yıllık Kira Değeri Oranı",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_4_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.4 Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku",
        "code": "3.3.4.3",
        "title": "Yabancıya Konut Satışları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_4_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.4 Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku",
        "code": "3.3.4.4",
        "title": "Turizm ve Kısa Süreli Kiralama Baskısı (Airbnb Etkisi)",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.5 Arsa Değeri, Spekülasyon ve Rant",
        "code": "3.3.5",
        "title": "Arsa Değeri, Spekülasyon ve Rant",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "10-12 sf"
      },
      {
        "id": "konut_3_3_5_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.5 Arsa Değeri, Spekülasyon ve Rant",
        "code": "3.3.5.1",
        "title": "Arsa Değerleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_5_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.5 Arsa Değeri, Spekülasyon ve Rant",
        "code": "3.3.5.2",
        "title": "Arsa Değer Artışları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_3_5_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.3 Konut Sunum Biçimleri ve Karşılanabilirlik",
        "level3": "3.3.5 Arsa Değeri, Spekülasyon ve Rant",
        "code": "3.3.5.3",
        "title": "Ekonomik Eskime",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.1 Yapılaşma Yoğunluğu ve Açık Alan İlişkileri",
        "code": "3.4.1",
        "title": "Yapılaşma Yoğunluğu ve Açık Alan İlişkileri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "6-8 sf"
      },
      {
        "id": "konut_3_4_1_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.1 Yapılaşma Yoğunluğu ve Açık Alan İlişkileri",
        "code": "3.4.1.1",
        "title": "Yapılaşma Yoğunluğu",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_1_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.1 Yapılaşma Yoğunluğu ve Açık Alan İlişkileri",
        "code": "3.4.1.2",
        "title": "Yapı Nizam",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_1_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.1 Yapılaşma Yoğunluğu ve Açık Alan İlişkileri",
        "code": "3.4.1.3",
        "title": "Açık Alan Oranı",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.2 Bina Stokunun Niteliği ve Yapısal Yeterliliği",
        "code": "3.4.2",
        "title": "Bina Stokunun Niteliği ve Yapısal Yeterliliği",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_4_2_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.2 Bina Stokunun Niteliği ve Yapısal Yeterliliği",
        "code": "3.4.2.1",
        "title": "Bağımsız Birim",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_2_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.2 Bina Stokunun Niteliği ve Yapısal Yeterliliği",
        "code": "3.4.2.2",
        "title": "Kat Sayısı",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_2_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.2 Bina Stokunun Niteliği ve Yapısal Yeterliliği",
        "code": "3.4.2.3",
        "title": "Yapım Yılı (aralık)",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3",
        "title": "Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_4_3_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3.1",
        "title": "Konut Sayısı",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_3_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3.2",
        "title": "Bağımsız Birim",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_3_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3.3",
        "title": "Boş Konut",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_3_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3.4",
        "title": "Ortalama Konut Büyüklükleri",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_3_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3.5",
        "title": "Oda Sayısı",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_3_6",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3.6",
        "title": "Baskın Oda Sayısı",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_3_7",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri",
        "code": "3.4.3.7",
        "title": "Yeni Ruhsatlı Bağımsız Birimlerde Konut Büyüklüğü Değişim",
        "defaultStatus": "tamamlandi_raporu_yazilabilir",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.4 Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı",
        "code": "3.4.4",
        "title": "Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı",
        "defaultStatus": "analiz_tamamlandi",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_4_4_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.4 Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı",
        "code": "3.4.4.1",
        "title": "Kişi Başı Oda Sayısı (Barınma Yoğunluğu) Rooms per household member",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_4_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.4 Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı",
        "code": "3.4.4.2",
        "title": "Aşırı Kalabalık Hane Oranı Overcrowding Rate (%)",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_4_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.4 Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı",
        "code": "3.4.4.3",
        "title": "Kişi Başı Brüt/Net (Kullanılabilir) Konut Alanı (m²) Housing Area per Person (m²)",
        "defaultStatus": "analiz_devam_ediyor",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_4_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.4 Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı",
        "code": "3.4.4.4",
        "title": "Ortalama Hane Büyüklüğü",
        "defaultStatus": "analiz_tamamlandi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "code": "3.4.5",
        "title": "Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "defaultStatus": "baslanmadi",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_4_5_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "code": "3.4.5.1",
        "title": "Hane tiplerinin yorumlanması",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_5_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "code": "3.4.5.2",
        "title": "Nüfus Yoğunluğu – Konut Yoğunluğu İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_5_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "code": "3.4.5.3",
        "title": "Ortlaşama Hanehalkı Büyüklüğü – Konut Tipolojisi İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_5_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "code": "3.4.5.4",
        "title": "Nüfus Değişimi – Konut Gelişimi İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_5_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "code": "3.4.5.5",
        "title": "Demografik Yapı - Konut Dokusu Eşleşmesi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_5_6",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma",
        "code": "3.4.5.6",
        "title": "Nüfus Değişimi – Konut Gelişimi İlişkisi (iç göç ve yabancılar)",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6",
        "title": "Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "10-12 sf"
      },
      {
        "id": "konut_3_4_6_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.1",
        "title": "SES – Konut Stoku Niteliği",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.2",
        "title": "SES – Konut Yoğunluğu İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.3",
        "title": "SES – Konut Üretim Dinamiği",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.4",
        "title": "Kiracılık – Konut Dokusu İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_5",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.5",
        "title": "Ev Sahipliği – Konut Dokusu İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_6",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.6",
        "title": "Kiracılık – Kiralık Konut Değeri İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_7",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.7",
        "title": "Barınma Yükü ve Yaşam Maliyetleri (Dışsal Maliyetler) Toplam Konut Maliyeti (Barınma Yükü) Total Housing Costs (Wider Definition)",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_8",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.8",
        "title": "Konut Maliyeti Yükü",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_9",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.9",
        "title": "Konut Aşırı Maliyeti Yükü",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_4_6_10",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri",
        "level3": "3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri",
        "code": "3.4.6.10",
        "title": "Konut Kaynaklı Harcamaların Hanehalkı Tüketimindeki Payı",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.1 Ulaşım Ağları, Hareketlilik Örüntüleri ve Gündelik Erişim Kapasitesi",
        "code": "3.5.1",
        "title": "Ulaşım Ağları, Hareketlilik Örüntüleri ve Gündelik Erişim Kapasitesi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_5_1_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.1 Ulaşım Ağları, Hareketlilik Örüntüleri ve Gündelik Erişim Kapasitesi",
        "code": "3.5.1.1",
        "title": "Toplu Taşıma ve Raylı Sistem Erişilebilirliği",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_1_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.1 Ulaşım Ağları, Hareketlilik Örüntüleri ve Gündelik Erişim Kapasitesi",
        "code": "3.5.1.2",
        "title": "İş, eğitim ve hizmet alanlarına erişim süreleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_1_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.1 Ulaşım Ağları, Hareketlilik Örüntüleri ve Gündelik Erişim Kapasitesi",
        "code": "3.5.1.3",
        "title": "Ulaşım Erişimi – Konut Değeri İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.2 Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler",
        "code": "3.5.2",
        "title": "Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler",
        "defaultStatus": "baslanmadi",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_3_5_2_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.2 Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler",
        "code": "3.5.2.1",
        "title": "Sosyal ve Kamusal Donatı Alanlarının Erişilebilirliği",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_2_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.2 Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler",
        "code": "3.5.2.2",
        "title": "Açık, Yeşil ve Kamusal Alan Sistemleri İlişkisi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_2_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.2 Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler",
        "code": "3.5.2.3",
        "title": "Teknik Altyapı Hizmetlerinin Yeterliliği",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_2_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.2 Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler",
        "code": "3.5.2.4",
        "title": "Toplumsal Dayanışma Kapasitesi",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.3 Karma Kullanım, Yakın Çevre İlişkileri ve Gündelik Karşılaşma Mekânları",
        "code": "3.5.3",
        "title": "Karma Kullanım, Yakın Çevre İlişkileri ve Gündelik Karşılaşma Mekânları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      },
      {
        "id": "konut_3_5_3_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.3 Karma Kullanım, Yakın Çevre İlişkileri ve Gündelik Karşılaşma Mekânları",
        "code": "3.5.3.1",
        "title": "Zemin Kat Kullanımı ve Bina İçi Fonksiyon Organizasyonu",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_3_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.3 Karma Kullanım, Yakın Çevre İlişkileri ve Gündelik Karşılaşma Mekânları",
        "code": "3.5.3.2",
        "title": "Karma Kullanım Düzeyi (Mixed-Use Index - MXI)",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_5_3_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim",
        "level3": "3.5.3 Karma Kullanım, Yakın Çevre İlişkileri ve Gündelik Karşılaşma Mekânları",
        "code": "3.5.3.3",
        "title": "Gündelik Yaşam Olanaklarının Çeşitliliği ve Mahalle Ticareti",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_6",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.6. İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "code": "3.6",
        "title": "İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "defaultStatus": "baslanmadi",
        "defaultPages": "10-14 sf"
      },
      {
        "id": "konut_3_6_1",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.6. İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "level3": "3.6 İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "code": "3.6.1",
        "title": "Fizik Mekan",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_6_2",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.6. İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "level3": "3.6 İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "code": "3.6.2",
        "title": "Piyasa Dinamikleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_6_3",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.6. İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "level3": "3.6 İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "code": "3.6.3",
        "title": "Hane Durumu",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      },
      {
        "id": "konut_3_6_4",
        "level1": "3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU",
        "level1Num": "3",
        "level2": "3.6. İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "level3": "3.6 İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar",
        "code": "3.6.4",
        "title": "Planlama Durumu + İlgili Dönüşüm Mevzuatları",
        "defaultStatus": "baslanmadi",
        "defaultPages": "1-3 sf"
      }
    ]
  },
  {
    "num": "4",
    "title": "İYİ UYGULAMALAR VE ALTERNATİF MODELLER",
    "items": [
      {
        "id": "konut_4_1_1",
        "level1": "4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER",
        "level1Num": "4",
        "level2": "4.1 Refah Devletinden Bugüne Sosyal Konut Yaklaşımlarında Değişen Çerçeve",
        "level3": "4.1.1 Kamu Eliyle Sosyal Konut Üretiminde Çağdaş Örnekler",
        "code": "4.1.1",
        "title": "Kamu Eliyle Sosyal Konut Üretiminde Çağdaş Örnekler",
        "defaultStatus": "baslanmadi",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_4_1_2",
        "level1": "4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER",
        "level1Num": "4",
        "level2": "4.1 Refah Devletinden Bugüne Sosyal Konut Yaklaşımlarında Değişen Çerçeve",
        "level3": "4.1.2 Özel Sermaye Eliyle Sosyal Konut Üretimi ve Karma Ekonomik Grupları İçeren Model",
        "code": "4.1.2",
        "title": "Özel Sermaye Eliyle Sosyal Konut Üretimi ve Karma Ekonomik Grupları İçeren Model",
        "defaultStatus": "baslanmadi",
        "defaultPages": "8-10 sf"
      },
      {
        "id": "konut_4_2_1",
        "level1": "4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER",
        "level1Num": "4",
        "level2": "4.2 İlerici Örnekler: Sivil Ekonomi Ağları ve Konut Sunumunda Kolektivitenin Yeni Ufku",
        "level3": "4.2.1. Barınma Odağında Toplumsal Dayanışma Ekonomileri",
        "code": "4.2.1",
        "title": "Barınma Odağında Toplumsal Dayanışma Ekonomileri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      },
      {
        "id": "konut_4_2_2",
        "level1": "4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER",
        "level1Num": "4",
        "level2": "4.2 İlerici Örnekler: Sivil Ekonomi Ağları ve Konut Sunumunda Kolektivitenin Yeni Ufku",
        "level3": "4.2.2. Kullanım Hakkına Dayalı Konut Kooperatifçiliğinin Tarihsel Kökenleri",
        "code": "4.2.2",
        "title": "Kullanım Hakkına Dayalı Konut Kooperatifçiliğinin Tarihsel Kökenleri",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      },
      {
        "id": "konut_4_2_3",
        "level1": "4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER",
        "level1Num": "4",
        "level2": "4.2 İlerici Örnekler: Sivil Ekonomi Ağları ve Konut Sunumunda Kolektivitenin Yeni Ufku",
        "level3": "4.2.3 Kullanım Hakkına Dayalı Konut Kooperatifçiliği",
        "code": "4.2.3",
        "title": "Kullanım Hakkına Dayalı Konut Kooperatifçiliği",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      },
      {
        "id": "konut_4_3",
        "level1": "4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER",
        "level1Num": "4",
        "level2": "4.3 Alternatif Konut Modellerin İstanbul’da Uygulanabilirliği",
        "code": "4.3",
        "title": "Alternatif Konut Modellerin İstanbul’da Uygulanabilirliği",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      }
    ]
  },
  {
    "num": "5",
    "title": "GENEL DEĞERLENDİRME",
    "items": [
      {
        "id": "konut_5_1",
        "level1": "5. GENEL DEĞERLENDİRME",
        "level1Num": "5",
        "level2": "5.1. Genel Değerlendirme",
        "code": "5.1",
        "title": "Genel Değerlendirme",
        "defaultStatus": "baslanmadi",
        "defaultPages": "6-8 sf"
      }
    ]
  }
];

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
