/**
 * Класс для записи аудио с Yandex Telemost
 */

import * as fs from 'fs';
import * as path from 'path';
// import { Browser, Page, launch } from 'puppeteer';
import { getStream, launch } from 'puppeteer-stream';
// import { getStream, Stream } from 'puppeteer-stream';
// import { Browser, Page } from 'puppeteer-stream/node_modules/puppeteer-core';
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
import { Browser, executablePath, Page } from 'puppeteer';
// import Stream from 'stream';
import { Transform } from "stream";
// import { executablePath } from 'puppeteer';


export class TelemostRecorder {
  private config: AppConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private audioStream: Transform | null = null;
  private fileStream: FileStream | null = null;
  private isRecording: boolean = false;
  private logger = createLogger(DEFAULT_CONFIG.logging);
  private instanceId: string;

  constructor(options: TelemostRecorderOptions = {}) {
    this.config = this.mergeConfig(options);
    this.logger = createLogger(this.config.logging);
    this.instanceId = Math.random().toString(36).substring(2, 15);
    this.logger.info(`Создан экземпляр TelemostRecorder с ID: ${this.instanceId}`);
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
    this.logger.start(`Инициализация браузера для экземпляра ${this.instanceId}`);

    try {
      const launchOptions: any = {
        headless: 'new',
        args: this.config.browser.args,
        allowIncognito: true,
      };

      if (this.config.browser.executablePath) {
        launchOptions.executablePath = this.config.browser.executablePath;
      }

      // this.browser = await launch(launchOptions);

      this.browser = await launch({
        // headless: false,
        // dumpio: true,
        // macOS:
        // allowIncognito: true,
        allowIncognito: true,
        // executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        // executablePath: '/usr/bin/chromium',
        // startDelay: 2000,
        headless: 'new',
        // linux (docker):
        executablePath: executablePath(),
        // headless: "new", // supports audio!
        args: [
          '--enable-extensions',
          "--allowlisted-extension-id=jjndjgheafjngoipoacpjgeicjeomjli",
          '--no-sandbox', // Для работы в docker
          // '--allow-file-access-from-files',
          // '--enable-audio-service',
          // '--mute-audio=false',
        ],
        // headless: false, // for debugging
        defaultViewport: { width: 1920, height: 1080 },
        // args: [
        //     '--headless=new',
        //     // '--window-size=1920,1080',
        //     // '--start-fullscreen',
        //     '--allow-file-access-from-files',
        //     '--enable-audio-service',
        //     '--mute-audio=false',
        // ]
      });

      this.logger.success(`launch прошел для экземпляра ${this.instanceId}`);

      this.page = await this.browser.newPage();
      this.logger.info(`Создана новая вкладка для экземпляра ${this.instanceId}`);

      // Настройка viewport
      // await this.page.setViewport(this.config.page.viewport);

      // Настройка логирования
      // if (this.config.logging.enableConsoleLogs) {
      //   this.page.on('console', (msg: any) => {
      //     this.logger.pageLog(msg.text());
      //   });
      // }

      // if (this.config.logging.enablePageErrors) {
      //   this.page.on('pageerror', (error: Error) => {
      //     this.logger.pageError(error.message, error);
      //   });
      // }

      this.logger.success(`Браузер инициализирован для экземпляра ${this.instanceId}`);
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

    this.logger.start(`Переход на страницу встречи: ${meetingUrl} (экземпляр ${this.instanceId})`);

    try {
      await this.page.goto(meetingUrl, {
        waitUntil: 'networkidle2',
        timeout: this.config.page.timeout,
      });

      this.logger.info('Страница загружена, поиск кнопки входа в конференцию...');

      // Ищем кнопку входа в конференцию
      await this.clickEnterConferenceButton();

      // this.logger.info('Ожидание установления WebRTC соединения');

      // Ждём установления WebRTC соединения
      // await this.page.waitForFunction(
      //   () => {
      //     // Проверяем различные возможные объекты, которые может использовать Telemost
      //     for (const selector of this.config.webrtc.selectors) {
      //       try {
      //         if (eval(selector)) return true;
      //       } catch (e) {
      //         // Игнорируем ошибки eval
      //       }
      //     }
      //     return false;
      //   },
      //   {
      //     timeout: this.config.page.waitForSelector.timeout,
      //     polling: this.config.page.waitForSelector.polling,
      //   }
      // );

      // this.logger.success('WebRTC соединение установлено');

      // Дополнительная пауза для стабилизации
      // await this.page.waitForTimeout(this.config.webrtc.stabilizationDelay);
    } catch (error) {
      this.logger.error('Ошибка подключения к встрече', error as Error);
      throw new RecordingError('Не удалось подключиться к встрече', error as Error);
    }
  }

  /**
   * Получение текущего URL страницы для отладки
   */
  async getCurrentUrl(): Promise<string> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }
    return await this.page.url();
  }

  /**
   * Поиск и нажатие кнопки входа в конференцию
   */
  async clickEnterConferenceButton(): Promise<void> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      const currentUrl = await this.getCurrentUrl();
      this.logger.info(`Текущий URL: ${currentUrl} (экземпляр ${this.instanceId})`);
      this.logger.info('Поиск кнопки с data-test-id="enter-conference-button"');

      // Ждем появления кнопки входа в конференцию
      // const buttonSelector = '[data-test-id="enter-conference-button"]';

      // const element = await this.page.waitForSelector(buttonSelector, {
      //   timeout: this.config.page.waitForSelector.timeout,
      //   visible: true,
      // });
      // this.logger.info('Кнопка найдена', );


      // Нажимаем на кнопку
      // await element?.click()
      // await this.page.click(buttonSelector);
      // const buttonGoToBrowser = await this.page.waitForSelector('text=Продолжить в браузере', {
      //   // timeout: this.config.page.waitForSelector.timeout,
      //   visible: true,
      // });
      // if (buttonGoToBrowser) {
      //   await buttonGoToBrowser.click();
      //   await this.page.waitForNavigation();
      // }
      const button = await this.page.waitForSelector('text=Подключиться', {
        timeout: this.config.page.waitForSelector.timeout,
        visible: true,
      });
      this.logger.info('Кнопка найдена, нажимаем...');
      // await this.page.evaluate((el: any) => el.click(), button);

      // await button?.click()
      await Promise.all([
        // this.page.waitForNavigation(),
        // this.page.click('text=Подключиться')
        this.page.evaluate((el: any) => el.click(), button)
      ]);

      this.logger.success('Кнопка нажата, ожидание входа в конференцию...');
      this.logger.success('Мы в конференции');

      // // Ждем некоторое время для загрузки конференции
      // await this.page.waitForTimeout(3000);

      // Проверяем, что мы действительно вошли в конференцию
      // Можно проверить по изменению URL или появлению новых элементов
      // await this.waitForConferenceToLoad();

    } catch (error) {
      this.logger.error('Ошибка при нажатии кнопки входа в конференцию', error as Error);
      throw new RecordingError('Не удалось войти в конференцию', error as Error);
    }
  }

  /**
   * Ожидание полной загрузки конференции
   */
  async waitForConferenceToLoad(): Promise<void> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      this.logger.info('Ожидание загрузки конференции...');

      // Ждем появления элементов конференции
      // Можно добавить дополнительные селекторы для проверки
      const conferenceSelectors = [
        '[data-test-id="conference-room"]',
        '[data-test-id="video-container"]',
        '[data-test-id="audio-controls"]',
        '.conference-room',
        '.video-container',
        '.meeting-container',
        'video',
        'audio'
      ];

      let conferenceLoaded = false;
      for (const selector of conferenceSelectors) {
        try {
          // await this.page.waitForSelector(selector, {
          //   timeout: 5000,
          //   visible: true,
          // });
          await this.page.waitForNavigation();
          this.logger.info(`Элемент конференции найден: ${selector}`);
          conferenceLoaded = true;
          break;
        } catch (e) {
          // Продолжаем поиск других селекторов
        }
      }

      if (!conferenceLoaded) {
        this.logger.warn('Специфичные элементы конференции не найдены, продолжаем...');
      }

      // Дополнительная пауза для стабилизации
      // await this.page.waitForTimeout(2000);

      this.logger.success('Конференция загружена');

    } catch (error) {
      this.logger.warn('Ошибка при ожидании загрузки конференции', error as Error);
      // Не выбрасываем ошибку, так как конференция может загрузиться и без специфичных элементов
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
      this.audioStream = await getStream(this.page, { audio: true, video: false });

      console.log('stream captured');

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
   * Запись аудио до завершения встречи с максимальной продолжительностью
   */
  async recordUntilMeetingEnd(
    meetingUrl: string,
    maxDurationSec: number,
    outputPath: string
  ): Promise<RecordingResult> {
    const timer = this.logger.createTimer(`Запись до завершения встречи (макс. ${maxDurationSec} секунд)`);

    try {
      await this.init();
      await this.connectToMeeting(meetingUrl);
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      await this.startRecording(outputPath);

      // Мониторим завершение встречи
      const meetingEnded = await this.monitorMeetingEnd(maxDurationSec);

      await this.stopRecording();

      // Получаем информацию о файле
      const fileInfo = getFileInfo(outputPath);
      const result: RecordingResult = {
        success: true,
        filePath: outputPath,
        duration: meetingEnded.actualDuration,
        fileSize: fileInfo?.size || undefined,
      };

      this.logger.success(`Запись завершена: ${outputPath} (${meetingEnded.actualDuration}с)`);
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
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
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
   * Получение HTML содержимого страницы
   */
  async getPageContent(): Promise<string> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      return await this.page.content();
    } catch (error) {
      this.logger.error('Ошибка получения содержимого страницы', error as Error);
      throw new RecordingError('Не удалось получить содержимое страницы', error as Error);
    }
  }

  /**
   * Получение текстового содержимого страницы
   */
  async getPageText(): Promise<string> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      return await this.page.evaluate(() => document.body.innerText);
    } catch (error) {
      this.logger.error('Ошибка получения текста страницы', error as Error);
      throw new RecordingError('Не удалось получить текст страницы', error as Error);
    }
  }

  /**
   * Получение информации о DOM элементах
   */
  async getPageElements(): Promise<any> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      return await this.page.evaluate(() => {
        const elements = {
          title: document.title,
          url: window.location.href,
          audioElements: Array.from(document.querySelectorAll('audio')).map(el => ({
            src: el.src,
            duration: el.duration,
            paused: el.paused,
            muted: el.muted,
            volume: el.volume,
          })),
          videoElements: Array.from(document.querySelectorAll('video')).map(el => ({
            src: el.src,
            duration: el.duration,
            paused: el.paused,
            muted: el.muted,
            volume: el.volume,
            width: el.videoWidth,
            height: el.videoHeight,
          })),
          canvasElements: Array.from(document.querySelectorAll('canvas')).map(el => ({
            width: el.width,
            height: el.height,
          })),
          scripts: Array.from(document.querySelectorAll('script')).map(el => ({
            src: el.src,
            type: el.type,
          })),
          links: Array.from(document.querySelectorAll('link')).map(el => ({
            href: el.href,
            rel: el.rel,
            type: el.type,
          })),
          meta: Array.from(document.querySelectorAll('meta')).map(el => ({
            name: el.name,
            content: el.content,
            property: el.getAttribute('property'),
          })),
        };

        return elements;
      });
    } catch (error) {
      this.logger.error('Ошибка получения информации об элементах', error as Error);
      throw new RecordingError('Не удалось получить информацию об элементах', error as Error);
    }
  }

  /**
   * Получение логов консоли
   */
  async getConsoleLogs(): Promise<string[]> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    const logs: string[] = [];

    try {
      // Получаем логи, которые уже были записаны
      this.page.on('console', (msg: any) => {
        logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      });

      return logs;
    } catch (error) {
      this.logger.error('Ошибка получения логов консоли', error as Error);
      throw new RecordingError('Не удалось получить логи консоли', error as Error);
    }
  }

  /**
   * Проверка наличия WebRTC объектов на странице
   */
  async checkWebRTCObjects(): Promise<any> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      return await this.page.evaluate(() => {
        const webrtcObjects = {
          windowObjects: {
            remoteStream: typeof (window as any).remoteStream !== 'undefined',
            localStream: typeof (window as any).localStream !== 'undefined',
            pc: typeof (window as any).pc !== 'undefined',
            webrtc: typeof (window as any).webrtc !== 'undefined',
            mediaStream: typeof (window as any).mediaStream !== 'undefined',
          },
          domElements: {
            audio: document.querySelector('audio') !== null,
            video: document.querySelector('video') !== null,
            canvas: document.querySelector('canvas') !== null,
          },
          navigator: {
            mediaDevices: typeof navigator.mediaDevices !== 'undefined',
            getUserMedia: typeof navigator.mediaDevices?.getUserMedia !== 'undefined',
            webkitGetUserMedia: typeof (navigator as any).webkitGetUserMedia !== 'undefined',
            mozGetUserMedia: typeof (navigator as any).mozGetUserMedia !== 'undefined',
          },
          rtcPeerConnection: typeof RTCPeerConnection !== 'undefined',
          mediaStream: typeof MediaStream !== 'undefined',
        };

        return webrtcObjects;
      });
    } catch (error) {
      this.logger.error('Ошибка проверки WebRTC объектов', error as Error);
      throw new RecordingError('Не удалось проверить WebRTC объекты', error as Error);
    }
  }

  /**
   * Поиск кнопки по различным селекторам
   */
  async findButton(selectors: string[]): Promise<string | null> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          this.logger.info(`Кнопка найдена по селектору: ${selector}`);
          return selector;
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }

    return null;
  }

  /**
   * Нажатие на кнопку с ожиданием
   */
  async clickButton(selector: string, waitForElement: boolean = true): Promise<void> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      if (waitForElement) {
        await this.page.waitForSelector(selector, {
          timeout: this.config.page.waitForSelector.timeout,
          visible: true,
        });
      }

      this.logger.info(`Нажимаем на кнопку: ${selector}`);
      await this.page.click(selector);
      this.logger.success('Кнопка нажата');

    } catch (error) {
      this.logger.error(`Ошибка при нажатии кнопки ${selector}`, error as Error);
      throw new RecordingError(`Не удалось нажать кнопку: ${selector}`, error as Error);
    }
  }

  /**
   * Ожидание появления элемента на странице
   */
  async waitForElement(selector: string, timeout?: number): Promise<boolean> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      await this.page.waitForSelector(selector, {
        timeout: timeout || this.config.page.waitForSelector.timeout,
        visible: true,
      });
      this.logger.info(`Элемент найден: ${selector}`);
      return true;
    } catch (error) {
      this.logger.warn(`Элемент не найден: ${selector}`);
      return false;
    }
  }

  /**
   * Мониторинг завершения встречи
   */
  async monitorMeetingEnd(maxDurationSec: number): Promise<{ actualDuration: number; reason: string }> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    const startTime = Date.now();
    this.logger.info('Начинаем мониторинг завершения встречи...');

    return new Promise((resolve) => {
      let isResolved = false;
      let navigationTimeout: NodeJS.Timeout | null = null;
      let progressInterval: NodeJS.Timeout | null = null;

      const resolveWithTime = (reason: string) => {
        if (isResolved) return;
        isResolved = true;

        if (navigationTimeout) clearTimeout(navigationTimeout);
        if (progressInterval) clearInterval(progressInterval);

        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        this.logger.info(`Встреча завершена (${reason}): ${elapsedSeconds}с`);
        resolve({ actualDuration: elapsedSeconds, reason });
      };

      // Таймер для максимальной продолжительности
      navigationTimeout = setTimeout(() => {
        resolveWithTime('max_duration_reached');
      }, maxDurationSec * 1000);

      // Интервал для показа прогресса
      progressInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        if (elapsedSeconds > 0 && elapsedSeconds % 30 === 0) {
          this.logger.info(`Запись продолжается: ${elapsedSeconds}с / ${maxDurationSec}с`);
        }
      }, 2000);

      // Обработка навигации с помощью waitForNavigation
      const handleNavigation = async () => {
        try {
          // Ждем навигации с таймаутом
          this.logger.info('Ожидание навигации');
          await this.page!.waitForNavigation({
            timeout: 0
          });
          resolveWithTime('navigation_detected');
          return;

          // // Если навигация произошла, проверяем, покинули ли мы конференцию
          // const inConference = await this.isInConference();
          // if (!inConference) {
          //   resolveWithTime('navigation_detected');
          //   return;
          // }

          // // Если все еще в конференции, продолжаем ждать навигации
          // handleNavigation();
        } catch (error) {
          // Таймаут ожидания навигации - это нормально, продолжаем мониторинг
          if (error instanceof Error && error.name === 'TimeoutError') {
            // Проверяем, не покинули ли мы конференцию другим способом
            resolveWithTime('left_conference');
            return;
            // const inConference = await this.isInConference();
            // if (!inConference) {
            //   resolveWithTime('left_conference');
            //   return;
            // }

            // // Продолжаем ждать навигации
            // handleNavigation();
          } else {
            this.logger.warn('Ошибка при ожидании навигации', error as Error);
            // Продолжаем мониторинг даже при ошибках
            handleNavigation();
          }
        }
      };

      // Обработка ошибок страницы
      this.page?.on('error', () => {
        resolveWithTime('page_error');
      });

      // Обработка закрытия страницы
      this.page?.on('close', () => {
        resolveWithTime('page_closed');
      });

      // Начинаем мониторинг навигации
      handleNavigation();
    });
  }

  /**
   * Проверка, находится ли пользователь в конференции
   */
  async isInConference(): Promise<boolean> {
    if (!this.page) {
      throw new RecordingError('Страница не инициализирована');
    }

    try {
      return await this.page.evaluate(() => {
        // Проверяем различные индикаторы конференции
        const conferenceIndicators = [
          '[data-test-id="conference-room"]',
          '[data-test-id="video-container"]',
          '[data-test-id="audio-controls"]',
          '.conference-room',
          '.video-container',
          '.meeting-container',
          '.conference-container'
        ];

        for (const selector of conferenceIndicators) {
          if (document.querySelector(selector)) {
            return true;
          }
        }

        // Проверяем наличие медиа элементов
        const hasMediaElements = document.querySelector('video') || document.querySelector('audio');
        if (hasMediaElements) {
          return true;
        }

        // Проверяем URL на наличие индикаторов конференции
        const url = window.location.href;
        const conferenceUrlIndicators = ['conference', 'meeting', 'room', 'call'];
        return conferenceUrlIndicators.some(indicator => url.includes(indicator));
      });
    } catch (error) {
      this.logger.warn('Ошибка при проверке статуса конференции', error as Error);
      return false;
    }
  }

  /**
   * Очистка ресурсов
   */
  async cleanup(): Promise<void> {
    this.logger.info(`Начинаем очистку ресурсов для экземпляра ${this.instanceId}`);

    if (this.isRecording) {
      await this.stopRecording();
    }

    if (this.browser) {
      this.logger.info(`Закрываем браузер для экземпляра ${this.instanceId}`);
      await this.browser.close();
      this.browser = null;
    }

    this.page = null;
    this.audioStream = null;
    this.fileStream = null;

    this.logger.info(`Ресурсы очищены для экземпляра ${this.instanceId}`);
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
