/**
 * leave.js
 * Handles leave requests (vacation / personal / sick), quota tracking,
 * and the leave history table.
 */

function submitLeave() {
  const type = document.getElementById('leave-type').value;
  const startDate = document.getElementById('leave-start').value;
  const endDate = document.getElementById('leave-end').value || startDate;
  const reason = document.getElementById('leave-reason').value.trim();

  if (!startDate) {
    toast('กรุณาเลือกวันที่ลา', 'warn');
    return;
  }
  if (endDate < startDate) {
    toast('วันที่สิ้นสุดต้องไม่ก่อนวันเริ่มลา', 'warn');
    return;
  }

  const days = countLeaveDays(startDate, endDate);

  // guard against overlapping leave requests
  const existing = Storage.getLeave();
  const overlap = existing.some(l => rangesOverlap(startDate, endDate, l.date, l.endDate || l.date));
  if (overlap) {
    if (!confirmDialog('ช่วงวันนี้มีการลาซ้อนอยู่แล้ว ต้องการบันทึกต่อหรือไม่?')) return;
  }

  existing.push({
    id: Storage.uid(),
    type,
    date: startDate,
    endDate,
    days,
    reason,
    createdAt: new Date().toISOString()
  });
  Storage.saveLeave(existing);
  toast('บันทึกการลาแล้ว');

  document.getElementById('leave-start').value = '';
  document.getElementById('leave-end').value = '';
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

function getLeaveUsed(year) {
  const list = Storage.getLeave().filter(l => DateUtil.isSameYear(l.date, year));
  const used = { vacation: 0, personal: 0, sick: 0 };
  list.forEach(l => { used[l.type] = (used[l.type] || 0) + l.days; });
  return used;
}

function renderLeaveQuota() {
  const box = document.getElementById('leave-quota-box');
  if (!box) return;
  const settings = getSettings();
  const year = new Date().getFullYear();
  const used = getLeaveUsed(year);

  box.innerHTML = Object.keys(LEAVE_TYPES).map(type => {
    const quota = settings.leaveQuota[type];
    const usedDays = used[type] || 0;
    const remain = quota - usedDays;
    const pct = quota > 0 ? Math.min(100, (usedDays / quota) * 100) : 0;
    return `
      <div class="quota-card" style="--accent:${LEAVE_TYPES[type].color}">
        <div class="quota-label">${LEAVE_TYPES[type].label}</div>
        <div class="quota-numbers">${remain} <span>/ ${quota} วัน คงเหลือ</span></div>
        <div class="quota-bar"><div class="quota-bar-fill" style="width:${pct}%"></div></div>
        <div class="quota-used">ใช้ไปแล้ว ${usedDays} วัน</div>
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

  tbody.innerHTML = list.map(l => `
    <tr>
      <td><span class="tag" style="background:${LEAVE_TYPES[l.type].color}22;color:${LEAVE_TYPES[l.type].color}">${LEAVE_TYPES[l.type].label}</span></td>
      <td>${l.date}${l.endDate && l.endDate !== l.date ? ' – ' + l.endDate : ''}</td>
      <td>${l.days} วัน</td>
      <td>${l.reason || '-'}</td>
      <td>${new Date(l.createdAt).toLocaleDateString('th-TH')}</td>
      <td><button class="btn-icon" onclick="deleteLeave('${l.id}')" title="ลบ">✕</button></td>
    </tr>
  `).join('');
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
