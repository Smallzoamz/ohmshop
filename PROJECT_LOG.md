# Discord Status Rental System - Project Log
## © 2026 Bonchon-Studio

---

### [2026-01-08 17:45:00]
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| package.json | 1 | - | Created | Initial package.json with sql.js, passport-discord, express-session |
| .env.example | 1 | - | Created | Environment variables template |
| .gitignore | 1 | - | Created | Ignore node_modules, .env, database |
| database/schema.sql | 1 | - | Created | SQLite schema: users, packages, subscriptions, status_configs, topups, transactions, settings |
| database/db.js | 1 | initializeDatabase | Created | Database module with sql.js, CRUD for all tables |
| database/init.js | 1 | main | Created | Database initialization script |
| server.js | 1 | startServer | Created | Express server with Discord OAuth, all API endpoints |
| public/css/style.css | 1 | :root | Created | CSS Design System - Blue Gradient theme |
| public/index.html | 1 | - | Created | Landing page: Hero, Stats, Packages, Features, Contact, Footer |
| public/js/app.js | 1 | App | Created | Landing page JS: Counter animation, Auth check |
| public/dashboard.html | 1 | - | Created | User dashboard: Profile, Subscription, Status Editor |
| public/css/dashboard.css | 1 | .dashboard-body | Created | Dashboard styles |
| public/js/dashboard.js | 1 | currentUser | Created | Dashboard JS: Auth, Status save, Package purchase |
| public/admin.html | 1 | - | Created | Admin panel: Sidebar, Stats, Users/Packages/Subs/Topups tables |
| public/css/admin.css | 1 | .admin-body | Created | Admin panel styles |
| public/js/admin.js | 1 | currentAdmin | Created | Admin JS: Auth check, CRUD operations |

---

### [2026-01-08 18:16:00] - Bot Integration
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| server.js | 418 | /api/bot/sync-status | Created | Bot API: Sync status config from Discord to web |
| server.js | 453 | /api/bot/user-profile | Created | Bot API: Full user profile endpoint |
| server.js | 488 | /api/bot/verify | Created | Bot API: Connection verification endpoint |
| .env.example | 9 | BOT_WEBHOOK_SECRET | Edited | Added generated secret for bot authentication |

---

### [2026-01-08 18:26:00] - Expiry Date Display
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/dashboard.html | 74 | profileExpiry | Created | Added expiry display box in profile card |
| public/css/dashboard.css | 80 | .profile-expiry | Created | CSS styles for expiry display with active/expired states |
| public/js/dashboard.js | 74 | renderSubscription | Edited | Added logic to populate expiry date in profile card |

---

### [2026-01-08 18:31:00] - Discord Token Input
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/dashboard.html | 133 | token-section | Created | Token input field with help button and visibility toggle |
| public/dashboard.html | 274 | tokenHelpModal | Created | Step-by-step guide modal for finding Discord Token |
| public/css/dashboard.css | 296 | .token-section | Created | CSS for token input and help modal styles |
| public/js/dashboard.js | 429 | saveToken | Created | Token management functions (save, toggle, load) |
| server.js | 337 | /api/discord-token | Created | API endpoint to save user Discord Token |

---

### [2026-01-08 18:37:00] - Admin Panel Modal Fix
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/css/admin.css | 344 | .modal | Edited | Added complete modal styles (fixed positioning from corner to centered) |

### [2026-01-08 19:00:00] - PromptPay Topup System
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/dashboard.html | 355 | topupModal | Edited | Added PromptPay QR Modal HTML with 3-step wizard |
| public/css/dashboard.css | 832 | .topup-modal | Edited | Added styles for QR display, slip upload dropzone, and wizards |
| public/js/dashboard.js | 540 | showTopupModal | Edited | Added JS for QR generation, file handling, and API submission |
| server.js | 374 | /api/topup/request | Edited | Added API endpoint to handle slip upload and discord webhook |
| .env | - | PROMPTPAY | Edited | Added PromptPay config (063-147-5942) |

