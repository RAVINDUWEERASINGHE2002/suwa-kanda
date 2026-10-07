import db, { initDatabase } from './db.js';

const menuItemsSeed = [
    { name: 'Kola Kanda', sinhala_name: 'කොළ කැඳ', price: 120, station_id: 'kola', is_active: 1 },
    { name: 'Saw Kanda', sinhala_name: 'සව් කැඳ', price: 130, station_id: 'grain', is_active: 1 },
    { name: 'Kurakkan Kanda', sinhala_name: 'කුරක්කන් කැඳ', price: 140, station_id: 'grain', is_active: 1 },
    { name: 'Hathawariya Kanda', sinhala_name: 'හතාවරිය කැඳ', price: 150, station_id: 'herbal', is_active: 1 },
    { name: 'Polpala Kanda', sinhala_name: 'පොල්පලා කැඳ', price: 130, station_id: 'herbal', is_active: 1 },
    { name: 'Mung Kanda', sinhala_name: 'මුං කැඳ', price: 120, station_id: 'kola', is_active: 1 }
];

const partnersSeed = [
    { name: 'Partner 1', share_percentage: 40.0 },
    { name: 'Partner 2', share_percentage: 30.0 },
    { name: 'Partner 3', share_percentage: 30.0 }
];

export function seedDatabase() {
    console.log('[Seed] Ensuring schema exists...');
    initDatabase();

    const insertMenuItem = db.prepare(`
        INSERT INTO menu_items (name, sinhala_name, price, station_id, is_active)
        VALUES (@name, @sinhala_name, @price, @station_id, @is_active)
    `);

    const insertPartner = db.prepare(`
        INSERT INTO partners (name, share_percentage)
        VALUES (@name, @share_percentage)
    `);

    const runSeed = db.transaction(() => {
        // Clear existing seed data or populate if empty
        const currentMenuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items').get().count;
        if (currentMenuCount === 0) {
            console.log('[Seed] Seeding menu items...');
            for (const item of menuItemsSeed) {
                insertMenuItem.run(item);
            }
            console.log(`[Seed] Seeded ${menuItemsSeed.length} menu items.`);
        } else {
            console.log(`[Seed] Menu items already contain ${currentMenuCount} records. Skipping menu seed.`);
        }

        const currentPartnersCount = db.prepare('SELECT COUNT(*) as count FROM partners').get().count;
        if (currentPartnersCount === 0) {
            console.log('[Seed] Seeding partners...');
            for (const partner of partnersSeed) {
                insertPartner.run(partner);
            }
            console.log(`[Seed] Seeded ${partnersSeed.length} partners.`);
        } else {
            console.log(`[Seed] Partners already contain ${currentPartnersCount} records. Skipping partner seed.`);
        }
    });

    runSeed();

    // Verify & log results
    const menuItems = db.prepare('SELECT id, name, sinhala_name, price, station_id, is_active FROM menu_items').all();
    const partners = db.prepare('SELECT id, name, share_percentage FROM partners').all();

    console.log('\n--- VERIFICATION: Menu Items ---');
    console.table(menuItems);

    console.log('\n--- VERIFICATION: Partners ---');
    console.table(partners);

    console.log('\n[Seed] Database seeding completed successfully.');
}

// If executed directly from command line
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
    seedDatabase();
}
