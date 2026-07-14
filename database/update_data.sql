USE electronics_marketplace_repair;
GO

/* ==========================================================
   PART 1 - RESET DATA SAFE (KHÔNG XÓA DATABASE)
   ========================================================== */

PRINT 'DISABLE FOREIGN KEYS...';

ALTER TABLE Order_Details NOCHECK CONSTRAINT ALL;
ALTER TABLE Payments NOCHECK CONSTRAINT ALL;
ALTER TABLE Orders NOCHECK CONSTRAINT ALL;
ALTER TABLE Cart_Items NOCHECK CONSTRAINT ALL;
ALTER TABLE Carts NOCHECK CONSTRAINT ALL;
ALTER TABLE Repair_Details NOCHECK CONSTRAINT ALL;
ALTER TABLE Repair_Requests NOCHECK CONSTRAINT ALL;
ALTER TABLE Reviews NOCHECK CONSTRAINT ALL;
ALTER TABLE Inventory NOCHECK CONSTRAINT ALL;
ALTER TABLE Support_Tickets NOCHECK CONSTRAINT ALL;
ALTER TABLE AI_Chat_History NOCHECK CONSTRAINT ALL;
ALTER TABLE Audit_Logs NOCHECK CONSTRAINT ALL;
GO

/* ==========================================================
   DELETE DATA (ĐÚNG THỨ TỰ FK)
   ========================================================== */

DELETE FROM Order_Details;
DELETE FROM Payments;
DELETE FROM Orders;
DELETE FROM Cart_Items;
DELETE FROM Carts;
DELETE FROM Repair_Details;
DELETE FROM Repair_Requests;
DELETE FROM Reviews;
DELETE FROM Inventory;
DELETE FROM Support_Tickets;
DELETE FROM AI_Chat_History;
DELETE FROM Audit_Logs;
DELETE FROM Products;
DELETE FROM Promo_Codes;
DELETE FROM Categories;
DELETE FROM Brands;
DELETE FROM Users;

IF OBJECT_ID('System_Info', 'U') IS NOT NULL
    DELETE FROM System_Info;
GO

/* ==========================================================
   RESET IDENTITY
   ========================================================== */

DBCC CHECKIDENT ('Users', RESEED, 0);
DBCC CHECKIDENT ('Categories', RESEED, 0);
DBCC CHECKIDENT ('Brands', RESEED, 0);
DBCC CHECKIDENT ('Products', RESEED, 0);
DBCC CHECKIDENT ('Carts', RESEED, 0);
DBCC CHECKIDENT ('Cart_Items', RESEED, 0);
DBCC CHECKIDENT ('Orders', RESEED, 0);
DBCC CHECKIDENT ('Order_Details', RESEED, 0);
DBCC CHECKIDENT ('Payments', RESEED, 0);
DBCC CHECKIDENT ('Repair_Requests', RESEED, 0);
DBCC CHECKIDENT ('Repair_Details', RESEED, 0);
DBCC CHECKIDENT ('Inventory', RESEED, 0);
DBCC CHECKIDENT ('Reviews', RESEED, 0);
DBCC CHECKIDENT ('Support_Tickets', RESEED, 0);
DBCC CHECKIDENT ('AI_Chat_History', RESEED, 0);
DBCC CHECKIDENT ('Audit_Logs', RESEED, 0);
GO

/* ==========================================================
   SYSTEM INFO - TECHCYCLE
   ========================================================== */

