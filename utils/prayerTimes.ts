import { PrayerTime, PrayerName } from '../types';
import { Coordinates, CalculationMethod, PrayerTimes, Prayer } from 'adhan';

// Cairo coordinates
const CAIRO_COORDS = new Coordinates(30.0444, 31.2357);

// Prayer icon mapping (will use Lucide icons in component)
export const PRAYER_ICONS: Record<PrayerName, string> = {
  Fajr: 'sunrise',
  Dhuhr: 'sun',
  Asr: 'cloud-sun',
  Maghrib: 'sunset',
  Isha: 'moon',
};

/**
 * Get prayer times for a specific date in Cairo timezone
 * Returns times adjusted to local browser timezone for correct display
 */
export function getPrayerTimesForDate(date: Date): PrayerTime[] {
  // Use Egyptian General Authority of Survey calculation method
  const params = CalculationMethod.Egyptian();
  const prayerTimes = new PrayerTimes(CAIRO_COORDS, date, params);

  const prayers: Array<{ name: PrayerName; time: Date }> = [
    { name: 'Fajr', time: prayerTimes.fajr },
    { name: 'Dhuhr', time: prayerTimes.dhuhr },
    { name: 'Asr', time: prayerTimes.asr },
    { name: 'Maghrib', time: prayerTimes.maghrib },
    { name: 'Isha', time: prayerTimes.isha },
  ];

  return prayers.map(({ name, time }) => {
    // Extract hours and minutes using toLocaleString to respect Cairo timezone
    const cairoTimeStr = time.toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const [hours, minutes] = cairoTimeStr.split(':').map(Number);

    // Create a new date in the local day with the correct Cairo hours
    const localDate = new Date(date);
    localDate.setHours(hours, minutes, 0, 0);

    return {
      name,
      time: formatTimeAMPM(hours, minutes),
      timestamp: localDate.getTime(),
      icon: PRAYER_ICONS[name],
    };
  });
}

/**
 * Format time in AM/PM format
 */
export function formatTimeAMPM(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Format timestamp to AM/PM format
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return formatTimeAMPM(date.getHours(), date.getMinutes());
}

/**
 * Get the current or next prayer time
 */
export function getCurrentPrayer(now: Date = new Date()): PrayerTime | null {
  const prayers = getPrayerTimesForDate(now);
  const nowTime = now.getTime();

  for (let i = prayers.length - 1; i >= 0; i--) {
    if (nowTime >= prayers[i].timestamp) {
      return prayers[i];
    }
  }

  return prayers[0];
}

/**
 * Check if a time is within a prayer time
 */
export function isNearPrayerTime(timestamp: number, prayerTime: PrayerTime): boolean {
  const diff = Math.abs(timestamp - prayerTime.timestamp);
  const thirtyMinutes = 30 * 60 * 1000;
  return diff < thirtyMinutes;
}
