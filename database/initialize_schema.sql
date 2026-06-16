-- Complete SQL Schema for TechCycleDB
-- Re-runnable script: drops existing tables in reverse dependency order.

USE TechCycleDB;

-- 1. Drop tables in reverse order of foreign key dependencies
IF OBJECT_ID('dbo.messages', 'U') IS NOT NULL DROP TABLE dbo.messages;
IF OBJECT_ID('dbo.bookings', 'U') IS NOT NULL DROP TABLE dbo.bookings;
IF OBJECT_ID('dbo.Audit_Logs', 'U') IS NOT NULL DROP TABLE dbo.Audit_Logs;
IF OBJECT_ID('dbo.AI_Chat_History', 'U') IS NOT NULL DROP TABLE dbo.AI_Chat_History;
IF OBJECT_ID('dbo.Support_Tickets', 'U') IS NOT NULL DROP TABLE dbo.Support_Tickets;
IF OBJECT_ID('dbo.Inventory', 'U') IS NOT NULL DROP TABLE dbo.Inventory;
IF OBJECT_ID('dbo.Reviews', 'U') IS NOT NULL DROP TABLE dbo.Reviews;
IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL DROP TABLE dbo.Payments;
IF OBJECT_ID('dbo.Order_Details', 'U') IS NOT NULL DROP TABLE dbo.Order_Details;
IF OBJECT_ID('dbo.Orders', 'U') IS NOT NULL DROP TABLE dbo.Orders;
IF OBJECT_ID('dbo.Cart_Items', 'U') IS NOT NULL DROP TABLE dbo.Cart_Items;
IF OBJECT_ID('dbo.Carts', 'U') IS NOT NULL DROP TABLE dbo.Carts;
IF OBJECT_ID('dbo.Repair_Details', 'U') IS NOT NULL DROP TABLE dbo.Repair_Details;
IF OBJECT_ID('dbo.Repair_Requests', 'U') IS NOT NULL DROP TABLE dbo.Repair_Requests;
IF OBJECT_ID('dbo.Products', 'U') IS NOT NULL DROP TABLE dbo.Products;
IF OBJECT_ID('dbo.Brands', 'U') IS NOT NULL DROP TABLE dbo.Brands;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.Promo_Codes', 'U') IS NOT NULL DROP TABLE dbo.Promo_Codes;
IF OBJECT_ID('dbo.System_Info', 'U') IS NOT NULL DROP TABLE dbo.System_Info;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;

-- 2. Create tables

-- Users table (merged to support authController.js & update_data.sql)
CREATE TABLE Users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(255) NULL,
    username NVARCHAR(100) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    phone_number VARCHAR(20) NULL,
    address NVARCHAR(255) NULL,
    role VARCHAR(50) NULL,
    role_id INT NULL,
    avatar TEXT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT GETDATE()
);

-- Categories table
CREATE TABLE Categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NULL
);

-- Brands table
CREATE TABLE Brands (
    brand_id INT IDENTITY(1,1) PRIMARY KEY,
    brand_name NVARCHAR(100) NOT NULL,
    country NVARCHAR(100) NULL,
    logo VARCHAR(255) NULL
);

-- Products table
CREATE TABLE Products (
    product_id INT IDENTITY(1,1) PRIMARY KEY,
    product_name NVARCHAR(255) NOT NULL,
    category_id INT FOREIGN KEY REFERENCES Categories(category_id),
    category VARCHAR(100) NULL,
    brand_id INT FOREIGN KEY REFERENCES Brands(brand_id),
    description NVARCHAR(MAX) NULL,
    condition VARCHAR(50) NULL,
    price DECIMAL(12, 2) NOT NULL,
    old_price DECIMAL(12, 2) NULL,
    stock_quantity INT DEFAULT 1,
    warranty_period INT NULL,
    image_url VARCHAR(255) NULL,
    technical_specs NVARCHAR(MAX) NULL, -- JSON string
    status VARCHAR(50) DEFAULT 'available',
    seller_id INT FOREIGN KEY REFERENCES Users(id),
    created_at DATETIME DEFAULT GETDATE()
);

-- Repair Requests table
CREATE TABLE Repair_Requests (
    repair_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    technician_id INT NULL FOREIGN KEY REFERENCES Users(id),
    device_name NVARCHAR(255) NOT NULL,
    device_type NVARCHAR(100) NULL,
    issue_description NVARCHAR(MAX) NULL,
    repair_cost DECIMAL(12, 2) DEFAULT 0.00,
    repair_status VARCHAR(50) DEFAULT 'Pending',
    received_date DATETIME DEFAULT GETDATE(),
    completed_date DATETIME NULL,
    note NVARCHAR(MAX) NULL
);

-- Repair Details table
CREATE TABLE Repair_Details (
    detail_id INT IDENTITY(1,1) PRIMARY KEY,
    repair_id INT NOT NULL FOREIGN KEY REFERENCES Repair_Requests(repair_id),
    diagnosis NVARCHAR(MAX) NULL,
    repair_method NVARCHAR(MAX) NULL,
    replacement_parts NVARCHAR(MAX) NULL,
    technician_note NVARCHAR(MAX) NULL,
    repair_image VARCHAR(255) NULL
);

