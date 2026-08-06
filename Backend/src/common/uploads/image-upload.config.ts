import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { diskStorage } from 'multer';
import { getUploadRoot } from './upload-paths';

const allowedMimeTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

export const imageUploadOptions = (folder: 'productos' | 'tipos') => ({
  storage: diskStorage({
    destination: (_req, _file, callback) => {
      const destination = join(getUploadRoot(), folder);
      mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename: (_req, file, callback) => {
      const extension = allowedMimeTypes.get(file.mimetype);
      if (!extension || !allowedExtensions.has(extname(file.originalname).toLowerCase())) {
        return callback(new UnsupportedMediaTypeException('Formato de imagen no permitido'), '');
      }
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: {
    files: 10,
    fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? 5) * 1024 * 1024,
  },
  fileFilter: (_req: Express.Request, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

const hasValidSignature = (file: Express.Multer.File): boolean => {
  const bytes = readFileSync(file.path).subarray(0, 12);
  const hex = bytes.toString('hex');
  if (file.mimetype === 'image/jpeg') return hex.startsWith('ffd8ff');
  if (file.mimetype === 'image/png') return hex.startsWith('89504e470d0a1a0a');
  if (file.mimetype === 'image/gif') return bytes.toString('ascii', 0, 6) === 'GIF87a' || bytes.toString('ascii', 0, 6) === 'GIF89a';
  if (file.mimetype === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return false;
};

export const validateUploadedImages = (files: Express.Multer.File[] = []): Express.Multer.File[] => {
  const invalidFile = files.find((file) => !hasValidSignature(file));
  if (!invalidFile) return files;

  for (const file of files) {
    if (existsSync(file.path)) unlinkSync(file.path);
  }
  throw new BadRequestException(`El archivo ${invalidFile.originalname} no contiene una imagen valida`);
};
