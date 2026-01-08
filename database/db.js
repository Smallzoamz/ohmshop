/**
 * Database Connection Module (PostgreSQL Version)
 * Discord Streaming Status Rental System
 * © 2026 Bonchon-Studio
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection Config
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
    console.warn('⚠️  DATABASE_URL is not set. Database features will not work.');
}

// Disable SSL for local development if needed, enable for Vercel/Neon/Supabase usually
const pool = new Pool({
    connectionString,
    ssl: isProduction || connectionString?.includes('vercel-storage') ? { rejectUnauthorized: false } : false
});

let initialized = false;

// ============================================
// Helper Functions
// ============================================

/**
 * Initialize database
 */
async function initializeDatabase() {
    if (initialized) return;

    try {
        const client = await pool.connect();

        // Run Schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf-8');
            await client.query(schema);
            console.log('✅ PostgreSQL Schema applied');
        }

        client.release();
        initialized = true;
    } catch (err) {
        console.error('❌ Database Initialization Error:', err);
    }
}

/**
 * Execute query with parameters
 */
async function query(text, params = []) {
    try {
        const res = await pool.query(text, params);
        return res.rows;
    } catch (err) {
        console.error('Query Error:', text, err.message);
        throw err;
    }
}

/**
 * Execute query and return one row
 */
async function queryOne(text, params = []) {
    try {
        const res = await pool.query(text, params);
        return res.rows[0] || null;
    } catch (err) {
        console.error('QueryOne Error:', text, err.message);
        throw err;
    }
}

/**
 * Execute insert/update/delete (legacy wrapper)
 * Returns { changes: rowCount, lastInsertRowid: id } if applicable
 */
async function run(text, params = []) {
    try {
        const res = await pool.query(text, params);
        // Postgres returns modified rows if RETURNING is used, but for general 'run' compat:
        return {
            changes: res.rowCount,
            // Note: lastInsertRowid is NOT available by default in PG without RETURNING
            // We handled this in specific DB methods below
        };
    } catch (err) {
        console.error('Run Error:', text, err.message);
        throw err;
    }
}

