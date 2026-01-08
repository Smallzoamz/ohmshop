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
            console.log(`🗑️ Found ${rows.length} duplicate packages.`);

            for (const row of rows) {
                // Find master ID for this package type
                const masterRes = await client.query(`
                    SELECT MIN(id) as id FROM packages 
                    WHERE name = $1 AND duration_days = $2
                `, [row.name, row.duration_days]);

                const masterId = masterRes.rows[0].id;

                if (masterId && masterId !== row.id) {
                    console.log(`🔄 Reassigning subscriptions from Package ${row.id} to ${masterId}...`);
                    await client.query(`
                        UPDATE subscriptions 
                        SET package_id = $1 
                        WHERE package_id = $2
                    `, [masterId, row.id]);

                    console.log(`❌ Deleting duplicate Package ${row.id}...`);
                    await client.query('DELETE FROM packages WHERE id = $1', [row.id]);
                }
            }

            console.log('✅ Duplicates cleaned up.');
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
