/**
 * Discord Streaming Status Rental System
 * Main App JavaScript
 * © 2026 Bonchon-Studio
 */

// ============================================
// Global State
// ============================================
const App = {
    user: null,
    packages: [],
    stats: { users: 0, activeSubscriptions: 0, totalSales: 0 }
};

// ============================================
// DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHeader();
    initMobileMenu();
    loadStats();
    loadPackages();
    checkAuth();
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
// Header Scroll Effect
// ============================================
function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ============================================
// Mobile Menu
// ============================================
function initMobileMenu() {
    const toggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// ============================================
// Load Stats
// ============================================
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) throw new Error('Failed to load stats');

        const data = await response.json();
        App.stats = data;

        // Animate counters
        animateCounter('statUsers', data.users || 0);
        animateCounter('statActive', data.activeSubscriptions || 0);
        animateCounter('statSales', data.totalSales || 0, '฿');

    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

// ============================================
// Animate Counter
// ============================================
function animateCounter(elementId, target, prefix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 2000; // 2 seconds
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const update = () => {
        current += increment;
        if (current >= target) {
            current = target;
            element.textContent = prefix + formatNumber(current);
        } else {
            element.textContent = prefix + formatNumber(Math.floor(current));
            requestAnimationFrame(update);
        }
    };

    requestAnimationFrame(update);
}

// ============================================
// Format Number
// ============================================
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('th-TH');
}

// ============================================
// Load Packages
// ============================================
async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        if (!response.ok) throw new Error('Failed to load packages');

        const packages = await response.json();
        App.packages = packages;

        // Packages are already rendered in HTML, but we can update dynamically if needed

    } catch (err) {
        console.error('Error loading packages:', err);
    }
}

// ============================================
// Check Authentication
// ============================================
async function checkAuth() {
    try {
        const response = await fetch('/api/user');

        if (response.ok) {
            const user = await response.json();
            App.user = user;
            updateUIForLoggedInUser(user);
        }
    } catch (err) {
        // Not logged in, that's fine
        console.log('User not logged in');
    }
}

// ============================================
// Update UI for Logged In User
// ============================================
function updateUIForLoggedInUser(user) {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        // Get avatar URL
        const avatarUrl = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png?size=32`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=32&background=5865F2&color=fff`;

        loginBtn.innerHTML = `
            <img src="${avatarUrl}" alt="${user.username}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">
            ${user.global_name || user.username}
        `;
        loginBtn.href = '/dashboard.html';
    }
}

// ============================================
// Utilities
// ============================================

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Smooth scroll to element
function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// Add Animations CSS via JS
// ============================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
