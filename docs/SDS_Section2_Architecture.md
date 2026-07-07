# Software Design Specification (SDS)
# TechCycle Backend System

## Section 2: System Architecture

### 2.1 Architectural Overview

TechCycle backend follows a **Layered Architecture** pattern with clear separation of concerns across three primary layers:

```
┌─────────────────────────────────────────────────────┐
│              Client Layer (Frontend)                 │
│         React SPA / Mobile Application               │
└─────────────────────────────────────────────────────┘
                         ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────┐
│           Presentation Layer (Routes)                │
│    Express Routes + Middleware + WebSocket           │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│          Business Logic Layer (Controllers)          │
│    Request Validation + Business Rules + DTOs        │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│         Data Access Layer (Database)                 │
│    Sequelize ORM + Raw SQL Pool + Migrations        │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              Microsoft SQL Server                    │
│         Persistent Storage + Transactions            │
└─────────────────────────────────────────────────────┘
```

### 2.2 Design Principles

The architecture strictly adheres to the following enterprise principles as defined in CLAUDE.md:

#### 2.2.1 Separation of Concerns
- **Routes Layer**: HTTP endpoint definitions, routing logic, middleware chaining
- **Controllers Layer**: Request validation, business logic orchestration, response formatting
- **Data Layer**: Database operations, query optimization, transaction management

#### 2.2.2 Dependency Flow (Top-Down Only)
- Routes depend on Controllers
- Controllers depend on Database abstraction
- Database layer has no upstream dependencies
- **Prohibited**: Controllers accessing HTTP-specific objects, Database layer containing business logic

#### 2.2.3 Single Responsibility Principle
- Each module has ONE clear responsibility
- Controllers focus on request/response handling
- Database abstraction focuses on data persistence
- Business rules remain isolated in service logic

### 2.3 Layer Specifications

#### 2.3.1 Presentation Layer (Routes)

**Location**: `backend/routes/`

**Responsibilities**:
- Define RESTful endpoint mappings
- Apply authentication middleware
- Route requests to appropriate controllers
- Handle CORS and request parsing

**Key Files**:
```
routes/
├── authRoutes.js       - Authentication endpoints
├── productRoutes.js    - Product CRUD operations
├── bookingRoutes.js    - Repair booking management
├── orderRoutes.js      - Order processing
├── messageRoutes.js    - Real-time messaging
├── conversationRoutes.js - Conversation management
├── paymentRoutes.js    - Payment integration
├── userRoutes.js       - User profile management
├── aiRoutes.js         - AI chatbot endpoints
├── bannerRoutes.js     - System banners
├── featureRoutes.js    - Feature flags
└── systemRoutes.js     - System utilities
```

**Example Route Pattern**:
```javascript
// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
```

#### 2.3.2 Business Logic Layer (Controllers)

**Location**: `backend/controllers/`

**Responsibilities**:
- Validate incoming request payloads
- Execute business rules and workflows
- Coordinate database operations
- Format responses with appropriate HTTP status codes
- Handle error cases with proper exception messages

**Key Files**:
```
controllers/
├── authController.js      - Authentication & authorization
├── productController.js   - Product management logic
├── bookingController.js   - Booking workflow
├── orderController.js     - Order processing logic
├── messageController.js   - Message handling
├── conversationController.js - Conversation management
├── paymentController.js   - Payment processing
├── userController.js      - User operations
├── aiController.js        - AI chatbot integration
└── systemController.js    - System operations
```

**Controller Pattern**:
```javascript
// Example: authController.js structure
exports.register = async (req, res) => {
  // 1. Extract and validate input
  const { username, email, password, phone, role } = req.body;
  
  // 2. Business validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // 3. Database operations
  const existingUser = await db.findOne('users', { email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
  }
  
  // 4. Business logic execution
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await db.insert('users', { ... });
  
  // 5. Response formatting
  const token = jwt.sign({ id: newUser.id, role }, JWT_SECRET);
  res.status(201).json({ token, user: { ... } });
};
```

#### 2.3.3 Data Access Layer

**Location**: `backend/db.js`

**Responsibilities**:
- Provide unified database access interface
- Manage connection pooling
- Execute raw SQL queries (legacy compatibility)
- Sequelize ORM operations (modern approach)
- Handle database migrations on startup

**Dual-Mode Architecture**:
The system maintains TWO database access patterns for backward compatibility:

1. **Legacy SQL Pool** (raw queries)
   - Direct MS SQL connection pool
   - Used for complex queries and legacy code
   - Supports stored procedures and advanced SQL features

2. **Sequelize ORM** (modern approach)
   - Type-safe model definitions
   - Automatic query generation
   - Built-in validation and hooks
   - Migration support

**Database Abstraction Pattern**:
```javascript
// Simplified db.js interface
const db = {
  // Raw SQL execution
  query: async (sql, params) => { ... },
  
  // CRUD operations
  findOne: async (table, where) => { ... },
  findAll: async (table, options) => { ... },
  insert: async (table, data) => { ... },
  update: async (table, data, where) => { ... },
  delete: async (table, where) => { ... },
  
  // Sequelize models
  models: {
    User: UserModel,
    Product: ProductModel,
    Booking: BookingModel,
    // ... other models
  }
};
```

### 2.4 Core Design Patterns

#### 2.4.1 Middleware Chain Pattern
All HTTP requests flow through a standardized middleware pipeline:

```
Request → CORS → Body Parser → Auth Middleware → Route Handler → Response
```

