-- ============================================================
-- TECHCYCLE DATABASE - MASTER INTEGRATED SCRIPT (T-SQL)
-- Nền tảng mua bán đồ cũ + Đặt lịch sửa chữa + Đánh giá AI + Cẩm nang AI (RAG)
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

/* 1.2 - Bảng Users (Tài khoản chính - Plain text password) */
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
    purchase_date DATE NULL, -- ngày thu mua sản phẩm
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

/* 1.26 - Bảng Cẩm nang sửa chữa thiết bị (Knowledge Base phục vụ RAG AI) */
CREATE TABLE repair_knowledge (
    id INT PRIMARY KEY IDENTITY(1,1),
    category NVARCHAR(50) NOT NULL,
    keywords NVARCHAR(255) NOT NULL,
    issue_prompt NVARCHAR(MAX) NOT NULL,
    solution NVARCHAR(MAX) NOT NULL
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
(N'Smartwatch', N'Đồng hồ thông minh qua sử dụng'),
(N'Smartphone', N'Điện thoại thông minh đã qua sử dụng'),
(N'Tablet', N'Máy tính bảng'),
(N'GamingConsole', N'Máy chơi game'),
(N'Camera', N'Máy ảnh DSLR Mirrorless'),
(N'TV', N'Tivi thông minh'),
(N'Monitor', N'Màn hình máy tính'),
(N'PC', N'Máy tính để bàn'),
(N'Printer', N'Máy in'),
(N'Router', N'Thiết bị mạng'),
(N'Accessory', N'Phụ kiện điện tử');

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
-- ĐÃ SỬA: Thay dấu chấm phẩy (;) thành dấu phẩy (,) ở cuối dòng insert thứ 2
INSERT INTO users (role_id, username, email, password, full_name, phone, avatar, status) VALUES
(@RoleAdmin, 'admin_huy', 'Huynhlekimhuy12345@gmail.com', 'admin123', N'Huỳnh Lê Kim Huy', '0325225503', NULL, 'active'),
(@RoleAdmin, 'admin', 'admin@techcycle.vn', 'admin123', N'Administrator System', '0912345678', '/avatars/admin.jpg', 'active'), 
(@RoleAdmin, 'hoangle2005h', 'hoangle2005h@gmail.com', 'admin123', N'lehuyhoang', '0325770603', '/avatars/admin.jpg', 'active');

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
DECLARE @CatPhone2 INT,
        @CatTablet2 INT,
        @CatGame INT,
        @CatCamera INT,
        @CatTV INT,
        @CatMonitor INT,
        @CatPC INT,
        @CatAccessory INT;

SELECT @CatPhone2 = id FROM product_categories WHERE category_name='Smartphone';
SELECT @CatTablet2 = id FROM product_categories WHERE category_name='Tablet';
SELECT @CatGame = id FROM product_categories WHERE category_name='GamingConsole';
SELECT @CatCamera = id FROM product_categories WHERE category_name='Camera';
SELECT @CatTV = id FROM product_categories WHERE category_name='TV';
SELECT @CatMonitor = id FROM product_categories WHERE category_name='Monitor';
SELECT @CatPC = id FROM product_categories WHERE category_name='PC';
SELECT @CatAccessory = id FROM product_categories WHERE category_name='Accessory';
CREATE TABLE #real_products(
    title NVARCHAR(255),
    category_id INT,
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2)
);

INSERT INTO #real_products VALUES
(N'iPhone 16 Pro Max 256GB', @CatPhone2, 25000000, 29000000),
(N'iPhone 16 Pro 128GB', @CatPhone2, 22000000, 26000000),
(N'iPhone 15 Pro Max 256GB', @CatPhone2, 18000000, 22000000),
(N'iPhone 15 Pro 128GB', @CatPhone2, 16000000, 20000000),
(N'iPhone 14 Pro Max 256GB', @CatPhone2, 15000000, 19000000),

(N'Samsung Galaxy S25 Ultra 512GB', @CatPhone2, 23000000, 28000000),
(N'Samsung Galaxy S24 Ultra 256GB', @CatPhone2, 18000000, 22000000),
(N'Samsung Galaxy S23 Ultra 256GB', @CatPhone2, 14000000, 18000000),
(N'Samsung Galaxy Z Fold6', @CatPhone2, 25000000, 32000000),
(N'Samsung Galaxy Z Flip6', @CatPhone2, 18000000, 25000000),

(N'Xiaomi 15 Ultra', @CatPhone2, 17000000, 22000000),
(N'Xiaomi 14 Ultra', @CatPhone2, 15000000, 19000000),
(N'Xiaomi 14T Pro', @CatPhone2, 11000000, 15000000),
(N'Redmi Note 14 Pro+', @CatPhone2, 7000000, 10000000),

(N'OPPO Find X8 Pro', @CatPhone2, 18000000, 24000000),
(N'OPPO Reno13 Pro', @CatPhone2, 11000000, 16000000),
(N'Vivo X200 Pro', @CatPhone2, 17000000, 22000000),

(N'MacBook Air M4 16GB 512GB', @CatLT, 23000000, 29000000),
(N'MacBook Air M3 16GB 512GB', @CatLT, 19000000, 25000000),
(N'MacBook Pro M4 14 inch', @CatLT, 32000000, 42000000),

(N'ASUS ROG Strix G16 RTX4060', @CatLT, 22000000, 29000000),
(N'Lenovo Legion 5 RTX4070', @CatLT, 24000000, 32000000),
(N'MSI Katana 15 RTX4060', @CatLT, 18000000, 25000000),

(N'iPad Pro M4 13 inch', @CatTablet2, 24000000, 32000000),
(N'iPad Air M3', @CatTablet2, 13000000, 18000000),
(N'iPad Gen 10', @CatTablet2, 7000000, 10000000),

(N'Apple Watch Series 10', @CatSW, 7000000, 10000000),
(N'Apple Watch Ultra 2', @CatSW, 14000000, 19000000),

(N'Sony WH-1000XM5', @CatAU, 4500000, 7000000),
(N'AirPods Pro 2 USB-C', @CatAU, 3500000, 6000000),

(N'PlayStation 5 Slim', @CatGame, 9000000, 13000000),
(N'PlayStation 5 Pro', @CatGame, 15000000, 22000000),
(N'Xbox Series X', @CatGame, 8000000, 12000000),
(N'Nintendo Switch OLED', @CatGame, 5000000, 9000000),

(N'Sony Alpha A7 IV', @CatCamera, 32000000, 45000000),
(N'Canon EOS R6 Mark II', @CatCamera, 30000000, 43000000),

(N'Samsung Smart TV 55 Inch', @CatTV, 7000000, 13000000),
(N'LG OLED C4 55 Inch', @CatTV, 18000000, 28000000),

(N'Dell UltraSharp U2724D', @CatMonitor, 5000000, 9000000),
(N'LG UltraGear 27GP850', @CatMonitor, 6000000, 10000000),

(N'PC Gaming RTX 4070', @CatPC, 25000000, 40000000),
(N'PC Gaming RTX 4060', @CatPC, 18000000, 28000000),

(N'Router ASUS AX6000', @CatAccessory, 2500000, 4500000),
(N'Logitech MX Master 3S', @CatAccessory, 1500000, 2500000),
(N'Keychron K8 Pro', @CatAccessory, 1800000, 3500000);

DECLARE @loop INT = 1;

WHILE @loop <= 3
BEGIN

INSERT INTO products
(
    seller_id,
    category_id,
    title,
    user_description,
    purchase_date,
    ai_condition,
    ai_min_price,
    ai_max_price,
    ai_analysis,
    listed_price,
    stock,
    status
)
SELECT
    @IdSeller,
    category_id,

    title + N' (' +
    CASE @loop
        WHEN 1 THEN N'Like New'
        WHEN 2 THEN N'99%'
        ELSE N'Used'
    END + N')',

    N'Sản phẩm công nghệ chính hãng, đã kiểm định kỹ thuật.',

    DATEADD(DAY,-ABS(CHECKSUM(NEWID()) % 365),GETDATE()),

    CASE ABS(CHECKSUM(NEWID()) % 3)
        WHEN 0 THEN N'Excellent'
        WHEN 1 THEN N'Good'
        ELSE N'Like New'
    END,

    min_price,
    max_price,

    N'AI đánh giá chất lượng tốt',

    min_price + (
        ABS(CHECKSUM(NEWID()))
        % CAST(max_price - min_price AS INT)
    ),

    1 + ABS(CHECKSUM(NEWID()) % 5),

    'active'
FROM #real_products;

SET @loop = @loop + 1;

END;

DROP TABLE #real_products;
GO
DECLARE @IdSeller INT,
        @CatWM INT,
        @CatRF INT,
        @CatAC INT,
        @CatAU INT,
        @CatLT INT,
        @CatSW INT;

SELECT @IdSeller=id
FROM seller_profiles
WHERE shop_name=N'Tổng Kho Linh Kiện & Đồ Cũ Eco Seller';

SELECT @CatWM=id FROM product_categories WHERE category_name='WashingMachine';
SELECT @CatRF=id FROM product_categories WHERE category_name='Refrigerator';
SELECT @CatAC=id FROM product_categories WHERE category_name='AirConditioner';
SELECT @CatAU=id FROM product_categories WHERE category_name='Audio';
SELECT @CatLT=id FROM product_categories WHERE category_name='Laptop';
SELECT @CatSW=id FROM product_categories WHERE category_name='Smartwatch';

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
   PART 9: CHÈN DỮ LIỆU CẨM NANG SỬA CHỮA (TỪ KHÓA ĐÃ ĐƯỢC TỐI ƯU HÓA TỐI ĐA CHO AI RAG)
   ========================================================== */

-- 1. WashingMachine (Máy Giặt)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'WashingMachine', N'không lên nguồn, mất nguồn, cắm điện không sáng, không hoạt động, tối thui, mất điện', N'Máy giặt TechCycle không lên nguồn dù đã cắm điện, cách xử lý tại nhà?', N'Kiểm tra lại phích cắm và ổ điện. Đảm bảo nắp máy giặt đã được đóng kín hoàn toàn vì máy sẽ không lên nguồn hoặc hoạt động nếu công tắc cửa chưa khít.'),
(N'WashingMachine', N'không cấp nước, không vào nước, lỗi van cấp, nước không chảy vào', N'Máy giặt không cấp nước vào lồng giặt, lỗi do đâu?', N'Kiểm tra van cấp nước xem có bị khóa không. Tháo ống cấp nước ra và vệ sinh lưới lọc kim loại ở đầu van vì bụi bẩn, cặn bẩn lâu ngày thường gây tắc nghẽn tại đây.'),
(N'WashingMachine', N'không thoát nước, đọng nước, không xả nước, kẹt nước, nghẹt cống máy giặt', N'Nước trong máy giặt không thoát ra ngoài được, làm sao để xử lý?', N'Mở nắp bộ lọc xả (thường nằm ở góc dưới bên phải mặt trước máy), vặn núm để xả hết dị vật như đồng xu, khuy áo hoặc cặn vải kẹt bên trong ra ngoài.'),
(N'WashingMachine', N'rung lắc mạnh, kêu to, kêu ồn, chế độ vắt kêu ầm ầm, nhảy lồng', N'Máy giặt rung lắc và kêu rất to khi bước vào chu trình vắt?', N'Kiểm tra xem máy giặt có bị đặt bập bênh không, điều chỉnh lại chân đế cho cân bằng. Đồng thời dàn đều quần áo trong lồng giặt, tránh để dồn về một phía.'),
(N'WashingMachine', N'kẹt cửa, không mở được cửa, khóa cửa máy giặt, hóc cửa', N'Máy giặt xong nhưng cửa bị kẹt không mở được, làm thế nào?', N'Đợi từ 2-3 phút sau khi chu trình kết thúc để mạch điều khiển nhả chốt khóa. Nếu vẫn kẹt, hãy rút điện ra khoảng 5 phút rồi cắm lại để reset hành trình cửa.'),
(N'WashingMachine', N'cặn bột giặt, không xả hết xà phòng, khay chứa bột giặt, đọng xà bông', N'Bột giặt hoặc nước xả vải không được xả hết, vẫn còn đọng lại trong khay?', N'Kéo khay chứa bột giặt ra, dùng bàn chải vệ sinh sạch sẽ các lỗ phun nước phía trên trần khay và các mảng bám bột giặt đông cứng lâu ngày.'),
(N'WashingMachine', N'cấp nước liên tục, chảy tràn nước, không ngắt nước, trào nước', N'Máy giặt liên tục cấp nước không ngừng, chảy tràn ra ngoài?', N'Lỗi này thường do phao áp lực bị kẹt hoặc đường ống phao bị thủng. Bạn hãy rút điện, khóa van nước, tháo nắp trên của máy để kiểm tra ống silicon nối với phao.'),
(N'WashingMachine', N'mùi hôi, cặn bẩn đen, quần áo hôi, lồng giặt bẩn, giặt không sạch', N'Quần áo giặt xong có mùi hôi hoặc bám nhiều cặn bẩn đen?', N'Lồng giặt đã quá bẩn. Hãy bật chế độ ''Vệ sinh lồng giặt'' (Tub Clean) kết hợp với viên tẩy hoặc giấm ăn, nước cốt chanh để khử khuẩn, làm sạch mảng bám ngầm.'),
(N'WashingMachine', N'mã lỗi màn hình, E1, E2, IE, OE, báo lỗi, nháy chữ', N'Màn hình máy giặt hiển thị các mã lỗi như E1, E2, IE, OE...', N'Đây là các mã ký hiệu lỗi của nhà sản xuất. Bạn hãy tra bảng mã lỗi trong sách hướng dẫn đi kèm máy để biết chính xác máy đang tắc nước, lỗi cửa hay lỗi xả.'),
(N'WashingMachine', N'dừng đột ngột, đang giặt bị dừng, tắt giữa chừng, giặt nửa chừng', N'Máy giặt đột ngột dừng lại giữa chừng khi đang giặt?', N'Kiểm tra xem nguồn điện có bị chập chờn không, hoặc lượng quần áo quá nặng vượt mức quy định của máy khiến motor bị quá tải và tự ngắt để bảo vệ.'),
(N'WashingMachine', N'rò rỉ nước, chảy nước gầm máy, thủng ống, ngập nước gầm', N'Nước bị rò rỉ dưới gầm máy giặt, cách khắc phục tại nhà?', N'Kiểm tra hai đầu nối của ống cấp nước và ống xả nước xem có bị lỏng hoặc rách không. Siết chặt lại các mối nối hoặc quấn thêm băng tan (băng keo non).'),
(N'WashingMachine', N'lồng giặt không quay, không quay lồng, đứt dây curoa, mâm giặt đứng im', N'Lồng giặt không quay dù máy vẫn báo thời gian chạy?', N'Rút điện, thử dùng tay quay nhẹ lồng giặt. Nếu quay nhẹ bẫng, có thể dây curoa truyền động phía sau máy đã bị tuột hoặc đứt, cần tháo mặt sau để lắp lại.'),
(N'WashingMachine', N'không vắt, vắt không khô, quần áo ướt nhẹp, lỗi chế độ vắt', N'Máy giặt không thực hiện chức năng vắt khô quần áo?', N'Kiểm tra xem bạn có chọn nhầm chế độ ''Không vắt'' (No Spin) không. Ngoài ra, nếu nước không thoát hết hoàn toàn do tắc lọc, máy cũng sẽ không chuyển sang bước vắt.'),
(N'WashingMachine', N'liệt phím, bấm không ăn, khóa trẻ em, nút bấm, child lock', N'Nút bấm trên bảng điều khiển máy giặt bị liệt, bấm không ăn?', N'Có thể bạn đang bật chế độ ''Khóa trẻ em'' (Child Lock - biểu tượng chiếc khóa). Hãy ấn giữ tổ hợp phím mở khóa theo hướng dẫn trên mặt bảng điều khiển từ 3-5 giây.'),
(N'WashingMachine', N'trào bọt, bọt xà phòng, trào nước bọt, phèo bọt', N'Bọt xà phòng trào ra ngoài bảng điều khiển và nắp máy giặt?', N'Bạn đã dùng sai loại bột giặt. Hãy ngắt điện, lau sạch bọt và đổi sang loại nước giặt chuyên dụng dành cho máy giặt cửa trước hoặc cửa trên ít bọt.'),
(N'WashingMachine', N'rò điện, giật điện, tê tay, chạm vỏ máy giật', N'Máy giặt bị rò điện, sờ vào vỏ máy thấy hơi tê giật?', N'Do máy chưa được nối đất. Hãy dùng một đoạn dây điện nối từ ốc vít phía sau vỏ máy giặt bám chặt vào một chiếc đinh đóng sâu xuống nền nhà hoặc tường xi măng.'),
(N'WashingMachine', N'sai thời gian, nhảy thời gian, thời gian không chuẩn, đồng hồ ảo', N'Thời gian giặt hiển thị trên màn hình bị nhảy lung tung, không chính xác?', N'Lượng đồ giặt quá ít hoặc quá nhiều làm cảm biến mất nhiều thời gian để cân tải trọng. Hãy gom đủ lượng quần áo tiêu chuẩn theo khuyến cáo để máy chạy đúng giờ.'),
(N'WashingMachine', N'đèn nhấp nháy, kêu tít tít, báo nắp chưa đóng, cửa hở', N'Đèn bảng điều khiển nhấp nháy liên tục và phát tiếng kêu tít tít?', N'Dấu hiệu cảnh báo nắp máy giặt chưa được đóng kín khi máy chuyển sang chế độ vắt hoặc cấp nước. Hãy mở ra đóng lại thật mạnh tay.'),
(N'WashingMachine', N'nước yếu, nước chảy chậm, áp lực nước, đợi lâu đầy lồng', N'Nước cấp vào máy giặt chảy rất yếu, đợi lâu?', N'Kiểm tra áp lực nước tổng của nhà bạn. Nếu bồn nước đặt quá thấp, hãy lắp thêm một chiếc bơm tăng áp nhỏ ở đầu đường ống cấp vào máy giặt.'),
(N'WashingMachine', N'tự cấp nước khi tắt, hở van nước, chảy nước ngầm, tắt máy vẫn rỉ nước', N'Máy giặt tự động cấp nước vào ngay cả khi đã tắt nguồn?', N'Van cấp nước của máy đã bị hở gioăng cao su do cặn đá vôi kẹt bên trong. Bạn cần khóa van nước tổng, tháo van cấp của máy ra để vệ sinh hoặc thay van mới.');

