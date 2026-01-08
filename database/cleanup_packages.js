/**
 * Cleanup Script: Remove duplicate packages
 * Run this on the server: node database/cleanup_packages.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
});

async function cleanup() {
    try {
        const client = await pool.connect();
        console.log('🔌 Connected to Database...');

        console.log('🧹 Cleaning up duplicate packages...');

        // 1. Find duplicates (Keep the one with the smallest ID - usually the first one)
        const { rows } = await client.query(`
            SELECT id, name, duration_days 
            FROM packages 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM packages 
                GROUP BY name, duration_days
            )
        `);

        if (rows.length === 0) {
            console.log('✨ No duplicates found.');
        } else {
            console.log(`🗑️ Found ${rows.length} duplicate packages. Deleting...`);

            const idsToDelete = rows.map(r => r.id);
            await client.query(`
                DELETE FROM packages 
                WHERE id = ANY($1::int[])
            `, [idsToDelete]);

            console.log('✅ Duplicates deleted.');
        }

        // 2. Add Unique Constraint to prevent future duplicates
        console.log('🛡️ Adding Unique Constraint...');
        await client.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_unique 
            ON packages(name, duration_days);
        `);

        console.log('✅ Index created. Future duplicates will be blocked.');

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Cleanup Failed:', err);
        process.exit(1);
    }
}

cleanup();
