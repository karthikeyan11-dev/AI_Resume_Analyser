/**
 * File Upload Middleware
 * Handles PDF file uploads using Multer
 */

import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { FileProcessingError } from '../utils/errors';
import fs from 'fs';

// Ensure upload directory exists
const uploadDir = path.resolve(config.upload.uploadDir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  },
});

// File filter - only allow PDFs
const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new FileProcessingError(`File type ${file.mimetype} is not allowed. Only PDF files are accepted.`));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1, // Only allow one file per request
  },
});

// Single file upload middleware for resume
export const uploadResume = upload.single('resume');

// Error handler for multer errors
export const handleMulterError = (err: any, _req: any, _res: any, next: any): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new FileProcessingError(`File size exceeds maximum limit of ${config.upload.maxFileSize / (1024 * 1024)}MB`));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new FileProcessingError('Unexpected field in file upload'));
    }
    return next(new FileProcessingError(err.message));
  }
  next(err);
};

/**
 * Delete uploaded file
 */
export const deleteUploadedFile = async (filePath: string): Promise<void> => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    // Log but don't throw - file cleanup is not critical
    console.error('Failed to delete file:', filePath, error);
  }
};

/**
 * Get file path from filename
 */
export const getFilePath = (filename: string): string => {
  return path.join(uploadDir, filename);
};
