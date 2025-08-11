import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import fetch from 'node-fetch';
import File from '../models/File.js';
import { s3Client, BUCKET_NAME, generatePresignedUrl } from '../config/aws.js';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Upload file endpoint
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    // Check if file data exists
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({ 
        error: 'No file data provided',
        message: 'Please include file data in request body'
      });
    }

    // Get file information from headers
    const originalName = req.headers['x-filename'] || 'unknown-file';
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    
    // Check file size (50MB limit)
    const fileSize = Buffer.byteLength(req.body);
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    
    if (fileSize > maxSize) {
      return res.status(413).json({ 
        error: 'File too large',
        message: 'Maximum file size is 50MB',
        receivedSize: `${Math.round(fileSize / 1024 / 1024)}MB`
      });
    }

    // Generate unique S3 key
    const fileExtension = originalName.includes('.') ? 
      originalName.split('.').pop() : 'bin';
    const uniqueId = uuidv4();
    const s3Key = `uploads/${req.userId}/${uniqueId}.${fileExtension}`;

    // Upload to S3
    const uploadParams = {
      Bucket: BUCKET_NAME(),
      Key: s3Key,
      Body: req.body,
      ContentType: contentType,
      Metadata: {
        userId: req.userId,
        originalName: originalName,
        uploadedAt: new Date().toISOString()
      }
    };

    console.log(`Uploading file to S3: ${s3Key} (${fileSize} bytes)`);
    const command = new PutObjectCommand(uploadParams);
    const s3Result = await s3Client().send(command);

    // Save file metadata to MongoDB
    const file = new File({
      filename: `${uniqueId}-${originalName}`,
      originalName,
      size: fileSize,
      userId: req.userId,
      s3Key,
      contentType
    });

    await file.save();

    console.log(`File uploaded successfully: ${file._id}`);

    res.status(201).json({
      message: 'File uploaded successfully',
      fileId: file._id,
      filename: file.filename,
      originalName: file.originalName,
      size: fileSize,
      contentType,
      uploadedAt: file.createdAt
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Handle specific AWS errors
    if (error.code === 'NoSuchBucket') {
      return res.status(500).json({ 
        error: 'S3 bucket not found',
        message: 'Please check S3 configuration'
      });
    }
    
    res.status(500).json({ 
      error: 'File upload failed',
      message: 'Please try again later'
    });
  }
});

// Get presigned download URL
router.get('/file/:id', authenticateToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ 
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Check if user owns the file
    if (file.userId.toString() !== req.userId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only access your own files'
      });
    }

    // Generate presigned URL (expires in 1 hour)
    const downloadUrl = await generatePresignedUrl(file.s3Key, 3600);

    console.log(`Generated download URL for file: ${file._id}`);

    res.json({
      downloadUrl,
      filename: file.originalName,
      size: file.size,
      contentType: file.contentType,
      expiresIn: '1 hour'
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Failed to generate download URL',
      message: 'Please try again later'
    });
  }
});

// List user's files
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const files = await File.find({ userId: req.userId })
      .select('_id filename originalName size contentType createdAt')
      .sort({ createdAt: -1 });

    res.json({ 
      files,
      count: files.length 
    });
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve files',
      message: 'Please try again later'
    });
  }
});

// Get current user profile (bonus feature)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Call Auth Service to get user details
    const response = await fetch(`${process.env.AUTH_SERVICE_URL}/auth/validate`, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });

    if (!response.ok) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Please login again to get a new token'
      });
    }

    const data = await response.json();
    
    // Get user's file statistics
    const fileCount = await File.countDocuments({ userId: req.userId });
    const totalSize = await File.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);

    console.log(`User profile requested: ${req.userId}`);

    res.json({
      user: {
        id: data.data.user.id,
        email: data.data.user.email
      },
      fileStats: {
        totalFiles: fileCount,
        totalSize: totalSize[0]?.totalSize || 0,
        totalSizeMB: Math.round((totalSize[0]?.totalSize || 0) / 1024 / 1024 * 100) / 100
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve profile',
      message: 'Please try again later'
    });
  }
});

export default router;
