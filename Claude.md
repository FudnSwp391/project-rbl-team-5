# Enterprise Backend Architecture Manifesto & AI Coding Standards (claude.md / .cursorrules)

Tài liệu này quy định toàn bộ tiêu chuẩn kiến trúc, kỷ luật lập trình và nguyên tắc tối ưu hóa hạ tầng áp dụng cho hệ thống Backend Enterprise. Tất cả các mô-đun mã nguồn sinh bởi AI hoặc do kỹ sư phát triển bắt buộc phải tuân thủ nghiêm ngặt 100% các quy tắc dưới đây.

---

## 1. Kiến Trúc Phân Lớp & Tổ Chức Mã Nguồn (Layered Architecture)
* **Tách biệt Trách nhiệm (Separation of Concerns):** Hệ thống được thiết kế theo mô hình phân lớp cốt lõi: Controller/Routing, Service (Business Logic), Repository/DataAccess, và DTO (Data Transfer Object).
* **Luồng Phụ thuộc Một chiều:** Tầng ngoài chỉ được phép gọi tầng ngay dưới nó (Controller -> Service -> Repository). Nghiêm cấm vòng lặp phụ thuộc (Circular Dependency) hoặc gọi nhảy tầng (Controller trực tiếp chọc xuống Repository).
* **Isolate Domain Logic:** Tầng Service phải hoàn toàn thuần khiết, độc lập với các giao thức HTTP truyền thông hoặc cấu trúc lưu trữ vật lý của Database.

## 2. Tiêu Chuẩn REST API Thiết Kế (REST API Standards)
* **Tính Đồng nhất (Uniform Interface):** Sử dụng danh từ số nhiều cho URIs (e.g., `/api/v1/resources`, `/api/v1/users`). Sử dụng đúng các HTTP Methods (`GET` để đọc, `POST` để tạo, `PUT` để cập nhật toàn bộ, `PATCH` để cập nhật một phần, `DELETE` để xóa).
* **Mã Trạng thái Chuẩn (HTTP Status Codes):**
  * `200 OK` cho truy vấn thành công.
  * `201 Created` cho tạo mới thành công.
  * `400 Bad Request` cho lỗi dữ liệu đầu vào.
  * `401 Unauthorized` cho thiếu hoặc sai token xác thực.
  * `403 Forbidden` cho lỗi phân quyền hợp lệ nhưng không có quyền truy cập tài nguyên.
  * `404 Not Found` cho tài nguyên không tồn tại.
  * `409 Conflict` cho lỗi vi phạm ràng buộc dữ liệu nghiệp vụ.
* **Cấu trúc Response Đồng nhất:** Mọi phản hồi lỗi phải tuân theo cấu trúc JSON chuẩn chứa `timestamp`, `status`, `error`, `message`, và `traceId`.

## 3. Kiểm Tra Dữ Liệu Đầu Vào (Request Validation)
* **Chặn Lỗi Sớm (Fail-Fast Boundary):** Tất cả các Request Payload (`RequestBody`, `PathVariable`, `RequestParam`) phải được kiểm tra tính hợp lệ ngay tại tầng Controller trước khi chạm vào tầng Service.
* **Type-Safe Validation:**
  * Trong Hệ sinh thái Java / Spring Boot: Sử dụng các JSR-380 Validation Annotations (`@NotNull`, `@NotBlank`, `@Size`, `@Min`, `@Email`) kết hợp với `@Valid` hoặc `@Validated`.
  * Trong Hệ sinh thái Node.js / NestJS: Sử dụng các validation schema mạnh mẽ như `Zod`, `Joi` hoặc `class-validator` kết hợp với Pipes/Middleware tương ứng.

## 4. Quản Lý Ngoại Lệ Toàn Cục (Global Exception Handling)
* **Tập Trung Hóa (Centralization):** Sử dụng các cơ chế quản lý ngoại lệ tập trung (`@ControllerAdvice` / `@ExceptionHandler` trong Spring Boot, hoặc Exception Filters trong NestJS) để bắt toàn bộ runtime exceptions.
* **Tuyệt đối Không Nuốt Lỗi (No Silent Catches):** Nghiêm cấm việc bọc `try-catch` đơn thuần rồi bỏ trống hoặc chỉ in log ra console mà không ném lại hoặc xử lý dứt điểm.
* **Bảo Mật Thông Tin Lỗi:** Không bao giờ trả về toàn bộ Stack Trace hoặc cấu trúc câu lệnh SQL thô về phía Client trên môi trường Production để tránh rò rỉ lỗ hổng bảo mật.

