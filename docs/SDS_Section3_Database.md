# Software Design Specification (SDS)
# TechCycle Backend System

## Section 3: Database Design

### 3.1 Database Overview

**Database Management System**: Microsoft SQL Server 2019+

**ORM Layer**: Sequelize v6.37.8 with backward-compatible raw SQL pool

**Design Principles**:
- Normalized to 3NF for transactional integrity
- Foreign key constraints enforced at database level
- Indexed columns for query optimization
- Timestamps for audit trail
- Soft delete avoided for performance (hard delete + archive pattern)

### 3.2 Entity-Relationship Model

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│    Users    │────────→│ Conversations│────────→│  Messages   │
│  (Roles)    │         │  (Chat Logs) │         │  (Content)  │
└─────────────┘         └──────────────┘         └─────────────┘
      │                        │
      │                        ↓
      │                  ┌──────────────┐
      ├─────────────────→│   Products   │
      │                  │  (Inventory) │
      │                  └──────────────┘
      │                        │
      ↓                        ↓
┌─────────────┐         ┌──────────────┐
│  Bookings   │         │    Orders    │
│ (Services)  │         │ (Purchases)  │
└─────────────┘         └──────────────┘
      │                        │
      └────────→ ┌─────────────┴─┐
                 │   Payments    │
                 │ (Transactions)│
                 └───────────────┘
```

### 3.3 Core Tables

#### 3.3.1 Users Table
**Purpose**: Central user management with multi-role support

**Schema**:
```sql
CREATE TABLE [dbo].[users] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [role_id] INT NOT NULL,
    [username] NVARCHAR(255) NOT NULL UNIQUE,
    [email] NVARCHAR(255) NOT NULL UNIQUE,
    [password] NVARCHAR(255) NOT NULL,
    [full_name] NVARCHAR(255) NOT NULL,
    [phone] NVARCHAR(50) NOT NULL UNIQUE,
    [avatar] NVARCHAR(500) NULL,
    [status] NVARCHAR(50) DEFAULT 'active',
    [description] NVARCHAR(MAX) NULL,
    [created_at] DATETIME DEFAULT GETUTCDATE(),
    [updated_at] DATETIME DEFAULT GETUTCDATE()
);
```

**Indexes**:
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`
- UNIQUE INDEX on `username`
- UNIQUE INDEX on `phone`
- INDEX on `role_id` (for role-based queries)
- INDEX on `status` (for active user filtering)

**Constraints**:
- `role_id` references roles table (implicit)
- `email` must be valid email format (application-level validation)
- `phone` must match Vietnamese format: 10-11 digits starting with 0
- `status` values: 'active', 'inactive', 'banned'

**Sequelize Model**:
```javascript
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  full_name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false, unique: true },
  avatar: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  description: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});
```

#### 3.3.2 Conversations Table
**Purpose**: Track customer-seller chat sessions

