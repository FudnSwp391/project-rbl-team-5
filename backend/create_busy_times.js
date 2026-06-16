const { db } = require('./db');

async function run() {
  try {
    console.log("Checking and creating technician_busy_times table...");
    await db.query(`
      IF OBJECT_ID('dbo.technician_busy_times', 'U') IS NULL
      BEGIN
          CREATE TABLE dbo.technician_busy_times (
              id INT IDENTITY(1,1) PRIMARY KEY,
              technician_id INT NOT NULL FOREIGN KEY REFERENCES dbo.technician_profiles(id) ON DELETE CASCADE,
              busy_date DATE NOT NULL,
              busy_time VARCHAR(50) NOT NULL,
              reason NVARCHAR(500) NULL,
              created_at DATETIME DEFAULT GETDATE()
          );
          PRINT 'Created table technician_busy_times.';
      END
      ELSE
      BEGIN
          PRINT 'Table technician_busy_times already exists.';
      END
    `);
    console.log("Database operation completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to run DB operation:", err);
    process.exit(1);
  }
}

run();
