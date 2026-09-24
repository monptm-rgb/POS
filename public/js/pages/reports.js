// ---------- รายงาน / ประวัติบิล ----------
async function renderReports(el) {
  const t = UI.today();
  el.innerHTML = `
  <div class="page-head"><h2>รายงาน</h2>
    <div class="row" style="max-width:520px;align-items:center">
      <input type="date" id="r-from" value="${t}" aria-label="ตั้งแต่"><input type="date" id="r-to" value="${t}" aria-label="ถึง">
      <select id="r-pre" style="flex:0 0 130px"><option value="">ช่วงเวลา</option><option value="d">วันนี้</option><option value="m">เดือนนี้</option><option value="pm">เดือนที่แล้ว</option></select>
    </div></div>
  <div id="r-sum"></div>
  <section class="panel"><h3>บิลขาย</h3><div id="r-sales"></div></section>
  <div class="grid-2">
    <section class="panel"><h3>สินค้าขายดี</h3><div id="r-top"></div></section>
    ${App.isAdmin() ? `<section class="panel"><h3>ตรวจยอด (Tie-out)</h3><p class="muted">ตรวจสต็อก ยอดบิล ลูกหนี้ เจ้าหนี้ และลิ้นชัก ผลต่างต้องเป็น 0 ทุกจุด</p>
      <button id="r-tie">ตรวจตอนนี้</button><div id="r-tie-res" style="margin-top:10px"></div></section>` : ''}
  </div>`;
  const $ = s => el.querySelector(s);
  const load = () => { loadSummary(); loadSales(); };
  $('#r-from').onchange = $('#r-to').onchange = load;
  $('#r-pre').onchange = e => {
    const d = new Date(Date.now() + 7 * 3600000), y = d.getUTCFullYear(), m = d.getUTCMonth();
    const f = x => x.toISOString().slice(0, 10);
    if (e.target.value === 'd') { $('#r-from').value = $('#r-to').value = t; }
    if (e.target.value === 'm') { $('#r-from').value = f(new Date(Date.UTC(y, m, 1))); $('#r-to').value = t; }
    if (e.target.value === 'pm') { $('#r-from').value = f(new Date(Date.UTC(y, m - 1, 1))); $('#r-to').value = f(new Date(Date.UTC(y, m, 0))); }
    load();
  };
  if (App.isAdmin()) $('#r-tie').onclick = async () => {
    try {
      const r = await Api.call('tieOut');
      $('#r-tie-res').innerHTML = r.ok ? `<div class="notice good">ยอดตรงทุกจุด (ตรวจเมื่อ ${UI.esc(r.checkedAt)})</div>`
        : `<div class="notice bad">พบ ${r.issues.length} จุดที่ไม่ตรง</div><ul>${r.issues.map(i => `<li>${UI.esc(i)}</li>`).join('')}</ul>`;
    } catch (e) { UI.toast(e.message, true); }
  };
  load();
}

const rng = () => ({ from: document.getElementById('r-from').value, to: document.getElementById('r-to').value });

async function loadSummary() {
  try {
    const s = await Api.call('summary', rng());
    const card = (a, b, c) => `<div><span>${a}</span><b style="${c || ''}">${b}</b></div>`;
    document.getElementById('r-sum').innerHTML = `<div class="stat">
      ${card('ยอดขายรวม', UI.money(s.total))}${card('เงินสด', UI.money(s.cash))}${card('โอน', UI.money(s.transfer))}${card('ขายเชื่อ', UI.money(s.credit))}
      ${card('ส่วนลดรวม', UI.money(s.discount))}${card('ใบลดหนี้/คืนสินค้า', UI.money(s.creditNotes))}${card('VAT ขาย', UI.money(s.vat))}${card('ต้นทุนขาย', UI.money(s.cogs))}${card('กำไรขั้นต้น', UI.money(s.gross), 'color:var(--green)')}${card('ค่าใช้จ่ายบริหาร', UI.money(s.expenses), 'color:var(--red)')}${card('กำไรสุทธิ', UI.money(s.net), 'color:var(--green)')}
      ${card('จำนวนบิล', s.bills + (s.voided ? ` <small class="muted">(ยกเลิก ${s.voided})</small>` : ''))}${card('รับชำระหนี้', UI.money(s.arReceived))}${card('ถอนเงิน', UI.money(s.withdrawn))}${card('ซื้อเข้า', UI.money(s.purchases))}</div>`;
    document.getElementById('r-top').innerHTML = s.top.length ? `<table><thead><tr><th>สินค้า</th><th class="r">จำนวน</th><th class="r">ยอดขาย</th></tr></thead><tbody>
      ${s.top.map(x => `<tr><td>${UI.esc(x.name)}</td><td class="r num">${x.qty}</td><td class="r num">${UI.money(x.amount)}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">ยังไม่มียอดขาย</div>';
  } catch (e) { UI.toast(e.message, true); }
}