**Authentication Middleware** (`middleware/authMiddleware.js`):
- Validates JWT tokens from Authorization header
- Extracts user context (id, role, username)
- Attaches user information to `req.user` object
- Returns 401 Unauthorized for invalid/missing tokens

**Example Implementation**:
```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};
```

#### 2.4.2 Role-Based Access Control (RBAC)
The system implements a hybrid RBAC model:

**Role Mapping**:
```javascript
const ROLE_MAP = {
  'admin': 1,      // Full system access
  'customer': 2,   // Buy products, book services
  'technician': 3, // Manage bookings, repair services
  'seller': 4      // Sell products, manage inventory
};
```

**Access Control Layers**:
1. **Route-Level**: Protected routes require authentication middleware
2. **Controller-Level**: Business logic validates user roles and ownership
3. **Data-Level**: Queries filter results based on user permissions

#### 2.4.3 Repository Pattern (Database Abstraction)
The `db.js` module implements a Repository-like pattern:
- Encapsulates all database operations
- Provides consistent CRUD interface
- Abstracts SQL Server-specific details
- Enables easy testing and database switching

### 2.5 Real-Time Communication Architecture

**Technology**: Socket.io v4.7.5

**Connection Flow**:
```
Client → HTTP Handshake → WebSocket Upgrade → Socket.io Connection
                                                       ↓
                                            Room-based Messaging
                                                       ↓
                                        Server-Side Event Broadcasting
```

**Key Features**:
- **Namespace Isolation**: Different features use separate namespaces
- **Room Management**: Users join rooms based on conversation IDs
- **Event Broadcasting**: Server emits events to specific rooms
- **Automatic Reconnection**: Client handles connection drops gracefully

**Socket.io Configuration**:
```javascript
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Connection handling
io.on('connection', (socket) => {
  // User joins conversation room
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });
  
  // Broadcast new message to room
  socket.on('new_message', (data) => {
    io.to(`conversation_${data.conversationId}`)
      .emit('message_received', data);
  });
});
```

### 2.6 External System Integrations

#### 2.6.1 AI Integration (Google Generative AI)
**Purpose**: AI-powered customer support chatbot

**Integration Points**:
- `/api/ai/*` endpoints
- Processes customer inquiries
- Provides product recommendations
- Handles common support questions

**Architecture**:
```
Customer Question → AI Controller → Google Gemini API → Response Formatting → Customer
```

#### 2.6.2 Email Service (Nodemailer)
**Purpose**: Transactional email delivery

**Use Cases**:
- OTP verification emails
- Registration confirmation
- Booking confirmations
- Order status updates

**Service Pattern** (`emailService.js`):
```javascript
const sendOtpEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({ ... });
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTP Verification',
    html: `<p>Your OTP: <strong>${otp}</strong></p>`
  });
};
```

#### 2.6.3 Payment Gateway (VNPay)
**Purpose**: Vietnamese payment processing

**Integration Flow**:
```
1. Client requests payment → Backend generates signed VNPay URL
2. Client redirects to VNPay → User completes payment
3. VNPay callback → Backend validates signature & updates order
4. Redirect to success/failure page
```

**Security**:
- HMAC-SHA512 signature verification
- Timestamp validation (prevents replay attacks)
- Order amount verification
- Transaction ID uniqueness check

### 2.7 Error Handling Strategy

#### 2.7.1 Standardized Error Response
All errors return consistent JSON structure:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "timestamp": "2026-07-02T09:13:30.949Z"
}
```

#### 2.7.2 HTTP Status Code Standards
- `400 Bad Request`: Invalid input, validation failures
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Valid auth but insufficient permissions
- `404 Not Found`: Resource does not exist
- `409 Conflict`: Business rule violation (duplicate email, etc.)
- `500 Internal Server Error`: Unexpected server errors

#### 2.7.3 Try-Catch Pattern
All async controller methods use comprehensive try-catch:
```javascript
exports.someAction = async (req, res) => {
  try {
    // Business logic
    const result = await performOperation();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Operation failed:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};
```

### 2.8 File Storage Architecture

**Current Implementation**: Local filesystem storage

**Structure**:
```
backend/uploads/
├── products/        - Product images
├── avatars/         - User profile pictures
└── documents/       - Booking-related files
```

**Upload Flow**:
```
1. Client → Base64-encoded image in JSON
2. Backend → Decode + validate format/size
3. Backend → Save to filesystem with unique filename
4. Backend → Return public URL path
5. Client → Display image via /uploads/* static route
```

**Constraints**:
- Maximum file size: 50MB
- Supported formats: JPEG, PNG, GIF
- File naming: `{timestamp}_{random}.{ext}`

### 2.9 In-Memory Data Structures

For performance and simplicity, certain transient data is stored in-memory:

**Notifications Array**:
```javascript
let notifications = [
  {
    id: '1',
    title: 'Welcome to TechCycle',
    message: '...',
    sender: 'System',
    createdAt: new Date().toISOString()
  }
];
```

**OTP Store (Map)**:
```javascript
const otpStore = new Map();
// Key: email, Value: { otp, expiresAt }
```

**Promo Codes Array**:
```javascript
let promoCodes = [
  { code: 'SUMMER24', discount: 15, expiry: '2026-12-31', status: 'active' }
];
```

**Complaints Array**:
```javascript
let complaints = [
  { id: '123', userId: 1, content: '...', status: 'pending' }
];
```

**Limitations**:
- Data is lost on server restart
- Not suitable for production at scale
- Recommended migration to Redis or database

---

**Next Section**: [Database Design](./SDS_Section3_Database.md)