## 5. Quy Định Về DTO (Data Transfer Object)
* **Tách Biệt Payload:** Không bao giờ sử dụng trực tiếp các Database Entities làm đối tượng nhận dữ liệu từ Request hoặc trả về trong Response API.
* **Kiểu Dữ Liệu Tĩnh:** Mọi DTO phải định nghĩa rõ ràng kiểu dữ liệu của từng trường (Strongly Typed). Khuyến khích sử dụng Java Record (Java 16+) hoặc các TypeScript Interfaces/Classes cố định.
* **Mapping Kỷ Luật:** Việc chuyển đổi giữa Entity và DTO phải diễn ra rõ ràng thông qua các thư viện mapper hiệu năng cao (như MapStruct) hoặc viết hàm biến đổi tường minh, tránh lạm dụng Reflection chậm chạp khi chạy.

## 6. Thiết Kế Cơ Sở Dữ Liệu Chuẩn (Database Normalization & Integrity)
* **Ràng Buộc Toàn Vẹn:** Luôn định nghĩa rõ ràng các khóa chính (Primary Key), khóa ngoại (Foreign Key), ràng buộc duy nhất (Unique Constraints), và ràng buộc kiểm tra (Check Constraints) trực tiếp dưới Database Engine.
* **Chuẩn Hóa Dữ Liệu:** Đảm bảo cấu trúc bảng đạt tối thiểu chuẩn 3NF đối với các tác vụ giao dịch lõi (OLTP) để tránh trùng lặp dữ liệu và bất thường khi cập nhật.

## 7. Triệt Tiêu Vấn Đề Truy Vấn N+1 (N+1 Query Prevention)
* **Eager Loading Kỷ Luật:** Khi truy xuất một thực thể có quan hệ với các thực thể khác, mặc định ORM phải cấu hình `Lazy Loading`. Tuy nhiên, tại các hàm tìm kiếm hoặc lấy chi tiết, bắt buộc phải sử dụng `JOIN FETCH` (Java JPA) hoặc `include`/`join` tường minh (Prisma/TypeORM) để gộp lệnh, triệt tiêu hoàn toàn lỗi N+1 Queries.
* **Đo Lường & Giám Sát:** Luôn bật chế độ hiển thị SQL thô trên môi trường Development để theo dõi số lượng câu lệnh thực thi xuống Database trên mỗi Request.

## 8. Quản Lý Phụ Thuộc (Dependency Inversion Principle)
* **Lập Trình Hướng Giao Diện:** Tầng Controller phụ thuộc vào Interface của tầng Service, tầng Service phụ thuộc vào Interface của tầng Repository. Không phụ thuộc trực tiếp vào các class triển khai cụ thể (Concrete Classes).
* **Constructor Injection:** Luôn ưu tiên cơ chế Inject phụ thuộc thông qua hàm khởi tạo (Constructor). Cấm sử dụng Field Injection trực tiếp (ví dụ: dùng `@Autowired` lên biến trong Spring Boot) để đảm bảo code dễ dàng Unit Test độc lập.

## 9. Cô Lập Logic Nghiệp Vụ (Business Logic Isolation)
* **Pure Service Layer:** Tầng Service không được chứa bất kỳ mã nguồn nào phụ thuộc vào các thư viện giao diện hoặc xử lý luồng mạng ngoại lai. 
* **State Mutability:** Mọi thay đổi trạng thái của dữ liệu phải được xác thực chặt chẽ qua các quy tắc nghiệp vụ (Business Rules) quy định trong Service trước khi thực hiện lưu trữ xuống DB.

## 10. Nguyên Tắc Thiết Kế Mã Nguồn Sạch (Clean Code Standards)
* **Kích Thước Hàm Tiêu Chuẩn:** Mỗi hàm/method chỉ nên làm một việc duy nhất (Single Responsibility Principle) và không nên dài quá 50 dòng code.
* **Đặt Tên Có Ý Nghĩa:** Tên hàm, tên biến phải thể hiện rõ mục đích, sử dụng tiếng Anh chuẩn mực ngành phần mềm (e.g., `calculateLoyaltyPoints` thay vì `calcPts`).

