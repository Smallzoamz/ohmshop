/**
 * Database Connection Module (sql.js Version)
 * Discord Streaming Status Rental System
 * © 2026 Bonchon-Studio
 * 
 * Uses sql.js - SQLite compiled to JavaScript (no native modules needed)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Database file path
const DB_PATH = path.join(__dirname, 'data.db');

let db = null;
let initialized = false;

/**
 * Initialize database connection
 */
async function initializeDatabase() {
    if (initialized && db) return db;

    // Initialize SQL.js
    const SQL = await initSqlJs();

    // Check if running on Vercel (read-only filesystem usually)
    // We'll use in-memory DB if file write is not possible or if explicitly disabled
    const isVercel = process.env.VERCEL || process.env.NOW_REGION;

    // Load existing database Or Create new
    if (!isVercel && fs.existsSync(DB_PATH)) {
        try {
            const buffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(buffer);
            console.log('✅ Database loaded from file');
        } catch (err) {
            console.error('Failed to load DB file, creating new in-memory:', err);
            db = new SQL.Database();
        }
    } else {
        db = new SQL.Database();
        console.log(isVercel ? '✅ Vercel: New in-memory database created' : '✅ New database created');
    }

    // Run schema (use exec for multiple statements)
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        try {
            db.exec(schema);
            console.log('✅ Schema applied');
        } catch (err) {
            // Ignore "table already exists" errors
            if (!err.message.includes('already exists')) {
                console.error('Schema error:', err);
            }
        }
    }

    // Save to file (Only if not Vercel)
    if (!isVercel) {
        saveDatabase();
    }

    initialized = true;
    return db;
}

/**
 * Save database to file
 */
function saveDatabase() {
    // Skip saving on Vercel/Read-only env
    if (process.env.VERCEL || process.env.NOW_REGION) return;

    if (db) {
        try {
            const data = db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(DB_PATH, buffer);
        } catch (err) {
            console.error('Failed to save database:', err.message);
        }
    }
}

/**
 * Get database instance
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

/**
 * Helper: Execute query and return results
 */
function query(sql, params = []) {
    if (!db) throw new Error('Database not initialized');

    try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
            stmt.bind(params);
        }

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (err) {
        console.error('Query error:', sql, err.message);
        throw err;
    }
}

/**
 * Helper: Execute query and return first result
 */
