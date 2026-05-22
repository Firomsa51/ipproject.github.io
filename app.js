/* ===================================================
   HU Inventory Management System — app.js
   All data-binding, CRUD workflows, and DOM operations
   =================================================== */

// =============================================
// SEED INVENTORY DATA
// =============================================
let categories = [
  { id: 101, name: 'IT Infrastructure Equipment' },
  { id: 102, name: 'Lab Glassware & Reagents' },
  { id: 103, name: 'Office Furniture & Stationary' }
];

let suppliers = [
  { id: 1, name: 'Ethio Telecom Distribution', phone: '0911223344', email: 'b2b@ethiotelecom.et' },
  { id: 2, name: 'Abebe Stationery Enterprise', phone: '0922445566', email: 'info@abebestationery.com' },
  { id: 3, name: 'Global Chemical Suppliers', phone: '0933778899', email: 'import@globalchem.org' }
];

let stockItems = [
  { id: 2001, name: 'ThinkPad L14 Gen 4 Laptop', price: 85000, qty: 14, alert_level: 5, category_id: 101, supplier_id: 1 },
  { id: 2002, name: 'Hydrochloric Acid 37% (1L)', price: 1200, qty: 3, alert_level: 8, category_id: 102, supplier_id: 3 },
  { id: 2003, name: 'A4 Printing Paper (Box)', price: 2100, qty: 45, alert_level: 10, category_id: 103, supplier_id: 2 }
];

let movements = [
  { id: 501, date: '2026-05-10', item_id: 2001, type: 'Restock (Inflow)', qty: 10, note: 'Initial central deployment allocation' },
  { id: 502, date: '2026-05-18', item_id: 2002, type: 'Disbursed (Outflow)', qty: 2, note: 'Issued to Freshman Chemistry Lab' }
];

// Incrementing Sequence Trackers
let nextItemId = 2004;
let nextCatId  = 104;
let nextSupId  = 4;
let nextMoveId = 503;

let currentUser = { name: "Admin Store", role: "Store Administrator" };

// =============================================
// SEAMLESS RE-MAPPING UTILITIES
// =============================================
const getItemName = (id) => {
  const item = stockItems.find(i => i.id === id);
  return item ? item.name : '—';
};

const getCatName = (id) => {
  const cat = categories.find(c => c.id === id);
  return cat ? cat.name : '—';
};

const getSupplierName = (id) => {
  const sup = suppliers.find(s => s.id === id);
  return sup ? sup.name : '—';
};

const fmtNum = (n) => Number(n).toLocaleString();

const emptyRow = (cols) =>
  `<tr class="empty-row"><td colspan="${cols}">No records matched down in this partition.</td></tr>`;

// =============================================
// COMPONENT TRIGGER CONTROLS
// =============================================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Global modal background closing attachment
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// =============================================
// DATA SELECT DROPDOWN SYNCING
// =============================================
function populateSelect(selectId, items, valKey, labelFn) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const prevValue = sel.value;
  sel.innerHTML = items.map(i =>
    `<option value="${i[valKey]}">${labelFn(i)}</option>`
  ).join('');
  if (prevValue) sel.value = prevValue;
}

function refreshAllSelects() {
  populateSelect('itemCat', categories, 'id', c => `${c.id} — ${c.name}`);
  populateSelect('itemSupplier', suppliers, 'id', s => `${s.name}`);
  populateSelect('moveItem', stockItems, 'id', i => `${i.name} (Available: ${i.qty})`);
}

// =============================================
// SPA TAB CONTEXT HANDLERS
// =============================================
const titles = {
  dashboard: 'Control Center Dashboard',
  items: 'Stock Inventory Registry',
  categories: 'Store Categories & Campuses',
  suppliers: 'Supplier Directories',
  movements: 'Stock Flow Ledger logs',
  valuation: 'Inventory Financial Auditing'
};

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');

    document.getElementById('pageTitle').textContent = titles[tab] || tab;

    renderAll();

    if (window.innerWidth <= 860) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

