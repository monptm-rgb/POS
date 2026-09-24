// ---------- หน้าสินค้า ----------
async function renderProducts(el) {
  el.innerHTML = `
  <div class="page-head"><h2>สินค้า</h2><button id="pd-new"><i class="ti ti-plus"></i> เพิ่มสินค้า</button></div>
  <section class="panel">
    <div class="search"><i class="ti ti-search" aria-hidden="true"></i><input id="pd-q" placeholder="ค้นหาชื่อ / รหัส / บาร์โค้ด / หมวด" aria-label="ค้นหาสินค้า"></div>
    <div class="table-wrap" style="margin-top:10px"><table>
      <thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>หมวด</th><th class="r">ราคาขาย</th><th class="r">คงเหลือ</th><th></th></tr></thead>
      <tbody id="pd-rows"></tbody></table></div>
    <p class="muted">สินค้าใหม่เริ่มที่สต็อก 0 — รับเข้าได้ที่เมนู "ซื้อ" หรือ "สต็อก > ปรับสต็อก"</p>
  </section>`;
  el.querySelector('#pd-new').onclick = () => editProduct(null);
  el.querySelector('#pd-q').oninput = drawProducts;
  drawProducts();
}

function drawProducts() {
  const tb = document.getElementById('pd-rows'); if (!tb) return;
  const q = (document.getElementById('pd-q').value || '').toLowerCase();
  const rows = App.state.products.filter(p => !q || [p.name, p.sku, p.barcode, p.category].some(v => String(v).toLowerCase().includes(q)));
  tb.innerHTML = rows.map(p => {
    const low = Number(p.qty_on_hand) <= Number(p.min_qty || 0);
    return `<tr><td>${UI.esc(p.sku)}${p.barcode ? `<br><span class="muted">${UI.esc(p.barcode)}</span>` : ''}</td><td>${UI.esc(p.name)}</td><td>${UI.esc(p.category)}</td>
      <td class="r num">${UI.money(p.sell_price)}</td>
      <td class="r num" style="${low ? 'color:var(--red);font-weight:600' : ''}">${p.qty_on_hand} ${UI.esc(p.unit)}</td>
      <td class="r" style="white-space:nowrap"><button class="ghost sm" data-ed="${UI.esc(p.sku)}">แก้ไข</button> <button class="ghost sm" data-rm="${UI.esc(p.sku)}">ลบ</button></td></tr>`;
  }).join('') || `<tr><td colspan="7" class="empty">${App.state.products.length ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้า กด "เพิ่มสินค้า" เพื่อเริ่ม'}</td></tr>`;
  tb.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editProduct(App.state.products.find(p => p.sku === b.dataset.ed)));
  tb.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => {
    const p = App.state.products.find(x => x.sku === b.dataset.rm);
    if (!await UI.confirmBox('ลบสินค้า', `ลบ "${p.name}" ออกจากรายการขาย? (ประวัติบิลเก่ายังอยู่)`)) return;
    try { await Api.call('deleteProduct', { sku: p.sku }); await App.refresh(); drawProducts(); UI.toast('ลบสินค้าแล้ว'); } catch (e) { UI.toast(e.message, true); }
  });
}

function editProduct(p) {
  const isNew = !p; p = p || {};
  UI.modal(isNew ? 'เพิ่มสินค้า' : 'แก้ไขสินค้า', `
    <div class="row"><div><label>รหัสสินค้า</label><input id="f-sku" value="${UI.esc(p.sku || '')}" ${isNew ? 'placeholder="ว่างไว้ให้ระบบตั้ง"' : 'disabled'}></div>
      <div><label>บาร์โค้ด</label><input id="f-bc" value="${UI.esc(p.barcode || '')}"></div></div>
    <label>ชื่อสินค้า *</label><input id="f-name" value="${UI.esc(p.name || '')}">
    <div class="row"><div><label>หมวดหมู่</label><input id="f-cat" value="${UI.esc(p.category || '')}"></div>
      <div><label>หน่วย</label><input id="f-unit" value="${UI.esc(p.unit || 'ชิ้น')}"></div></div>
    <div class="row"><div><label>ราคาขาย *</label><input id="f-price" class="num" inputmode="decimal" value="${p.sell_price ?? ''}"></div>
      <div><label>จุดสั่งซื้อ (แจ้งเตือนเมื่อเหลือ)</label><input id="f-min" class="num" inputmode="decimal" value="${p.min_qty ?? 0}"></div></div>
    <p class="muted">ราคาทุนกำหนดตอนรับสินค้าเข้า และระบบเก็บแยกเป็นล็อต ไม่ใช้ทุนเฉลี่ย</p>`, [
    { label: 'ยกเลิก', cls: 'ghost' },
    { label: 'บันทึก', onClick: async (close, r) => {
      const v = id => (r.querySelector(id) || {}).value;
      if (!v('#f-name').trim()) throw new Error('กรอกชื่อสินค้า');
      if (v('#f-price') === '' || isNaN(parseFloat(v('#f-price')))) throw new Error('กรอกราคาขาย');
      await Api.call('saveProduct', { sku: isNew ? v('#f-sku').trim() : p.sku, barcode: v('#f-bc').trim(), name: v('#f-name').trim(), category: v('#f-cat').trim(),
        unit: v('#f-unit').trim(), sell_price: parseFloat(v('#f-price')), min_qty: parseFloat(v('#f-min')) || 0 });
      close(); await App.refresh(); drawProducts(); UI.toast('บันทึกสินค้าแล้ว');
    } }
  ]);
}
