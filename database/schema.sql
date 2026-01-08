-- Discord Streaming Status Rental System
-- Database Schema v1.0
-- © 2026 Bonchon-Studio

-- Users Table: เก็บข้อมูล User จาก Discord OAuth
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    discriminator TEXT DEFAULT '0',
    global_name TEXT,
    avatar TEXT,
    email TEXT,
    balance INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Packages Table: แพ็คเกจเช่าสถานะ
CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    badge TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_popular INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default Packages Data
INSERT OR IGNORE INTO packages (id, name, duration_days, price, description, badge, is_popular, sort_order) VALUES
(1, 'Basic', 7, 10, 'เหมาะสำหรับทดลองใช้งาน', '🥉', 0, 1),
(2, 'Standard', 15, 15, 'คุ้มค่าที่สุด!', '🥈', 1, 2),
(3, 'Premium', 30, 30, 'สำหรับผู้ใช้งานจริงจัง', '🥇', 0, 3);

-- Subscriptions Table: การสมัครใช้บริการของ User
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    package_id INTEGER NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NOT NULL,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id)
);

-- Status Configurations Table: การตั้งค่าสถานะของ User (2 หน้า)
CREATE TABLE IF NOT EXISTS status_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    -- Page 1: สถานะหน้าที่ 1
    page1_text1 TEXT DEFAULT '',
    page1_text2 TEXT DEFAULT '',
    page1_text3 TEXT DEFAULT '',
    page1_image TEXT DEFAULT '',
    -- Page 2: สถานะหน้าที่ 2
    page2_text1 TEXT DEFAULT '',
    page2_text2 TEXT DEFAULT '',
    page2_text3 TEXT DEFAULT '',
    page2_image TEXT DEFAULT '',
    -- Metadata
    is_enabled INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Topups Table: ประวัติการเติมเงิน
CREATE TABLE IF NOT EXISTS topups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    reference TEXT,
    source TEXT DEFAULT 'discord_bot',
    verified INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Transactions Table: ประวัติธุรกรรมทั้งหมด
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('topup', 'purchase', 'refund', 'adjustment')),
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    description TEXT,
    reference_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Site Settings Table: การตั้งค่าเว็บไซต์
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default Settings
INSERT OR IGNORE INTO settings (key, value) VALUES
('site_name', 'Streaming Status Shop'),
('site_description', 'บริการเช่าสถานะสตรีมมิ่งดิสคอร์ด 24/7'),
('discord_server_id', '1452001816437854382'),
('maintenance_mode', '0');

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_topups_user_id ON topups(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_status_configs_user_id ON status_configs(user_id);
