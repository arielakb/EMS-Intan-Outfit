import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';
import prisma from '../../shared/database/prisma';
import { NotFoundError, ForbiddenError } from '../../shared/errors/AppError';
import { FileCategory } from '@prisma/client';

export class FileService {
  private getStorageDir(): string {
    const dir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

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
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        attendanceSelfies: {
          include: {
            scheduleAssignment: { select: { employeeId: true } },
          },
        },
        employeePhotos: { select: { id: true, userId: true } },
      },
    });

    if (!file) throw new NotFoundError('File');

    // Access control: Owners have full access; employees can only view their own files (IDOR protection)
    if (requestingRole !== 'OWNER') {
      const isUploader = file.uploadedBy === requestingUserId;
      const isMyProfilePhoto = file.employeePhotos.some(e => e.userId === requestingUserId);

      // Check if file is tied to requesting employee's attendance record
      const user = await prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { employee: { select: { id: true } } },
      });
      const employeeId = user?.employee?.id;

      const isMyAttendance = employeeId
        ? file.attendanceSelfies.some(a => a.scheduleAssignment?.employeeId === employeeId)
        : false;

      if (!isUploader && !isMyProfilePhoto && !isMyAttendance) {
        throw new ForbiddenError('Anda tidak memiliki izin untuk mengakses file ini');
      }
    }

    const storageDir = this.getStorageDir();
    const filePath = path.resolve(storageDir, file.storageKey);

    // Prevent Path Traversal attacks
    if (!filePath.startsWith(storageDir)) {
      throw new ForbiddenError('Path file tidak valid atau berada di luar direktori aman');
    }

    if (!fs.existsSync(filePath)) {
      // Check legacy uploads folder if not found in configured storage
      const legacyPath = path.resolve(process.cwd(), 'uploads', file.storageKey);
      if (fs.existsSync(legacyPath)) {
        return { file, filePath: legacyPath };
      }
      throw new NotFoundError('File fisik');
    }

    return { file, filePath };
  }

  async deleteFile(id: string) {
    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundError('File');

    const storageDir = this.getStorageDir();
    const filePath = path.resolve(storageDir, file.storageKey);

    if (filePath.startsWith(storageDir) && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      const legacyPath = path.resolve(process.cwd(), 'uploads', file.storageKey);
      if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
    }

    return prisma.file.delete({ where: { id } });
  }
}

export const fileService = new FileService();
