const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const TABLES = {
  users: 'users.json',
  products: 'products.json',
  bookings: 'bookings.json',
  orders: 'orders.json',
  messages: 'messages.json'
};

// Initialize file if not exists
function initTable(tableName, defaultData = []) {
  const filePath = path.join(DATA_DIR, TABLES[tableName]);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

// Read database table
function readTable(tableName) {
  const filePath = path.join(DATA_DIR, TABLES[tableName]);
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading table ${tableName}:`, err);
    return [];
  }
}

// Write database table
function writeTable(tableName, data) {
  const filePath = path.join(DATA_DIR, TABLES[tableName]);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing table ${tableName}:`, err);
    return false;
  }
}

// Helper: generate IDs
const generateId = () => Math.random().toString(36).substring(2, 11);

// DB API methods
const db = {
  find: (table, query = {}) => {
    const data = readTable(table);
    return data.filter(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  },

  findOne: (table, query = {}) => {
    const data = readTable(table);
    return data.find(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  },

  insert: (table, record) => {
    const data = readTable(table);
    const newRecord = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...record
    };
    data.push(newRecord);
    writeTable(table, data);
    return newRecord;
  },

  update: (table, id, updates) => {
    const data = readTable(table);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;
    data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
    writeTable(table, data);
    return data[index];
  },

  delete: (table, id) => {
    const data = readTable(table);
    const filtered = data.filter(item => item.id !== id);
    writeTable(table, filtered);
    return true;
  }
};

// Seed initial data
async function seedData() {
  // 1. Seed users
  initTable('users');
  const users = readTable('users');
  if (users.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    const seedUsers = [
      {
        id: 'usr_admin',
        username: 'admin',
        email: 'admin@techcycle.vn',
        password: hashedPassword,
        phone: '0912345678',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_seller',
        username: 'Eco Seller',
        email: 'seller@techcycle.vn',
        password: hashedPassword,
        phone: '0909090909',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_tech1',
        username: 'Kỹ thuật viên Minh',
        email: 'minh.tech@techcycle.vn',
        password: hashedPassword,
        phone: '0987654321',
        role: 'technician',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_tech2',
        username: 'Kỹ thuật viên Lan',
        email: 'lan.tech@techcycle.vn',
        password: hashedPassword,
        phone: '0933445566',
        role: 'technician',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_cust',
        username: 'Hoàng Nguyễn',
        email: 'customer@gmail.com',
        password: hashedPassword,
        phone: '0900112233',
        role: 'customer',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        createdAt: new Date().toISOString()
      }
    ];
    writeTable('users', seedUsers);
  }

  // 2. Seed products
  initTable('products');
  const products = readTable('products');
  if (products.length === 0) {
    const seedProducts = [
      {
        id: 'prod_1',
        name: 'Máy giặt LG Inverter 9kg',
        description: 'Máy giặt cửa trước LG Inverter tiết kiệm điện nước tối ưu, truyền động trực tiếp êm ái, công nghệ giặt 6 chuyển động làm sạch sâu bảo vệ sợi vải. Tình trạng 95% nguyên bản.',
        price: 5200000,
        image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600',
        category: 'WashingMachine',
        condition: 'excellent',
        sellerId: 'usr_admin',
        status: 'available',
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_2',
        name: 'Tủ lạnh Samsung Inverter 488L',
        description: 'Tủ lạnh Multidoor Samsung 4 cánh sang trọng, dung tích cực lớn cho gia đình, hai dàn lạnh độc lập Twin Cooling Plus giữ thực phẩm tươi ngon mọng nước lâu gấp 2 lần. Ngoại hình đẹp keng.',
        price: 8500000,
        image: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=600',
        category: 'Refrigerator',
        condition: 'excellent',
        sellerId: 'usr_admin',
        status: 'available',
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_3',
        name: 'Máy lạnh Daikin Inverter 1.5 HP',
        description: 'Máy lạnh Daikin 1.5 ngựa Inverter tiết kiệm điện năng tiêu thụ, công nghệ gió Coanda dễ chịu bảo vệ sức khỏe gia đình, phin lọc Enzyme Blue khử mùi diệt khuẩn tối ưu. Tình trạng hoàn hảo.',
        price: 7200000,
        image: 'https://images.unsplash.com/photo-16219051189-08b45d6a269e?w=600',
        category: 'AirConditioner',
        condition: 'excellent',
        sellerId: 'usr_admin',
        status: 'available',
        createdAt: new Date().toISOString()
      },
      {
        id: 'prod_4',
        name: 'Lò vi sóng Sharp 23L',
        description: 'Lò vi sóng Sharp dung tích 23L tiện lợi, tích hợp thêm chức năng nướng thực phẩm, bảng điều khiển cơ bền bỉ trực quan, khoang lò phủ men xám kháng khuẩn dễ dàng lau dọn.',
        price: 1800000,
        image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600',
        category: 'Microwave',
        condition: 'good',
        sellerId: 'usr_admin',
        status: 'available',
        createdAt: new Date().toISOString()
      }
    ];
    writeTable('products', seedProducts);
  }

  // 3. Seed bookings
  initTable('bookings');
  const bookings = readTable('bookings');
  if (bookings.length === 0) {
    const seedBookings = [
      {
        id: 'bk_1',
        customerId: 'usr_cust',
        technicianId: 'usr_tech1',
        deviceType: 'Điện thoại (iPhone)',
        issueDescription: 'Màn hình bị sọc xanh và cảm ứng chập chờn sau khi bị rơi nhẹ. Cần thay màn hình mới.',
        preferredDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], // 2 days ago
        preferredTime: '10:00 - 12:00',
        status: 'completed',
        cost: 1500000,
        notes: 'Đã thay màn hình zin bóc máy, bảo hành 3 tháng.',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'bk_2',
        customerId: 'usr_cust',
        technicianId: 'usr_tech2',
        deviceType: 'Laptop (Macbook)',
        issueDescription: 'Pin bị phồng nhẹ, nhanh hết pin (chỉ dùng được khoảng 1 tiếng). Cần kiểm tra và thay pin.',
        preferredDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
        preferredTime: '14:00 - 16:00',
        status: 'assigned',
        cost: 1800000,
        notes: 'Chờ khách mang máy qua hoặc kỹ thuật qua lấy.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'bk_3',
        customerId: 'usr_cust',
        technicianId: null,
        deviceType: 'Máy tính bảng (iPad)',
        issueDescription: 'Cắm sạc không vào điện, cổng sạc lỏng lẻo. Đã thử nhiều cáp sạc khác nhau.',
        preferredDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // in 2 days
        preferredTime: '08:00 - 10:00',
        status: 'pending',
        cost: 0,
        notes: '',
        createdAt: new Date().toISOString()
      }
    ];
    writeTable('bookings', seedBookings);
  }

  // 4. Seed orders
  initTable('orders');
  const orders = readTable('orders');
  if (orders.length === 0) {
    const seedOrders = [
      {
        id: 'ord_1',
        customerId: 'usr_cust',
        items: [
          { productId: 'prod_4', name: 'Tai nghe Sony WH-1000XM4', price: 3400000 }
        ],
        shippingInfo: {
          fullName: 'Hoàng Nguyễn',
          address: '123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh',
          phone: '0900112233',
          notes: 'Giao giờ hành chính'
        },
        paymentMethod: 'cod',
        totalAmount: 3400000,
        status: 'completed',
        invoiceNumber: 'INV-2026-0001',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
      },
      {
        id: 'ord_2',
        customerId: 'usr_cust',
        items: [
          { productId: 'prod_6', name: 'Apple Watch Series 7 45mm GPS', price: 4900000 }
        ],
        shippingInfo: {
          fullName: 'Hoàng Nguyễn',
          address: '123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh',
          phone: '0900112233',
          notes: ''
        },
        paymentMethod: 'bank_transfer',
        totalAmount: 4900000,
        status: 'shipping',
        invoiceNumber: 'INV-2026-0002',
        createdAt: new Date().toISOString()
      }
    ];
    writeTable('orders', seedOrders);
  }

  // 5. Seed messages
  initTable('messages');
  const messages = readTable('messages');
  if (messages.length === 0) {
    const seedMessages = [
      {
        id: 'msg_1',
        senderId: 'usr_cust',
        receiverId: 'usr_tech1',
        bookingId: 'bk_1',
        text: 'Chào anh Minh, điện thoại của em khi nào thì thay xong ạ?',
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString()
      },
      {
        id: 'msg_2',
        senderId: 'usr_tech1',
        receiverId: 'usr_cust',
        bookingId: 'bk_1',
        text: 'Chào bạn, hiện tại mình đang kiểm tra linh kiện màn hình thay thế. Dự kiến chiều nay khoảng 15:00 là xong nhé.',
        timestamp: new Date(Date.now() - 86400000 * 3 + 600000).toISOString()
      },
      {
        id: 'msg_3',
        senderId: 'usr_cust',
        receiverId: 'usr_tech1',
        bookingId: 'bk_1',
        text: 'Dạ vâng, cảm ơn anh. Có gì xong báo em qua lấy nha.',
        timestamp: new Date(Date.now() - 86400000 * 3 + 1200000).toISOString()
      },
      {
        id: 'msg_4',
        senderId: 'usr_tech1',
        receiverId: 'usr_cust',
        bookingId: 'bk_1',
        text: 'Đã hoàn thành thay màn hình rồi nhé bạn. Bạn có thể qua cửa hàng nhận máy.',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString()
      }
    ];
    writeTable('messages', seedMessages);
  }
}

seedData();

module.exports = db;
