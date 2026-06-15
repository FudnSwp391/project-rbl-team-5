-- ============================================================
-- TECHCYCLE DATABASE - MASTER INTEGRATED SCRIPT (T-SQL)
-- Nền tảng mua bán đồ cũ + Đặt lịch sửa chữa + Đánh giá AI
-- Mật khẩu lưu dạng PLAIN TEXT (Không mã hóa/băm) để dễ test
-- ============================================================

USE master;
GO

-- Xóa database cũ nếu tồn tại để làm sạch cấu trúc trước khi khởi tạo
IF EXISTS (SELECT name FROM sys.databases WHERE name = N'techcycle_db')
    DROP DATABASE techcycle_db;
GO

CREATE DATABASE techcycle_db;
GO

USE techcycle_db;
GO

/* ==========================================================
   PART 1: KHỞI TẠO CẤU TRÚC BẢNG (DDL) & ĐỊNH NGHĨA RÀNG BUỘC
   ========================================================== */

/* 1.1 - Bảng Roles (Vai trò người dùng) */
CREATE TABLE roles (
    id INT PRIMARY KEY IDENTITY(1,1),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

/* 1.2 - Bảng Users (Tài khoản chính - Plain text password, hỗ trợ Unicode cho username) */
CREATE TABLE users (
    id INT PRIMARY KEY IDENTITY(1,1),
    role_id INT NOT NULL,
    username NVARCHAR(50) UNIQUE NOT NULL,  -- Dùng để Login (NVARCHAR hỗ trợ Tiếng Việt)
    email VARCHAR(100) UNIQUE NOT NULL,    -- Dùng để Login / Khôi phục
    password VARCHAR(255) NOT NULL,        -- LƯU CHUỖI GỐC KHÔNG MÃ HÓA (Plain Text)
    full_name NVARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,     
    avatar VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'active',   -- active, suspended, inactive
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE NO ACTION
);
CREATE INDEX idx_login_username ON users(username);
CREATE INDEX idx_login_email ON users(email);

/* 1.3 - Hồ sơ Khách Hàng (Customer Profiles) */
CREATE TABLE customer_profiles (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT UNIQUE NOT NULL,
    address NVARCHAR(255) NOT NULL,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

/* 1.4 - Hồ sơ Thợ Sửa Chữa (Technician Profiles) */
CREATE TABLE technician_profiles (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT UNIQUE NOT NULL,
    experience_years INT NOT NULL,
    bio NVARCHAR(MAX) NULL,
    rating_avg DECIMAL(3,2) DEFAULT 0.00,
    is_available BIT DEFAULT 1,
    total_repairs INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_tech_availability ON technician_profiles(is_available);

/* 1.5 - Hồ sơ Người Bán / Cửa Hàng (Seller Profiles) */
CREATE TABLE seller_profiles (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT UNIQUE NOT NULL,
    shop_name NVARCHAR(100) NOT NULL,
    balance DECIMAL(12,2) DEFAULT 0.00,
    total_products_sold INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

/* 1.6 - Danh mục dịch vụ sửa chữa */
CREATE TABLE service_categories (
    id INT PRIMARY KEY IDENTITY(1,1),
    category_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE()
);

/* 1.7 - Kỹ năng chuyên môn của thợ */
CREATE TABLE technician_skills (
    technician_id INT NOT NULL,
    category_id INT NOT NULL,
    expertise_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, expert
    PRIMARY KEY (technician_id, category_id),
    FOREIGN KEY (technician_id) REFERENCES technician_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
);

/* 1.8 - Yêu cầu sửa chữa thiết bị (Tích hợp định giá và phân tích từ AI) */
CREATE TABLE repair_requests (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT NOT NULL,
    category_id INT NULL,
    user_description NVARCHAR(MAX) NOT NULL,
    ai_raw_response NVARCHAR(MAX) NULL,
    ai_damage_level VARCHAR(20) NULL,      -- Light, Medium, Heavy
    ai_conclusion NVARCHAR(255) NULL,
    ai_recommendation NVARCHAR(MAX) NULL,
    status VARCHAR(20) DEFAULT 'pending_ai', -- pending_ai, approved, rejected
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
);

/* 1.9 - Lịch hẹn đặt thợ sửa chữa (technician_id là NULL để hỗ trợ đặt thợ chưa phân công) */
CREATE TABLE repair_bookings (
    id INT PRIMARY KEY IDENTITY(1,1),
    repair_request_id INT UNIQUE NOT NULL,
    technician_id INT NULL,
    appointment_date DATETIME NOT NULL,
    quoted_price DECIMAL(12,2) NULL,
    address NVARCHAR(255) NOT NULL,
    notes NVARCHAR(MAX) NULL,
    status VARCHAR(30) DEFAULT 'pending_confirm', -- pending_confirm, confirmed, repairing, completed, cancelled
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (technician_id) REFERENCES technician_profiles(id) ON DELETE NO ACTION
);

/* 1.10 - Nhật ký theo dõi tiến độ sửa chữa */
CREATE TABLE repair_status_logs (
    id INT PRIMARY KEY IDENTITY(1,1),
    booking_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes NVARCHAR(MAX) NULL,
    changed_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (booking_id) REFERENCES repair_bookings(id) ON DELETE CASCADE
);

/* 1.11 - Danh mục sản phẩm công nghệ thanh lý */
CREATE TABLE product_categories (
    id INT PRIMARY KEY IDENTITY(1,1),
    category_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE()
);

/* 1.12 - Sản phẩm đăng bán (Tích hợp AI Định giá thông minh) */
CREATE TABLE products (
    id INT PRIMARY KEY IDENTITY(1,1),
    seller_id INT NOT NULL,
    category_id INT NOT NULL,
    title NVARCHAR(255) NOT NULL,
    user_description NVARCHAR(MAX) NOT NULL,
    ai_condition NVARCHAR(50) NULL,        -- Đánh giá độ mới qua AI
    ai_min_price DECIMAL(12,2) NULL,       -- Giá sàn AI gợi ý
    ai_max_price DECIMAL(12,2) NULL,       -- Giá trần AI gợi ý
    ai_analysis NVARCHAR(MAX) NULL,
    listed_price DECIMAL(12,2) NOT NULL,    -- Giá thực tế người bán niêm yết
    stock INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',   -- active, sold_out, hidden
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (seller_id) REFERENCES seller_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE NO ACTION
);
CREATE INDEX idx_products_search ON products(category_id, status);

/* 1.13 - Bộ sưu tập hình ảnh sản phẩm */
CREATE TABLE product_images (
    id INT PRIMARY KEY IDENTITY(1,1),
    product_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

/* 1.14 - Giỏ hàng người dùng */
CREATE TABLE carts (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE CASCADE
);

/* 1.15 - Chi tiết các mặt hàng trong giỏ */
CREATE TABLE cart_items (
    id INT PRIMARY KEY IDENTITY(1,1),
    cart_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    added_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE NO ACTION,
    UNIQUE (cart_id, product_id)
);

/* 1.16 - Đơn hàng mua sắm thiết bị đồ cũ */
CREATE TABLE orders (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    shipping_address NVARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',   -- pending, processing, delivered, cancelled
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE NO ACTION
);

/* 1.17 - Chi tiết sản phẩm trong đơn hàng */
CREATE TABLE order_items (
    id INT PRIMARY KEY IDENTITY(1,1),
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE NO ACTION
);

/* 1.18 - Quản lý vận chuyển đơn hàng */
CREATE TABLE deliveries (
    id INT PRIMARY KEY IDENTITY(1,1),
    order_id INT UNIQUE NOT NULL,
    delivery_service_name NVARCHAR(100) NULL,
    tracking_number VARCHAR(100) UNIQUE NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, shipping, delivered
    estimated_delivery DATETIME NULL,
    actual_delivery DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

/* 1.19 - Quản lý giao dịch thanh toán (Cho cả Đơn hàng & Lịch đặt sửa chữa) */
CREATE TABLE payments (
    id INT PRIMARY KEY IDENTITY(1,1),
    order_id INT NULL,
    booking_id INT NULL,
    payment_method VARCHAR(20) NOT NULL,   -- cod, vnpay, momo
    transaction_id VARCHAR(100) NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',   -- pending, success, failed
    paid_at DATETIME NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (booking_id) REFERENCES repair_bookings(id) ON DELETE SET NULL
);

/* 1.20 - Đánh giá và Phản hồi khách hàng */
CREATE TABLE reviews (
    id INT PRIMARY KEY IDENTITY(1,1),
    customer_id INT NOT NULL,
    product_id INT NULL,
    technician_id INT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (customer_id) REFERENCES customer_profiles(id) ON DELETE NO ACTION,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE NO ACTION,
    FOREIGN KEY (technician_id) REFERENCES technician_profiles(id) ON DELETE NO ACTION
);

/* 1.21 - Nhật ký lịch sử trò chuyện trực tiếp (Chat Messages giữa người dùng) */
CREATE TABLE messages (
    id INT PRIMARY KEY IDENTITY(1,1),
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    booking_id INT NULL,
    text_content NVARCHAR(MAX) NOT NULL,
    timestamp DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE NO ACTION,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE NO ACTION
);

/* 1.22 - Nhật ký lịch sử trò chuyện với AI Chatbot */
CREATE TABLE ai_chat_history (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    sender_type VARCHAR(10) NOT NULL,      -- User, AI
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

/* 1.23 - Bảng lưu Token và Hiệu năng tính toán của AI */
CREATE TABLE ai_logs (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    ai_type VARCHAR(30) NOT NULL,          -- valuation, assessment, chatbot
    prompt_tokens INT NULL,
    completion_tokens INT NULL,
    execution_time_ms INT NULL,
    status VARCHAR(20) NOT NULL,           -- success, error
    error_message NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

/* 1.24 - Nhật ký hoạt động của Quản trị viên (Audit Logs) */
CREATE TABLE audit_logs (
    id INT PRIMARY KEY IDENTITY(1,1),
    admin_id INT NOT NULL,
    action NVARCHAR(255) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

/* 1.25 - Thông tin tổng quan hệ thống (System Info) */
CREATE TABLE system_info (
    system_id INT IDENTITY(1,1) PRIMARY KEY,
    system_name NVARCHAR(100) NOT NULL,
    founder_name NVARCHAR(100) NOT NULL,
    founder_role NVARCHAR(50) DEFAULT 'CEO',
    founder_age INT,
    support_email VARCHAR(100),
    hotline VARCHAR(20),
    established_date DATE,
    description NVARCHAR(MAX)
);
GO


/* ==========================================================
   PART 2: CHÈN DỮ LIỆU DANH MỤC & VAI TRÒ GỐC
   ========================================================== */

-- Gán nhóm quyền hệ thống
INSERT INTO roles (role_name) VALUES ('admin'), ('customer'), ('technician'), ('seller');

-- Gán nhóm danh mục sửa chữa
INSERT INTO service_categories (category_name, description) VALUES
(N'Điện thoại', N'Sửa chữa màn hình, pin, phần cứng các dòng Smartphone'),
(N'Laptop', N'Sửa chữa bo mạch, nâng cấp RAM, SSD, vệ sinh máy tính xách tay'),
(N'Máy Giặt', N'Sửa máy giặt cửa trước, cửa trên, máy sấy các loại'),
(N'Tủ Lạnh', N'Sửa tủ lạnh inverter, tủ mát bảo quản thực phẩm'),
(N'Máy Lạnh', N'Sửa chữa các loại máy lạnh dân dụng'),
(N'Thiết Bị Điện Gia Dụng', N'Lò vi sóng, bếp từ, nồi chiên không dầu');

-- Gán nhóm danh mục đồ cũ thanh lý
INSERT INTO product_categories (category_name, description) VALUES
(N'WashingMachine', N'Máy giặt lồng đứng, lồng ngang cũ giá tốt'),
(N'Refrigerator', N'Tủ lạnh gia đình tiết kiệm điện năng'),
(N'AirConditioner', N'Hệ thống điều hòa thanh lý'),
(N'Audio', N'Tai nghe bluetooth, loa không dây, phụ kiện âm thanh'),
(N'Laptop', N'Laptop văn phòng, laptop gaming giá tốt'),
(N'Smartwatch', N'Đồng hồ thông minh qua sử dụng');

-- Lưu trữ cấu hình hệ thống TechCycle
INSERT INTO system_info (system_name, founder_name, founder_role, founder_age, support_email, hotline, established_date, description)
VALUES (N'TechCycle', N'Huỳnh Lê Kim Huy', 'CEO', 20, 'Huynhlekimhuy12345@gmail.com', '0325225503', '2026-05-15', N'Nền tảng mua bán đồ cũ và đặt lịch sửa chữa thiết bị công nghệ TechCycle.');
GO


/* ==========================================================
   PART 3: CHÈN DỮ LIỆU USER CHI TIẾT - MẬT KHẨU TEXT THUẦN
   ========================================================== */

DECLARE @RoleAdmin INT, @RoleCustomer INT, @RoleTech INT, @RoleSeller INT;
SELECT @RoleAdmin = id FROM roles WHERE role_name = 'admin';
SELECT @RoleCustomer = id FROM roles WHERE role_name = 'customer';
SELECT @RoleTech = id FROM roles WHERE role_name = 'technician';
SELECT @RoleSeller = id FROM roles WHERE role_name = 'seller';

-- 3.1 - Tài khoản Admin chính (Mật khẩu text rõ ràng: admin123)
INSERT INTO users (role_id, username, email, password, full_name, phone, avatar, status) VALUES
(@RoleAdmin, N'admin_huy', 'Huynhlekimhuy12345@gmail.com', 'admin123', N'Huỳnh Lê Kim Huy', '0325225503', NULL, 'active'),
(@RoleAdmin, N'admin', 'admin@techcycle.vn', 'admin123', N'Administrator System', '0912345678', '/avatars/admin.jpg', 'active');

-- 3.2 - Tài khoản Người bán (Seller - Mật khẩu: seller123)
INSERT INTO users (role_id, username, email, password, full_name, phone, avatar, status) VALUES
(@RoleSeller, N'Eco Seller', 'seller@techcycle.vn', 'seller123', N'Cửa Hàng Công Nghệ Eco Seller', '0909090909', '/avatars/seller.jpg', 'active');

DECLARE @IdEcoSeller INT;
SELECT @IdEcoSeller = id FROM users WHERE username = N'Eco Seller';
INSERT INTO seller_profiles (user_id, shop_name, balance, total_products_sold) 
VALUES (@IdEcoSeller, N'Tổng Kho Linh Kiện & Đồ Cũ Eco Seller', 15500000.00, 12);

-- 3.3 - Tài khoản Thợ (Technicians - Mật khẩu: tech123)
INSERT INTO users (role_id, username, email, password, full_name, phone, avatar, status) VALUES
(@RoleTech, N'Kỹ thuật viên Minh', 'minh.tech@techcycle.vn', 'tech123', N'Nguyễn Hoàng Minh', '0987654321', '/avatars/tech_minh.jpg', 'active'),
(@RoleTech, N'Kỹ thuật viên Tuấn', 'tuan.tech@techcycle.vn', 'tech123', N'Phạm Anh Tuấn', '0977654321', '/avatars/tech_tuan.jpg', 'active');

DECLARE @IdTechMinh INT, @IdTechTuan INT;
SELECT @IdTechMinh = id FROM users WHERE username = N'Kỹ thuật viên Minh';
SELECT @IdTechTuan = id FROM users WHERE username = N'Kỹ thuật viên Tuấn';

INSERT INTO technician_profiles (user_id, experience_years, bio, rating_avg, is_available, total_repairs) VALUES
(@IdTechMinh, 5, N'Chuyên viên khắc phục sự cố Laptop, phần cứng di động Apple/Samsung.', 4.85, 1, 142),
(@IdTechTuan, 4, N'Thợ sửa chữa điện lạnh gia dụng cao cấp, máy giặt, điều hòa, tủ lạnh Inverter.', 4.90, 1, 98);

-- Gán kỹ năng thợ
DECLARE @CatPhone INT, @CatLaptop INT, @CatWashing INT, @CatFridge INT;
SELECT @CatPhone = id FROM service_categories WHERE category_name = N'Điện thoại';
SELECT @CatLaptop = id FROM service_categories WHERE category_name = N'Laptop';
SELECT @CatWashing = id FROM service_categories WHERE category_name = N'Máy Giặt';
SELECT @CatFridge = id FROM service_categories WHERE category_name = N'Tủ Lạnh';

DECLARE @IdProfileMinh INT, @IdProfileTuan INT;
SELECT @IdProfileMinh = id FROM technician_profiles WHERE user_id = @IdTechMinh;
SELECT @IdProfileTuan = id FROM technician_profiles WHERE user_id = @IdTechTuan;

INSERT INTO technician_skills (technician_id, category_id, expertise_level) VALUES
(@IdProfileMinh, @CatPhone, 'expert'),
(@IdProfileMinh, @CatLaptop, 'expert'),
(@IdProfileTuan, @CatWashing, 'expert'),
(@IdProfileTuan, @CatFridge, 'intermediate');

-- 3.4 - Tài khoản Khách hàng (Customer - Mật khẩu: user123)
INSERT INTO users (role_id, username, email, password, full_name, phone, avatar, status) VALUES
(@RoleCustomer, N'Hoàng Nguyễn', 'customer@gmail.com', 'user123', N'Nguyễn Huy Hoàng', '0900112233', '/avatars/customer_hoang.jpg', 'active');

DECLARE @IdCustHoang INT;
SELECT @IdCustHoang = id FROM users WHERE username = N'Hoàng Nguyễn';
INSERT INTO customer_profiles (user_id, address, total_spent)
VALUES (@IdCustHoang, N'123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh', 8300000.00);
GO


/* ==========================================================
   PART 4: CHÈN DỮ LIỆU SẢN PHẨM CHI TIẾT
   ========================================================== */

DECLARE @IdSeller INT, @CatWM INT, @CatRF INT, @CatAC INT, @CatAU INT, @CatLT INT, @CatSW INT;
SELECT @IdSeller = id FROM seller_profiles WHERE shop_name = N'Tổng Kho Linh Kiện & Đồ Cũ Eco Seller';

SELECT @CatWM = id FROM product_categories WHERE category_name = 'WashingMachine';
SELECT @CatRF = id FROM product_categories WHERE category_name = 'Refrigerator';
SELECT @CatAC = id FROM product_categories WHERE category_name = 'AirConditioner';
SELECT @CatAU = id FROM product_categories WHERE category_name = 'Audio';
SELECT @CatLT = id FROM product_categories WHERE category_name = 'Laptop';
SELECT @CatSW = id FROM product_categories WHERE category_name = 'Smartwatch';

INSERT INTO products (seller_id, category_id, title, user_description, ai_condition, ai_min_price, ai_max_price, ai_analysis, listed_price, stock, status) VALUES
(@IdSeller, @CatWM, N'Máy giặt LG Inverter 9kg', N'Máy giặt cửa trước LG Inverter tiết kiệm điện nước tối ưu, truyền động trực tiếp êm ái. Tình trạng 95% nguyên bản.', N'Excellent (95%)', 4800000.00, 5500000.00, N'AI: Giá đề xuất hợp lý.', 5200000.00, 1, 'active'),
(@IdSeller, @CatRF, N'Tủ lạnh Samsung Inverter 488L', N'Tủ lạnh Multidoor Samsung 4 cánh sang trọng, dung tích cực lớn cho gia đình. Ngoại hình đẹp keng.', N'Excellent (98%)', 8000000.00, 9200000.00, N'AI: Tủ lạnh giữ giá tốt.', 8500000.00, 1, 'active'),
(@IdSeller, @CatAC, N'Máy lạnh Daikin Inverter 1.5 HP', N'Máy lạnh Daikin 1.5 ngựa Inverter tiết kiệm điện năng tiêu thụ, công nghệ gió Coanda dễ chịu.', N'Excellent', 6800000.00, 7600000.00, N'AI: Linh kiện nguyên bản.', 7200000.00, 1, 'active'),
(@IdSeller, @CatAU, N'Tai nghe Sony WH-1000XM4', N'Tai nghe chụp tai chống ồn chủ động đỉnh cao Sony WH-1000XM4 màu đen, pin trâu 30 tiếng.', N'Good (90%)', 3000000.00, 3600000.00, N'AI: Driver và màng loa hoàn hảo.', 3400000.00, 2, 'active'),
(@IdSeller, @CatLT, N'Macbook Air M1 8GB 256GB', N'Macbook Air M1 màu Space Gray nguyên zin, pin còn 88% cực bền, ngoại hình lướt đẹp.', N'Excellent (95%)', 12000000.00, 13500000.00, N'AI: Phân khúc giữ giá ổn định.', 12800000.00, 1, 'active'),
(@IdSeller, @CatSW, N'Apple Watch Series 7 45mm GPS', N'Apple Watch S7 bản nhôm 45mm đen, hỗ trợ đo SpO2, nhịp tim. Màn hình Always-On lớn.', N'Good (92%)', 4500000.00, 5200000.00, N'AI: Mức giá phù hợp chu kỳ thiết bị.', 4900000.00, 1, 'active');

INSERT INTO product_images (product_id, image_url, is_primary)
SELECT id, '/images/products/item_' + CAST(id AS VARCHAR) + '_main.jpg', 1 FROM products;
GO


/* ==========================================================
   PART 5: CHÈN DỮ LIỆU ĐƠN HÀNG
   ========================================================== */

DECLARE @IdCustomerProf INT, @ProdSony INT, @ProdAppleWatch INT;
SELECT @IdCustomerProf = id FROM customer_profiles WHERE user_id = (SELECT id FROM users WHERE username = N'Hoàng Nguyễn');
SELECT @ProdSony = id FROM products WHERE title = N'Tai nghe Sony WH-1000XM4';
SELECT @ProdAppleWatch = id FROM products WHERE title = N'Apple Watch Series 7 45mm GPS';

-- Đơn hàng 1
INSERT INTO orders (customer_id, total_amount, shipping_address, status, notes)
VALUES (@IdCustomerProf, 3400000.00, N'123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh', 'delivered', N'Giao giờ hành chính.');

DECLARE @IdOrder1 INT = SCOPE_IDENTITY();
INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (@IdOrder1, @ProdSony, 3400000.00, 1);

INSERT INTO payments (order_id, booking_id, payment_method, transaction_id, amount, status, paid_at)
VALUES (@IdOrder1, NULL, 'cod', 'TXN-INV-2026-0001', 3400000.00, 'success', GETDATE());

INSERT INTO deliveries (order_id, delivery_service_name, tracking_number, status, actual_delivery)
VALUES (@IdOrder1, N'Giao Hàng Tiết Kiệm (GHTK)', 'GHTK-TECH-001', 'delivered', GETDATE());

-- Đơn hàng 2
INSERT INTO orders (customer_id, total_amount, shipping_address, status, notes)
VALUES (@IdCustomerProf, 4900000.00, N'123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh', 'processing', N'Cần bọc chống sốc.');

DECLARE @IdOrder2 INT = SCOPE_IDENTITY();
INSERT INTO order_items (order_id, product_id, price, quantity) VALUES (@IdOrder2, @ProdAppleWatch, 4900000.00, 1);

INSERT INTO payments (order_id, booking_id, payment_method, transaction_id, amount, status, paid_at)
VALUES (@IdOrder2, NULL, 'vnpay', 'VNPAY66892301', 4900000.00, 'success', GETDATE());

INSERT INTO deliveries (order_id, delivery_service_name, tracking_number, status, estimated_delivery)
VALUES (@IdOrder2, N'Giao Hàng Nhanh (GHN)', 'GHN-TECH-002', 'shipping', DATEADD(DAY, 2, GETDATE()));
GO


/* ==========================================================
   PART 6: CHÈN LỊCH HẸN SỬA CHỮA
   ========================================================== */

DECLARE @IdCustProf INT, @IdTechProfMinh INT, @IdTechProfTuan INT, @CatIdPhone INT, @CatIdLaptop INT;
SELECT @IdCustProf = id FROM customer_profiles WHERE user_id = (SELECT id FROM users WHERE username = N'Hoàng Nguyễn');
SELECT @IdTechProfMinh = id FROM technician_profiles WHERE user_id = (SELECT id FROM users WHERE username = N'Kỹ thuật viên Minh');
SELECT @IdTechProfTuan = id FROM technician_profiles WHERE user_id = (SELECT id FROM users WHERE username = N'Kỹ thuật viên Tuấn');
SELECT @CatIdPhone = id FROM service_categories WHERE category_name = N'Điện thoại';
SELECT @CatIdLaptop = id FROM service_categories WHERE category_name = N'Laptop';

-- Lịch 1
INSERT INTO repair_requests (customer_id, category_id, user_description, ai_damage_level, ai_conclusion, ai_recommendation, status)
VALUES (@IdCustProf, @CatIdPhone, N'Màn hình bị sọc xanh và cảm ứng chập chờn sau khi bị rơi nhẹ.', 'Medium', N'Lỗi vật lý tấm nền hiển thị OLED.', N'Khuyến nghị thay cụm màn hình bóc máy.', 'approved');

DECLARE @IdReq1 INT = SCOPE_IDENTITY();
INSERT INTO repair_bookings (repair_request_id, technician_id, appointment_date, quoted_price, address, notes, status)
VALUES (@IdReq1, @IdTechProfMinh, '2026-05-26 10:00:00', 1500000.00, N'123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh', N'Đã thay màn hình zin bóc máy, bảo hành 3 tháng.', 'completed');

DECLARE @IdBooking1 INT = SCOPE_IDENTITY();
INSERT INTO repair_status_logs (booking_id, status, notes) VALUES (@IdBooking1, 'completed', N'Hoàn thành sửa chữa.');

-- Lịch 2
INSERT INTO repair_requests (customer_id, category_id, user_description, ai_damage_level, ai_conclusion, ai_recommendation, status)
VALUES (@IdCustProf, @CatIdLaptop, N'Pin bị phồng nhẹ, nhanh hết pin.', 'Light', N'Chai pin vỏ bọc Li-Po.', N'Thay thế khối Pin Li-Polymer tiêu chuẩn Apple.', 'approved');

DECLARE @IdReq2 INT = SCOPE_IDENTITY();
INSERT INTO repair_bookings (repair_request_id, technician_id, appointment_date, quoted_price, address, notes, status)
VALUES (@IdReq2, @IdTechProfTuan, '2026-05-29 14:00:00', 1800000.00, N'123 Đường Ba Tháng Hai, Quận 10, TP. Hồ Chí Minh', N'Đang điều phối pin từ kho tổng.', 'confirmed');

DECLARE @IdBooking2 INT = SCOPE_IDENTITY();
INSERT INTO repair_status_logs (booking_id, status, notes) VALUES (@IdBooking2, 'confirmed', N'Đã xác nhận lịch.');
GO


/* ==========================================================
   PART 7: CHÈN TIN NHẮN VÀ AUTO SEEDING (Mật khẩu text thuần: customer123)
   ========================================================== */

DECLARE @IdUserCust INT, @IdUserTechMinh INT, @IdBook1 INT;
SELECT @IdUserCust = id FROM users WHERE username = N'Hoàng Nguyễn';
SELECT @IdUserTechMinh = id FROM users WHERE username = N'Kỹ thuật viên Minh';
SELECT @IdBook1 = id FROM repair_bookings WHERE address LIKE N'%Ba Tháng Hai%';

INSERT INTO messages (sender_id, receiver_id, booking_id, text_content, timestamp) VALUES
(@IdUserCust, @IdUserTechMinh, @IdBook1, N'Chào anh Minh, điện thoại của em khi nào thì thay xong ạ?', '2026-05-25 09:30:10'),
(@IdUserTechMinh, @IdUserCust, @IdBook1, N'Chào bạn, hiện tại mình đang kiểm tra linh kiện. Chiều nay khoảng 15:00 là xong nhé.', '2026-05-25 09:40:10'),
(@IdUserCust, @IdUserTechMinh, @IdBook1, N'Dạ vâng, cảm ơn anh. Xong báo em nha.', '2026-05-25 09:50:10'),
(@IdUserTechMinh, @IdUserCust, @IdBook1, N'Điện thoại của bạn đã thay xong rồi nhé, hiển thị sắc nét.', '2026-05-25 14:45:00');

-- Vòng lặp Seeding 20 users test (Mật khẩu: customer123)
DECLARE @u INT = 1;
WHILE @u <= 20
BEGIN
    INSERT INTO users (role_id, username, email, password, full_name, phone, status)
    VALUES (2, 'customer_user_' + CAST(@u AS VARCHAR), 'customer' + CAST(@u AS VARCHAR) + '@gmail.com', 'customer123', N'Khách Hàng Phụ #' + CAST(@u AS NVARCHAR), '0915' + RIGHT('000000' + CAST(@u AS VARCHAR), 6), 'active');

    INSERT INTO customer_profiles (user_id, address, total_spent)
    VALUES (SCOPE_IDENTITY(), N'Khu đô thị công nghệ số, Việt Nam', 0.00);

    SET @u = @u + 1;
END;
GO


/* ==========================================================
   PART 8: KHỞI TẠO VIEWS HỖ TRỢ ỨNG DỤNG
   ========================================================== */

IF OBJECT_ID('v_active_products', 'V') IS NOT NULL DROP VIEW v_active_products;
GO
CREATE VIEW v_active_products AS
SELECT 
    p.id, p.title, p.listed_price, p.ai_condition, p.ai_min_price, p.ai_max_price,
    c.category_name, s.shop_name as seller_name, p.created_at
FROM products p
JOIN product_categories c ON p.category_id = c.id
JOIN seller_profiles s ON p.seller_id = s.id
WHERE p.status = 'active' AND p.stock > 0;
GO

IF OBJECT_ID('v_technician_info', 'V') IS NOT NULL DROP VIEW v_technician_info;
GO
CREATE VIEW v_technician_info AS
SELECT 
    tp.id, u.username, u.full_name, u.phone, tp.experience_years, tp.rating_avg, tp.is_available, tp.total_repairs,
    STRING_AGG(CONVERT(NVARCHAR(MAX), sc.category_name), ', ') as skills
FROM technician_profiles tp
JOIN users u ON tp.user_id = u.id
LEFT JOIN technician_skills ts ON tp.id = ts.technician_id
LEFT JOIN service_categories sc ON ts.category_id = sc.id
GROUP BY tp.id, u.username, u.full_name, u.phone, tp.experience_years, tp.rating_avg, tp.is_available, tp.total_repairs;
GO


/* ==========================================================
   PART 9: OUTPUT VERIFICATION
   ========================================================== */
PRINT '=======================================================';
PRINT '  TECHCYCLE MASTER DATABASE COMPLETED SUCCESSFULLY     ';
PRINT '=======================================================';

SELECT COUNT(*) AS [Tổng Số Users (Plain Password)] FROM users;
SELECT COUNT(*) AS [Tổng Số Sản Phẩm] FROM products;
SELECT COUNT(*) AS [Lịch Đặt Hẹn Thợ] FROM repair_bookings;
SELECT COUNT(*) AS [Tổng Số Đơn Hàng] FROM orders;
GO
