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
  // Legacy mappings for backwards compatibility
  | 'completed'
  | 'review'
  | 'drafting'
  | 'not_started';

export const STATUS_PROGRESS_MAP: Record<ReportStatusType, number> = {
  mavi_depoda_guncel: 100,
  mavi_depoya_gidebilir: 98,
  rapor_okundu_ea: 95,
  rapor_okundu_sidar: 85,
  rapora_yazildi: 80,
  tamamlandi_raporu_yazilabilir: 70,
  analiz_tamamlandi: 60,
  analiz_devam_ediyor: 40,
  baslanmadi: 0,
  // legacy fallback
  completed: 100,
  review: 85,
  drafting: 40,
  not_started: 0
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  mavi_depoda_guncel: 'Mavi depoda güncel (%100)',
  mavi_depoya_gidebilir: 'Mavi depoya gidebilir (%98)',
  rapor_okundu_ea: 'Rapor okundu (EA), kontrolleri tamam (%95)',
  rapor_okundu_sidar: 'Rapor okundu (Sidar), kontrolleri tamam (%85)',
  rapora_yazildi: 'Rapora yazıldı, kontrol bekliyor (%80)',
  tamamlandi_raporu_yazilabilir: 'Tamamlandı, raporu yazılabilir (%70)',
  analiz_tamamlandi: 'Analiz tamamlandı, kontrol edilecek (%60)',
  analiz_devam_ediyor: 'Analiz devam ediyor (%40)',
  baslanmadi: 'Başlanmadı (%0)'
};

// Pure short status labels
export const REPORT_STATUS_SHORT_LABEL: Record<string, string> = {
  mavi_depoda_guncel: 'Mavi depoda güncel',
  mavi_depoya_gidebilir: 'Mavi depoya gidebilir',
  rapor_okundu_ea: 'Rapor okundu (EA)',
  rapor_okundu_sidar: 'Rapor okundu (Sidar)',
  rapora_yazildi: 'Rapora yazıldı',
  tamamlandi_raporu_yazilabilir: 'Tamamlandı, raporu yazılabilir',
  analiz_tamamlandi: 'Analiz tamamlandı',
  analiz_devam_ediyor: 'Analiz devam ediyor',
  baslanmadi: 'Başlanmadı',
  completed: 'Mavi depoda güncel',
  review: 'Rapor okundu (Sidar)',
  drafting: 'Analiz devam ediyor',
  not_started: 'Başlanmadı'
};

