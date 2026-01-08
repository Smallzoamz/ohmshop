/**
 * Discord Streaming Status Rental System
 * Dashboard JavaScript
 * © 2026 Bonchon-Studio
 */

// ============================================
// Global State
// ============================================
let currentUser = null;
let packages = [];
let statusConfig = null;

// ============================================
// DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await checkAuthentication();
    initTabs();
    initCharCounters();
    initImagePreviews();
});

// ============================================
// Theme Toggle (Dark/Light Mode)
// ============================================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'light';

    // Apply saved theme
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (!themeToggle) return;

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

// ============================================
// Authentication Check
// ============================================
async function checkAuthentication() {
    try {
        const response = await fetch('/api/user');

        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = '/';
            return;
        }

        currentUser = await response.json();
        renderUserProfile();
        renderSubscription();
        loadStatusConfig();
        loadTransactions();
        loadPackages();

    } catch (err) {
        console.error('Auth check failed:', err);
        window.location.href = '/';
    }
}

// ============================================
// Render User Profile
// ============================================
function renderUserProfile() {
    if (!currentUser) return;

    const avatarUrl = currentUser.avatar
        ? `https://cdn.discordapp.com/avatars/${currentUser.discord_id}/${currentUser.avatar}.png?size=128`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&size=128&background=5865F2&color=fff`;

    // Header user menu
    document.getElementById('userAvatar').src = avatarUrl;
    document.getElementById('userName').textContent = currentUser.global_name || currentUser.username;

    // Profile card
    document.getElementById('profileAvatar').src = avatarUrl;
    document.getElementById('profileName').textContent = currentUser.global_name || currentUser.username;
    document.getElementById('profileDiscord').textContent = `@${currentUser.username}`;
    document.getElementById('userBalance').textContent = currentUser.balance.toLocaleString('th-TH');

    // Show Admin Panel button if user is admin
    const adminBtn = document.getElementById('adminPanelBtn');
    if (adminBtn && currentUser.is_admin) {
        adminBtn.classList.remove('hidden');
    }
}

// ============================================
// Render Subscription
// ============================================
function renderSubscription() {
    const noSub = document.getElementById('noSubscription');
    const activeSub = document.getElementById('activeSubscription');
    const profileExpiry = document.getElementById('profileExpiry');
    const profileExpiryDate = document.getElementById('profileExpiryDate');
    const profileExpiryRemaining = document.getElementById('profileExpiryRemaining');

    if (!currentUser.subscription) {
        noSub.classList.remove('hidden');
        activeSub.classList.add('hidden');

        // Update profile expiry display (no subscription)
        if (profileExpiryDate) profileExpiryDate.textContent = '-';
        if (profileExpiryRemaining) {
            profileExpiryRemaining.textContent = 'ยังไม่มีแพ็คเกจ';
            profileExpiryRemaining.classList.remove('active', 'expired');
        }
        return;
    }

    noSub.classList.add('hidden');
    activeSub.classList.remove('hidden');

    const sub = currentUser.subscription;
    document.getElementById('subBadge').textContent = sub.badge || '📦';
    document.getElementById('subName').textContent = sub.package_name;

    // Calculate days left
    const endDate = new Date(sub.end_date);
    const now = new Date();
    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    const isExpired = daysLeft < 0;

    const formattedDate = endDate.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    document.getElementById('subExpiry').textContent = formattedDate;
    document.getElementById('subDaysLeft').textContent = isExpired ? 'หมดอายุแล้ว' : `${daysLeft} วัน`;

    // Update profile expiry display (in profile card)
    if (profileExpiryDate) profileExpiryDate.textContent = formattedDate;
    if (profileExpiryRemaining) {
        if (isExpired) {
            profileExpiryRemaining.textContent = '❌ หมดอายุแล้ว';
            profileExpiryRemaining.classList.remove('active');
            profileExpiryRemaining.classList.add('expired');
        } else {
            profileExpiryRemaining.textContent = `✅ เหลือ ${daysLeft} วัน`;
            profileExpiryRemaining.classList.remove('expired');
            profileExpiryRemaining.classList.add('active');
        }
    }
}

// ============================================
// Load Status Config
// ============================================
async function loadStatusConfig() {
    try {
        const response = await fetch('/api/status-config');
        if (!response.ok) throw new Error('Failed to load status config');

        statusConfig = await response.json();

        // Populate form fields
        document.getElementById('page1_text1').value = statusConfig.page1_text1 || '';
        document.getElementById('page1_text2').value = statusConfig.page1_text2 || '';
        document.getElementById('page1_text3').value = statusConfig.page1_text3 || '';
        document.getElementById('page1_image').value = statusConfig.page1_image || '';

        document.getElementById('page2_text1').value = statusConfig.page2_text1 || '';
        document.getElementById('page2_text2').value = statusConfig.page2_text2 || '';
        document.getElementById('page2_text3').value = statusConfig.page2_text3 || '';
        document.getElementById('page2_image').value = statusConfig.page2_image || '';

        document.getElementById('statusEnabled').checked = statusConfig.is_enabled === 1;

        // Update char counters
        updateAllCharCounters();

        // Update image previews
        updateImagePreview('page1');
        updateImagePreview('page2');

        // Update token status display
        loadTokenStatus();

    } catch (err) {
        console.error('Error loading status config:', err);
    }
}

// ============================================
// Save Status Config
// ============================================
async function saveStatusConfig() {
    const btn = document.getElementById('saveStatusBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ กำลังบันทึก...';

    try {
        const config = {
            page1_text1: document.getElementById('page1_text1').value,
            page1_text2: document.getElementById('page1_text2').value,
            page1_text3: document.getElementById('page1_text3').value,
            page1_image: document.getElementById('page1_image').value,
            page2_text1: document.getElementById('page2_text1').value,
            page2_text2: document.getElementById('page2_text2').value,
            page2_text3: document.getElementById('page2_text3').value,
            page2_image: document.getElementById('page2_image').value,
            is_enabled: document.getElementById('statusEnabled').checked ? 1 : 0
        };

        const response = await fetch('/api/status-config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (!response.ok) throw new Error('Failed to save');

        showToast('บันทึกสำเร็จ!', 'success');

    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 บันทึกการตั้งค่า';
    }
}

// ============================================
// Load Transactions
// ============================================
async function loadTransactions() {
    try {
        const response = await fetch('/api/transactions');
        if (!response.ok) throw new Error('Failed to load transactions');

        const transactions = await response.json();
        renderTransactions(transactions);

    } catch (err) {
        console.error('Error loading transactions:', err);
    }
}

// ============================================
// Render Transactions
// ============================================
function renderTransactions(transactions) {
    const tbody = document.getElementById('transactionsBody');

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">ไม่มีข้อมูล</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(tx => {
        const date = new Date(tx.created_at).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const amountClass = tx.amount >= 0 ? 'amount-positive' : 'amount-negative';
        const amountPrefix = tx.amount >= 0 ? '+' : '';

        return `
            <tr>
                <td>${date}</td>
                <td>${tx.description || tx.type}</td>
                <td class="${amountClass}">${amountPrefix}฿${Math.abs(tx.amount).toLocaleString('th-TH')}</td>
                <td>฿${tx.balance_after?.toLocaleString('th-TH') || '-'}</td>
            </tr>
        `;
    }).join('');
}

// ============================================
// Load Packages
// ============================================
async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        if (!response.ok) throw new Error('Failed to load packages');

        packages = await response.json();

    } catch (err) {
        console.error('Error loading packages:', err);
    }
}

// ============================================
// Show Package Modal
// ============================================
function showPackageModal() {
    const modal = document.getElementById('packageModal');
    const list = document.getElementById('packageList');

    list.innerHTML = packages.map(pkg => `
        <div class="package-item" onclick="purchasePackage(${pkg.id})">
            <div class="package-item-badge">${pkg.badge || '📦'}</div>
            <div class="package-item-info">
                <div class="package-item-name">${pkg.name}</div>
                <div class="package-item-duration">${pkg.duration_days} วัน</div>
            </div>
            <div class="package-item-price">฿${pkg.price}</div>
        </div>
    `).join('');

    modal.classList.add('active');
}

// ============================================
// Close Package Modal
// ============================================
function closePackageModal() {
    document.getElementById('packageModal').classList.remove('active');
}

// ============================================
// Purchase Package
// ============================================
async function purchasePackage(packageId) {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    if (currentUser.balance < pkg.price) {
        showToast(`ยอดเงินไม่พอ ต้องการ ฿${pkg.price} แต่มี ฿${currentUser.balance}`, 'error');
        return;
    }

    if (!confirm(`ยืนยันซื้อแพ็คเกจ ${pkg.name} (${pkg.duration_days} วัน) ราคา ฿${pkg.price}?`)) {
        return;
    }

    try {
        const response = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packageId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to purchase');
        }

        showToast(`ซื้อสำเร็จ! ${result.message}`, 'success');
        closePackageModal();

        // Update user data
        currentUser.balance = result.newBalance;
        currentUser.subscription = result.subscription;
        renderUserProfile();
        renderSubscription();
        loadTransactions();

    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

// ============================================
// Tabs
// ============================================
function initTabs() {
    const tabs = document.querySelectorAll('.status-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tab;

            // Update tab states
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update page states
            document.querySelectorAll('.status-page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// ============================================
// Character Counters
// ============================================
function initCharCounters() {
    const inputs = ['page1_text1', 'page1_text2', 'page1_text3', 'page2_text1', 'page2_text2', 'page2_text3'];

    inputs.forEach(id => {
        const input = document.getElementById(id);
        const counter = document.getElementById(`${id}_count`);

        if (input && counter) {
            input.addEventListener('input', () => {
                counter.textContent = input.value.length;
            });
        }
    });
}

function updateAllCharCounters() {
    const inputs = ['page1_text1', 'page1_text2', 'page1_text3', 'page2_text1', 'page2_text2', 'page2_text3'];

    inputs.forEach(id => {
        const input = document.getElementById(id);
        const counter = document.getElementById(`${id}_count`);

        if (input && counter) {
            counter.textContent = input.value.length;
        }
    });
}

// ============================================
// Image Previews
// ============================================
function initImagePreviews() {
    ['page1', 'page2'].forEach(page => {
        const input = document.getElementById(`${page}_image`);

        if (input) {
            input.addEventListener('input', () => {
                updateImagePreview(page);
            });
        }
    });
}

function updateImagePreview(page) {
    const input = document.getElementById(`${page}_image`);
    const preview = document.getElementById(`${page}_preview`);

    if (!input || !preview) return;

    const url = input.value.trim();

    if (url) {
        preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'no-image\\'>❌ ไม่สามารถโหลดรูปภาพได้</span>'">`;
    } else {
        preview.innerHTML = '<span class="no-image">📷 ยังไม่มีรูปภาพ</span>';
    }
}

