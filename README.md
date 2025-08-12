# Simple Auth & File Upload Microservices

Two Node.js microservices for user authentication and file management with AWS S3 integration.

## Services Overview

- **Auth Service** (Port 3001): User registration, login, JWT token management
- **File Service** (Port 3002): File upload/download with S3 storage and MongoDB metadata

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- AWS S3 bucket and credentials

### 1. Clone & Install
```bash
git clone <repository-url>
cd simple-auth-file-microservices

# Install auth service dependencies
cd auth-service
npm install

# Install file service dependencies  
cd ../file-service
npm install
```

### 2. Environment Setup

**Auth Service (.env):**
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/authservice
JWT_ACCESS_SECRET=your_super_secure_access_secret_key_here
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12
```

**File Service (.env):**
```env
PORT=3002
MONGODB_URI=mongodb://localhost:27017/fileservice
AUTH_SERVICE_URL=http://localhost:3001
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-s3-bucket-name
```

> Note: Ensure the S3 bucket exists in the specified AWS_REGION and your AWS credentials have permission for HeadBucket, PutObject, and GetObject on that bucket.

### 3. Run Services
```bash
# Terminal 1 - Auth Service
cd auth-service
npm start

# Terminal 2 - File Service  
cd file-service
npm start
```

## API Documentation

### Auth Service (http://localhost:3001)

#### Register User
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### Login User
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com", 
    "password": "password123"
  }'
```

#### Validate Token
```bash
curl -X GET http://localhost:3001/auth/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### File Service (http://localhost:3002)

#### Upload File
```bash
curl -X POST http://localhost:3002/api/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-Filename: document.pdf" \
  -H "Content-Type: application/pdf" \
  --data-binary @/path/to/your/file.pdf
```

#### Get Download URL
```bash
curl -X GET http://localhost:3002/api/file/FILE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### List User Files
```bash
curl -X GET http://localhost:3002/api/files \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get User Profile (Bonus Feature)
```bash
curl -X GET http://localhost:3002/api/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Example Workflow

1. **Register a new user:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

2. **Login to get JWT token:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

3. **Upload a file (save the returned fileId):**
```bash
curl -X POST http://localhost:3002/api/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Filename: test.txt" \
  -H "Content-Type: text/plain" \
  --data-binary @test.txt
```

4. **Get download URL:**
```bash
curl -X GET http://localhost:3002/api/file/65f1a2b3c4d5e6f7g8h9i0j1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Features

### Auth Service
- ✅ User registration with email validation
- ✅ Secure password hashing (bcrypt)
- ✅ JWT token generation and validation
- ✅ MongoDB user storage
- ✅ Input validation and error handling

### File Service  
- ✅ Raw file upload (max 50MB)
- ✅ AWS S3 file storage
- ✅ MongoDB metadata storage
- ✅ JWT authentication required
- ✅ Presigned download URLs (1-hour expiration)
- ✅ User file isolation
- ✅ File size validation
- ✅ Comprehensive error handling

## Error Codes

- **400** - Bad Request (missing data, invalid input)
- **401** - Unauthorized (missing/invalid JWT token)
- **403** - Forbidden (accessing other user's files)
- **404** - Not Found (file doesn't exist)
- **413** - Payload Too Large (file > 50MB)
- **500** - Internal Server Error

## Development

### Run with auto-reload:
```bash
# Auth service
cd auth-service && npm run dev

# File service  
cd file-service && npm run dev
```

### Project Structure
```
├── auth-service/
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── config/
│   └── server.js
├── file-service/
│   ├── src/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── config/
│   └── server.js
└── README.md
```

## Troubleshooting

### Common Issues

1. **S3 Upload Fails**
   - Verify AWS credentials in .env
   - Check S3 bucket exists and has proper permissions
   - Ensure bucket name follows AWS naming rules

2. **JWT Token Invalid**
   - Check JWT_SECRET matches between services
   - Verify token hasn't expired
   - Ensure Authorization header format: `Bearer <token>`

3. **MongoDB Connection Error**
   - Verify MongoDB is running
   - Check MONGODB_URI format
   - Ensure database permissions

4. **File Upload 413 Error**
   - File exceeds 50MB limit
   - Check Content-Length header

## License

MIT License
