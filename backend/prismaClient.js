const path = require('path');
// Load .env trước khi PrismaClient được tạo
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { PrismaClient } = require('@prisma/client');

// Prisma v5 đọc DATABASE_URL từ env tự động qua schema.prisma
const prisma = new PrismaClient();

module.exports = prisma;