async function loadSales() {
  const box = document.getElementById('r-sales');
  try {
    const rows = await Api.call('listSales', rng());
    box.innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>เลขที่</th><th>เวลา</th><th>ชำระ</th><th>ลูกค้า</th><th class="r">ยอด</th><th>หมายเหตุ</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr style="${r.status === 'VOID' ? 'opacity:.55' : ''}"><td>${UI.esc(r.sale_no)}</td><td>${UI.esc(String(r.date).slice(5, 16))}</td>
        <td>${r.status === 'VOID' ? '<span class="tag void">ยกเลิก</span>' : UI.payTag(r.pay_type)}</td><td>${UI.esc(r.cust_name)}</td>
        <td class="r num">${UI.money(r.total)}</td><td class="muted" style="max-width:220px">${UI.esc(r.note)}</td>
        <td class="r" style="white-space:nowrap">
          <button class="ghost sm" data-pr="${UI.esc(r.sale_no)}" >พิมพ์</button>
          ${r.receipt_url ? `<a class="btn ghost sm" style="background:#fff;color:var(--text);border:1px solid var(--line);padding:5px 10px;font-weight:500;font-size:13px" href="${UI.esc(r.receipt_url)}" target="_blank" rel="noopener" >PDF</a>` : ''}
          ${r.slip_url ? `<a class="btn ghost sm" style="background:#fff;color:var(--text);border:1px solid var(--line);padding:5px 10px;font-weight:500;font-size:13px" href="${UI.esc(r.slip_url)}" target="_blank" rel="noopener" >สลิป</a>`
            : (r.pay_type === 'transfer' && r.status !== 'VOID' ? `<button class="ghost sm" data-slip="${UI.esc(r.sale_no)}" >แนบสลิป</button>` : '')}
          ${App.isAdmin() && r.status !== 'VOID' ? `<button class="ghost sm" data-void="${UI.esc(r.sale_no)}" >ยกเลิก</button>` : ''}
          ${App.isAdmin() && r.status !== 'VOID' ? `<button class="ghost sm" data-credit-note="${UI.esc(r.sale_no)}" >ลดหนี้/คืน</button>` : ''}
        </td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">ไม่มีบิลในช่วงนี้</div>';
    box.querySelectorAll('[data-pr]').forEach(b => b.onclick = async () => {
      try { UI.printReceipt(await Api.call('getSale', { saleNo: b.dataset.pr }), App.state.settings); } catch (e) { UI.toast(e.message, true); }
    });
    box.querySelectorAll('[data-slip]').forEach(b => b.onclick = () => UI.modal('แนบสลิป ' + b.dataset.slip, '<input type="file" id="as-f" accept="image/*,application/pdf">', [
      { label: 'ยกเลิก', cls: 'ghost' },
      { label: 'อัปโหลด', onClick: async (close, r) => {
        const f = r.querySelector('#as-f').files[0]; if (!f) throw new Error('เลือกไฟล์สลิป');
        await Api.call('attachSlip', { saleNo: b.dataset.slip, slip: await Api.slipFromFile(f) }); close(); UI.toast('แนบสลิปแล้ว'); loadSales();
      } }
    ]));
    box.querySelectorAll('[data-void]').forEach(b => b.onclick = () => UI.modal('ยกเลิกบิล ' + b.dataset.void, '<p class="muted">สต็อกและเงินจะถูกกลับรายการ บิลยังอยู่ในระบบโดยมีสถานะยกเลิก</p><label>เหตุผล</label><input id="v-r">', [
      { label: 'ไม่ยกเลิก', cls: 'ghost' },
      { label: 'ยกเลิกบิล', cls: 'danger', onClick: async (close, r) => {
        const reason = r.querySelector('#v-r').value.trim(); if (!reason) throw new Error('ใส่เหตุผล');
        await Api.call('voidSale', { saleNo: b.dataset.void, reason }); close(); UI.toast('ยกเลิกบิลแล้ว'); App.refresh(); loadSummary(); loadSales();
      } }
    ]));
    box.querySelectorAll('[data-credit-note]').forEach(b => b.onclick = () => creditNoteModal(b.dataset.creditNote, document.getElementById('page'), () => { App.refresh().catch(() => {}); loadSummary(); loadSales(); }));
  } catch (e) { box.innerHTML = `<div class="notice bad">${UI.esc(e.message)}</div>`; }
}
