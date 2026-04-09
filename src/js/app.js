// Stores the default sample data used when no saved data exists yet
const DB_DEFAULT = {
    expenses: [
        { id: 1, category: 'Fertilizer', amount: 1200, date: '2026-04-03', note: '' },
        { id: 2, category: 'Labor', amount: 800, date: '2026-04-05', note: 'Planting crew (4 workers)' },
        { id: 3, category: 'Seeds', amount: 500, date: '2026-04-01', note: 'Rice seeds (2 sacks)' },
        { id: 4, category: 'Pesticide', amount: 350, date: '2026-04-06', note: '' },
    ],
    harvests: [
        { id: 1, crop: 'Rice', qty: 150, unit: 'kg', date: '2026-04-02', note: '' },
        { id: 2, crop: 'Corn', qty: 80, unit: 'kg', date: '2026-04-04', note: 'First batch' },
        { id: 3, crop: 'Tomato', qty: 25, unit: 'kg', date: '2026-04-06', note: '' },
    ],
    prices: [
        { id: 1, crop: 'Rice', amount: 42, unit: 'kg', source: 'Local Market', date: '2026-04-06' },
        { id: 2, crop: 'Tomato', amount: 60, unit: 'kg', source: 'Local Market', date: '2026-04-06' },
        { id: 3, crop: 'Corn', amount: 25, unit: 'kg', source: 'Town Market', date: '2026-04-05' },
    ],
    nextId: { expenses: 5, harvests: 4, prices: 4 },
};
// NOTE: sample data only loads the FIRST time (when localStorage is empty).
// After that, localStorage takes over and the sample data is ignored.

// Loads saved data from localStorage, or uses default data if none exists
function loadDB() {
    try {
        const saved = localStorage.getItem('farmledger_db');
        return saved ? JSON.parse(saved) : structuredClone(DB_DEFAULT);
    } catch {
        return structuredClone(DB_DEFAULT);
    }
}

// Saves the current database object to localStorage
function saveDB() {
    localStorage.setItem('farmledger_db', JSON.stringify(db));
}

const db = loadDB();

let currentPage = 'home';
let prevPage = 'home';
let currentTab = 'expenses';

let toastTimer = null;

// Displays a short toast message for user feedback
function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

const MAIN_PAGES = ['home', 'records', 'summary'];

// Changes the visible page and refreshes its contents
function goPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + id).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (MAIN_PAGES.includes(id)) {
        document.getElementById('nav-' + id)?.classList.add('active');
        /// Maintains navigation history for back button functionality
        prevPage = currentPage;
        currentPage = id;
    }

    if (id === 'home') renderDashboard();
    /// Ensures correct page content is rendered when switching pages
    if (id === 'records') { renderRecords(); switchTab(currentTab || 'expenses'); }
    if (id === 'summary') renderSummary();
}

// Returns to the previously opened main page
function goBack() {
    goPage(prevPage || 'home');
}

// Opens the selected form page and resets its fields
function showForm(type) {
    prevPage = currentPage;
    const today = new Date().toISOString().split('T')[0];
    resetForm(type, today);

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + type).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

