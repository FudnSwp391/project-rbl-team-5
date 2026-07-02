const { db } = require('./backend/db');
db.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'repair_bookings'")
  .then(r => { console.log(r.recordset); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