function queryOne(sql, params = []) {
    const results = query(sql, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Helper: Execute statement (INSERT/UPDATE/DELETE)
 */
function run(sql, params = []) {
    if (!db) throw new Error('Database not initialized');

    try {
        db.run(sql, params);
        saveDatabase();

        // Get last insert ID
        const lastId = queryOne('SELECT last_insert_rowid() as id');

        return {
            changes: db.getRowsModified(),
            lastInsertRowid: lastId ? lastId.id : null
        };
    } catch (err) {
        console.error('Run error:', sql, err.message);
        throw err;
    }
}

// ============================================
// User Operations
// ============================================
const UserDB = {
    findByDiscordId: (discordId) => {
        return queryOne('SELECT * FROM users WHERE discord_id = ?', [discordId]);
    },

    findById: (id) => {
        return queryOne('SELECT * FROM users WHERE id = ?', [id]);
    },

    upsert: (profile) => {
        const existing = UserDB.findByDiscordId(profile.id);

        if (existing) {
            run(`
                UPDATE users SET
                    username = ?,
                    discriminator = ?,
                    global_name = ?,
                    avatar = ?,
                    email = ?,
                    updated_at = datetime('now')
                WHERE discord_id = ?
            `, [
                profile.username,
                profile.discriminator || '0',
                profile.global_name || profile.username,
                profile.avatar,
                profile.email || null,
                profile.id
            ]);
        } else {
            run(`
                INSERT INTO users (discord_id, username, discriminator, global_name, avatar, email)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                profile.id,
                profile.username,
                profile.discriminator || '0',
                profile.global_name || profile.username,
                profile.avatar,
                profile.email || null
            ]);
        }

        return UserDB.findByDiscordId(profile.id);
    },

    updateBalance: (userId, amount) => {
        return run(`
            UPDATE users 
            SET balance = balance + ?, updated_at = datetime('now') 
            WHERE id = ?
        `, [amount, userId]);
    },

    setBalance: (userId, balance) => {
        return run(`
            UPDATE users 
            SET balance = ?, updated_at = datetime('now') 
            WHERE id = ?
        `, [balance, userId]);
    },

    getAll: (limit = 100, offset = 0) => {
        return query(`
            SELECT u.*, 
                   (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND status = 'active') as active_subs
            FROM users u
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    },

    count: () => {
        const result = queryOne('SELECT COUNT(*) as count FROM users');
        return result ? result.count : 0;
    },

    setAdmin: (userId, isAdmin) => {
        return run('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin ? 1 : 0, userId]);
    }
};

// ============================================
// Package Operations
// ============================================
const PackageDB = {
    getActive: () => {
        return query('SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order ASC');
    },

    getAll: () => {
        return query('SELECT * FROM packages ORDER BY sort_order ASC');
    },

    findById: (id) => {
        return queryOne('SELECT * FROM packages WHERE id = ?', [id]);
    },

    create: (data) => {
        return run(`
            INSERT INTO packages (name, duration_days, price, description, badge, color, is_popular, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [data.name, data.duration_days, data.price, data.description, data.badge, data.color || '#3B82F6', data.is_popular || 0, data.is_active ?? 1, data.sort_order || 0]);
    },

    update: (id, data) => {
        return run(`
            UPDATE packages SET
                name = ?, duration_days = ?, price = ?, description = ?,
                badge = ?, color = ?, is_popular = ?, is_active = ?, sort_order = ?
            WHERE id = ?
        `, [data.name, data.duration_days, data.price, data.description, data.badge, data.color, data.is_popular, data.is_active, data.sort_order, id]);
    },

    toggleActive: (id) => {
        return run('UPDATE packages SET is_active = NOT is_active WHERE id = ?', [id]);
    }
};

// ============================================
// Subscription Operations
// ============================================
const SubscriptionDB = {
    getActiveByUserId: (userId) => {
        return queryOne(`
            SELECT s.*, p.name as package_name, p.badge, p.duration_days
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.id
            WHERE s.user_id = ? AND s.status = 'active' AND s.end_date > datetime('now')
            ORDER BY s.end_date DESC
            LIMIT 1
        `, [userId]);
    },

    getByUserId: (userId) => {
        return query(`
            SELECT s.*, p.name as package_name, p.badge
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.id
            WHERE s.user_id = ?
            ORDER BY s.created_at DESC
        `, [userId]);
    },

    create: (userId, packageId, endDate) => {
        return run(`
            INSERT INTO subscriptions (user_id, package_id, end_date)
            VALUES (?, ?, ?)
        `, [userId, packageId, endDate]);
    },

    extend: (subscriptionId, newEndDate) => {
        return run('UPDATE subscriptions SET end_date = ? WHERE id = ?', [newEndDate, subscriptionId]);
    },

    cancel: (subscriptionId) => {
        return run("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?", [subscriptionId]);
    },

    expireOld: () => {
        return run(`
            UPDATE subscriptions 
            SET status = 'expired' 
            WHERE status = 'active' AND end_date <= datetime('now')
        `);
    },

    getAll: (status = null, limit = 100, offset = 0) => {
        if (status) {
            return query(`
                SELECT s.*, p.name as package_name, p.badge, 
                       u.username, u.discord_id, u.avatar
                FROM subscriptions s
                JOIN packages p ON s.package_id = p.id
                JOIN users u ON s.user_id = u.id
                WHERE s.status = ?
                ORDER BY s.created_at DESC LIMIT ? OFFSET ?
            `, [status, limit, offset]);
        }
        return query(`
            SELECT s.*, p.name as package_name, p.badge, 
                   u.username, u.discord_id, u.avatar
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.id
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC LIMIT ? OFFSET ?
        `, [limit, offset]);
    },

    countActive: () => {
        const result = queryOne(`
            SELECT COUNT(*) as count FROM subscriptions 
            WHERE status = 'active' AND end_date > datetime('now')
        `);
        return result ? result.count : 0;
    }
};

// ============================================
// Status Configuration Operations
// ============================================
const StatusConfigDB = {
    getByUserId: (userId) => {
        return queryOne('SELECT * FROM status_configs WHERE user_id = ?', [userId]);
    },

    getByDiscordId: (discordId) => {
        return queryOne(`
            SELECT sc.* FROM status_configs sc
            JOIN users u ON sc.user_id = u.id
            WHERE u.discord_id = ?
        `, [discordId]);
    },

    upsert: (userId, config) => {
        const existing = StatusConfigDB.getByUserId(userId);

        if (existing) {
            return run(`
                UPDATE status_configs SET
                    page1_text1 = ?, page1_text2 = ?, page1_text3 = ?, page1_image = ?,
                    page2_text1 = ?, page2_text2 = ?, page2_text3 = ?, page2_image = ?,
                    is_enabled = ?, updated_at = datetime('now')
                WHERE user_id = ?
            `, [
                config.page1_text1 || '', config.page1_text2 || '', config.page1_text3 || '', config.page1_image || '',
                config.page2_text1 || '', config.page2_text2 || '', config.page2_text3 || '', config.page2_image || '',
                config.is_enabled !== undefined ? config.is_enabled : 1,
                userId
            ]);
        } else {
            return run(`
                INSERT INTO status_configs (
                    user_id, 
                    page1_text1, page1_text2, page1_text3, page1_image,
                    page2_text1, page2_text2, page2_text3, page2_image,
                    is_enabled
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                userId,
                config.page1_text1 || '', config.page1_text2 || '', config.page1_text3 || '', config.page1_image || '',
                config.page2_text1 || '', config.page2_text2 || '', config.page2_text3 || '', config.page2_image || '',
                config.is_enabled !== undefined ? config.is_enabled : 1
            ]);
        }
    },

    toggleEnabled: (userId) => {
        return run(`
            UPDATE status_configs 
            SET is_enabled = NOT is_enabled, updated_at = datetime('now') 
            WHERE user_id = ?
        `, [userId]);
    }
};

// ============================================
// Topup Operations
// ============================================
const TopupDB = {
    create: (userId, amount, reference, source = 'discord_bot') => {
        return run(`
            INSERT INTO topups (user_id, amount, reference, source)
            VALUES (?, ?, ?, ?)
        `, [userId, amount, reference, source]);
    },

    getByUserId: (userId, limit = 20) => {
        return query('SELECT * FROM topups WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
    },

    getAll: (limit = 100, offset = 0) => {
        return query(`
            SELECT t.*, u.username, u.discord_id
            FROM topups t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);
    },

    getTotalAmount: () => {
        const result = queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM topups');
        return result ? result.total : 0;
    }
};

// ============================================
// Transaction Operations
// ============================================
const TransactionDB = {
    create: (userId, type, amount, description, balanceAfter, referenceId = null) => {
        return run(`
            INSERT INTO transactions (user_id, type, amount, description, balance_after, reference_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, type, amount, description, balanceAfter, referenceId]);
    },

    getByUserId: (userId, limit = 50) => {
        return query('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
    }
};

// ============================================
// Settings Operations
// ============================================
const SettingsDB = {
    get: (key) => {
        const row = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
        return row ? row.value : null;
    },

    set: (key, value) => {
        const existing = SettingsDB.get(key);
        if (existing !== null) {
            return run('UPDATE settings SET value = ?, updated_at = datetime("now") WHERE key = ?', [value, key]);
        } else {
            return run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
        }
    },

    getAll: () => {
        const rows = query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        return settings;
    }
};

// ============================================
// Stats for Dashboard
// ============================================
const StatsDB = {
    getDashboardStats: () => {
        return {
            totalUsers: UserDB.count(),
            activeSubscriptions: SubscriptionDB.countActive(),
            totalRevenue: TopupDB.getTotalAmount(),
            packages: PackageDB.getActive()
        };
    }
};

// Export everything
module.exports = {
    initializeDatabase,
    getDb,
    saveDatabase,
    query,
    queryOne,
    run,
    UserDB,
    PackageDB,
    SubscriptionDB,
    StatusConfigDB,
    TopupDB,
    TransactionDB,
    SettingsDB,
    StatsDB
};