-- 2. Refrigerator (Tủ Lạnh)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Refrigerator', N'không hoạt động, không lên nguồn, mất điện, tối đèn, tủ lạnh cắm không chạy', N'Tủ lạnh TechCycle không hoạt động, đèn bên trong cũng không sáng?', N'Kiểm tra xem phích cắm điện có bị lỏng không. Thử cắm một thiết bị khác vào ổ điện đó để kiểm tra xem ổ điện có nguồn hay không.'),
(N'Refrigerator', N'không làm đá, ngăn đá không lạnh, không đông đá, tan đá, chảy nước đá', N'Tủ lạnh có chạy, đèn sáng nhưng không làm đá được (ngăn đá không lạnh)?', N'Kiểm tra núm điều chỉnh nhiệt độ ngăn đá xem có bị vặn về mức nhỏ nhất không. Đảm bảo thực phẩm không xếp quá dày che mất cửa gió thổi từ quạt ra.'),
(N'Refrigerator', N'ngăn mát không lạnh, thức ăn thiu, hở gioăng, mát yếu', N'Ngăn mát tủ lạnh không đủ lạnh, thức ăn nhanh bị thiu?', N'Kiểm tra gioăng cao su ở cửa tủ xem có bị hở không bằng cách kẹp một tờ giấy vào cửa, nếu kéo ra dễ dàng thì gioăng đã hở. Hãy dùng máy sấy tóc sấy nóng để gioăng phục hồi độ đàn hồi.'),
(N'Refrigerator', N'kêu to, ồn, ù ù, rè rè, rung bần bật tủ lạnh', N'Tủ lạnh phát ra tiếng ồn lớn, kêu u u rè rè rất khó chịu?', N'Kiểm tra xem các chân đế tủ lạnh có được đặt thăng bằng trên sàn nhà hay không. Đảm bảo vỏ tủ lạnh không bị kê chạm vào tường hoặc các vật dụng khác xung quanh.'),
(N'Refrigerator', N'chảy nước, rò nước, tràn nước ra sàn, gầm tủ có nước', N'Có nước rò rỉ và chảy tràn ra sàn nhà từ dưới gầm tủ lạnh?', N'Tháo tấm chắn phía sau gầm tủ, tìm máng hứng nước thải của tủ lạnh. Rất có thể máng bị nứt hoặc ống thoát nước xả tuyết bị tắc làm nước tràn ra ngoài.'),
(N'Refrigerator', N'đóng tuyết, bám tuyết dày, đông đá mảng, tuyết tủ lạnh', N'Ngăn đá tủ lạnh bị đóng tuyết dày đặc thành từng mảng lớn?', N'Lỗi do cảm biến rút tuyết (sò lạnh) bị hỏng hoặc gioăng cửa hở làm không khí ẩm lọt vào. Hãy rút điện, mở toang cửa tủ khoảng vài tiếng để tuyết tan hết hoàn toàn.'),
(N'Refrigerator', N'đèn không sáng, cháy bóng đèn, tối ngăn tủ lạnh, hỏng led', N'Đèn bên trong tủ lạnh không sáng khi mở cửa ra?', N'Có thể bóng đèn LED/sợi đốt bên trong đã bị cháy. Bạn có thể tự mua bóng cùng chân cắm về vặn thay thế, hoặc kiểm tra xem công tắc nhấn ở viền cửa có bị kẹt không.'),
(N'Refrigerator', N'chạy liên tục, không ngắt, nóng 2 bên hông, hông tủ nóng ran', N'Tủ lạnh chạy liên tục không ngắt, thành tủ rất nóng?', N'Do bụi bám quá dày vào dàn nóng phía sau hoặc dưới gầm tủ khiến máy không tản được nhiệt. Hãy dùng máy hút bụi hoặc bàn chải vệ sinh sạch lưới tản nhiệt này.'),
(N'Refrigerator', N'mùi hôi, hôi thối, mùi khó chịu, khử mùi tủ lạnh', N'Có mùi hôi nồng nặc xuất hiện mỗi khi mở cửa tủ lạnh?', N'Dọn sạch thức ăn quá hạn. Lau tủ bằng nước ấm pha muối hoặc baking soda, sau đó bỏ vào tủ một ít vỏ cam, bã cà phê hoặc than hoạt tính để hút sạch mùi hôi.'),
(N'Refrigerator', N'đọng sương, ra mồ hôi, đọng nước cửa, tủ lạnh ẩm', N'Đọng nước thành từng giọt (ra mồ hôi) ở vỏ ngoài hoặc mép cửa tủ lạnh?', N'Hiện tượng này thường xảy ra vào mùa nồm ẩm do độ ẩm không khí cao. Nếu xuất hiện vào ngày thường, chứng tỏ gioăng cửa bị hở, cần vệ sinh gioăng bằng nước ấm.'),
(N'Refrigerator', N'đông đá ngăn mát, đóng băng thức ăn, quá lạnh, lạnh cóng rau', N'Thực phẩm để ở ngăn mát nhưng lại bị đóng băng, đông đá?', N'Do bạn điều chỉnh nhiệt độ ngăn mát quá sâu (mức Max hoặc số 7). Hãy vặn núm chỉnh nhiệt độ về mức trung bình (mức số 3 hoặc 4 hoặc khoảng 3-5 độ C).'),
(N'Refrigerator', N'khó mở cửa, hít chặt cửa, kẹt cửa tủ lạnh, nặng cửa', N'Cửa tủ lạnh rất khó mở, cảm giác bị hút chặt lại?', N'Đây là hiện tượng bình thường do áp suất không khí bên trong tủ giảm xuống khi không khí lạnh co lại. Hãy đợi khoảng 1-2 phút trước khi mở lại lần tiếp theo.'),
(N'Refrigerator', N'rò điện, tê tay, giật điện vỏ tủ, chạm vỏ giật', N'Tủ lạnh bị rò điện nhẹ, chạm tay vào vỏ kim loại thấy tê giật?', N'Rút phích cắm, đảo chiều đầu cắm điện 180 độ rồi cắm lại. Để an toàn tuyệt đối, hãy nối một sợi dây tiếp địa từ ốc vít vỏ tủ xuống sàn nhà.'),
(N'Refrigerator', N'vũng nước ngăn mát, tắc lỗ thoát nước, đọng nước đáy mát', N'Đáy ngăn mát tủ lạnh bị đọng vũng nước lớn?', N'Lỗ thoát nước rã đông ở mặt vách sau ngăn mát đã bị tắc do bụi bẩn hoặc vụn thức ăn rơi vào. Dùng một sợi dây kẽm mềm khều nhẹ vào lỗ để thông rãnh.'),
(N'Refrigerator', N'không rơi đá, làm đá tự động hỏng, auto ice lỗi, kẹt đá', N'Hệ thống làm đá tự động (Auto Ice) của tủ lạnh không ra đá?', N'Kiểm tra bình chứa nước ở ngăn mát xem còn nước không và châm thêm. Đảm bảo tính năng ''Ice On/Off'' trên bảng điều khiển đang được bật.'),
(N'Refrigerator', N'vòi nước ngoài không chảy, không lấy được nước, kẹt vòi, lấy nước ngoài', N'Vòi lấy nước ngoài của tủ lạnh không chảy ra nước?', N'Kiểm tra xem bình chứa nước bên trong có bị lệch khớp không. Khóa an toàn của vòi nước ngoài có thể đang bật, hãy gạt chốt mở khóa trước khi nhấn ly vào.'),
(N'Refrigerator', N'thiếu gas, hết gas, không lạnh, block chạy, lủng dàn', N'Tủ lạnh bị thiếu gas làm lạnh, làm sao kiểm tra tại nhà?', N'Nếu máy nén (block) vẫn chạy u u nhưng hai bên thành tủ không hề nóng và bên trong không lạnh, rất có thể tủ đã bị rò rỉ hết gas, cần gọi thợ hàn và nạp lại gas.'),
(N'Refrigerator', N'khóa bảng điều khiển, liệt cảm ứng tủ lạnh, khóa trẻ em tủ lạnh', N'Bảng điều khiển cảm ứng ngoài cửa tủ lạnh bị khóa, không bấm được?', N'Tìm nút có biểu tượng chiếc khóa hoặc chữ ''Lock / Child Lock'' trên bảng điều khiển, nhấn và giữ im nút này trong 3 giây để mở khóa hệ thống.'),
(N'Refrigerator', N'quạt kêu cành cạch, quạt đá kêu, cạ tuyết, ồn ngăn đá', N'Tiếng quạt gió ngăn đá kêu cành cạch rất to?', N'Tuyết bám dày đá lấn sang khu vực cánh quạt làm cánh quạt chém vào đá tạo ra tiếng kêu. Hãy rút điện xả tuyết thủ công trong 12 tiếng để giải quyết.'),
(N'Refrigerator', N'block không chạy, lốc hỏng, kêu tạch, rơ le, máy nén tủ lạnh', N'Tủ lạnh bật lên nhưng block (máy nén) không chạy, chỉ nghe tiếng tạch rồi thôi?', N'Lỗi do rơ-le khởi động hoặc tụ đề của block bị hỏng. Bạn có thể mua linh kiện rơ-le đúng mã về cắm thay thế ở hộp điện nhỏ ngay cạnh block phía sau tủ.');

-- 3. AirConditioner (Điều Hòa)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'AirConditioner', N'không nhận điều khiển, hỏng remote, không ăn khiển, bấm không kêu tít', N'Điều hòa TechCycle không nhận tín hiệu từ điều khiển (remote)?', N'Thay pin mới cho remote. Nếu vẫn không được, dùng camera điện thoại soi vào đèn hồng ngoại của remote rồi bấm nút, nếu thấy đèn không nháy sáng đỏ thì remote đã hỏng.'),
(N'AirConditioner', N'không lạnh, chỉ ra gió, không mát, gió thường điều hòa', N'Điều hòa bật lên chỉ ra gió thông thường, không hề có hơi lạnh?', N'Kiểm tra xem remote đã để đúng chế độ làm lạnh ''Cool'' (biểu tượng hình bông tuyết) chưa. Nếu đang để chế độ ''Fan'' (quạt) hoặc ''Dry'' (khô) máy sẽ không mát.'),
(N'AirConditioner', N'chảy nước dàn lạnh, nhỏ giọt trong nhà, rỉ nước cục lạnh, hắt nước', N'Dàn lạnh của điều hòa bị chảy nước nhỏ giọt xuống sàn nhà?', N'Do đường ống thoát nước thải bị tắc vì bụi bẩn và rêu mốc bám lâu ngày. Hãy dùng miệng thổi mạnh hoặc dùng bơm áp lực sục vào đầu ống thoát nước ngoài trời để thông tắc.'),
(N'AirConditioner', N'mùi hôi mốc, gió hôi, điều hòa hôi, mùi ẩm', N'Gió thổi ra từ điều hòa có mùi hôi mốc, khó chịu?', N'Tấm lưới lọc bụi bên trong dàn lạnh đã quá bẩn. Hãy cạy nắp nhựa dàn lạnh ra, rút 2 tấm lưới lọc mang đi xịt rửa sạch bằng nước, phơi khô rồi lắp lại.'),
(N'AirConditioner', N'cục nóng kêu to, rung mạnh cục nóng, ồn ngoài trời', N'Cục nóng ngoài trời kêu rất to và rung bần bật khi hoạt động?', N'Kiểm tra xem các ốc vít bắt chân đế cục nóng vào giá đỡ có bị lỏng không và siết chặt lại. Đảm bảo không có lá cây hay rác kẹt vào cánh quạt cục nóng.'),
(N'AirConditioner', N'nhấp nháy đèn, báo lỗi điều hòa, tự tắt, chớp đèn cục lạnh', N'Điều hòa chạy một lúc thì nhấp nháy đèn báo lỗi liên tục rồi tắt?', N'Đây là cơ chế tự bảo vệ khi máy gặp sự cố (bẩn cục nóng, thiếu gas, lỗi cảm biến). Hãy tắt aptomat trong 5 phút để reset bộ nhớ lỗi của máy rồi bật lại.'),
(N'AirConditioner', N'hơi lạnh yếu, gió yếu, không buốt, mát kém, yếu quạt', N'Hơi lạnh thổi ra rất yếu dù đã giảm nhiệt độ xuống thấp tối đa?', N'Lưới lọc bụi bẩn bít kín luồng gió. Hãy vệ sinh lưới lọc ngay lập tức. Nếu lưới sạch, có thể dàn nóng ngoài trời bị nắng chiếu trực tiếp quá nóng, cần che chắn giảm nhiệt.'),
(N'AirConditioner', N'cục nóng tự ngắt, chạy tí rồi nghỉ, quá nhiệt cục nóng, lốc ngắt', N'Cục block ngoài trời cứ chạy được 2-3 phút lại tự ngắt rồi nghỉ rất lâu?', N'Hiện tượng quá nhiệt máy nén. Do cục nóng bám quá nhiều bụi không tản được nhiệt. Dùng vòi nước xịt thẳng vào các lá nhôm tản nhiệt của cục nóng ngoài trời để rửa sạch.'),
(N'AirConditioner', N'cánh vẫy không quay, đứng im cánh gió, hỏng swing, kẹt vẫy gió', N'Cánh đảo gió (swing) của điều hòa đứng im, không chịu quay?', N'Kiểm tra nút ''Swing'' trên remote xem đã kích hoạt chưa. Nếu kích hoạt rồi mà cánh không chuyển động, có thể chốt nhựa nối cánh với motor vẫy bị gãy, hãy dùng keo dán cố định lại.'),
(N'AirConditioner', N'không lên nguồn, mất nguồn, bật aptomat không lên, tối đèn điều hòa', N'Điều hòa không lên nguồn, bật aptomat không thấy kêu tít?', N'Dùng bút thử điện kiểm tra xem aptomat có điện ra hay không. Nếu có điện, tháo mặt nạ dàn lạnh để kiểm tra cầu chì bảo vệ trên bo mạch chính xem có bị đứt không.'),
(N'AirConditioner', N'bám tuyết dàn lạnh, đóng đá, trắng ống đồng, đóng tuyết điều hòa', N'Dàn lạnh điều hòa bị bám một lớp đá, tuyết trắng xóa trên các ống đồng?', N'Hiện tượng thiếu gas hoặc do quạt dàn lạnh chạy quá yếu/bị hỏng không thổi được hơi lạnh ra ngoài. Cần vệ sinh máy trước khi kiểm tra lượng gas.'),
(N'AirConditioner', N'tốn điện, tốn tiền điện, hao điện năng điều hòa, ngốn điện', N'Điều hòa tiêu tốn quá nhiều điện năng so với bình thường?', N'Bạn đang đặt nhiệt độ quá thấp (16-20 độ). Hãy chỉnh nhiệt độ lý tưởng từ 25-27 độ C kết hợp bật thêm một chiếc quạt cây để lưu thông khí mát, giúp máy tiết kiệm 30% điện.'),
(N'AirConditioner', N'cục nóng không chảy nước, không có nước thải, khô ống nước', N'Nước thải từ điều hòa không chảy ra giọt nào dù máy chạy cả ngày?', N'Độ ẩm không khí đang thấp (chế độ Dry) hoặc máy không làm lạnh được sâu nên không ngưng tụ nước. Nếu phòng vẫn mát thì không sao, nếu không mát thì máy đang mất gas.'),
(N'AirConditioner', N'tiếng nước chảy ọc ọc, sôi nước, kêu lạ dàn lạnh', N'Bật điều hòa lên nghe thấy tiếng nước chảy ọc ọc bên trong?', N'Đây là tiếng gas lỏng luân chuyển trong đường ống đồng khi máy bắt đầu khởi động, hiện tượng hoàn toàn bình thường không cần sửa chữa.'),
(N'AirConditioner', N'tự động bật tắt, tự mở, tự tắt, loạn khiển điều hòa', N'Điều hòa tự động bật tắt liên tục mà không ai bấm khiển?', N'Kiểm tra xem nút bấm nguồn cứng trên thân dàn lạnh có bị kẹt dính không. Hoặc remote của bạn bị chập mạch liên tục phát tín hiệu, hãy tháo pin remote để kiểm tra.'),
(N'AirConditioner', N'gió lúc lạnh lúc nóng, nhiệt độ không đều, phả gió nóng', N'Gió thổi ra từ điều hòa lúc lạnh buốt, lúc lại chỉ có gió nóng?', N'Cảm biến nhiệt độ phòng (thermostat) bị sai số hoặc cắm lỏng. Tháo mặt nạ máy ra, cắm chặt lại giắc cắm đầu cảm biến đồng và cảm biến đầu ruồi vào bo mạch.'),
(N'AirConditioner', N'không chỉnh được nhiệt độ, khóa remote, remote bị đơ', N'Không thể thay đổi nhiệt độ bằng remote điều hòa?', N'Kiểm tra xem remote có đang hiện biểu tượng cái khóa (Lock) không. Ấn đồng thời hai phím tăng và giảm nhiệt độ trên remote trong 3 giây để mở khóa.'),
(N'AirConditioner', N'kêu rít rít, rền rĩ dàn lạnh, khô dầu quạt lồng sóc, cọ két', N'Điều hòa phát ra tiếng kêu rít rít chói tai từ dàn lạnh?', N'Cốt của quạt lồng sóc trong dàn lạnh bị khô dầu mỡ. Hãy tháo lớp vỏ nhựa ngoài, dùng dầu bôi trơn (WD-40) xịt một lượng nhỏ vào hai đầu trục quay của quạt.'),
(N'AirConditioner', N'mất số màn hình, tối LED nhiệt độ, không hiện số độ', N'Màn hình LED hiển thị nhiệt độ trên dàn lạnh bị tắt mất?', N'Bấm nút ''Light'' hoặc ''Display'' trên remote để bật lại đèn hiển thị nhiệt độ trên mặt nạ dàn lạnh.'),
(N'AirConditioner', N'chế độ sưởi không ấm, không ra hơi nóng, heat lỗi, máy hai chiều', N'Điều hòa bật chế độ sưởi (Heat) nhưng không ra hơi ấm?', N'Chế độ sưởi cần thời gian khởi động làm nóng từ 5-10 phút thì quạt dàn lạnh mới bắt đầu thổi gió ra để tránh thổi gió lạnh vào người dùng. Hãy kiên nhẫn đợi.');

