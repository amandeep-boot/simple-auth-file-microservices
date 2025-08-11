# Architecture Documentation

## System Overview

This project implements a microservices architecture with two independent Node.js services that communicate via HTTP APIs. The system provides user authentication and secure file storage capabilities.

## High-Level Architecture

```
┌─────────────────┐    HTTP/JWT     ┌─────────────────┐
│                 │ ──────────────► │                 │
│   Auth Service  │                 │  File Service   │
│   (Port 3001)   │ ◄────────────── │   (Port 3002)   │
│                 │   Token Validation│                 │
└─────────────────┘                 └─────────────────┘
         │                                   │
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│   MongoDB       │                 │   MongoDB       │
│   (Users)       │                 │ (File Metadata) │
└─────────────────┘                 └─────────────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │   AWS S3        │
                                    │ (File Storage)  │
                                    └─────────────────┘
```

## Component Details

### 1. Auth Service (Port 3001)

**Purpose:** User authentication and JWT token management

**Responsibilities:**
- User registration with email validation
- Password hashing using bcrypt
- JWT token generation and validation
- User session management

**Key Components:**
- `src/routes/auth.js` - Authentication endpoints
- `src/models/User.js` - User data model
- `src/middleware/validation.js` - Input validation
- `src/config/jwt.js` - JWT configuration

**Database Schema:**
```javascript
User {
  _id: ObjectId,
  email: String (unique),
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date
}
```

**API Endpoints:**
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate user and return JWT
- `GET /auth/validate` - Validate JWT token

### 2. File Service (Port 3002)

**Purpose:** File upload, storage, and retrieval with S3 integration

**Responsibilities:**
- Raw file upload handling (max 50MB)
- AWS S3 file storage
- File metadata storage in MongoDB
- JWT authentication via Auth Service
- Presigned URL generation for downloads
- User file isolation

**Key Components:**
- `src/routes/files.js` - File management endpoints
- `src/models/File.js` - File metadata model
- `src/middleware/auth.js` - JWT validation middleware
- `src/config/aws.js` - AWS S3 configuration

**Database Schema:**
```javascript
File {
  _id: ObjectId,
  filename: String,
  originalName: String,
  size: Number (max 50MB),
  userId: ObjectId (ref: User),
  s3Key: String (unique),
  contentType: String,
  createdAt: Date,
  updatedAt: Date
}
```

**API Endpoints:**
- `POST /api/upload` - Upload file to S3 and save metadata
- `GET /api/file/:id` - Get presigned download URL
- `GET /api/files` - List user's files

## Data Flow

### User Registration & Login
```
Client → Auth Service → MongoDB
  1. POST /auth/register with email/password
  2. Hash password with bcrypt
  3. Store user in MongoDB
  4. Return success response

Client → Auth Service → MongoDB
  1. POST /auth/login with credentials
  2. Validate password against hash
  3. Generate JWT token
  4. Return token to client
```

### File Upload Process
```
Client → File Service → Auth Service → AWS S3 → MongoDB
  1. POST /api/upload with JWT + file data
  2. Validate JWT with Auth Service
  3. Check file size (≤ 50MB)
  4. Generate unique S3 key
  5. Upload file to S3 bucket
  6. Save metadata to MongoDB
  7. Return file info to client
```

### File Download Process
```
Client → File Service → Auth Service → MongoDB → AWS S3
  1. GET /api/file/:id with JWT
  2. Validate JWT with Auth Service
  3. Find file metadata in MongoDB
  4. Verify user owns the file
  5. Generate presigned S3 URL (1-hour expiry)
  6. Return download URL to client
```

## Security Architecture

### Authentication Flow
1. **User Registration:** Passwords hashed with bcrypt (salt rounds: 12)
2. **JWT Tokens:** HMAC-signed with secret key, include userId
3. **Token Validation:** File Service validates tokens via Auth Service HTTP call
4. **File Access Control:** Users can only access their own files

### File Security
- **Upload Validation:** File size limits, content type checking
- **S3 Storage:** Files stored with unique keys including userId
- **Download Security:** Presigned URLs with 1-hour expiration
- **User Isolation:** Database queries filtered by userId

## Error Handling Strategy

### HTTP Status Codes
- **400** - Bad Request (validation errors, missing data)
- **401** - Unauthorized (missing/invalid JWT)
- **403** - Forbidden (accessing other user's files)
- **404** - Not Found (file doesn't exist)
- **413** - Payload Too Large (file > 50MB)
- **500** - Internal Server Error (system failures)

### Error Response Format
```javascript
{
  "error": "Short error description",
  "message": "Detailed user-friendly message"
}
```

## Scalability Considerations

### Current Architecture Benefits
- **Microservices:** Independent scaling of auth vs file operations
- **Stateless Services:** JWT tokens eliminate session storage needs
- **Cloud Storage:** S3 handles file storage scaling automatically
- **Database Indexing:** Optimized queries with userId indexes

### Future Enhancements
- **Load Balancing:** Multiple service instances behind load balancer
- **Caching:** Redis for JWT validation caching
- **CDN Integration:** CloudFront for faster file downloads
- **Database Sharding:** Horizontal MongoDB scaling by userId

## Technology Stack

### Backend Services
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt

### Data Storage
- **Database:** MongoDB with Mongoose ODM
- **File Storage:** AWS S3 with AWS SDK v3
- **Metadata:** MongoDB collections (users, files)

### Development Tools
- **Environment:** dotenv for configuration
- **Logging:** Morgan for HTTP request logging
- **CORS:** Cross-origin resource sharing support
- **Validation:** Express middleware for input validation

## Configuration Management

### Environment Variables
**Auth Service:**
- `PORT` - Service port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT signing

**File Service:**
- `PORT` - Service port (default: 3002)
- `MONGODB_URI` - MongoDB connection string
- `AUTH_SERVICE_URL` - Auth service endpoint
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `AWS_REGION` - AWS region
- `S3_BUCKET_NAME` - S3 bucket name

## Monitoring & Logging

### Current Logging
- **HTTP Requests:** Morgan middleware logs all requests
- **File Operations:** Console logging for uploads/downloads
- **Error Tracking:** Detailed error logging with stack traces
- **AWS Operations:** S3 operation logging

### Recommended Monitoring
- **Health Checks:** `/health` endpoints for service monitoring
- **Metrics:** Request counts, response times, error rates
- **Alerts:** Failed uploads, authentication errors, S3 failures
- **Performance:** Database query times, S3 upload speeds