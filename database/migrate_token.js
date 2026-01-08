/**
 * Migration Script: Add discord_token to status_configs
 * Run this on the server: node database/migrate_token.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        const client = await pool.connect();
        console.log('🔌 Connected to Database...');

        console.log('🛠️ Adding discord_token column to status_configs table...');

        await client.query(`
            ALTER TABLE status_configs 
            ADD COLUMN IF NOT EXISTS discord_token TEXT;
        `);

        console.log('✅ Migration Successful! Column added.');
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
}

migrate();
