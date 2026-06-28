const { db } = require('./db');

setTimeout(async () => {
  try {
    // Reset all passwords to '123456'
    await db.query("UPDATE users SET password = '123456'");
    
    // Fetch all users
    const r = await db.query("SELECT id, username, email, role_id FROM users");
    console.table(r.recordset);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}, 2000);
