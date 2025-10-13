/**
 * Express API сервер для записи аудио с Yandex Telemost
 */

import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { config } from './config';
import { TelemostRecorder } from './recorder';
import {
  ApiResponse,
  CustomRequest,
  SimpleRecordRequest,
  TelemostError,
  ValidationError
} from './types';
import { ensureDirectoryExists } from './utils/file';
import { createLogger } from './utils/logger';
import { validateRecordingParams } from './utils/validation';

const app = express();
const PORT = process.env['PORT'] || 3100;
const logger = createLogger(config.logging);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Создаем необходимые директории
const ensureDirectories = (): void => {
  const dirs = ['./recordings'];
  dirs.forEach((dir) => {
    ensureDirectoryExists(dir);
  });
};

// Инициализация директорий
ensureDirectories();

// Middleware для логирования запросов
app.use((req: Request, _: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Middleware для очистки временных файлов
const cleanupTempFiles = (req: CustomRequest, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    // Очищаем временные файлы после ответа
    if (req.tempFiles) {
      req.tempFiles.forEach((file) => {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      });
    }
  });
  next();
};

app.use(cleanupTempFiles);

/**
 * Эндпоинт для записи аудио с Yandex Telemost
 * POST /api/record
 */
app.post('/api/record', async (req: Request, res: Response, next: NextFunction) => {
  const { meetingUrl, duration = 10, format = 'webm' }: SimpleRecordRequest = req.body;

  logger.info('Received request:', req.body);

  try {
    // Валидация входных данных
    const validation = validateRecordingParams({ meetingUrl, duration, format });
    if (!validation.isValid) {
      throw new ValidationError('Неверные параметры запроса', validation.errors);
    }

    const recordingId = uuidv4();
    const outputPath = `./recordings/recording_${recordingId}.${format}`;

    logger.start(`Запись ${recordingId}:`, {
      meetingUrl,
      duration,
      format,
    });

    const recorder = new TelemostRecorder({
      browser: {
        headless: process.env['BROWSER_HEADLESS'] === 'true',
      },
      logging: config.logging,
    });



    try {
      // Записываем аудио
      const result = await recorder.recordForDuration(meetingUrl, duration, outputPath);

      if (!result.success) {
        throw new TelemostError(
          result.error || 'Ошибка записи',
          'recording_failed',
          500
        );
      }

      // Проверяем, что файл создан
      if (!fs.existsSync(outputPath)) {
        throw new TelemostError('Файл записи не был создан', 'file_not_created', 500);
      }

      const stats = fs.statSync(outputPath);
      const fileSizeInBytes = stats.size;

      logger.success(`Запись ${recordingId} завершена (${fileSizeInBytes} байт)`);

      // Отправляем файл
      res.setHeader('Content-Type', `audio/${format}`);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="recording_${recordingId}.${format}"`
      );
      res.setHeader('X-Recording-ID', recordingId);
      res.setHeader('X-File-Size', fileSizeInBytes.toString());

      const fileStream = fs.createReadStream(outputPath);
      fileStream.pipe(res);

      // Очищаем файл после отправки
      // fileStream.on('end', () => {
      //   setTimeout(() => {
      //     if (fs.existsSync(outputPath)) {
      //       fs.unlinkSync(outputPath);
      //       logger.info(`Файл ${recordingId} удален`);
      //     }
      //   }, 1000);
      // });

      fileStream.on('error', (error) => {
        logger.error(`Ошибка отправки файла ${recordingId}`, error);
        res.status(500).json({
          success: false,
          error: 'file_stream_error',
          message: 'Ошибка при отправке файла',
        });
      });
    } catch (error) {
      // Очищаем файл в случае ошибки
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      throw error;
    } finally {
      await recorder.cleanup();
    }
  } catch (error) {
    next(error);
  }
});


// Обработка 404
app.use('*', (_: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: 'not_found',
    message: 'Эндпоинт не найден. Доступен только POST /api/record',
  };

  res.status(404).json(response);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Получен сигнал SIGINT, завершаем работу сервера...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Получен сигнал SIGTERM, завершаем работу сервера...');
  process.exit(0);
});

// // Периодическая очистка старых файлов
// setInterval(() => {
//   const deletedCount = cleanupOldFiles('./recordings', 24 * 60 * 60 * 1000); // 24 часа
//   if (deletedCount > 0) {
//     logger.info(`Очищено ${deletedCount} старых файлов`);
//   }
// }, 60 * 60 * 1000); // Каждый час

// Запуск сервера
app.listen(PORT, () => {
  logger.success(`API сервер запущен на порту ${PORT}`);
  logger.info('Доступный эндпоинт:');
  logger.info(`  POST http://localhost:${PORT}/api/record - Записать аудио с конференции`);
});

export default app;
