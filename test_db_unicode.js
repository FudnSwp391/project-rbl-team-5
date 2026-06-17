const { db } = require('./backend/db');

async function check() {
  try {
    console.log("Querying users...");
    const users = await db.find('users');
    users.forEach(u => {
      console.log(`ID: ${u.id} | Username: ${u.username} | Email: ${u.email} | FullName: ${u.full_name} | RoleID: ${u.role_id}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