// Mobile Sidebar trigger linkage
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// =============================================
// SUB-TABLE RENDERING SUBSYSTEMS
// =============================================
function renderAll() {
  renderDashboard();
  renderItems();
  renderCategories();
  renderSuppliers();
  renderMovements();
  renderValuation();
}

function renderDashboard() {
  document.getElementById('stat-items').textContent = stockItems.length;
  document.getElementById('stat-categories').textContent = categories.length;

  const absoluteValue = stockItems.reduce((acc, current) => acc + (current.price * current.qty), 0);
  document.getElementById('stat-value').textContent = fmtNum(absoluteValue);

  const lowStockCount = stockItems.filter(i => i.qty <= i.alert_level).length;
  document.getElementById('stat-low-stock').textContent = lowStockCount;

  // Render recent elements row block
  const tbody = document.querySelector('#dash-item-table tbody');
  tbody.innerHTML = stockItems.length === 0 ? emptyRow(3) :
    stockItems.slice(-5).reverse().map(i => `
      <tr>
        <td><strong>${i.name}</strong></td>
        <td>${getCatName(i.category_id)}</td>
        <td><span class="date-badge" style="background:${i.qty <= i.alert_level ? '#ffcdd2' : '#e8f5e9'}">${i.qty} units</span></td>
      </tr>
    `).join('');

  // Critical Low Stock Bar Indicators
  const container = document.getElementById('stockBars');
  container.innerHTML = stockItems.length === 0
    ? '<p style="color:var(--text-light);font-size:13px">No materials registered.</p>'
    : stockItems.map(i => {
        const percentage = Math.min((i.qty / (i.alert_level * 3)) * 100, 100); 
        const statusColor = i.qty <= i.alert_level ? '#c62828' : '#2e7d32';
        return `
          <div class="perf-bar-row" style="margin-bottom:12px;">
            <div class="perf-bar-meta">
              <span>${i.name}</span>
              <span style="color:${statusColor}; font-weight:bold;">${i.qty} on hand (Min Alert: ${i.alert_level})</span>
            </div>
            <div class="perf-bar-track" style="background:#eee; height:8px; border-radius:4px; overflow:hidden;">
              <div class="perf-bar-fill" style="width:${percentage}%; height:100%; background:${statusColor}; transition:width 0.4s;"></div>
            </div>
          </div>`;
      }).join('');
}

function renderItems() {
  const tbody = document.querySelector('#itemTable tbody');
  tbody.innerHTML = stockItems.length === 0 ? emptyRow(8) :
    stockItems.map(i => `
      <tr>
        <td>${i.id}</td>
        <td><b>${i.name}</b></td>
        <td>${getCatName(i.category_id)}</td>
        <td>${getSupplierName(i.supplier_id)}</td>
        <td>ETB ${fmtNum(i.price)}</td>
        <td style="font-weight:600; color:${i.qty <= i.alert_level ? '#c62828' : 'inherit'}">${i.qty}</td>
        <td><span class="date-badge">${i.alert_level} units</span></td>
        <td>
          <button class="btn-edit" onclick="editItem(${i.id})">Edit</button>
          <button class="btn-del" onclick="deleteItem(${i.id})">Delete</button>
        </td>
      </tr>`
    ).join('');
}

