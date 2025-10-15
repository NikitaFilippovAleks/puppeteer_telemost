/**
 * Менеджер для управления браузером и вкладками
 */

import { DEFAULT_CONFIG } from '@/types';
import { createLogger } from '@/utils/logger';
import { Browser, Page, executablePath } from 'puppeteer';
import { launch } from 'puppeteer-stream';

class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private logger = createLogger(DEFAULT_CONFIG.logging);
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;

  private constructor() { }

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  /**
   * Получение или создание браузера
   */
  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      this.logger.info('Используем существующий браузер');
      return this.browser;
    }

    if (this.isInitializing && this.initPromise) {
      this.logger.info('Ожидаем завершения инициализации браузера');
      await this.initPromise;
      return this.browser!;
    }

    this.isInitializing = true;
    this.initPromise = this.initializeBrowser();

    try {
      await this.initPromise;
      return this.browser!;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  /**
   * Создание новой вкладки
   */
  async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    this.logger.info('Создана новая вкладка');
    return page;
  }

  /**
   * Инициализация браузера
   */
  private async initializeBrowser(): Promise<void> {
    this.logger.start('Инициализация глобального браузера');

    try {
      this.browser = await launch({
        executablePath: executablePath(),
        headless: 'new',
        args: [
          '--enable-extensions',
          "--allowlisted-extension-id=jjndjgheafjngoipoacpjgeicjeomjli",
          '--no-sandbox',
        ],
        defaultViewport: { width: 1920, height: 1080 },
      });

      this.logger.success('Глобальный браузер инициализирован');

      // Обработка закрытия браузера
      this.browser.on('disconnected', () => {
        this.logger.warn('Браузер отключен, сбрасываем ссылку');
        this.browser = null;
      });

    } catch (error) {
      this.logger.error('Ошибка инициализации браузера', error as Error);
      throw error;
    }
  }

  /**
   * Получение статистики браузера
   */
  async getBrowserStats(): Promise<{
    isConnected: boolean;
    pagesCount: number;
    version: string;
  }> {
    if (!this.browser) {
      return { isConnected: false, pagesCount: 0, version: 'N/A' };
    }

    try {
      const pages = await this.browser.pages();
      const version = await this.browser.version();

      return {
        isConnected: this.browser.isConnected(),
        pagesCount: pages.length,
        version: version,
      };
    } catch (error) {
      this.logger.warn('Ошибка получения статистики браузера', error as Error);
      return { isConnected: false, pagesCount: 0, version: 'N/A' };
    }
  }

  /**
   * Закрытие браузера
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      this.logger.info('Закрываем глобальный браузер');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Проверка, инициализирован ли браузер
   */
  isBrowserReady(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }
}

export default BrowserManager;
