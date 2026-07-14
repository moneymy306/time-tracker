/**
 * calendar.js
 * Renders a month-grid calendar that merges attendance, leave, OT and
 * holiday data for a single glance summary. Click a day to see detail.
 */

let calState = { year: new Date().getFullYear(), month: new Date().getMonth() };

function changeCalMonth(delta) {
  calState.month += delta;
  if (calState.month < 0) { calState.month = 11; calState.year--; }
  if (calState.month > 11) { calState.month = 0; calState.year++; }
  renderCalendar();
}

async function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('calendar-month-label');
  if (!grid) return;

  label.textContent = DateUtil.monthLabel(calState.year, calState.month);

  const holidays = await loadHolidays();
  const attendance = Storage.getAttendance();
  const leave = Storage.getLeave();
  const ot = Storage.getOT();

  const firstDay = new Date(calState.year, calState.month, 1).getDay();
  const totalDays = DateUtil.daysInMonth(calState.year, calState.month);
  const todayISO = DateUtil.todayISO();

  const weekdayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  let html = weekdayNames.map(d => `<div class="cal-weekday">${d}</div>`).join('');

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="cal-cell cal-cell-empty"></div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const iso = DateUtil.toISO(new Date(calState.year, calState.month, d));
    const holiday = holidays.find(h => h.date === iso);
    const att = attendance.find(a => a.date === iso);
    const leaves = leave.filter(l => iso >= l.date && iso <= (l.endDate || l.date));
    const otEarn = ot.filter(o => o.date === iso && o.type === 'earn')
      .reduce((s, o) => s + o.minutes, 0);

    let cellClass = 'cal-cell';
    if (iso === todayISO) cellClass += ' cal-cell-today';
    if (holiday) cellClass += ' cal-cell-holiday';

    let dots = '';
    if (att) dots += `<span class="cal-dot cal-dot-work" title="ลงเวลา ${att.timeIn}-${att.timeOut || '...'}"></span>`;
    leaves.forEach(l => {
      dots += `<span class="cal-dot" style="background:${LEAVE_TYPES[l.type].color}" title="${LEAVE_TYPES[l.type].label}"></span>`;
    });
    if (otEarn > 0) dots += `<span class="cal-dot cal-dot-ot" title="OT +${DateUtil.minutesToHM(otEarn)}"></span>`;

    html += `
      <div class="${cellClass}" onclick="showDayDetail('${iso}')">
        <div class="cal-daynum">${d}</div>
        ${holiday ? `<div class="cal-holiday-label">${holiday.name}</div>` : ''}
        <div class="cal-dots">${dots}</div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

async function showDayDetail(iso) {
  const panel = document.getElementById('day-detail-panel');
  if (!panel) return;

  const holidays = await loadHolidays();
  const holiday = holidays.find(h => h.date === iso);
  const att = Storage.getAttendance().find(a => a.date === iso);
  const leaves = Storage.getLeave().filter(l => iso >= l.date && iso <= (l.endDate || l.date));
  const otEntries = Storage.getOT().filter(o => o.date === iso);

  let html = `<h3>${iso}</h3>`;
  if (holiday) html += `<div class="detail-row detail-holiday">🎌 วันหยุด: ${holiday.name}</div>`;
  if (att) {
    html += `<div class="detail-row">⏱ เข้างาน ${att.timeIn} — ออกงาน ${att.timeOut || 'ยังไม่ออก'}</div>`;
  } else {
    html += `<div class="detail-row detail-muted">ไม่มีการลงเวลา</div>`;
  }
  leaves.forEach(l => {
    html += `<div class="detail-row" style="color:${LEAVE_TYPES[l.type].color}">☾ ${LEAVE_TYPES[l.type].label} (${l.days} วัน) ${l.reason ? '– ' + l.reason : ''}</div>`;
  });
  otEntries.forEach(o => {
    html += `<div class="detail-row">⚡ ${o.type === 'earn' ? 'ได้ OT' : 'เบิก OT'} ${DateUtil.minutesToHM(o.minutes)} ${o.note ? '– ' + o.note : ''}</div>`;
  });
  if (!holiday && !att && leaves.length === 0 && otEntries.length === 0) {
    html += `<div class="detail-row detail-muted">ไม่มีข้อมูลวันนี้</div>`;
  }

  panel.innerHTML = html;
  panel.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('calendar-grid')) return;
  renderCalendar();
});