IF NOT EXISTS (
    SELECT * FROM sys.tables
    WHERE name = 'System_Info'
)
BEGIN
    CREATE TABLE System_Info (
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
END
GO

INSERT INTO System_Info (
    system_name,
    founder_name,
    founder_role,
    founder_age,
    support_email,
    hotline,
    established_date,
    description
)
VALUES
(
    N'TechCycle',
    N'Huỳnh Lê Kim Huy',
    'CEO',
    20,
    'Huynhlekimhuy12345@gmail.com',
    '0325225503',
    '2026-05-15',
    N'Nền tảng mua bán và sửa chữa thiết bị công nghệ TechCycle.'
);
GO

/* ==========================================================
   USERS
   ========================================================== */

INSERT INTO Users
(
    full_name,
    email,
    password,
    phone_number,
    address,
    role,
    status
)
VALUES
(N'Huỳnh Lê Kim Huy', 'Huynhlekimhuy12345@gmail.com',
'hashed_password_123',
'0325225503',
N'TP Hồ Chí Minh',
'Admin',
'Active'),

(N'Trần Quốc Bảo',
'sales1@techcycle.vn',
'hashed_password_123',
'0901111111',
N'Đà Nẵng',
'Sales Staff',
'Active'),

(N'Nguyễn Minh Anh',
'sales2@techcycle.vn',
'hashed_password_123',
'0902222222',
N'Hà Nội',
'Sales Staff',
'Active'),

(N'Lê Văn Khang',
'tech1@techcycle.vn',
'hashed_password_123',
'0903333333',
N'TP Hồ Chí Minh',
'Repair Technician',
'Active'),

(N'Phạm Gia Huy',
'tech2@techcycle.vn',
'hashed_password_123',
'0904444444',
N'Cần Thơ',
'Repair Technician',
'Active');

/* 20 customers */

DECLARE @i INT = 1;

WHILE @i <= 20
BEGIN
    INSERT INTO Users
    (
        full_name,
        email,
        password,
        phone_number,
        address,
        role,
        status
    )
    VALUES
    (
        N'Khách Hàng ' + CAST(@i AS NVARCHAR),
        'customer' + CAST(@i AS VARCHAR) + '@gmail.com',
        'hashed_password_123',
        '0988' + RIGHT('000000' + CAST(@i AS VARCHAR),6),
        N'Việt Nam',
        'Customer',
        'Active'
    );

    SET @i = @i + 1;
END
GO

/* ==========================================================
   CATEGORIES
   ========================================================== */

INSERT INTO Categories
(category_name, description)
VALUES
(N'Điện thoại', N'Smartphone mới và cũ'),
(N'Laptop', N'Laptop văn phòng, gaming'),
(N'Máy tính bảng', N'Tablet và iPad'),
(N'Tai nghe', N'Tai nghe không dây'),
(N'Phụ kiện', N'Chuột, bàn phím, sạc'),
(N'Đồng hồ thông minh', N'Smart Watch'),
(N'Thiết bị gaming', N'Gaming gear'),
(N'Gia dụng điện tử', N'Thiết bị gia dụng');
GO

/* ==========================================================
   BRANDS
   ========================================================== */

INSERT INTO Brands
(brand_name, country, logo)
VALUES
('Apple', 'USA', 'apple.png'),
('Samsung', 'Korea', 'samsung.png'),
('Xiaomi', 'China', 'xiaomi.png'),
('Sony', 'Japan', 'sony.png'),
('Dell', 'USA', 'dell.png'),
('Asus', 'Taiwan', 'asus.png'),
('Lenovo', 'China', 'lenovo.png'),
('HP', 'USA', 'hp.png'),
('MSI', 'Taiwan', 'msi.png'),
('Acer', 'Taiwan', 'acer.png'),
('JBL', 'USA', 'jbl.png'),
('Logitech', 'Switzerland', 'logitech.png');
GO

PRINT 'PART 1 SUCCESS';


/* ==========================================================
   PART 2A - INSERT 50 PRODUCTS
   ========================================================== */

DECLARE @i INT = 1;

WHILE @i <= 50
BEGIN

    DECLARE @CategoryId INT;
    DECLARE @BrandId INT;
    DECLARE @Condition VARCHAR(20);
    DECLARE @Price DECIMAL(12,2);
    DECLARE @OldPrice DECIMAL(12,2);
    DECLARE @Stock INT;
    DECLARE @Warranty INT;
    DECLARE @SellerId INT;
    DECLARE @ProductName NVARCHAR(255);
    DECLARE @Description NVARCHAR(MAX);
    DECLARE @ImageUrl VARCHAR(255);
    DECLARE @TechnicalSpecs NVARCHAR(MAX);

    /* Category random */
    SET @CategoryId = ((@i - 1) % 8) + 1;

    /* Brand random */
    SET @BrandId = ((@i - 1) % 12) + 1;

    /* 70% used / 30% new */
    IF @i % 10 <= 6
        SET @Condition = 'Used';
    ELSE IF @i % 10 <= 8
        SET @Condition = 'Like New';
    ELSE
        SET @Condition = 'New';

    /* Price */
    SET @Price = 1500000 + (@i * 350000);
    SET @OldPrice = @Price + (500000 + (@i * 100000));

    /* Stock */
    SET @Stock = (ABS(CHECKSUM(NEWID())) % 15) + 1;

    /* Warranty */
    SET @Warranty = CASE
        WHEN @Condition = 'New' THEN 12
        WHEN @Condition = 'Like New' THEN 6
        ELSE 3
    END;

    /* Seller */
    SET @SellerId = CASE
        WHEN @i % 4 = 0 THEN 1
        ELSE ((ABS(CHECKSUM(NEWID())) % 10) + 6)
    END;

    /* Product Name */
    SET @ProductName =
    CASE @CategoryId
        WHEN 1 THEN N'iPhone / Samsung Premium #' + CAST(@i AS NVARCHAR)
        WHEN 2 THEN N'Laptop Gaming / Office #' + CAST(@i AS NVARCHAR)
        WHEN 3 THEN N'iPad / Tablet #' + CAST(@i AS NVARCHAR)
        WHEN 4 THEN N'Tai nghe Bluetooth #' + CAST(@i AS NVARCHAR)
        WHEN 5 THEN N'Phụ kiện công nghệ #' + CAST(@i AS NVARCHAR)
        WHEN 6 THEN N'Smart Watch #' + CAST(@i AS NVARCHAR)
        WHEN 7 THEN N'Gaming Gear #' + CAST(@i AS NVARCHAR)
        ELSE N'Thiết bị điện tử #' + CAST(@i AS NVARCHAR)
    END;

    /* Description */
    SET @Description =
    N'Sản phẩm TechCycle kiểm định chất lượng, hoạt động ổn định, hỗ trợ bảo hành.';

    /* Image format */
    SET @ImageUrl =
    '/images/products/product_' + CAST(@i AS VARCHAR) + '.jpg';

    /* JSON Specs */
    SET @TechnicalSpecs =
    '{"ram":"8GB","storage":"256GB","battery":"Good","condition":"'
    + @Condition + '"}';

    INSERT INTO Products
    (
        product_name,
        category_id,
        brand_id,
        description,
        condition,
        price,
        old_price,
        stock_quantity,
        warranty_period,
        image_url,
        technical_specs,
        status,
        seller_id
    )
    VALUES
    (
        @ProductName,
        @CategoryId,
        @BrandId,
        @Description,
        @Condition,
        @Price,
        @OldPrice,
        @Stock,
        @Warranty,
        @ImageUrl,
        @TechnicalSpecs,
        'Available',
        @SellerId
    );

    SET @i = @i + 1;
END
GO

PRINT 'PART 2A SUCCESS - 50 PRODUCTS INSERTED';


/* ==========================================================
   PART 2B - INSERT PRODUCTS 51 -> 100
   ========================================================== */

DECLARE @i INT = 51;

WHILE @i <= 100
BEGIN

    DECLARE @CategoryId INT;
    DECLARE @BrandId INT;
    DECLARE @Condition VARCHAR(20);
    DECLARE @Price DECIMAL(12,2);
    DECLARE @OldPrice DECIMAL(12,2);
    DECLARE @Stock INT;
    DECLARE @Warranty INT;
    DECLARE @SellerId INT;
    DECLARE @ProductName NVARCHAR(255);
    DECLARE @Description NVARCHAR(MAX);
    DECLARE @ImageUrl VARCHAR(255);
    DECLARE @TechnicalSpecs NVARCHAR(MAX);

    /* Category */
    SET @CategoryId = ((@i - 1) % 8) + 1;

    /* Brand */
    SET @BrandId = ((@i - 1) % 12) + 1;

    /* 70% used */
    IF @i % 10 <= 6
        SET @Condition = 'Used';
    ELSE IF @i % 10 <= 8
        SET @Condition = 'Like New';
    ELSE
        SET @Condition = 'New';

    /* Price realistic hơn */
    SET @Price =
        CASE @CategoryId
            WHEN 1 THEN 7000000 + (@i * 150000) -- phones
            WHEN 2 THEN 12000000 + (@i * 250000) -- laptops
            WHEN 3 THEN 5000000 + (@i * 120000) -- tablets
            WHEN 4 THEN 1000000 + (@i * 70000) -- headphones
            WHEN 5 THEN 300000 + (@i * 30000) -- accessories
            WHEN 6 THEN 2000000 + (@i * 80000) -- smartwatch
            WHEN 7 THEN 1500000 + (@i * 100000) -- gaming
            ELSE 2500000 + (@i * 90000)
        END;

    SET @OldPrice = @Price + (@Price * 0.25);

    /* Stock */
    SET @Stock = (ABS(CHECKSUM(NEWID())) % 20) + 1;

    /* Warranty */
    SET @Warranty =
        CASE
            WHEN @Condition = 'New' THEN 12
            WHEN @Condition = 'Like New' THEN 6
            ELSE 3
        END;

    /* Seller random */
    SET @SellerId =
        CASE
            WHEN @i % 5 = 0 THEN 1
            ELSE ((ABS(CHECKSUM(NEWID())) % 10) + 6)
        END;

    /* Product names realistic */
    SET @ProductName =
    CASE @CategoryId
        WHEN 1 THEN
            CASE @BrandId
                WHEN 1 THEN N'iPhone 14 Pro Max #' + CAST(@i AS NVARCHAR)
                WHEN 2 THEN N'Samsung Galaxy S24 Ultra #' + CAST(@i AS NVARCHAR)
                WHEN 3 THEN N'Xiaomi 14 Ultra #' + CAST(@i AS NVARCHAR)
                ELSE N'Smartphone Premium #' + CAST(@i AS NVARCHAR)
            END

        WHEN 2 THEN
            CASE @BrandId
                WHEN 5 THEN N'Dell XPS 15 #' + CAST(@i AS NVARCHAR)
                WHEN 6 THEN N'Asus ROG Strix #' + CAST(@i AS NVARCHAR)
                WHEN 7 THEN N'Lenovo Legion #' + CAST(@i AS NVARCHAR)
                ELSE N'Laptop Cao Cấp #' + CAST(@i AS NVARCHAR)
            END

        WHEN 3 THEN N'iPad / Android Tablet #' + CAST(@i AS NVARCHAR)
        WHEN 4 THEN N'Tai nghe Bluetooth Premium #' + CAST(@i AS NVARCHAR)
        WHEN 5 THEN N'Phụ kiện công nghệ #' + CAST(@i AS NVARCHAR)
        WHEN 6 THEN N'Smart Watch Pro #' + CAST(@i AS NVARCHAR)
        WHEN 7 THEN N'Gaming Gear RGB #' + CAST(@i AS NVARCHAR)
        ELSE N'Thiết bị điện tử thông minh #' + CAST(@i AS NVARCHAR)
    END;

    SET @Description =
    N'Sản phẩm được kiểm tra kỹ thuật tại TechCycle, hỗ trợ bảo hành và đổi trả theo chính sách.';

    /* Image URL */
    SET @ImageUrl =
    '/images/products/product_' + CAST(@i AS VARCHAR) + '.jpg';

    /* Specs JSON */
    SET @TechnicalSpecs =
    '{"ram":"8GB","storage":"256GB","display":"OLED","battery":"Good","condition":"'
    + @Condition + '"}';

    INSERT INTO Products
    (
        product_name,
        category_id,
        brand_id,
        description,
        condition,
        price,
        old_price,
        stock_quantity,
        warranty_period,
        image_url,
        technical_specs,
        status,
        seller_id
    )
    VALUES
    (
        @ProductName,
        @CategoryId,
        @BrandId,
        @Description,
        @Condition,
        @Price,
        @OldPrice,
        @Stock,
        @Warranty,
        @ImageUrl,
        @TechnicalSpecs,
        'Available',
        @SellerId
    );

    SET @i = @i + 1;
END
GO

PRINT 'PART 2B SUCCESS - 100 PRODUCTS COMPLETED';


/* ==========================================================
   PART 3 - 50 REPAIR REQUESTS + DETAILS
   ========================================================== */

DECLARE @i INT = 1;

WHILE @i <= 50
BEGIN

    DECLARE @CustomerId INT;
    DECLARE @TechnicianId INT;
    DECLARE @DeviceName NVARCHAR(150);
    DECLARE @DeviceType NVARCHAR(50);
    DECLARE @Issue NVARCHAR(MAX);
    DECLARE @RepairCost DECIMAL(12,2);
    DECLARE @RepairStatus VARCHAR(20);
    DECLARE @Diagnosis NVARCHAR(MAX);
    DECLARE @RepairMethod NVARCHAR(MAX);
    DECLARE @ReplacementParts NVARCHAR(MAX);
    DECLARE @TechNote NVARCHAR(MAX);
    DECLARE @RepairId INT;

    /* Customer: từ user 6 -> 25 */
    SET @CustomerId = ((@i - 1) % 20) + 6;

    /* Technician */
    SET @TechnicianId =
        CASE
            WHEN @i % 2 = 0 THEN 4
            ELSE 5
        END;

    /* Device Type */
    IF @i % 5 = 0
    BEGIN
        SET @DeviceName = N'MacBook Pro M1';
        SET @DeviceType = N'Laptop';
        SET @Issue = N'Máy nóng bất thường và pin tụt nhanh.';
        SET @RepairCost = 1800000;
        SET @Diagnosis = N'Pin chai và quạt tản nhiệt bám bụi.';
        SET @RepairMethod = N'Vệ sinh máy và thay pin mới.';
        SET @ReplacementParts = N'Pin MacBook M1';
    END
    ELSE IF @i % 4 = 0
    BEGIN
        SET @DeviceName = N'Samsung Galaxy S23 Ultra';
        SET @DeviceType = N'Điện thoại';
        SET @Issue = N'Màn hình bị sọc sau va đập.';
        SET @RepairCost = 2400000;
        SET @Diagnosis = N'Hỏng cụm hiển thị AMOLED.';
        SET @RepairMethod = N'Thay màn hình mới.';
        SET @ReplacementParts = N'Màn hình S23 Ultra';
    END
    ELSE IF @i % 3 = 0
    BEGIN
        SET @DeviceName = N'AirPods Pro Gen 2';
        SET @DeviceType = N'Tai nghe';
        SET @Issue = N'Tai trái mất kết nối.';
        SET @RepairCost = 650000;
        SET @Diagnosis = N'Lỗi module bluetooth.';
        SET @RepairMethod = N'Thay module kết nối.';
        SET @ReplacementParts = N'Bluetooth Module';
    END
    ELSE IF @i % 2 = 0
    BEGIN
        SET @DeviceName = N'Asus ROG Strix';
        SET @DeviceType = N'Laptop Gaming';
        SET @Issue = N'Máy quá nhiệt khi chơi game.';
        SET @RepairCost = 900000;
        SET @Diagnosis = N'Keo tản nhiệt khô.';
        SET @RepairMethod = N'Thay keo tản nhiệt + vệ sinh quạt.';
        SET @ReplacementParts = N'Keo tản nhiệt';
    END
    ELSE
    BEGIN
        SET @DeviceName = N'iPhone 14 Pro Max';
        SET @DeviceType = N'Điện thoại';
        SET @Issue = N'Vỡ kính màn hình sau khi rơi.';
        SET @RepairCost = 1500000;
        SET @Diagnosis = N'Chỉ hỏng kính ngoài, cảm ứng ổn định.';
        SET @RepairMethod = N'Ép kính mới.';
        SET @ReplacementParts = N'Kính iPhone';
    END;

    /* Status */
    SET @RepairStatus =
        CASE (@i % 5)
            WHEN 0 THEN 'Completed'
            WHEN 1 THEN 'Pending'
            WHEN 2 THEN 'Diagnosing'
            WHEN 3 THEN 'Repairing'
            ELSE 'Completed'
        END;

    /* Insert repair request */
    INSERT INTO Repair_Requests
    (
        customer_id,
        technician_id,
        device_name,
        device_type,
        issue_description,
        repair_cost,
        repair_status,
        received_date,
        completed_date,
        note
    )
    VALUES
    (
        @CustomerId,
        @TechnicianId,
        @DeviceName,
        @DeviceType,
        @Issue,
        @RepairCost,
        @RepairStatus,
        DATEADD(DAY, -@i, GETDATE()),
        CASE
            WHEN @RepairStatus = 'Completed'
                THEN DATEADD(DAY, -(@i - 2), GETDATE())
            ELSE NULL
        END,
        N'Khách yêu cầu kiểm tra kỹ trước khi sửa.'
    );

    SET @RepairId = SCOPE_IDENTITY();

    /* Insert repair details */
    INSERT INTO Repair_Details
    (
        repair_id,
        diagnosis,
        repair_method,
        replacement_parts,
        technician_note,
        repair_image
    )
    VALUES
    (
        @RepairId,
        @Diagnosis,
        @RepairMethod,
        @ReplacementParts,
        N'Thiết bị đã kiểm tra kỹ thuật tại TechCycle.',
        '/images/repairs/repair_' + CAST(@i AS VARCHAR) + '.jpg'
    );

    SET @i = @i + 1;
END
GO

PRINT 'PART 3 SUCCESS - 50 REPAIR REPORTS INSERTED';


/* ==========================================================
   PART 4 - FINAL DATA SEED
   ========================================================== */

/* ===========================
   CARTS
=========================== */

DECLARE @i INT = 6;

WHILE @i <= 25
BEGIN
    INSERT INTO Carts(customer_id)
    VALUES(@i);

    SET @i = @i + 1;
END
GO

/* ===========================
   CART ITEMS
=========================== */

DECLARE @CartId INT = 1;

WHILE @CartId <= 20
BEGIN
    INSERT INTO Cart_Items
    (
        cart_id,
        product_id,
        quantity,
        price
    )
    VALUES
    (
        @CartId,
        ((ABS(CHECKSUM(NEWID())) % 100) + 1),
        ((ABS(CHECKSUM(NEWID())) % 3) + 1),
        ((ABS(CHECKSUM(NEWID())) % 15000000) + 1000000)
    );

    SET @CartId = @CartId + 1;
END
GO

/* ===========================
   ORDERS
=========================== */

DECLARE @OrderIndex INT = 1;

WHILE @OrderIndex <= 40
BEGIN
    INSERT INTO Orders
    (
        customer_id,
        order_date,
        total_amount,
        shipping_address,
        payment_method,
        order_status,
        promo_code_id,
        staff_id
    )
    VALUES
    (
        ((@OrderIndex - 1) % 20) + 6,
        DATEADD(DAY, -@OrderIndex, GETDATE()),
        ((ABS(CHECKSUM(NEWID())) % 30000000) + 2000000),
        N'Việt Nam',
        CASE (@OrderIndex % 3)
            WHEN 0 THEN 'COD'
            WHEN 1 THEN 'Banking'
            ELSE 'E-wallet'
        END,
        CASE (@OrderIndex % 5)
            WHEN 0 THEN 'Delivered'
            WHEN 1 THEN 'Pending'
            WHEN 2 THEN 'Shipping'
            WHEN 3 THEN 'Confirmed'
            ELSE 'Cancelled'
        END,
        NULL,
        CASE
            WHEN @OrderIndex % 2 = 0 THEN 2
            ELSE 3
        END
    );

    SET @OrderIndex = @OrderIndex + 1;
END
GO

/* ===========================
   ORDER DETAILS
=========================== */

DECLARE @OrderId INT = 1;

WHILE @OrderId <= 40
BEGIN
    INSERT INTO Order_Details
    (
        order_id,
        product_id,
        quantity,
        unit_price
    )
    VALUES
    (
        @OrderId,
        ((ABS(CHECKSUM(NEWID())) % 100) + 1),
        ((ABS(CHECKSUM(NEWID())) % 2) + 1),
        ((ABS(CHECKSUM(NEWID())) % 25000000) + 1000000)
    );

    SET @OrderId = @OrderId + 1;
END
GO

/* ===========================
   PAYMENTS
=========================== */

DECLARE @PayId INT = 1;

WHILE @PayId <= 40
BEGIN
    INSERT INTO Payments
    (
        order_id,
        payment_method,
        payment_status,
        payment_date,
        transaction_code
    )
    VALUES
    (
        @PayId,
        CASE (@PayId % 3)
            WHEN 0 THEN 'COD'
            WHEN 1 THEN 'Banking'
            ELSE 'E-wallet'
        END,
        CASE (@PayId % 4)
            WHEN 0 THEN 'Completed'
            WHEN 1 THEN 'Pending'
            WHEN 2 THEN 'Failed'
            ELSE 'Completed'
        END,
        GETDATE(),
        'TXN' + CAST(@PayId AS VARCHAR)
            + CAST(ABS(CHECKSUM(NEWID())) AS VARCHAR)
    );

    SET @PayId = @PayId + 1;
END
GO

/* ===========================
   REVIEWS
=========================== */

DECLARE @Review INT = 1;

WHILE @Review <= 80
BEGIN
    INSERT INTO Reviews
    (
        customer_id,
        product_id,
        rating,
        comment
    )
    VALUES
    (
        ((ABS(CHECKSUM(NEWID())) % 20) + 6),
        ((ABS(CHECKSUM(NEWID())) % 100) + 1),
        ((ABS(CHECKSUM(NEWID())) % 5) + 1),
        N'Sản phẩm dùng ổn định, đúng mô tả từ TechCycle.'
    );

    SET @Review = @Review + 1;
END
GO

/* ===========================
   INVENTORY
=========================== */

DECLARE @Product INT = 1;

WHILE @Product <= 100
BEGIN
    INSERT INTO Inventory
    (
        product_id,
        quantity,
        import_date,
        imported_by
    )
    VALUES
    (
        @Product,
        ((ABS(CHECKSUM(NEWID())) % 50) + 1),
        GETDATE(),
        1
    );

    SET @Product = @Product + 1;
END
GO

/* ===========================
   SUPPORT TICKETS
=========================== */

DECLARE @Ticket INT = 1;

WHILE @Ticket <= 25
BEGIN
    INSERT INTO Support_Tickets
    (
        customer_id,
        assigned_staff,
        subject,
        message,
        status
    )
    VALUES
    (
        ((ABS(CHECKSUM(NEWID())) % 20) + 6),
        CASE
            WHEN @Ticket % 2 = 0 THEN 2
            ELSE 3
        END,
        N'Hỗ trợ đơn hàng #' + CAST(@Ticket AS NVARCHAR),
        N'Tôi cần hỗ trợ về đơn hàng và bảo hành.',
        CASE (@Ticket % 4)
            WHEN 0 THEN 'Resolved'
            WHEN 1 THEN 'Open'
            WHEN 2 THEN 'In Progress'
            ELSE 'Closed'
        END
    );

    SET @Ticket = @Ticket + 1;
END
GO

/* ===========================
   AI CHAT HISTORY
=========================== */

DECLARE @Chat INT = 1;

WHILE @Chat <= 30
BEGIN
    INSERT INTO AI_Chat_History
    (
        user_id,
        message,
        sender_type
    )
    VALUES
    (
        ((ABS(CHECKSUM(NEWID())) % 20) + 6),
        N'Tôi muốn tư vấn sản phẩm phù hợp.',
        'User'
    );

    INSERT INTO AI_Chat_History
    (
        user_id,
        message,
        sender_type
    )
    VALUES
    (
        ((ABS(CHECKSUM(NEWID())) % 20) + 6),
        N'TechCycle AI đề xuất sản phẩm phù hợp với nhu cầu của bạn.',
        'AI'
    );

    SET @Chat = @Chat + 1;
END
GO

/* ===========================
   AUDIT LOGS
=========================== */

INSERT INTO Audit_Logs
(
    admin_id,
    action,
    target_table
)
VALUES
(
    1,
    N'Khởi tạo dữ liệu hệ thống TechCycle',
    'System'
);
GO

/* ===========================
   ENABLE FOREIGN KEYS
=========================== */

ALTER TABLE Order_Details CHECK CONSTRAINT ALL;
ALTER TABLE Payments CHECK CONSTRAINT ALL;
ALTER TABLE Orders CHECK CONSTRAINT ALL;
ALTER TABLE Cart_Items CHECK CONSTRAINT ALL;
ALTER TABLE Carts CHECK CONSTRAINT ALL;
ALTER TABLE Repair_Details CHECK CONSTRAINT ALL;
ALTER TABLE Repair_Requests CHECK CONSTRAINT ALL;
ALTER TABLE Reviews CHECK CONSTRAINT ALL;
ALTER TABLE Inventory CHECK CONSTRAINT ALL;
ALTER TABLE Support_Tickets CHECK CONSTRAINT ALL;
ALTER TABLE AI_Chat_History CHECK CONSTRAINT ALL;
ALTER TABLE Audit_Logs CHECK CONSTRAINT ALL;
GO

PRINT 'TECHCYCLE DATABASE COMPLETED SUCCESSFULLY';
SELECT COUNT(*) AS UsersCount FROM Users;
SELECT COUNT(*) AS ProductsCount FROM Products;
SELECT COUNT(*) AS RepairsCount FROM Repair_Requests;
SELECT COUNT(*) AS OrdersCount FROM Orders;
SELECT COUNT(*) AS ReviewsCount FROM Reviews;
