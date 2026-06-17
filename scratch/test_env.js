const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

console.log('EMAIL_USER:', JSON.stringify(process.env.EMAIL_USER));
console.log('EMAIL_PASS:', JSON.stringify(process.env.EMAIL_PASS));
console.log('EMAIL_FROM:', JSON.stringify(process.env.EMAIL_FROM));
