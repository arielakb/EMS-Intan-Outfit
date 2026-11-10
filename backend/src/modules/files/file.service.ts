import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';
import prisma from '../../shared/database/prisma';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { FileCategory } from '@prisma/client';

export class FileService {
  async saveFile(file: Express.Multer.File, uploadedBy: string, category: string) {
    return prisma.file.create({
      data: {
        uploadedBy,
        originalName: file.originalname,
        storageKey: file.filename,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        fileCategory: category as FileCategory,
      },
    });
  }

  async getFile(id: string, requestingUserId: string, requestingRole: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundError('File');

    // Check if file exists on disk
    const filePath = path.join(env.UPLOAD_DIR, file.storageKey);
    if (!fs.existsSync(filePath)) throw new NotFoundError('File');

    return { file, filePath };
  }

  async deleteFile(id: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundError('File');

    const filePath = path.join(env.UPLOAD_DIR, file.storageKey);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return prisma.file.delete({ where: { id } });
  }
}

export const fileService = new FileService();

