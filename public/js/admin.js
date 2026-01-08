/**
 * Discord Streaming Status Rental System
 * Admin Panel JavaScript
 * © 2026 Bonchon-Studio
 */

// ============================================
// Global State
// ============================================
let currentAdmin = null;
let currentSection = 'dashboard';

// ============================================
// DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    await checkAdminAuth();
    initNavigation();
    initSidebarToggle();
    loadDashboardStats();
});

// ============================================
// Check Admin Authentication
// ============================================
async function checkAdminAuth() {
    try {
        const response = await fetch('/api/user');

        if (!response.ok) {
            window.location.href = '/';
            return;
        }

        const user = await response.json();

        if (!user.is_admin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/dashboard.html';
            return;
        }

        currentAdmin = user;
        renderAdminInfo();

    } catch (err) {
        console.error('Auth check failed:', err);
        window.location.href = '/';
    }
}

// ============================================
// Render Admin Info
// ============================================
function renderAdminInfo() {
    const avatarUrl = currentAdmin.avatar
        ? `https://cdn.discordapp.com/avatars/${currentAdmin.discord_id}/${currentAdmin.avatar}.png?size=64`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentAdmin.username)}&size=64&background=5865F2&color=fff`;

    document.getElementById('adminAvatar').src = avatarUrl;
    document.getElementById('adminName').textContent = currentAdmin.global_name || currentAdmin.username;
}

// ============================================
// Navigation
// ============================================
function initNavigation() {
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const section = item.dataset.section;
            switchSection(section);
        });
    });
}

function switchSection(section) {
    currentSection = section;

    // Update nav items
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.admin-section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `section-${section}`);
    });

    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        users: 'Users Management',
        packages: 'Packages Management',
        subscriptions: 'Subscriptions',
        topups: 'Topup History'
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;

    // Load section data
    switch (section) {
        case 'dashboard': loadDashboardStats(); break;
        case 'users': loadUsers(); break;
        case 'packages': loadPackages(); break;
        case 'subscriptions': loadSubscriptions(); break;
        case 'topups': loadTopups(); break;
    }
}

// ============================================
// Sidebar Toggle (Mobile)
// ============================================
function initSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('visible');
    });
}

// ============================================
// Dashboard Stats
// ============================================
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Failed to load stats');

        const stats = await response.json();

        document.getElementById('statTotalUsers').textContent = stats.totalUsers.toLocaleString();
        document.getElementById('statActiveSubs').textContent = stats.activeSubscriptions.toLocaleString();
        document.getElementById('statTotalRevenue').textContent = `฿${stats.totalRevenue.toLocaleString()}`;

        // Render packages overview
        const overview = document.getElementById('packagesOverview');
        if (stats.packages && stats.packages.length > 0) {
            overview.innerHTML = `
                <div class="packages-overview-grid">
                    ${stats.packages.map(pkg => `
                        <div class="pkg-overview-item">
                            <span class="pkg-badge">${pkg.badge}</span>
                            <span class="pkg-name">${pkg.name}</span>
                            <span class="pkg-price">฿${pkg.price}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

    } catch (err) {
        showToast('Error loading stats: ' + err.message, 'error');
    }
}

// ============================================
// Users Management
// ============================================
async function loadUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Loading...</td></tr>';

    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to load users');

        const users = await response.json();

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            const avatarUrl = user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=64`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=64&background=5865F2&color=fff`;

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <img src="${avatarUrl}" alt="">
                            <div class="user-info">
                                <span class="user-name">${user.global_name || user.username}</span>
                                <span class="user-id">@${user.username}</span>
                            </div>
                        </div>
                    </td>
                    <td><code>${user.discord_id}</code></td>
                    <td>฿${user.balance.toLocaleString()}</td>
                    <td>${user.active_subs || 0}</td>
                    <td>
                        <span class="status-badge ${user.is_admin ? 'enabled' : 'disabled'}">
                            ${user.is_admin ? '✓ Admin' : 'User'}
                        </span>
                    </td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn edit" onclick="showBalanceModal(${user.id}, ${user.balance})" title="Edit Balance">💰</button>
                            <button class="action-btn admin" onclick="toggleAdmin(${user.id}, ${user.is_admin ? 0 : 1})" title="Toggle Admin">👑</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error: ${err.message}</td></tr>`;
    }
}

function showBalanceModal(userId, currentBalance) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('currentBalance').value = `฿${currentBalance.toLocaleString()}`;
    document.getElementById('newBalance').value = currentBalance;
    document.getElementById('balanceModal').classList.add('active');
}

function closeBalanceModal() {
    document.getElementById('balanceModal').classList.remove('active');
}

