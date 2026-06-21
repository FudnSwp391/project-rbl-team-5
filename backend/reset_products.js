const { db } = require('./db');

async function resetProducts() {
    try {
        await db.query(`UPDATE products SET status = 'active' WHERE status = 'sold_out'`);
        console.log("Đã reset tất cả sản phẩm về trạng thái 'active'.");
        process.exit(0);
    } catch (err) {
        console.error("Lỗi:", err);
        process.exit(1);
    }
}

resetProducts();