-- 4. Audio (Thiết Bị Âm Thanh)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Audio', N'loa không lên nguồn, mất nguồn, không bật được loa bluetooth, xập nguồn', N'Loa Bluetooth TechCycle không lên nguồn khi bấm nút?', N'Cắm sạc cho loa trong khoảng 30 phút rồi thử lại. Nhiều dòng loa xả cạn pin sẽ cần thời gian sạc mồi trước khi có thể kích hoạt nguồn trở lại.'),
(N'Audio', N'loa rè, méo tiếng, vỡ tiếng, âm thanh rè, màng loa rách', N'Loa phát ra âm thanh bị rè, méo tiếng khi vặn volume lớn?', N'Màng loa bị rách hoặc bám quá nhiều bụi bẩn, mạt sắt. Tháo lưới bảo vệ ngoài, kiểm tra viền nhún cao su xem có rách không, dùng keo chuyên dụng dán lại vết rách nhỏ.'),
(N'Audio', N'bluetooth chập chờn, mất kết nối, giật lag âm thanh, đứt quãng', N'Loa kết nối Bluetooth chập chờn, âm thanh bị giật vấp?', N'Đưa điện thoại lại gần loa trong phạm vi dưới 5 mét. Tắt các thiết bị phát sóng Wi-Fi băng tần 2.4GHz ở cạnh bên vì chúng rất dễ gây nhiễu sóng Bluetooth.'),
(N'Audio', N'amply ù ù, sôi tiếng, xì xào, rò điện amply, nhiễu âm', N'Amply phát ra tiếng ù ù rất to ra loa ngay khi vừa bật lên?', N'Do đứt dây tiếp địa hoặc lỏng giắc cắm AV (dây hoa sen). Hãy siết chặt lại giắc cắm hoặc nối một sợi dây điện từ vỏ amply chạm xuống nền đất để triệt tiêu dòng rò.'),
(N'Audio', N'micro không nhận, hát không có tiếng, mất sóng mic, micro kẹo kéo', N'Loa kéo không nhận micro không dây, hát không ra tiếng?', N'Thay pin mới cho micro. Sau đó bật nguồn cả loa và mic, nhấn nút Set tần số trên micro để đồng bộ lại dải tần trùng khớp với bo mạch thu của loa.'),
(N'Audio', N'tai nghe 1 bên, nghe 1 bên, điếc 1 tai, jack 3.5 lỗi, một bên tai không kêu', N'Cắm tai nghe vào jack 3.5mm nhưng chỉ nghe được một bên tai?', N'Dùng một chiếc tăm nhỏ cuốn chút bông ẩm lau sạch rỉ sét, bụi bẩn bên trong lỗ cắm tai nghe. Đảm bảo giắc cắm tai nghe được ấn sâu hết cỡ vào lỗ.'),
(N'Audio', N'sạc không vào pin loa, lỗi cổng sạc loa, loa bluetooth hỏng sạc', N'Loa không sạc được vào pin, đèn báo sạc không sáng?', N'Kiểm tra xem chân cắm sạc Micro-USB hoặc Type-C của loa có bị gãy, lỏng không. Thử đổi một sợi dây cáp sạc và củ sạc điện thoại khác để loại trừ nguyên nhân.'),
(N'Audio', N'micro hú rít, chói tai, vang vọng, rú tiếng, hú loa', N'Micro hát karaoke bị hú rít chói tai mỗi khi đứng gần loa?', N'Do bạn hướng đầu micro thẳng về phía màng loa bass/treble. Hãy hướng micro ra hướng khác và vặn giảm bớt núm ''HI'' (Treble) hoặc núm ''ECHO'' trên bảng điều khiển.'),
(N'Audio', N'âm thanh nhỏ, tiếng bé, max volume vẫn bé, loa nghẹt', N'Âm thanh phát ra từ loa nghe rất nhỏ dù đã vặn hết cỡ volume?', N'Kiểm tra âm lượng trên cả nguồn phát (điện thoại, máy tính) xem đã đẩy lên mức tối đa chưa. Nhiều thiết bị khống chế âm lượng tai nghe để bảo vệ thính lực.'),
(N'Audio', N'rớt nước, vô nước, loa dính nước, ngập nước âm thanh', N'Loa bị rớt xuống nước, cách cấp cứu tại nhà nhanh nhất?', N'Tắt nguồn loa ngay lập tức, tuyệt đối không bật lên thử. Dùng máy sấy tóc sấy gió mát cho ráo nước bên ngoài rồi bỏ loa vào thùng gạo hoặc túi hút ẩm trong 48 tiếng.'),
(N'Audio', N'núm vặn rột rẹt, vặn volume kêu rè, lỏng chiết áp, nhiễu volum', N'Núm vặn Volume (chiết áp) khi xoay nghe tiếng rột rẹt ra loa?', N'Chiết áp bị bám bụi và rỉ sét bên trong lõi than. Hãy tháo núm nhựa, xịt một chút dung dịch vệ sinh mạch điện chuyên dụng (RP7 hoặc WD-40) vào khe chiết áp rồi xoay qua xoay lại liên tục.'),
(N'Audio', N'tai nghe true wireless không sạc, dock sạc lỗi, tai nghe không vào pin', N'Tai nghe True Wireless không sạc được cho một bên tai khi bỏ vào dock?', N'Dùng tăm bông tẩm cồn lau sạch 2 điểm tiếp xúc bằng đồng dưới chuôi tai nghe và 2 chân kim trong dock sạc. Đôi khi mồ hôi muối bám vào làm cách điện.'),
(N'Audio', N'cắm tivi không tiếng, optical không ra tiếng, cổng quang tivi, soundbar lỗi', N'Dàn âm thanh cắm vào tivi qua cổng Optical nhưng không ra tiếng?', N'Vào cài đặt âm thanh trên Tivi, chuyển định dạng đầu ra âm thanh từ ''Dolby Digital'' hoặc ''DTS'' sang chuẩn ''PCM''. Đảm bảo đã rút 2 nút cao su bảo vệ ở hai đầu dây cáp quang.'),
(N'Audio', N'nổ lụp bụp, bồm bộp, tiếng nổ loa vi tính, giật tạch tạch', N'Loa vi tính bật lên có tiếng nổ lụp bụp bồm bộp rất khó chịu?', N'Do dây tín hiệu đầu vào bị hở, đứt ngầm hoặc chạm mát. Bạn hãy thay thế sợi dây giắc 3.5mm nối từ máy tính ra loa bằng một sợi dây mới.'),
(N'Audio', N'loa 5.1 không đủ tiếng, loa vệ tinh không kêu, thiếu loa con', N'Dàn loa 5.1 không phát đủ âm thanh ra các loa vệ tinh?', N'Do nguồn nhạc vào chỉ là nhạc Stereo (2 kênh). Bạn cần bật chế độ giả lập âm thanh vòm (Pro Logic hoặc Surround) trên amply để âm thanh được chia đều ra các loa.'),
(N'Audio', N'thiếu bass, bass yếu, đấu ngược dây loa, mỏng tiếng trống', N'Âm Bass của loa nghe rất yếu, mỏng và không sâu?', N'Kiểm tra xem loa có bị đặt ngược cực âm dương (+/-) dải dây loa không (lỗi lệch pha). Hãy đấu nối lại dây loa đảm bảo dây màu đỏ vào cọc đỏ, dây đen vào cọc đen.'),
(N'Audio', N'loa thông minh điếc, không nghe lệnh giọng nói, mic smart speaker', N'Loa thông minh không nhận diện được câu lệnh giọng nói?', N'Kiểm tra lại kết nối Wi-Fi của loa qua ứng dụng quản lý trên điện thoại. Vệ sinh lỗ mic nhỏ trên bề mặt loa vì bụi bẩn bít kín làm loa không nghe thấy lệnh.'),
(N'Audio', N'soundbar không tự bật, lỗi HDMI ARC, eARC, đồng bộ tivi', N'Soundbar không tự động bật cùng tivi khi kết nối qua cáp HDMI?', N'Đảm bảo bạn đã cắm dây cáp vào đúng cổng có ký hiệu ''HDMI ARC'' hoặc ''HDMI eARC'' trên tivi và đã bật tính năng ''HDMI-CEC'' (Anynet+ trên Samsung, SimpLink trên LG) trong cài đặt tivi.'),
(N'Audio', N'tự tắt nguồn, sập nguồn nhanh, tự ngắt loa bluetooth, auto off', N'Loa Bluetooth tự động tắt nguồn chỉ sau 10-15 phút mặc dù vẫn còn pin?', N'Đây là tính năng tiết kiệm pin tự động khi loa không nhận được tín hiệu âm thanh đầu vào ổn định. Hãy tăng volume trên điện thoại lên mức tối đa và giảm volume trên loa lại.'),
(N'Audio', N'vỏ gỗ hở, nứt thùng loa, rè phè phè, dán thùng loa', N'Vỏ loa gỗ bị hở gãy góc khiến âm thanh nghe phè phè?', N'Thùng loa bị hở sẽ làm mất áp suất lồng âm. Dùng keo sữa (keo dán gỗ) trộn với một ít mùn cưa mịn trét chặt vào các vết nứt hở, đợi khô hẳn âm thanh sẽ chuẩn lại.');

-- 5. Laptop
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Laptop', N'không lên nguồn, bật không lên, mất nguồn laptop, tối đèn sạc', N'Laptop TechCycle bật không lên nguồn, đèn báo sạc không sáng?', N'Thử rút sạc, tháo pin ra (nếu là pin rời), nhấn giữ nút nguồn liên tục trong 30 giây để xả hết điện tích tụ trên bo mạch, sau đó lắp sạc trực tiếp và bật lại.'),
(N'Laptop', N'quá nhiệt, nóng máy, quạt kêu to, tản nhiệt kêu vù vù, laptop rát tay', N'Laptop chạy rất nóng, quạt gió kêu rú to bần bật?', N'Bụi bám kín khe tản nhiệt. Hãy dùng bình khí nén xịt mạnh vào các khe thoát gió để đẩy bụi ra ngoài. Tuyệt đối không đặt laptop lên nệm, chăn khi sử dụng.'),
(N'Laptop', N'liệt bàn phím, kẹt phím, gõ không chữ, nhảy loạn chữ, loạn phím', N'Bàn phím laptop bị liệt một vài nút không gõ được?', N'Dùng chổi cọ nhỏ vệ sinh dưới chân phím bị liệt. Nếu gõ chữ ra một chuỗi ký tự lạ, hãy vào cài đặt Language đổi chuẩn bàn phím từ ''ENG - International'' về ''ENG - US''.'),
(N'Laptop', N'chuột cảm ứng, touchpad đơ, không di chuột, liệt chuột laptop', N'Touchpad (chuột cảm ứng) của laptop không di chuyển được?', N'Kiểm tra xem bạn có vô tình tắt Touchpad bằng phím tắt không (thường là tổ hợp phím Fn + F6, F7 hoặc F9 tùy dòng máy). Hoặc nhấn đúp vào góc trái trên cùng của Touchpad.'),
(N'Laptop', N'không bắt wifi, rớt mạng, mất biểu tượng wifi, quả cầu mạng', N'Laptop không kết nối được Wi-Fi hoặc hiện biểu tượng quả cầu?', N'Nhấp chuột phải vào biểu tượng Wi-Fi > Chọn ''Troubleshoot problems''. Hoặc mở Device Manager, tìm mục Network Adapters, nhấp chuột phải vào driver Wi-Fi và chọn ''Enable''.'),
(N'Laptop', N'sạc pin không lên phần trăm, plugged in not charging, lỗi pin laptop', N'Laptop báo sạc pin nhưng phần trăm pin không tăng (Plugged in, not charging)?', N'Vào Device Manager > Mở rộng mục Batteries > Nhấp chuột phải vào ''Microsoft ACPI-Compliant Control Method Battery'' và chọn Uninstall. Sau đó khởi động lại laptop để máy tự nhận lại driver pin.'),
(N'Laptop', N'sọc màn hình, nhấp nháy, đứt cáp màn, nhòe màn, gập vỡ hình', N'Màn hình laptop bị sọc ngang, sọc dọc hoặc nhấp nháy?', N'Thử gập mở màn hình nhẹ nhàng ở nhiều góc độ khác nhau. Nếu sọc biến mất ở một góc nhất định, chứng tỏ cáp màn hình bị lỏng hoặc dập, cần mang đi cố định lại cáp.'),
(N'Laptop', N'màn hình xanh, bsod, dump ram, chết chóc, reset khởi động lại', N'Laptop khởi động thẳng vào màn hình xanh chết chóc (BSOD)?', N'Thường do xung đột driver phần cứng vừa cài hoặc lỗi RAM. Hãy tháo mặt lưng máy, tháo thanh RAM ra dùng cục tẩy lau sạch chân đồng tiếp xúc rồi cắm chặt lại vào khe.'),
(N'Laptop', N'loa nhỏ, loa rè, âm thanh laptop bé, loa chói tai', N'Loa laptop nghe rất nhỏ hoặc bị rè rè?', N'Nhấp chuột phải vào biểu tượng loa thanh Taskbar > Chọn Sounds > Properties > Tab Enhancements > Tích chọn ''Loudness Equalization'' để kích âm lượng to hơn.'),
(N'Laptop', N'không nhận usb, lỗi cổng cắm, thiết bị ngoại vi chấm than', N'Laptop không nhận thiết bị USB hoặc chuột cắm ngoài?', N'Vào Device Manager, cuộn xuống mục Universal Serial Bus controllers, nhấp chuột phải vào các mục có dấu chấm than vàng và chọn ''Update driver''.'),
(N'Laptop', N'chai pin, sập nguồn, tụt pin nhanh, rút sạc tắt, pin hỏng', N'Thời lượng pin laptop tụt dốc không phanh, rút sạc ra là sập nguồn?', N'Pin đã bị chai hoàn toàn. Bạn có thể tự mua viên pin đúng mã máy về tháo ốc mặt đáy, rút giắc cắm pin cũ ra và gắn pin mới vào rất dễ dàng.'),
(N'Laptop', N'đơ máy, treo máy, đứng hình, treo chuột, đơ cứng task manager', N'Laptop bị đơ, đứng máy hoàn toàn không di chuyển được chuột?', N'Nhấn tổ hợp phím `Ctrl + Shift + Esc` để mở Task Manager, tìm ứng dụng đang ngốn 100% CPU/RAM rồi chọn End Task để giải phóng máy.'),
(N'Laptop', N'lỗi camera, webcam đen, không mở được cam, tối thui camera', N'Camera/Webcam của laptop bật lên màn hình tối đen hoặc xám xịt?', N'Kiểm tra xem laptop có lẫy gạt vật lý bảo mật che camera trên viền màn hình không, hãy gạt mở nó ra. Hoặc nhấn phím bật camera trên hàng phím F (thường là F10).'),
(N'Laptop', N'máy chạy chậm, giật lag, hdd 100%, full disk, đơ chậm chạp', N'Laptop chạy cực kỳ chậm chạp, mở một thư mục mất vài phút?', N'Ổ cứng HDD cũ đã bị phân mảnh hoặc lỗi Bad Sector. Hãy dọn rác bằng Disk Cleanup, xóa bớt app chạy ngầm hoặc nâng cấp lên ổ cứng SSD để máy chạy nhanh gấp 10 lần.'),
(N'Laptop', N'tiếng bíp bíp, kêu tít tít khi bật máy, báo lỗi ram, kẹt phím tít', N'Laptop bật lên nghe tiếng tít tít liên tục và màn hình không sáng?', N'Đây là mã âm thanh báo lỗi phần cứng (thường là lỏng RAM hoặc kẹt phím). Tháo RAM ra vệ sinh chân cắm và kiểm tra xem có phím nào đang bị đè lún xuống không.'),
(N'Laptop', N'bluetooth không kết nối, lỗi tai nghe bluetooth, không quét thiết bị', N'Không thể kết nối Bluetooth từ laptop với chuột/tai nghe?', N'Nhấn tổ hợp phím `Windows + I` > Devices > Bluetooth > Gạt Tắt rồi Bật lại nút Bluetooth để hệ thống quét lại các thiết bị ngoại vi xung quanh.'),
(N'Laptop', N'không xuất màn hình ngoài, hdmi không nhận, cắm tivi không lên', N'Laptop không xuất được hình ảnh ra màn hình ngoài qua cổng HDMI?', N'Nhấn tổ hợp phím `Windows + P` trên bàn phím và chọn chế độ `Duplicate` (Nhân đôi màn hình) hoặc `Extend` (Mở rộng màn hình) thay vì chế độ chỉ hiển thị màn hình chính.'),
(N'Laptop', N'micro không tiếng, mic bé, thu âm lỗi, gọi không nghe', N'Micro laptop thu âm không có tiếng hoặc tiếng quá nhỏ?', N'Vào `Settings` > `Privacy` > `Microphone` > Bật tùy chọn ''Allow apps to access your microphone''. Kiểm tra âm lượng mic trong Sound Control Panel đẩy lên mức 100.'),
(N'Laptop', N'ổ c báo đỏ, đầy bộ nhớ, hết dung lượng đĩa C, full bộ nhớ laptop', N'Ổ đĩa C của laptop báo vạch đỏ do đầy dung lượng?', N'Xóa các file trong thư mục `Downloads`, dọn sạch Recycle Bin (Thùng rác). Nhấn `Windows + R`, gõ `%temp%` rồi xóa toàn bộ các tệp tin tạm có trong thư mục này.'),
(N'Laptop', N'đổ nước vào phím, dính cà phê, vô nước laptop, cứu hộ nước', N'Laptop bị đổ nước, trà, cà phê lên bàn phím, cứu thế nào?', N'Lập tức rút sạc, nhấn giữ nút nguồn tắt máy ngay. Lật ngược laptop thành hình chữ V úp xuống bàn để nước chảy ngược ra ngoài, không lọt vào bo mạch chính. Đợi khô 24 tiếng.');

