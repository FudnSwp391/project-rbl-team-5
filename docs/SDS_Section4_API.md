# Software Design Specification (SDS)
# TechCycle Backend System

## Section 4: API Design

### 4.1 API Overview

**Architecture**: RESTful API following standard HTTP conventions

**Base URL**: `http://localhost:5000/api` (development)

**API Versioning**: Currently v1 (implicit), future versions will use `/api/v2/...`

**Content Type**: `application/json`

**Authentication**: JWT Bearer tokens in Authorization header

**CORS**: Enabled for all origins (development) - must be restricted in production

### 4.2 API Standards

#### 4.2.1 Request Format
```http
POST /api/resource HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "field1": "value1",
  "field2": "value2"
}
```

#### 4.2.2 Response Format (Success)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

#### 4.2.3 Response Format (Error)
```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE"
}
```

#### 4.2.4 HTTP Status Codes
- `200 OK` - Successful GET/PUT/PATCH requests
- `201 Created` - Successful POST requests creating resources
- `400 Bad Request` - Invalid input, validation failures
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - Valid auth but insufficient permissions
- `404 Not Found` - Resource does not exist
- `409 Conflict` - Business rule violation (duplicate email, etc.)
- `500 Internal Server Error` - Unexpected server errors

### 4.3 Authentication API

**Base Path**: `/api/auth`

#### 4.3.1 User Registration
**Endpoint**: `POST /api/auth/register`

**Authentication**: None required

**Request Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "full_name": "John Doe",
  "phone": "0912345678",
  "role": "customer"
}
```

**Validation Rules**:
- `username`: Required, unique
- `email`: Required, unique, valid email format
- `password`: Required, minimum 6 characters
- `phone`: Required, unique, Vietnamese format (10-11 digits starting with 0)
- `role`: Optional, defaults to "customer", values: "admin", "customer", "technician", "seller"

**Response (201 Created)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "customer",
    "full_name": "John Doe",
    "avatar": "https://api.dicebear.com/7.x/adventurer/svg?seed=johndoe"
  }
}
```

**Error Cases**:
- `400 Bad Request`: Missing required fields
- `400 Bad Request`: Invalid phone number format
- `400 Bad Request`: Email already registered
- `400 Bad Request`: Phone number already in use

#### 4.3.2 User Login
**Endpoint**: `POST /api/auth/login`

