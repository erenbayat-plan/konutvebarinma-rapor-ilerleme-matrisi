/**
 * Countdown logic for Konut ve Barınma Rapor Teslimi
 * Target: 15 Ekim 2026 17:00 (Europe/Istanbul)
 */

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

// Target date: October 15, 2026, 17:00 Istanbul time (UTC+3)
// 2026-10-15T17:00:00+03:00 -> 2026-10-15T14:00:00Z
export const TARGET_DATE_MS = new Date('2026-10-15T17:00:00+03:00').getTime();

export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Calculates workdays (Pazartesi-Cuma) countdown to target date.
 * If target has passed, returns zeros.
 */
export function getWorkdaysCountdown(nowMs: number = Date.now()): CountdownTime {
  const diffMs = TARGET_DATE_MS - nowMs;
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }

  const startDate = new Date(nowMs);
  const endDate = new Date(TARGET_DATE_MS);

  // Count working days between startDate and endDate
  let workdaysCount = 0;
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  // Move day by day (excluding weekends: Sunday=0, Saturday=6)
  const temp = new Date(cur);
  temp.setDate(temp.getDate() + 1);

  while (temp <= end) {
    const day = temp.getDay();
    if (day !== 0 && day !== 6) {
      workdaysCount++;
    }
    temp.setDate(temp.getDate() + 1);
  }

  // Calculate remaining hours, minutes, seconds within the current day or total span
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: workdaysCount,
    hours,
    minutes,
    seconds,
    totalMs: diffMs,
    isExpired: false
  };
}

export function getCalendarCountdown(nowMs: number = Date.now()): CountdownTime {
  const diffMs = TARGET_DATE_MS - nowMs;
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalMs: diffMs,
    isExpired: false
  };
}
