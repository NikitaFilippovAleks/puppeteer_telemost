/**
 * Класс для записи аудио с Yandex Telemost
 */

import * as fs from 'fs';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { getStream, Stream } from 'puppeteer-stream';
// import { v4 as uuidv4 } from 'uuid';

import {
  AppConfig,
  DEFAULT_CONFIG,
  FileStream,
  RecordingError,
  RecordingProgress,
  RecordingResult,
  TelemostRecorderOptions,
} from '@/types';
import { ensureDirectoryExists, getFileInfo } from '@/utils/file';
import { createLogger } from '@/utils/logger';


export class TelemostRecorder {
  private config: AppConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private audioStream: Stream | null = null;
  private fileStream: FileStream | null = null;
  private isRecording: boolean = false;
  private logger = createLogger(DEFAULT_CONFIG.logging);

  constructor(options: TelemostRecorderOptions = {}) {
    this.config = this.mergeConfig(options);
    this.logger = createLogger(this.config.logging);
  }

  /**
   * Объединение конфигурации с переданными опциями
   */
  private mergeConfig(options: TelemostRecorderOptions): AppConfig {
    return {
      browser: { ...DEFAULT_CONFIG.browser, ...options.browser },
      page: { ...DEFAULT_CONFIG.page, ...options.page },
      recording: { ...DEFAULT_CONFIG.recording, ...options.recording },
      webrtc: { ...DEFAULT_CONFIG.webrtc, ...options.webrtc },
      logging: { ...DEFAULT_CONFIG.logging, ...options.logging },
    };
  }

  /**
   * Инициализация браузера и страницы
   */
  async init(): Promise<void> {
    this.logger.start('Инициализация браузера');

    try {
      const launchOptions: any = {
        headless: this.config.browser.headless,
        args: this.config.browser.args,
      };

      if (this.config.browser.executablePath) {
        launchOptions.executablePath = this.config.browser.executablePath;
      }

      this.browser = await puppeteer.launch(launchOptions);

      this.page = await this.browser.newPage();

      // Настройка viewport
      await this.page.setViewport(this.config.page.viewport);

      // Настройка логирования
      if (this.config.logging.enableConsoleLogs) {
        this.page.on('console', (msg: any) => {
          this.logger.pageLog(msg.text());
        });
      }

      if (this.config.logging.enablePageErrors) {
        this.page.on('pageerror', (error: Error) => {
          this.logger.pageError(error.message, error);
        });
      }

      this.logger.success('Браузер инициализирован');
    } catch (error) {
      this.logger.error('Ошибка инициализации браузера', error as Error);
      throw new RecordingError('Не удалось инициализировать браузер', error as Error);
    }
  }

  /**
   * Переход на страницу встречи и ожидание WebRTC соединения
   */
  async connectToMeeting(meetingUrl: string): Promise<void> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    this.logger.start(`Переход на страницу встречи: ${meetingUrl}`);