-- Carts table
CREATE TABLE Carts (
    cart_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    created_at DATETIME DEFAULT GETDATE()
);

-- Cart Items table
CREATE TABLE Cart_Items (
    item_id INT IDENTITY(1,1) PRIMARY KEY,
    cart_id INT NOT NULL FOREIGN KEY REFERENCES Carts(cart_id),
    product_id INT NOT NULL FOREIGN KEY REFERENCES Products(product_id),
    quantity INT DEFAULT 1,
    price DECIMAL(12, 2) NOT NULL
);

-- Orders table (merged to support both legacy and new structures)
CREATE TABLE Orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    order_date DATETIME DEFAULT GETDATE(),
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_address NVARCHAR(MAX) NULL,
    payment_method VARCHAR(50) NULL,
    order_status VARCHAR(50) DEFAULT 'Pending',
    promo_code_id INT NULL,
    staff_id INT NULL FOREIGN KEY REFERENCES Users(id),
    invoice_number VARCHAR(50) NULL, -- Unique constraint is handled via filtered index below
    items NVARCHAR(MAX) NULL, -- For storing serialized JSON items in legacy orders
    shippingInfo NVARCHAR(MAX) NULL -- For storing serialized JSON shippingInfo in legacy orders
);

-- Order Details table
CREATE TABLE Order_Details (
    detail_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL FOREIGN KEY REFERENCES Orders(order_id),
    product_id INT NOT NULL FOREIGN KEY REFERENCES Products(product_id),
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL
);

-- Payments table
CREATE TABLE Payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL FOREIGN KEY REFERENCES Orders(order_id),
    payment_date DATETIME DEFAULT GETDATE(),
    amount DECIMAL(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(50) NULL,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    transaction_code VARCHAR(100) NULL
);

-- Promo Codes table
CREATE TABLE Promo_Codes (
    promo_code_id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_percent DECIMAL(5, 2) NULL,
    expiry_date DATE NULL
);

-- Reviews table
CREATE TABLE Reviews (
    review_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT FOREIGN KEY REFERENCES Products(product_id),
    customer_id INT FOREIGN KEY REFERENCES Users(id),
    rating INT NOT NULL,
    comment NVARCHAR(MAX) NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Inventory table
CREATE TABLE Inventory (
    inventory_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT FOREIGN KEY REFERENCES Products(product_id),
    quantity INT DEFAULT 0,
    location NVARCHAR(100) NULL,
    import_date DATETIME DEFAULT GETDATE(),
    imported_by INT NULL
);

-- Support Tickets table
CREATE TABLE Support_Tickets (
    ticket_id INT IDENTITY(1,1) PRIMARY KEY,
    customer_id INT FOREIGN KEY REFERENCES Users(id),
    assigned_staff INT NULL FOREIGN KEY REFERENCES Users(id),
    subject NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NULL,
    status VARCHAR(50) DEFAULT 'Open',
    created_at DATETIME DEFAULT GETDATE()
);

-- AI Chat History table
CREATE TABLE AI_Chat_History (
    chat_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(id),
    message NVARCHAR(MAX) NULL,
    response NVARCHAR(MAX) NULL,
    sender_type VARCHAR(50) NULL,
    created_at DATETIME DEFAULT GETDATE()
);

-- Audit Logs table
CREATE TABLE Audit_Logs (
    log_id INT IDENTITY(1,1) PRIMARY KEY,
    admin_id INT NULL FOREIGN KEY REFERENCES Users(id),
    action NVARCHAR(255) NOT NULL,
    target_table VARCHAR(100) NULL,
    user_id INT FOREIGN KEY REFERENCES Users(id),
    timestamp DATETIME DEFAULT GETDATE()
);

-- System Info table
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

-- bookings table (for mock bookingController.js)
CREATE TABLE bookings (
    id INT IDENTITY(1,1) PRIMARY KEY,
    customerId INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    technicianId INT NULL FOREIGN KEY REFERENCES Users(id),
    deviceType NVARCHAR(255) NULL,
    issueDescription NVARCHAR(MAX) NULL,
    preferredDate DATE NULL,
    preferredTime VARCHAR(50) NULL,
    status VARCHAR(50) DEFAULT 'pending',
    cost DECIMAL(12, 2) DEFAULT 0.00,
    notes NVARCHAR(MAX) NULL,
    createdAt DATETIME DEFAULT GETDATE(),
    updatedAt DATETIME DEFAULT GETDATE()
);

-- messages table (for chat and messageController.js)
CREATE TABLE messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    senderId INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    receiverId INT NOT NULL FOREIGN KEY REFERENCES Users(id),
    bookingId INT NULL FOREIGN KEY REFERENCES bookings(id),
    text NVARCHAR(MAX) NOT NULL,
    timestamp DATETIME DEFAULT GETDATE()
);

-- 3. Indexes
-- Unique non-clustered index on Orders.invoice_number that filters out NULLs
CREATE UNIQUE NONCLUSTERED INDEX UQ_Orders_invoice_number 
ON Orders(invoice_number) 
WHERE invoice_number IS NOT NULL;