-- 6. Smartwatch (Đồng Hồ Thông Minh)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Smartwatch', N'không lên nguồn, sạc không vào điện, đen màn hình đồng hồ, chết nguồn', N'Đồng hồ thông minh TechCycle không lên nguồn, cắm sạc không báo gì?', N'Dùng tăm bông tẩm một chút cồn lau sạch các điểm tiếp xúc sạc bằng đồng ở mặt lưng đồng hồ và trên đầu cáp sạc từ tính. Đôi khi mồ hôi muối tạo thành lớp màng cách điện.'),
(N'Smartwatch', N'hao pin nhanh, tụt pin smartwatch, pin kém, nhanh hết pin, sụt pin', N'Smartwatch tụt pin rất nhanh, dùng chưa được nửa ngày đã hết?', N'Tắt tính năng màn hình luôn bật (Always-On Display), giảm độ sáng màn hình xuống mức trung bình và tắt bớt tính năng đo nhịp tim liên tục 24/7 trong phần cài đặt.'),
(N'Smartwatch', N'ngắt kết nối bluetooth, mất sóng với điện thoại, rớt mạng đồng hồ', N'Đồng hồ liên tục bị mất kết nối Bluetooth với điện thoại?', N'Mở ứng dụng quản lý đồng hồ trên điện thoại (như Mi Fitness, Galaxy Wearable...), đảm bảo ứng dụng được cấp quyền chạy ngầm và không bị hệ điều hành tự động đóng để tiết kiệm pin.'),
(N'Smartwatch', N'liệt cảm ứng, đơ màn hình smartwatch, vuốt không ăn, treo táo', N'Màn hình cảm ứng của smartwatch bị đơ, vuốt không ăn?', N'Nhấn giữ nút nguồn vật lý bên hông từ 10-15 giây để ép đồng hồ khởi động lại. Lau khô mặt kính vì nước bám vào bề mặt sẽ làm loạn cảm ứng.'),
(N'Smartwatch', N'không hiện thông báo, mất tin nhắn zalo, mất cuộc gọi smartwatch', N'Smartwatch không hiển thị thông báo tin nhắn từ Zalo, Facebook?', N'Vào ứng dụng quản lý trên điện thoại > Mục Thông báo > Bật quyền cho phép ứng dụng truy cập thông báo và tick chọn các app bạn muốn nhận tin nhắn lên đồng hồ.'),
(N'Smartwatch', N'đếm sai bước chân, đo sai km, không đếm bước, lỗi cảm biến đi bộ', N'Đồng hồ đo sai số bước chân hoặc không đếm bước khi đi bộ?', N'Khởi động lại đồng hồ để hiệu chỉnh lại cảm biến gia tốc (G-sensor). Đảm bảo bạn đeo đồng hồ vừa vặn với cổ tay, không đeo quá lỏng khiến cảm biến lắc lư sai lệch.'),
(N'Smartwatch', N'cảm biến nhịp tim hỏng, không sáng đèn, spo2 lỗi, không đo được tim', N'Cảm biến nhịp tim/SpO2 ở mặt lưng không sáng đèn xanh/đỏ và không đo được?', N'Lau sạch lớp kính bám mồ hôi ở mặt lưng đồng hồ. Khi đo, hãy ngồi im và giữ cổ tay thăng bằng, tránh di chuyển hoặc nói chuyện làm lệch tia quét cảm biến.'),
(N'Smartwatch', N'sai gps, lệch bản đồ, vẽ sai đường chạy, mất định vị smartwatch', N'Smartwatch định vị GPS chạy bộ sai lệch quãng đường rất lớn?', N'Trước khi bắt đầu buổi chạy ngoài trời, hãy đứng ở không gian trống trải từ 1-2 phút để đồng hồ kết nối và khóa tín hiệu với vệ tinh GPS một cách ổn định nhất.'),
(N'Smartwatch', N'loa nhỏ, rè nước, đi bơi về hỏng loa, đẩy nước đồng hồ', N'Loa thoại trên đồng hồ nghe rất nhỏ hoặc bị rè sau khi đi bơi về?', N'Nước vẫn còn kẹt trong lỗ loa. Hãy bật tính năng ''Thoát nước'' (Eject Water) trên đồng hồ để máy phát tần số âm thanh đẩy nước ra ngoài, hoặc vẩy mạnh đồng hồ.'),
(N'Smartwatch', N'treo logo, kẹt màn hình khởi động, treo táo smartwatch, brick', N'Đồng hồ thông minh bị treo logo không vào được màn hình chính?', N'Đặt đồng hồ lên dock sạc, nhấn giữ đồng thời nút nguồn và nút chức năng trong 15 giây để ép đưa máy về chế độ recovery và tự động reboot lại phần mềm.'),
(N'Smartwatch', N'sai giờ, sai thời gian, lệch múi giờ, chạy sai đồng hồ', N'Thời gian trên đồng hồ bị chạy sai lệch so với thực tế?', N'Kết nối đồng hồ với điện thoại qua Bluetooth. Smartwatch sẽ tự động đồng bộ thời gian theo múi giờ và đồng hồ nguyên tử của điện thoại ngay lập tức.'),
(N'Smartwatch', N'dây cao su bẩn, ố màu dây, làm sạch dây đeo, dơ dây đồng hồ', N'Dây đeo cao su của smartwatch bị bẩn ố màu, giặt không sạch?', N'Tháo dây ra khỏi mặt đồng hồ, dùng một chút kem đánh răng hoặc nước rửa chén chà nhẹ bằng bàn chải đánh răng cũ để đánh bay các vết ố bẩn cứng đầu.'),
(N'Smartwatch', N'không rung, mất rung, cuộc gọi không rung, lỗi rung smartwatch', N'Smartwatch không rung khi có cuộc gọi đến?', N'Kiểm tra xem bạn có đang vô tình bật chế độ ''Không làm phiền'' (Do Not Disturb) hoặc chế độ ''Ban đêm / Đi ngủ'' không. Nếu có, hãy vuốt thanh trạng thái tắt đi.'),
(N'Smartwatch', N'lỗi đổi hình nền, không sync mặt đồng hồ, watchface lỗi', N'Không thể thay đổi hình nền (mặt đồng hồ) mới qua app?', N'Xóa bớt các mặt đồng hồ cũ đã lưu trong bộ nhớ máy để giải phóng dung lượng. Đảm bảo dung lượng pin đồng hồ trên 30% thì mới tiến hành đồng bộ truyền file mặt đồng hồ.'),
(N'Smartwatch', N'sạc nóng, ngắt sạc giữa chừng, lỗi nhiệt smartwatch, sạc nhanh hỏng', N'Đồng hồ sạc rất nóng rồi tự động ngắt sạc?', N'Không dùng củ sạc nhanh (20W, 30W) của điện thoại để sạc cho đồng hồ. Hãy cắm dây sạc vào cổng USB máy tính hoặc củ sạc thường công suất thấp (5V-1A) để bảo vệ pin.'),
(N'Smartwatch', N'kẹt nút xoay, núm vặn cứng, digital crown lỗi, kẹt bánh răng', N'Nút xoay vật lý (Digital Crown) bị kẹt, xoay nặng tay?', N'Bụi bẩn hoặc nước ngọt kẹt vào kẽ nút xoay. Ngâm nhẹ cạnh nút xoay vào một chút nước ấm sạch trong vài giây, vừa xoay nhẹ vừa nhấn để rác bẩn tan ra và trôi ra ngoài.'),
(N'Smartwatch', N'không sáng khi nhấc tay, raise to wake hỏng, lắc tay không sáng', N'Đồng hồ không tự sáng màn hình khi nhấc cổ tay lên (Raise to Wake)?', N'Vào cài đặt trên đồng hồ hoặc trên ứng dụng điện thoại, tìm mục ''Nhấc cổ tay sáng màn hình'' và kiểm tra xem tính năng này có đang bị tắt hoặc hẹn giờ tắt không.'),
(N'Smartwatch', N'đầy bộ nhớ, không lưu bài tập, full memory đồng hồ', N'Smartwatch báo lỗi đầy bộ nhớ không thể lưu lịch sử tập luyện?', N'Mở app trên điện thoại, thực hiện thao tác đồng bộ hóa để toàn bộ dữ liệu tập luyện cũ trên đồng hồ được đẩy lên lưu trữ đám mây, bộ nhớ đồng hồ sẽ tự trống lại.'),
(N'Smartwatch', N'không bắt wifi, mất mạng smartwatch, rớt wifi độc lập', N'Đồng hồ thông minh bị mất kết nối Wi-Fi độc lập?', N'Vào cài đặt Wi-Fi trên đồng hồ, xóa mạng cũ đi và kết nối lại. Lưu ý hầu hết smartwatch chỉ hỗ trợ băng tần mạng 2.4GHz, không bắt được mạng 5GHz.'),
(N'Smartwatch', N'xước mặt kính, trầy dăm, làm mờ vết xước, đánh bóng đồng hồ', N'Mặt kính đồng hồ bị trầy xước dăm nhiều vết nhỏ?', N'Thoa một chút kem đánh răng loại trắng thông thường (không chứa hạt) lên mặt kính, dùng khăn vải mềm mịn lau miết theo hình vòng tròn trong vài phút để làm mờ vết xước.');

-- 7. Smartphone (Điện Thoại)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Smartphone', N'treo máy, đơ màn hình, không cảm ứng được, đứng hình smartphone', N'Smartphone TechCycle bị treo đơ màn hình hoàn toàn?', N'Ép khởi động lại bằng cách nhấn giữ đồng thời nút Nguồn và nút Giảm âm lượng trong 10-15 giây cho đến khi máy rung lên và hiện logo khởi động.'),
(N'Smartphone', N'văng ứng dụng, crash app, bật lên tự thoát, tự văng ra ngoài', N'Ứng dụng đột ngột thoát (Crash) liên tục khi vừa mở?', N'Vào Cài đặt > Ứng dụng > Tìm ứng dụng bị lỗi > Chọn Buộc dừng, sau đó vào mục Lưu trữ chọn ''Xóa bộ nhớ đệm'' (Clear Cache).'),
(N'Smartphone', N'sạc chậm, sạc không vào pin, lỗi cổng sạc type-c, lỏng lỗ sạc', N'Điện thoại sạc không vào pin hoặc sạc vô cùng chậm?', N'Dùng tăm gỗ cẩn thận khều nhẹ bụi bẩn, xơ vải kẹt sâu trong cổng sạc Type-C/Lightning. Đổi củ sạc hoặc dây cáp khác để kiểm tra.'),
(N'Smartphone', N'tụt pin nhanh, hao pin, pin ảo, ngốn pin điện thoại', N'Pin điện thoại tụt rất nhanh dù không sử dụng nhiều?', N'Vào Cài đặt > Pin để xem ứng dụng nào chạy ngầm ngốn pin nhiều nhất và gỡ bỏ. Giảm độ sáng màn hình xuống mức tự động.'),
(N'Smartphone', N'nóng máy, quá nhiệt, cảnh báo nhiệt độ, chơi game nóng ran', N'Điện thoại bị nóng lên bất thường (quá nhiệt)?', N'Tháo ốp lưng, tắt các kết nối không cần thiết như 4G, GPS, Bluetooth, đóng tất cả các tab game nặng chạy ngầm và để máy nghỉ ngơi.'),
(N'Smartphone', N'không nhận sim, no sim, mất sóng di động, khay sim lỗi', N'Máy báo lỗi không nhận thẻ SIM (No SIM)?', N'Tháo khay SIM, dùng gôm hoặc khăn mềm lau sạch mặt đồng tiếp xúc của SIM, lắp chặt lại vào khay. Bật/tắt Chế độ máy bay để máy quét lại sóng.'),
(N'Smartphone', N'lỗi wifi, mất kết nối wifi, wifi chập chờn, rớt mạng điện thoại', N'Không kết nối được Wi-Fi hoặc Wi-Fi liên tục ngắt kết nối?', N'Vào cài đặt Wi-Fi, chọn mạng đang lỗi bấm ''Quên mạng'' rồi nhập lại pass. Nếu vẫn không được, hãy khởi động lại cục modem phát Wi-Fi nhà bạn.'),
(N'Smartphone', N'loa rè, mất tiếng loa ngoài, nghe bé, loa điện thoại tịt', N'Loa ngoài của điện thoại nghe bị rè hoặc mất tiếng hoàn toàn?', N'Dùng bàn chải đánh răng khô, lông mềm chà nhẹ rãnh loa ngoài ở cạnh dưới máy để đẩy bụi bẩn bám dính ra ngoài. Kiểm tra xem máy có bị kẹt chế độ tai nghe không.'),
(N'Smartphone', N'mic hỏng, mic nhỏ, gọi không nghe rõ, thu âm điện thoại xè', N'Microphone thu âm rất nhỏ, đầu dây bên kia nghe không rõ?', N'Dùng tăm nhọn gạt nhẹ lớp bụi bám ở lỗ micro nhỏ cạnh cổng sạc dưới đáy máy. Hãy cẩn thận gạt ngang bề mặt chứ không chọc sâu thẳng vào trong lỗ làm thủng màng mic.'),
(N'Smartphone', N'loạn cảm ứng, nhảy màn hình, vuốt ảo, ghost touch smartphone', N'Màn hình cảm ứng bị loạn, tự nhảy cảm ứng dù không chạm?', N'Bóc miếng dán cường lực cũ ra vì tấm dán nứt hoặc dính nước bên trong gây loạn dòng điện cảm ứng. Lau sạch màn hình bằng khăn khô.'),
(N'Smartphone', N'camera đen, lỗi máy ảnh, chụp mờ, không mở được cam', N'Camera không mở được, báo lỗi camera hoặc hiện màn hình đen?', N'Vào Cài đặt > Ứng dụng > Máy ảnh > Chọn Xóa dữ liệu và bộ nhớ đệm của app Máy ảnh, sau đó khởi động lại thiết bị.'),
(N'Smartphone', N'sập nguồn, đột tử điện thoại, đang dùng sập nguồn, pin ảo', N'Điện thoại bị sập nguồn đột ngột khi pin vẫn báo còn 15-20%?', N'Lỗi pin ảo. Hãy xả pin về hẳn 0% cho tắt máy hoàn toàn, sau đó cắm sạc liên tục không rút đến khi báo đầy 100% để hiệu chỉnh lại mạch IC nguồn của pin.'),
(N'Smartphone', N'không kết nối bluetooth, lỗi tai nghe không dây, không quét ra thiết bị', N'Không kết nối được Bluetooth với tai nghe không dây?', N'Vào cài đặt Bluetooth, chọn ''Quên thiết bị'' đối với tên tai nghe cũ. Tắt bật lại Bluetooth trên điện thoại rồi tiến hành dò quét quét và kết nối lại.'),
(N'Smartphone', N'4g yếu, 5g kém, mạng chậm, không vào mạng 4g, reset apn', N'Mạng dữ liệu di động 4G/5G rất yếu hoặc không vào được mạng?', N'Vào Cài đặt > Quản lý mạng di động > Đặt lại tên điểm truy cập (Reset APN) về mặc định, hoặc bật rồi tắt Chế độ máy bay để reset trạm sóng.'),
(N'Smartphone', N'sai định vị, gps lệch, bản đồ sai, map chỉ sai hướng', N'GPS định vị sai vị trí hiện tại trên Google Maps?', N'Vào Cài đặt > Vị trí > Bật chế độ ''Độ chính xác cao''. Mở Google Maps và cầm điện thoại xoay vòng theo hình số 8 trong không trung vài lần để hiệu chỉnh la bàn.'),
(N'Smartphone', N'bộ nhớ đầy, full dung lượng, không chụp được ảnh, xóa rác', N'Điện thoại báo bộ nhớ đầy không thể chụp thêm ảnh?', N'Sử dụng ứng dụng Files by Google để dọn tệp rác. Xóa bớt các video nặng trong mục Downloads hoặc chuyển ảnh lên lưu trữ đám mây Google Drive/Photos.'),
(N'Smartphone', N'không tải được app, lỗi ch play, app store, treo tải ứng dụng', N'Không tải được ứng dụng trên CH Play / App Store?', N'Kiểm tra xem ngày giờ trên điện thoại có chính xác không (bật Đặt tự động). Xóa bộ nhớ đệm của kho ứng dụng rồi mở lại.'),
(N'Smartphone', N'kẹt nút nguồn, liệt phím âm lượng, cứng nút điện thoại, hỏng phím', N'Nút Nguồn hoặc nút Âm lượng vật lý bị kẹt cứng, bấm không có độ nảy?', N'Dùng tăm bông thấm một giọt cồn 90 độ (vắt thật kiệt bông) lau miết xung quanh khe nút bấm để đánh tan bụi bẩn hoặc nước ngọt bám dính, bấm liên tục để nút nhả ra.'),
(N'Smartphone', N'ám vàng, màn xanh, sai màu màn hình, bảo vệ mắt, night shift', N'Màn hình điện thoại hiển thị quá vàng hoặc quá xanh?', N'Kiểm tra xem bạn có đang bật chế độ ''Bảo vệ mắt'' (Eye Comfort / Night Shield) không, hãy tắt đi. Hoặc vào Cài đặt màn hình điều chỉnh lại Thanh cân bằng trắng (White Balance).'),
(N'Smartphone', N'rớt nước, vô nước, điện thoại dính nước, hút ẩm thùng gạo', N'Điện thoại bị rơi xuống vũng nước, cách xử lý khẩn cấp?', N'Tắt nguồn máy ngay lập tức. Tháo khay SIM ra, dùng khăn lau khô bề ngoài. Bỏ máy vào trong thùng gạo hoặc hộp kín chứa nhiều túi hút ẩm trong ít nhất 24 tiếng.');

-- 8. Tablet (Máy Tính Bảng)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Tablet', N'sạc rất lâu, sạc chậm, sạc không đầy tablet, sạc máy tính bảng lâu', N'Máy tính bảng TechCycle sạc pin rất lâu, cắm cả đêm không đầy?', N'Máy tính bảng có dung lượng pin lớn, nếu dùng củ sạc thường 5W sẽ cực kỳ chậm. Hãy đổi sang củ sạc nhanh công suất từ 18W-30W chính hãng và dây cáp chịu tải dòng cao.'),
(N'Tablet', N'sọc màn hình, nhấp nháy, lỏng cáp tablet, màn hình bị nhòe vạch', N'Màn hình lớn của tablet hiển thị bị sọc hoặc nhấp nháy liên tục?', N'Do xung đột tần số quét màn hình hoặc lỏng cáp. Hãy thử khởi động lại máy. Nếu bóp nhẹ vào phần viền màn hình sọc biến mất thì cáp nối màn hình đã bị lỏng.'),
(N'Tablet', N'không nhận bàn phím, bao da lỗi gõ chữ, hỏng pogo pin', N'Bàn phím bao da cắm vào tablet không nhận diện được chữ gõ?', N'Dùng khăn khô lau sạch các cổng tiếp xúc chấu nam châm (Pogo pin) ở cạnh dưới máy tính bảng và trên bàn phím. Đảm bảo lắp đặt đúng khớp hít nam châm.'),
(N'Tablet', N'bút cảm ứng lỗi, apple pencil không nhận, hỏng stylus, viết không ra', N'Bút cảm ứng (Stylus) không viết vẽ được trên màn hình tablet?', N'Kiểm tra dung lượng pin của bút cảm ứng (nếu có pin). Vào cài đặt Bluetooth hủy ghép nối bút cũ rồi cắm bút vào cạnh máy để kích hoạt đồng bộ kết nối lại.'),
(N'Tablet', N'lỗi xoay màn hình, kẹt dọc ngang, tự xoay tablet, khóa xoay', N'Tablet tự động xoay màn hình lung tung hoặc bị khóa cứng góc ngang?', N'Vuốt thanh trạng thái từ trên xuống, kiểm tra xem nút ''Tự động xoay'' (Auto Rotate) có bị tắt hoặc đang khóa ở hướng dọc không, bật lại chế độ tự động xoay.'),
(N'Tablet', N'loa không đều, bên to bên nhỏ, lệch âm tablet, hỏng dải loa', N'Âm thanh phát ra từ 4 loa của tablet không đều, bên to bên nhỏ?', N'Vào Cài đặt > Hỗ trợ > Âm thanh > Kiểm tra thanh trượt Cân bằng âm thanh trái/phải (Audio Balance) xem có bị kéo lệch về một bên không, điều chỉnh về chính giữa.'),
(N'Tablet', N'không phản chiếu màn hình, lỗi screen mirroring, cast tivi, kết nối tv', N'Tablet không kết nối được với màn hình tivi qua tính năng phản chiếu (Screen Mirroring)?', N'Đảm bảo cả máy tính bảng và tivi đều đang kết nối chung một mạng Wi-Fi và cùng một băng tần (ví dụ cùng mạng 2.4GHz) thì hai thiết bị mới dò thấy nhau.'),
(N'Tablet', N'giật lag, đơ khi mở nhiều tab, đầy ram tablet, ipad chạy chậm', N'Máy tính bảng chạy giật lag khủng khiếp khi mở nhiều tab tài liệu cùng lúc?', N'Mở đa nhiệm, vuốt đóng bớt các ứng dụng chạy ngầm không dùng đến. Cài đặt các phiên bản ứng dụng rút gọn (Lite) để giảm tải dung lượng RAM tiêu thụ.'),
(N'Tablet', N'bao da không tự tắt, smart cover lỗi tắt màn, từ tính lỗi', N'Tablet bị lỗi không tự động tắt màn hình khi đóng bao da thông minh (Smart Cover)?', N'Vào Cài đặt > Tính năng nâng cao > Bật tùy chọn ''Khóa/Mở khóa bằng bao da'' (Smart Cover Lock). Đảm bảo bao da có tích hợp nam châm cảm biến ở góc viền.'),
(N'Tablet', N'giao diện phóng to, chữ to, sai độ phân giải tablet, zoom bự', N'Giao diện máy tính bảng biến thành kích thước khổng lồ như điện thoại, rất xấu?', N'Do chỉnh sai độ phân giải hiển thị. Vào Cài đặt > Màn hình > Độ thu nhỏ màn hình (Screen Zoom), điều chỉnh thanh trượt về mức nhỏ để giao diện tối ưu cho tablet.'),
(N'Tablet', N'không nhận esim, lỗi sóng lte, không vô mạng tablet, mất lte', N'Máy tính bảng không nhận mạng dữ liệu di động từ eSIM?', N'Vào Cài đặt > Quản lý SIM > Kiểm tra xem cấu hình eSIM đã được kích hoạt chưa. Nếu rồi, hãy bật/tắt chế độ máy bay để buộc eSIM đăng ký lại mạng với nhà đài.'),
(N'Tablet', N'hở cường lực, bong bóng kính, bọt khí màn hình, đẩy bọt dán', N'Kính cường lực của tablet bị bong bóng khí ở các góc viền rộng?', N'Dùng một chiếc thẻ nhựa cứng (thẻ ATM) bọc một lớp vải mỏng, miết mạnh từ vùng có bong bóng khí hướng ra phía viền ngoài để đẩy hết không khí lọt bên trong ra.'),
(N'Tablet', N'zoom không tiếng, mất mic học online, teams lỗi tablet, tắt mic', N'Ứng dụng họp trực tuyến (Zoom, Teams) trên tablet không thu được tiếng?', N'Vào cài đặt quyền ứng dụng, kiểm tra xem Zoom/Teams đã được cấp quyền truy cập ''Microphone'' chưa. Đảm bảo bạn không bấm nhầm nút Mute trong phòng họp.'),
(N'Tablet', N'tai nghe type-c không nhận, mất tiếng dac, tai nghe máy tính bảng', N'Tablet cắm tai nghe Type-C vào nhưng không nghe thấy âm thanh?', N'Nhiều dòng máy tính bảng yêu cầu tai nghe Type-C phải có tích hợp chip giải mã âm thanh DAC bên trong dây. Hãy đổi sang tai nghe có chip DAC hoặc dùng cổng chuyển đổi chính hãng.'),
(N'Tablet', N'bám vân tay, màn dơ, mất lớp phủ oleophobic, mờ kính dính bết', N'Màn hình tablet bám quá nhiều vết vân tay dính bết, lau không sạch?', N'Lớp phủ Oleophobic chống vân tay nguyên bản đã mòn. Hãy xịt một chút dung dịch lau màn hình chuyên dụng lên khăn Microfiber (không xịt trực tiếp lên màn hình) rồi lau nhẹ.'),
(N'Tablet', N'tối màn hình khi chơi game, giảm sáng quá nhiệt, khóa sáng màn hình', N'Tablet tự động giảm độ sáng màn hình xuống cực tối khi đang chơi game?', N'Do máy bị nóng vượt mức cho phép. Đây là tính năng bảo vệ tấm nền màn hình không bị cháy hỏng, hãy ngưng chơi game 5 phút để máy hạ nhiệt độ độ sáng sẽ tự tăng lại.'),
(N'Tablet', N'face id hỏng, không mở khóa khuôn mặt 2d, lỗi quét mặt', N'Không thể mở khóa tablet bằng nhận diện khuôn mặt 2D?', N'Lau sạch camera trước. Đảm bảo góc cầm máy thẳng diện với khuôn mặt và môi trường xung quanh có đủ ánh sáng, không bị ngược sáng quá mạnh.'),
(N'Tablet', N'mất thanh điều hướng, ẩn 3 nút cơ bản, gesture vuốt màn hình', N'Tablet bị mất thanh điều hướng (3 nút bấm quen thuộc dưới đáy)?', N'Do máy đang chuyển sang chế độ ''Cử chỉ toàn màn hình''. Vào Cài đặt > Màn hình > Thanh điều hướng > Chọn lại kiểu hiển thị ''Phím điều hướng'' (Navigation Buttons).'),
(N'Tablet', N'không chia đôi màn hình, lỗi đa nhiệm multitasking, split screen lỗi', N'Không thể kéo thả chia đôi màn hình (Multitasking) trên tablet?', N'Vào Cài đặt > Tính năng nâng cao > Phòng thí nghiệm (Labs) > Bật tùy chọn ''Bật đa cửa sổ cho tất cả ứng dụng'' để ép các app chưa hỗ trợ cũng có thể chia đôi màn hình.'),
(N'Tablet', N'treo logo android, brick máy, ngửa bụng, hard reset tablet', N'Tablet bị brick, treo ở màn hình bootloader kèm chữ Android nằm ngửa?', N'Nhấn giữ nút Nguồn và nút Tăng âm lượng để vào chế độ Android Recovery. Dùng phím âm lượng di chuyển chọn dòng ''Wipe data/factory reset'', bấm nút nguồn để đồng ý reset máy.');