async function saveBalance() {
    const userId = document.getElementById('editUserId').value;
    const newBalance = parseInt(document.getElementById('newBalance').value);

    try {
        const response = await fetch(`/api/admin/users/${userId}/balance`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ balance: newBalance })
        });

        if (!response.ok) throw new Error('Failed to update balance');

        showToast('Balance updated successfully', 'success');
        closeBalanceModal();
        loadUsers();

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function toggleAdmin(userId, isAdmin) {
    if (!confirm(`Are you sure you want to ${isAdmin ? 'grant' : 'revoke'} admin privileges?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${userId}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAdmin: !!isAdmin })
        });

        if (!response.ok) throw new Error('Failed to update admin status');

        showToast('Admin status updated', 'success');
        loadUsers();

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ============================================
// Packages Management
// ============================================
async function loadPackages() {
    const tbody = document.getElementById('packagesTable');
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Loading...</td></tr>';

    try {
        const response = await fetch('/api/admin/packages');
        if (!response.ok) throw new Error('Failed to load packages');

        const packages = await response.json();

        tbody.innerHTML = packages.map(pkg => `
            <tr>
                <td style="font-size: 1.5rem;">${pkg.badge}</td>
                <td><strong>${pkg.name}</strong></td>
                <td>${pkg.duration_days} วัน</td>
                <td>฿${pkg.price}</td>
                <td>
                    <span class="status-badge ${pkg.is_active ? 'enabled' : 'disabled'}">
                        ${pkg.is_active ? '✓ Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn toggle" onclick="togglePackage(${pkg.id})" title="Toggle Active">
                            ${pkg.is_active ? '🔴' : '🟢'}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="no-data">Error: ${err.message}</td></tr>`;
    }
}

async function togglePackage(packageId) {
    try {
        const response = await fetch(`/api/admin/packages/${packageId}/toggle`, {
            method: 'PUT'
        });

        if (!response.ok) throw new Error('Failed to toggle package');

        showToast('Package status updated', 'success');
        loadPackages();

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

function showAddPackageModal() {
    // TODO: Implement add package modal
    showToast('Add package feature coming soon', 'info');
}

// ============================================
// Subscriptions
// ============================================
async function loadSubscriptions() {
    const tbody = document.getElementById('subscriptionsTable');
    const status = document.getElementById('subStatusFilter').value;

    tbody.innerHTML = '<tr><td colspan="5" class="no-data">Loading...</td></tr>';

    try {
        let url = '/api/admin/subscriptions';
        if (status) url += `?status=${status}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load subscriptions');

        const subscriptions = await response.json();

        if (subscriptions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No subscriptions found</td></tr>';
            return;
        }

        tbody.innerHTML = subscriptions.map(sub => {
            const avatarUrl = sub.avatar
                ? `https://cdn.discordapp.com/avatars/${sub.discord_id}/${sub.avatar}.png?size=64`
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(sub.username)}&size=64&background=5865F2&color=fff`;

            const endDate = new Date(sub.end_date).toLocaleDateString('th-TH');
            const createdDate = new Date(sub.created_at).toLocaleDateString('th-TH');

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <img src="${avatarUrl}" alt="">
                            <span class="user-name">${sub.username}</span>
                        </div>
                    </td>
                    <td>${sub.badge} ${sub.package_name}</td>
                    <td>
                        <span class="status-badge ${sub.status}">
                            ${sub.status}
                        </span>
                    </td>
                    <td>${endDate}</td>
                    <td>${createdDate}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="no-data">Error: ${err.message}</td></tr>`;
    }
}

// ============================================
// Topups
// ============================================
async function loadTopups() {
    const tbody = document.getElementById('topupsTable');
    tbody.innerHTML = '<tr><td colspan="5" class="no-data">Loading...</td></tr>';

    try {
        const response = await fetch('/api/admin/topups');
        if (!response.ok) throw new Error('Failed to load topups');

        const topups = await response.json();

        if (topups.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">No topups found</td></tr>';
            return;
        }

        tbody.innerHTML = topups.map(topup => {
            const date = new Date(topup.created_at).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <tr>
                    <td>
                        <div class="user-cell">
                            <span class="user-name">${topup.username}</span>
                        </div>
                    </td>
                    <td class="amount-positive">+฿${topup.amount.toLocaleString()}</td>
                    <td>${topup.reference || '-'}</td>
                    <td>
                        <span class="status-badge ${topup.source === 'admin' ? 'enabled' : 'active'}">
                            ${topup.source}
                        </span>
                    </td>
                    <td>${date}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="no-data">Error: ${err.message}</td></tr>`;
    }
}

function showManualTopupModal() {
    document.getElementById('topupUserId').value = '';
    document.getElementById('topupAmount').value = '';
    document.getElementById('topupReference').value = '';
    document.getElementById('topupModal').classList.add('active');
}

function closeTopupModal() {
    document.getElementById('topupModal').classList.remove('active');
}

async function processManualTopup() {
    const userId = parseInt(document.getElementById('topupUserId').value);
    const amount = parseInt(document.getElementById('topupAmount').value);
    const reference = document.getElementById('topupReference').value;

    if (!userId || !amount) {
        showToast('Please fill in User ID and Amount', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/topup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount, reference })
        });

        if (!response.ok) throw new Error('Failed to process topup');

        showToast('Topup processed successfully', 'success');
        closeTopupModal();
        loadTopups();

    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        padding: 12px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: toastIn 0.3s ease-out;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes toastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes toastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    .packages-overview-grid { display: flex; gap: 1rem; flex-wrap: wrap; }
    .pkg-overview-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: var(--bg-secondary); border-radius: 0.5rem; }
    .pkg-badge { font-size: 1.25rem; }
    .pkg-name { font-weight: 500; }
    .pkg-price { color: var(--primary); font-weight: 600; }
`;
document.head.appendChild(style);