// ============================================
// Token Management
// ============================================
function showTokenHelpModal() {
    document.getElementById('tokenHelpModal').classList.add('active');
}

function closeTokenHelpModal() {
    document.getElementById('tokenHelpModal').classList.remove('active');
}

function toggleTokenVisibility() {
    const input = document.getElementById('discordToken');
    const btn = document.querySelector('.toggle-token-btn');

    if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
    } else {
        input.type = 'password';
        btn.textContent = '👁️';
    }
}

async function saveToken() {
    const tokenInput = document.getElementById('discordToken');
    const token = tokenInput.value.trim();

    if (!token) {
        showToast('กรุณากรอก Token ก่อน', 'warning');
        return;
    }

    // Basic token validation
    if (!token.includes('.') || token.length < 50) {
        showToast('รูปแบบ Token ไม่ถูกต้อง', 'error');
        return;
    }

    try {
        const response = await fetch('/api/discord-token', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save token');
        }

        showToast('บันทึก Token สำเร็จ!', 'success');
        updateTokenStatus(true);

    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
}

function updateTokenStatus(hasToken) {
    const statusEl = document.getElementById('tokenStatus');

    if (hasToken) {
        statusEl.innerHTML = '<span class="token-set">✅ Token ถูกตั้งค่าแล้ว</span>';
    } else {
        statusEl.innerHTML = '<span class="token-not-set">⚠️ ยังไม่ได้ตั้งค่า Token</span>';
    }
}

function loadTokenStatus() {
    // Check if user has token set (based on statusConfig or dedicated field)
    if (currentUser && currentUser.statusConfig && currentUser.statusConfig.discord_token) {
        updateTokenStatus(true);
        // Show masked token
        document.getElementById('discordToken').placeholder = '••••••••••••••••••••';
    } else if (statusConfig && statusConfig.discord_token) {
        updateTokenStatus(true);
        document.getElementById('discordToken').placeholder = '••••••••••••••••••••';
    }
}

// ============================================
// Logout
// ============================================
function logout() {
    window.location.href = '/auth/logout';
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// Topup Modal
// ============================================
let selectedSlipFile = null;

function showTopupModal() {
    const modal = document.getElementById('topupModal');
    modal.classList.add('active');

    // Generate QR Code using PromptPay API
    generatePromptPayQR();

    // Reset to step 1
    resetTopupModal();
}

function closeTopupModal() {
    document.getElementById('topupModal').classList.remove('active');
    resetTopupModal();
}

function resetTopupModal() {
    document.getElementById('topupStep1').classList.remove('hidden');
    document.getElementById('topupStep2').classList.add('hidden');
    document.getElementById('topupStep3').classList.add('hidden');
    document.getElementById('topupAmount').value = '';
    document.getElementById('slipInput').value = '';
    document.getElementById('slipPreview').classList.add('hidden');
    document.getElementById('dropzoneContent').classList.remove('hidden');
    document.getElementById('submitTopupBtn').disabled = true;
    selectedSlipFile = null;
}

function generatePromptPayQR() {
    // Use PromptPay QR API (promptpay.io)
    const phoneNumber = '0631475942';
    const qrUrl = `https://promptpay.io/${phoneNumber}.png`;
    document.getElementById('promptpayQR').src = qrUrl;
}

function setTopupAmount(amount) {
    document.getElementById('topupAmount').value = amount;
}

function goToStep2() {
    const amount = document.getElementById('topupAmount').value;

    if (!amount || amount < 10) {
        showToast('กรุณากรอกจำนวนเงินอย่างน้อย 10 บาท', 'warning');
        return;
    }

    document.getElementById('confirmAmount').textContent = `฿${parseInt(amount).toLocaleString()}`;
    document.getElementById('topupStep1').classList.add('hidden');
    document.getElementById('topupStep2').classList.remove('hidden');
}

function goToStep1() {
    document.getElementById('topupStep2').classList.add('hidden');
    document.getElementById('topupStep1').classList.remove('hidden');
}

// Slip Upload Handling
function handleSlipSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processSlipFile(file);
    }
}