-- 9. GamingConsole (Máy Chơi Game)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'GamingConsole', N'không lên nguồn, mất điện, máy game tắt ngúm, chết nguồn ps5', N'Máy chơi game TechCycle bật không lên nguồn, đèn LED tín hiệu tắt hù?', N'Rút toàn bộ dây nguồn ra khỏi máy và ổ điện, đợi 2 phút để cục nguồn xả bo mạch, sau đó cắm chặt lại dây nguồn trực tiếp vào ổ điện tường mà không qua ổ cắm nối.'),
(N'GamingConsole', N'trôi analog, stick drift, tự đi chuyển tay cầm, liệt cần gạt', N'Tay cầm chơi game bị hiện tượng trôi analog (Stick Drift), tự di chuyển?', N'Nhỏ 1-2 giọt cồn 90 độ vào khe chân của cần gạt Analog, xoay tròn liên tục trong 1 phút để đánh bay lớp bụi than mài mòn bên trong, dùng bình khí nén xịt khô bụi.'),
(N'GamingConsole', N'quạt rú to, nóng máy, sập nguồn khi chơi, máy kêu như máy bay', N'Máy chơi game kêu rú như quạt phản lực và sập nguồn sau vài phút chơi?', N'Keo tản nhiệt của chip đã khô và bụi bít kín quạt gió. Dùng máy hút bụi hút sạch ở các khe lưới tản nhiệt quanh thân máy để thông luồng khí đối lưu.'),
(N'GamingConsole', N'không xuất hình tivi, mất tín hiệu hdmi, đen màn hình game', N'Dây cáp HDMI cắm từ máy game vào tivi không xuất ra hình ảnh?', N'Rút dây HDMI ra, đổi sang cắm thử ở cổng HDMI khác trên Tivi. Bấm remote tivi chuyển đúng nguồn Input (HDMI 1 hoặc HDMI 2) tương ứng với cổng cắm.'),
(N'GamingConsole', N'không đọc đĩa, lỗi đĩa game, kẹt đĩa, đĩa xước báo lỗi', N'Đĩa game đút vào ổ đĩa máy chơi game không đọc được hoặc báo lỗi?', N'Dùng khăn vải mềm mịn lau nhẹ mặt dưới của đĩa game theo đường thẳng từ tâm đĩa ra mép ngoài (không lau theo hình vòng tròn). Kiểm tra xem đĩa có trầy xước sâu không.'),
(N'GamingConsole', N'tay cầm mất bluetooth, không kết nối không dây, rớt tay cầm', N'Tay cầm không kết nối được với máy game bằng Bluetooth?', N'Dùng một sợi dây cáp USB cắm trực tiếp nối tay cầm vào máy chơi game để máy tự động kích hoạt nhận diện phần cứng lại, sau đó rút dây ra là có thể chơi không dây.'),
(N'GamingConsole', N'tải game chậm, download rùa bò, lỗi dns, mạng yếu máy game', N'Tốc độ tải game từ kho ứng dụng (Store) cực kỳ chậm?', N'Vào cài đặt mạng của máy game, chuyển sang kết nối bằng dây cáp mạng LAN thay vì Wi-Fi. Hoặc đổi thông số DNS thủ công sang dải của Google (`8.8.8.8` và `8.8.4.4`).'),
(N'GamingConsole', N'mất tiếng nhân vật, âm thanh vòm lỗi, game không tiếng, loa câm', N'Âm thanh trong game bị mất tiếng hoàn toàn hoặc bị mất tiếng hội thoại nhân vật?', N'Do cài đặt đầu ra âm thanh sai định dạng kênh. Vào cài đặt âm thanh của máy game, đổi từ chế độ âm thanh vòm 5.1/7.1 về lại chế độ ''Stereo'' tiêu chuẩn.'),
(N'GamingConsole', N'đơ máy, treo game, đứng hình, kẹt hình trận đấu', N'Máy chơi game bị đơ cứng, đứng hình hoàn toàn khi đang trong trận đấu?', N'Ấn giữ nút Nguồn cứng trên thân máy liên tục trong 10 giây để ép máy tắt nguồn hoàn toàn, sau đó bật lại. Xóa bớt các file lưu game (Save file) quá cũ bị lỗi phần mềm.'),
(N'GamingConsole', N'tay cầm sạc không vào, lỗi pin gamepad, nháy đỏ tay cầm', N'Tay cầm chơi game sạc pin không vào điện, đèn sạc không nháy?', N'Nhìn phía sau tay cầm tìm một lỗ nhỏ (lỗ Reset). Dùng một chiếc ghim giấy chọc vào lỗ nhấn giữ trong 5 giây để reset lại mạch IC nguồn của tay cầm rồi cắm sạc lại.'),
(N'GamingConsole', N'không nhận thẻ nhớ nintendo, lỗi micro sd, handheld lỗi thẻ', N'Máy chơi game cầm tay (Handheld) không nhận thẻ nhớ mở rộng?', N'Tắt nguồn máy, tháo thẻ nhớ ra lau chân đồng tiếp xúc bằng cục tẩy, cắm lại thật chặt. Định dạng (Format) thẻ nhớ sang chuẩn file hệ thống mà máy hỗ trợ.'),
(N'GamingConsole', N'hình ảnh mờ, vỡ hình răng cưa, sai phân giải, xấu đồ họa', N'Hình ảnh game hiển thị trên màn hình tivi bị răng cưa, nhòe và vỡ hình?', N'Vào cài đặt hiển thị (Screen/Video output) trên máy game, điều chỉnh độ phân giải đầu ra tăng lên mức `1080p` hoặc `4K` phù hợp với độ phân giải thực tế của màn hình.'),
(N'GamingConsole', N'kẹt nút bấm tay cầm, dính phím x o a b, rít nút', N'Các nút bấm (X, O, A, B) trên tay cầm bị dính, lún không nảy lên?', N'Do mồ hôi hoặc nước ngọt đổ vào làm bết dính. Thấm một chút cồn vào tăm bông, lau miết quanh viền khe nút bấm, nhấn nhả liên tục đến khi nút bấm bật nảy trơn tru trở lại.'),
(N'GamingConsole', N'tay cầm không rung, mất tính năng rung, liệt mô tơ rung', N'Tính năng rung (Rumble/Vibration) của tay cầm không hoạt động?', N'Vào cài đặt hệ thống của máy game hoặc cài đặt cấu hình trong game, kiểm tra xem tính năng ''Vibration'' có đang bị chuyển sang chế độ Tắt (Disabled) hay không.'),
(N'GamingConsole', N'tự nhả đĩa, nút eject lỗi, tự nôn đĩa, ps4 tự nhổ đĩa', N'Máy chơi game liên tục tự động nhả đĩa ra ngoài dù đang chơi?', N'Do nút cảm ứng nhả đĩa (Eject) bị bám bụi tĩnh điện. Dùng khăn khô lau sạch bề mặt nút cảm ứng nhả đĩa ở mặt trước máy, rải một chút bột chống ẩm quanh chân máy.'),
(N'GamingConsole', N'lag input, trễ hình ảnh, delay bấm nút, phản hồi chậm', N'Hình ảnh hiển thị trên màn hình bị chậm hơn thao tác bấm nút (Lag Input)?', N'Bật chế độ ''Game Mode'' trong cài đặt hình ảnh của Tivi nhà bạn. Chế độ này sẽ tắt bỏ các bộ lọc xử lý hình ảnh của tivi, giúp giảm độ trễ tín hiệu xuống mức thấp nhất.'),
(N'GamingConsole', N'sleep mode tụt pin, hao pin chế độ ngủ, nhanh cạn pin nintendo', N'Máy game cầm tay bật chế độ ngủ (Sleep Mode) nhưng vẫn bị hao pin rất nhanh?', N'Do game vẫn đang chạy ngầm cập nhật dữ liệu qua mạng. Hãy thoát hẳn game ra màn hình chính trước khi bấm nút đưa máy về trạng thái Sleep Mode.'),
(N'GamingConsole', N'nat type 3, lỗi multiplayer, không chơi chung được, ghép phòng lỗi', N'Không thể kết nối vào phòng chơi mạng (Multiplayer) với bạn bè?', N'Kiểm tra loại mạng NAT (NAT Type) trong cài đặt mạng. Nếu báo NAT Type 3 (Strict), hãy vào modem mạng nhà bạn bật tính năng UPnP lên để mở cổng kết nối thông thoáng.'),
(N'GamingConsole', N'tai nghe cắm tay cầm bị rè, jack 3.5mm lẹt xẹt, âm thanh nhiễu tay cầm', N'Tai nghe cắm vào giắc 3.5mm trên tay cầm nghe tiếng lẹt xẹt rè rè?', N'Xoay tròn giắc cắm tai nghe vài vòng trong lỗ cắm để làm sạch bề mặt tiếp xúc kim loại, đảm bảo giắc cắm được cắm lút cán vào tay cầm.'),
(N'GamingConsole', N'cloud save lỗi, không đồng bộ save game, lỗi plus, xbox live lỗi', N'Máy chơi game báo lỗi không thể đồng bộ file lưu lên đám mây (Cloud Save)?', N'Kiểm tra xem tài khoản PlayStation Plus, Xbox Live hoặc Nintendo Switch Online của bạn có bị hết hạn gói cước không, đăng nhập lại tài khoản để đồng bộ thủ công.');

-- 10. Camera (Máy Ảnh)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Camera', N'không lên nguồn máy ảnh, bật không lên, chết pin, tối màn máy ảnh', N'Camera TechCycle bật không lên nguồn, màn hình không sáng?', N'Tháo pin ra, lau sạch các chấu đồng tiếp xúc trên viên pin và trong khay chứa pin của camera bằng khăn khô, sạc đầy lại pin rồi lắp thử lại vào máy.'),
(N'Camera', N'không lấy nét được, out focus, mờ ảnh, af lỗi, lấy nét máy ảnh', N'Ống kính máy ảnh quay chụp không thể lấy nét (Out of focus), ảnh mờ?', N'Gạt công tắc trên thân ống kính từ chế độ lấy nét bằng tay ''MF'' sang lấy nét tự động ''AF''. Dùng giấy lau lens chuyên dụng lau sạch bụi bẩn bám trên mặt kính trước.'),
(N'Camera', N'card error, lỗi thẻ nhớ, không nhận sd card, bắt format thẻ', N'Camera báo lỗi không nhận thẻ nhớ (Card Error)?', N'Gạt lẫy chống ghi (Lock) ở cạnh bên của thẻ nhớ SD hướng lên trên để mở khóa thẻ. Bỏ thẻ vào máy ảnh chọn mục ''Format'' để định dạng lại thẻ nhớ.'),
(N'Camera', N'đốm đen, bụi cảm biến, dơ sensor, bẩn ảnh, chấm đen màn hình', N'Ảnh chụp ra xuất hiện những đốm đen mờ cố định ở mọi bức ảnh?', N'Cảm biến (Sensor) bên trong máy ảnh đã bị dính bụi. Tháo ống kính ra, lật gương lật lên (nếu có DSLRs), dùng bóng thổi bụi chuyên dụng thổi mạnh vào cảm biến (tuyệt đối không dùng miệng thổi hoặc lấy khăn lau).'),
(N'Camera', N'flash không sáng, không nháy đèn, lỗi flash, chụp tối đen', N'Đèn Flash có sẵn trên camera không chịu nháy sáng khi chụp tối?', N'Kiểm tra xem chế độ đèn Flash trên máy đang để ở dạng Tắt hoàn toàn (Flash Off) không. Bật chuyển sang chế độ ''Auto Flash'' hoặc ''Fill-In Flash''.'),
(N'Camera', N'hao pin nhanh, nhanh hết pin máy ảnh, tụt vạch pin lẹ', N'Pin camera tụt dốc không phanh, chỉ chụp vài tấm là báo yếu?', N'Tắt tính năng định vị GPS và kết nối Wi-Fi truyền ảnh liên tục trên camera khi không sử dụng. Giảm thời gian chờ tự động tắt màn hình xuống 1 phút.'),
(N'Camera', N'màn hình lật đen, tối thui, chuyển viewfinder, mất hình liveview', N'Màn hình xoay lật của camera không hiển thị hình ảnh, tối thui?', N'Nhấn nút ''DISP'' (Display) trên thân máy vài lần để bật lại màn hình hiển thị, có thể bạn đã vô tình bấm tắt màn hình để chuyển sang dùng kính ngắm (Viewfinder).'),
(N'Camera', N'video rè, kêu rẹt rẹt, tiếng motor lấy nét, quay phim dính âm thanh', N'Quay video bằng camera nghe tiếng kêu rẹt rẹt nhỏ đều đặn?', N'Đây là tiếng motor lấy nét tự động của ống kính ghi âm lại qua mic tích hợp trên thân máy. Hãy đổi sang chế độ lấy nét tay (MF) hoặc sử dụng microphone cắm ngoài rời.'),
(N'Camera', N'ảnh cháy sáng, trắng xóa, lóa nắng, dư sáng, chói sáng', N'Ảnh chụp ngoài trời nắng bị trắng xóa hoàn toàn (Cháy sáng)?', N'Do bạn cài đặt tốc độ màn trập quá chậm hoặc khẩu độ quá lớn. Hãy bật máy về chế độ Tự động ''Auto'' hoặc chế độ ''P'' để máy tự tính toán lượng ánh sáng cân bằng.'),
(N'Camera', N'ảnh mờ nhòe, rung tay, tốc độ màn trập chậm, tối thui ảnh', N'Ảnh chụp trong nhà bị nhòe nhoẹt, vệt mờ dải đuôi dài?', N'Do tốc độ màn trập quá chậm làm rung tay khi bấm máy. Hãy tăng thông số ISO lên cao hơn (ví dụ 800 hoặc 1600) hoặc đặt máy ảnh lên chân đế Tripod để chụp cố định.'),
(N'Camera', N'ám vàng, sai màu, white balance lỗi, ảnh xanh lè, sai cân bằng trắng', N'Màu sắc ảnh chụp ra bị ngả vàng khè hoặc xanh lét rất dị?', N'Cài đặt cân bằng trắng bị sai. Vào menu tìm mục ''White Balance'' (WB), chuyển đổi cài đặt từ các chế độ tùy chỉnh về chế độ Cân bằng trắng tự động ''AWB''.'),
(N'Camera', N'kẹt zoom, nặng vòng zoom, sượng ống kính, vặn không được', N'Ống kính zoom bị kẹt, xoay vòng zoom thấy rất nặng hoặc sượng?', N'Cát bụi nhỏ dính lọt vào kẽ vòng xoay zoom. Cầm ống kính hướng đầu xuống dưới, dùng bóng thổi xịt mạnh vào kẽ hở kết hợp xoay nhẹ nhàng liên tục để đẩy hạt cát ra ngoài.'),
(N'Camera', N'không kết nối wifi điện thoại, lỗi chuyển ảnh, đứt wifi camera', N'Không thể kết nối Wi-Fi từ camera qua ứng dụng điện thoại để lấy ảnh?', N'Tắt dữ liệu di động (4G/5G) trên điện thoại trước khi kết nối vào mạng Wi-Fi do camera phát ra, vì hệ điều hành điện thoại hay tự ngắt mạng không có internet.'),
(N'Camera', N'ip camera tối đêm, hỏng hồng ngoại, night vision, camera giám sát mù', N'Camera giám sát (IP Camera) không nhìn thấy gì vào ban đêm?', N'Đèn LED hồng ngoại xung quanh ống kính đã bị tắt hoặc hỏng. Vào ứng dụng camera trên điện thoại, bật chế độ ''Night Vision'' (Tầm nhìn ban đêm) sang trạng thái Auto.'),
(N'Camera', N'bấm chụp không ăn, kẹt nút shutter, không lấy nét, cứng nút chụp', N'Nút bấm chụp (Shutter) nhấn xuống một nửa không chịu lấy nét?', N'Bụi bẩn bám vào mạch tiếp xúc của nút chụp 2 nấc. Nhỏ nửa giọt cồn 90 độ vào kẽ nút chụp, nhấn nhả liên tục nhiều lần để cồn hòa tan bụi bẩn bám dính.'),
(N'Camera', N'quay 4k giật lag, video khựng, tốc độ thẻ nhớ, thẻ v30', N'Video quay xong mở trên máy tính bị giật lag khựng hình?', N'Thẻ nhớ của bạn có tốc độ đọc ghi quá thấp không đáp ứng nổi video 4K. Hãy thay thẻ nhớ mới có ký hiệu chuẩn tốc độ cao Class 10, U3 hoặc V30.'),
(N'Camera', N'kính ngắm mờ, nhức mắt, sai diopter, nhòe ống ngắm', N'Kính ngắm điện tử (EVF) bị mờ mịt, nhìn vào đau mắt?', N'Do vòng xoay điều chỉnh độ cận (Diopter) cạnh kính ngắm bị xoay lệch. Hãy vừa nhìn vào kính ngắm vừa xoay núm vặn nhỏ bên cạnh cho đến khi các chữ số hiển thị sắc nét.'),
(N'Camera', N'mờ sương, hấp hơi nước, đọng nước ống kính, hơi sương lens', N'Ống kính máy ảnh bị mờ sương (hấp hơi nước) bên trong thấu kính?', N'Do thay đổi nhiệt độ đột ngột (từ phòng điều hòa ra ngoài trời nóng). Tháo ống kính, bỏ vào hộp nhựa kín chứa nhiều gói hút ẩm hạt Silica gel trong 12 tiếng.'),
(N'Camera', N'camera hành trình tự khởi động lại, reset liên tục, tắt bật ô tô', N'Camera hành trình liên tục tự khởi động lại khi đang đi xe?', N'Tẩu sạc nguồn cắm trên ô tô bị lỏng chân hoặc thẻ nhớ bị đầy lỗi ghi đè vòng lặp. Hãy định dạng lại thẻ nhớ và cắm chặt lại đầu tẩu cấp nguồn.'),
(N'Camera', N'chụp chân dung không xóa phông, ảnh không mờ nền, bokeh mờ', N'Ảnh chụp chân dung phông nền phía sau không chịu xóa phông mờ?', N'Hãy đưa máy lại gần chủ thể cần chụp hơn, đổi ống kính sang chế độ có tiêu cự dài (Zoom lớn) và chỉnh thông số khẩu độ mở lớn nhất (F có số nhỏ nhất như F1.8, F2.8).');