## 11. Quản Lý Tài Nguyên Hệ Thống (Resource Management)
* **Giải Phóng Bộ Nhớ:** Mọi tài nguyên mạng, luồng đọc/ghi file, kết nối I/O bắt buộc phải được đóng dứt điểm sau khi sử dụng bằng cấu hình `try-with-resources` (Java) hoặc các khối block giải phóng tự động.

---

## 12. Asynchronous Processing & Background Tasks
* **Infrastructure Pragmatism:** Avoid heavy message brokers (Kafka/RabbitMQ) unless cross-service event streaming at massive scale is strictly required. 
* **Database-as-a-Queue (SQL Server Hint):** For internal background jobs, implement Database-as-a-Queue explicitly using `WITH (UPDLOCK, READPAST)` (or `LockModeType.PESSIMISTIC_WRITE` with `skip locked` in JPA) to prevent deadlocks and eliminate DB I/O contention among concurrent workers.
* **Redis Streams:** If high-throughput async processing is required and Redis is present, default to Redis Streams with Consumer Groups over standard lists.
* **Zero API Blocking:** The primary API execution flow must NEVER wait for external I/O events. Use the Transactional Outbox pattern to persist events atomically if guaranteed delivery is needed.

## 13. Security & Access Control (Hybrid Model)
* **Boundary RBAC:** Implement Role-Based Access Control (RBAC) at the outermost routing/controller layer (via Guards/Middleware) for immediate, low-cost request rejection.
* **Core ABAC:** Implement Attribute-Based Access Control (ABAC) deeply within the Service layer to verify data ownership and state-driven policies (e.g., validating `userId` against `resourceOwnerId`). 
* **Strict Enforcement:** Always throw clear `403 Forbidden` / `AccessDeniedException` errors when ABAC policies are violated. NEVER expose internal data states during permission failures.

## 14. Caching & Invalidation Strategy
* **Default Pattern:** Apply the **Cache-Aside** pattern for read-heavy operations to optimize memory and ensure fallback availability.
* **Event-Driven Invalidation:** Cache invalidation MUST be strictly decoupled from the primary request thread. NEVER generate inline cache deletion commands (e.g., `redis.del()`) inside core Services.
* **Eventual Consistency:** Enforce the **Transactional Outbox** pattern. The primary API must only mutate the database and persist an invalidation event atomically. Cache clearing must be assumed to be handled asynchronously by background workers/CDC.

## 15. Logging & Observability (Structured & Traceable)
* **JSON Structured Logging ONLY:** NEVER use plain text, string-concatenation logging. All logs must be structured and output in strict JSON format.
* **Mandatory Distributed Tracing:** Every generated log entry MUST be designed to automatically include a `traceId` or `correlationId` via MDC (Mapped Diagnostic Context) in Java or AsyncLocalStorage in Node.js.
* **Proactive Execution Logging:** Automatically inject strategic logging statements at critical checkpoints of the primary execution flow.
* **Error Payload Standard:** Exception/Catch blocks MUST trigger `logger.error` containing a comprehensive JSON payload (including the exact input data, request body, or parameters that triggered the failure) alongside a concise root cause explanation for centralized tracking systems (ELK/Datadog).

## 16. Configuration & Secrets Management (Type-Safe & Fail-Fast)
* **Strict Centralization:** NEVER inject raw environment variables (e.g., `process.env.VAR` or `@Value("${var}")`) directly into Business Logic/Service layers. 
* **Type-Safe Binding:** All configurations must be loaded into strongly-typed, dedicated classes or objects (e.g., `@ConfigurationProperties` with records in Spring Boot, or validated ConfigServices using Zod/class-validator in Node.js).
* **Fail-Fast on Startup:** The application MUST crash immediately during the startup phase if required environment variables are missing or incorrectly formatted. Implement strict validation annotations (e.g., `@NotBlank`, `@Min`) or schema validations directly on the configuration boundary. No manual type casting from strings.

## 17. Database Schema & Migration Management
* **Zero Auto-Sync:** NEVER use or recommend ORM auto-synchronization features in production-grade code (e.g., `spring.jpa.hibernate.ddl-auto=update/create`, `prisma db push`, `synchronize: true`).
* **Strict Versioned Migrations:** All database schema changes (DDL) MUST be managed via explicit, version-controlled migration scripts (e.g., Flyway/Liquibase for Java, Prisma Migrations/TypeORM Migrations for Node.js).
* **Mandatory Output:** Whenever generating or updating an Entity/Model class, you MUST concurrently output the raw SQL migration script or the explicit `up()`/`down()` migration code required to safely apply the structural changes to the database.