// ============================================
// User Operations
// ============================================
const UserDB = {
    findByDiscordId: async (discordId) => {
        return queryOne('SELECT * FROM users WHERE discord_id = $1', [discordId]);
    },

    findById: async (id) => {
        return queryOne('SELECT * FROM users WHERE id = $1', [id]);
    },

    upsert: async (profile) => {
        const discordId = profile.id || profile.discord_id;
        const existing = await UserDB.findByDiscordId(discordId);

        if (existing) {
            await pool.query(`
                UPDATE users SET
                    username = $1,
                    discriminator = $2,
                    global_name = $3,
                    avatar = $4,
                    email = $5,
                    updated_at = NOW()
                WHERE discord_id = $6
            `, [
                profile.username,
                profile.discriminator || '0',
                profile.global_name || profile.username,
                profile.avatar,
                profile.email || null,
                discordId
            ]);
        } else {
            await pool.query(`
                INSERT INTO users (discord_id, username, discriminator, global_name, avatar, email)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                discordId,
                profile.username,
                profile.discriminator || '0',
                profile.global_name || profile.username,
                profile.avatar,
                profile.email || null
            ]);
        }

        return UserDB.findByDiscordId(discordId);
    },

    updateBalance: async (userId, amount) => {
        await pool.query(`
            UPDATE users 
            SET balance = balance + $1, updated_at = NOW() 
            WHERE id = $2
        `, [amount, userId]);
    },

    setBalance: async (userId, balance) => {
        await pool.query(`
            UPDATE users 
            SET balance = $1, updated_at = NOW() 
            WHERE id = $2
        `, [balance, userId]);
    },

    getAll: async (limit = 100, offset = 0) => {
        return query(`
            SELECT u.*, 
                   (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND status = 'active') as active_subs
            FROM users u
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
    },

    count: async () => {
        const result = await queryOne('SELECT COUNT(*) as count FROM users');
        return parseInt(result?.count || 0);
    },

    setAdmin: async (userId, isAdmin) => {
        await pool.query('UPDATE users SET is_admin = $1 WHERE id = $2', [isAdmin ? 1 : 0, userId]);
    }
};

// ============================================
// Package Operations
// ============================================
const PackageDB = {
    getActive: async () => {
        return query('SELECT * FROM packages WHERE is_active = 1 ORDER BY sort_order ASC');
    },

    getAll: async () => {
        return query('SELECT * FROM packages ORDER BY sort_order ASC');
    },

    findById: async (id) => {
        return queryOne('SELECT * FROM packages WHERE id = $1', [id]);
    },

    create: async (data) => {
        const res = await pool.query(`
            INSERT INTO packages (name, duration_days, price, description, badge, color, is_popular, is_active, sort_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [data.name, data.duration_days, data.price, data.description, data.badge, data.color || '#3B82F6', data.is_popular || 0, data.is_active ?? 1, data.sort_order || 0]);
        return res.rows[0];
    },

    update: async (id, data) => {
        await pool.query(`
            UPDATE packages SET
                name = $1, duration_days = $2, price = $3, description = $4,
                badge = $5, color = $6, is_popular = $7, is_active = $8, sort_order = $9
            WHERE id = $10
        `, [data.name, data.duration_days, data.price, data.description, data.badge, data.color, data.is_popular, data.is_active, data.sort_order, id]);
    },

    toggleActive: async (id) => {
        await pool.query('UPDATE packages SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = $1', [id]);
    }
};

// ============================================
// Subscription Operations
// ============================================
const SubscriptionDB = {
    getActiveByUserId: async (userId) => {
        return queryOne(`
            SELECT s.*, p.name as package_name, p.badge, p.duration_days
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.id
            WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date > NOW()
            ORDER BY s.end_date DESC
            LIMIT 1
        `, [userId]);
    },

    getByUserId: async (userId) => {
        return query(`
            SELECT s.*, p.name as package_name, p.badge
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.id
            WHERE s.user_id = $1
            ORDER BY s.created_at DESC
        `, [userId]);
    },

    create: async (userId, packageId, endDate) => {
        // Handle Date object or string
        const endDataStr = endDate instanceof Date ? endDate.toISOString() : endDate;
        await pool.query(`
            INSERT INTO subscriptions (user_id, package_id, end_date)
            VALUES ($1, $2, $3)
        `, [userId, packageId, endDataStr]);
    },

    extend: async (subscriptionId, newEndDate) => {
        const endDataStr = newEndDate instanceof Date ? newEndDate.toISOString() : newEndDate;
        await pool.query('UPDATE subscriptions SET end_date = $1 WHERE id = $2', [endDataStr, subscriptionId]);
    },

    cancel: async (subscriptionId) => {
        await pool.query("UPDATE subscriptions SET status = 'cancelled' WHERE id = $1", [subscriptionId]);
    },

    expireOld: async () => {
        await pool.query(`
            UPDATE subscriptions 
            SET status = 'expired' 
            WHERE status = 'active' AND end_date <= NOW()
        `);
    },

    getAll: async (status = null, limit = 100, offset = 0) => {
        if (status) {
            return query(`
                SELECT s.*, p.name as package_name, p.badge, 
                       u.username, u.discord_id, u.avatar
                FROM subscriptions s
                JOIN packages p ON s.package_id = p.id
                JOIN users u ON s.user_id = u.id
                WHERE s.status = $1
                ORDER BY s.created_at DESC LIMIT $2 OFFSET $3
            `, [status, limit, offset]);
        }
        return query(`
            SELECT s.*, p.name as package_name, p.badge, 
                   u.username, u.discord_id, u.avatar
            FROM subscriptions s
            JOIN packages p ON s.package_id = p.id
            JOIN users u ON s.user_id = u.id
            ORDER BY s.created_at DESC LIMIT $1 OFFSET $2
        `, [limit, offset]);
    },

    countActive: async () => {
        const result = await queryOne(`
            SELECT COUNT(*) as count FROM subscriptions 
            WHERE status = 'active' AND end_date > NOW()
        `);
        return parseInt(result?.count || 0);
    }
};

// ============================================
// Status Configuration Operations
// ============================================
const StatusConfigDB = {
    getByUserId: async (userId) => {
        return queryOne('SELECT * FROM status_configs WHERE user_id = $1', [userId]);
    },

    getByDiscordId: async (discordId) => {
        return queryOne(`
            SELECT sc.* FROM status_configs sc
            JOIN users u ON sc.user_id = u.id
            WHERE u.discord_id = $1
        `, [discordId]);
    },

    upsert: async (userId, config) => {
        const existing = await StatusConfigDB.getByUserId(userId);

        if (existing) {
            await pool.query(`
                UPDATE status_configs SET
                    page1_text1 = $1, page1_text2 = $2, page1_text3 = $3, page1_image = $4,
                    page2_text1 = $5, page2_text2 = $6, page2_text3 = $7, page2_image = $8,
                    is_enabled = $9, discord_token = COALESCE($10, discord_token), updated_at = NOW()
                WHERE user_id = $11
            `, [
                config.page1_text1 || '', config.page1_text2 || '', config.page1_text3 || '', config.page1_image || '',
                config.page2_text1 || '', config.page2_text2 || '', config.page2_text3 || '', config.page2_image || '',
                config.is_enabled !== undefined ? config.is_enabled : 1,
                config.discord_token || null,
                userId
            ]);
        } else {
            await pool.query(`
                INSERT INTO status_configs (
                    user_id, 
                    page1_text1, page1_text2, page1_text3, page1_image,
                    page2_text1, page2_text2, page2_text3, page2_image,
                    is_enabled, discord_token
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                userId,
                config.page1_text1 || '', config.page1_text2 || '', config.page1_text3 || '', config.page1_image || '',
                config.page2_text1 || '', config.page2_text2 || '', config.page2_text3 || '', config.page2_image || '',
                config.is_enabled !== undefined ? config.is_enabled : 1,
                config.discord_token || null
            ]);
        }
    },

    toggleEnabled: async (userId) => {
        await pool.query(`
            UPDATE status_configs 
            SET is_enabled = CASE WHEN is_enabled = 1 THEN 0 ELSE 1 END, updated_at = NOW() 
            WHERE user_id = $1
        `, [userId]);
    }
};

// ============================================
// Topup Operations
// ============================================
const TopupDB = {
    create: async (userId, amount, reference, source = 'discord_bot') => {
        const res = await pool.query(`
            INSERT INTO topups (user_id, amount, reference, source)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `, [userId, amount, reference, source]);
        return res.rows[0].id;
    },

    getByUserId: async (userId, limit = 20) => {
        return query('SELECT * FROM topups WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    },

    getAll: async (limit = 100, offset = 0) => {
        return query(`
            SELECT t.*, u.username, u.discord_id
            FROM topups t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
    },

    getTotalAmount: async () => {
        const result = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM topups');
        return parseInt(result?.total || 0);
    }
};

// ============================================
// Transaction Operations
// ============================================
const TransactionDB = {
    create: async (userId, type, amount, description, balanceAfter, referenceId = null) => {
        await pool.query(`
            INSERT INTO transactions (user_id, type, amount, description, balance_after, reference_id)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [userId, type, amount, description, balanceAfter, referenceId]);
    },

    getByUserId: async (userId, limit = 50) => {
        return query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2', [userId, limit]);
    }
};

// ============================================
// Settings Operations
// ============================================
const SettingsDB = {
    get: async (key) => {
        const row = await queryOne('SELECT value FROM settings WHERE key = $1', [key]);
        return row ? row.value : null;
    },

    set: async (key, value) => {
        // Upsert for settings
        await pool.query(`
            INSERT INTO settings (key, value) VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
        `, [key, value]);
    },

    getAll: async () => {
        const rows = await query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        return settings;
    }
};

// ============================================
// Stats for Dashboard
// ============================================
const StatsDB = {
    getDashboardStats: async () => {
        // Run in parallel for speed
        const [totalUsers, activeSubscriptions, totalRevenue, packages] = await Promise.all([
            UserDB.count(),
            SubscriptionDB.countActive(),
            TopupDB.getTotalAmount(),
            PackageDB.getActive()
        ]);

        return {
            totalUsers,
            activeSubscriptions,
            totalRevenue,
            packages
        };
    }
};

// Export everything
module.exports = {
    pool,
    initializeDatabase,
    query,
    queryOne,
    UserDB,
    PackageDB,
    SubscriptionDB,
    StatusConfigDB,
    TopupDB,
    TransactionDB,
    SettingsDB,
    StatsDB
};
