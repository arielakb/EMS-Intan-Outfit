import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

// Ensure uploads directory exists based on configured UPLOAD_DIR
const uploadsDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Strict whitelist for image uploads (Selfie & Avatar)
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

// Strict whitelist for document uploads (Medical certs, payment proofs, etc.)
const ALLOWED_DOC_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_DOC_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Safety check: ensure file extension is explicitly in allowed list
    const safeExt = [...ALLOWED_IMAGE_EXTS, '.pdf'].includes(ext) ? ext : '.bin';
    cb(null, `${uuid()}${safeExt}`);
  },
});

const imageFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_IMAGE_EXTS.includes(ext) && ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Hanya file gambar resmi (.jpg, .jpeg, .png, .webp) yang diperbolehkan', 400));
  }
};

const docFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_DOC_EXTS.includes(ext) && ALLOWED_DOC_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Format file tidak didukung. Hanya gambar dan file PDF yang diizinkan', 400));
  }
};

export const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1,
  },
});

export const uploadFile = multer({
  storage,
  fileFilter: docFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
});
