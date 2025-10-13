/**
 * Утилиты для работы с файлами
 */

import { FileInfo, SupportedFormat } from '@/types';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Создание директории, если она не существует
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Генерация уникального имени файла
 */
export function generateFileName(
  format: SupportedFormat = 'webm',
  prefix: string = 'recording'
): string {
  const timestamp = Date.now();
  const uuid = uuidv4().substring(0, 8);
  return `${prefix}_${timestamp}_${uuid}.${format}`;
}

/**
 * Получение информации о файле
 */
export function getFileInfo(filePath: string): FileInfo | null {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).substring(1) as SupportedFormat;
    
    return {
      path: filePath,
      size: stats.size,
      mimeType: getMimeType(ext),
      createdAt: stats.birthtime,
      recordingId: path.basename(filePath, `.${ext}`),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Получение MIME типа по расширению файла
 */
export function getMimeType(format: SupportedFormat): string {
  const mimeTypes: Record<SupportedFormat, string> = {
    webm: 'audio/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  };
  
  return mimeTypes[format] || 'application/octet-stream';
}

/**
 * Проверка существования файла
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Удаление файла
 */
export function deleteFile(filePath: string): boolean {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Получение размера файла
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Очистка старых файлов
 */
export function cleanupOldFiles(
  directory: string,
  maxAge: number = 24 * 60 * 60 * 1000 // 24 часа
): number {
  let deletedCount = 0;
  
  try {
    const files = fs.readdirSync(directory);
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        if (deleteFile(filePath)) {
          deletedCount++;
        }
      }
    });
  } catch (error) {
    // Игнорируем ошибки очистки
  }
  
  return deletedCount;
}

/**
 * Создание временного файла
 */
export function createTempFile(
  content: string | Buffer,
  extension: string = 'tmp'
): string {
  const tempDir = path.join(process.cwd(), 'temp');
  ensureDirectoryExists(tempDir);
  
  const fileName = `temp_${uuidv4()}.${extension}`;
  const filePath = path.join(tempDir, fileName);
  
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Копирование файла
 */
export function copyFile(sourcePath: string, destPath: string): boolean {
  try {
    ensureDirectoryExists(path.dirname(destPath));
    fs.copyFileSync(sourcePath, destPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Перемещение файла
 */
export function moveFile(sourcePath: string, destPath: string): boolean {
  try {
    ensureDirectoryExists(path.dirname(destPath));
    fs.renameSync(sourcePath, destPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Получение списка файлов в директории
 */
export function listFiles(
  directory: string,
  filter?: (file: string) => boolean
): string[] {
  try {
    const files = fs.readdirSync(directory);
    return filter ? files.filter(filter) : files;
  } catch (error) {
    return [];
  }
}

/**
 * Получение файлов по расширению
 */
export function getFilesByExtension(
  directory: string,
  extension: string
): string[] {
  return listFiles(directory, file => file.endsWith(`.${extension}`));
}

/**
 * Получение аудио файлов
 */
export function getAudioFiles(directory: string): string[] {
  const audioExtensions = ['webm', 'mp3', 'wav', 'ogg', 'm4a'];
  return listFiles(directory, file => {
    const ext = path.extname(file).substring(1).toLowerCase();
    return audioExtensions.includes(ext);
  });
}

/**
 * Создание потока для записи файла
 */
export function createWriteStream(filePath: string): fs.WriteStream {
  ensureDirectoryExists(path.dirname(filePath));
  return fs.createWriteStream(filePath);
}

/**
 * Создание потока для чтения файла
 */
export function createReadStream(filePath: string): fs.ReadStream {
  return fs.createReadStream(filePath);
}

/**
 * Асинхронное чтение файла
 */
export function readFileAsync(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Асинхронная запись файла
 */
export function writeFileAsync(
  filePath: string,
  data: string | Buffer
): Promise<void> {
  return new Promise((resolve, reject) => {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFile(filePath, data, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