-- 11. TV (Tivi)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'TV', N'tivi mất nguồn, không lên điện, tắt đèn báo, tivi đen ngòm', N'Tivi TechCycle không lên nguồn, đèn tín hiệu không sáng?', N'Kiểm tra dây nguồn cắm vào ổ điện. Rút phích cắm tivi ra, chờ khoảng 10 phút để xả hết điện tích tụ trong tụ điện bo nguồn rồi cắm lại trực tiếp vào ổ điện tường.'),
(N'TV', N'có đèn không lên hình, hỏng khiển, tivi đen, nháy đỏ tivi', N'Có đèn nguồn nhấp nháy nhưng bấm khiển tivi không lên màn hình?', N'Thay pin mới cho điều khiển từ xa. Thử bấm nút nguồn vật lý được tích hợp ở cạnh dưới hoặc mặt sau tivi để kiểm tra xem lỗi do tivi hay do remote hỏng.'),
(N'TV', N'có tiếng không hình, màn tối đen, bóng lờ mờ, đứt led nền', N'Màn hình tivi bỗng nhiên tối đen hoàn toàn nhưng âm thanh vẫn nghe rõ?', N'Có thể chế độ Tiết kiệm điện đang bật ở mức tối đa. Dùng đèn pin soi sát màn hình thấy có bóng hình lờ mờ di chuyển thì dùng khiển mò vào cài đặt tắt chế độ này đi.'),
(N'TV', N'màn hình mờ nhòe, nhiễu hạt, sọc muỗi, vỡ nét hình ảnh', N'Hình ảnh hiển thị trên màn hình tivi bị mờ, nhòe hoặc nhiễu hạt?', N'Kiểm tra lại jack cắm ăng-ten hoặc cáp truyền hình phía sau xem có bị lỏng không. Nếu xem trên YouTube, vào cài đặt video nâng chất lượng từ 480p lên 1080p hoặc 4K.'),
(N'TV', N'mất tiếng, tivi không kêu, mute âm thanh, câm tiếng loa', N'Tivi lên hình ảnh đẹp bình thường nhưng mất tiếng hoàn toàn?', N'Bấm nút Mute (tắt tiếng) trên remote xem có đang kích hoạt không. Vào Cài đặt > Âm thanh > Đầu ra âm thanh, đảm bảo đang chọn ''Loa tivi'' chứ không phải loa ngoài.'),
(N'TV', N'sai màu, ám xanh, ám đỏ, nhợt nhạt tivi, loang màu hình', N'Màu sắc hình ảnh tivi hiển thị sai lệch, nhợt nhạt hoặc ám xanh/đỏ?', N'Vào Cài đặt > Hình ảnh > Cài đặt chuyên gia > Chọn ''Đặt lại cài đặt hình ảnh'' (Reset Picture) để khôi phục các dải màu, độ tương phản về mặc định gốc.'),
(N'TV', N'không bắt được wifi, lỗi mạng tivi, rớt mạng, tivi đứt internet', N'Tivi không dò tìm thấy mạng Wi-Fi nhà bạn?', N'Kiểm tra cài đặt ngày giờ trên tivi xem có bị chạy sai lệch không. Nếu sai ngày giờ, hệ thống bảo mật mạng của tivi sẽ chặn không cho quét và kết nối Wi-Fi.'),
(N'TV', N'youtube bị đơ, văng app, giật lag tivi, văng youtube', N'Ứng dụng YouTube trên tivi thông minh bị đơ cứng hoặc văng ra màn hình chính?', N'Vào kho ứng dụng trên tivi, tìm YouTube chọn Cập nhật. Hoặc vào Cài đặt > Ứng dụng > YouTube > Chọn ''Xóa bộ nhớ đệm'' (Clear Cache) để giải phóng RAM cho app.'),
(N'TV', N'no signal, không có tín hiệu, lỗi hdmi cắm tivi, mất sóng tivi', N'Tivi báo lỗi ''Không có tín hiệu'' (No Signal) trên màn hình?', N'Bấm nút Input hoặc Source trên remote, chọn đúng tên cổng HDMI mà bạn đang cắm dây nối từ thiết bị phát (đầu thu, máy tính) vào tivi.'),
(N'TV', N'loa rè, tiếng ve kêu, âm thanh tivi xè, nhiễu loa', N'Âm thanh phát ra từ loa tivi bị rè rè như tiếng ve kêu?', N'Di dời các thiết bị có từ trường mạnh như cục phát Wi-Fi, lò vi sóng đặt quá gần tivi ra chỗ khác. Kiểm tra xem mặt lưng tivi có bị vật gì đè tì vào màng loa không.'),
(N'TV', N'sai tỷ lệ hình, méo hình, mất lề tivi, viền đen màn hình', N'Hình ảnh hiển thị bị kéo giãn, mất góc hoặc co cụm viền đen?', N'Tìm nút ''Aspect Ratio'' hoặc ''Picture Size'' trên remote tivi, điều chỉnh lại tỷ lệ khung hình chuẩn về mức `16:9` hoặc chọn chế độ ''Vừa màn hình''.'),
(N'TV', N'trễ tiếng, tiếng đi trước hình, lip sync, sai khớp hình mồm', N'Xem phim bị hiện tượng tiếng đi trước hình đi sau (lệch pha âm thanh)?', N'Vào Cài đặt > Âm thanh > Cài đặt nâng cao > Tìm mục ''Đồng bộ âm thanh'' (Audio Delay / Lip Sync) và điều chỉnh thanh trượt mili-giây cho đến khi tiếng khớp khẩu hình.'),
(N'TV', N'không nhận usb, lỗi đọc ổ cứng tivi, xem phim ngoại vi', N'Tivi không nhận diện ổ cứng di động hoặc USB cắm vào cổng sau?', N'Cắm USB vào máy tính, chuyển đổi định dạng hệ thống file (Format) từ chuẩn exFAT sang chuẩn `FAT32` hoặc `NTFS` thì hệ điều hành tivi mới đọc được dữ liệu.'),
(N'TV', N'chuột bay liệt, magic remote không di chuyển, hỏng trỏ, đơ chuột tivi', N'Remote thông minh (chuột bay) không di chuyển được con trỏ trên màn hình?', N'Nhấn giữ tổ hợp phím Home và Back trên remote trong 5 giây để hủy kết nối cũ, sau đó hướng khiển về phía tivi bấm nút cuộn giữa để đăng ký kết nối lại từ đầu.'),
(N'TV', N'không nhận giọng nói, voice search hỏng, khiển hỏng mic, tìm bằng mồm', N'Tính năng tìm kiếm giọng nói trên remote tivi bấm không có phản hồi?', N'Thay pin mới cho khiển vì tính năng giọng nói cần dòng điện Bluetooth mạnh để truyền tải file âm thanh. Vệ sinh lỗ mic nhỏ trên đầu remote bằng tăm.'),
(N'TV', N'hết bộ nhớ tivi, tràn ram, văng trình duyệt, không duyệt web', N'Trình duyệt web của tivi báo lỗi tràn bộ nhớ rồi tự đóng?', N'RAM của tivi rất nhỏ. Hãy vào phần cài đặt của trình duyệt web tivi, bấm chọn ''Xóa lịch sử duyệt web'' và ''Xóa cookie dữ liệu'', tắt bớt các tab không xem.'),
(N'TV', N'tự tắt nguồn, hẹn giờ tắt, sleep timer, tự động ngắt tivi', N'Tivi đang xem bình thường thì đột ngột tự tắt nguồn?', N'Vào Cài đặt > Hệ thống > Thời gian > Kiểm tra xem tính năng ''Hẹn giờ tắt'' (Sleep Timer) hoặc tính năng ''Tự động tắt khi không có tương tác'' có đang bật không và tắt đi.'),
(N'TV', N'không kết nối soundbar, lỗi bluetooth tivi, mất tai nghe tivi', N'Không kết nối được Bluetooth từ tivi ra loa soundbar?', N'Tắt Bluetooth của điện thoại cá nhân ở gần đó vì loa soundbar thường tự động ưu tiên kết nối với điện thoại trước, khiến tivi không thể quét ra loa.'),
(N'TV', N'lưu ảnh, bóng mờ, burn in màn tivi, vệt logo dính', N'Tivi bị hiện tượng lưu ảnh, bóng mờ vệt chữ cố định (Burn-in)?', N'Hiện tượng xảy ra khi để tivi hiển thị một hình ảnh tĩnh quá lâu. Hãy bật một video clip có các dải màu chuyển động liên tục (Video khử burn-in) trên YouTube chạy trong 1 tiếng.'),
(N'TV', N'lỗi cập nhật phần mềm, update tivi thất bại, firmware lỗi', N'Tivi liên tục báo lỗi không thể cập nhật phần mềm hệ thống?', N'Tải bản Firmware mới nhất của model tivi từ trang chủ hãng vào USB qua máy tính, cắm USB vào tivi rồi chọn mục ''Cập nhật thủ công qua cổng USB'' trong phần cài đặt.');

-- 12. Monitor (Màn Hình)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Monitor', N'không lên nguồn, mất điện, màn hình không sáng, tắt ngúm màn', N'Màn hình máy tính TechCycle bật không lên hình, đèn LED góc nguồn tắt?', N'Kiểm tra lại giắc cắm của dây nguồn (Adapter) phía sau màn hình xem có bị lỏng không. Đảm bảo công tắc nguồn vật lý của màn hình đã được bật sang trạng thái ON.'),
(N'Monitor', N'no signal, cable not connected, không nhận tín hiệu, đen màn', N'Màn hình hiện chữ ''No Signal'' hoặc ''Cable Not Connected''?', N'Siết chặt lại 2 đầu ốc vặn của cáp tín hiệu (VGA/DVI) hoặc rút ra cắm lại thật chặt cáp HDMI/DisplayPort kết nối từ case máy tính vào màn hình.'),
(N'Monitor', N'màn hình nhấp nháy, chớp giật, sai tần số quét hertz, nháy xé màn', N'Màn hình hiển thị hình ảnh bị nháy chớp nháy liên tục?', N'Nhấp chuột phải ngoài Desktop > Display settings > Advanced display > Thay đổi tần số quét (Refresh rate) về đúng chuẩn mặc định của màn hình (ví dụ 60Hz hoặc 144Hz).'),
(N'Monitor', N'điểm chết, chấm đen, đốm sáng, dead pixel, sọc đốm màn', N'Màn hình xuất hiện một vài chấm màu đỏ hoặc xanh cố định không đổi (Điểm chết)?', N'Lỗi điểm chết màn hình (Dead pixel). Dùng một miếng vải mềm ẩm ấn nhẹ và miết xoay tròn trực tiếp vào khu vực điểm chết đó trong khi bật tắt màn hình liên tục để kích hoạt lại pixel kẹt.'),
(N'Monitor', N'chữ nhòe, mờ chữ, sai phân giải, vỡ nét, mờ mắt', N'Chữ viết và hình ảnh trên màn hình hiển thị bị vỡ, mờ hạt nhoè nhoẹt?', N'Do chỉnh sai độ phân giải hiển thị trên Windows. Vào Display settings, chỉnh mục Resolution về mức có chữ `Recommended` (thường là 1920x1080 tương ứng với Full HD).'),
(N'Monitor', N'sọc ngang, sọc dọc, vệt màu màn hình, đứt cáp màn hình', N'Màn hình bị sọc dọc hoặc sọc ngang dải màu sắc?', N'Thử đổi một sợi dây cáp HDMI/DisplayPort mới để kiểm tra xem có phải do đứt ngầm dây cáp tín hiệu không. Nếu đổi dây vẫn bị sọc thì lỗi nằm ở tấm nền LCD.'),
(N'Monitor', N'chói mắt, sáng quá, tối quá, chỉnh độ sáng, đau mắt', N'Màn hình hiển thị quá sáng hoặc quá tối, mỏi mắt?', N'Sử dụng các phím bấm vật lý (Menu/Joystick) nằm ở cạnh viền hoặc gầm dưới màn hình để điều chỉnh hai thông số `Brightness` (Độ sáng) và `Contrast` (Độ tương phản) về mức 50-60%.'),
(N'Monitor', N'sai màu, lệch màu thiết kế, chỉnh srgb, ám màu xanh đỏ', N'Màu sắc của màn hình thiết kế bị lệch màu rất nặng so với điện thoại?', N'Bấm nút Menu trên màn hình, tìm mục `Color` chuyển chế độ màu về chuẩn `sRGB`. Hoặc dùng tính năng ''Calibrate display color'' của Windows để cân chỉnh lại dải màu hiển thị.'),
(N'Monitor', N'lệch lề, mất góc, tự động căn chỉnh vga, lốm đốm cạnh', N'Màn hình hiển thị bị lệch sang một bên, mất một khoảng lề biên?', N'Lỗi thường gặp khi cắm cáp VGA cổ điển. Ấn phím vật lý có chữ `AUTO` trên viền màn hình để hệ thống tự động căn chỉnh lại khung hình vuông vức khớp khung viền.'),
(N'Monitor', N'tiếng rít e e, kêu rè rè, hở sáng từ thông, kêu ở nguồn', N'Màn hình phát ra tiếng rít e e nhỏ đều rất nhức đầu?', N'Do các cuộn cảm trong bo cao áp hoặc cục nguồn Adapter bị lão hóa sinh ra tiếng rít từ thông. Hãy cắm cục nguồn sang ổ điện khác ổn định điện áp hơn hoặc thay cục Adapter mới.'),
(N'Monitor', N'bóng ma, vệt kéo đuôi, ghosting chuyển động, nhòe game', N'Màn hình hiển thị dải màu chuyển động bị vệt mờ kéo đuôi dài (Ghosting)?', N'Bấm nút Menu trên màn hình, tìm tính năng có tên là `Overdrive` hoặc `Response Time` và chuyển cài đặt từ mức High/Fast xuống mức Normal/Medium để giảm bóng ma.'),
(N'Monitor', N'cắm tai nghe không tiếng, lỗi âm thanh hdmi, câm loa màn', N'Cắm tai nghe vào lỗ loa sau màn hình không nghe thấy tiếng?', N'Nhấp vào biểu tượng loa góc phải dưới màn hình Windows, chuyển đổi thiết bị đầu ra âm thanh (Playback device) từ loa máy tính sang tên của màn hình kết nối qua HDMI.'),
(N'Monitor', N'power saving mode tự tắt, ngủ đông ngay khi bật, văng sleep mode', N'Màn hình tự động chuyển sang chế độ ngủ (Power Saving Mode) ngay khi vừa bật máy?', N'Do case máy tính chưa xuất được tín hiệu lên (lỗi lỏng RAM cây máy tính). Hãy tháo thanh RAM của case máy tính ra lau sạch rồi cắm lại chứ màn hình không bị hỏng.'),
(N'Monitor', N'hở sáng màn ips, glow nền đen, trắng góc, lọt sáng', N'Góc nhìn của màn hình bị loang trắng khi hiển thị nền đen (Hở sáng)?', N'Hiện tượng bình thường của màn hình tấm nền IPS. Dùng tuốc-nơ-vít nới lỏng nhẹ các con ốc bắt giá treo vesa ở mặt sau màn hình ra một chút để giảm áp lực siết ép lên tấm nền.'),
(N'Monitor', N'ám hồng, ám vàng, cong chân vga, lỏng cáp, tím màn', N'Màn hình hiển thị toàn bộ màu sắc bị biến thành màu hồng tím hoặc vàng úa?', N'Đầu chân cắm cáp VGA bị cong hoặc gãy mất một chân kim kim loại truyền tín hiệu màu. Hãy dùng kìm nhỏ uốn thẳng lại chân kim bị cong hoặc thay sợi cáp mới.'),
(N'Monitor', N'khóa phím cứng, osd lock, không bấm được menu, đơ phím màn hình', N'Không thể bấm chọn được các nút cài đặt Menu trên viền màn hình?', N'Tính năng khóa phím cài đặt (OSD Lock) đang bật. Ấn và giữ phím Menu (hoặc phím Nguồn tùy dòng) liên tục trong 10-15 giây để màn hình hiện chữ ''OSD Unlock''.'),
(N'Monitor', N'xé hình, rách ảnh chơi game, g-sync freesync, khựng giật', N'Màn hình hiển thị dải hình ảnh bị rách, vỡ đôi khi xoay chuột nhanh chơi game?', N'Bật tính năng `G-Sync` hoặc `FreeSync` trong phần cài đặt Menu của màn hình và bật cài đặt `V-Sync` (Đồng bộ dọc) trong phần cấu hình đồ họa của game lên.'),
(N'Monitor', N'xoay dọc màn hình, lật màn 90 độ, sai hướng, lộn ngược', N'Màn hình xoay dọc 90 độ nhưng hình ảnh bên trong vẫn nằm ngang?', N'Nhấp chuột phải ngoài Desktop > `Display settings` > Tìm mục `Display orientation` và chuyển cài đặt từ kiểu `Landscape` sang kiểu `Portrait` để xoay dọc hình ảnh hệ thống.'),
(N'Monitor', N'mốc màn hình, ố nước kính, đọng sương, nấm mốc rễ tre', N'Màn hình bị vết ố nước, vết mốc loang bên trong tấm kính?', N'Do để màn hình ở môi trường độ ẩm quá cao hoặc xịt trực tiếp nước lau kính lên bề mặt chảy lọt vào trong. Bỏ màn hình vào phòng bật điều hòa chế độ Dry sấy khô liên tục 24 tiếng.'),
(N'Monitor', N'nháy logo liên tục, sập nguồn, yếu adapter sạc, chớp logo', N'Màn hình nháy sáng một cái hiện logo rồi tắt ngúm lặp đi lặp lại?', N'Lỗi nguồn cấp yếu từ Adapter không đủ dòng nuôi đèn nền. Thử mượn một cục Adapter có cùng thông số điện áp (V) và dòng điện (A) cắm thử để loại trừ hỏng nguồn.');