// Enables chip selection for categories and units
function initChips(groupId) {
    document.getElementById(groupId).querySelectorAll('.chip, .unit-chip').forEach(chip => {
        /// Ensures only one chip is selected at a time
        chip.addEventListener('click', function () {
            document.getElementById(groupId).querySelectorAll('.chip, .unit-chip')
                .forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

// Gets the currently selected chip value
function getChip(groupId) {
    const selected = document.getElementById(groupId).querySelector('.chip.selected, .unit-chip.selected');
    return selected ? selected.dataset.val : '';
}

// Sets the selected chip based on a given value
function setChip(groupId, val) {
    document.getElementById(groupId).querySelectorAll('.chip, .unit-chip')
        .forEach(c => c.classList.toggle('selected', c.dataset.val === val));
}

// Shows the text input when the user selects "Other" as crop
function handleCropOther(selectId, inputId) {
    /// Toggles input field when 'Other' option is selected
    const isOther = document.getElementById(selectId).value === 'Other';
    const inp = document.getElementById(inputId);
    inp.classList.toggle('visible', isOther);
    if (!isOther) inp.value = '';
}

// Returns the crop value from the dropdown or custom input
function getCropVal(selectId, inputId) {
    const sel = document.getElementById(selectId);
    /// Uses custom input if 'Other' is selected, otherwise uses dropdown value
    return sel.value === 'Other'
        ? document.getElementById(inputId).value.trim()
        : sel.value;
}

// Resets form fields when adding a new record or after saving
function resetForm(type, date = '') {
    if (type === 'expense') {
        document.getElementById('expense-edit-id').value = '';
        document.getElementById('exp-amount').value = '';
        document.getElementById('exp-note').value = '';
        document.getElementById('exp-date').value = date;
        document.getElementById('expense-form-title').textContent = 'Add Expense';
        document.getElementById('expense-save-btn').textContent = 'Save Expense';
        document.getElementById('exp-category-group')
            .querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));

    } else if (type === 'harvest') {
        document.getElementById('harvest-edit-id').value = '';
        document.getElementById('hrv-qty').value = '';
        document.getElementById('hrv-note').value = '';
        document.getElementById('hrv-date').value = date;
        document.getElementById('hrv-crop').value = '';
        document.getElementById('harvest-form-title').textContent = 'Add Harvest';
        document.getElementById('harvest-save-btn').textContent = 'Save Harvest';
        document.getElementById('hrv-crop-other').value = '';
        document.getElementById('hrv-crop-other').classList.remove('visible');
        setChip('hrv-unit-group', 'kg');

    } else if (type === 'price') {
        document.getElementById('price-edit-id').value = '';
        document.getElementById('prc-amount').value = '';
        document.getElementById('prc-source').value = '';
        document.getElementById('prc-date').value = date;
        document.getElementById('prc-crop').value = '';
        document.getElementById('price-form-title').textContent = 'Add Price';
        document.getElementById('price-save-btn').textContent = 'Save Price';
        document.getElementById('prc-crop-other').value = '';
        document.getElementById('prc-crop-other').classList.remove('visible');
        setChip('prc-unit-group', 'kg');
    }
}

// Validates and saves an expense record
function saveExpense() {
    const amount = parseFloat(document.getElementById('exp-amount').value);
    const category = getChip('exp-category-group');
    const date = document.getElementById('exp-date').value;
    const note = document.getElementById('exp-note').value.trim();
    const editId = document.getElementById('expense-edit-id').value;
    const isEdit = !!editId;

    /// Prevents saving invalid inputs (empty, zero, or negative values)
    if (!amount || amount <= 0 || !category || !date) { alert('Please fill in all required fields.'); return; }

    /// Updates existing record instead of creating duplicate
    if (editId) {
        const i = db.expenses.findIndex(e => e.id == editId);
        if (i > -1) db.expenses[i] = { id: +editId, category, amount, date, note };
    } else {
        /// Adds new record and increments ID counter
        db.expenses.push({ id: db.nextId.expenses++, category, amount, date, note });
    }
    saveDB();
    showToast(isEdit ? 'Expense updated.' : 'Expense saved.');
    goPage('records');
}

// Validates and saves a harvest record
function saveHarvest() {
    const crop = getCropVal('hrv-crop', 'hrv-crop-other');
    const qty = parseFloat(document.getElementById('hrv-qty').value);
    const unit = getChip('hrv-unit-group') || 'kg';
    const date = document.getElementById('hrv-date').value;
    const note = document.getElementById('hrv-note').value.trim();
    const editId = document.getElementById('harvest-edit-id').value;
    /// Determines whether the operation is edit or new record
    const isEdit = !!editId;

    if (!crop || !qty || qty <= 0 || !date) { alert('Please fill in all required fields.'); return; }

    if (editId) {
        const i = db.harvests.findIndex(h => h.id == editId);
        if (i > -1) db.harvests[i] = { id: +editId, crop, qty, unit, date, note };
    } else {
        db.harvests.push({ id: db.nextId.harvests++, crop, qty, unit, date, note });
    }
    saveDB();
    showToast(isEdit ? 'Harvest updated.' : 'Harvest saved.');
    goPage('records');
}

// Validates and saves a price record
function savePrice() {
    const crop = getCropVal('prc-crop', 'prc-crop-other');
    const amount = parseFloat(document.getElementById('prc-amount').value);
    const unit = getChip('prc-unit-group') || 'kg';
    const source = document.getElementById('prc-source').value.trim();
    const date = document.getElementById('prc-date').value;
    const editId = document.getElementById('price-edit-id').value;
    const isEdit = !!editId;

    if (!crop || !amount || amount <= 0 || !date) { alert('Please fill in all required fields.'); return; }

    if (editId) {
        const i = db.prices.findIndex(p => p.id == editId);
        if (i > -1) db.prices[i] = { id: +editId, crop, amount, unit, source, date };
    } else {
        db.prices.push({ id: db.nextId.prices++, crop, amount, unit, source, date });
    }
    saveDB();
    showToast(isEdit ? 'Price updated.' : 'Price saved.');
    goPage('records');
}


// Opens the selected record in edit mode
function openEditPage(type) {
    prevPage = 'records';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + type).classList.add('active');
}

// Sets the crop dropdown value when editing a record
function setCropSelect(selectId, inputId, value) {
    const sel = document.getElementById(selectId);
    const inp = document.getElementById(inputId);
    const exists = [...sel.options].some(o => o.value === value);
    if (exists) {
        sel.value = value;
        inp.classList.remove('visible');
    } else {
        sel.value = 'Other';
        inp.value = value;
        inp.classList.add('visible');
    }
}

// Loads an existing expense into the expense form for editing
function editExpense(id) {
    const rec = db.expenses.find(e => e.id === id);
    if (!rec) return;
    resetForm('expense');
    document.getElementById('expense-edit-id').value = id;
    document.getElementById('exp-amount').value = rec.amount;
    document.getElementById('exp-date').value = rec.date;
    document.getElementById('exp-note').value = rec.note || '';
    document.getElementById('expense-form-title').textContent = 'Edit Expense';
    document.getElementById('expense-save-btn').textContent = 'Update Expense';
    setChip('exp-category-group', rec.category);
    openEditPage('expense');
}

// Loads an existing harvest into the harvest form for editing
function editHarvest(id) {
    const rec = db.harvests.find(h => h.id === id);
    if (!rec) return;
    resetForm('harvest');
    document.getElementById('harvest-edit-id').value = id;
    document.getElementById('hrv-qty').value = rec.qty;
    document.getElementById('hrv-date').value = rec.date;
    document.getElementById('hrv-note').value = rec.note || '';
    document.getElementById('harvest-form-title').textContent = 'Edit Harvest';
    document.getElementById('harvest-save-btn').textContent = 'Update Harvest';
    setCropSelect('hrv-crop', 'hrv-crop-other', rec.crop);
    setChip('hrv-unit-group', rec.unit);
    openEditPage('harvest');
}

// Loads an existing price entry into the price form for editing
function editPrice(id) {
    const rec = db.prices.find(p => p.id === id);
    if (!rec) return;
    resetForm('price');
    document.getElementById('price-edit-id').value = id;
    document.getElementById('prc-amount').value = rec.amount;
    document.getElementById('prc-source').value = rec.source || '';
    document.getElementById('prc-date').value = rec.date;
    document.getElementById('price-form-title').textContent = 'Edit Price';
    document.getElementById('price-save-btn').textContent = 'Update Price';
    setCropSelect('prc-crop', 'prc-crop-other', rec.crop);
    setChip('prc-unit-group', rec.unit);
    openEditPage('price');
}

// Deletes a selected record after user confirmation
function deleteRecord(type, id) {
    const label = { expense: 'expense', harvest: 'harvest record', price: 'price entry' }[type];

    /// Removes record permanently after user confirmation
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;

    if (type === 'expense') db.expenses = db.expenses.filter(e => e.id !== id);
    if (type === 'harvest') db.harvests = db.harvests.filter(h => h.id !== id);
    if (type === 'price') db.prices = db.prices.filter(p => p.id !== id);

    saveDB();

    renderRecords();
    renderDashboard();
    renderSummary();
    showToast('Record deleted.');
}

// Formats a date into a readable form
function fmtDate(d) {
    return new Date(d + 'T00:00:00')
        .toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Formats a number into Philippine peso currency
function peso(n) {
    return '₱' + Number(n).toLocaleString();
}

// Sorts records by date from newest to oldest
function sortedDesc(arr) {
    return [...arr].sort((a, b) => b.date.localeCompare(a.date));
}

// Builds a map of the latest saved price for each crop
function buildLatestPriceMap() {
    const map = {};
    sortedDesc(db.prices).forEach(p => { if (!map[p.crop]) map[p.crop] = p; });
    return map;
}

// Updates the dashboard cards and recent activity list
function renderDashboard() {
    document.getElementById('header-date').textContent =
        new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const totalExp = db.expenses.reduce((s, e) => s + e.amount, 0);
    const totalHrv = db.harvests.reduce((s, h) => s + h.qty, 0);
    const uniqueCrops = new Set(db.harvests.map(h => h.crop)).size;

    const latestPrice = buildLatestPriceMap();
    const harvestVal = db.harvests.reduce((s, h) =>
        s + (latestPrice[h.crop] ? h.qty * latestPrice[h.crop].amount : 0), 0);

    document.getElementById('g-expenses').textContent = peso(totalExp);
    document.getElementById('g-exp-count').textContent = `${db.expenses.length} records`;
    document.getElementById('g-harvest').textContent = `${totalHrv} units`;
    document.getElementById('g-hrv-count').textContent = `${uniqueCrops} crop${uniqueCrops !== 1 ? 's' : ''}`;
    document.getElementById('g-prices').textContent = `${db.prices.length} saved`;
    document.getElementById('g-profit').textContent = peso(harvestVal - totalExp);

    renderActivityList();
}

// Displays the most recent saved records on the dashboard
function renderActivityList() {
    const all = [
        ...db.expenses.map(e => ({ ...e, type: 'expense', sortDate: e.date })),
        ...db.harvests.map(h => ({ ...h, type: 'harvest', sortDate: h.date })),
        ...db.prices.map(p => ({ ...p, type: 'price', sortDate: p.date })),
    ].sort((a, b) => b.sortDate.localeCompare(a.sortDate)).slice(0, 6);

    const el = document.getElementById('activity-list');
    if (!all.length) {
        el.innerHTML = `
          <div class="empty-state">
            <span class="emoji">🌱</span>
            No activity yet.<br>
            <span style="font-size:.8rem;margin-top:4px;display:block">
              Tap <strong>Add Expense</strong>, <strong>Add Harvest</strong>,
              or <strong>Add Price</strong> to get started.
            </span>
          </div>`;
        return;
    }
    el.innerHTML = all.map(activityItemHTML).join('');
}

function activityItemHTML(r) {
    if (r.type === 'expense') return `
    <div class="activity-item">
      <div class="activity-icon expense">🔴</div>
      <div class="activity-info">
        <div class="activity-name">${r.category}</div>
        <div class="activity-meta">${fmtDate(r.date)} · Expense</div>
      </div>
      <div class="activity-val expense">${peso(r.amount)}</div>
    </div>`;
    if (r.type === 'harvest') return `
    <div class="activity-item">
      <div class="activity-icon harvest">🌾</div>
      <div class="activity-info">
        <div class="activity-name">${r.crop}</div>
        <div class="activity-meta">${fmtDate(r.date)} · Harvest</div>
      </div>
      <div class="activity-val harvest">${r.qty} ${r.unit}</div>
    </div>`;
    return `
    <div class="activity-item">
      <div class="activity-icon price">🏷️</div>
      <div class="activity-info">
        <div class="activity-name">${r.crop}</div>
        <div class="activity-meta">${fmtDate(r.date)} · Price</div>
      </div>
      <div class="activity-val price">${peso(r.amount)}/${r.unit}</div>
    </div>`;
}

// Displays all saved expense, harvest, and price records
function renderRecords() {
    document.getElementById('cnt-exp').textContent = db.expenses.length;
    document.getElementById('cnt-hrv').textContent = db.harvests.length;
    document.getElementById('cnt-prc').textContent = db.prices.length;

    const emptyMessages = {
        expenses: { emoji: '💸', text: 'No expenses recorded yet.', hint: 'Tap Add Expense to log your farm costs.' },
        harvests: { emoji: '🌾', text: 'No harvests recorded yet.', hint: 'Tap Add Harvest to log a crop batch.' },
        prices: { emoji: '🏷️', text: 'No market prices saved yet.', hint: 'Tap Add Price to track local rates.' },
    };
    const empty = label => {
        const m = emptyMessages[label];
        return `
      <div class="empty-state">
        <span class="emoji">${m.emoji}</span>
        ${m.text}<br>
        <span style="font-size:.78rem;margin-top:4px;display:block;color:var(--muted-2)">${m.hint}</span>
      </div>`;
    };


    document.getElementById('records-expenses').innerHTML =
        db.expenses.length ? sortedDesc(db.expenses).map(r => recordCardHTML('expense', r)).join('') : empty('expenses');
    document.getElementById('records-harvests').innerHTML =
        db.harvests.length ? sortedDesc(db.harvests).map(r => recordCardHTML('harvest', r)).join('') : empty('harvests');
    document.getElementById('records-prices').innerHTML =
        db.prices.length ? sortedDesc(db.prices).map(r => recordCardHTML('price', r)).join('') : empty('prices');
}

function recordCardHTML(type, rec) {
    const actions = {
        expense: `<button class="btn-edit" onclick="editExpense(${rec.id})">✏️ Edit</button>
              <button class="btn-delete" onclick="deleteRecord('expense',${rec.id})">🗑 Delete</button>`,
        harvest: `<button class="btn-edit" onclick="editHarvest(${rec.id})">✏️ Edit</button>
              <button class="btn-delete" onclick="deleteRecord('harvest',${rec.id})">🗑 Delete</button>`,
        price: `<button class="btn-edit" onclick="editPrice(${rec.id})">✏️ Edit</button>
              <button class="btn-delete" onclick="deleteRecord('price',${rec.id})">🗑 Delete</button>`,
    };

    const icon = { expense: '🔴', harvest: '🌾', price: '🏷️' }[type];
    const note = rec.note ? `<div class="record-note">"${rec.note}"</div>` : '';

    let name, meta, amount;
    if (type === 'expense') {
        name = rec.category;
        meta = fmtDate(rec.date);
        amount = `<div class="record-amount expense">${peso(rec.amount)}</div>`;
    } else if (type === 'harvest') {
        name = rec.crop;
        meta = fmtDate(rec.date);
        amount = `<div class="record-amount harvest">${rec.qty} ${rec.unit}</div>`;
    } else {
        name = rec.crop;
        meta = fmtDate(rec.date) + (rec.source ? ` · ${rec.source}` : '');
        amount = `<div class="record-amount price">${peso(rec.amount)}/${rec.unit}</div>`;
    }

    return `
    <div class="record-card ${type}">
      <div class="record-main">
        <span class="record-icon">${icon}</span>
        <div class="record-info">
          <div class="record-name">${name}</div>
          <div class="record-meta">${meta}</div>
          ${note}
        </div>
        ${amount}
      </div>
      <div class="record-divider"></div>
      <div class="record-actions">${actions[type]}</div>
    </div>`;
}

// Switches between the Expenses, Harvests, and Prices tabs
function switchTab(tab) {
    currentTab = tab;
    ['expenses', 'harvests', 'prices'].forEach(t => {
        document.getElementById('tab-' + t).classList.toggle('active', t === tab);
        document.getElementById('records-' + t).style.display = t === tab ? 'block' : 'none';
    });
}

// Calculates and displays totals, breakdowns, and estimated profit
function renderSummary() {
    const totalExp = db.expenses.reduce((s, e) => s + e.amount, 0);
    const latestPrice = buildLatestPriceMap();

    const byCat = {};
    db.expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

    document.getElementById('s-expenses').textContent = peso(totalExp);
    document.getElementById('s-exp-desc').textContent =
        `Total money spent across ${db.expenses.length} record${db.expenses.length !== 1 ? 's' : ''}.`;
    document.getElementById('s-exp-breakdown').innerHTML =
        Object.entries(byCat).sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `<div class="breakdown-row"><span>${k}</span><span class="exp-val">${peso(v)}</span></div>`)
            .join('') || '<p class="text-muted" style="font-size:.82rem">No expenses yet.</p>';


    const cropVal = {};
    db.harvests.forEach(h => {
        if (latestPrice[h.crop]) cropVal[h.crop] = (cropVal[h.crop] || 0) + h.qty * latestPrice[h.crop].amount;
    });
    const totalHrvVal = Object.values(cropVal).reduce((s, v) => s + v, 0);

    document.getElementById('s-harvest-val').textContent = peso(totalHrvVal);
    document.getElementById('s-hrv-breakdown').innerHTML =
        Object.entries(cropVal).sort((a, b) => b[1] - a[1]).map(([crop, val]) => {
            const p = latestPrice[crop];
            const qty = db.harvests.filter(h => h.crop === crop).reduce((s, h) => s + h.qty, 0);
            return `
        <div class="crop-chip">
          <div>
            <div class="crop-chip-name">${crop}</div>
            <div class="crop-chip-sub">${qty} ${p.unit} × ${peso(p.amount)}/${p.unit}</div>
          </div>
          <div class="crop-chip-val">${peso(val)}</div>
        </div>`;
        }).join('') || '<p class="text-muted" style="font-size:.82rem">No harvest data or prices saved.</p>';

    const profit = totalHrvVal - totalExp;
    document.getElementById('s-profit').textContent = peso(profit);
    document.getElementById('s-profit-desc').textContent = profit >= 0
        ? 'Your estimated harvest value is higher than your expenses. You are on track for a profit.'
        : 'Your expenses currently exceed your estimated harvest value.';
    document.getElementById('pc-harvest').textContent = peso(totalHrvVal);
    document.getElementById('pc-expense').textContent = '– ' + peso(totalExp);
    document.getElementById('pc-profit').textContent = peso(profit);
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    ['exp-category-group', 'hrv-unit-group', 'prc-unit-group'].forEach(initChips);
    renderDashboard();
});