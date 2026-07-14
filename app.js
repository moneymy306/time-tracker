/**
 * app.js
 * Shared utilities used across every page: date helpers, formatting,
 * and the sidebar navigation (rendered by JS so it's defined once).
 */

const DateUtil = {
  todayISO() {
    return this.toISO(new Date());
  },
  toISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },
  parseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  },
  nowHM() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },
  hmToMinutes(hm) {
    const [h, m] = hm.split(':').map(Number);
    return h * 60 + m;
  },
  minutesToHM(mins) {
    const sign = mins < 0 ? '-' : '';
    mins = Math.abs(mins);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${sign}${h}h ${String(m).padStart(2, '0')}m`;
  },
  // "1:00" / "2:20" style clock format (used in the OT tables)
  minutesToClock(mins) {
    const sign = mins < 0 ? '-' : '';
    mins = Math.abs(Math.round(mins));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${sign}${h}:${String(m).padStart(2, '0')}`;
  },
  // decimal-hours format used for "ชั่วโมงคิดโอที" e.g. 60min -> "1", 135min -> "2.25"
  minutesToDecimalHours(mins) {
    const val = Math.round((mins / 60) * 100) / 100;
    return String(val);
  },
  // Thai Buddhist-era date + time, e.g. "13/7/2569 14:59 น."
  formatThaiDateTime(input) {
    const d = (input instanceof Date) ? input : new Date(input);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hh}:${mm} น.`;
  },
  monthLabel(year, month) {
    const names = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
      'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return `${names[month]} ${year + 543}`;
  },
  daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },
  isSameMonth(iso, year, month) {
    const d = this.parseISO(iso);
    return d.getFullYear() === year && d.getMonth() === month;
  },
  isSameYear(iso, year) {
    return this.parseISO(iso).getFullYear() === year;
  }
};

const NAV_ITEMS = [
  { href: 'dashboard.html', label: 'ภาพรวม', icon: '⌂' },
  { href: 'attendance.html', label: 'ลงเวลา', icon: '⏱' },
  { href: 'leave.html', label: 'วันลา', icon: '☾' },
  { href: 'ot-bank.html', label: 'OT คงเหลือ', icon: '⚡' },
  { href: 'calendar.html', label: 'ปฏิทิน', icon: '▦' },
  { href: 'report.html', label: 'รายงาน', icon: '▤' },
  { href: 'setting.html', label: 'ตั้งค่า', icon: '⚙' }
];

function renderShell(activeHref) {
  const nav = document.getElementById('app-nav');
  if (!nav) return;
  nav.innerHTML = `
    <div class="brand">
      <img src="logo.png" alt="" class="brand-logo" onerror="this.style.display='none'">
      <span class="brand-name">TIME<span class="brand-accent">/TRACK</span></span>
    </div>
    <ul class="nav-list">
      ${NAV_ITEMS.map(item => `
        <li>
          <a href="${item.href}" class="nav-link ${item.href === activeHref ? 'active' : ''}">
            <span class="nav-icon">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        </li>
      `).join('')}
    </ul>
    <div class="nav-clock" id="nav-clock"></div>
  `;
  tickClock();
  setInterval(tickClock, 1000 * 30);
}

function tickClock() {
  const el = document.getElementById('nav-clock');
  if (!el) return;
  const now = new Date();
  const days = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  el.innerHTML = `<div class="clock-time">${hh}:${mm}</div><div class="clock-date">${days[now.getDay()]} ${now.getDate()}/${now.getMonth() + 1}</div>`;
}

function toast(msg, type = 'info') {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  box.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function confirmDialog(msg) {
  return window.confirm(msg);
}
