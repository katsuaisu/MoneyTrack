const CONVERSION_RATE = 58.71;

// 1. DEFAULT STATE
const defaultState = {
    wallets: [
        { name: 'Wallet', balance: 0, currency: 'PHP' },
        { name: 'GCash', balance: 0, currency: 'PHP' },
        { name: 'School Ipon', balance: 0, currency: 'PHP' },
        { name: 'Main Ipon', balance: 0, currency: 'PHP' },
        { name: 'USD Wallet', balance: 0, currency: 'USD' }
    ],
    transactions: [],
    useConversion: false
};

let state = { ...defaultState };

// DOM Elements
const totalPhpDisplay = document.getElementById('total-php');
const totalUsdDisplay = document.getElementById('total-usd');
const walletGrid = document.getElementById('wallet-cards');
const historyList = document.getElementById('history-list');
const toggle = document.getElementById('currency-toggle');
const modal = document.getElementById('modal-overlay');
const amountInput = document.getElementById('amount-input');
const addBtn = document.getElementById('add-btn');

// --- PERSISTENCE & SYNC (New Code) ---

// Save current state to Browser LocalStorage
function saveToLocal() {
    localStorage.setItem('financeDashboardState', JSON.stringify(state));
}

// Load from Browser LocalStorage
function loadFromLocal() {
    const saved = localStorage.getItem('financeDashboardState');
    if (saved) {
        state = JSON.parse(saved);
        // Sync toggle UI state
        toggle.checked = state.useConversion; 
    }
}

// Export Data (Download JSON file)
document.getElementById('backup-btn').onclick = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "finance_backup.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

// Import Data (Trigger file input)
document.getElementById('restore-btn').onclick = () => {
    document.getElementById('import-file').click();
};

// Handle File Selection
document.getElementById('import-file').onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const uploadedState = JSON.parse(e.target.result);
            // Basic validation check
            if (uploadedState.wallets && uploadedState.transactions) {
                state = uploadedState;
                saveToLocal(); // Save the imported data immediately
                renderUI();
                alert("Data restored successfully!");
            } else {
                alert("Invalid file format.");
            }
        } catch (err) {
            alert("Error reading file.");
        }
    };
    reader.readAsText(file);
    // Reset input so you can select the same file again if needed
    event.target.value = '';
};

// --- CORE LOGIC ---

function calculateTotals() {
    let phpOnly = 0;
    let usdOnly = 0;
    
    state.wallets.forEach(w => {
        if (w.currency === 'PHP') phpOnly += w.balance;
        if (w.currency === 'USD') usdOnly += w.balance;
    });

    let displayPhp = phpOnly;
    if (state.useConversion) {
        displayPhp += (usdOnly * CONVERSION_RATE);
    }

    totalPhpDisplay.innerText = `₱${displayPhp.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    totalUsdDisplay.innerText = `$${usdOnly.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

function renderUI() {
    walletGrid.innerHTML = '';
    state.wallets.forEach(w => {
        const div = document.createElement('div');
        div.className = 'card';
        const symbol = w.currency === 'PHP' ? '₱' : '$';
        div.innerHTML = `
            <span class="name">${w.name}</span>
            <span class="balance">${symbol}${w.balance.toLocaleString()}</span>
        `;
        walletGrid.appendChild(div);
    });

    historyList.innerHTML = '';
    [...state.transactions].reverse().forEach((t, index) => {
        const realIndex = state.transactions.length - 1 - index;
        const div = document.createElement('div');
        div.className = 'history-item';
        const symbol = t.currency === 'PHP' ? '₱' : '$';
        const prefix = t.type === 'income' ? '+' : '-';
        
        div.innerHTML = `
            <div class="item-left">
                <span class="note">${t.note || (t.type.charAt(0).toUpperCase() + t.type.slice(1))}</span>
                <span class="sub">${t.wallet} • ${t.date}</span>
            </div>
            <div style="display:flex; align-items:center; gap:15px;">
                <span class="amount ${t.type}">${prefix}${symbol}${t.amount.toLocaleString()}</span>
                <button onclick="deleteTransaction(${realIndex})" style="background:none; border:none; color:#FF3B30; cursor:pointer; font-size:16px;">✕</button>
            </div>
        `;
        historyList.appendChild(div);
    });

    calculateTotals();
    // Update toggle checkbox visual state in case it changed via import
    toggle.checked = state.useConversion;
}

function addTransaction() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const walletName = document.getElementById('wallet-select').value;
    const amount = parseFloat(amountInput.value);
    const note = document.getElementById('note-input').value;
    const wallet = state.wallets.find(w => w.name === walletName);
    
    if (type === 'income') wallet.balance += amount;
    else wallet.balance -= amount;

    state.transactions.push({
        type, wallet: walletName, amount, note,
        currency: wallet.currency,
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    saveToLocal(); // <--- Save after change
    closeModal();
    renderUI();
}

// Make deleteTransaction global so HTML can see it
window.deleteTransaction = function(index) {
    const t = state.transactions[index];
    const wallet = state.wallets.find(w => w.name === t.wallet);
    if (t.type === 'income') wallet.balance -= t.amount;
    else wallet.balance += t.amount;
    
    state.transactions.splice(index, 1);
    
    saveToLocal(); // <--- Save after change
    renderUI();
}

toggle.addEventListener('change', (e) => {
    state.useConversion = e.target.checked;
    saveToLocal(); // <--- Save setting
    calculateTotals();
});

document.getElementById('open-modal').onclick = () => modal.style.display = 'flex';
document.getElementById('cancel-btn').onclick = closeModal;

function closeModal() {
    modal.style.display = 'none';
    amountInput.value = '';
    document.getElementById('note-input').value = '';
}

amountInput.oninput = () => addBtn.disabled = !amountInput.value;
addBtn.onclick = addTransaction;

// INITIALIZE
loadFromLocal(); // <--- Load on startup
renderUI();