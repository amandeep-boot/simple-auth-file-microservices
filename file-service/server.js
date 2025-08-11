import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables FIRST
const result = dotenv.config({ path: resolve(__dirname, '.env') });
console.log('Dotenv result:', result);
console.log('Environment loaded:', {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? '****' : undefined,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? '****' : undefined,
    AWS_REGION: process.env.AWS_REGION,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME
});

// Import other modules AFTER environment variables are loaded
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import fileRoutes from './src/routes/files.js';
import { verifyS3Config } from './src/config/aws.js';

const app = express();

// Verify S3 configuration after env vars are loaded
try {
  await verifyS3Config();
  console.log('✅ AWS S3 configuration verified successfully');
} catch (error) {
  console.error('❌ Failed to verify S3 configuration:', error.message);
  process.exit(1);
}
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(morgan('combined')); // Request logging

// Set payload limits for file uploads (50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ limit: '50mb', type: '*/*' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fileservice', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB (File Service)');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

// Routes
app.use('/api', fileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'File Service is running',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`File Service running on port ${PORT}`);
});
