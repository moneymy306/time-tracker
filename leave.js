/**
 * leave.js
 * Handles leave requests (vacation / personal / sick), quota tracking,
 * and the leave history table.
 */

/** Toggle between full-day (date range) and hourly (single day + time range) leave forms. */
function toggleLeaveMode() {
  const modeEl = document.getElementById('leave-mode');
  const mode = modeEl ? modeEl.value : 'day';
  const dayFields = document.getElementById('leave-day-fields');
  const hourFields = document.getElementById('leave-hour-fields');
  if (dayFields) dayFields.style.display = mode === 'day' ? '' : 'none';
  if (hourFields) hourFields.style.display = mode === 'hour' ? '' : 'none';
}

function submitLeave() {
  const type = document.getElementById('leave-type').value;
  const modeEl = document.getElementById('leave-mode');
  const mode = modeEl ? modeEl.value : 'day';
  const reason = document.getElementById('leave-reason').value.trim();
  const settings = getSettings();
  const minsPerDay = minutesPerWorkDay(settings);
  const existing = Storage.getLeave();

  let entry;

  if (mode === 'hour') {
    const date = document.getElementById('leave-hour-date').value;
    const timeStart = document.getElementById('leave-hour-start').value;
    const timeEnd = document.getElementById('leave-hour-end').value;

    if (!date || !timeStart || !timeEnd) {
      toast('กรุณากรอกวันที่และช่วงเวลาลาให้ครบ', 'warn');
      return;
    }
    const startMin = DateUtil.hmToMinutes(timeStart);
    const endMin = DateUtil.hmToMinutes(timeEnd);
    if (endMin <= startMin) {
      toast('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มลา', 'warn');
      return;
    }

    const overlap = existing.some(l => rangesOverlap(date, date, l.date, l.endDate || l.date));
    if (overlap) {
      if (!confirmDialog('วันนี้มีการลาบันทึกไว้อยู่แล้ว ต้องการบันทึกต่อหรือไม่?')) return;
    }

    entry = {
      id: Storage.uid(),
      type,
      mode: 'hour',
      date,
      endDate: date,
      timeStart,
      timeEnd,
      minutes: endMin - startMin,
      days: 0,
      reason,
      createdAt: new Date().toISOString()
    };

    document.getElementById('leave-hour-date').value = '';
    document.getElementById('leave-hour-start').value = '';
    document.getElementById('leave-hour-end').value = '';
  } else {
    const startDate = document.getElementById('leave-start').value;
    const endDate = document.getElementById('leave-end').value || startDate;

    if (!startDate) {
      toast('กรุณาเลือกวันที่ลา', 'warn');
      return;
    }
    if (endDate < startDate) {
      toast('วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มลา', 'warn');
      return;
    }

    const days = countLeaveDays(startDate, endDate);

    const overlap = existing.some(l => rangesOverlap(startDate, endDate, l.date, l.endDate || l.date));
    if (overlap) {
      if (!confirmDialog('ช่วงวันนี้มีการลาซ้อนอยู่แล้ว ต้องการบันทึกต่อหรือไม่?')) return;
    }

    entry = {
      id: Storage.uid(),
      type,
      mode: 'day',
      date: startDate,
      endDate,
      days,
      minutes: days * minsPerDay,
      reason,
      createdAt: new Date().toISOString()
    };

    document.getElementById('leave-start').value = '';
    document.getElementById('leave-end').value = '';
  }

  existing.push(entry);
  Storage.saveLeave(existing);
  toast('บันทึกการลาแล้ว');

  document.getElementById('leave-reason').value = '';

  renderLeavePage();
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

function countLeaveDays(start, end) {
  const s = DateUtil.parseISO(start);
  const e = DateUtil.parseISO(end);
  const diff = Math.round((e - s) / 86400000) + 1;
  return Math.max(diff, 1);
}

function deleteLeave(id) {
  if (!confirmDialog('ลบรายการลานี้?')) return;
  let list = Storage.getLeave();
  list = list.filter(l => l.id !== id);
  Storage.saveLeave(list);
  toast('ลบรายการแล้ว');
  renderLeavePage();
}

/** Leave used this year per type, in minutes. */
function getLeaveUsed(year) {
  const settings = getSettings();
  const minsPerDay = minutesPerWorkDay(settings);
  const list = Storage.getLeave().filter(l => DateUtil.isSameYear(l.date, year));
  const used = { vacation: 0, personal: 0, sick: 0 };
  list.forEach(l => { used[l.type] = (used[l.type] || 0) + leaveEntryMinutes(l, minsPerDay); });
  return used;
}

function renderLeaveQuota() {
  const box = document.getElementById('leave-quota-box');
  if (!box) return;
  const settings = getSettings();
  const minsPerDay = minutesPerWorkDay(settings);
  const year = new Date().getFullYear();
  const usedMin = getLeaveUsed(year);

  box.innerHTML = Object.keys(LEAVE_TYPES).map(type => {
    const quotaMin = dhmToMinutes(settings.leaveQuota[type], minsPerDay);
    const usedM = usedMin[type] || 0;
    const remainM = quotaMin - usedM;
    const pct = quotaMin > 0 ? Math.min(100, (usedM / quotaMin) * 100) : 0;
    return `
      <div class="quota-card" style="--accent:${LEAVE_TYPES[type].color}">
        <div class="quota-label">${LEAVE_TYPES[type].label}</div>
        <div class="quota-numbers">${formatDHM(remainM, minsPerDay)} <span>คงเหลือ</span></div>
        <div class="quota-bar"><div class="quota-bar-fill" style="width:${pct}%"></div></div>
        <div class="quota-used">ใช้ไปแล้ว ${formatDHM(usedM, minsPerDay)} จากสิทธิ์ ${formatDHM(quotaMin, minsPerDay)}</div>
      </div>
    `;
  }).join('');
}

function renderLeaveHistory() {
  const tbody = document.getElementById('leave-history-body');
  if (!tbody) return;
  const filterEl = document.getElementById('leave-type-filter');
  const filterVal = filterEl ? filterEl.value : 'all';

  let list = Storage.getLeave().slice().sort((a, b) => b.date.localeCompare(a.date));
  if (filterVal !== 'all') list = list.filter(l => l.type === filterVal);

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">ยังไม่มีข้อมูลการลา</td></tr>`;
    return;
  }

  const settings = getSettings();
  const minsPerDay = minutesPerWorkDay(settings);

  tbody.innerHTML = list.map(l => {
    const dateLabel = l.mode === 'hour'
      ? `${l.date} (${l.timeStart}–${l.timeEnd})`
      : `${l.date}${l.endDate && l.endDate !== l.date ? ' – ' + l.endDate : ''}`;
    return `
    <tr>
      <td><span class="tag" style="background:${LEAVE_TYPES[l.type].color}22;color:${LEAVE_TYPES[l.type].color}">${LEAVE_TYPES[l.type].label}</span></td>
      <td>${dateLabel}</td>
      <td>${formatDHM(leaveEntryMinutes(l, minsPerDay), minsPerDay)}</td>
      <td>${l.reason || '-'}</td>
      <td>${new Date(l.createdAt).toLocaleDateString('th-TH')}</td>
      <td><button class="btn-icon" onclick="deleteLeave('${l.id}')" title="ลบ">✕</button></td>
    </tr>
  `;
  }).join('');
}

function renderLeavePage() {
  renderLeaveQuota();
  renderLeaveHistory();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('leave-history-body')) return;
  renderLeavePage();
  const filterEl = document.getElementById('leave-type-filter');
  if (filterEl) filterEl.addEventListener('change', renderLeaveHistory);
});