-- 13. PC (Máy Tính Để Bàn)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'PC', N'bật không quạt, mất điện thùng máy, không vào điện, im re pc', N'Bật công tắt nguồn cây PC TechCycle nhưng quạt không quay, máy không có điện?', N'Kiểm tra công tắc bập bênh (O/I) phía sau cục nguồn máy tính đã bật sang chữ I chưa. Cắm lại thật chặt đầu dây nguồn số 8 vào cục nguồn PC.'),
(N'PC', N'quạt chạy không lên hình, lỏng ram, đen màn, quạt cpu vù vù', N'Cây PC chạy vù vù, đèn sáng đầy đủ nhưng màn hình tối thui không có hình?', N'Lỗi lỏng RAM kinh điển. Tắt nguồn hoàn toàn, tháo thanh RAM ra khỏi bo mạch chủ (mainboard), dùng cục tẩy lau thật sạch các chân kim màu vàng đồng, cắm chặt lại vào khe bấm nghe tiếng ''kịch''.'),
(N'PC', N'kêu tít tít tít, báo lỗi ram mainboard, bíp bíp, tiếng kêu bios', N'Máy tính vừa bật lên kêu tít tít tít liên tục thành chuỗi dài?', N'Mã cảnh báo lỗi phần cứng của Mainboard. Chuỗi tiếng tít dài liên tục thường là báo lỗi chưa nhận bộ nhớ RAM hoặc bàn phím cắm ngoài bị kẹt nút dính phím khi khởi động.'),
(N'PC', N'tự tắt đột ngột, quá nhiệt cpu, sập nguồn pc, keo tản nhiệt khô', N'PC đang dùng bình thường bỗng nhiên tắt phụt nguồn đột ngột như mất điện?', N'Do CPU bị quá nhiệt (vượt quá 90-100 độ C) nên máy tự ngắt bảo vệ. Tháo quạt tản nhiệt CPU ra, lau sạch lớp keo cũ khô cứng, bôi một lớp keo tản nhiệt mới rồi bắt chặt lại quạt.'),
(N'PC', N'no boot device, không nhận ổ cứng, mất win, lỏng cáp sata', N'PC khởi động báo lỗi chữ trắng nền đen ''No Boot Device Available''?', N'Máy tính không tìm thấy ổ cứng chứa hệ điều hành Windows. Tháo nắp thùng máy, rút dây cáp nguồn và dây cáp dữ liệu SATA của ổ cứng ra rồi cắm lại thật chặt.'),
(N'PC', N'sai giờ liên tục, lệch thời gian, hết pin cmos, ngày tháng cũ', N'Thời gian giờ giấc trên PC luôn bị chạy sai lệch mỗi khi rút điện ra cắm lại?', N'Viên pin CMOS (viên pin hình tròn dẹt như pin đồng hồ mã CR2032) trên bo mạch chủ đã cạn năng lượng. Hãy mua viên pin mới giá vài nghìn về tự cạy thay thế trên main.'),
(N'PC', N'không nhận mạng dây, lỗi cổng lan rj45, chấm than mạng, rớt lan', N'PC không nhận diện được dây cáp mạng LAN cắm từ modem vào máy?', N'Vào Device Manager, kiểm tra mục Network Adapters xem card mạng có bị vô hiệu hóa (Disabled) không, nhấp chuột phải chọn Enable. Tháo đầu giắc mạng bấm lại nếu rỉ sét.'),
(N'PC', N'cắm tai nghe không kêu, lỗi giắc cắm trước case, tai nghe thùng máy', N'PC cắm tai nghe/loa vào cổng giắc phía trước thùng máy nhưng không có tiếng?', N'Dây nối giắc âm thanh từ vỏ case vào chân cắm `HD Audio` trên bo mạch chủ bên trong máy bị cắm sót hoặc lỏng. Hãy tháo nắp case kiểm tra cắm lại giắc này.'),
(N'PC', N'full disk 100%, máy giật lag, hdd chậm, rùa bò pc', N'Máy tính chạy giật lag khủng khiếp, kiểm tra Task Manager thấy Disk 100%?', N'Lỗi tràn bộ đệm ổ cứng HDD cũ trên Windows 10/11. Hãy tắt các dịch vụ ngầm như Superfetch, Windows Search trong mục Services, hoặc thay thế bằng ổ cứng SSD nâng cao tốc độ.'),
(N'PC', N'màn hình xanh, bsod dump, lỗi khởi động lại, dump ram', N'Màn hình PC hiện màu xanh lè kèm mã lỗi QR và tự khởi động lại (Màn hình xanh)?', N'Thường do xung đột giữa các driver phần cứng hoặc lỗi chip nhớ RAM. Hãy gỡ bỏ phần mềm vừa cài gần nhất, tháo bớt các thiết bị USB cắm ngoài và vệ sinh chân RAM.'),
(N'PC', N'bắt ấn f1 f2, lỗi bios, dừng khởi động, press f1 to continue', N'PC bật lên hiện thông báo bắt ấn phím `F1` hoặc `F2` thì mới cho vào Windows?', N'Do cấu hình BIOS bị thay đổi mặc định khi hết pin CMOS. Ấn F2 vào BIOS cài đặt lại ngày giờ hiện tại, chuyển mục ''Wait for F1 if error'' sang trạng thái Disabled rồi lưu lại.'),
(N'PC', N'quạt kêu to, rít ù ù, khô dầu quạt tản nhiệt, máy cày pc', N'Quạt tản nhiệt của cây máy tính kêu u u rè rè rất to như máy cày?', N'Cánh quạt tản nhiệt bị bám quá nhiều mạng nhện bụi bẩn hoặc bị khô dầu trục quay. Dùng tăm bông tẩm cồn lau sạch cánh và nhỏ 1 giọt dầu máy khâu vào tâm trục quạt.'),
(N'PC', N'cắm card rời không lên hình, cắm nhầm mainboard vga, card vga', N'PC không nhận diện card màn hình rời (VGA), màn hình cắm vào không lên hình?', N'Đảm bảo bạn cắm dây cáp tín hiệu từ màn hình vào đúng cổng của card màn hình nằm ở phía dưới, chứ không phải cổng HDMI của mainboard nằm phía trên sát các cổng USB.'),
(N'PC', N'không bắt được wifi, card wifi yếu, thiếu râu ăng ten, rớt wifi pc', N'Không thể kết nối Wi-Fi trên cây máy tính mặc dù có card Wi-Fi gắn trong?', N'Kiểm tra xem bạn đã vặn chặt 2 chiếc ăng-ten thu sóng (râu anten) vào các cổng ren đồng phía sau thùng máy chưa. Thiếu râu máy sẽ không thể bắt được sóng Wi-Fi.'),
(N'PC', N'giật điện thùng máy, rò điện case, tê tay pc, nối mát case', N'Máy tính để bàn bị hiện tượng rò điện, chạm tay vào vỏ sắt vỏ thùng máy thấy giật tê?', N'Mạch nguồn bị rò dòng điện cảm ứng ra vỏ thép của case. Hãy nối một sợi dây điện nhỏ từ một con ốc trên thùng máy bám chặt đóng đinh xuống nền gạch hoặc sàn đất chân tường.'),
(N'PC', N'usb phía trước không nhận, lỏng cổng front panel, cắm usb case', N'Cổng USB phía trước thùng máy cắm USB vào không nhận nhưng cắm cổng sau vẫn chạy?', N'Cổng USB trước bị thiếu nguồn cấp dòng hoặc lỏng giắc cắm dây nối `USB Header` nối từ mặt vỏ case vào bo mạch chủ bên trong. Tháo nắp thùng máy cắm chặt lại giắc.'),
(N'PC', N'chơi game bị reset, sập nguồn psu, thiếu công suất, sập điện card', N'PC hay bị tự động reset khởi động lại khi đang mở chơi game nặng?', N'Bộ nguồn cấp điện (PSU) của bạn có công suất thực quá thấp hoặc đã bị sụt áp, không gánh nổi điện năng tiêu thụ của card đồ họa khi full tải. Cần thay bộ nguồn mới công suất lớn hơn.'),
(N'PC', N'lỗi quyền admin, run as administrator, không cài được app, cấm quyền', N'Không thể cài đặt phần mềm mới, hệ thống báo lỗi không có quyền Administrator?', N'Nhấp chuột phải vào file cài đặt cài đặt đó (file .exe) và chọn dòng `Run as administrator` để cấp quyền chạy cao nhất của hệ thống cho phần mềm cài đặt.'),
(N'PC', N'chuột đơ, nhảy cóc, mắt đọc dơ, kẹt tóc, giật cục chuột', N'Biểu tượng chuột máy tính bị đơ, giật giật nhảy cóc không mượt?', N'Mắt đọc quang học dưới đáy chuột bị dính sợi tóc hoặc bụi bẩn bám vào che tia quét dẫn đường. Lật ngược chuột thổi mạnh sạch mắt đọc và dùng lót chuột sạch.'),
(N'PC', N'treo logo main, kẹt thiết bị usb khởi động, treo asus gigabyte', N'PC khởi động lên bị đứng im ở màn hình logo Mainboard (Asus, Gigabyte, MSI...)?', N'Máy bị kẹt nhận diện thiết bị ngoại vi USB (như ổ cứng di động, đầu đọc thẻ cắm ngoài). Hãy rút toàn bộ các thiết bị cắm cổng USB ra (chỉ để lại chuột phím) rồi khởi động lại.');

-- 14. Printer (Máy In)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Printer', N'không lên điện, mất nguồn, tắt đèn máy in, cháy nguồn in', N'Máy in TechCycle không lên nguồn, đèn tín hiệu không sáng?', N'Kiểm tra dây cáp nguồn cắm vào máy in và ổ điện. Đảm bảo nắp đậy khay mực của máy in đã được đóng chặt khít khớp bẫy công tắc an toàn nguồn.'),
(N'Printer', N'kẹt giấy, paper jam, dính giấy trong lô sấy, rách giấy kẹt', N'Máy in bị lỗi kẹt giấy (Paper Jam) bên trong hộp mực lô sấy?', N'Mở nắp máy in, rút hộp mực (Cartridge) ra ngoài một cách từ từ. Cầm đều hai cạnh tờ giấy bị kẹt kéo nhẹ nhàng theo đúng chiều thuận ra của giấy, không giật mạnh làm rách giấy kẹt lại.'),
(N'Printer', N'kéo nhiều tờ, kẹt giấy liên tục, mòn quả đào, cuốn giấy đôi', N'Máy in kêu cạch cạch to khi nuốt giấy và cuốn một lúc nhiều tờ giấy cùng lúc?', N'Quả lô cao su cuốn giấy (quả đào) bị mòn vẹt hoặc bám nhiều bụi giấy làm mất độ bám ma sát. Dùng khăn ẩm lau sạch bề mặt cao su quả đào cuốn giấy.'),
(N'Printer', N'sọc đen dọc, vệt đen kẻ giấy, xước trống drum, bẩn trống', N'Bản in ra xuất hiện vệt đen sọc dài kẻ dọc từ trên xuống dưới tờ giấy?', N'Trống hình (Drum) của hộp mực đã bị trầy xước lớp sơn từ tính bề mặt hoặc gạt mực nhỏ bị vênh mòn. Bạn cần thay thanh Trống (Drum) mới cho hộp mực.'),
(N'Printer', N'mờ chữ, in không rõ, hết mực, lắc hộp mực, xịt mực', N'Bản chữ in ra bị mờ xịt, không rõ chữ chữ đều toàn bộ trang?', N'Máy in đã gần hết mực. Hãy tháo hộp mực ra ngoài, cầm hai đầu lắc đều qua lại nằm ngang 4-5 lần để lượng mực bột bên trong được san đều rồi lắp lại in tiếp.'),
(N'Printer', N'in trắng tinh, không ra chữ, mất tiếp mát lò xo, giấy trắng', N'Trang giấy in ra trắng tinh hoàn toàn, không có một giọt chữ nào?', N'Do lỗi mất tiếp điểm lò xo từ tính giữa hộp mực và bo mạch máy in. Tháo hộp mực, kiểm tra các miếng chấu đồng nhỏ xem có bị kẹt rụt vào trong không, cạy nhẹ ra.'),
(N'Printer', N'bong mực, cạo bay chữ, lô sấy không chín, nướng mực lỗi', N'Chữ trên giấy sau khi in xong dùng tay quẹt nhẹ là bị bay bay, nhòe nhoẹt mực?', N'Lô sấy nướng mực của máy in không đủ nhiệt độ cao để làm chín, nung chảy mực bột bám chặt vào thớ giấy. Cần kiểm tra xem cài đặt loại giấy in trong driver có đúng chuẩn độ dày không.'),
(N'Printer', N'báo đèn đỏ, replace toner, hết chip đếm, khóa hộp mực', N'Máy in báo đèn đỏ nhấp nháy liên tục kèm chữ cảnh báo ''Replace Toner''?', N'Hộp mực đã cạn sạch hoàn toàn hoặc chip đếm số trang in trên hộp mực đã chạm mức giới hạn ghi nhớ. Bạn cần thay hộp mực mới hoặc mua chip đếm mới gắn vào.'),
(N'Printer', N'ra lệnh không in, offline máy in, kẹt lệnh, đơ máy in', N'Ra lệnh in từ máy tính nhưng máy in đứng im không có phản hồi gì?', N'Kiểm tra dây cáp USB kết nối từ máy in vào máy tính. Vào mục `Devices and Printers` trên PC, nhấp chuột phải vào tên máy in kiểm tra xem có bị trạng thái ''Use Printer Offline'' không và tắt đi.'),
(N'Printer', N'lặp vết đen ngang, sọc ngang cách đều, dơ trục từ, hỏng gạt', N'Bản in ra bị vệt đen loang lổ ngang trang giấy cách đều từng khoảng?', N'Trục cao su cuốn hoặc thanh trục từ của hộp mực bị bẩn, dính vết mực đông cứng bám vào tạo vết lặp tuần hoàn. Tháo hộp mực lau sạch trục bằng khăn giấy khô.'),
(N'Printer', N'báo hết giấy, out of paper, dơ cảm biến khay, đầy giấy vẫn báo lỗi', N'Máy in liên tục báo lỗi ''Out of Paper'' mặc dù khay vẫn đầy giấy?', N'Cảm biến nhận diện giấy ở khay chứa bị bám đầy bụi giấy bít mắt hồng ngoại. Dùng bóng thổi thổi sạch kẽ rãnh khay giấy nơi có lẫy nhựa nhỏ nâng giấy lên.'),
(N'Printer', N'sai màu, in thiếu màu, nghẹt đầu phun mực, head cleaning', N'Máy in phun ra màu sắc bị sai lệch màu nặng hoặc mất hẳn một màu dải?', N'Đầu phun mực của máy in phun bị nghẹt mực do lâu ngày không dùng làm mực khô lại. Bật tính năng `Head Cleaning` có sẵn trong driver máy in trên PC để máy tự xịt rửa đầu phun.'),
(N'Printer', N'bóng chữ, nhòe gấp đôi, dơ thước định vị, dơ cáp từ', N'Bản in ra chữ hiển thị bị nhòe hình, bóng chữ đổ đôi đổ ba bên cạnh?', N'Thước định vị suốt dải (thước nhựa trong suốt chạy ngang máy in) bị dính mực hoặc bụi bẩn bám dính làm mắt đọc căn dòng bị lệch hành trình. Dùng khăn mềm khô lau nhẹ thước.'),
(N'Printer', N'nhăn giấy, gấp mép, rách giấy, giấy ẩm, co rúm tờ in', N'Giấy in ra bị nhăn rúm, gấp nếp quăn mép góc rất xấu?', N'Bạn để giấy in ở môi trường ẩm thấp làm giấy bị ẩm mềm quăn mép dẫn đến khi qua lô ép sấy nhiệt cao bị co rúm. Hãy sấy khô tập giấy hoặc thay tập giấy mới khô ráo.'),
(N'Printer', N'in liên tục giấy lộn xộn, in rác ký tự lạ, kẹt spooler', N'Máy in tự động in liên tục hàng chục trang ký tự rác lạ tai mà không dừng?', N'Lỗi tràn bộ nhớ đệm lệnh in do xung đột driver điều khiển. Nhấp đúp biểu tượng máy in góc phải taskbar PC, chọn `Cancel All Documents` để xóa sạch hàng đợi in rồi khởi động lại máy in.'),
(N'Printer', N'báo kẹt giấy giả, không kẹt nhưng báo lỗi, dơ mắt soi giấy', N'Máy in báo mã lỗi kẹt giấy giả (không hề có giấy kẹt bên trong)?', N'Một mảnh giấy rách nhỏ xíu bằng hạt đỗ nằm kẹt bít lẫy cảm biến hành trình giấy khiến máy hiểu lầm. Mở nắp soi đèn pin khều sạch các mẩu rác giấy vụn bên trong.'),
(N'Printer', N'khay không nâng giấy, gãy nhông khay nâng, rớt mâm giấy', N'Khay giấy của máy in không nâng lên được để đẩy giấy vào rãnh cuốn?', N'Hệ thống bánh răng nhựa nâng khay giấy bị trật khớp hoặc gãy chốt nhựa lò xo chịu lực kéo nâng khay. Tháo khay giấy kiểm tra gá đặt lại lò xo kéo đẩy cân bằng.'),
(N'Printer', N'chảy mực máy phun, rỉ mực gầm máy, tràn mực thải, lủng tép mực', N'Máy in phun bị rò rỉ mực loang lổ đầy trong khoang máy?', N'Do miếng mút thấm mực thải đầy tràn tràn ra ngoài. Bạn cần tháo gỡ miếng mút thấm mực thải ở đáy khoang đem giặt sạch phơi khô hoặc lót miếng bông gạc thấm mới vào.'),
(N'Printer', N'không chia bộ, in lộn xộn, collate chức năng, in ghép trang', N'Máy in không chia được tập tài liệu khi in nhiều bản một lúc (in lộn xộn)?', N'Khi ra lệnh in trên phần mềm Word/PDF, bạn nhớ tick chọn vào ô có chữ `Collate` để máy in tự động xếp thứ tự in xong trang 1,2,3 của tập 1 rồi mới in sang tập tiếp theo.'),
(N'Printer', N'lốm đốm trắng, chấm trắng chữ, vón cục mực, mực in tồi', N'Giấy in ra có những vết đốm trắng li ti mất chữ li ti lốm đốm?', N'Do trống mực bám bụi xơ giấy cách điện hoặc lượng bột mực trong hộp mực bị ẩm vón thành cục nhỏ. Tháo hộp mực ra lắc mạnh theo chiều dọc để đánh tan mực vón.');

