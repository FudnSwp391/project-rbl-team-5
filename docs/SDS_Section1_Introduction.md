# Software Design Specification (SDS)
# TechCycle Backend System

## Document Information
- **Project Name:** TechCycle
- **Version:** 1.0.0
- **Date:** July 2, 2026
- **Author:** Development Team
- **Status:** Draft

---

## Section 1: Introduction & Overview

### 1.1 Purpose
This Software Design Specification (SDS) document describes the architecture, design decisions, and technical specifications for the TechCycle Backend System. The document serves as a comprehensive reference for developers, architects, and stakeholders to understand the system's structure and implementation details.

### 1.2 Scope
TechCycle is an enterprise-grade e-commerce platform specializing in:
- **Second-hand Technology Devices** - Marketplace for buying and selling used electronics
- **Repair Booking Services** - Professional device repair scheduling and management
- **Real-time Communication** - Customer-seller messaging with AI-powered chatbot support
- **Payment Processing** - Integrated VNPay payment gateway for secure transactions

### 1.3 Business Context
The TechCycle platform addresses the growing market demand for sustainable technology consumption by providing:
- A trusted marketplace for verified second-hand devices
- Professional repair and maintenance services
- Transparent pricing and secure payment processing
- AI-assisted customer support for improved user experience

### 1.4 System Overview
The backend system is built using modern JavaScript/Node.js technology stack with a focus on:
- **Scalability** - Designed to handle increasing user load and transaction volume
- **Security** - Enterprise-grade authentication, authorization, and data protection
- **Performance** - Optimized database queries and caching strategies
- **Maintainability** - Clean architecture with separation of concerns
- **Real-time Capabilities** - WebSocket-based communication for instant messaging

### 1.5 Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | Latest LTS |
| Framework | Express.js | 4.19.2 |
| Database | Microsoft SQL Server | 2019+ |
| ORM | Sequelize | 6.37.8 |
| Authentication | JWT + bcryptjs | 9.0.2 / 2.4.3 |
| Real-time | Socket.io | 4.7.5 |
| AI Integration | Google Generative AI | 0.24.1 |
| Email Service | Nodemailer | 9.0.0 |
| Payment Gateway | VNPay | Custom Integration |

### 1.6 Key Features

#### 1.6.1 User Management
- Multi-role authentication (Admin, Customer, Technician, Seller)
- Email verification with OTP
- Profile management with avatar support
- Phone number validation for Vietnamese market

#### 1.6.2 Product Management
- Product listing with images and detailed specifications
- Category and status management
- Search and filtering capabilities
- Seller-managed inventory

#### 1.6.3 Booking System
- Repair service scheduling
- Technician assignment and availability management
- Status tracking (pending, confirmed, completed, cancelled)
- Time slot management

#### 1.6.4 Order Processing
- Shopping cart and checkout flow
- Order status tracking
- Seller order management
- Payment integration

#### 1.6.5 Messaging & Communication
- Real-time chat between customers and sellers
- Conversation management with product context
- AI-powered chatbot for customer support
- Message history and status tracking

#### 1.6.6 Payment Integration
- VNPay payment gateway integration
- Secure payment URL generation
- Payment verification and callback handling
- Transaction history tracking

### 1.7 System Constraints

#### 1.7.1 Technical Constraints
- Database: Microsoft SQL Server (legacy compatibility required)
- Geographic Focus: Vietnamese market (VND currency, Vietnamese phone format)
- File Storage: Local filesystem (uploads directory)
- In-memory Storage: Notifications, complaints, and promo codes (temporary solution)

#### 1.7.2 Business Constraints
- Payment processing through VNPay only
- Email verification required for registration
- Phone number must follow Vietnamese format (10-11 digits starting with 0)
- Maximum upload size: 50MB for images

### 1.8 Target Audience
This document is intended for:
- Backend developers implementing or maintaining the system
- System architects planning infrastructure and scalability
- QA engineers designing test strategies
- DevOps engineers configuring deployment pipelines
- Technical managers overseeing project execution

### 1.9 Document Organization
This SDS document is organized into the following sections:
1. **Introduction & Overview** (this section)
2. **System Architecture** - Layered architecture and design patterns
3. **Database Design** - Schema, relationships, and migrations
4. **API Design** - RESTful endpoints and request/response formats
5. **Security & Infrastructure** - Authentication, authorization, and deployment
6. **Appendices** - Configuration references and glossary

---

**Next Section:** [System Architecture](./SDS_Section2_Architecture.md)
