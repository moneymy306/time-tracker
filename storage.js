/**
 * storage.js
 * Thin wrapper around localStorage. Every other module reads/writes
 * data only through this file so the storage format can change in
 * one place if needed later.
 */

const STORAGE_KEYS = {
  ATTENDANCE: 'tt_attendance',   // array of {id, date, timeIn, timeOut, note}
  LEAVE: 'tt_leave',             // array of {id, type, date, endDate, days, reason, createdAt}
  OT: 'tt_ot',                   // array of {id, date, type:'earn'|'use', source, minutes, actualMinutes, timeRange, createdAt, note, expireDate}
  SETTINGS: 'tt_settings'        // object, see config.js DEFAULT_SETTINGS
};

const Storage = {
  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Storage read error for', key, e);
      return fallback;
    }
  },

  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage write error for', key, e);
      return false;
    }
  },

  // ---------- Attendance ----------
  getAttendance() {
    return this._read(STORAGE_KEYS.ATTENDANCE, []);
  },
  saveAttendance(list) {
    return this._write(STORAGE_KEYS.ATTENDANCE, list);
  },

  // ---------- Leave ----------
  getLeave() {
    return this._read(STORAGE_KEYS.LEAVE, []);
  },
  saveLeave(list) {
    return this._write(STORAGE_KEYS.LEAVE, list);
  },

  // ---------- OT ----------
  getOT() {
    return this._read(STORAGE_KEYS.OT, []);
  },
  saveOT(list) {
    return this._write(STORAGE_KEYS.OT, list);
  },

  // ---------- Settings ----------
  getSettings() {
    return this._read(STORAGE_KEYS.SETTINGS, null);
  },
  saveSettings(obj) {
    return this._write(STORAGE_KEYS.SETTINGS, obj);
  },

  // ---------- Utility ----------
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
};