## 18. Resilience & External API Integrations
* **Zero Raw Calls:** NEVER implement raw HTTP/RPC calls with simple `try-catch` blocks. Unbounded timeouts, missing connection/read timeouts, or blind infinite retries are strictly prohibited to prevent thread pool exhaustion.
* **Mandatory Resilience Patterns:** All external service integrations MUST be wrapped in sophisticated fault-tolerance mechanisms (e.g., `Resilience4j` in Java Spring Boot, or `opossum`/`axios-retry` in Node.js).
* **Circuit Breaker & Backoff:** Enforce Circuit Breakers for all external communications. Implement Retry logic ONLY for transient network faults (e.g., 503, 504, network glitches) using **Exponential Backoff with Jitter**. NEVER retry client/logic errors (e.g., 400, 403).
* **Graceful Degradation (Strict Fallback):** A structured Fallback mechanism is MANDATORY. If an external secondary service fails and the Circuit Breaker opens, NEVER break the primary execution flow or throw a 500 error to the client. 
* **Fallback Execution:** Log the failure comprehensively (`logger.error` with `traceId`), return a safe default/cache, or push the failed secondary task into a Background Queue (Eventual Consistency) while returning a successful response to the user for the primary transaction.

## 19. Bulk Processing & Memory Management (Large Datasets)
* **Zero OOM Tolerance:** NEVER load entire, unpaginated tables into application memory (e.g., unbounded `findAll()`).
* **No N+1 Updates:** NEVER use `for/foreach` loops to execute individual `save()` or `update()` queries.
* **Strategy 1: Database-Level Bulk Operations:** For simple state changes or math operations, STRICTLY push the computation to the DB using Bulk Updates or heavily optimized Raw SQL (`UPDATE ... SET ... WHERE ...`). 
* **Strategy 2: Keyset Pagination (Chunking):** If complex backend business logic/external API calls are required per record, process the data in explicit chunks (100-500 records). MANDATE the use of **Keyset Pagination** (`WHERE id > last_id`) over standard `OFFSET/LIMIT` to prevent deep-pagination performance degradation. Commit transactions per chunk.
* **Strategy 3: Cursor-Based Streaming:** For massive data exports (CSV/Excel) or ETL processes requiring no intermediate state mutation, STRICTLY utilize Database Cursors (e.g., `Stream<Entity>` in Java with `@Transactional(readOnly=true)`, or cursor streams in Node.js). Ensure objects are garbage-collected immediately to prevent memory leaks.

## 20. API Versioning & Backward Compatibility
* **Zero Implicit Breaking Changes:** NEVER modify existing API endpoints in a way that breaks legacy clients. Strictly PROHIBITED: deleting existing response fields, mutating data types (e.g., int to string), or adding new REQUIRED parameters to existing request payloads.
* **Evolutionary Design (Additions Only):** When enhancing APIs, default to additive changes. If a field is replaced, MUST mark the old field with `@Deprecated` in the DTO, compute its fallback value to keep legacy clients alive, and append the new field.
* **Explicit Versioning:** Only implement Breaking Changes when explicitly authorized. If authorized, apply **URI Versioning** (e.g., `/api/v2/...`) or **Header Versioning**. Completely isolate the DTO layer for the new version while safely reusing underlying Core Domain/Infrastructure logics. NEVER overwrite the existing `v1` Controller/Service.

## 21. Authentication & Token Lifecycle (Strict Security)
* **Zero LocalStorage/XSS Vulnerability:** NEVER return Access or Refresh tokens via JSON response bodies intended for client-side `localStorage` or `sessionStorage`.
* **Stateful/Hybrid JWT Architecture:** Enforce short-lived Access Tokens (e.g., 15 mins) and long-lived Refresh Tokens. Refresh Tokens MUST be stateful and persisted in the Database or Redis for active revocation tracking.
* **Secure Cookie Delivery ONLY:** All tokens must be issued and delivered to the client exclusively via backend-configured `Set-Cookie` headers enforcing strict security flags: `HttpOnly`, `Secure` (HTTPS), and `SameSite=Strict` (or `Lax`).
* **Active Revocation (Redis Blacklist):** Implement authentic server-side logouts. Upon a user logout or account ban, immediately delete the Refresh Token from the persistent store AND push the active Access Token's ID (JTI) into a Redis Blacklist with a TTL matching its exact remaining expiration time.