**Schema**:
```sql
CREATE TABLE [dbo].[conversations] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [customer_id] INT NOT NULL,
    [seller_id] INT NULL,
    [product_id] INT NULL,
    [status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
    [created_at] DATETIME DEFAULT GETUTCDATE(),
    [updated_at] DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY ([customer_id]) REFERENCES [users]([id]),
    FOREIGN KEY ([seller_id]) REFERENCES [users]([id]),
    FOREIGN KEY ([product_id]) REFERENCES [products]([id])
);
```

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `customer_id` (customer's conversation list)
- INDEX on `seller_id` (seller's conversation list)
- INDEX on `product_id` (product inquiry tracking)
- COMPOSITE INDEX on `(customer_id, seller_id)` (unique conversation lookup)

**Business Rules**:
- `seller_id` can be NULL for pending conversations (no seller assigned)
- `product_id` can be NULL for general inquiries
- `status` values: 'pending', 'active', 'closed'

#### 3.3.3 Messages Table
**Purpose**: Store chat message history

**Schema**:
```sql
CREATE TABLE [dbo].[messages] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [sender_id] INT NOT NULL,
    [receiver_id] INT NULL,
    [conversation_id] INT NULL,
    [booking_id] INT NULL,
    [text_content] NVARCHAR(MAX) NOT NULL,
    [timestamp] DATETIME DEFAULT GETUTCDATE(),
    FOREIGN KEY ([sender_id]) REFERENCES [users]([id]),
    FOREIGN KEY ([receiver_id]) REFERENCES [users]([id]) ON DELETE NO ACTION,
    FOREIGN KEY ([conversation_id]) REFERENCES [conversations]([id]),
    FOREIGN KEY ([booking_id]) REFERENCES [bookings]([id])
);
```

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `conversation_id` (message history retrieval)
- INDEX on `sender_id` (user's sent messages)
- INDEX on `booking_id` (booking-related messages)
- INDEX on `timestamp` DESC (recent messages first)

**Performance Optimization**:
- `text_content` stored as NVARCHAR(MAX) for Unicode support
- `receiver_id` is nullable to support broadcast messages
- `timestamp` indexed for chronological ordering

### 3.4 Additional Tables

#### 3.4.1 Products Table
**Purpose**: Store product inventory for marketplace

**Key Fields**:
- `id`, `seller_id`, `name`, `description`, `price`, `category`
- `condition` (new, like-new, good, fair)
- `status` (available, sold, reserved)
- `images` (JSON array of image URLs)
- `created_at`, `updated_at`

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `seller_id`
- INDEX on `category`
- INDEX on `status`
- COMPOSITE INDEX on `(category, status, price)`

#### 3.4.2 Bookings Table
**Purpose**: Manage repair service appointments

**Key Fields**:
- `id`, `customer_id`, `technician_id`, `service_type`
- `scheduled_date`, `scheduled_time`
- `status` (pending, confirmed, completed, cancelled)
- `device_info`, `issue_description`
- `total_cost`

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `customer_id`
- INDEX on `technician_id`
- INDEX on `scheduled_date`
- INDEX on `status`

#### 3.4.3 Orders Table
**Purpose**: Track product purchase transactions

**Key Fields**:
- `id`, `customer_id`, `product_id`, `seller_id`
- `quantity`, `total_amount`
- `status` (pending, confirmed, shipped, delivered, cancelled)
- `shipping_address`, `payment_method`
- `created_at`, `updated_at`

**Indexes**:
- PRIMARY KEY on `id`
- INDEX on `customer_id`
- INDEX on `seller_id`
- INDEX on `status`
- INDEX on `created_at` DESC

### 3.5 Relationships & Foreign Keys

**User → Conversations** (One-to-Many):
- User.id ← Conversation.customer_id
- User.id ← Conversation.seller_id

**Conversation → Messages** (One-to-Many):
- Conversation.id ← Message.conversation_id

**User → Messages** (One-to-Many):
- User.id ← Message.sender_id
- User.id ← Message.receiver_id

**User → Products** (One-to-Many):
- User.id ← Product.seller_id

**User → Bookings** (One-to-Many):
- User.id ← Booking.customer_id
- User.id ← Booking.technician_id

**User → Orders** (One-to-Many):
- User.id ← Order.customer_id
- User.id ← Order.seller_id

**Product → Orders** (One-to-Many):
- Product.id ← Order.product_id

### 3.6 Database Migrations

**Migration Strategy**: Schema-on-startup pattern

**Implementation** (in `db.js`):
```javascript
pool.request().query(`
  -- Create conversations table if not exists
  IF NOT EXISTS (SELECT * FROM sys.objects 
                 WHERE object_id = OBJECT_ID(N'[dbo].[conversations]'))
  BEGIN
    CREATE TABLE [dbo].[conversations]( ... );
  END

  -- Add conversation_id to messages if missing
  IF NOT EXISTS (SELECT * FROM sys.columns 
                 WHERE object_id = OBJECT_ID(N'[dbo].[messages]') 
                 AND name = 'conversation_id')
  BEGIN
    ALTER TABLE [dbo].[messages] ADD conversation_id INT NULL;
  END

  -- Make receiver_id nullable
  IF EXISTS (SELECT * FROM sys.columns 
             WHERE object_id = OBJECT_ID(N'[dbo].[messages]') 
             AND name = 'receiver_id' AND is_nullable = 0)
  BEGIN
    ALTER TABLE [dbo].[messages] ALTER COLUMN receiver_id INT NULL;
  END
`);
```

**Migration Philosophy**:
- Migrations run automatically on server startup
- Schema changes are additive (no destructive operations)
- Constraints modified carefully to avoid data loss
- Foreign keys dropped before column alterations

### 3.7 Data Access Patterns

**Sequelize ORM (Preferred)**:
```javascript
// Create
const user = await User.create({ username, email, password });

// Find One
const user = await User.findOne({ where: { email } });

// Find All with associations
const conversations = await Conversation.findAll({
  include: [
    { model: User, as: 'Customer' },
    { model: User, as: 'Seller' },
    { model: Message, as: 'Messages' }
  ]
});

// Update
await user.update({ status: 'inactive' });

// Delete (hard delete)
await user.destroy();
```

**Legacy Raw SQL (Backward Compatibility)**:
```javascript
// Raw query
const result = await db.query(
  'SELECT * FROM users WHERE email = @email',
  [{ name: 'email', value: 'user@example.com' }]
);

// Abstraction layer
const user = await db.findOne('users', { email: 'user@example.com' });
const users = await db.find('users', { status: 'active' });
const newUser = await db.insert('users', { username, email, password });
await db.update('users', 'id', userId, { status: 'inactive' });
```

---

**Next Section**: [API Design](./SDS_Section4_API.md)
