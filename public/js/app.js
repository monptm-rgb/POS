// ---------- สถานะกลางของแอป ----------
const App = {
  state: { settings: {}, products: [], customers: [], suppliers: [], shift: null },
  user: () => Api.getUser(),
  isAdmin: () => (Api.getUser() || {}).role === 'admin',
  async refresh() {
    const d = await Api.call('bootstrap');
    Object.assign(App.state, d);
    const nm = document.getElementById('shop-name');
    if (nm && d.settings.shop_name) nm.firstChild.nodeValue = d.settings.shop_name;
    return d;
  }
};

const MENU = [
  ['#/sell', 'ขาย', 'ti-shopping-cart', false],
  ['#/purchase', 'ซื้อ', 'ti-truck-delivery', true],
  ['#/products', 'สินค้า', 'ti-package', true],
  ['#/stock', 'สต็อก', 'ti-building-warehouse', true],
  ['#/contacts', 'ลูกค้า/ผู้ขาย', 'ti-address-book', false],
  ['#/arap', 'ลูกหนี้/เจ้าหนี้', 'ti-file-invoice', false],
  ['#/cash', 'เงินสด', 'ti-cash-register', false],
  ['#/expenses', 'ค่าใช้จ่าย', 'ti-receipt-2', true],
  ['#/reports', 'รายงาน', 'ti-chart-bar', false],
  ['#/settings', 'ตั้งค่า', 'ti-settings', true]
];
const ROUTES = {
  '#/sell': p => renderSell(p), '#/purchase': p => renderPurchase(p), '#/products': p => renderProducts(p),
  '#/stock': p => renderStock(p), '#/contacts': p => renderContacts(p), '#/arap': p => renderArAp(p),
  '#/cash': p => renderCash(p), '#/expenses': p => renderExpenses(p), '#/reports': p => renderReports(p), '#/settings': p => renderSettings(p)
};

function menuFor(user) { return MENU.filter(m => !m[3] || user.role === 'admin'); }

function renderShell(hash) {
  const u = App.user();
  const items = menuFor(u);
  const link = (m, cls) => `<a href="${m[0]}" class="${hash === m[0] ? 'active' : ''}"><i class="ti ${m[2]}" aria-hidden="true"></i><span>${m[1]}</span></a>`;
  document.getElementById('app').innerHTML = `
  <div class="shell">
    <aside class="side">
      <div class="brand" id="shop-name">${UI.esc(App.state.settings.shop_name || window.SHOP_NAME)}<small>ระบบขายหน้าร้าน</small></div>
      <nav>${items.map(m => link(m)).join('')}</nav>
      <div class="me">${UI.esc(u.name)}<br><span style="color:#93a0ab">${u.role === 'admin' ? 'แอดมิน' : 'แคชเชียร์'} · ${UI.esc(u.userId)}</span>
        <button onclick="logout()">ออกจากระบบ</button></div>
    </aside>
    <div style="flex:1;min-width:0">
      <div class="topbar-m"><div><b>${UI.esc(App.state.settings.shop_name || window.SHOP_NAME)}</b><div class="who">${UI.esc(u.name)}</div></div><button onclick="logout()">ออก</button></div>
      <main class="content" id="page"></main>
    </div>
  </div>
  <nav class="bottom-nav">${items.map(m => link(m)).join('')}</nav>`;
}

let booted = false;
async function route() {
  const hash = location.hash || '#/sell';
  const u = App.user();
  if (!u) { renderLogin(); return; }
  if (hash === '#/login') { location.hash = '#/sell'; return; }
  const allowed = menuFor(u).map(m => m[0]);
  const target = allowed.includes(hash) ? hash : '#/sell';
  if (target !== hash) { location.hash = target; return; }
  renderShell(target);
  const page = document.getElementById('page');
  try {
    if (!booted) { page.innerHTML = '<div class="empty">กำลังโหลดข้อมูล...</div>'; await App.refresh(); booted = true; renderShell(target); }
    await ROUTES[target](document.getElementById('page'));
  } catch (e) {
    document.getElementById('page').innerHTML = `<div class="notice bad">${UI.esc(e.message)}</div><button onclick="booted=false;route()">ลองใหม่</button>`;
  }
}

function logout() { Api.clearSession(); booted = false; location.hash = '#/login'; renderLogin(); }

function renderLogin() {
  document.getElementById('app').innerHTML = `
  <div class="login"><div class="box">
    <h1>${UI.esc(window.SHOP_NAME)}</h1><p class="muted" style="margin:0 0 10px">เข้าสู่ระบบขายหน้าร้าน</p>
    <label for="lg-u">รหัสพนักงาน</label><input id="lg-u" placeholder="เช่น U001" autocomplete="username">
    <label for="lg-p">PIN</label><input id="lg-p" type="password" inputmode="numeric" autocomplete="current-password">
    <div class="err" id="lg-err"></div>
    <button class="block" id="lg-btn" style="margin-top:8px">เข้าสู่ระบบ</button>
    <div class="conn muted" id="lg-conn">กำลังตรวจการเชื่อมต่อ...</div>
  </div></div>`;
  const go = async () => {
    const err = document.getElementById('lg-err'); err.textContent = '';
    const userId = document.getElementById('lg-u').value.trim(), pin = document.getElementById('lg-p').value.trim();
    if (!userId || !pin) { err.textContent = 'กรอกรหัสพนักงานและ PIN'; return; }
    try {
      Api.setSession(await Api.call('login', { userId, pin }));
      booted = false; location.hash = '#/sell'; route();
    } catch (e) { err.textContent = e.message; }
  };
  document.getElementById('lg-btn').onclick = go;
  document.getElementById('lg-p').onkeydown = e => { if (e.key === 'Enter') go(); };
  Api.call('ping').then(() => { document.getElementById('lg-conn').innerHTML = '<span style="color:var(--green)">● เชื่อมต่อฐานข้อมูลได้</span>'; })
    .catch(e => { document.getElementById('lg-conn').innerHTML = `<span style="color:var(--red)">● ${UI.esc(e.message)}</span>`; });
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  route();
  window.addEventListener('online', async () => { try { const n = await Api.flushQueue(); if (n) { UI.toast('ส่งรายการขายที่พักไว้แล้ว ' + n + ' บิล'); App.refresh().catch(() => {}); } } catch (e) {} });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
