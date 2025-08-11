import { S3Client } from '@aws-sdk/client-s3';
import { GetObjectCommand, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketVersioningCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Get AWS config directly from environment variables (loaded by server.js)
const getAwsConfig = () => ({
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.S3_BUCKET_NAME || 'bucket.file.service',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Initialize S3 client with environment variables
let s3Client;
let BUCKET_NAME;

const initializeS3Client = () => {
    const config = getAwsConfig();
    
    console.log('AWS Configuration:', {
        region: config.region,
        bucketName: config.bucketName,
        accessKeyId: config.accessKeyId ? '****' : undefined
    });

    s3Client = new S3Client({
        region: config.region,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey
        }
    });

    BUCKET_NAME = config.bucketName;
    return { s3Client, BUCKET_NAME };
};

// Verify S3 configuration and create bucket if it doesn't exist
const verifyS3Config = async () => {
    try {
        // Initialize S3 client first
        const { s3Client: client, BUCKET_NAME: bucket } = initializeS3Client();
        
        const config = getAwsConfig();
        
        // Check required AWS credentials
        if (!config.accessKeyId || !config.secretAccessKey) {
            throw new Error('Missing AWS credentials. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
        }
        
        // First check if bucket exists
        const command = new HeadBucketCommand({ Bucket: bucket });
        await client.send(command);
        console.log(`✅ S3 bucket '${bucket}' exists and is accessible`);
    } catch (error) {
        console.error('❌ S3 configuration error:', error.message);
        
        const config = getAwsConfig();
        if (!config.accessKeyId || !config.secretAccessKey) {
            console.error('AWS credentials are missing. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
        } else if (error.name === 'NoSuchBucket') {
            console.error(`Bucket '${BUCKET_NAME}' does not exist. Please create it in the AWS Console.`);
        } else if (error.name === 'InvalidAccessKeyId') {
            console.error('Invalid AWS Access Key ID. Please check your AWS_ACCESS_KEY_ID.');
        } else if (error.name === 'SignatureDoesNotMatch') {
            console.error('Invalid AWS Secret Access Key. Please check your AWS_SECRET_ACCESS_KEY.');
        } else if (error.name === 'InvalidBucketName') {
            console.error('Invalid bucket name. Bucket names must be between 3 and 63 characters long and can contain only lowercase letters, numbers, dots, and hyphens.');
        } else if (error.name === 'NetworkingError') {
            console.error('Network error. Please check your internet connection.');
        } else if (error.name === 'CredentialsProviderError') {
            console.error('AWS credentials not found or invalid.');
        } else {
            console.error('Please check your AWS credentials, permissions, and network connection.');
        }
        throw error; // Re-throw to let server.js handle the exit
    }
};

/**
 * Generate a pre-signed URL for downloading a file
 */
const generatePresignedUrl = async (key, expiresIn = 3600) => {
    // Ensure S3 client is initialized
    if (!s3Client) {
        initializeS3Client();
    }
    
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
};

// Getter functions to ensure initialization
const getS3Client = () => {
    if (!s3Client) {
        initializeS3Client();
    }
    return s3Client;
};

const getBucketName = () => {
    if (!BUCKET_NAME) {
        initializeS3Client();
    }
    return BUCKET_NAME;
};

export { verifyS3Config, getS3Client as s3Client, getBucketName as BUCKET_NAME, generatePresignedUrl };