### [2026-01-08 19:10:00] - Security & Anti-Inspect
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/js/security.js | 1 | - | Created | Added Console Warnings, IP Bluff, and Shortcut Blocking |
| public/index.html | 377 | security.js | Edited | Injected security script |
| public/dashboard.html | 444 | security.js | Edited | Injected security script |
| public/admin.html | 303 | security.js | Edited | Injected security script |
| public/js/security.js | 5 | urlParams | Edited | Added Developer Mode Bypass (`?dev=ohm`) |
| public/js/security.js | 84 | lockdownMode | Edited | Added Advanced DOM Masking (Replaces body content on inspect) |
| public/js/security.js | 150 | debugger | Edited | Added Debugger Trap to freeze browser on inspect (Broad compatibility) |
| public/js/security.js | 165 | data-protect | Edited | Added Attribute Injection to spam insults in HTML tags |
| public/index.html | - | - | Edited | Removed all HTML comments (Code Sanitization) |
| public/index.html | 304 | discord.gg | Edited | Updated Discord Invite Link (4PQnDebdZK) |
| - | - | - | Auto | Pushed Project to GitHub (Smallzoamz/ohmshop) |
| - | - | - | Info | Project Handover & Documentation Update |

---

**Total Files Created: 17**
**Database Tables: 7**
**Database Tables: 7**
**API Endpoints: 29+**

---

### [2026-01-09 00:05:00] - Copy Placeholders
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/dashboard.html | 160 | placeholders-section | Feature | Added UI for copying status placeholders ({time}, {date}, etc.) |
| public/js/dashboard.js | 710 | copyToClipboard | Feature | Added clipboard copy function with toast notification |
| public/css/dashboard.css | 1160 | .placeholders-section | Feature | Added CSS styles for placeholder grid and buttons |
| server.js | 308 | /api/subscribe | Feature | Added Discord Webhook logging for purchases/renewals (DISCORD_LOG_WEBHOOK) |
| .env.example | 26 | DISCORD_LOG_WEBHOOK | Config | Added logging webhook configuration |
| shop_system.py | 700 | TopupApprovalView | Feature | Added Approve/Reject buttons handling |
| bot.py | 36 | Webhook Listener | Feature | Added webhook message listener to trigger approval view |
| server.js | 400 | /api/topup/request | Feature | Added Topup ID to webhook embed for bot parsing |
| server.js | 450 | /api/topup/pending | Endpoint | Added endpoint for polling pending topups |
| public/js/dashboard.js | 715 | startTopupWatcher | Feature | Added real-time polling to notify Approved/Rejected status |

---

### [2026-01-09 03:23:00] - UI Enhancements: Wavy Footer, Dark Mode, Social Links
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/css/style.css | 82 | --footer-bg | Feature | Added footer-specific CSS variables for theme inversion |
| public/css/style.css | 89 | [data-theme="dark"] | Feature | Added Dark Mode theme with inverted footer (white footer in dark mode) |
| public/css/style.css | 269 | .theme-toggle | Feature | Added theme toggle button styling with sun/moon icon visibility |
| public/css/style.css | 893 | .footer | Edited | Changed footer to use theme-aware variables (--footer-bg, --footer-text) |
| public/css/style.css | 945 | .footer-wave | Feature | Added wavy footer animation with 2 layers |
| public/index.html | 40 | themeToggle | Feature | Added theme toggle button with sun/moon SVG icons |
| public/index.html | 331 | footer-wave | Feature | Added animated SVG wave layers to footer |
| public/index.html | 254 | feature-desc | Edited | Changed top-up description from "Bot" to "เว็บไซต์" |
| public/index.html | 283 | step-desc | Edited | Changed how-to step 2 description to "เติมเงินผ่านเว็บไซต์" |
| public/index.html | 303 | social-links | Feature | Added Facebook/X/Instagram social buttons in Contact section |
| public/js/app.js | 20 | initTheme | Feature | Added theme initialization with localStorage persistence |
| public/dashboard.html | 42 | themeToggle | Feature | Added theme toggle button to dashboard header |
| public/dashboard.html | 476 | footer | Feature | Added wavy footer with Bonchon-Studio credit to dashboard |
| public/js/dashboard.js | 18 | initTheme | Feature | Added theme toggle function to dashboard with localStorage sync |

---

### [2026-01-09 15:05:00] - Manual Topup Fix
| File | Line | Keyword | Status | Change |
|------|------|---------|--------|--------|
| public/admin.html | 279 | topupUserId | Fixed | Changed input to select dropdown for user selection |
| public/js/admin.js | 437 | showManualTopupModal | Fixed | Added async user loading into dropdown from API |
| public/js/admin.js | 469 | processManualTopup | Fixed | Improved validation, Thai error messages, refresh stats after topup |
