/**
 * ot.js
 * OT bank ledger. Entries are either type 'earn' (credited automatically
 * by attendance.js, or manually) or type 'use' (withdrawn/spent by the user).
 * Balance = sum(earn minutes not yet expired) - sum(use minutes)
 */

function getOTBalance() {
  const list = Storage.getOT();
  const today = DateUtil.todayISO();
  let earned = 0;
  let used = 0;
  list.forEach(o => {
    if (o.type === 'earn') {
      if (!o.expireDate || o.expireDate >= today) earned += o.minutes;
    } else if (o.type === 'use') {
      used += o.minutes;
    }
  });
  return earned - used;
}

function useOT() {
  const minutesInput = document.getElementById('ot-use-minutes');
  const noteInput = document.getElementById('ot-use-note');
  const dateInput = document.getElementById('ot-use-date');

  const minutes = parseInt(minutesInput.value, 10);
  if (!minutes || minutes <= 0) {
    toast('กรุณาระบุจำนวนนาทีที่ต้องการเบิก', 'warn');
    return;
  }
  const balance = getOTBalance();
  if (minutes > balance) {
    toast(`OT คงเหลือไม่พอ (คงเหลือ ${DateUtil.minutesToHM(balance)})`, 'warn');
    return;
  }

  const list = Storage.getOT();
  list.push({
    id: Storage.uid(),
    date: dateInput.value || DateUtil.todayISO(),
    type: 'use',
    source: 'manual',
    minutes,
    createdAt: new Date().toISOString(),
    note: noteInput.value.trim() || 'เบิกใช้ OT',
    expireDate: null
  });
  Storage.saveOT(list);
  toast('เบิกใช้ OT แล้ว ' + DateUtil.minutesToHM(minutes));

  minutesInput.value = '';
  noteInput.value = '';
  renderOTPage();
}

function deleteOT(id) {
  if (!confirmDialog('ลบรายการนี้?')) return;
  let list = Storage.getOT();
  list = list.filter(o => o.id !== id);
  Storage.saveOT(list);
  toast('ลบรายการแล้ว');
  renderOTPage();
}

function renderOTBalance() {
  const el = document.getElementById('ot-balance-display');
  if (!el) return;
  const balance = getOTBalance();
  el.textContent = DateUtil.minutesToHM(balance);
  el.className = 'ot-balance-value ' + (balance < 0 ? 'negative' : '');
}

function renderOTLedger() {
  const tbody = document.getElementById('ot-ledger-body');
  if (!tbody) return;
  // sort newest-created first (falls back to date if createdAt is missing, e.g. old data)
  const list = Storage.getOT().slice().sort((a, b) => {
    const at = a.createdAt || a.date;
    const bt = b.createdAt || b.date;
    return bt.localeCompare(at);
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">ยังไม่มีข้อมูล OT</td></tr>`;
    return;
  }

  const today = DateUtil.todayISO();

  tbody.innerHTML = list.map(o => {
    const isEarn = o.type === 'earn';
    const expired = isEarn && o.expireDate && o.expireDate < today;

    // เวลา / ชั่วโมงจริง: มีเฉพาะรายการที่ระบบสร้างอัตโนมัติจากการลงเวลาออกงาน
    const timeRangeLabel = o.timeRange || '-';
    const actualMinutes = (o.actualMinutes != null) ? o.actualMinutes : o.minutes;
    const actualLabel = DateUtil.minutesToClock(actualMinutes);
    const countedLabel = (isEarn ? '' : '-') + DateUtil.minutesToDecimalHours(o.minutes);
    const createdLabel = o.createdAt ? DateUtil.formatThaiDateTime(o.createdAt) : '-';

    return `
      <tr class="${expired ? 'row-expired' : ''}">
        <td>${timeRangeLabel}</td>
        <td>${actualLabel}</td>
        <td><span class="tag ${isEarn ? 'tag-ot' : 'tag-used'}">${countedLabel}</span></td>
        <td>${createdLabel}</td>
        <td>${o.note || '-'}${expired ? ' <span class="tag tag-expired">หมดอายุ</span>' : ''}</td>
        <td><button class="btn-icon" onclick="deleteOT('${o.id}')" title="ลบ">✕</button></td>
      </tr>
    `;
  }).join('');
}

/**
 * สรุปยอดรวมของรายการที่ "ได้รับ" (earn) ทั้งหมด:
 * - รายการทั้งหมด: จำนวนรายการที่ได้รับ OT
 * - รวม OT ทั้งหมด: ผลรวมชั่วโมงจริง (ชั่วโมงคิดโอที) ในรูปแบบ "H:MM (X.XX)"
 * - อัตรา OT 1.5: แสดงค่าเดียวกับ "รวม OT ทั้งหมด" (ยังไม่ได้คูณอัตรา)
 */
function renderOTSummary() {
  const countEl = document.getElementById('ot-total-count');
  const totalEl = document.getElementById('ot-total-sum');
  const rateEl = document.getElementById('ot-total-rate');
  if (!countEl && !totalEl && !rateEl) return;

  const earnList = Storage.getOT().filter(o => o.type === 'earn');
  const totalCount = earnList.length;
  const totalActualMinutes = earnList.reduce((s, o) => s + ((o.actualMinutes != null) ? o.actualMinutes : o.minutes), 0);
  const totalOTMinutes = earnList.reduce((s, o) => s + o.minutes, 0);
  const summaryLabel = totalCount > 0
    ? `${DateUtil.minutesToClock(totalActualMinutes)} (${DateUtil.minutesToDecimalHours(totalOTMinutes)})`
    : '0:00 (0)';

  if (countEl) countEl.textContent = `${totalCount} รายการ`;
  if (totalEl) totalEl.textContent = summaryLabel;
  if (rateEl) rateEl.textContent = summaryLabel;
}

function renderOTPage() {
  renderOTBalance();
  renderOTLedger();
  renderOTSummary();
  const dateInput = document.getElementById('ot-use-date');
  if (dateInput && !dateInput.value) dateInput.value = DateUtil.todayISO();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('ot-ledger-body')) return;
  renderOTPage();
});
