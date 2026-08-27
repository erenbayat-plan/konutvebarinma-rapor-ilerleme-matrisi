import React, { useState } from 'react';
import { getStatusLabel, ReportItem, ReportChapterGroup } from '../reportData';
import type { ReportStatusItem } from '../syncService';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportStatus: Record<string, ReportStatusItem>;
  analysisStatuses: Record<string, 'Tamamlandı' | 'Devam Ediyor' | 'Başlamadı' | 'İncelemede'>;
  chapterNotes: Record<string, string>;
  customSubSections: Record<string, any[]>;
  onResetAll: () => void;
  chapters: ReportChapterGroup[];
  tabName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  reportStatus,
  analysisStatuses,
  chapterNotes,
  customSubSections,
  onResetAll,
  chapters,
  tabName
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getItemId = (item: ReportItem) => {
    if (item.id) return item.id;
    const prefix = tabName === 'Politika_Yatirim' ? 'pol_' : 'konut_';
    return `${prefix}${item.code.replace(/\./g, '_')}`;
  };

  const generateCSV = () => {
    const headers = [
      '1. Düzey Başlık',
      '2. Düzey Başlık',
      '3. Düzey Başlık',
      '4. Düzey Başlık',
      'Kod',
      'Başlık',
      'Şartname Uyumu / Gerekçe',
      'İçerik Özeti',
      'İlişkili Analizler ve Durumları',
      'Yazım Durumu',
      'İlerleme (%)',
      'Sorumlu Yazar',
      'Hedef Sayfa',
      'Drive / Docs Linki',
      'Koordinasyon Notları'
    ];
    const rows: string[][] = [headers];

    chapters.forEach(ch => {
      const defaultItems = ch.items || [];
      const customs = customSubSections[ch.num] || [];
      const allItems = [...defaultItems, ...customs];

      allItems.forEach(item => {
        const id = getItemId(item);
        const st = reportStatus[id] || { 
          status: item.defaultStatus || 'not_started', 
          progress: item.defaultStatus === 'completed' ? 100 : item.defaultStatus === 'drafting' ? 50 : 0, 
          author: '', 
          targetPages: item.defaultPages || '', 
          note: '', 
          driveLink: '' 
        };

        const analysesStr = (item.analizler || [])
          .map(an => `${an.name} [${analysisStatuses[an.id] || an.status}]`)
          .join(' | ');

        rows.push([
          `"${item.level1 || `${ch.num}. ${ch.title}`}"`,
          `"${(item.level2 || '').replace(/"/g, '""')}"`,
          `"${(item.level3 || '').replace(/"/g, '""')}"`,
          `"${(item.level4 || '').replace(/"/g, '""')}"`,
          `"${item.code}"`,
          `"${item.title.replace(/"/g, '""')}"`,
          `"${(item.sartnameUyum || '').replace(/"/g, '""')}"`,
          `"${(item.icerikOzeti || '').replace(/"/g, '""')}"`,
          `"${analysesStr.replace(/"/g, '""')}"`,
          `"${getStatusLabel(st.status, (item.analizler && item.analizler.length > 0) || false)}"`,
          `"%${st.progress || (st.status === 'completed' ? 100 : 0)}"`,
          `"${(st.author || '').replace(/"/g, '""')}"`,
          `"${(st.targetPages || item.defaultPages || '').replace(/"/g, '""')}"`,
          `"${(st.driveLink || '').replace(/"/g, '""')}"`,
          `"${(st.note || '').replace(/"/g, '""')}"`
        ]);
      });
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(';')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Istanbul_Plan_2050_${tabName}_Matrisi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    let summaryText = `İSTANBUL PLAN 2050 ÇEVRE DÜZENİ PLANI\nKONUT VE BARINMA GRUBU RAPOR ÇATKISI & İLERLEME RAPORU\nTarih: ${new Date().toLocaleDateString('tr-TR')}\n\n`;

    let totalItems = 0;
    let completedItems = 0;

    chapters.forEach(ch => {
      const defaultItems = ch.items || [];
      const customs = customSubSections[ch.num] || [];
      const allItems = [...defaultItems, ...customs];

      summaryText += `\n[ ${ch.num}. ${ch.title} ]\n`;
      if (chapterNotes[ch.num]) {
        summaryText += `Genel Not: ${chapterNotes[ch.num]}\n`;
      }

      allItems.forEach(item => {
        totalItems++;
        const id = getItemId(item);
        const st = reportStatus[id] || { 
          status: item.defaultStatus || 'not_started', 
          progress: item.defaultStatus === 'completed' ? 100 : item.defaultStatus === 'drafting' ? 50 : 0, 
          author: '', 
          targetPages: '' 
        };
        if (st.status === 'completed') completedItems++;

        const authorStr = st.author ? ` | Yazar: ${st.author}` : '';
        const pagesStr = st.targetPages ? ` | ${st.targetPages}` : '';
        summaryText += `  • ${item.code} ${item.title} -> [${getStatusLabel(st.status, (item.analizler && item.analizler.length > 0) || false)}] (%${st.progress || 0})${authorStr}${pagesStr}\n`;
      });
    });

    const totalPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    summaryText = `GENEL DURUM: %${totalPct} Tamamlandı (${completedItems}/${totalItems} Alt Bölüm)\n` + summaryText;

    navigator.clipboard.writeText(summaryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h3>Dışa Aktar, Yazdır & Veri Yönetimi</h3>
            <p>Konut ve Barınma Grubu Rapor Çatkısı ve Analiz Matrisini Paylaşın</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            Kapat
          </button>
        </div>

        <div className="modal-body">
          <div className="export-options-grid">
            {/* CSV Export */}
            <div className="export-option-card">
              <div className="eoc-content">
                <h4>Excel / CSV İndir</h4>
                <p>1., 2. ve 3. düzey başlıklar, şartname uyum değerlendirmeleri, analiz listeleri, yazar atamaları ve koordinasyon notlarını Excel uyumlu CSV olarak indirin.</p>
                <button type="button" className="eoc-action-btn btn-emerald" onClick={generateCSV}>
                  CSV Matrisini İndir
                </button>
              </div>
            </div>

            {/* Print */}
            <div className="export-option-card">
              <div className="eoc-content">
                <h4>Yazdır / PDF Kaydet</h4>
                <p>Koordinasyon toplantıları ve yönetim sunumları için temiz sayfa düzeninde yazdırın veya PDF olarak kaydedin.</p>
                <button type="button" className="eoc-action-btn btn-blue" onClick={handlePrint}>
                  Yazdır / PDF
                </button>
              </div>
            </div>

            {/* Copy Summary */}
            <div className="export-option-card">
              <div className="eoc-content">
                <h4>Metin Özeti Kopyala</h4>
                <p>E-posta veya mesajlaşma gruplarına yapıştırmak için tüm bölümlerin durum özetini panoya kopyalayın.</p>
                <button type="button" className="eoc-action-btn btn-amber" onClick={handleCopySummary}>
                  {copied ? 'Kopyalandı!' : 'Metin Olarak Kopyala'}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-danger-zone">
            <div className="mdz-text">
              <h5>Verileri Sıfırla</h5>
              <p>Tüm yerel ve bulut durumlarını varsayılan çatkıya geri döndürür.</p>
            </div>
            <button 
              type="button" 
              className="btn-danger-outline"
              onClick={() => {
                if (window.confirm('Tüm rapor durumları, yazar atamaları ve notlar sıfırlanacak. Emin misiniz?')) {
                  onResetAll();
                  onClose();
                }
              }}
            >
              Tümünü Sıfırla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
