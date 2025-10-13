/**
 * Утилиты для логирования
 */

import { LoggingConfig } from '@/types';

export class Logger {
  private config: LoggingConfig;

  constructor(config: LoggingConfig) {
    this.config = config;
  }

  /**
   * Логирование информации
   */
  info(message: string, ...args: any[]): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Логирование предупреждений
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Логирование ошибок
   */
  error(message: string, error?: Error, ...args: any[]): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
    if (error) {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Логирование отладки
   */
  debug(message: string, ...args: any[]): void {
    if (process.env['NODE_ENV'] === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Логирование успешных операций
   */
  success(message: string, ...args: any[]): void {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Логирование начала операций
   */
  start(message: string, ...args: any[]): void {
    console.log(`[START] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Логирование завершения операций
   */
  end(message: string, ...args: any[]): void {
    console.log(`[END] ${new Date().toISOString()} - ${message}`, ...args);
  }

  /**
   * Логирование прогресса
   */
  progress(message: string, ...args: any[]): void {
    if (this.config.enableProgress) {
      console.log(`[PROGRESS] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Логирование сообщений со страницы
   */
  pageLog(message: string, ...args: any[]): void {
    if (this.config.enableConsoleLogs) {
      console.log(`[PAGE] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  /**
   * Логирование ошибок страницы
   */
  pageError(message: string, error?: Error, ...args: any[]): void {
    if (this.config.enablePageErrors) {
      console.error(`[PAGE ERROR] ${new Date().toISOString()} - ${message}`, ...args);
      if (error) {
        console.error('Page error stack:', error.stack);
      }
    }
  }

  /**
   * Создание таймера для измерения времени выполнения
   */
  createTimer(label: string): () => void {
    const start = Date.now();
    this.start(`Timer started: ${label}`);

    return () => {
      const duration = Date.now() - start;
      this.end(`Timer completed: ${label} (${duration}ms)`);
    };
  }

  /**
   * Логирование с форматированием JSON
   */
  json(message: string, data: any): void {
    this.info(`${message}: ${JSON.stringify(data, null, 2)}`);
  }

  /**
   * Логирование статистики
   */
  stats(message: string, stats: Record<string, any>): void {
    this.info(`${message}:`);
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }
}

/**
 * Создание экземпляра логгера
 */
export function createLogger(config: LoggingConfig): Logger {
  return new Logger(config);
}

/**
 * Глобальный логгер (для совместимости)
 */
export const logger = createLogger({
  enableConsoleLogs: true,
  enablePageErrors: true,
  enableProgress: true,
});
