# TechCycle Backend - Software Design Specification

## Document Overview

This Software Design Specification (SDS) provides comprehensive technical documentation for the TechCycle Backend System - an enterprise e-commerce platform for second-hand technology devices and repair services.

**Version**: 1.0.0  
**Date**: July 2, 2026  
**Status**: Complete

---

## Table of Contents

### [Section 1: Introduction & Overview](./SDS_Section1_Introduction.md)
- Purpose and scope of the system
- Business context and objectives
- Technology stack summary
- Key features and capabilities
- System constraints
- Target audience

**Key Topics**: System overview, features, technology stack, business requirements

---

### [Section 2: System Architecture](./SDS_Section2_Architecture.md)
- Layered architecture pattern
- Design principles and patterns
- Layer specifications (Presentation, Business Logic, Data Access)
- Middleware and authentication architecture
- Real-time communication (Socket.io)
- External integrations (AI, Email, Payment)
- Error handling strategy
- File storage and in-memory data structures

**Key Topics**: Architecture patterns, middleware, WebSocket, external APIs, design patterns

---

### [Section 3: Database Design](./SDS_Section3_Database.md)
- Entity-Relationship model
- Core table schemas (Users, Conversations, Messages, Products, Bookings, Orders)
- Database relationships and foreign keys
- Index strategy and performance optimization
- Database migration approach
- Sequelize ORM and legacy SQL patterns

**Key Topics**: Database schema, relationships, indexes, migrations, data access patterns

---

### [Section 4: API Design](./SDS_Section4_API.md)
- RESTful API standards and conventions
- Authentication API (register, login, profile)
- Product API (CRUD operations)
- Booking API (service scheduling)
- Order API (purchase transactions)
- Conversation and Message API (real-time chat)
- Payment API (VNPay integration)
- AI Chatbot API
- System utilities and file upload
- WebSocket events (Socket.io)

**Key Topics**: REST endpoints, request/response formats, API authentication, real-time messaging

---

### [Section 5: Security & Infrastructure](./SDS_Section5_Security.md)
- JWT authentication system
- Password security (bcryptjs)
- OTP verification
- Role-based and attribute-based access control
- Input validation and SQL injection prevention
- CORS and network security
- Environment variables and secret management
- Error handling and logging strategy
- Production security recommendations

**Key Topics**: Authentication, authorization, security best practices, configuration management

---

## Quick Reference

### Technology Stack
- **Runtime**: Node.js
- **Framework**: Express.js 4.19.2
- **Database**: Microsoft SQL Server with Sequelize ORM 6.37.8
- **Authentication**: JWT + bcryptjs
- **Real-time**: Socket.io 4.7.5
- **AI**: Google Generative AI (Gemini)
- **Email**: Nodemailer
- **Payment**: VNPay

### Key Endpoints
- **Auth**: `/api/auth/*` - Registration, login, profile management
- **Products**: `/api/products/*` - Product marketplace
- **Bookings**: `/api/bookings/*` - Repair service scheduling
- **Orders**: `/api/orders/*` - Purchase transactions
- **Messages**: `/api/messages/*` - Real-time chat
- **Payments**: `/api/payment/*` - VNPay integration

### Database Tables
- `users` - User accounts and roles
- `products` - Product inventory
- `bookings` - Repair service appointments
- `orders` - Purchase transactions
- `conversations` - Chat sessions
- `messages` - Chat message history

### Security Features
- JWT token authentication (7-day expiration)
- bcrypt password hashing (10 salt rounds)
- Role-based access control (Admin, Customer, Technician, Seller)
- Input validation at controller layer
- Parameterized queries (SQL injection prevention)

---

## How to Use This Documentation

### For Developers
1. Start with **Section 1** for system overview and technology stack
2. Review **Section 2** to understand the layered architecture
3. Refer to **Section 3** when working with database operations
4. Use **Section 4** as API reference for endpoint implementation
5. Follow **Section 5** for security best practices

### For Architects
- **Section 2**: System architecture and design patterns
- **Section 3**: Data modeling and relationships
- **Section 5**: Security architecture and infrastructure

### For QA Engineers
- **Section 4**: API endpoints for test case design
- **Section 5**: Security testing requirements

### For DevOps Engineers
- **Section 5**: Configuration and deployment considerations
- **Section 2**: Infrastructure requirements

---

## Document Structure

Each section is self-contained and includes:
- Clear headings and subheadings
- Code examples and snippets
- Data flow diagrams (ASCII art)
- Security considerations
- Best practices and recommendations

---

## Compliance with Enterprise Standards

This documentation follows the **Enterprise Backend Architecture Manifesto** defined in `CLAUDE.md`:

✅ **Layered Architecture** - Clear separation of Routes, Controllers, and Data Access  
✅ **REST API Standards** - Uniform interface with proper HTTP methods and status codes  
✅ **Input Validation** - Request validation at controller layer  
✅ **Global Exception Handling** - Centralized error management  
✅ **DTO Pattern** - Separation of entities and DTOs  
✅ **Database Integrity** - Foreign keys and constraints enforced  
✅ **Authentication** - JWT-based stateless authentication  
✅ **RBAC/ABAC** - Hybrid access control model  
✅ **Security** - Password hashing, SQL injection prevention, input validation  

---

## Next Steps

### Recommended Improvements
1. **Testing**: Implement unit tests and integration tests (80%+ coverage target)
2. **Logging**: Replace console.log with structured logging (Winston/Pino)
3. **Caching**: Implement Redis for OTP storage and response caching
4. **Rate Limiting**: Add API rate limiting to prevent abuse
5. **Validation**: Migrate to Zod or Joi schema validation
6. **Monitoring**: Add APM tools (Datadog, New Relic) for production monitoring
7. **Documentation**: Generate OpenAPI/Swagger specification from code

### Production Readiness Checklist
- [ ] Enable HTTPS and enforce SSL/TLS
- [ ] Configure production CORS (restrict origins)
- [ ] Implement security headers (Helmet.js)
- [ ] Set up centralized logging (ELK, CloudWatch)
- [ ] Configure database connection pooling
- [ ] Implement health check endpoints
- [ ] Set up monitoring and alerting
- [ ] Configure automated backups
- [ ] Implement rate limiting
- [ ] Review and rotate all secrets

---

## Document Maintenance

**Last Updated**: July 2, 2026  
**Review Schedule**: Quarterly or when major changes occur  
**Maintained By**: Development Team

When updating this documentation:
1. Keep sections independent and self-contained
2. Update version numbers and dates
3. Add new sections as needed
4. Maintain consistent formatting and style
5. Include practical code examples
6. Document security implications

---

## Additional Resources

- **Project Repository**: [Link to Git repo]
- **API Testing**: Use Postman collection (to be created)
- **Database Schema**: See `backend/db.js` for Sequelize models
- **Environment Setup**: See `.env.example` for required variables
- **Deployment Guide**: (To be documented in separate document)

---

**For questions or clarifications, contact the development team.**
