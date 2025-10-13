/**
 * Конфигурация приложения для записи аудио с Yandex Telemost
 */

import { AppConfig, DEFAULT_CONFIG } from '@/types';

/**
 * Получение конфигурации с возможностью переопределения через переменные окружения
 */
export function getConfig(): AppConfig {
  const config: AppConfig = { ...DEFAULT_CONFIG };

  return config;
}

/**
 * Валидация конфигурации
 */
export function validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Проверяем обязательные поля
  if (!config.browser) {
    errors.push('Browser configuration is required');
  }

  if (!config.page) {
    errors.push('Page configuration is required');
  }

  if (!config.recording) {
    errors.push('Recording configuration is required');
  }

  if (!config.webrtc) {
    errors.push('WebRTC configuration is required');
  }

  if (!config.logging) {
    errors.push('Logging configuration is required');
  }

  // Проверяем значения
  if (config.recording.defaultDuration < 10 || config.recording.defaultDuration > 3600) {
    errors.push('Recording duration must be between 10 and 3600 seconds');
  }

  if (config.page.timeout < 1000) {
    errors.push('Page timeout must be at least 1000ms');
  }

  if (config.page.waitForSelector.timeout < 1000) {
    errors.push('WebRTC timeout must be at least 1000ms');
  }

  if (config.page.waitForSelector.polling < 100) {
    errors.push('WebRTC polling interval must be at least 100ms');
  }

  if (config.recording.progressInterval < 1000) {
    errors.push('Progress interval must be at least 1000ms');
  }

  if (config.webrtc.stabilizationDelay < 0) {
    errors.push('Stabilization delay must be non-negative');
  }

  if (config.webrtc.selectors.length === 0) {
    errors.push('At least one WebRTC selector must be provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Получение конфигурации с валидацией
 */
export function getValidatedConfig(): AppConfig {
  const config = getConfig();
  const validation = validateConfig(config);

  if (!validation.isValid) {
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
  }

  return config;
}

// Экспортируем конфигурацию по умолчанию
export const config = getValidatedConfig();
export default config;
