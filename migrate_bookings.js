const { db } = require('./backend/db');

async function runMigration() {
  try {
    console.log('Adding pickup_date...');
    await db.query(`ALTER TABLE repair_bookings ADD pickup_date DATETIME`);
  } catch (e) {
    console.log('pickup_date already exists or error:', e.message);
  }

  try {
    console.log('Adding replaced_parts...');
    await db.query(`ALTER TABLE repair_bookings ADD replaced_parts NVARCHAR(MAX)`);
  } catch (e) {
    console.log('replaced_parts already exists or error:', e.message);
  }

  try {
    console.log('Adding fault_report...');
    await db.query(`ALTER TABLE repair_bookings ADD fault_report NVARCHAR(MAX)`);
  } catch (e) {
    console.log('fault_report already exists or error:', e.message);
  }

  console.log('Done!');
  process.exit(0);
}

runMigration();
