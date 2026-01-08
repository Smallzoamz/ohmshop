-- Discord Streaming Status Rental System
-- Database Schema v1.0 (PostgreSQL Version)
-- © 2026 Bonchon-Studio

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    discriminator TEXT DEFAULT '0',
    global_name TEXT,
    avatar TEXT,
    email TEXT,
    balance INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    badge TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_popular INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Packages Data
-- Ensure Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_unique ON packages(name, duration_days);

-- Default Packages Data
INSERT INTO packages (name, duration_days, price, description, badge, is_popular, sort_order)
VALUES
('Basic', 7, 10, 'เหมาะสำหรับทดลองใช้งาน', '🥉', 0, 1),
('Standard', 15, 15, 'คุ้มค่าที่สุด!', '🥈', 1, 2),
('Premium', 30, 30, 'สำหรับผู้ใช้งานจริงจัง', '🥇', 0, 3)
ON CONFLICT (name, duration_days) DO NOTHING;

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES packages(id),
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Status Configurations Table
CREATE TABLE IF NOT EXISTS status_configs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    page1_text1 TEXT DEFAULT '',
    page1_text2 TEXT DEFAULT '',
    page1_text3 TEXT DEFAULT '',
    page1_image TEXT DEFAULT '',
    page2_text1 TEXT DEFAULT '',
    page2_text2 TEXT DEFAULT '',
    page2_text3 TEXT DEFAULT '',
    page2_image TEXT DEFAULT '',
    page2_image TEXT DEFAULT '',
    is_enabled INTEGER DEFAULT 1,
    discord_token TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topups Table
CREATE TABLE IF NOT EXISTS topups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reference TEXT,
    source TEXT DEFAULT 'discord_bot',
    verified INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('topup', 'purchase', 'refund', 'adjustment')),
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    description TEXT,
    reference_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Site Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Settings
INSERT INTO settings (key, value)
VALUES
('site_name', 'Streaming Status Shop'),
('site_description', 'บริการเช่าสถานะสตรีมมิ่งดิสคอร์ด 24/7'),
('discord_server_id', '1452001816437854382'),
('maintenance_mode', '0')
ON CONFLICT (key) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_topups_user_id ON topups(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_status_configs_user_id ON status_configs(user_id);