## 22. File Upload Architecture (Direct-to-Cloud)
* **Zero Backend Bottleneck:** NEVER implement traditional `multipart/form-data` file uploads that buffer through the Backend Router/Controller to RAM or local disk.
* **Mandatory Pre-signed URLs:** STRICTLY enforce a Direct-to-Cloud (Bypass Backend) architecture for file storage (S3, MinIO, GCS).
* **Execution Flow:** 1. Backend authorizes the request, validates metadata, and issues a short-lived (e.g., 5 mins) Pre-signed PUT URL.
  2. Client uploads the binary payload directly to the Cloud Provider.
  3. Backend updates the database state strictly via secure Cloud Webhook/Event notifications (preferred) or a tightly verified Client Callback.
* **Strict Bucket Privacy:** Cloud buckets MUST remain private. Unauthenticated public write access is strictly prohibited.

## 23. Search Architecture (Hybrid Full-Text Search)
* **Zero Wildcard Table Scans:** NEVER implement `LIKE '%keyword%'` queries for large, core transactional tables to prevent Full Table Scans.
* **Hybrid Architecture Enforcement:**
  * **Admin/Small Datasets:** Permitted to use Native Database indexing or Native Full-Text Search features.
  * **Core Catalog/End-User API:** STRICTLY require a Dedicated Search Engine (e.g., Elasticsearch, Typesense, Meilisearch) to handle fuzzy matching, typo-tolerance, and high-performance ranking.
* **Asynchronous Data Sync:** The primary API MUST NOT write directly to the Search Engine. Enforce the **Transactional Outbox / CDC** pattern: changes in the primary DB must trigger events that background workers consume to update the Search Index (Eventual Consistency).

## 24. Distributed Scheduling & Cron Jobs
* **Zero Blind Scheduling:** NEVER use raw `@Scheduled` (Java) or `node-cron`/`setInterval` (Node.js) in distributed/multi-replica environments without proper locking mechanisms to avoid double execution.
* **No Heavy In-App Schedulers:** Core backend API nodes must not directly execute heavy data-crunching cron tasks via in-memory execution blocks.
* **Light Tasks (Distributed Lock):** For high-frequency, lightweight tasks (e.g., cache pruning, heartbeat checks), mandate a Distributed Lock. Use **Redis-based locks** (`Redisson` for Java, `Redlock` for Node.js) if Redis is present to eliminate database I/O overhead. Fall back to **Database-backed locks** (`ShedLock` with SQL Server) only if Redis is absent.
* **Heavy/Core Business Tasks (Dedicated Scheduler):** Decouple scheduling completely from user-facing API nodes. Treat backend APIs purely as Workers. Mandate clustered schedulers: **Quartz Scheduler in Cluster Mode** (Java), **BullMQ with Redis** (Node.js), or cloud-triggered events (e.g., AWS EventBridge) invoking secure webhooks for bulk execution.

## 25. Transactions & Connection Pooling Discipline
* **No Connection Bleeding:** NEVER open database transactions (`@Transactional` or framework equivalents) across slow, non-deterministic external I/O boundaries (e.g., calling payment gateways, sending emails, heavy disk operations). Keep transaction scopes as narrow as possible.
* **Infrastructure Snapshot/Isolation Assumption:** Always generate standard read/write queries under the strict assumption that an optimized isolation level (e.g., **Read Committed Snapshot Isolation - RCSI** in SQL Server) is enabled. Default query isolation must remain `READ COMMITTED` so that reads pull data snapshots from temporary tables without blocking concurrent writes.
* **Explicit Isolation Overrides:** * *High-Risk Mutations (Payments, Financial Transactions, Multi-tenant counters):* Manually upgrade isolation levels using `@Transactional(isolation = Isolation.REPEATABLE_READ)` or leverage explicit Pessimistic Locks to eliminate race conditions.
  * *Massive Reporting Queries:* Explicitly downgrade queries using `READ_UNCOMMITTED` or `WITH (NOLOCK)` hints strictly where minor data inconsistency (dirty reads) is business-acceptable.
* **Fail-Fast Connection Pooling:** Enforce strict, aggressive connection pool configurations (e.g., HikariCP, Prisma pool). Connection timeout MUST be strictly limited to `2000ms` - `3000ms` to trigger fast failures and allow upstream Circuit Breakers to engage instantly during database exhaustion. Release connections to the pool immediately upon DB I/O completion.