    try {
      await this.page.goto(meetingUrl, {
        waitUntil: 'networkidle2',
        timeout: this.config.page.timeout,
      });

      this.logger.info('Ожидание установления WebRTC соединения');

      // Ждём установления WebRTC соединения
      await this.page.waitForFunction(
        () => {
          // Проверяем различные возможные объекты, которые может использовать Telemost
          for (const selector of this.config.webrtc.selectors) {
            try {
              if (eval(selector)) return true;
            } catch (e) {
              // Игнорируем ошибки eval
            }
          }
          return false;
        },
        {
          timeout: this.config.page.waitForSelector.timeout,
          polling: this.config.page.waitForSelector.polling,
        }
      );

      this.logger.success('WebRTC соединение установлено');

      // Дополнительная пауза для стабилизации
      await this.page.waitForTimeout(this.config.webrtc.stabilizationDelay);
    } catch (error) {
      this.logger.error('Ошибка подключения к встрече', error as Error);
      throw new RecordingError('Не удалось подключиться к встрече', error as Error);
    }
  }

  /**
   * Начало записи аудио
   */
  async startRecording(outputPath: string): Promise<void> {
    if (this.isRecording) {
      throw new RecordingError('Запись уже идет');
    }

    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    this.logger.start('Захват аудио потока');

    try {
      this.audioStream = await getStream(this.page as any, { audio: true, video: false });

      // Создаем директорию для выходного файла
      ensureDirectoryExists(path.dirname(outputPath));

      // Открываем файл-поток на запись
      this.fileStream = fs.createWriteStream(outputPath);

      // Обработка ошибок записи
      if (this.fileStream) {
        this.fileStream.on('error', (error: Error) => {
          this.logger.error('Ошибка записи в файл', error);
        });
      }

      if (this.audioStream && this.fileStream) {
        this.audioStream.pipe(this.fileStream as NodeJS.WritableStream);
      }
      this.isRecording = true;

      this.logger.success('Запись начата');
    } catch (error) {
      this.logger.error('Ошибка начала записи', error as Error);
      throw new RecordingError('Не удалось начать запись', error as Error);
    }
  }

  /**
   * Остановка записи
   */
  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      this.logger.warn('Запись не была активна');
      return;
    }

    this.logger.start('Остановка записи');

    try {
      // Останавливаем стрим
      if (this.audioStream) {
        await this.audioStream.destroy();
      }

      if (this.fileStream) {
        this.fileStream.end();

        // Ждем завершения записи
        await new Promise<void>((resolve) => {
          (this.fileStream as FileStream).on('finish', resolve);
        });
      }

      this.isRecording = false;
      this.logger.success('Запись остановлена');
    } catch (error) {
      this.logger.error('Ошибка остановки записи', error as Error);
      throw new RecordingError('Не удалось остановить запись', error as Error);
    }
  }

  /**
   * Запись аудио на заданное время
   */
  async recordForDuration(
    meetingUrl: string,
    durationSec: number,
    outputPath: string
  ): Promise<RecordingResult> {
    const timer = this.logger.createTimer(`Запись ${durationSec} секунд`);

    try {
      await this.init();
      await this.connectToMeeting(meetingUrl);
      await this.startRecording(outputPath);

      // Показываем прогресс записи
      if (this.config.logging.enableProgress) {
        let secondsElapsed = 0;
        const progressInterval = setInterval(() => {
          secondsElapsed += this.config.recording.progressInterval / 1000;
          if (secondsElapsed <= durationSec) {
            const progress: RecordingProgress = {
              secondsElapsed: Math.min(secondsElapsed, durationSec),
              totalSeconds: durationSec,
              percentage: Math.round((secondsElapsed / durationSec) * 100),
            };
            this.logger.progress(
              `Записано: ${progress.secondsElapsed}/${progress.totalSeconds} секунд (${progress.percentage}%)`
            );
          }
        }, this.config.recording.progressInterval);

        // Ждём заданное время
        await new Promise<void>((resolve) => setTimeout(resolve, durationSec * 1000));

        clearInterval(progressInterval);
      } else {
        // Ждём заданное время без показа прогресса
        await new Promise<void>((resolve) => setTimeout(resolve, durationSec * 1000));
      }

      await this.stopRecording();

      // Получаем информацию о файле
      const fileInfo = getFileInfo(outputPath);
      const result: RecordingResult = {
        success: true,
        filePath: outputPath,
        duration: durationSec,
        fileSize: fileInfo?.size || undefined,
      };

      this.logger.success(`Запись завершена: ${outputPath}`);
      timer();

      return result;
    } catch (error) {
      this.logger.error('Ошибка при записи', error as Error);
      timer();

      const result: RecordingResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };

      return result;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Получение статистики WebRTC
   */
  async getWebRTCStats(): Promise<any> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      return await this.page.evaluate(() => {
        // Проверяем состояние WebRTC соединения
        if ((globalThis as any).window?.pc && (globalThis as any).window.pc.getStats) {
          return (globalThis as any).window.pc.getStats().then((stats: any) => {
            const audioStats = Array.from(stats.values()).filter(
              (stat: any) => stat.type === 'inbound-rtp' && stat.mediaType === 'audio'
            );
            return {
              audioPackets: audioStats.reduce(
                (sum: number, stat: any) => sum + (stat.packetsReceived || 0),
                0
              ),
              audioBytes: audioStats.reduce(
                (sum: number, stat: any) => sum + (stat.bytesReceived || 0),
                0
              ),
            };
          });
        }
        return { audioPackets: 0, audioBytes: 0 };
      });
    } catch (error) {
      this.logger.warn('Не удалось получить статистику WebRTC');
      return { audioPackets: 0, audioBytes: 0 };
    }
  }

  /**
   * Очистка ресурсов
   */
  async cleanup(): Promise<void> {
    if (this.isRecording) {
      await this.stopRecording();
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    this.page = null;
    this.audioStream = null;
    this.fileStream = null;

    this.logger.info('Ресурсы очищены');
  }

  /**
   * Получение текущего состояния
   */
  getStatus(): {
    isInitialized: boolean;
    isRecording: boolean;
    hasBrowser: boolean;
    hasPage: boolean;
  } {
    return {
      isInitialized: this.browser !== null,
      isRecording: this.isRecording,
      hasBrowser: this.browser !== null,
      hasPage: this.page !== null,
    };
  }
}

/**
 * Функция для быстрого использования (совместимость с оригинальным API)
 */
export async function recordAudioFromTelemost(
  meetingUrl: string,
  durationSec: number,
  outputPath: string
): Promise<void> {
  const recorder = new TelemostRecorder();
  const result = await recorder.recordForDuration(meetingUrl, durationSec, outputPath);

  if (!result.success) {
    throw new RecordingError(result.error || 'Ошибка записи');
  }
}
