export const config = {
    port: process.env.PORT || "3002",
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/fileservice",
    authServiceUrl: process.env.AUTH_SERVICE_URL || "http://localhost:3001",
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || "us-east-1",
        bucketName: process.env.S3_BUCKET_NAME || "bucket.file.service"
    }
};
