/**
 * report.js
 * View-only monthly / yearly summary. No export — figures are computed
 * on the fly from attendance / leave / OT records and rendered as cards
 * and a simple table.
 */

function getReportRange() {
  const monthInput = document.getElementById('report-month');
  const val = monthInput.value || DateUtil.todayISO().slice(0, 7);
  const [year, month] = val.split('-').map(Number);
  return { year, month: month - 1 };
}

function renderReport() {
  const { year, month } = getReportRange();
  const settings = getSettings();

  const attendance = Storage.getAttendance().filter(a => DateUtil.isSameMonth(a.date, year, month));
  const leave = Storage.getLeave().filter(l => DateUtil.isSameMonth(l.date, year, month));
  const ot = Storage.getOT().filter(o => DateUtil.isSameMonth(o.date, year, month));

  // total worked minutes
  let totalWorkedMin = 0;
  let daysPresent = 0;
  let lateCount = 0;
  const workStartMin = DateUtil.hmToMinutes(settings.workStart);

  attendance.forEach(a => {
    if (a.timeIn && a.timeOut) {
      totalWorkedMin += DateUtil.hmToMinutes(a.timeOut) - DateUtil.hmToMinutes(a.timeIn) - settings.breakMinutes;
      daysPresent++;
      if (DateUtil.hmToMinutes(a.timeIn) > workStartMin) lateCount++;
    }
  });

  const otEarned = ot.filter(o => o.type === 'earn').reduce((s, o) => s + o.minutes, 0);
  const otUsed = ot.filter(o => o.type === 'use').reduce((s, o) => s + o.minutes, 0);

  const minsPerDay = minutesPerWorkDay(settings);
  const leaveByType = { vacation: 0, personal: 0, sick: 0 };
  leave.forEach(l => { leaveByType[l.type] = (leaveByType[l.type] || 0) + leaveEntryMinutes(l, minsPerDay); });
  const totalLeaveMinutes = Object.values(leaveByType).reduce((a, b) => a + b, 0);

  const cards = document.getElementById('report-cards');
  cards.innerHTML = `
    <div class="report-card">
      <div class="report-card-label">ชั่วโมงทำงานรวม</div>
      <div class="report-card-value">${DateUtil.minutesToHM(totalWorkedMin)}</div>
    </div>
    <div class="report-card">
      <div class="report-card-label">วันที่มาทำงาน</div>
      <div class="report-card-value">${daysPresent} วัน</div>
    </div>
    <div class="report-card">
      <div class="report-card-label">มาสาย</div>
      <div class="report-card-value">${lateCount} ครั้ง</div>
    </div>
    <div class="report-card">
      <div class="report-card-label">OT ที่ได้รับเดือนนี้</div>
      <div class="report-card-value accent-ot">+${DateUtil.minutesToHM(otEarned)}</div>
    </div>
    <div class="report-card">
      <div class="report-card-label">OT ที่เบิกใช้เดือนนี้</div>
      <div class="report-card-value">-${DateUtil.minutesToHM(otUsed)}</div>
    </div>
    <div class="report-card">
      <div class="report-card-label">วันลารวม</div>
      <div class="report-card-value">${formatDHM(totalLeaveMinutes, minsPerDay)}</div>
    </div>
  `;

  const leaveTable = document.getElementById('report-leave-breakdown');
  leaveTable.innerHTML = Object.keys(LEAVE_TYPES).map(type => `
    <tr>
      <td><span class="tag" style="background:${LEAVE_TYPES[type].color}22;color:${LEAVE_TYPES[type].color}">${LEAVE_TYPES[type].label}</span></td>
      <td>${formatDHM(leaveByType[type], minsPerDay)}</td>
    </tr>
  `).join('');

  const dailyBody = document.getElementById('report-daily-body');
  const daysInMonth = DateUtil.daysInMonth(year, month);
  let rows = '';
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = DateUtil.toISO(new Date(year, month, d));
    const att = attendance.find(a => a.date === iso);
    const leaveDay = leave.find(l => iso >= l.date && iso <= (l.endDate || l.date));
    let statusLabel = '<span class="detail-muted">-</span>';
    if (leaveDay) statusLabel = `<span style="color:${LEAVE_TYPES[leaveDay.type].color}">${LEAVE_TYPES[leaveDay.type].label}</span>`;
    else if (att) statusLabel = `${att.timeIn} - ${att.timeOut || '...'}`;
    rows += `<tr><td>${iso}</td><td>${statusLabel}</td></tr>`;
  }
  dailyBody.innerHTML = rows;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('report-cards')) return;
  const monthInput = document.getElementById('report-month');
  monthInput.value = DateUtil.todayISO().slice(0, 7);
  monthInput.addEventListener('input', renderReport);
  renderReport();
});