/**
 * Calculates the automated Report Status based on sub-analyses states:
 * 1. All Tamamlandı -> "Tamamlandı, raporu yazılabilir" (%70)
 * 2. Only Tamamlandı and Devam Ediyor (no Başlamadı) -> "Analiz tamamlandı, kontrol edilecek" (%60)
 * 3. Mix of Tamamlandı/Devam Ediyor/Başlamadı -> "Analiz devam ediyor" (%40)
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

  // 1. Altındaki analizlerin tamamı tamamlandığında: "Tamamlandı, raporu yazılabilir %70"
  if (doneCount === total && total > 0) {
    return { status: 'tamamlandi_raporu_yazilabilir', progress: 70 };
  }

  // 2. Sadece Tamamlandı ve Devam Ediyor varsa (hiç Başlamadı yoksa): "Analiz tamamlandı, kontrol edilecek %60"
  if (notStartedCount === 0 && (doneCount > 0 || inProgressCount > 0)) {
    return { status: 'analiz_tamamlandi', progress: 60 };
  }

  // 3. Tamamlandı, Başlamadı ve Devam Ediyor karışımı (analizler devam ediyor): "Analiz devam ediyor %40"
  if (doneCount > 0 || inProgressCount > 0) {
    return { status: 'analiz_devam_ediyor', progress: 40 };
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
    num: '1',
    title: 'GİRİŞ',
    items: [
      {
        id: 'konut_1_1',
        level1: '1. GİRİŞ',
        level1Num: '1',
        level2: '1.1. Amaç ve Kapsam',
        code: '1.1',
        title: 'Amaç ve Kapsam',
        sartnameUyum: 'Şartnamede yer almamaktadır; rapor bütünlüğü ve okuma akışının sağlanması amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, çalışmanın amacı, kapsamı, yöntemi ve raporun genel yaklaşımı açıklanacaktır. Analiz sürecinde kullanılan veri kaynakları, temel kavramlar, çalışma kurgusu ve konut ile barınma alanında ele alınan temel tartışma eksenleri ortaya konulacaktır.',
        defaultStatus: 'mavi_depoda_guncel',
        defaultPages: '6-8 sf'
      },
      {
        id: 'konut_1_2',
        level1: '1. GİRİŞ',
        level1Num: '1',
        level2: '1.2. Politika Düzeyinden Sosyomekansal Düzeye İstanbul’da Konut ve Barınmaya Genel Bakış',
        code: '1.2',
        title: 'Politika Düzeyinden Sosyomekansal Düzeye İstanbul’da Konut ve Barınmaya Genel Bakış',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "İstanbul’da konut sorunları ve konuta ilişkin mevcut politikalar değerlendirilecektir" ifadelerine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’un konut ve barınma yapısını şekillendiren temel dinamikler genel hatlarıyla ele alınacaktır. Böylece, "Politikalar, Yatırımlar ve Teşviklerin Konut ve Barınmaya Etkisi" raporunda ayrıntılı olarak incelenecek politika, yatırım ve teşvik başlıkları ile mevcut konut ve barınma örüntüleri arasında ilişki kurulmasına yönelik bir çerçeve ortaya konulacaktır.',
        defaultStatus: 'baslanmadi',
        defaultPages: '8-10 sf'
      }
    ]
  },
  {
    num: '2',
    title: 'İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ',
    items: [
      {
        id: 'konut_2_1_1',
        level1: '2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ',
        level1Num: '2',
        level2: '2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları',
        level3: '2.1.1. Kentsel ve Sosyal Adalet',
        code: '2.1.1',
        title: 'Kentsel ve Sosyal Adalet',
        sartnameUyum: 'Şartnamede doğrudan yer almamaktadır; raporun kavramsal çerçevesinin oluşturulması amacıyla danışman hocanın önerisi doğrultusunda eklenmiştir.',
        icerikOzeti: 'Bu bölümde, Nitelikli Yaşam Çevresi’nin temel boyutlarından biri olan kentsel ve sosyal adalet kavramı ele alınacaktır. Böylece, raporun bütününde kullanılacak değerlendirme perspektifinin kavramsal zemini oluşturulacaktır.',
        defaultStatus: 'analiz_devam_ediyor',
        defaultPages: '4-6 sf'
      },
      {
        id: 'konut_2_1_2',
        level1: '2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ',
        level1Num: '2',
        level2: '2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları',
        level3: '2.1.2. Barınma Güvencesi ve Konut Hakkı',
        code: '2.1.2',
        title: 'Barınma Güvencesi ve Konut Hakkı',
        sartnameUyum: 'Şartnamede doğrudan yer almamaktadır; raporun kavramsal çerçevesinin oluşturulması amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, Nitelikli Yaşam Çevresi’nin temel boyutlarından biri olan barınma güvencesi ve konut hakkı kavramları ele alınacaktır. Böylece, raporun bütününde kullanılacak değerlendirme perspektifinin kavramsal zemini oluşturulacaktır.',
        defaultStatus: 'baslanmadi',
        defaultPages: '4-6 sf'
      },
      {
        id: 'konut_2_1_3',
        level1: '2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ',
        level1Num: '2',
        level2: '2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları',
        level3: '2.1.3. Barınma Konforu ve Yaşam Çevresi',
        code: '2.1.3',
        title: 'Barınma Konforu ve Yaşam Çevresi',
        sartnameUyum: 'Şartnamede doğrudan yer almamaktadır; raporun kavramsal çerçevesinin oluşturulması amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, Nitelikli Yaşam Çevresi’nin temel boyutlarından biri olan barınma konforu ve yaşam alanı kalitesi kavramı ele alınacaktır. Böylece, raporun bütününde kullanılacak değerlendirme perspektifinin kavramsal zemini oluşturulacaktır.',
        defaultStatus: 'baslanmadi',
        defaultPages: '4-6 sf'
      },
      {
        id: 'konut_2_1_4',
        level1: '2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ',
        level1Num: '2',
        level2: '2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları',
        level3: '2.1.4. Konut Alanlarında Sosyal Etkileşim ve Sivil İnisiyatif',
        code: '2.1.4',
        title: 'Konut Alanlarında Sosyal Etkileşim ve Sivil İnisiyatif',
        sartnameUyum: 'Şartnamede doğrudan yer almamaktadır; raporun kavramsal çerçevesinin oluşturulması amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, Nitelikli Yaşam Çevresi’nin temel boyutlarından biri olan sosyal etkileşim ve sivil inisiyatif kavramları ele alınacaktır. Böylece, raporun bütününde kullanılacak değerlendirme perspektifinin kavramsal zemini oluşturulacaktır.',
        defaultStatus: 'baslanmadi',
        defaultPages: '4-6 sf'
      },
      {
        id: 'konut_2_1_5',
        level1: '2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ',
        level1Num: '2',
        level2: '2.1. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Boyutları',
        level3: '2.1.5. Konut Alanlarında Dirençlilik - Metabolik Bütünlük',
        code: '2.1.5',
        title: 'Konut Alanlarında Dirençlilik - Metabolik Bütünlük',
        sartnameUyum: 'Şartnamede doğrudan yer almamaktadır; raporun kavramsal çerçevesinin oluşturulması amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, Nitelikli Yaşam Çevresi’nin temel boyutlarından biri olan dirençlilik kavramı ele alınacaktır. Böylece, raporun bütününde kullanılacak değerlendirme perspektifinin kavramsal zemini oluşturulacaktır.',
        defaultStatus: 'baslanmadi',
        defaultPages: '4-6 sf'
      },
      {
        id: 'konut_2_2',
        level1: '2. İSTANBUL PLAN 2050 KONUT VE BARINMA YAKLAŞIMI: NİTELİKLİ YAŞAM ÇEVRESİ İLKESİ',
        level1Num: '2',
        level2: '2.2. Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Analitik Düzeyleri',
        code: '2.2',
        title: 'Nitelikli Yaşam Çevresi Bağlamında Konut ve Barınmanın Analitik Düzeyleri',
        sartnameUyum: 'Şartnamede doğrudan yer almamaktadır; raporun mekânsal ölçek kurgusu amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, Nitelikli Yaşam Çevresi yaklaşımının konut ve barınma alanlarının değerlendirilmesinde kullanılacak analitik düzeyleri tanımlanacaktır. Konut üniteleri ve hane yaşamından başlayarak yapı ve yapı adaları, mahalle ve gündelik yaşam çevresi ile kent ve kamusal hayat düzeylerine uzanan çok katmanlı değerlendirme çerçevesi açıklanacaktır.',
        defaultStatus: 'baslanmadi',
        defaultPages: '6-8 sf'
      }
    ]
  },
  {
    num: '3',
    title: 'İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
    items: [
      {
        id: 'konut_3_1_1',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.1 Konut Alanları Gelişimi ve Konut Morfolojisi',
        level3: '3.1.1 Konut Dokuları ve Yerleşim Tipolojileri',
        code: '3.1.1',
        title: 'Konut Dokuları ve Yerleşim Tipolojileri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "farklı konut dokuları ve tipolojileri, tarihi çevrede yer alan konut alanları, çöküntü bölgeleri, toplu konut alanları, gecekondu önleme bölgeleri, ıslah imar planlı bölgeler, planlı-plansız konut alanları" ifadelerine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki konut dokuları, yerleşim tipolojileri ve bunların ürettiği mekânsal karakter değerlendirilecektir. Gecekondu alanları, toplu konut alanları, gecekondu önleme bölgeleri, ıslah imar planlı bölgeler, tarihi çevrelerdeki konut dokuları, kırsal yerleşimler ve farklı konut sunum biçimleri incelenerek konut alanlarının temel karakteristikleri ortaya konacaktır.',
        defaultStatus: 'drafting',
        defaultPages: '12-16 sf',
        analizler: [
          { id: 'a311_1', name: "İstanbul'da Konut Alanları", status: 'Tamamlandı' },
          { id: 'a311_2', name: 'Kentsel ve Kırsal Konut Tipolojilerinin Karşılaştırılması', status: 'Tamamlandı' },
          { id: 'a311_3', name: 'Konut sunum biçimleri ve üretim aktörlerine göre tipoloji haritalaması', status: 'Tamamlandı' },
          { id: 'a311_4', name: 'Kamu ve Özel Sektör Eliyle Üretilen Alanların Mekânsal Karakter Karşılaştırması', status: 'Devam Ediyor' },
          { id: 'a311_5', name: 'Konut Dokuları', status: 'Devam Ediyor' },
          { id: 'a311_6', name: 'Yoğunluk Analizleri', status: 'Devam Ediyor' },
          { id: 'a311_7', name: 'Sokak Dokusu, Parsel Örüntüsü ve Yapı Nizamı İlişkisi', status: 'Başlamadı' },
          { id: 'a311_8', name: 'Konut Tipolojileri ile Yapı Adası Morfolojisi İlişkisi', status: 'Başlamadı' },
          { id: 'a311_9', name: 'Makroform ve Coğrafi Konum Analizleri (Kıyı, Merkez, Çeper, Eşik)', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_1_2',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.1 Konut Alanları Gelişimi ve Konut Morfolojisi',
        level3: '3.1.2 Planlama Kararları ve Gelişme Dinamikleri',
        code: '3.1.2',
        title: 'Planlama Kararları ve Gelişme Dinamikleri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut sorunları ve konuta ilişkin mevcut politikalar değerlendirilecektir" ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, planlama kararları ile konut alanlarının gelişimi arasındaki ilişkiler değerlendirilecektir.',
        defaultStatus: 'completed',
        defaultPages: '6-8 sf',
        analizler: [
          { id: 'a312_1', name: 'Plan hiyerarşisi ve merkezi-yerel plan çakışma analizi', status: 'Tamamlandı' }
        ]
      },
      {
        id: 'konut_3_1_3',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.1 Konut Alanları Gelişimi ve Konut Morfolojisi',
        level3: '3.1.3 Doğal Eşikler ve Çevresel Konfor Koşulları',
        code: '3.1.3',
        title: 'Doğal Eşikler ve Çevresel Konfor Koşulları',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "orman, tarım ve su havzaları gibi doğal alanlarda yapılaşmış konut alanları, planlı-plansız konut alanları, konut alanlarındaki nüfus, yapı yoğunluğu ve arazi değerleri ilişkileri vb. konular araştırılacaktır." ifadesine tekabül etmektedir. Ayrıca başlık kapsamında gerçekleştirilecek analizler, aynı maddede yer alan "konut niteliği" konusunun çevresel koşullar ve yaşam çevresinin niteliği bağlamında değerlendirilmesini destekleyecektir.',
        icerikOzeti: 'Bu bölümde, konut alanlarının doğal eşiklerle ilişkisi, çevresel konfor koşulları ve yaşam çevresinin niteliği değerlendirilecektir. Tarım alanları, orman alanları, koruma alanları ve su havzaları üzerindeki yerleşim baskıları ele alınarak doğal alanlar üzerindeki yapılaşma eğilimleri incelenecektir. Ayrıca hava kalitesi, doğal havalandırma koşulları ve ısı adası etkisi gibi çevresel faktörler değerlendirilerek bu koşulların konut alanlarıyla ilişkisi ortaya konulacaktır.',
        defaultStatus: 'drafting',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a313_1', name: 'Tarım Alanları Üzerindeki Yerleşim Baskısı', status: 'Tamamlandı' },
          { id: 'a313_2', name: 'Orman Alanları Üzerindeki Yerleşim Baskısı', status: 'Tamamlandı' },
          { id: 'a313_3', name: 'Koruma Alanları Üzerindeki Yerleşim Baskısı', status: 'Tamamlandı' },
          { id: 'a313_4', name: 'Su Havzaları Üzerindeki Yerleşim Baskısı', status: 'Tamamlandı' },
          { id: 'a313_5', name: 'Çevresel Konfor Koşulları', status: 'Devam Ediyor' }
        ]
      },
      {
        id: 'konut_3_2_1',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.2 Afet Riski ve Kentsel Dönüşüm',
        level3: '3.2.1 Yerleşime Uygunluk ve Yapısal Kırılganlık',
        code: '3.2.1',
        title: 'Yerleşime Uygunluk ve Yapısal Kırılganlık',
        sartnameUyum: 'Şartnamenin 6.4.3.1.maddesindeki "...jeolojik açıdan yerleşime uygun olmayan alanlarda yapılaşmış konut alanları, yerleşime uygunluk, orman, tarım ve su havzaları gibi doğal alanlarda yapılaşmış konut alanları" ifadelerine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki konut alanlarının yerleşime uygunluk koşulları, doğal eşikler ve yapısal kırılganlıkları değerlendirilecektir. Jeolojik uygunluk, deprem, heyelan, sıvılaşma ve taşkın riskleri ile dolgu alanlarında bulunan konut alanları incelenerek yerleşime ilişkin risk koşulları ortaya konulacaktır. Ayrıca yapı yaşı, yapı türü, yapı riski, zemin koşulları ve riskli alanlardaki nüfus ve yapı yoğunlukları değerlendirilerek doğal çevre koşulları ile yapılaşma özellikleri arasındaki ilişkiler ele alınacaktır. Tarım ve orman alanları üzerindeki yerleşim baskıları da bu kapsamda değerlendirilecektir.',
        defaultStatus: 'completed',
        defaultPages: '10-12 sf',
        analizler: [
          { id: 'a321_1', name: 'Heyelan Duyarlılığı ve Konut Alanları', status: 'Tamamlandı' },
          { id: 'a321_2', name: 'Heyelana Maruz Bölgelerde Yer Alan Konut Alanları', status: 'Tamamlandı' },
          { id: 'a321_3', name: 'Tsunami Riski Altındaki Konut Alanları Analizi', status: 'Tamamlandı' },
          { id: 'a321_4', name: 'Afete Maruz Bölgelerde Yer Alan Konut Alanları', status: 'Tamamlandı' },
          { id: 'a321_5', name: 'Deprem Senaryosuna Göre Çok Ağır ve Ağır Hasarlı Yapıların Konut Alanlarıyla İlişkisi', status: 'Tamamlandı' },
          { id: 'a321_6', name: 'Taşkın Tehlikesi Altındaki Konut Alanları Analizi', status: 'Tamamlandı' },
          { id: 'a321_7', name: 'Acil Müdahale Erişimi Açısından Konut Alanları', status: 'Tamamlandı' },
          { id: 'a321_8', name: 'Dolgu Alanlarında Yer Alan Konut Alanları', status: 'Tamamlandı' }
        ]
      },
      {
        id: 'konut_3_2_2',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.2 Afet Riski ve Kentsel Dönüşüm',
        level3: '3.2.2 Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri',
        code: '3.2.2',
        title: 'Kentsel Dönüşüm Dinamiklerinin Konut ve Barınmaya Etkileri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut sorunları ve konuta ilişkin mevcut politikalar değerlendirilecektir" ifadesine tekabül etmektedir. Ayrıca başlık kapsamında gerçekleştirilecek analizler, şartnamenin 6.4.3.2. maddesinde yer alan kentsel dönüşüm politikaları ve uygulamalarının konut ve barınma üzerindeki etkilerinin değerlendirilmesine altlık oluşturacaktır.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki kentsel dönüşüm süreçleri ile bu süreçlerin konut ve barınma alanları üzerindeki etkileri değerlendirilecektir. Riskli alanlar, rezerv yapı alanları, riskli yapı kararları ve farklı dönüşüm uygulama türleri incelenerek dönüşümün mekânsal boyutu ortaya konacaktır. Ayrıca dönüşüm süreçlerinin konut fiyatları, kira düzeyleri, yoğunluk, mülkiyet yapısı ve yerleşik nüfus üzerindeki etkileri değerlendirilerek konut ve barınma alanlarında meydana gelen değişimler analiz edilecektir.',
        defaultStatus: 'drafting',
        defaultPages: '10-14 sf',
        analizler: [
          { id: 'a322_1', name: '6306 ile riskli ilan edilen konut yapıları', status: 'Başlamadı' },
          { id: 'a322_2', name: '6306 ile rezerv alan ilan edilen alanlar', status: 'Tamamlandı' },
          { id: 'a322_3', name: '6306 ile riskli ilan edilen alanlar', status: 'Tamamlandı' },
          { id: 'a322_4', name: 'Kentsel Yenileme Alanları Sınırı (5366 sayılı kanun kapsamında genelde tarihi alanlar )', status: 'Tamamlandı' },
          { id: 'a322_5', name: '5393 Sayılı Belediye Kanunu (69. ve 73. madde) ile kentsel dönüşüm ve gelişim alanı ilan edilen alanlar (Belediyelerin ilan ettiği alanlar', status: 'Tamamlandı' },
          { id: 'a322_6', name: 'Öncelikli Müdahale Alanları', status: 'Başlamadı' },
          { id: 'a322_7', name: 'Dönüşüm hızı ve uygulama tipi haritası: tamamlanan, devam eden ve durağan projeler', status: 'Devam Ediyor' },
          { id: 'a322_8', name: 'Büyük Ölçekli Konut Üreticileri ve Kamu Müdahalelerinin Çeperleşme Üzerindeki Rolü', status: 'Devam Ediyor' },
          { id: 'a322_9', name: 'Saçaklanma, Çeperleşme ve Yoğunlaşma', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_3_1',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.3 Konut Sunum Biçimleri ve Karşılanabilirlik',
        level3: '3.3.1 Arz Dinamikleri ve Aktör Yapısı',
        code: '3.3.1',
        title: 'Arz Dinamikleri ve Aktör Yapısı',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut ve barınma alanları, farklı konut dokuları ve tipolojileri, yerleşime uygunluk, konut niteliği, konut arzının ve talebinin yoğunlaştığı alanlar vb. konular bakımından analiz edilecektir" ifadesine tekabül etmektedir. Başlık kapsamında konut üretim süreçleri, üretimin yoğunlaştığı alanlar ve konut üretiminde rol alan aktörler değerlendirilerek İstanbul’daki konut arzının yapısı analiz edilecektir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki konut arzının oluşum dinamikleri ve konut üretiminde rol alan aktörler değerlendirilecektir. Yapı ruhsatları, yapı kullanma izin belgeleri ve konut üretiminin yoğunlaştığı alanlar incelenerek konut arzının mevcut durumu ortaya konacaktır. Ayrıca kamu eliyle üretilen konutlar, özel sektör yatırımları, toplu konut uygulamaları ve kooperatifler üzerinden farklı konut üretim biçimleri değerlendirilerek konut arzının yapısı analiz edilecektir.',
        defaultStatus: 'completed',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a331_1', name: 'Konut Üretiminde Aktör Yapısı', status: 'Tamamlandı' }
        ]
      },
      {
        id: 'konut_3_3_2',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.3 Konut Sunum Biçimleri ve Karşılanabilirlik',
        level3: '3.3.2 Konut Talebi',
        code: '3.3.2',
        title: 'Konut Talebi',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut ve barınma alanları, farklı konut dokuları ve tipolojileri, yerleşime uygunluk, konut niteliği, konut arzının ve talebinin yoğunlaştığı alanlar vb. konular bakımından analiz edilecektir" ifadesine tekabül etmektedir. Başlık kapsamında konut talebini şekillendiren demografik, ekonomik ve mekânsal dinamikler değerlendirilerek İstanbul’daki konut talebinin yapısı analiz edilecektir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki konut talebinin temel dinamikleri değerlendirilecektir. Konut satışları, nüfus artışı, hane oluşum süreçleri ve göç hareketlerinin konut talebi üzerindeki etkileri incelenecektir. Ayrıca iç göç, yabancıya konut satışları ve yatırım amaçlı konut talebi gibi unsurlar değerlendirilerek konut talebinin oluşumunda etkili olan temel eğilimler ortaya konacaktır.',
        defaultStatus: 'drafting',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a332_1', name: 'Makroekonomik Göstergeler ve Finansman Dinamikleri', status: 'Tamamlandı' },
          { id: 'a332_2', name: 'Demografik Trendler ve Konut İhtiyacı Analizleri', status: 'Başlamadı' },
          { id: 'a332_3', name: 'Segmenter ve Yatırım Odaklı Talep Analizleri', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_3_3',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.3 Konut Sunum Biçimleri ve Karşılanabilirlik',
        level3: '3.3.3 Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları',
        code: '3.3.3',
        title: 'Konut Değerleri, Kira Piyasası ve Karşılanabilirlik Koşulları',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut sorunları değerlendirilecektir" ve "konut arzının ve talebinin yoğunlaştığı alanlar vb. konular bakımından analiz edilecektir" ifadelerine tekabül etmektedir. Başlık kapsamında konut ve kira değerleri ile karşılanabilirlik koşulları değerlendirilerek farklı gelir gruplarının konuta erişim düzeyleri analiz edilecektir.',
        icerikOzeti: 'Bu bölümde, satılık ve kiralık konut metrekare fiyatları hanehalkı gelir düzeyleriyle oranlanarak mahalle ölçeğinde "Karşılanabilirlik Endeksi" (Price-to-Income / Rent-to-Income) hesaplanacaktır. Böylece İstanbul’daki konuta erişim krizinin mekânsal dağılımı ortaya konularak, hane gelirinin ne kadarının barınma giderlerine ayrıldığı analiz edilecektir.',
        defaultStatus: 'completed',
        defaultPages: '10-12 sf',
        analizler: [
          { id: 'a333_1', name: 'Ekonomik Erişilebilirlik ve Barınma Güvencesi Analizleri', status: 'Tamamlandı' },
          { id: 'a333_2', name: 'Bölüm Sonucu', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_3_4',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.3 Konut Sunum Biçimleri ve Karşılanabilirlik',
        level3: '3.3.4 Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku',
        code: '3.3.4',
        title: 'Boş Konut, İkinci Konut ve Kullanım Dışı Konut Stoku',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut ve barınma alanları, farklı konut dokuları ve tipolojileri, ... vb. konular bakımından analiz edilecektir" ve "İstanbul’da konut sorunları ve konuta ilişkin mevcut politikalar değerlendirilecektir. Bu kapsamda; konut açığı, boş konutlar, ... vb. konular ilişkisel olarak ele alınacaktır." ifadelerine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki boş konut, ikinci konut ve kullanım dışı konut stokunun özellikleri değerlendirilecektir. Ayrıca yatırım amaçlı tutulan konutlar, yeni üretilmiş ancak kullanılmayan konut alanları ile turizm ve kısa süreli kiralama kaynaklı kullanım örüntüleri değerlendirilerek mevcut konut stokunun kullanım yoğunluğu ve kullanım biçimlerine ilişkin genel bir çerçeve ortaya konacaktır.',
        defaultStatus: 'drafting',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a334_1', name: 'Hayalet Stok', status: 'Tamamlandı' },
          { id: 'a334_2', name: 'Finansallaşma ve Turizm Odaklı Mekânsal Baskı Analizleri', status: 'Devam Ediyor' },
          { id: 'a334_3', name: 'Bölüm Sonucu', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_3_5',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.3 Konut Sunum Biçimleri ve Karşılanabilirlik',
        level3: '3.3.5 Arsa Değeri, Spekülasyon ve Rant',
        code: '3.3.5',
        title: 'Arsa Değeri, Spekülasyon ve Rant',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut sorunları ve konuta ilişkin mevcut politikalar değerlendirilecektir. Bu kapsamda; konut açığı, boş konutlar, arsa değerleri, arsa spekülasyonu vb. konular ilişkisel olarak ele alınacaktır." ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki arsa değerleri, spekülasyon süreçleri ve rant dinamikleri değerlendirilecektir. Arsa değerleri, konut alanlarındaki değer artış eğilimleri ve yüksek rant baskısı altındaki alanlar incelenerek değer üretim süreçlerinin mekânsal yansımaları ele alınacaktır. Ayrıca arsa spekülasyonu ile konut alanlarındaki değer artış süreçleri arasındaki ilişkiler değerlendirilecektir.',
        defaultStatus: 'drafting',
        defaultPages: '10-12 sf',
        analizler: [
          { id: 'a335_1', name: 'Arsa Değerleri, Değer Artışları ve Rant Dinamikleri', status: 'Tamamlandı' },
          { id: 'a335_2', name: 'Ekonomik Eskimiş ve Eskime Riski Taşıyan Konut Çevreleri', status: 'Devam Ediyor' }
        ]
      },
      {
        id: 'konut_3_4_1',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri',
        level3: '3.4.1 Yapılaşma Yoğunluğu ve Açık Alan İlişkileri',
        code: '3.4.1',
        title: 'Yapılaşma Yoğunluğu ve Açık Alan İlişkileri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "konut alanlarındaki nüfus, yapı yoğunluğu araştırılacaktır" ifadesine tekabül etmektedir.',
        icerikOzeti: 'Konut stoğu temel göstergeleri, konut yoğunluğu ve açık alan ile yapılaşma ilişkilerinin analizi.',
        defaultStatus: 'completed',
        defaultPages: '6-8 sf',
        analizler: [
          { id: 'a341_1', name: 'Konut Yoğunluğu', status: 'Tamamlandı' },
          { id: 'a341_2', name: 'Açık Alan–Yapılaşma İlişkisi', status: 'Tamamlandı' }
        ]
      },
      {
        id: 'konut_3_4_2',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri',
        level3: '3.4.2 Bina Stokunun Niteliği ve Yapısal Yeterliliği',
        code: '3.4.2',
        title: 'Bina Stokunun Niteliği ve Yapısal Yeterliliği',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "konut niteliği analiz edilecektir" ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki bina stokunun fiziksel, yapısal ve teknik özellikleri değerlendirilecektir. Yapım yılı, kat sayısı, yapı türü, taşıyıcı sistem, yapı malzemesi ve kullanım özellikleri üzerinden bina stokunun mevcut yapısı incelenecektir. Ayrıca yapı ruhsatı ve yapı kullanma izin durumu, fiziksel yıpranma düzeyi, yapısal dayanıklılık, enerji performansı, teknik altyapı erişimi ve bina donatı yeterliliği gibi göstergeler ele alınarak bina stokunun yapısal yeterliliğine ilişkin genel bir değerlendirme yapılacaktır.',
        defaultStatus: 'completed',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a342_1', name: 'Bağımsız Birim', status: 'Tamamlandı' },
          { id: 'a342_2', name: 'Kat Sayısı', status: 'Tamamlandı' },
          { id: 'a342_3', name: 'Yapım Yılı (aralık)', status: 'Tamamlandı' },
          { id: 'a342_4', name: 'Yapı Türü', status: 'Tamamlandı' }
        ]
      },
      {
        id: 'konut_3_4_3',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri',
        level3: '3.4.3 Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri',
        code: '3.4.3',
        title: 'Konut Ünitesinin Niteliksel ve Niceliksel Özellikleri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "konut niteliği analiz edilecektir" ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki konut stokunun niceliksel ve niteliksel özellikleri değerlendirilecektir. Toplam konut sayısı, konut tipolojileri, konut büyüklükleri, kullanım alanları ve kullanım durumları üzerinden konut stokunun mevcut yapısı incelenecektir.',
        defaultStatus: 'completed',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a343_1', name: 'Konut Sayısı', status: 'Tamamlandı' },
          { id: 'a343_2', name: 'Bağımsız Birim', status: 'Tamamlandı' },
          { id: 'a343_3', name: 'Boş Konut, İkinci Konut', status: 'Tamamlandı' },
          { id: 'a343_4', name: 'Yapı Ruhsat', status: 'Tamamlandı' },
          { id: 'a343_5', name: 'Konut Büyüklükleri (Endeksa)', status: 'Devam Ediyor' },
          { id: 'a343_6', name: 'Oda Sayısı', status: 'Devam Ediyor' }
        ]
      },
      {
        id: 'konut_3_4_4',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri',
        level3: '3.4.4 Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı',
        code: '3.4.4',
        title: 'Hane Yapısı, Barınma Yoğunluğu ve Yaşam Standardı',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "konut alanlarındaki nüfus, yapı yoğunluğu araştırılacaktır" ve "konut niteliği analiz edilecektir" ifadelerini desteklemektedir.',
        icerikOzeti: 'Bu bölümde, İstanbul’daki hane yapısı, barınma yoğunluğu ve yaşam standardına ilişkin temel göstergeler değerlendirilecektir. Kişi başına düşen brüt konut alanı, oda başına düşen kişi sayısı (barınma yoğunluğu -household crowding index-), ortalama hane büyüklüğü ve hane oluşum eğilimleri üzerinden barınma koşulları incelenecektir. Ayrıca barınma yoğunluğu ile yapılaşma yoğunluğu arasındaki ilişkiler ele alınacak ve farklı yerleşim alanlarında hane yapısı ile barınma koşullarının nasıl değiştiği değerlendirilecektir.',
        defaultStatus: 'drafting',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a344_1', name: 'Barınma Yoğunluğu Analizi', status: 'Devam Ediyor' },
          { id: 'a344_2', name: 'Ortalama Hane Büyüklüğü ve Yapısı', status: 'Tamamlandı' },
          { id: 'a344_3', name: 'Barınma Yoğunluğu ile Yapılaşma Yoğunluğu İlişkisi', status: 'Başlamadı' },
          { id: 'a344_4', name: 'Bölüm Sonucu', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_4_5',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri',
        level3: '3.4.5 Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma',
        code: '3.4.5',
        title: 'Demografik Yapı, Hane Karakteristikleri ve Toplumsal Farklılaşma',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut sorunları değerlendirilecektir" ve "farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi" ifadelerine altlık oluşturmaktadır.',
        icerikOzeti: 'Bu bölümde, İstanbul’un demografik yapısı, hane karakteristikleri ve toplumsal farklılaşma örüntüleri konut ve barınma alanlarıyla ilişkili olarak değerlendirilecektir. Nüfus büyüklüğü, nüfus yoğunluğu, hane tipleri ve hane yapısındaki dönüşümler üzerinden farklı barınma ihtiyaçları ve yerleşim eğilimleri incelenecektir. Ayrıca değişen demografik yapının ve nüfusun konut alanları üzerindeki etkileri ele alınacak; demografik yapı, konut dokuları ve barınma biçimleri arasındaki ilişkiler değerlendirilerek toplumsal farklılaşmanın konut ve barınma alanlarındaki mekânsal yansımaları ortaya konacaktır.',
        defaultStatus: 'drafting',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a345_1', name: 'Nüfus Yoğunluğu ve Hane Tiplerinin Dağılımı', status: 'Devam Ediyor' },
          { id: 'a345_2', name: 'Nüfus Devinimi ve Göçün Yerleşim Yapısına Etkisi', status: 'Başlamadı' },
          { id: 'a345_3', name: 'Demografik Yapı - Konut Dokusu Eşleşmesi', status: 'Başlamadı' },
          { id: 'a345_4', name: 'Bölüm Sonucu', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_4_6',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.4 Konut Ünitesi, Hane Demografisi, Barınma Koşulları ve Kırılganlık Örüntüleri',
        level3: '3.4.6 Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri',
        code: '3.4.6',
        title: 'Sosyoekonomik Yapı, Yoksulluk ve Barınma Eşitsizlikleri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesinde yer alan "İstanbul’da konut sorunları değerlendirilecektir" ve "farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi" ifadelerine altlık oluşturmaktadır.',
        icerikOzeti: 'Bu bölümde, İstanbul’un sosyoekonomik yapısı, yoksulluk örüntüleri ve barınma eşitsizlikleri değerlendirilecektir. Gelir düzeyleri, sosyoekonomik statü, yoksulluk ve sosyal dışlanma göstergeleri üzerinden toplumsal eşitsizliklerin konut ve barınma alanlarındaki yansımaları incelenecektir. Ayrıca hanelerin barınma maliyet yükü, yaşam maliyetleri, konut niteliği ve yaşam çevresi koşulları ile gelir düzeyi arasındaki ilişkiler değerlendirilerek sosyoekonomik farklılıkların barınma koşulları üzerindeki etkileri ortaya konacaktır.',
        defaultStatus: 'drafting',
        defaultPages: '10-12 sf',
        analizler: [
          { id: 'a346_1', name: 'Sosyoekonomik Tabakalaşma ve Mekânsal Segregasyon', status: 'Başlamadı' },
          { id: 'a346_2', name: 'Kentsel Kırılganlık, Yoksulluk ve Yaşam Maliyeti Analizleri', status: 'Devam Ediyor' }
        ]
      },
      {
        id: 'konut_3_5_1',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim',
        level3: '3.5.1 Ulaşım Ağları, Hareketlilik Örüntüleri ve Gündelik Erişim Kapasitesi',
        code: '3.5.1',
        title: 'Ulaşım Ağları, Hareketlilik Örüntüleri ve Gündelik Erişim Kapasitesi',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "konut niteliği analiz edilecektir" ifadesine tekabül etmektedir. Başlık kapsamında konut alanları yalnızca fiziksel özellikleriyle değil, ulaşım olanakları, erişilebilirlik düzeyi ve gündelik hareketlilik ilişkileri çerçevesinde değerlendirilerek yaşam çevresi niteliği ile birlikte ele alınacaktır.',
        icerikOzeti: 'Bu bölümde, konut alanlarının ulaşım ağlarıyla kurduğu ilişkiler, hareketlilik örüntüleri ve gündelik erişim kapasitesi değerlendirilecektir. Ana ulaşım akslarına, raylı sistemlere ve toplu taşıma ağlarına erişim düzeyleri incelenecek; iş, eğitim ve hizmet alanlarına erişim olanakları ile konut alanlarının merkezlerle kurduğu ilişkiler ele alınacaktır.',
        defaultStatus: 'not_started',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a351_1', name: 'Toplu Taşıma ve Raylı Sistem Erişilebilirliği', status: 'Başlamadı' },
          { id: 'a351_2', name: 'İş, eğitim ve hizmet alanlarına erişim süreleri', status: 'Başlamadı' },
          { id: 'a351_3', name: 'Ulaşım Erişimi – Konut Değeri İlişkisi', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_5_2',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim',
        level3: '3.5.2 Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler',
        code: '3.5.2',
        title: 'Sosyal, Teknik ve Kamusal Altyapı Alanlarıyla Kurulan Mekânsal İlişkiler',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "konut niteliği analiz edilecektir" ifadesine tekabül etmektedir. Başlık kapsamında konut alanları yalnızca fiziksel özellikleriyle değil, sosyal, teknik ve kamusal altyapı olanakları ile kurduğu ilişkiler çerçevesinde değerlendirilerek yaşam çevresi niteliği ile birlikte ele alınacaktır.',
        icerikOzeti: 'Bu bölümde, konut alanlarının sosyal, teknik ve kamusal altyapı alanlarıyla kurduğu mekânsal ilişkiler değerlendirilecektir. Sosyal donatı alanları, topluluk mekânları, yerel örgütlenme kapasitesi, açık ve yeşil alan sistemleri ile teknik altyapı hizmetlerinin erişilebilirliği ve mekânsal yeterliliği incelenecektir. Ayrıca donatı alanlarının hizmet etki alanları, mahalle ölçeğinde gündelik ihtiyaçlara erişim kapasitesi ve konut alanlarıyla olan ilişkileri değerlendirilerek yaşam çevresinin niteliğine ilişkin genel bir çerçeve ortaya konacaktır.',
        defaultStatus: 'not_started',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a352_1', name: 'Sosyal ve Kamusal Donatı Alanlarının Erişilebilirliği', status: 'Başlamadı' },
          { id: 'a352_2', name: 'Açık, Yeşil ve Kamusal Alan Sistemleri İlişkisi', status: 'Başlamadı' },
          { id: 'a352_3', name: 'Teknik Altyapı Hizmetlerinin Yeterliliği', status: 'Başlamadı' },
          { id: 'a352_4', name: 'Toplumsal Dayanışma Kapasitesi', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_5_3',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.5 Gündelik Yaşam Çevresi ve Hizmetlere Erişim',
        level3: '3.5.3 Karma Kullanım, Yakın Çevre İlişkileri ve Gündelik Karşılaşma Mekânları',
        code: '3.5.3',
        title: 'Karma Kullanım, Yakın Çevre İlişkileri ve Gündelik Karşılaşma Mekânları',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "konut niteliği analiz edilecektir" ifadesine tekabül etmektedir. Başlık kapsamında konut alanları yalnızca konut birimlerinden oluşan fiziksel mekânlar olarak değil, gündelik yaşamın gerçekleştiği kullanım ilişkileri ve yakın çevre olanakları ile birlikte değerlendirilmektedir.',
        icerikOzeti: 'Bu bölümde, konut alanlarında karma kullanım düzeyi (Mixed-use Index -MXI-), yakın çevre ilişkileri ve gündelik karşılaşma mekânları değerlendirilecektir. Konut ve konut dışı kullanımların bir aradalık biçimleri, bina ve zemin kat kullanım özellikleri ile gündelik yaşamın mekânsal örgütlenişi incelenecektir.',
        defaultStatus: 'not_started',
        defaultPages: '6-8 sf',
        analizler: [
          { id: 'a353_1', name: 'Zemin Kat Kullanımı ve Bina İçi Fonksiyon Organizasyonu', status: 'Başlamadı' },
          { id: 'a353_2', name: 'Karma Kullanım Düzeyi (Mixed-Use Index - MXI)', status: 'Başlamadı' },
          { id: 'a353_3', name: 'Gündelik Yaşam Olanaklarının Çeşitliliği ve Mahalle Ticareti', status: 'Başlamadı' },
          { id: 'a353_4', name: 'Konut Alanları ve Yakın Çevre İlişkileri', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_3_6',
        level1: '3. İSTANBUL’DA NİTELİKLİ YAŞAM ÇEVRESİ BAĞLAMINDA KONUT VE BARINMA ALANLARININ MEVCUT DURUMU',
        level1Num: '3',
        level2: '3.6. İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar',
        code: '3.6',
        title: 'İstanbul’da Konut ve Barınmanın Çok Düzeyli Görünümü: Kısıtlar, Çelişkiler ve İmkânlar',
        sartnameUyum: 'Şartnamede doğrudan yer almamaktadır; rapor kapsamında gerçekleştirilen analizlerden elde edilen bulguların birlikte değerlendirilmesi ve İstanbul’un konut ve barınma yapısına ilişkin genel çerçevenin ortaya konulması amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, konut ve barınma alanlarına ilişkin gerçekleştirilen analizlerden elde edilen bulgular birlikte değerlendirilerek İstanbul’un mevcut konut ve barınma yapısına ilişkin çok düzeyli bir görünüm ortaya konulacaktır. Farklı ölçeklerde ve temalarda gerçekleştirilen analizler arasındaki ilişkiler ele alınacak; konut ve barınma alanlarını şekillendiren temel dinamikler, kısıtlar, çelişkiler ve imkânlar değerlendirilecektir.',
        defaultStatus: 'not_started',
        defaultPages: '10-14 sf',
        analizler: [
          { id: 'a36_1', name: 'Fizik Mekan', status: 'Başlamadı' },
          { id: 'a36_2', name: 'Piyasa Dinamikleri', status: 'Başlamadı' },
          { id: 'a36_3', name: 'Hane Durumu', status: 'Başlamadı' },
          { id: 'a36_4', name: 'Planlama Durumu + İlgili Dönüşüm Mevzuatları', status: 'Başlamadı' }
        ]
      }
    ]
  },
  {
    num: '4',
    title: 'İYİ UYGULAMALAR VE ALTERNATİF MODELLER',
    items: [
      {
        id: 'konut_4_1_1',
        level1: '4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER',
        level1Num: '4',
        level2: '4.1 Refah Devletinden Bugüne Sosyal Konut Yaklaşımlarında Değişen Çerçeve',
        level3: '4.1.1 Kamu Eliyle Sosyal Konut Üretiminde Çağdaş Örnekler',
        code: '4.1.1',
        title: 'Kamu Eliyle Sosyal Konut Üretiminde Çağdaş Örnekler',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "Farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi, konuta erişim sorunu yaşayanlara yönelik sosyal konut ve sosyal kiralık konut üretilmesi, konut alanlarının karma ekonomik grupları içerecek şekilde geliştirilmesi, uygun fiyatlı konut sunumuna katkı sunacak farklı araçlara yönelik iyi örnekler incelenecektir." ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, kamu eliyle geliştirilen sosyal konut ve sosyal kiralık konut uygulamalarına ilişkin örnekler incelenecektir. Kamu kurumlarının konut üretimi, mülkiyet yapısı, kiralama mekanizmaları, finansman modelleri ve hedef gruplara erişim biçimleri ele alınarak sosyal konutun güncel uygulama araçları ortaya konulacaktır.',
        defaultStatus: 'not_started',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a411_1', name: '4.1.1 Kamu Eliyle Sosyal Konut Üretiminde Çağdaş Örnekler', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_4_1_2',
        level1: '4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER',
        level1Num: '4',
        level2: '4.1 Refah Devletinden Bugüne Sosyal Konut Yaklaşımlarında Değişen Çerçeve',
        level3: '4.1.2 Özel Sermaye Eliyle Sosyal Konut Üretimi ve Karma Ekonomik Grupları İçeren Model',
        code: '4.1.2',
        title: 'Özel Sermaye Eliyle Sosyal Konut Üretimi ve Karma Ekonomik Grupları İçeren Model',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "Farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi, konuta erişim sorunu yaşayanlara yönelik sosyal konut ve sosyal kiralık konut üretilmesi, konut alanlarının karma ekonomik grupları içerecek şekilde geliştirilmesi, uygun fiyatlı konut sunumuna katkı sunacak farklı araçlara yönelik iyi örnekler incelenecektir." ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, özel sektörün sosyal ve erişilebilir konut üretimindeki rolüne ilişkin örnekler incelenecektir. Farklı gelir gruplarını aynı konut sistemi içerisinde ele alan uygulamalar, kamu-özel iş birliği mekanizmaları, planlama araçları ve finansman modelleri çerçevesinde değerlendirilerek karma ekonomik grupları içeren konut sunum biçimleri ortaya konulacaktır.',
        defaultStatus: 'not_started',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a412_1', name: '4.1.2 Özel Sermaye Eliyle Sosyal Konut Üretimi ve Karma Ekonomik Grupları İçeren Model', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_4_2_1',
        level1: '4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER',
        level1Num: '4',
        level2: '4.2 İlerici Örnekler: Sivil Ekonomi Ağları ve Konut Sunumunda Kolektivitenin Yeni Ufku',
        level3: '4.2.1. Barınma Odağında Toplumsal Dayanışma Ekonomileri',
        code: '4.2.1',
        title: 'Barınma Odağında Toplumsal Dayanışma Ekonomileri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "Farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi, konuta erişim sorunu yaşayanlara yönelik sosyal konut ve sosyal kiralık konut üretilmesi, konut alanlarının karma ekonomik grupları içerecek şekilde geliştirilmesi, uygun fiyatlı konut sunumuna katkı sunacak farklı araçlara yönelik iyi örnekler incelenecektir." ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, barınma alanında geliştirilen toplumsal dayanışma ekonomileri ve kolektif üretim pratikleri incelenecektir. Topluluk temelli örgütlenmeler, müşterekleşme yaklaşımları, dayanışma ağları ve piyasa dışı konut sunum biçimleri ele alınarak barınma ihtiyacına yönelik alternatif örgütlenme modelleri ortaya konulacaktır.',
        defaultStatus: 'not_started',
        defaultPages: '6-8 sf',
        analizler: [
          { id: 'a421_1', name: '4.2.1. Barınma Odağında Toplumsal Dayanışma Ekonomileri', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_4_2_2',
        level1: '4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER',
        level1Num: '4',
        level2: '4.2 İlerici Örnekler: Sivil Ekonomi Ağları ve Konut Sunumunda Kolektivitenin Yeni Ufku',
        level3: '4.2.2. Kullanım Hakkına Dayalı Konut Kooperatifçiliğinin Tarihsel Kökenleri',
        code: '4.2.2',
        title: 'Kullanım Hakkına Dayalı Konut Kooperatifçiliğinin Tarihsel Kökenleri',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "Farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi, konuta erişim sorunu yaşayanlara yönelik sosyal konut ve sosyal kiralık konut üretilmesi, konut alanlarının karma ekonomik grupları içerecek şekilde geliştirilmesi, uygun fiyatlı konut sunumuna katkı sunacak farklı araçlara yönelik iyi örnekler incelenecektir." ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, barınma alanında geliştirilen toplumsal dayanışma ekonomileri ve kolektif üretim pratikleri incelenecektir. Topluluk temelli örgütlenmeler, müşterekleşme yaklaşımları, dayanışma ağları ve piyasa dışı konut sunum biçimleri ele alınarak barınma ihtiyacına yönelik alternatif örgütlenme modelleri ortaya konulacaktır.',
        defaultStatus: 'not_started',
        defaultPages: '6-8 sf',
        analizler: [
          { id: 'a422_1', name: '4.2.2. Kullanım Hakkına Dayalı Konut Kooperatifçiliğinin Tarihsel Kökenleri', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_4_2_3',
        level1: '4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER',
        level1Num: '4',
        level2: '4.2 İlerici Örnekler: Sivil Ekonomi Ağları ve Konut Sunumunda Kolektivitenin Yeni Ufku',
        level3: '4.2.3 Kullanım Hakkına Dayalı Konut Kooperatifçiliği',
        code: '4.2.3',
        title: 'Kullanım Hakkına Dayalı Konut Kooperatifçiliği',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "Farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi, konuta erişim sorunu yaşayanlara yönelik sosyal konut ve sosyal kiralık konut üretilmesi, konut alanlarının karma ekonomik grupları içerecek şekilde geliştirilmesi, uygun fiyatlı konut sunumuna katkı sunacak farklı araçlara yönelik iyi örnekler incelenecektir." ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, kullanım hakkına dayalı konut kooperatifçiliği modeli incelenecektir. Danimarka’daki Andel modeli, Uruguay’daki FUCVAM modeli, İsviçre’deki "Sadece Barınmaktan Fazlası" yaklaşımı ve Katalonya’daki "Cessió d\'Ús" modeli ele alınarak kullanım hakkına dayalı konut sunumunun farklı uygulama biçimleri ortaya konulacaktır. Ayrıca bu modelleri mümkün kılan çok katmanlı kamu-sivil ortaklığı ekosistemi, yönetişim yapıları ve destek mekanizmaları incelenecektir.',
        defaultStatus: 'not_started',
        defaultPages: '8-10 sf',
        analizler: [
          { id: 'a423_1', name: '4.2.2.Kullanım Hakkına Dayalı Konut Kooperatifçiliği', status: 'Başlamadı' }
        ]
      },
      {
        id: 'konut_4_3',
        level1: '4. İYİ UYGULAMALAR VE ALTERNATİF MODELLER',
        level1Num: '4',
        level2: '4.3 Alternatif Konut Modellerin İstanbul’da Uygulanabilirliği',
        code: '4.3',
        title: 'Alternatif Konut Modellerin İstanbul’da Uygulanabilirliği',
        sartnameUyum: 'Şartnamenin 6.4.3.1. maddesindeki "Farklı toplumsal grupların ihtiyaçlarına yönelik barınma alternatiflerinin çeşitlendirilmesi, konuta erişim sorunu yaşayanlara yönelik sosyal konut ve sosyal kiralık konut üretilmesi, konut alanlarının karma ekonomik grupları içerecek şekilde geliştirilmesi, uygun fiyatlı konut sunumuna katkı sunacak farklı araçlara yönelik iyi örnekler incelenecektir. Bu örneklerin, mekâna indirgenmesine yönelik çalışmalar yapılacaktır." ifadesine tekabül etmektedir.',
        icerikOzeti: 'Bu bölümde, incelenen model ve araçların İstanbul bağlamındaki uygulanabilirliği değerlendirilecektir. Uluslararası örneklerden çıkarılan dersler doğrultusunda bu modellerin hukuki, kurumsal, ekonomik ve mekânsal gereklilikleri ele alınacaktır. Ayrıca İstanbul’da bu araç ve modellerin hangi koşullarda ve hangi mekanizmalar aracılığıyla geliştirilebileceği tartışılacaktır.',
        defaultStatus: 'not_started',
        defaultPages: '8-12 sf'
      }
    ]
  },
  {
    num: '5',
    title: 'GENEL DEĞERLENDİRME',
    items: [
      {
        id: 'konut_5_1',
        level1: '5. GENEL DEĞERLENDİRME',
        level1Num: '5',
        level2: '5.1 Genel Değerlendirme ve Sentez',
        code: '5.1',
        title: 'Genel Değerlendirme ve Sentez',
        sartnameUyum: 'Şartnamede yer almamaktadır; rapor bütünlüğü ve okuma akışının sağlanması amacıyla eklenmiştir.',
        icerikOzeti: 'Bu bölümde, rapor kapsamında gerçekleştirilen analizlerden elde edilen temel bulgular Nitelikli Yaşam Çevresi yaklaşımı çerçevesinde bütüncül olarak değerlendirilecektir. Konut ve barınma alanlarına ilişkin mekânsal, toplumsal, ekonomik ve çevresel eğilimler birlikte ele alınarak İstanbul’un mevcut durumu ortaya konulacak; temel dinamikler, sorun alanları ve potansiyeller bütüncül bir bakış açısıyla değerlendirilecektir.',
        defaultStatus: 'not_started',
        defaultPages: '10-15 sf'
      }
    ]
  }
];
