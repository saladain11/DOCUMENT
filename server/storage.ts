import fs from 'fs';
import path from 'path';

export interface StoredFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export interface StorageProvider {
  upload(file: { buffer: Buffer; originalname: string; mimetype: string; size: number }, folder?: string): Promise<StoredFile>;
  get(filePath: string): Promise<Buffer | null>;
  delete(filePath: string): Promise<boolean>;
  list(folder?: string): Promise<string[]>;
}

/**
 * Local filesystem storage provider (used in container/local mode)
 * Easily swappable with Cloudflare R2 Provider for Workers deployment.
 */
class LocalDiskStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir = path.join(process.cwd(), 'uploads')) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(file: { buffer: Buffer; originalname: string; mimetype: string; size: number }, folder = ''): Promise<StoredFile> {
    const targetDir = folder ? path.join(this.baseDir, folder) : this.baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filename = `${cleanName}_${uniqueSuffix}${ext}`;
    const relativePath = folder ? `${folder}/${filename}` : filename;
    const fullPath = path.join(this.baseDir, relativePath);

    await fs.promises.writeFile(fullPath, file.buffer);

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: relativePath,
      url: `/uploads/${relativePath}`,
    };
  }

  async get(filePath: string): Promise<Buffer | null> {
    const safePath = path.normalize(path.join(this.baseDir, filePath));
    if (!safePath.startsWith(this.baseDir)) {
      throw new Error('Path traversal attempt detected');
    }
    if (!fs.existsSync(safePath)) return null;
    return await fs.promises.readFile(safePath);
  }

  async delete(filePath: string): Promise<boolean> {
    const safePath = path.normalize(path.join(this.baseDir, filePath));
    if (!safePath.startsWith(this.baseDir)) {
      throw new Error('Path traversal attempt detected');
    }
    if (fs.existsSync(safePath)) {
      await fs.promises.unlink(safePath);
      return true;
    }
    return false;
  }

  async list(folder = ''): Promise<string[]> {
    const targetDir = folder ? path.join(this.baseDir, folder) : this.baseDir;
    if (!fs.existsSync(targetDir)) return [];
    return await fs.promises.readdir(targetDir);
  }
}

/**
 * Cloudflare R2 Storage Adapter skeleton for deployment
 */
export class CloudflareR2StorageProvider implements StorageProvider {
  private bucket: any;

  constructor(bucketBinding: any) {
    this.bucket = bucketBinding;
  }

  async upload(file: { buffer: Buffer; originalname: string; mimetype: string; size: number }, folder = ''): Promise<StoredFile> {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${folder ? folder + '/' : ''}${Date.now()}_${cleanName}${ext}`;

    await this.bucket.put(filename, file.buffer, {
      httpMetadata: { contentType: file.mimetype }
    });

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: filename,
      url: `/api/media/stream/${encodeURIComponent(filename)}`
    };
  }

  async get(filePath: string): Promise<Buffer | null> {
    const object = await this.bucket.get(filePath);
    if (!object) return null;
    const arrayBuffer = await object.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async delete(filePath: string): Promise<boolean> {
    await this.bucket.delete(filePath);
    return true;
  }

  async list(folder = ''): Promise<string[]> {
    const list = await this.bucket.list({ prefix: folder });
    return list.objects.map((obj: any) => obj.key);
  }
}

// Export singleton instance based on environment
export const storage: StorageProvider = new LocalDiskStorageProvider();
