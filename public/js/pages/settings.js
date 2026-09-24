// ---------- ตั้งค่า: ร้าน + พนักงาน ----------
async function renderSettings(el) {
  const s = App.state.settings;
  const chk = (k, label) => `<label style="display:flex;gap:8px;align-items:center;color:var(--text);font-size:14px"><input type="checkbox" id="s-${k}" style="width:auto" ${s[k] === 'TRUE' ? 'checked' : ''}>${label}</label>`;
  el.innerHTML = `
  <div class="page-head"><h2>ตั้งค่า</h2></div>
  <div class="grid-2">
    <section class="panel"><h3>ข้อมูลร้าน (แสดงบนใบเสร็จ)</h3>
      <label>ชื่อร้าน</label><input id="s-shop_name" value="${UI.esc(s.shop_name)}">
      <label>ที่อยู่</label><textarea id="s-address" rows="2">${UI.esc(s.address)}</textarea>
      <div class="row"><div><label>เบอร์โทร</label><input id="s-phone" value="${UI.esc(s.phone)}"></div><div><label>เลขผู้เสียภาษี</label><input id="s-tax_id" value="${UI.esc(s.tax_id)}"></div></div>
      <label>ข้อความท้ายใบเสร็จ</label><input id="s-receipt_footer" value="${UI.esc(s.receipt_footer)}">
      <h3 style="margin-top:18px">การขาย</h3>
      ${chk('vat_registered', 'ร้านจดทะเบียน VAT')}${chk('price_includes_vat', 'ราคาขายรวม VAT แล้ว')}
      ${chk('allow_negative_stock', 'ยอมให้ขายเกินสต็อก')}${chk('save_receipt_pdf', 'เก็บใบเสร็จ PDF ลงโฟลเดอร์ Drive ทุกบิล')}
      <label>เพดานส่วนลดของแคชเชียร์ (%)</label><input id="s-max_discount_percent" class="num" inputmode="decimal" value="${UI.esc(s.max_discount_percent)}">
      <div class="err" id="s-err"></div><button id="s-save" style="margin-top:8px">บันทึกการตั้งค่า</button>
    </section>
    <section class="panel"><div class="page-head"><h3 style="margin:0">พนักงาน</h3><button class="sm" id="u-new"><i class="ti ti-plus"></i> เพิ่มพนักงาน</button></div><div id="u-list"></div></section>
  </div>`;
  el.querySelector('#s-save').onclick = async () => {
    const p = {};
    ['shop_name', 'address', 'phone', 'tax_id', 'receipt_footer', 'max_discount_percent'].forEach(k => p[k] = el.querySelector('#s-' + k).value.trim());
    ['vat_registered', 'price_includes_vat', 'allow_negative_stock', 'save_receipt_pdf'].forEach(k => p[k] = el.querySelector('#s-' + k).checked ? 'TRUE' : 'FALSE');
    try { App.state.settings = await Api.call('saveSettings', p); UI.toast('บันทึกการตั้งค่าแล้ว'); renderShell('#/settings'); renderSettings(document.getElementById('page')); }
    catch (e) { el.querySelector('#s-err').textContent = e.message; }
  };
  el.querySelector('#u-new').onclick = () => editUser(null, el);
  loadUsers(el);
}

async function loadUsers(el) {
  try {
    const us = await Api.call('listUsers');
    const me = App.user();
    el.querySelector('#u-list').innerHTML = `<table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>สิทธิ์</th><th></th></tr></thead><tbody>
      ${us.map(u => `<tr style="${u.active ? '' : 'opacity:.5'}"><td>${UI.esc(u.user_id)}</td><td>${UI.esc(u.name)}${u.user_id === me.userId ? ' <span class="muted">(คุณ)</span>' : ''}</td>
        <td>${u.role === 'admin' ? 'แอดมิน' : 'แคชเชียร์'}${u.active ? '' : ' · ลบแล้ว'}</td>
        <td class="r" style="white-space:nowrap">${u.active ? `<button class="ghost sm" data-e="${UI.esc(u.user_id)}">แก้ไข</button>${u.user_id !== me.userId ? ` <button class="ghost sm" data-d="${UI.esc(u.user_id)}">ลบ</button>` : ''}`
          : `<button class="ghost sm" data-a="${UI.esc(u.user_id)}">กู้คืน</button>`}</td></tr>`).join('')}</tbody></table>
      <p class="muted">พนักงานเข้าระบบด้วย "รหัส" + PIN ของตัวเอง</p>`;
    el.querySelectorAll('[data-e]').forEach(b => b.onclick = () => editUser(us.find(u => u.user_id === b.dataset.e), el));
    el.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
      const u = us.find(x => x.user_id === b.dataset.d);
      if (!await UI.confirmBox('ลบพนักงาน', `ลบ ${u.name}? พนักงานคนนี้จะเข้าระบบไม่ได้ (ประวัติการขายยังอยู่)`)) return;
      try { await Api.call('deleteUser', { userId: u.user_id }); UI.toast('ลบพนักงานแล้ว'); loadUsers(el); } catch (e) { UI.toast(e.message, true); }
    });
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
      try { await Api.call('updateUser', { userId: b.dataset.a, active: true }); UI.toast('กู้คืนแล้ว'); loadUsers(el); } catch (e) { UI.toast(e.message, true); }
    });
  } catch (e) { UI.toast(e.message, true); }
}

function editUser(u, el) {
  const isNew = !u; u = u || {};
  UI.modal(isNew ? 'เพิ่มพนักงาน' : 'แก้ไข ' + u.name, `
    <label>ชื่อพนักงาน</label><input id="u-n" value="${UI.esc(u.name || '')}">
    <label>สิทธิ์</label><select id="u-r"><option value="cashier" ${u.role !== 'admin' ? 'selected' : ''}>แคชเชียร์ — ขาย รับชำระ เปิด/ปิดกะ</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>แอดมิน — ทุกเมนู</option></select>
    <label>${isNew ? 'PIN (ตัวเลข 4-6 หลัก)' : 'PIN ใหม่ (ว่างไว้ = ไม่เปลี่ยน)'}</label><input id="u-p" type="password" inputmode="numeric" autocomplete="new-password">`, [
    { label: 'ยกเลิก', cls: 'ghost' },
    { label: 'บันทึก', onClick: async (close, r) => {
      const name = r.querySelector('#u-n').value.trim(), role = r.querySelector('#u-r').value, pin = r.querySelector('#u-p').value.trim();
      if (!name) throw new Error('กรอกชื่อ');
      if (isNew) {
        const x = await Api.call('addUser', { name, role, pin });
        close(); UI.modal('เพิ่มพนักงานแล้ว', `<p>แจ้ง ${UI.esc(name)} ให้เข้าระบบด้วยรหัส <b style="font-size:20px">${UI.esc(x.user_id)}</b> และ PIN ที่ตั้งไว้</p>`);
      } else { await Api.call('updateUser', { userId: u.user_id, name, role, pin: pin || undefined }); close(); UI.toast('บันทึกแล้ว'); }
      loadUsers(el);
    } }
  ]);
}
