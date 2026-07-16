/**
 * attendance.js
 * Handles clock in / clock out and the attendance history table.
 * When clocking out late, automatically credits OT minutes to the OT bank
 * (see ot.js for the ledger logic).
 */

function getTodayEntry() {
  const list = Storage.getAttendance();
  return list.find(e => e.date === DateUtil.todayISO());
}

function clockIn() {
  const list = Storage.getAttendance();
  const today = DateUtil.todayISO();
  if (list.find(e => e.date === today)) {
    toast('วันนี้ลงเวลาเข้างานไปแล้ว', 'warn');
    return;
  }
  list.push({
    id: Storage.uid(),
    date: today,
    timeIn: DateUtil.nowHM(),
    timeOut: null,
    note: ''
  });
  Storage.saveAttendance(list);
  toast('ลงเวลาเข้างานแล้ว ' + DateUtil.nowHM());
  renderAttendancePage();
}

function clockOut() {
  const list = Storage.getAttendance();
  const today = DateUtil.todayISO();
  const entry = list.find(e => e.date === today);
  if (!entry) {
    toast('ยังไม่ได้ลงเวลาเข้างานวันนี้', 'warn');
    return;
  }
  if (entry.timeOut) {
    toast('วันนี้ลงเวลาออกงานไปแล้ว', 'warn');
    return;
  }
  entry.timeOut = DateUtil.nowHM();
  Storage.saveAttendance(list);
  applyAutoOT(entry);
  toast('ลงเวลาออกงานแล้ว ' + entry.timeOut);
  renderAttendancePage();
}

/**
 * Compares actual timeOut against configured workEnd.
 * Any overage beyond otRule.minMinutesToCount, rounded down to
 * otRule.roundToMinutes, gets credited to the OT bank automatically.
 */
function applyAutoOT(entry) {
  const settings = getSettings();
  const workEndMin = DateUtil.hmToMinutes(settings.workEnd);
  const outMin = DateUtil.hmToMinutes(entry.timeOut);
  let overMinutes = outMin - workEndMin;
  if (overMinutes < settings.otRule.minMinutesToCount) return;

  const rounded = Math.floor(overMinutes / settings.otRule.roundToMinutes) * settings.otRule.roundToMinutes;
  if (rounded <= 0) return;

  const otList = Storage.getOT();
  // avoid double-crediting if this function runs twice for the same date
  const already = otList.find(o => o.date === entry.date && o.type === 'earn' && o.source === 'auto');
  if (already) {
    already.minutes = rounded;
  } else {
    const expire = DateUtil.parseISO(entry.date);
    expire.setDate(expire.getDate() + settings.otRule.expireDays);
    otList.push({
      id: Storage.uid(),
      date: entry.date,
      type: 'earn',
      source: 'auto',
      minutes: rounded,
      note: `ทำงานเกินเวลา ${DateUtil.minutesToHM(overMinutes)}`,
      expireDate: DateUtil.toISO(expire)
    });
  }
  Storage.saveOT(otList);
}

/**
 * Manually add (or overwrite) an attendance record for a past date —
 * for when someone forgot to clock in/out. Reuses the same auto-OT
 * logic as a normal clock-out.
 */
function addBackdatedAttendance() {
  const date = document.getElementById('back-date').value;
  const timeIn = document.getElementById('back-timein').value;
  const timeOut = document.getElementById('back-timeout').value;
  const note = document.getElementById('back-note').value.trim();

  if (!date) {
    toast('กรุณาเลือกวันที่', 'warn');
    return;
  }
  if (!timeIn) {
    toast('กรุณากรอกเวลาเข้างานอย่างน้อย', 'warn');
    return;
  }
  if (timeOut && DateUtil.hmToMinutes(timeOut) <= DateUtil.hmToMinutes(timeIn)) {
    toast('เวลาออกงานต้องมากกว่าเวลาเข้างาน', 'warn');
    return;
  }

  const list = Storage.getAttendance();
  const existing = list.find(e => e.date === date);

  if (existing) {
    if (!confirmDialog(`วันที่ ${date} มีข้อมูลลงเวลาอยู่แล้ว (${existing.timeIn || '-'} – ${existing.timeOut || '-'}) ต้องการเขียนทับหรือไม่?`)) return;
    existing.timeIn = timeIn;
    existing.timeOut = timeOut || null;
    existing.note = note;
    Storage.saveAttendance(list);
    if (existing.timeOut) applyAutoOT(existing);
  } else {
    const entry = { id: Storage.uid(), date, timeIn, timeOut: timeOut || null, note };
    list.push(entry);
    Storage.saveAttendance(list);
    if (entry.timeOut) applyAutoOT(entry);
  }

  toast('บันทึกลงเวลาย้อนหลังแล้ว');
  document.getElementById('back-date').value = '';
  document.getElementById('back-timein').value = '';
  document.getElementById('back-timeout').value = '';
  document.getElementById('back-note').value = '';

  renderAttendancePage();
}

