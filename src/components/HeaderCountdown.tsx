import React, { useState, useEffect } from 'react';
import { getCalendarCountdown, pad2 } from '../countdown';

export const HeaderCountdown: React.FC = () => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const cal = getCalendarCountdown(now);

  return (
    <div 
      className="header-countdown-widget" 
      id="header-countdown-widget"
      title="Rapor Teslim Tarihi: 15 Ekim 2026 · 17:00 (Hafta sonları dahil takvim süresi)"
    >
      <div className="hc-badge">
        <span className="hc-badge-title">TESLİME</span>
      </div>

      <div className="hc-timer-display">
        {/* GÜN */}
        <div className="hc-unit-box">
          <span className="hc-num">{cal.days}</span>
          <span className="hc-unit">GÜN</span>
        </div>

        <span className="hc-colon">:</span>

        {/* SAAT */}
        <div className="hc-unit-box">
          <span className="hc-num">{pad2(cal.hours)}</span>
          <span className="hc-unit">SAAT</span>
        </div>

        <span className="hc-colon">:</span>

        {/* DAKİKA */}
        <div className="hc-unit-box">
          <span className="hc-num">{pad2(cal.minutes)}</span>
          <span className="hc-unit">DK</span>
        </div>

        <span className="hc-colon">:</span>

        {/* SANİYE (Daha Büyük & Canlı Kırmızı) */}
        <div className="hc-unit-box is-sec">
          <span className="hc-num sec-num">{pad2(cal.seconds)}</span>
          <span className="hc-unit sec-unit">SN</span>
        </div>
      </div>
    </div>
  );
};
