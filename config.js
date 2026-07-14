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
    vacation: 6,   // พักร้อน (days/year)
    personal: 3,   // ลากิจ (days/year)
    sick: 30       // ลาป่วย (days/year)
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

function getSettings() {
  const saved = Storage.getSettings();
  if (!saved) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  // merge shallowly with defaults so new fields added later don't break old saved settings
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    leaveQuota: { ...DEFAULT_SETTINGS.leaveQuota, ...(saved.leaveQuota || {}) },
    otRule: { ...DEFAULT_SETTINGS.otRule, ...(saved.otRule || {}) }
  };
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
