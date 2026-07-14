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
  const list = Storage.getOT().slice().sort((a, b) => b.date.localeCompare(a.date));

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">ยังไม่มีข้อมูล OT</td></tr>`;
    return;
  }

  const today = DateUtil.todayISO();

  tbody.innerHTML = list.map(o => {
    const isEarn = o.type === 'earn';
    const expired = isEarn && o.expireDate && o.expireDate < today;
    return `
      <tr class="${expired ? 'row-expired' : ''}">
        <td>${o.date}</td>
        <td><span class="tag ${isEarn ? 'tag-ot' : 'tag-used'}">${isEarn ? 'ได้รับ' : 'เบิกใช้'}</span></td>
        <td>${isEarn ? '+' : '-'}${DateUtil.minutesToHM(o.minutes)}</td>
        <td>${o.note || '-'}${expired ? ' <span class="tag tag-expired">หมดอายุ</span>' : ''}</td>
        <td><button class="btn-icon" onclick="deleteOT('${o.id}')" title="ลบ">✕</button></td>
      </tr>
    `;
  }).join('');
}

function renderOTPage() {
  renderOTBalance();
  renderOTLedger();
  const dateInput = document.getElementById('ot-use-date');
  if (dateInput && !dateInput.value) dateInput.value = DateUtil.todayISO();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('ot-ledger-body')) return;
  renderOTPage();
});