**Authentication**: None required

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "customer",
    "full_name": "John Doe",
    "avatar": "...",
    "status": "active"
  }
}
```

**Error Cases**:
- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account is inactive or banned

#### 4.3.3 Get Current User Profile
**Endpoint**: `GET /api/auth/me`

**Authentication**: Required (JWT token)

**Response (200 OK)**:
```json
{
  "id": 123,
  "username": "johndoe",
  "email": "john@example.com",
  "role": "customer",
  "full_name": "John Doe",
  "phone": "0912345678",
  "avatar": "...",
  "status": "active",
  "description": "Bio text..."
}
```

#### 4.3.4 Update Profile
**Endpoint**: `PUT /api/auth/profile`

**Authentication**: Required

**Request Body** (all fields optional):
```json
{
  "full_name": "John Updated Doe",
  "phone": "0987654321",
  "avatar": "https://...",
  "description": "Updated bio"
}
```

**Response (200 OK)**:
```json
{
  "message": "Profile updated successfully",
  "user": { ... }
}
```

#### 4.3.5 Logout
**Endpoint**: `POST /api/auth/logout`

**Authentication**: Required

**Response (200 OK)**:
```json
{
  "message": "Logged out successfully"
}
```

**Note**: Client-side must discard JWT token. Server-side logout is stateless.

### 4.4 Product API

**Base Path**: `/api/products`

#### 4.4.1 Get All Products
**Endpoint**: `GET /api/products`

**Authentication**: None required

**Query Parameters**:
- `category` (optional): Filter by category
- `status` (optional): Filter by status (available, sold, reserved)
- `seller_id` (optional): Filter by seller
- `search` (optional): Search by name or description
- `limit` (optional): Number of results per page (default: 20)
- `offset` (optional): Pagination offset

**Response (200 OK)**:
```json
{
  "products": [
    {
      "id": 1,
      "seller_id": 4,
      "name": "iPhone 13 Pro",
      "description": "Like new condition, 256GB",
      "price": 18000000,
      "category": "smartphones",
      "condition": "like-new",
      "status": "available",
      "images": ["url1", "url2"],
      "created_at": "2026-06-15T10:30:00Z",
      "seller": {
        "id": 4,
        "username": "techseller",
        "full_name": "Tech Seller"
      }
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

#### 4.4.2 Get Product by ID
**Endpoint**: `GET /api/products/:id`

**Authentication**: None required

**Response (200 OK)**:
```json
{
  "id": 1,
  "seller_id": 4,
  "name": "iPhone 13 Pro",
  "description": "Like new condition...",
  "price": 18000000,
  "category": "smartphones",
  "condition": "like-new",
  "status": "available",
  "images": ["url1", "url2"],
  "specifications": {
    "storage": "256GB",
    "color": "Graphite",
    "warranty": "3 months"
  },
  "created_at": "2026-06-15T10:30:00Z",
  "seller": {
    "id": 4,
    "username": "techseller",
    "full_name": "Tech Seller",
    "phone": "0901234567"
  }
}
```

**Error Cases**:
- `404 Not Found`: Product does not exist

#### 4.4.3 Create Product
**Endpoint**: `POST /api/products`

**Authentication**: Required (seller or admin role)

**Request Body**:
```json
{
  "name": "iPhone 13 Pro",
  "description": "Like new condition, 256GB",
  "price": 18000000,
  "category": "smartphones",
  "condition": "like-new",
  "images": ["url1", "url2"],
  "specifications": { ... }
}
```

**Response (201 Created)**:
```json
{
  "message": "Product created successfully",
  "product": { ... }
}
```

**Error Cases**:
- `400 Bad Request`: Missing required fields
- `403 Forbidden`: User is not a seller

#### 4.4.4 Update Product
**Endpoint**: `PUT /api/products/:id`

**Authentication**: Required (must be product owner or admin)

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "price": 17000000,
  "status": "sold"
}
```

**Response (200 OK)**:
```json
{
  "message": "Product updated successfully",
  "product": { ... }
}
```

**Error Cases**:
- `403 Forbidden`: Not the product owner
- `404 Not Found`: Product does not exist

#### 4.4.5 Delete Product
**Endpoint**: `DELETE /api/products/:id`

**Authentication**: Required (must be product owner or admin)

**Response (200 OK)**:
```json
{
  "message": "Product deleted successfully"
}
```

### 4.5 Booking API

**Base Path**: `/api/bookings`

#### 4.5.1 Get Bookings
**Endpoint**: `GET /api/bookings`

**Authentication**: Required

**Query Parameters**:
- `status` (optional): Filter by status
- `technician_id` (optional): Filter by technician

**Response (200 OK)**:
```json
{
  "bookings": [
    {
      "id": 1,
      "customer_id": 2,
      "technician_id": 3,
      "service_type": "screen_repair",
      "device_info": "iPhone 13",
      "issue_description": "Cracked screen",
      "scheduled_date": "2026-07-05",
      "scheduled_time": "10:00",
      "status": "confirmed",
      "total_cost": 1500000,
      "customer": { ... },
      "technician": { ... }
    }
  ]
}
```

#### 4.5.2 Create Booking
**Endpoint**: `POST /api/bookings`

**Authentication**: Required

**Request Body**:
```json
{
  "service_type": "screen_repair",
  "device_info": "iPhone 13",
  "issue_description": "Cracked screen",
  "scheduled_date": "2026-07-05",
  "scheduled_time": "10:00"
}
```

**Response (201 Created)**:
```json
{
  "message": "Booking created successfully",
  "booking": { ... }
}
```

#### 4.5.3 Update Booking
**Endpoint**: `PUT /api/bookings/:id`

**Authentication**: Required

**Request Body**:
```json
{
  "status": "completed",
  "total_cost": 1500000
}
```

**Response (200 OK)**:
```json
{
  "message": "Booking updated successfully",
  "booking": { ... }
}
```

### 4.6 Order API

**Base Path**: `/api/orders`

#### 4.6.1 Get Orders
**Endpoint**: `GET /api/orders`

**Authentication**: Required

**Response (200 OK)**:
```json
{
  "orders": [
    {
      "id": 1,
      "customer_id": 2,
      "product_id": 5,
      "seller_id": 4,
      "quantity": 1,
      "total_amount": 18000000,
      "status": "confirmed",
      "shipping_address": "123 Main St, District 1, HCMC",
      "payment_method": "vnpay",
      "created_at": "2026-07-01T14:30:00Z",
      "product": { ... },
      "customer": { ... }
    }
  ]
}
```

#### 4.6.2 Create Order
**Endpoint**: `POST /api/orders`

**Authentication**: Required

**Request Body**:
```json
{
  "product_id": 5,
  "quantity": 1,
  "shipping_address": "123 Main St, District 1, HCMC",
  "payment_method": "vnpay"
}
```

**Response (201 Created)**:
```json
{
  "message": "Order created successfully",
  "order": { ... },
  "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?..."
}
```

#### 4.6.3 Update Order Status
**Endpoint**: `PUT /api/orders/:id/status`

**Authentication**: Required (seller or admin)

**Request Body**:
```json
{
  "status": "shipped"
}
```

**Response (200 OK)**:
```json
{
  "message": "Order status updated",
  "order": { ... }
}
```

#### 4.6.4 Cancel Order
**Endpoint**: `POST /api/orders/:id/cancel`

**Authentication**: Required

**Request Body**:
```json
{
  "reason": "Changed my mind"
}
```

**Response (200 OK)**:
```json
{
  "message": "Order cancelled successfully"
}
```

**Error Cases**:
- `400 Bad Request`: Order cannot be cancelled (already shipped)
- `403 Forbidden`: Not authorized to cancel this order

### 4.7 Conversation API

**Base Path**: `/api/conversations`

#### 4.7.1 Get Pending Conversations
**Endpoint**: `GET /api/conversations/pending`

**Authentication**: Required (seller or admin role)

**Response (200 OK)**:
```json
{
  "conversations": [
    {
      "id": 1,
      "customer_id": 2,
      "seller_id": null,
      "product_id": 5,
      "status": "pending",
      "created_at": "2026-07-02T08:00:00Z",
      "customer": {
        "id": 2,
        "username": "customer1",
        "full_name": "John Customer"
      },
      "product": {
        "id": 5,
        "name": "iPhone 13 Pro"
      },
      "last_message": {
        "text_content": "Is this still available?",
        "timestamp": "2026-07-02T08:00:00Z"
      }
    }
  ]
}
```

#### 4.7.2 Get My Conversations
**Endpoint**: `GET /api/conversations/my`

**Authentication**: Required

**Response (200 OK)**:
```json
{
  "conversations": [
    {
      "id": 1,
      "customer_id": 2,
      "seller_id": 4,
      "product_id": 5,
      "status": "active",
      "other_user": {
        "id": 4,
        "username": "seller1",
        "full_name": "Tech Seller",
        "avatar": "..."
      },
      "product": { ... },
      "last_message": {
        "text_content": "Yes, still available",
        "timestamp": "2026-07-02T08:05:00Z"
      },
      "unread_count": 2
    }
  ]
}
```

#### 4.7.3 Create Conversation
**Endpoint**: `POST /api/conversations`

**Authentication**: Required

**Request Body**:
```json
{
  "product_id": 5,
  "initial_message": "Is this still available?"
}
```

**Response (201 Created)**:
```json
{
  "message": "Conversation created",
  "conversation": { ... }
}
```

#### 4.7.4 Accept Conversation
**Endpoint**: `PUT /api/conversations/:id/accept`

**Authentication**: Required (seller role)

**Response (200 OK)**:
```json
{
  "message": "Conversation accepted",
  "conversation": {
    "id": 1,
    "customer_id": 2,
    "seller_id": 4,
    "status": "active"
  }
}
```

### 4.8 Message API

**Base Path**: `/api/messages`

**Note**: Real-time messaging uses Socket.io, HTTP endpoints for message history

#### 4.8.1 Get Messages by Conversation
**Endpoint**: `GET /api/messages?conversation_id=:id`

**Authentication**: Required

**Query Parameters**:
- `conversation_id` (required): Conversation ID
- `limit` (optional): Number of messages (default: 50)
- `before` (optional): Message ID for pagination

**Response (200 OK)**:
```json
{
  "messages": [
    {
      "id": 1,
      "sender_id": 2,
      "receiver_id": 4,
      "conversation_id": 1,
      "text_content": "Is this still available?",
      "timestamp": "2026-07-02T08:00:00Z",
      "sender": {
        "id": 2,
        "username": "customer1",
        "avatar": "..."
      }
    },
    {
      "id": 2,
      "sender_id": 4,
      "receiver_id": 2,
      "conversation_id": 1,
      "text_content": "Yes, still available",
      "timestamp": "2026-07-02T08:05:00Z",
      "sender": {
        "id": 4,
        "username": "seller1",
        "avatar": "..."
      }
    }
  ],
  "has_more": false
}
```

#### 4.8.2 Send Message (HTTP)
**Endpoint**: `POST /api/messages`

**Authentication**: Required

**Request Body**:
```json
{
  "conversation_id": 1,
  "text_content": "What's the best price?"
}
```

**Response (201 Created)**:
```json
{
  "message": "Message sent",
  "data": {
    "id": 3,
    "sender_id": 2,
    "conversation_id": 1,
    "text_content": "What's the best price?",
    "timestamp": "2026-07-02T08:10:00Z"
  }
}
```

**Note**: In production, Socket.io is used for real-time message delivery.

### 4.9 Payment API

**Base Path**: `/api/payment` or `/api/payments`

#### 4.9.1 Create Payment URL
**Endpoint**: `POST /api/payment/create-payment-url`

**Authentication**: Required

**Request Body**:
```json
{
  "order_id": 1,
  "amount": 18000000,
  "order_description": "iPhone 13 Pro purchase",
  "return_url": "http://localhost:3000/payment/result"
}
```

**Response (200 OK)**:
```json
{
  "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=1800000000&vnp_TxnRef=ORD001...",
  "order_id": 1
}
```

**VNPay Parameters**:
- Amount is in VND, multiplied by 100 (e.g., 18,000,000 → 1,800,000,000)
- HMAC-SHA512 signature for security
- Transaction reference (order_id)

#### 4.9.2 VNPay Return URL (Callback)
**Endpoint**: `GET /api/payment/vnpay-return`

**Authentication**: None (VNPay redirect)

**Query Parameters** (from VNPay):
- `vnp_TxnRef`: Transaction reference (order_id)
- `vnp_Amount`: Payment amount
- `vnp_ResponseCode`: Payment result code (00 = success)
- `vnp_SecureHash`: Signature for verification

**Response**: HTTP redirect to frontend with result

**Backend Logic**:
1. Verify HMAC signature
2. Check response code
3. Update order status in database
4. Redirect to success/failure page

#### 4.9.3 Payment Webhook
**Endpoint**: `POST /api/orders/sepay-webhook`

**Authentication**: None (webhook from payment gateway)

**Request Body** (from SePay):
```json
{
  "transaction_id": "TXN123456",
  "order_id": "ORD001",
  "amount": 18000000,
  "status": "success"
}
```

**Response (200 OK)**:
```json
{
  "message": "Webhook processed"
}
```

### 4.10 AI Chatbot API

**Base Path**: `/api/ai`

#### 4.10.1 Chat with AI
**Endpoint**: `POST /api/ai/chat`

**Authentication**: Optional (better responses with auth)

**Request Body**:
```json
{
  "message": "What laptops do you have under 20 million VND?"
}
```

**Response (200 OK)**:
```json
{
  "response": "We have several laptops under 20 million VND including: 1. Dell Inspiron 15 - 18 million VND...",
  "suggestions": [
    "Show me Dell laptops",
    "What's the warranty policy?"
  ]
}
```

**Integration**: Google Generative AI (Gemini)

### 4.11 System API

**Base Path**: `/api`

#### 4.11.1 Upload Images
**Endpoint**: `POST /api/upload-images`

**Authentication**: Required

**Request Body**:
```json
{
  "images": [
    {
      "data": "data:image/png;base64,iVBORw0KGgoAAAANS...",
      "filename": "product1.png"
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "urls": [
    "http://localhost:5000/uploads/1719936000000_abc123.png"
  ]
}
```

**Constraints**:
- Maximum 50MB per request
- Supported formats: JPEG, PNG, GIF
- Base64 encoding required

#### 4.11.2 Get Notifications
**Endpoint**: `GET /api/notifications`

**Authentication**: Required

**Response (200 OK)**:
```json
{
  "notifications": [
    {
      "id": "1",
      "title": "Welcome to TechCycle",
      "message": "Platform for buying second-hand devices...",
      "sender": "System",
      "createdAt": "2026-07-01T00:00:00Z"
    }
  ]
}
```

**Note**: Currently in-memory storage, lost on restart

#### 4.11.3 Submit Complaint
**Endpoint**: `POST /api/complaints`

**Authentication**: Required

**Request Body**:
```json
{
  "content": "Product description was misleading"
}
```

**Response (201 Created)**:
```json
{
  "message": "Complaint submitted successfully",
  "complaint": {
    "id": "123456789",
    "userId": 2,
    "content": "Product description was misleading",
    "status": "pending",
    "createdAt": "2026-07-02T09:00:00Z"
  }
}
```

### 4.12 WebSocket Events (Socket.io)

**Connection**: `ws://localhost:5000`

**Authentication**: JWT token in connection handshake

#### 4.12.1 Join Conversation Room
**Event**: `join_conversation`

**Payload**:
```json
{
  "conversationId": 1
}
```

#### 4.12.2 Send Message
**Event**: `new_message`

**Payload**:
```json
{
  "conversationId": 1,
  "text": "Hello, is this available?",
  "senderId": 2,
  "receiverId": 4
}
```

#### 4.12.3 Receive Message
**Event**: `message_received`

**Payload**:
```json
{
  "id": 123,
  "conversationId": 1,
  "senderId": 4,
  "text": "Yes, still available!",
  "timestamp": "2026-07-02T09:05:00Z",
  "sender": {
    "username": "seller1",
    "avatar": "..."
  }
}
```

#### 4.12.4 Typing Indicator
**Event**: `typing`

**Payload**:
```json
{
  "conversationId": 1,
  "userId": 2,
  "username": "customer1"
}
```

---

**Next Section**: [Security & Infrastructure](./SDS_Section5_Security.md)