function deleteAttendance(id) {
  if (!confirmDialog('ลบรายการนี้?')) return;
  let list = Storage.getAttendance();
  list = list.filter(e => e.id !== id);
  Storage.saveAttendance(list);
  // also remove any auto-OT tied to that entry's date to keep bank consistent
  toast('ลบรายการแล้ว');
  renderAttendancePage();
}

function updateAttendanceField(id, field, value) {
  const list = Storage.getAttendance();
  const entry = list.find(e => e.id === id);
  if (!entry) return;
  entry[field] = value;
  Storage.saveAttendance(list);
  if (field === 'timeOut' && value) applyAutoOT(entry);
  toast('บันทึกการแก้ไขแล้ว');
}

function renderAttendancePage() {
  const today = getTodayEntry();
  const statusBox = document.getElementById('today-status');
  if (statusBox) {
    if (!today) {
      statusBox.innerHTML = `<div class="status-pill status-idle">ยังไม่ลงเวลาเข้างาน</div>`;
    } else if (!today.timeOut) {
      statusBox.innerHTML = `<div class="status-pill status-in">เข้างานแล้ว ${today.timeIn}</div>`;
    } else {
      statusBox.innerHTML = `<div class="status-pill status-out">ออกงานแล้ว ${today.timeIn} – ${today.timeOut}</div>`;
    }
  }

  const inBtn = document.getElementById('btn-clockin');
  const outBtn = document.getElementById('btn-clockout');
  if (inBtn && outBtn) {
    inBtn.disabled = !!today;
    outBtn.disabled = !today || !!today.timeOut;
  }

  renderAttendanceHistory();
}

function renderAttendanceHistory() {
  const tbody = document.getElementById('attendance-history-body');
  if (!tbody) return;
  const filterInput = document.getElementById('history-month-filter');
  const filterVal = filterInput ? filterInput.value : '';

  let list = Storage.getAttendance().slice().sort((a, b) => b.date.localeCompare(a.date));
  if (filterVal) {
    list = list.filter(e => e.date.startsWith(filterVal));
  }

  const settings = getSettings();

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">ยังไม่มีข้อมูล</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => {
    let workedLabel = '-';
    let otLabel = '';
    if (e.timeIn && e.timeOut) {
      const worked = DateUtil.hmToMinutes(e.timeOut) - DateUtil.hmToMinutes(e.timeIn) - settings.breakMinutes;
      workedLabel = DateUtil.minutesToHM(worked);
      const over = DateUtil.hmToMinutes(e.timeOut) - DateUtil.hmToMinutes(settings.workEnd);
      if (over >= settings.otRule.minMinutesToCount) {
        otLabel = `<span class="tag tag-ot">+OT ${DateUtil.minutesToHM(over)}</span>`;
      }
    }
    return `
      <tr>
        <td>${e.date}</td>
        <td><input type="time" value="${e.timeIn || ''}" onchange="updateAttendanceField('${e.id}','timeIn',this.value)"></td>
        <td><input type="time" value="${e.timeOut || ''}" onchange="updateAttendanceField('${e.id}','timeOut',this.value)"></td>
        <td>${workedLabel} ${otLabel}</td>
        <td><button class="btn-icon" onclick="deleteAttendance('${e.id}')" title="ลบ">✕</button></td>
      </tr>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('attendance-history-body')) return;
  renderAttendancePage();
  const backDateInput = document.getElementById('back-date');
  if (backDateInput) backDateInput.max = DateUtil.todayISO();
  const filterInput = document.getElementById('history-month-filter');
  if (filterInput) {
    filterInput.value = DateUtil.todayISO().slice(0, 7);
    filterInput.addEventListener('input', renderAttendanceHistory);
  }
});