function processSlipFile(file) {
    // Validate file
    if (!file.type.startsWith('image/')) {
        showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)', 'error');
        return;
    }

    selectedSlipFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('slipPreviewImg').src = e.target.result;
        document.getElementById('dropzoneContent').classList.add('hidden');
        document.getElementById('slipPreview').classList.remove('hidden');
        document.getElementById('submitTopupBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}

function removeSlip(event) {
    event.stopPropagation();
    selectedSlipFile = null;
    document.getElementById('slipInput').value = '';
    document.getElementById('slipPreview').classList.add('hidden');
    document.getElementById('dropzoneContent').classList.remove('hidden');
    document.getElementById('submitTopupBtn').disabled = true;
}

// Drag and Drop
document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('slipDropzone');
    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                processSlipFile(file);
            }
        });
    }
});

// Submit Topup
async function submitTopup() {
    const amount = document.getElementById('topupAmount').value;

    if (!selectedSlipFile) {
        showToast('กรุณาแนบสลิปการโอนเงิน', 'error');
        return;
    }

    const btn = document.getElementById('submitTopupBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ กำลังส่ง...';

    try {
        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('slip', selectedSlipFile);

        const response = await fetch('/api/topup/request', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'ส่งสลิปไม่สำเร็จ');
        }

        // Show success
        document.getElementById('topupStep2').classList.add('hidden');
        document.getElementById('topupStep3').classList.remove('hidden');

    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '📤 ส่งสลิป';
    }
}