## 26. SARGable Queries & Proactive Indexing
* **Strict SARGability:** NEVER write Non-SARGable queries. It is strictly PROHIBITED to wrap database columns in functions, math operations, or string concatenations on the left side of `WHERE` or `JOIN` clauses (e.g., NEVER use `WHERE YEAR(date) = 2026`, use `WHERE date >= '2026-01-01' AND date < '2027-01-01'`).
* **No DB-Level Formatting:** Rely on database collation (e.g., Case-Insensitive Collation) instead of using runtime functions like `LOWER()` or `UPPER()` on columns.
* **Proactive Indexing:** Whenever generating queries with `WHERE`, `JOIN`, or `ORDER BY` clauses, you MUST concurrently generate the corresponding `CREATE INDEX` statements (or ORM index definitions).
* **Composite Index Optimization:** When filtering by multiple columns, strictly follow the index column ordering rule: High-selectivity / Equality comparisons (`=`) MUST be placed first, followed by Range comparisons (`>`, `<`, `BETWEEN`). All generated indexes must be packaged within the required Versioned Migration scripts.

## 27. Real-Time Communication (WebSockets/SSE)
* **Zero In-Memory State:** NEVER manage WebSocket connections, sessions, or rooms using global in-memory arrays or maps that break upon horizontal scaling.
* **No Server-to-Server RPC for Real-time:** NEVER implement direct HTTP calls between backend nodes to route real-time notifications to users.
* **Mandatory Pub/Sub Backplane:** STRICTLY implement a Pub/Sub architecture (e.g., Redis Pub/Sub, Kafka) as the backplane for all real-time event broadcasting. 
* **Execution Flow:** 1. Nodes manage only their local, direct socket connections. 
  2. Nodes subscribe to a shared Redis channel. 
  3. When an event occurs, the executing node PUBLISHES the payload to Redis (never directly to a socket). 
  4. The specific node holding the active client connection consumes the event and EMITS it downstream.
* **Preferred Adapters:** Utilize `@socket.io/redis-adapter` (Node.js) or `Spring WebSocket` with `RedisMessageListenerContainer` (Java) to abstract backplane complexity.

## 28. Data Deletion & Archiving Strategy
* **Zero Soft-Delete Bloat:** NEVER implement standard Soft Delete patterns (e.g., `is_deleted` or `deleted_at` columns) on high-volume, core transactional tables to prevent index degradation and full table scans.
* **Core Data (Archiving Architecture):** For critical business entities, STRICTLY enforce an Archiving architecture. Deletion MUST be handled within a single atomic transaction:
  1. `INSERT` the exact record into a dedicated historical archive table (e.g., `User_Archive`).
  2. Physically `DELETE` the record from the primary operational table.
* **Satellite Data (Controlled Hard Delete):** For minor configurations, direct physical `DELETE` is permitted, but MUST be preceded by strict business constraint validation. If foreign references exist, immediately abort the transaction and throw a `409 Conflict` (ConflictException) with a clear error payload.

## 29. Automated Testing Strategy & Quality Assurance
* **Zero False Safety (No DB Mocking for Core):** NEVER mock the Database or Redis layer (e.g., via Mockito/Jest Mocks) when testing core transactional services, bulk updates, or lock mechanisms. 
* **No In-Memory DB Substitutes:** STRICTLY PROHIBITED to use in-memory databases (like H2 for Java or SQLite for Node.js) to simulate the production database engine. They do not accurately replicate transaction locks, deadlocks, or isolation levels.
* **Hybrid Testing Pyramid (Mandatory Enforcement):**
  * **Pure Logic (Unit Tests):** Use standard mocking (Mockito/Jest) EXCLUSIVELY for pure algorithmic logic (e.g., math formulas, data validation) with no I/O boundaries.
  * **Core Transactions (TestContainers):** Integration tests for Repositories and Transactional Services MUST utilize **TestContainers**. The test must spin up a real Dockerized Database/Redis instance, apply Versioned Migrations, execute real I/O, and assert the actual state.
  * **External Resilience (Mock Servers):** When testing external API integrations and fault tolerance (Circuit Breakers, Retries, Fallbacks), you MUST use internal HTTP mock servers (e.g., **WireMock** for Java, **nock/MSW** for Node.js) configured to inject deliberate faults (e.g., 503 errors, network timeouts) to verify the system's graceful degradation.