-- 15. Router (Thiết Bị Mạng)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Router', N'router mất nguồn, tắt đèn, hỏng sạc adapter, wifi mất điện', N'Router Wi-Fi TechCycle không sáng đèn nguồn, tắt lịm?', N'Kiểm tra đầu cắm nguồn Adapter tròn phía sau router xem đã cắm chặt hết cỡ chưa. Đổi cắm cục nguồn Adapter sang ổ điện khác trực tiếp để kiểm tra.'),
(N'Router', N'đèn đỏ wan, mạng chấm than, rớt mạng internet, mất mạng nhà đài', N'Đèn báo Internet (hình quả cầu/chữ WAN) trên cục router báo màu cam hoặc đỏ?', N'Tín hiệu mạng từ nhà đài bị gián đoạn. Hãy rút đầu dây cáp mạng bấm giắc RJ45 màu xanh/vàng cắm ở cổng WAN (màu xanh dương) ra rồi cắm chặt lại nghe tiếng kịch.'),
(N'Router', N'bắt được wifi không vào được mạng, treo dhcp, không kết nối internet', N'Điện thoại bắt được Wi-Fi từ router nhưng hiện chữ ''Không có kết nối Internet''?', N'Tắt nguồn cục router mạng trong 1 phút rồi cắm lại để thiết bị xóa bộ nhớ đệm cấp phát IP (DHCP) đã đầy và cấp lại dải IP mới cho các máy kết nối.'),
(N'Router', N'mạng chậm, lag, giật, sóng kém, khởi động lại router, wifi rùa', N'Mạng Wi-Fi đột nhiên chạy rất chậm, giật lag lag dù đứng cạnh cục phát?', N'Do router bị quá tải vì chạy liên tục nhiều tháng sinh nhiệt nóng chip xử lý. Hãy thiết lập lịch hẹn giờ tự động khởi động lại (Reboot Schedule) cho router vào lúc 3h đêm mỗi ngày.'),
(N'Router', N'quên pass wifi, mất mật khẩu admin, reset cục phát, đổi pass wifi', N'Bạn quên mất mật khẩu mạng Wi-Fi và tài khoản quản trị Admin của router?', N'Dùng một chiếc tăm nhọn chọc vào lỗ nhỏ có chữ `RESET` phía sau router, nhấn giữ im trong 10 giây đến khi toàn bộ đèn LED sáng rực lên rồi thả ra để đưa máy về mặc định gốc.'),
(N'Router', N'sóng yếu, không xuyên tường, vị trí đặt router, mạng cách tường yếu', N'Sóng mạng Wi-Fi hiển thị vạch sóng rất yếu khi đi sang phòng bên cạnh?', N'Do router đặt ở góc khuất hoặc bị tường dày cản sóng. Hãy di dời cục router ra vị trí trung tâm nhà thông thoáng, nâng cao cách sàn nhà ít nhất 1.5 mét và dựng đứng các râu anten.'),
(N'Router', N'smarthome không kết nối, lỗi mạng 2.4ghz, đồ thông minh không nhận', N'Thiết bị thông minh (Smarthome) trong nhà không thể kết nối vào mạng Wi-Fi?', N'Các thiết bị nhà thông minh thường chỉ hỗ trợ băng tần mạng `2.4GHz`. Hãy vào cài đặt router tách riêng 2 tên Wi-Fi độc lập cho băng tần 2.4GHz và 5GHz thay vì gộp chung.'),
(N'Router', N'văng wifi, xung đột ip, tràn ip, rớt địa chỉ ip, tự văng mạng', N'Điện thoại kết nối Wi-Fi liên tục bị văng ra, báo lỗi nhận địa chỉ IP?', N'Do dải cấp phát địa chỉ IP (IP Pool) của router đặt quá hẹp làm nghẽn cấp IP khi có nhiều máy truy cập. Vào trang quản trị `192.168.1.1` nới rộng dải IP từ 100 lên 200.'),
(N'Router', N'không vào được 192.168, sai ip quản trị, trang cấu hình wifi', N'Không thể truy cập vào trang cấu hình cài đặt mạng của router qua IP 192.168.0.1?', N'Do router trùng dải IP với modem tổng nhà mạng nên đã bị đổi IP phụ. Hãy lật mặt sau mặt sau đáy cục router xem chính xác dải IP mặc định được in trên nhãn mác.'),
(N'Router', N'mất tên wifi, ẩn ssid, không tìm thấy mạng, giấu tên wifi', N'Tên mạng Wi-Fi tự nhiên biến mất hoàn toàn không ai quét ra tên?', N'Tính năng ẩn tên mạng (Hide SSID) đã vô tình bị kích hoạt bật trong trang quản trị phần mềm. Bạn cần kết nối router với PC bằng dây cáp mạng để vào bật lại mục Broadcast SSID.'),
(N'Router', N'wifi 5g sóng yếu, rớt 5ghz xa, đi xuyên tường 5ghz', N'Mạng Wi-Fi 5GHz bắt sóng được nhưng cứ đi xa một chút là mất hẳn?', N'Băng tần mạng 5GHz có đặc tính tốc độ cực cao nhưng khả năng xuyên tường cản vật thể rất kém. Khi đi xa hoặc qua tường dày bạn hãy chủ động chuyển sang bắt mạng băng tần 2.4GHz.'),
(N'Router', N'xung đột 2 cục phát, cắm nhầm lan wan, treo mạng phụ', N'Router liên tục bị lỗi xung đột IP (IP Conflict) với các thiết bị mạng khác?', N'Tắt tính năng cấp phát IP tự động `DHCP Server` trên cục router phụ TechCycle nếu bạn đang cắm dây mạng từ modem chính vào cổng LAN của router để modem chính quản lý IP.'),
(N'Router', N'tắt đèn wifi, bấm nhầm nút tắt sóng, mất biểu tượng sóng', N'Đèn LED tín hiệu Wi-Fi (biểu tượng sóng) trên mặt router tắt hoàn toàn?', N'Bạn đã vô tình nhấn vào nút cứng tắt nhanh Wi-Fi (Nút Wi-Fi On/Off) ở cạnh bên cục router. Hãy ấn giữ nút đó từ 3-5 giây để kích hoạt bật lại đèn phát sóng.'),
(N'Router', N'download nhanh youtube xoay vòng, lỗi dns google, mạng khựng video', N'Tốc độ mạng tải file chạy rất nhanh nhưng xem video lại bị xoay vòng khựng?', N'Lỗi phân giải tên miền DNS của nhà mạng bị nghẽn mạch. Vào trang quản trị router đổi thông số DNS Server mặc định sang dải tốc độ cao của Google là `8.8.8.8` và `8.8.4.4`.'),
(N'Router', N'quá tải thiết bị, đông người dùng treo mạng, full truy cập wifi', N'Số lượng người dùng kết nối wifi quá đông làm treo đơ router liên tục?', N'Vào mục Wireless Security của trang quản trị, giới hạn số lượng thiết bị kết nối tối đa (Max Stations) giảm xuống mức vừa phải gánh vác của phần cứng chip router.'),
(N'Router', N'cắm dây lan không nháy sáng, hỏng đầu rj45, kẹt cổng lan', N'Dây mạng cắm vào cổng LAN sau router không sáng đèn led báo kết nối?', N'Đầu nhựa giắc cắm mạng RJ45 bị gãy mất lẫy giữ nhựa làm lỏng chân đồng tiếp xúc bên trong cổng. Hãy dùng kìm bấm mạng bấm bấm thay đầu giắc RJ45 mới cho dây.'),
(N'Router', N'tự chuyển web lạ, hack pass wifi, virus mạng, mã độc router', N'Router Wi-Fi bị dính phần mềm mã độc, tự động chuyển hướng trang web lạ?', N'Do mật khẩu quản trị admin mặc định quá dễ bị hack. Hãy chọc nút reset cứng phía sau để khôi phục cài đặt gốc và tiến hành đặt lại mật khẩu quản trị phức tạp mới.'),
(N'Router', N'chập chờn trời mưa, vô nước dây mạng wan, nước vào router', N'Cổng mạng WAN của router bị chập chờn lúc nhận lúc không khi trời mưa ẩm?', N'Nước mưa ngấm theo đường dây cáp mạng ngoài trời chảy lọt vào cổng cắm gây rỉ sét oxy hóa chân đồng. Dùng bông tẩm cồn lau sạch rỉ đồng bên trong cổng cắm WAN.'),
(N'Router', N'mesh không chuyển mạng, lỗi roaming wifi, 2 router không đồng bộ', N'Không thể dùng tính năng chuyển vùng mạng mượt mà (Mesh Wi-Fi) giữa 2 router?', N'Đảm bảo cả 2 cục router đều cùng chung một hệ sinh thái firmware hỗ trợ chuẩn EasyMesh của TechCycle và cục phụ phải được kết nối đồng bộ qua nút nhấn WPS với cục chính.'),
(N'Router', N'sáng toàn bộ đèn, treo đơ gạch, brick firmware, nháy sáng treo máy', N'Router Wi-Fi bị lỗi treo cứng đơ, toàn bộ tất cả đèn LED đều sáng rực đứng im không nhấp nháy?', N'Hiện tượng lỗi tràn xung xung nhịp phần cứng (Brick nhẹ). Hãy ngắt nguồn điện, đợi 5 phút cắm lại. Nếu vẫn sáng đơ toàn bộ đèn thì cần up lại Firmware cứu hộ qua cổng mạng LAN cáp cứng.');

-- 16. Accessory (Phụ Kiện Điện Tử)
INSERT INTO repair_knowledge (category, keywords, issue_prompt, solution) VALUES 
(N'Accessory', N'sạc dự phòng sạc lâu đầy, dùng sạc nhanh, củ sạc yếu dự phòng', N'Sạc dự phòng TechCycle cắm sạc cả ngày không đầy vạch pin?', N'Sạc dự phòng dung lượng lớn (10.000 - 20.000mAh) cần dùng củ sạc nhanh công suất từ 18W trở lên để sạc vào. Nếu dùng củ sạc thường 5W cổ điển sẽ sạc cực kỳ lâu đầy.'),
(N'Accessory', N'cáp sạc chập chờn, không nhận sạc, dơ chấu đồng, đứt cáp', N'Cáp sạc điện thoại cắm vào máy lúc nhận lúc không, chập chờn khi lắc nhẹ?', N'Đầu chân kim tiếp xúc kim loại bằng đồng của đầu cáp bị bám bẩn oxy hóa đen rỉ. Dùng một miếng vải mỏng tẩm một chút cồn chà miết thật sạch đầu cắm kim loại này.'),
(N'Accessory', N'chuột không dây đơ, không di chuột, hết pin, lỏng reciever', N'Chuột không dây cắm đầu thu USB Receiver vào máy tính nhưng không di chuyển được?', N'Thay viên pin mới dưới đáy chuột. Đảm bảo công tắc gạt On/Off dưới đáy chuột đã gạt sang màu xanh. Thử rút đầu thu USB ra cắm sang cổng USB khác của máy tính.'),
(N'Accessory', N'bàn phím cơ liệt, bấm không ăn chữ, hỏng switch, phím tịt', N'Bàn phím cơ bị liệt, gõ một phím chữ không nhận tín hiệu ra màn hình?', N'Lỗi hỏng hóc hở chân hàn switch. Sử dụng thanh nhổ switch (Switch Puller) đi kèm nhổ chiếc switch bị liệt ra, dùng nhíp nắn thẳng lại 2 chân kim loại bằng đồng phía dưới rồi cắm chặt lại vào hotswap.'),
(N'Accessory', N'củ sạc kêu rè rè, tiếng rít sạc nhanh, coil whine, sạc ồn', N'Củ sạc nhanh đa năng cắm sạc phát ra tiếng kêu rít rè rè nhỏ tai?', N'Đây là tiếng cuộn cảm bên trong củ sạc rung động khi biến đổi dòng điện tần số cao (Hiện tượng Coil Whine). Nó hoàn toàn bình thường an toàn và không gây hại cho thiết bị.'),
(N'Accessory', N'hub type-c nóng ran, chuyển hdmi tỏa nhiệt, cổng hub quá nhiệt', N'Hub chuyển đổi Type-C ra cổng HDMI bị nóng ran lên khi cắm xuất màn hình?', N'Hub đa năng tích hợp chip xử lý chuyển đổi tín hiệu video độ phân giải cao nên tỏa nhiệt lớn. Hãy đặt Hub trên mặt bàn thoáng mát bằng gỗ kính, tránh đè chăn nệm.'),
(N'Accessory', N'đế sạc không dây không nhận, do ốp lưng dày, chặn vòng từ tính', N'Đế sạc không dây đặt điện thoại lên không thấy nhận sạc pin?', N'Tháo ốp lưng của điện thoại ra nếu ốp quá dày hoặc có chứa miếng sắt vòng từ tính chống xước vì khoảng cách sạc không dây tiêu chuẩn chỉ đáp ứng dưới phạm vi 4-5mm.'),
(N'Accessory', N'sò lạnh không lạnh, quạt tản nhiệt điện thoại thiếu công suất', N'Quạt tản nhiệt sò lạnh cho điện thoại cắm điện quạt quay nhưng không lạnh mặt đế?', N'Nguồn cấp dòng điện bị thiếu hụt công suất. Hãy dùng củ sạc và dây cáp truyền tải nguồn dòng chuẩn tối thiểu từ 5V-2A (10W) trở lên thì chip sò lạnh mới đủ điện làm mát đóng băng.'),
(N'Accessory', N'usb bắt format, hỏng thẻ nhớ, chkdsk cmd, cứu dữ liệu ổ usb', N'Đầu đọc thẻ nhớ USB cắm vào PC báo lỗi bắt buộc ''Format disk'' mới cho mở?', N'Thẻ nhớ bị lỗi cấu trúc phân vùng định dạng file (Raw file). Không chọn Format kẻo mất sạch dữ liệu, hãy mở CMD trên Windows gõ lệnh `chkdsk /f G:` (G là tên ổ thẻ) để sửa lỗi.'),
(N'Accessory', N'double click phím cơ, nhấn 1 ra 2, dơ switch, dính phím cơ', N'Bàn phím cơ bấm một nút chữ gõ ra lặp đi lặp lại nhiều ký tự giống nhau (Double Click)?', N'Bụi bẩn lọt sâu vào trong lõi đồng của switch gây tiếp xúc chập nhảy dải. Hãy nhỏ 1 giọt cồn 90 độ vào thẳng tâm lỗ hở của switch, ấn nhả nút liên tục 50 lần rồi đợi cồn khô.'),
(N'Accessory', N'jack chuyển tai nghe lẹt xẹt, lỏng type-c 3.5mm, dongle lỗi', N'Cáp chuyển đổi âm thanh từ Type-C sang giắc 3.5mm cắm vào tai nghe nghe tiếng bị lẹt xẹt?', N'Lỗ cắm giắc tròn 3.5mm của đầu chuyển bị lỏng chân kẹp kim loại bên trong. Hãy dùng chiếc kim khâu nhỏ khều khẽ chân đồng kẹp uốn dịch vào trong một chút để ôm chặt giắc cắm.'),
(N'Accessory', N'bút lazer trình chiếu không bấm qua slide, lỗi pin, bút thuyết trình', N'Bút trình chiếu slide bấm nút lazer sáng nhưng không chuyển được trang slide trên bảng?', N'Kiểm tra viên pin đũa (AAA) bên trong thân bút xem đã cạn năng lượng chưa. Đảm bảo đầu thu USB kết nối nhỏ đi kèm đã được cắm nhận diện ổn định trên máy tính thuyết trình.'),
(N'Accessory', N'đèn led màn hình chớp tắt, thiếu điện cắm usb, dải led nháy', N'Đèn LED RGB treo màn hình máy tính bật lên nhấp nháy sáng liên hồi rồi tắt tắt?', N'Do bạn cắm dây cấp nguồn của đèn vào cổng USB yếu trên máy tính. Hãy rút ra chuyển dây cắm trực tiếp vào củ sạc điện thoại độc lập bên ngoài để cấp đủ dòng dòng ổn định.'),
(N'Accessory', N'sạc dự phòng sập nguồn sớm, chai cell pin, xả pin dự phòng', N'Sạc dự phòng báo còn 2-3 vạch pin nhưng cắm vào điện thoại sạc được vài phút là tắt?', N'Các cell pin bên trong sạc dự phòng đã bị chai phồng hoặc lệch điện áp mạch quản lý. Hãy xả cạn kiệt sạc dự phòng về mức 0% rồi cắm sạc ngâm liên tục 12 tiếng để reset mạch.'),
(N'Accessory', N'củ sạc nóng bỏng, mùi khét, sạc cháy nổ, củ sạc bốc mùi', N'Củ sạc điện thoại cắm vào sạc sờ thấy nóng bỏng tay, có mùi khét nhẹ?', N'Củ sạc bị quá tải công suất hoặc chập linh kiện diode tụ lọc bên trong. Rút ngay khỏi ổ điện lập tức, ngưng sử dụng hoàn toàn và thay thế bằng củ sạc tiêu chuẩn bảo vệ an toàn cháy nổ.'),
(N'Accessory', N'chuột gaming không đổi dpi, lỗi phần mềm chỉnh tốc độ, nút dpi', N'Chuột chơi game không thể thay đổi được mức tốc độ chuột nhạy DPI bằng nút bấm bấm?', N'Tính năng gán phím chức năng của chuột đã bị thay đổi phần phần mềm. Hãy tải phần mềm Driver Driver quản lý chuột của TechCycle trên máy tính về để cài đặt Reset thiết lập nút mặc định.'),
(N'Accessory', N'đầu mạng rj45 tuột, lỏng dây lan, gãy chốt, bấm lại dây mạng', N'Dây cáp mạng Internet đúc sẵn cắm vào cổng không nghe tiếng kịch bám khóa chốt?', N'Lẫy gà nhựa nhỏ giữ cố định ở đầu bấm hạt mạng RJ45 bị gãy mất. Hãy cắt bỏ đầu cũ dùng kìm bấm chuyên dụng bấm thay thế đầu hạt mạng nhựa RJ45 mới bảo vệ kết nối chắc chắn.'),
(N'Accessory', N'kính vr nhòe hai hình, lệch tiêu cự thấu kính, nhức mắt kính ảo', N'Kính thực tế ảo (VR Box) gắn điện thoại vào nhìn hình ảnh bị nhòe đôi hình hiển thị?', N'Sử dụng 2 thanh gạt lẫy điều chỉnh tiêu cự thấu kính nằm trên đỉnh kính VR di chuyển sang trái phải trước sau cho đến khi dải tiêu cự khớp mắt nhìn ảnh chập lại làm một sắc nét.'),
(N'Accessory', N'giá đỡ kẹp sạc tự động không nhả, dơ cảm biến, kẹp hỏng sensor', N'Giá đỡ điện thoại tích hợp sạc tự động kẹp nam châm không chịu nhả cánh tay ôm?', N'Cảm biến hồng ngoại nhận diện vật thể ở mặt kính bị bám vân tay dính mờ che khuất mắt quét. Dùng khăn khô lau sạch vùng cảm biến kính hoặc bấm nút xả cơ học dưới đáy.'),
(N'Accessory', N'túi chống sốc kẹt khóa kéo, kẹt phéc mơ tuya, rít dơ dây kéo', N'Túi chống sốc đựng laptop bị kẹt khóa kéo không kéo lên xuống được?', N'Răng khóa kéo bị lệch khớp hoặc bám bụi sượng vải kẹt. Dùng một đầu bút chì màu đen chà miết dọc lên xuống các răng khóa kéo lớp than chì của bút chì sẽ đóng vai trò chất bôi trơn khô giúp kéo mượt mà.');
GO


/* ==========================================================
   PART 10: OUTPUT VERIFICATION
   ========================================================== */
PRINT '=======================================================';
PRINT '  TECHCYCLE MASTER DATABASE COMPLETED SUCCESSFULLY     ';
PRINT '=======================================================';

SELECT COUNT(*) AS [Tổng Số Users (Plain Password)] FROM users;
SELECT COUNT(*) AS [Tổng Số Sản Phẩm] FROM products;
SELECT COUNT(*) AS [Lịch Đặt Hẹn Thợ] FROM repair_bookings;
SELECT COUNT(*) AS [Tổng Số Đơn Hàng] FROM orders;
SELECT COUNT(*) AS [Tổng Số Lỗi (Cẩm Nang AI)] FROM repair_knowledge;
GO