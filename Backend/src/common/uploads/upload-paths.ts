import { existsSync, unlinkSync } from 'fs';
import { isAbsolute, resolve } from 'path';

const backendRoot = resolve(__dirname, '..', '..', '..');

export const getUploadRoot = (): string => {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (!configured) return resolve(backendRoot, 'uploads');
  return isAbsolute(configured) ? resolve(configured) : resolve(backendRoot, configured);
};

export const getStoredUploadPath = (url: string): string => {
  const relativePath = url.replace(/^[/\\]+uploads[/\\]+/i, '');
  return resolve(getUploadRoot(), relativePath);
};

export const removeFileIfExists = (filePath: string | undefined): void => {
  if (filePath && existsSync(filePath)) unlinkSync(filePath);
};

export const cleanupUploadedFiles = (files: Express.Multer.File[] = []): void => {
  for (const file of files) removeFileIfExists(file.path);
};