function renderCategories() {
  const tbody = document.querySelector('#catTable tbody');
  tbody.innerHTML = categories.length === 0 ? emptyRow(3) :
    categories.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td><button class="btn-del" onclick="deleteCategory(${c.id})">Delete</button></td>
      </tr>`
    ).join('');
}

function renderSuppliers() {
  const tbody = document.querySelector('#supplierTable tbody');
  tbody.innerHTML = suppliers.length === 0 ? emptyRow(5) :
    suppliers.map(s => `
      <tr>
        <td>${s.id}</td>
        <td><b>${s.name}</b></td>
        <td>${s.phone}</td>
        <td><code>${s.email}</code></td>
        <td><button class="btn-del" onclick="deleteSupplier(${s.id})">Delete</button></td>
      </tr>`
    ).join('');
}

function renderMovements() {
  const tbody = document.querySelector('#movementTable tbody');
  tbody.innerHTML = movements.length === 0 ? emptyRow(6) :
    movements.slice().reverse().map(m => {
      const isOut = m.type.includes('Outflow') || m.type.includes('Damaged');
      return `
        <tr>
          <td>${m.id}</td>
          <td>${m.date}</td>
          <td>${getItemName(m.item_id)}</td>
          <td><span class="date-badge" style="background:${isOut ? '#ffebee':'#e8f5e9'}; color:${isOut?'#c62828':'#2e7d32'}">${m.type}</span></td>
          <td><strong>${isOut ? '-' : '+'}${m.qty}</strong></td>
          <td><span style="font-style:italic; color:var(--text-secondary)">${m.note}</span></td>
        </tr>`;
    }).join('');
}

function renderValuation() {
  const tbody = document.querySelector('#valuationTable tbody');
  tbody.innerHTML = stockItems.length === 0 ? emptyRow(5) :
    stockItems.map(i => `
      <tr>
        <td>${i.id}</td>
        <td>${i.name}</td>
        <td>ETB ${fmtNum(i.price)}</td>
        <td>${i.qty} units</td>
        <td><strong>ETB ${fmtNum(i.price * i.qty)}</strong></td>
      </tr>`
    ).join('');
}

// =============================================
// ADD / EDIT FORM HANDLING PIPELINES
// =============================================
function openItemModal() {
  document.getElementById('itemEditId').value = '';
  document.getElementById('itemModalTitle').textContent = 'Add New Stock Item';
  document.getElementById('itemName').value = '';
  document.getElementById('itemPrice').value = '';
  document.getElementById('itemQty').value = '';
  document.getElementById('itemAlert').value = '';
  refreshAllSelects();
  openModal('itemModal');
}

function saveItem() {
  const editId = document.getElementById('itemEditId').value;
  const name = document.getElementById('itemName').value.trim();
  const price = parseFloat(document.getElementById('itemPrice').value);
  const qty = parseInt(document.getElementById('itemQty').value);
  const alert_level = parseInt(document.getElementById('itemAlert').value);
  const category_id = parseInt(document.getElementById('itemCat').value);
  const supplier_id = parseInt(document.getElementById('itemSupplier').value);

  if (!name || isNaN(price) || isNaN(qty) || isNaN(alert_level)) {
    alert('Please completely fill out the form parameters.');
    return;
  }

  if (editId) {
    const target = stockItems.find(i => i.id == editId);
    if (target) {
      target.name = name;
      target.price = price;
      target.qty = qty;
      target.alert_level = alert_level;
      target.category_id = category_id;
      target.supplier_id = supplier_id;
      showToast('✓ Inventory entry parameters updated successfully.');
    }
  } else {
    stockItems.push({ id: nextItemId++, name, price, qty, alert_level, category_id, supplier_id });
    showToast('✓ Stock record inserted into database cluster.');
  }
  closeModal('itemModal');
  renderAll();
}

function editItem(id) {
  const item = stockItems.find(i => i.id === id);
  if (!item) return;

  document.getElementById('itemEditId').value = item.id;
  document.getElementById('itemModalTitle').textContent = 'Modify Asset Parameters';
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemQty').value = item.qty;
  document.getElementById('itemAlert').value = item.alert_level;

  refreshAllSelects();
  document.getElementById('itemCat').value = item.category_id;
  document.getElementById('itemSupplier').value = item.supplier_id;

  openModal('itemModal');
}

function deleteItem(id) {
  if (!confirm('Purge item tracking completely from University cluster database?')) return;
  stockItems = stockItems.filter(i => i.id !== id);
  showToast('✕ Item record dropped from active clusters.');
  renderAll();
}

function saveCategory() {
  const title = document.getElementById('addCatName').value.trim();
  if (!title) return alert('Provide a clear category title string.');
  
  categories.push({ id: nextCatId++, name: title });
  document.getElementById('addCatName').value = '';
  showToast('✓ Allocation inventory division mapped.');
  renderAll();
}

function deleteCategory(id) {
  if (!confirm('Delete category?')) return;
  categories = categories.filter(c => c.id !== id);
  showToast('✕ Category segment cleared.');
  renderAll();
}

function saveSupplier() {
  const name = document.getElementById('supName').value.trim();
  const phone = document.getElementById('supPhone').value.trim();
  const email = document.getElementById('supEmail').value.trim();

  if (!name || !phone) return alert('Provide basic operational supplier strings.');

  suppliers.push({ id: nextSupId++, name, phone, email });
  closeModal('supplierModal');
  document.getElementById('supName').value = '';
  document.getElementById('supPhone').value = '';
  document.getElementById('supEmail').value = '';
  showToast('✓ Supplier record linked securely.');
  renderAll();
}

function deleteSupplier(id) {
  if (!confirm('Drop supplier registry?')) return;
  suppliers = suppliers.filter(s => s.id !== id);
  showToast('✕ Supplier reference deleted.');
  renderAll();
}

function saveMovement() {
  const item_id = parseInt(document.getElementById('moveItem').value);
  const type = document.getElementById('moveType').value;
  const delta = parseInt(document.getElementById('moveQty').value);
  const note = document.getElementById('moveNote').value.trim() || 'General adjustment log';

  if (isNaN(delta) || delta <= 0) return alert('Provide valid positive unit integer amounts.');

  const target = stockItems.find(i => i.id === item_id);
  if (!target) return;

  if (type.includes('Outflow') || type.includes('Damaged')) {
    if (target.qty < delta) return alert('Transaction denied! Insufficient inventory quantity available on shelf.');
    target.qty -= delta;
  } else {
    target.qty += delta;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  movements.push({ id: nextMoveId++, date: todayStr, item_id, type, qty: delta, note });

  closeModal('movementModal');
  document.getElementById('moveQty').value = '';
  document.getElementById('moveNote').value = '';
  showToast('✓ Stock transactional ledger state mutated successfully.');
  renderAll();
}

// =============================================
// IDENTITY ACCESS WORKFLOWS (PASS-THROUGH)
// =============================================
function togglePass(id, btn) {
  const input = document.getElementById(id);
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '🔊';
  } else {
    input.type = 'password';
    btn.innerHTML = '👁️';
  }
}

function switchToSignup() {
  document.getElementById('loginForm').classList.remove('active');
  document.getElementById('signupForm').classList.add('active');
}

function switchToLogin() {
  document.getElementById('signupForm').classList.remove('active');
  document.getElementById('loginForm').classList.add('active');
}

function handleLogin() {
  const u = document.getElementById('loginUsername').value.trim();
  const p = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');

  if (u === 'admin' && p === 'admin123') {
    err.classList.remove('visible');
    enterApp(currentUser);
  } else {
    err.textContent = 'Invalid institutional store user or secret password.';
    err.classList.add('visible');
  }
}

function handleSignup() {
  const name = document.getElementById('signupName').value.trim();
  const user = document.getElementById('signupUsername').value.trim();
  const role = document.getElementById('signupRole').value;
  const p = document.getElementById('signupPassword').value;
  const c = document.getElementById('signupConfirm').value;

  if (!name || !user || !p) {
    document.getElementById('signupError').textContent = 'Fill in all active fields.';
    document.getElementById('signupError').classList.add('visible');
    return;
  }
  if (p !== c) {
    document.getElementById('signupError').textContent = 'Passwords mismatches detected.';
    document.getElementById('signupError').classList.add('visible');
    return;
  }

  currentUser = { name, role };
  document.getElementById('signupError').classList.remove('visible');
  const succ = document.getElementById('signupSuccess');
  succ.textContent = '✓ Store account registered safely!';
  succ.classList.add('visible');

  setTimeout(() => {
    succ.classList.remove('visible');
    enterApp(currentUser);
  }, 1200);
}

function enterApp(user) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'flex';

  document.querySelector('.user-avatar').textContent = user.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  document.querySelector('.user-name').textContent = user.name;
  document.querySelector('.user-role').textContent = user.role;

  const today = new Date();
  document.getElementById('currentDate').textContent = today.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  renderAll();
}

function handleLogout() {
  if (!confirm('Log out from active campus database portal session?')) return;
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
}
