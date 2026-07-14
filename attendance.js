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

  // ปัดเศษนาที OT ลงเป็นก้อนละ otRule.roundToMinutes นาที (ค่าเริ่มต้น 15 นาที)
  // เช่น ทำงานเกิน 140 นาที (2:20) -> ปัด floor(140/15)*15 = 135 นาที (2.25 ชม.)
  const rounded = Math.floor(overMinutes / settings.otRule.roundToMinutes) * settings.otRule.roundToMinutes;
  if (rounded <= 0) return;

  const timeRange = `${settings.workEnd} - ${entry.timeOut}`;
  const now = new Date();

  const otList = Storage.getOT();
  // avoid double-crediting if this function runs twice for the same date
  const already = otList.find(o => o.date === entry.date && o.type === 'earn' && o.source === 'auto');
  if (already) {
    already.minutes = rounded;
    already.actualMinutes = overMinutes;
    already.timeRange = timeRange;
    already.createdAt = now.toISOString();
    already.note = `ทำงานเกินเวลา ${DateUtil.minutesToClock(overMinutes)}`;
  } else {
    const expire = DateUtil.parseISO(entry.date);
    expire.setDate(expire.getDate() + settings.otRule.expireDays);
    otList.push({
      id: Storage.uid(),
      date: entry.date,
      type: 'earn',
      source: 'auto',
      minutes: rounded,          // ชั่วโมงคิดโอที (ปัดเศษแล้ว หน่วยนาที)
      actualMinutes: overMinutes, // ชั่วโมงจริงที่ทำงานเกิน (ไม่ปัดเศษ หน่วยนาที)
      timeRange,                  // ช่วงเวลา OT เช่น "17:00 - 18:00"
      createdAt: now.toISOString(), // เวลาที่ระบบสร้างรายการนี้
      note: `ทำงานเกินเวลา ${DateUtil.minutesToClock(overMinutes)}`,
      expireDate: DateUtil.toISO(expire)
    });
  }
  Storage.saveOT(otList);
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
        const roundedOT = Math.floor(over / settings.otRule.roundToMinutes) * settings.otRule.roundToMinutes;
        otLabel = `<span class="tag tag-ot">+OT ${DateUtil.minutesToClock(over)} (${DateUtil.minutesToDecimalHours(roundedOT)})</span>`;
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
  const filterInput = document.getElementById('history-month-filter');
  if (filterInput) {
    filterInput.value = DateUtil.todayISO().slice(0, 7);
    filterInput.addEventListener('input', renderAttendanceHistory);
  }
});
