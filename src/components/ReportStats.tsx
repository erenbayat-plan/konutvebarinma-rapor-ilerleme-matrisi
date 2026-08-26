import React from 'react';

interface ReportStatsProps {
  stats: {
    total: number;
    totalProgress: number;
    totalEstimatedPages: number;
    authorsCount: number;
    totalAnalyses: number;
    completedAnalyses: number;
    draftingAnalyses: number;
    // Status breakdown counts
    maviDepodaGuncel: number;
    maviDepoyaGidebilir: number;
    raporOkunduEA: number;
    raporOkunduSidar: number;
    raporaYazildi: number;
    tamamlandiRaporuYazilabilir: number;
    analizTamamlandi: number;
    analizDevamEdiyor: number;
    baslanmadi: number;
  };
}

export const ReportStats: React.FC<ReportStatsProps> = ({ stats }) => {
  return (
    <div className="report-stats-grid">
      {/* Genel İlerleme Card */}
      <div className="stat-card main-stat-card">
        <div className="sc-header">
          <span className="sc-label">Genel Rapor İlerlemesi</span>
          <span className="sc-badge">İstanbul Plan 2050</span>
        </div>
        <div className="sc-main-val">
          <span className="sc-percent">%{stats.totalProgress}</span>
          <div className="sc-ratio">
            <b>{stats.maviDepodaGuncel + stats.maviDepoyaGidebilir}</b> / {stats.total} Başlık Yayına Hazır
          </div>
        </div>
        <div className="sc-progress-bar">
          <div 
            className="sc-progress-fill" 
            style={{ width: `${stats.totalProgress}%` }}
          />
        </div>
      </div>

      {/* Mavi Depoda Güncel (%100) */}
      <div className="stat-card">
        <div className="sc-header">
          <span className="sc-label">Mavi Depoda Güncel</span>
        </div>
        <div className="sc-val text-emerald-700">{stats.maviDepodaGuncel}</div>
        <div className="sc-sub">%100 Tamamlandı</div>
      </div>

      {/* Mavi Depoya Gidebilir (%98) */}
      <div className="stat-card">
        <div className="sc-header">
          <span className="sc-label">Mavi Depoya Gidebilir</span>
        </div>
        <div className="sc-val text-teal-700">{stats.maviDepoyaGidebilir}</div>
        <div className="sc-sub">%98 Hazır</div>
      </div>

      {/* Kontrolü Tamam (EA / Sidar) */}
      <div className="stat-card">
        <div className="sc-header">
          <span className="sc-label">Rapor Okundu</span>
        </div>
        <div className="sc-val text-blue-700">{stats.raporOkunduEA + stats.raporOkunduSidar}</div>
        <div className="sc-sub">EA: {stats.raporOkunduEA} (%95) · Sidar: {stats.raporOkunduSidar} (%85)</div>
      </div>

      {/* Rapora Yazıldı / Yazılabilir */}
      <div className="stat-card">
        <div className="sc-header">
          <span className="sc-label">Yazım Aşamasında</span>
        </div>
        <div className="sc-val text-amber-700">{stats.raporaYazildi + stats.tamamlandiRaporuYazilabilir}</div>
        <div className="sc-sub">Yazıldı: {stats.raporaYazildi} (%80) · Yazılabilir: {stats.tamamlandiRaporuYazilabilir} (%70)</div>
      </div>

      {/* Analiz Süreci */}
      <div className="stat-card">
        <div className="sc-header">
          <span className="sc-label">Analiz Süreci</span>
        </div>
        <div className="sc-val text-slate-700">{stats.analizTamamlandi + stats.analizDevamEdiyor}</div>
        <div className="sc-sub">Tamam: {stats.analizTamamlandi} (%60) · Devam: {stats.analizDevamEdiyor} (%40)</div>
      </div>

      {/* Başlanmadı */}
      <div className="stat-card">
        <div className="sc-header">
          <span className="sc-label">Başlanmadı</span>
        </div>
        <div className="sc-val text-slate-500">{stats.baslanmadi}</div>
        <div className="sc-sub">%0 Henüz başlanmadı</div>
      </div>
    </div>
  );
};
