# Software Design Specification (SDS)
# TechCycle Backend System

## Section 5: Security & Infrastructure

### 5.1 Security Overview

The TechCycle backend implements multiple layers of security following industry best practices and the enterprise security standards defined in CLAUDE.md.

**Security Layers**:
1. **Authentication** - JWT token-based identity verification
2. **Authorization** - Role-based and attribute-based access control
3. **Data Protection** - Password hashing, input validation, SQL injection prevention
4. **Communication Security** - HTTPS, CORS, secure headers
5. **Secret Management** - Environment variables, no hardcoded credentials

### 5.2 Authentication System

#### 5.2.1 JWT Token Architecture

**Technology**: JSON Web Tokens (JWT) via `jsonwebtoken` library

**Token Structure**:
```javascript
{
  "id": 123,              // User ID
  "role": "customer",     // User role
  "username": "johndoe",  // Username
  "iat": 1719936000,      // Issued at timestamp
  "exp": 1720540800       // Expiration timestamp
}
```

**Token Lifecycle**:
- **Expiration**: 7 days (configurable via JWT_SECRET)
- **Storage**: Client-side (localStorage or cookies - implementation dependent)
- **Transmission**: Authorization header: `Bearer <token>`

**Token Generation** (on login/register):
```javascript
const token = jwt.sign(
  { id: user.id, role: user.role, username: user.username },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

**Token Verification** (authMiddleware.js):
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
    req.user = user;  // Attach user context to request
    next();
  });
};
```

**Security Considerations**:
- JWT_SECRET must be stored in environment variables
- Tokens are stateless (no server-side session storage)
- Token revocation requires implementing a blacklist (not currently implemented)
- Consider shorter expiration (15-30 minutes) with refresh tokens for production

#### 5.2.2 Password Security

**Hashing Algorithm**: bcryptjs with salt rounds = 10

**Registration Flow**:
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
await db.insert('users', {
  username,
  email,
  password: hashedPassword,  // Never store plaintext
  ...
});
```

**Login Verification**:
```javascript
const user = await db.findOne('users', { email });
const isValidPassword = await bcrypt.compare(password, user.password);
if (!isValidPassword) {
  return res.status(401).json({ message: 'Invalid credentials' });
}
```

**Password Requirements**:
- Minimum length: 6 characters (should be increased to 8-12 for production)
- No complexity requirements currently enforced
- Recommendation: Add password strength validation (uppercase, lowercase, numbers, special chars)

#### 5.2.3 OTP Verification System

**Use Cases**:
- Email verification during registration
- Password reset flow
- Two-factor authentication (future)

**OTP Storage**: In-memory Map (temporary, lost on restart)

**OTP Generation**:
```javascript
const otp = Math.floor(100000 + Math.random() * 900000).toString();
const expiresAt = Date.now() + 10 * 60 * 1000;  // 10 minutes
otpStore.set(email, { otp, expiresAt });
```

**OTP Verification**:
```javascript
const stored = otpStore.get(email);
if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
  return res.status(400).json({ message: 'Invalid or expired OTP' });
}
otpStore.delete(email);  // One-time use
```

**Security Improvements Needed**:
- Migrate to Redis for persistent OTP storage
- Implement rate limiting (max 5 attempts per email per hour)
- Add CAPTCHA to prevent automated abuse

### 5.3 Authorization System

#### 5.3.1 Role-Based Access Control (RBAC)

**Roles**:
```javascript
const ROLE_MAP = {
  'admin': 1,      // Full system access, user management
  'customer': 2,   // Buy products, book services, messaging
  'technician': 3, // Manage bookings, mark services complete
  'seller': 4      // Sell products, manage inventory, respond to inquiries
};
```

**Route-Level Protection**:
```javascript
// Public endpoint
router.get('/products', productController.getProducts);

// Protected endpoint (any authenticated user)
router.post('/bookings', authenticateToken, bookingController.createBooking);

// Role-specific endpoint (implemented in controller)
router.post('/products', authenticateToken, productController.createProduct);
```

**Controller-Level Authorization**:
```javascript
// Example: Only sellers can create products
exports.createProduct = async (req, res) => {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only sellers can create products' });
  }
  // ... create product logic
};
```

#### 5.3.2 Attribute-Based Access Control (ABAC)

**Ownership Verification**:
```javascript
// Example: Users can only update their own profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const user = await db.findOne('users', { id: userId });
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // User can only update their own data
  await db.update('users', 'id', userId, req.body);
};