// ============================================
// Copy to Clipboard
// ============================================
function copyToClipboard(text) {
    if (!text) return;

    // Copy text
    navigator.clipboard.writeText(text).then(() => {
        showToast(`คัดลอก "${text}" แล้ว!`, 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(`คัดลอก "${text}" แล้ว!`, 'success');
        } catch (e) {
            showToast('ไม่สามารถคัดลอกได้', 'error');
        }
        document.body.removeChild(textArea);
    });
}

// ==========================================
// REAL-TIME TOPUP WATCHER
// ==========================================
let topupPollInterval;
let lastPendingIds = new Set();

function startTopupWatcher() {
    if (topupPollInterval) clearInterval(topupPollInterval);

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/topup/pending');
            if (res.status === 401) return; // Not logged in
            const topups = await res.json();

            // Filter only pending ones from server to track
            const currentPending = topups.filter(t => t.source === 'website_pending');

            // Check for completed ones (Approved/Rejected)
            // Strategy: We track IDs that WERE pending. If they change status in the fetch list, we notify.

            // 1. Convert current list to Map for easy lookup
            const currentMap = new Map(topups.map(t => [t.id, t.source]));

            // 2. Check tracked IDs
            lastPendingIds.forEach(id => {
                const newStatus = currentMap.get(id);

                if (newStatus === 'approved') {
                    showToast('✅ เติมเงินสำเร็จ! ยอดเงินเข้าแล้ว', 'success');
                    lastPendingIds.delete(id);
                    // Refresh Profile to show new balance
                    checkAuthentication();
                } else if (newStatus === 'rejected') {
                    showToast('❌ การเติมเงินถูกปฏิเสธ', 'error');
                    lastPendingIds.delete(id);
                }
            });

            // 3. Add new pending items to track
            currentPending.forEach(t => lastPendingIds.add(t.id));

        } catch (e) {
            console.log('Poll error', e);
        }
    };

    // Initial check
    checkStatus();

    // Poll every 5 seconds
    topupPollInterval = setInterval(checkStatus, 5000);
}

// Start watcher when dashboard loads
// Note: We already call this in checkAuthentication logic if we wanted, 
// but since we append at bottom, we can just hook into existing DOMContentLoaded if currentUser is set,
// OR since checkAuthentication calls everything, we can just let it run if we add the call there.
// However, editing checkAuthentication is invasive (top of file).
// Let's use a separate DOMContentLoaded hook that checks if currentUser exists (set by checkAuth).
// Or better: Override checkAuthentication? No.
// Let's just run it. The function 'startTopupWatcher' handles auth check inside fetch 401.
// But better to only start if on dashboard.
if (document.getElementById('userBalance')) {
    startTopupWatcher();
}

