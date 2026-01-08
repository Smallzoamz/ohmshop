/**
 * Database Initialization Script (sql.js Version)
 * Run: npm run init-db
 */

const { initializeDatabase, query, getDb } = require('./db');

async function main() {
    console.log('🚀 Initializing database...\n');

    try {
        await initializeDatabase();

        // Verify tables created
        const tables = await query(`
            SELECT table_name as name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('\n📋 Tables created:');
        tables.forEach(t => console.log(`   ✓ ${t.name}`));

        // Show default packages
        const packages = await query('SELECT * FROM packages');
        console.log('\n📦 Default packages:');
        packages.forEach(p => {
            console.log(`   ${p.badge} ${p.name}: ${p.duration_days} วัน = ฿${p.price}`);
        });

        console.log('\n✅ Database ready!\n');

    } catch (err) {
        console.error('❌ Initialization failed:', err.message);
        process.exit(1);
    }
}

main();
