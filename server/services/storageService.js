import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Storage Service Interface & Local File System Implementation.
 * Easily swappable with AWS S3, Cloudflare R2, or Supabase Storage.
 */
class LocalStorageProvider {
  constructor(baseDir = path.resolve(__dirname, '../../uploads')) {
    this.baseDir = baseDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(buffer, filename, subfolder = '') {
    const targetDir = subfolder ? path.join(this.baseDir, subfolder) : this.baseDir;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalPath = path.join(targetDir, safeFilename);
    await fs.promises.writeFile(finalPath, buffer);

    const relativeUrl = subfolder ? `/uploads/${subfolder}/${safeFilename}` : `/uploads/${safeFilename}`;
    return {
      filename: safeFilename,
      path: finalPath,
      url: relativeUrl
    };
  }

  async deleteFile(filename, subfolder = '') {
    const targetDir = subfolder ? path.join(this.baseDir, subfolder) : this.baseDir;
    const safeFilename = path.basename(filename);
    const filePath = path.join(targetDir, safeFilename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  async listFiles(subfolder = '') {
    const targetDir = subfolder ? path.join(this.baseDir, subfolder) : this.baseDir;
    if (!fs.existsSync(targetDir)) return [];
    const files = await fs.promises.readdir(targetDir);
    return files.map(filename => ({
      filename,
      url: subfolder ? `/uploads/${subfolder}/${filename}` : `/uploads/${filename}`
    }));
  }
}

export const storageService = new LocalStorageProvider();
export default storageService;
