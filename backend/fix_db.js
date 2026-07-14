require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { db } = require('./db');

async function fixDB() {
  try {
    await db.query(`
      IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'pickup_date' AND Object_ID = Object_ID(N'repair_bookings'))
      BEGIN
          ALTER TABLE repair_bookings ADD pickup_date DATETIME;
      END
      IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'replaced_parts' AND Object_ID = Object_ID(N'repair_bookings'))
      BEGIN
          ALTER TABLE repair_bookings ADD replaced_parts NVARCHAR(MAX);
      END
      IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'fault_report' AND Object_ID = Object_ID(N'repair_bookings'))
      BEGIN
          ALTER TABLE repair_bookings ADD fault_report NVARCHAR(MAX);
      END
    `);
    console.log("DB columns added!");
  } catch(e) {
    console.error("DB error:", e);
  } finally {
    process.exit(0);
  }
}
fixDB();
