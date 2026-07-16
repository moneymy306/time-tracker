/**
 * config.js
 * Default settings + constants shared across the app.
 * Users can override work hours / quotas / OT rules in setting.html
 */

const DEFAULT_SETTINGS = {
  workStart: '09:00',
  workEnd: '18:00',
  breakMinutes: 60,
  workDays: [1, 2, 3, 4, 5], // Mon-Fri (0=Sun)
  leaveQuota: {
    // each quota is a day/hour/minute allowance per year, e.g. 6 วัน 0 ชม. 0 นาที
    vacation: { days: 6, hours: 0, minutes: 0 },   // พักร้อน
    personal: { days: 3, hours: 0, minutes: 0 },   // ลากิจ
    sick: { days: 30, hours: 0, minutes: 0 }       // ลาป่วย
  },
  otRule: {
    roundToMinutes: 15,     // round OT down to nearest N minutes
    minMinutesToCount: 30,  // must exceed this many minutes over work end to count as OT
    expireDays: 90          // earned OT expires after N days if unused
  }
};

const LEAVE_TYPES = {
  vacation: { label: 'พักร้อน', color: '#7FA88C' },
  personal: { label: 'ลากิจ', color: '#E8A33D' },
  sick: { label: 'ลาป่วย', color: '#C1666B' }
};

/**
 * A leave quota entry is always normalized to { days, hours, minutes }.
 * Accepts the old plain-number format too (e.g. saved data from before
 * this feature existed) so nothing breaks for existing users.
 */
function normalizeQuota(q, fallback) {
  if (typeof q === 'number') return { days: q, hours: 0, minutes: 0 };
  if (q && typeof q === 'object') {
    return {
      days: Number(q.days) || 0,
      hours: Number(q.hours) || 0,
      minutes: Number(q.minutes) || 0
    };
  }
  return fallback || { days: 0, hours: 0, minutes: 0 };
}

function getSettings() {
  const saved = Storage.getSettings();
  if (!saved) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

  const savedQuota = saved.leaveQuota || {};
  const leaveQuota = {};
  Object.keys(DEFAULT_SETTINGS.leaveQuota).forEach(type => {
    leaveQuota[type] = normalizeQuota(savedQuota[type], DEFAULT_SETTINGS.leaveQuota[type]);
  });

  // merge shallowly with defaults so new fields added later don't break old saved settings
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    leaveQuota,
    otRule: { ...DEFAULT_SETTINGS.otRule, ...(saved.otRule || {}) }
  };
}

/** Minutes in one work day, derived from workStart/workEnd/breakMinutes. */
function minutesPerWorkDay(settings) {
  const s = settings || getSettings();
  const mins = DateUtil.hmToMinutes(s.workEnd) - DateUtil.hmToMinutes(s.workStart) - (s.breakMinutes || 0);
  return mins > 0 ? mins : 480; // fall back to 8h if config is unusable
}

/** Convert a { days, hours, minutes } object into a total minute count. */
function dhmToMinutes(dhm, minutesPerDay) {
  const q = normalizeQuota(dhm);
  return q.days * minutesPerDay + q.hours * 60 + q.minutes;
}

/** Convert a total minute count into a { days, hours, minutes } breakdown. */
function minutesToDHM(totalMinutes, minutesPerDay) {
  const negative = totalMinutes < 0;
  let mins = Math.abs(Math.round(totalMinutes));
  const days = Math.floor(mins / minutesPerDay);
  mins -= days * minutesPerDay;
  const hours = Math.floor(mins / 60);
  mins -= hours * 60;
  return { days, hours, minutes: mins, negative };
}

/** Human-readable "X วัน Y ชม. Z นาที" label, e.g. for quota/remaining displays. */
function formatDHM(totalMinutes, minutesPerDay) {
  const { days, hours, minutes, negative } = minutesToDHM(totalMinutes, minutesPerDay);
  const parts = [];
  if (days) parts.push(`${days} วัน`);
  if (hours) parts.push(`${hours} ชม.`);
  if (minutes || parts.length === 0) parts.push(`${minutes} นาที`);
  return (negative ? '-' : '') + parts.join(' ');
}

/**
 * Duration of a leave entry in minutes. Falls back to days*minutesPerDay
 * for legacy entries saved before hourly leave existed.
 */
function leaveEntryMinutes(entry, minutesPerDay) {
  if (typeof entry.minutes === 'number') return entry.minutes;
  return (entry.days || 0) * minutesPerDay;
}

let HOLIDAYS_CACHE = null;
async function loadHolidays() {
  if (HOLIDAYS_CACHE) return HOLIDAYS_CACHE;
  try {
    const res = await fetch('holiday.json');
    HOLIDAYS_CACHE = await res.json();
  } catch (e) {
    console.error('Could not load holiday.json', e);
    HOLIDAYS_CACHE = [];
  }
  return HOLIDAYS_CACHE;
}
