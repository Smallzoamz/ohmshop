/**
 * Discord Streaming Status Rental System
 * Main Server File
 * © 2026 Bonchon-Studio
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const multer = require('multer');
const FormData = require('form-data');

// Multer config for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images allowed'));
        }
    }
});

// Database
const {
    initializeDatabase,
    UserDB,
    PackageDB,
    SubscriptionDB,
    StatusConfigDB,
    TopupDB,
    TransactionDB,
    StatsDB
} = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware
// ============================================

// Security headers (relaxed for development)
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
    origin: true,
    credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Session
app.use(session({
    store: new FileStore({
        path: './sessions',
        ttl: 86400 * 7, // 7 days
        retries: 0
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 86400 * 7 * 1000 // 7 days
    }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// Passport Discord Strategy
// ============================================

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_CALLBACK_URL = process.env.DISCORD_CALLBACK_URL || 'http://localhost:3000/auth/discord/callback';

if (DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET) {
    passport.use(new DiscordStrategy({
        clientID: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        callbackURL: DISCORD_CALLBACK_URL,
        scope: ['identify', 'email']
    }, (accessToken, refreshToken, profile, done) => {
        try {
            // Upsert user in database
            const user = UserDB.upsert(profile);

            // Check if user should be admin
            const adminIds = (process.env.ADMIN_DISCORD_IDS || '').split(',').map(id => id.trim());
            if (adminIds.includes(profile.id) && !user.is_admin) {
                UserDB.setAdmin(user.id, true);
                user.is_admin = 1;
            }

            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));
}

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    try {
        const user = UserDB.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ============================================
// Auth Middleware
// ============================================

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.is_admin) {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
}

// ============================================
// Auth Routes
// ============================================

app.get('/auth/discord', (req, res, next) => {
    // Check if Discord OAuth is configured
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        return res.status(503).send(`
            <html>
            <head><title>Discord OAuth Not Configured</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h1>⚠️ Discord OAuth ยังไม่ได้ตั้งค่า</h1>
                <p>กรุณาตั้งค่า DISCORD_CLIENT_ID และ DISCORD_CLIENT_SECRET ในไฟล์ .env</p>
                <a href="/">กลับหน้าหลัก</a>
            </body>
            </html>
        `);
    }
    passport.authenticate('discord')(req, res, next);
});

app.get('/auth/discord/callback', (req, res, next) => {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        return res.redirect('/?error=oauth_not_configured');
    }
    passport.authenticate('discord', { failureRedirect: '/?error=auth_failed' })(req, res, () => {
        res.redirect('/dashboard.html');
    });
});

app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect('/');
    });
});

// ============================================
// Public API Routes
// ============================================

// Get public stats
app.get('/api/stats', (req, res) => {
    try {
        const stats = StatsDB.getDashboardStats();
        res.json({
            users: stats.totalUsers,
            activeSubscriptions: stats.activeSubscriptions,
            totalSales: stats.totalRevenue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get packages
app.get('/api/packages', (req, res) => {
    try {
        const packages = PackageDB.getActive();
        res.json(packages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// User API Routes (Authenticated)
// ============================================

// Get current user
app.get('/api/user', isAuthenticated, (req, res) => {
    try {
        const user = UserDB.findById(req.user.id);
        const subscription = SubscriptionDB.getActiveByUserId(req.user.id);
        const statusConfig = StatusConfigDB.getByUserId(req.user.id);

        res.json({
            ...user,
            subscription,
            statusConfig
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user's subscriptions
app.get('/api/subscriptions', isAuthenticated, (req, res) => {
    try {
        const subscriptions = SubscriptionDB.getByUserId(req.user.id);
        res.json(subscriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Purchase a package
app.post('/api/subscribe', isAuthenticated, (req, res) => {
    try {
        const { packageId } = req.body;
        const user = UserDB.findById(req.user.id);
        const pkg = PackageDB.findById(packageId);

        if (!pkg) {
            return res.status(404).json({ error: 'Package not found' });
        }

        if (user.balance < pkg.price) {
            return res.status(400).json({ error: 'Insufficient balance', required: pkg.price, current: user.balance });
        }

        // Check existing subscription
        const existingSub = SubscriptionDB.getActiveByUserId(user.id);
        let endDate;

        if (existingSub) {
            // Extend existing subscription
            const currentEnd = new Date(existingSub.end_date);
            endDate = new Date(currentEnd.getTime() + (pkg.duration_days * 24 * 60 * 60 * 1000));
            SubscriptionDB.extend(existingSub.id, endDate.toISOString());
        } else {
            // Create new subscription
            endDate = new Date(Date.now() + (pkg.duration_days * 24 * 60 * 60 * 1000));
            SubscriptionDB.create(user.id, pkg.id, endDate.toISOString());
        }

        // Deduct balance
        UserDB.updateBalance(user.id, -pkg.price);
        const updatedUser = UserDB.findById(user.id);

        // Record transaction
        TransactionDB.create(user.id, 'purchase', -pkg.price, `ซื้อแพ็คเกจ ${pkg.name}`, updatedUser.balance);

        const newSub = SubscriptionDB.getActiveByUserId(user.id);

        res.json({
            success: true,
            message: existingSub ? 'Subscription extended' : 'Subscription created',
            subscription: newSub,
            newBalance: updatedUser.balance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get status config
app.get('/api/status-config', isAuthenticated, (req, res) => {
    try {
        let config = StatusConfigDB.getByUserId(req.user.id);

        if (!config) {
            // Create default config
            StatusConfigDB.upsert(req.user.id, {});
            config = StatusConfigDB.getByUserId(req.user.id);
        }

        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update status config
app.put('/api/status-config', isAuthenticated, (req, res) => {
    try {
        const config = req.body;
        StatusConfigDB.upsert(req.user.id, config);

        const updated = StatusConfigDB.getByUserId(req.user.id);
        res.json({ success: true, config: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get transactions
app.get('/api/transactions', isAuthenticated, (req, res) => {
    try {
        const transactions = TransactionDB.getByUserId(req.user.id);
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save Discord Token
app.put('/api/discord-token', isAuthenticated, (req, res) => {
    try {
        const { token } = req.body;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Basic token validation
        if (!token.includes('.') || token.length < 50) {
            return res.status(400).json({ error: 'Invalid token format' });
        }

        // Save token to status config (encrypted in production)
        StatusConfigDB.upsert(req.user.id, {
            discord_token: token
        });

        res.json({ success: true, message: 'Token saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Topup Request (User uploads slip)
// ============================================
app.post('/api/topup/request', isAuthenticated, upload.single('slip'), async (req, res) => {
    try {
        const { amount } = req.body;
        const slipFile = req.file;

        if (!amount || amount < 10) {
            return res.status(400).json({ error: 'จำนวนเงินต้องอย่างน้อย 10 บาท' });
        }

        if (!slipFile) {
            return res.status(400).json({ error: 'กรุณาแนบสลิปการโอนเงิน' });
        }

        const user = req.user;

        // Create topup request record (pending status)
        const topupId = TopupDB.create(user.id, parseInt(amount), `Pending slip #${Date.now()}`, 'website_pending');

        // Send to Discord Channel via Webhook
        const webhookUrl = process.env.DISCORD_TOPUP_WEBHOOK;

        if (!webhookUrl) {
            console.error('DISCORD_TOPUP_WEBHOOK not configured');
            return res.json({ success: true, message: 'รับสลิปแล้ว รอแอดมินตรวจสอบ' });
        }

        // Prepare Discord webhook payload
        const formData = new FormData();

        // Embed data
        const embed = {
            title: '💰 คำขอเติมเงินใหม่',
            color: 0x5865F2,
            fields: [
                { name: '👤 ผู้ใช้', value: `${user.global_name || user.username}\n<@${user.discord_id}>`, inline: true },
                { name: '💵 จำนวนเงิน', value: `฿${parseInt(amount).toLocaleString()}`, inline: true },
                { name: '🆔 User ID', value: `${user.id}`, inline: true },
                { name: '📋 Discord ID', value: user.discord_id, inline: true }
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'OHM SHOP - Topup Request' }
        };

        formData.append('payload_json', JSON.stringify({
            content: `<@&${process.env.ADMIN_ROLE_ID || ''}>`,
            embeds: [embed]
        }));

        // Attach slip image
        formData.append('files[0]', slipFile.buffer, {
            filename: `slip_${user.id}_${Date.now()}.${slipFile.mimetype.split('/')[1]}`,
            contentType: slipFile.mimetype
        });

        // Send to Discord
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        if (!response.ok) {
            console.error('Discord webhook error:', await response.text());
        }

        res.json({
            success: true,
            message: 'ส่งสลิปเรียบร้อย รอแอดมินตรวจสอบ',
            topupId
        });

    } catch (err) {
        console.error('Topup request error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Bot API Routes (For Discord Bot)
// ============================================

// Webhook to receive topup from bot
app.post('/api/topup/webhook', (req, res) => {
    try {
        const { secret, discordId, amount, reference } = req.body;

        // Verify webhook secret
        if (secret !== process.env.BOT_WEBHOOK_SECRET) {
            return res.status(403).json({ error: 'Invalid webhook secret' });
        }

        // Find user
        const user = UserDB.findByDiscordId(discordId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Add topup
        TopupDB.create(user.id, amount, reference, 'discord_bot');
        UserDB.updateBalance(user.id, amount);

        const updatedUser = UserDB.findById(user.id);
        TransactionDB.create(user.id, 'topup', amount, `เติมเงินผ่าน Discord Bot`, updatedUser.balance);

        res.json({
            success: true,
            newBalance: updatedUser.balance
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bot fetches user's status config
app.get('/api/bot/user-status/:discordId', (req, res) => {
    try {
        const { discordId } = req.params;
        const authHeader = req.headers.authorization;

        // Simple token auth for bot
        if (authHeader !== `Bearer ${process.env.BOT_WEBHOOK_SECRET}`) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const user = UserDB.findByDiscordId(discordId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const subscription = SubscriptionDB.getActiveByUserId(user.id);
        if (!subscription) {
            return res.status(404).json({ error: 'No active subscription' });
        }

        const config = StatusConfigDB.getByUserId(user.id);

        res.json({
            user: {
                id: user.id,
                discord_id: user.discord_id,
                username: user.username
            },
            subscription: {
                package_name: subscription.package_name,
                end_date: subscription.end_date,
                status: subscription.status
            },
            statusConfig: config || {
                page1_text1: '', page1_text2: '', page1_text3: '', page1_image: '',
                page2_text1: '', page2_text2: '', page2_text3: '', page2_image: '',
                is_enabled: 1
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bot syncs status config from Discord to web
app.post('/api/bot/sync-status/:discordId', (req, res) => {
    try {
        const { discordId } = req.params;
        const authHeader = req.headers.authorization;

        if (authHeader !== `Bearer ${process.env.BOT_WEBHOOK_SECRET}`) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const user = UserDB.findByDiscordId(discordId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const statusData = req.body;
        StatusConfigDB.upsert(user.id, {
            page1_text1: statusData.status_text_1 || '',
            page1_text2: '',
            page1_text3: '',
            page1_image: statusData.large_image || '',
            page2_text1: statusData.status_text_2 || '',
            page2_text2: '',
            page2_text3: '',
            page2_image: statusData.large_image_2 || '',
            is_enabled: statusData.active ? 1 : 0
        });

        res.json({ success: true, message: 'Status synced from bot' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bot gets full user profile
app.get('/api/bot/user-profile/:discordId', (req, res) => {
    try {
        const { discordId } = req.params;
        const authHeader = req.headers.authorization;

        if (authHeader !== `Bearer ${process.env.BOT_WEBHOOK_SECRET}`) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const user = UserDB.findByDiscordId(discordId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const subscription = SubscriptionDB.getActiveByUserId(user.id);
        const statusConfig = StatusConfigDB.getByUserId(user.id);
        const transactions = TransactionDB.getByUserId(user.id, 10);

        res.json({
            user: {
                id: user.id,
                discord_id: user.discord_id,
                username: user.username,
                balance: user.balance,
                is_admin: user.is_admin,
                created_at: user.created_at
            },
            subscription: subscription || null,
            statusConfig: statusConfig || null,
            recentTransactions: transactions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Bot verifies connection
app.get('/api/bot/verify', (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader !== `Bearer ${process.env.BOT_WEBHOOK_SECRET}`) {
            return res.status(403).json({ error: 'Invalid secret', authenticated: false });
        }

        res.json({
            authenticated: true,
            serverTime: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Admin API Routes
// ============================================

// Get admin dashboard stats
app.get('/api/admin/stats', isAdmin, (req, res) => {
    try {
        const stats = StatsDB.getDashboardStats();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users
app.get('/api/admin/users', isAdmin, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const users = UserDB.getAll(limit, offset);
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user balance
app.put('/api/admin/users/:id/balance', isAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { balance } = req.body;

        UserDB.setBalance(id, balance);
        const user = UserDB.findById(id);

        TransactionDB.create(id, 'adjustment', balance - (user.balance - balance), 'Admin adjustment', balance);

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle user admin status
app.put('/api/admin/users/:id/admin', isAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { isAdmin: adminStatus } = req.body;

        UserDB.setAdmin(id, adminStatus);
        const user = UserDB.findById(id);

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all packages (including inactive)
app.get('/api/admin/packages', isAdmin, (req, res) => {
    try {
        const packages = PackageDB.getAll();
        res.json(packages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create package
app.post('/api/admin/packages', isAdmin, (req, res) => {
    try {
        const result = PackageDB.create(req.body);
        const packages = PackageDB.getAll();
        res.json({ success: true, packages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update package
app.put('/api/admin/packages/:id', isAdmin, (req, res) => {
    try {
        const { id } = req.params;
        PackageDB.update(id, req.body);
        const pkg = PackageDB.findById(id);
        res.json({ success: true, package: pkg });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle package active
app.put('/api/admin/packages/:id/toggle', isAdmin, (req, res) => {
    try {
        const { id } = req.params;
        PackageDB.toggleActive(id);
        const pkg = PackageDB.findById(id);
        res.json({ success: true, package: pkg });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all subscriptions
app.get('/api/admin/subscriptions', isAdmin, (req, res) => {
    try {
        const status = req.query.status || null;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const subscriptions = SubscriptionDB.getAll(status, limit, offset);
        res.json(subscriptions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all topups
app.get('/api/admin/topups', isAdmin, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const topups = TopupDB.getAll(limit, offset);
        res.json(topups);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual topup
app.post('/api/admin/topup', isAdmin, (req, res) => {
    try {
        const { userId, amount, reference } = req.body;

        TopupDB.create(userId, amount, reference || 'Admin manual', 'admin');
        UserDB.updateBalance(userId, amount);

        const user = UserDB.findById(userId);
        TransactionDB.create(userId, 'topup', amount, 'Admin manual topup', user.balance);

        res.json({ success: true, newBalance: user.balance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Start Server
// ============================================

async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database connected');

        // Expire old subscriptions
        SubscriptionDB.expireOld();

        // Check Discord OAuth config
        if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
            console.log('⚠️  Discord OAuth not configured. Set DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env');
        } else {
            console.log('✅ Discord OAuth configured');
        }

        app.listen(PORT, () => {
            console.log(`\n🚀 Server running at http://localhost:${PORT}`);
            console.log(`📂 Static files: ${path.join(__dirname, 'public')}`);
            console.log('\n📋 Available routes:');
            console.log('   GET  /                      - Landing page');
            console.log('   GET  /dashboard.html        - User dashboard');
            console.log('   GET  /admin.html            - Admin panel');
            console.log('   GET  /auth/discord          - Discord login');
            console.log('   GET  /api/stats             - Public stats');
            console.log('   GET  /api/packages          - Active packages');
            console.log('');
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
}

startServer();