// Example: Sellers can only update their own products
exports.updateProduct = async (req, res) => {
  const product = await db.findOne('products', { id: req.params.id });
  
  if (product.seller_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  // ... update product
};
```

### 5.4 Input Validation & Security

#### 5.4.1 Request Validation

**Validation Strategy**: Controller-level validation before business logic

**Example Validations**:
```javascript
// Registration validation
if (!username || !email || !password || !phone) {
  return res.status(400).json({ message: 'Missing required fields' });
}

// Email format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ message: 'Invalid email format' });
}

// Phone number validation (Vietnamese format)
const phoneRegex = /^0\d{9,10}$/;
if (!phoneRegex.test(phone.trim())) {
  return res.status(400).json({ message: 'Invalid phone number' });
}
```

**Recommended Improvements**:
- Implement Zod or Joi schema validation
- Create reusable validation middleware
- Add request size limits (currently 50MB - too high)

#### 5.4.2 SQL Injection Prevention

**ORM Protection**: Sequelize automatically parameterizes queries

**Safe Query Pattern**:
```javascript
// SAFE: Sequelize parameterized query
const user = await User.findOne({ where: { email: userInput } });

// SAFE: db.js abstraction with parameterization
const user = await db.findOne('users', { email: userInput });
```

**Raw Query Protection**:
```javascript
// SAFE: Parameterized raw query
const result = await db.query(
  'SELECT * FROM users WHERE email = @email',
  [{ name: 'email', value: userInput }]
);

// UNSAFE (avoided in codebase):
// const result = await db.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

#### 5.4.3 XSS Prevention

**Current Status**: No explicit sanitization implemented

**Risks**:
- User-generated content (product descriptions, messages) not sanitized
- HTML/JavaScript injection possible in text fields

**Recommended Mitigations**:
```javascript
const xss = require('xss');

// Sanitize user input before storage
const sanitizedDescription = xss(req.body.description);
```

**Content Security Policy**: Not currently implemented (should be added)

### 5.5 Network Security

#### 5.5.1 CORS Configuration

**Current Configuration** (permissive for development):
```javascript
app.use(cors());  // Allows all origins

// Socket.io CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});
```

**Production Configuration** (recommended):
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://techcycle.vn',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### 5.5.2 HTTPS & Secure Headers

**Current Status**: HTTP only (development)

**Production Requirements**:
```javascript
// Helmet.js for security headers
const helmet = require('helmet');
app.use(helmet());

// Force HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

**Recommended Headers**:
- `Strict-Transport-Security: max-age=31536000`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### 5.6 Configuration Management

#### 5.6.1 Environment Variables

**Configuration File**: `.env` (not committed to git)

**Required Variables**:
```env
# Database Configuration
DB_SERVER=localhost
DB_DATABASE=TechCycle
DB_USER=sa
DB_PASSWORD=<secure_password>
DB_PORT=1433
DB_INSTANCE=SQLEXPRESS
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true

# Authentication
JWT_SECRET=<random_256_bit_string>

# Email Service (Nodemailer)
EMAIL_USER=noreply@techcycle.vn
EMAIL_PASSWORD=<app_specific_password>

# Payment Gateway (VNPay)
VNPAY_TMN_CODE=<merchant_code>
VNPAY_HASH_SECRET=<hash_secret>
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# AI Integration
GOOGLE_AI_API_KEY=<gemini_api_key>

# Server Configuration
PORT=5000
NODE_ENV=development
```

**Security Best Practices**:
- Never commit `.env` to version control (add to `.gitignore`)
- Use different secrets for development/staging/production
- Rotate secrets regularly (quarterly recommended)
- Use strong, randomly generated secrets (256-bit minimum)

#### 5.6.2 Secret Generation

**JWT Secret Generation**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Password Generation** (for service accounts):
```bash
openssl rand -base64 32
```

### 5.7 Error Handling & Logging

#### 5.7.1 Error Response Standards

**Standardized Error Format**:
```javascript
{
  "success": false,
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "timestamp": "2026-07-02T09:13:30.949Z"
}
```

**Error Handling Pattern**:
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
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};
```

**Security Note**: Never expose stack traces or internal error details to clients in production

#### 5.7.2 Logging Strategy

**Current Implementation**: Console logging only

**Production Requirements**:
- Structured logging (Winston or Pino)
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation (ELK stack, Datadog, CloudWatch)
- Request/response logging with correlation IDs
- Security event logging (failed logins, unauthorized access attempts)

**Recommended Log Format**:
```json
{
  "timestamp": "2026-07-02T09:13:30.949Z",
  "level": "error",
  "message": "Login failed",
  "user_email": "user@example.com",
  "ip_address": "192.168.1.1",
  "trace_id": "abc-123-def"
}
```

---

**Next Section**: [Deployment & Configuration](./SDS_Section6_Deployment.md)
