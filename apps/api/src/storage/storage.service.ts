import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { badRequest, notFound } from '../common/errors';
import { AppConfig } from '../config/config.module';

/** Minimal shape of an uploaded file (multer memory storage). */
export interface UploadedFileLike {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};
const CONTENT_TYPES = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([type, ext]) => [ext, type]),
);

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Private file storage. Keys look like `users/<id>/kyc/<uuid>.jpg`; the prefix decides
 * who may read the file (see FilesController). Local disk today, S3-compatible later.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(config: AppConfig) {
    this.root = resolve(config.env.UPLOAD_DIR, 'private');
  }

  async save(
    prefix: string,
    file: UploadedFileLike,
    allowed: string[] = Object.keys(EXTENSIONS),
  ): Promise<string> {
    const extension = EXTENSIONS[file.mimetype];
    if (!extension || !allowed.includes(file.mimetype)) {
      throw badRequest('invalid_file', `Unsupported file type: ${file.mimetype}`);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw badRequest('invalid_file', 'File is larger than 8 MB');
    }
    const key = `${prefix}/${randomUUID()}${extension}`;
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file.buffer);
    return key;
  }

  async open(key: string): Promise<{ stream: ReadStream; contentType: string; size: number }> {
    const path = this.pathFor(key);
    const info = await stat(path).catch(() => null);
    if (!info?.isFile()) throw notFound('File not found');
    const extension = key.slice(key.lastIndexOf('.'));
    return {
      stream: createReadStream(path),
      contentType: CONTENT_TYPES[extension] ?? 'application/octet-stream',
      size: info.size,
    };
  }

  private pathFor(key: string): string {
    const path = resolve(join(this.root, key));
    if (!path.startsWith(this.root + sep)) throw badRequest('invalid_file', 'Invalid file key');
    return path;
  }
}
