/**
 * Утилиты для валидации данных
 */

import { MAX_DURATION, MIN_DURATION, SUPPORTED_FORMATS, SupportedFormat, ValidationResult } from '@/types';

/**
 * Валидация URL встречи Telemost
 */
export function validateMeetingUrl(url: string): ValidationResult {
  const errors: string[] = [];

  if (!url) {
    errors.push('URL встречи обязателен');
    return { isValid: false, errors };
  }

  if (typeof url !== 'string') {
    errors.push('URL встречи должен быть строкой');
    return { isValid: false, errors };
  }

  if (!url.includes('telemost.yandex.ru')) {
    errors.push('URL должен быть от Yandex Telemost');
  }

  try {
    new URL(url);
  } catch {
    errors.push('URL имеет неверный формат');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация длительности записи
 */
export function validateDuration(duration: number): ValidationResult {
  const errors: string[] = [];

  if (typeof duration !== 'number') {
    errors.push('Длительность должна быть числом');
    return { isValid: false, errors };
  }

  if (isNaN(duration)) {
    errors.push('Длительность должна быть валидным числом');
    return { isValid: false, errors };
  }

  if (duration < MIN_DURATION) {
    errors.push(`Длительность должна быть не менее ${MIN_DURATION} секунд`);
  }

  if (duration > MAX_DURATION) {
    errors.push(`Длительность должна быть не более ${MAX_DURATION} секунд`);
  }

  if (!Number.isInteger(duration)) {
    errors.push('Длительность должна быть целым числом');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация формата аудио
 */
export function validateFormat(format: string): ValidationResult {
  const errors: string[] = [];

  if (!format) {
    errors.push('Формат аудио обязателен');
    return { isValid: false, errors };
  }

  if (typeof format !== 'string') {
    errors.push('Формат аудио должен быть строкой');
    return { isValid: false, errors };
  }

  if (!SUPPORTED_FORMATS.includes(format as SupportedFormat)) {
    errors.push(`Поддерживаемые форматы: ${SUPPORTED_FORMATS.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация пути к файлу
 */
export function validateFilePath(filePath: string): ValidationResult {
  const errors: string[] = [];

  if (!filePath) {
    errors.push('Путь к файлу обязателен');
    return { isValid: false, errors };
  }

  if (typeof filePath !== 'string') {
    errors.push('Путь к файлу должен быть строкой');
    return { isValid: false, errors };
  }

  // Проверяем на небезопасные символы
  const unsafeChars = /[<>:"|?*]/;
  if (unsafeChars.test(filePath)) {
    errors.push('Путь к файлу содержит небезопасные символы');
  }

  // Проверяем на относительные пути
  if (filePath.startsWith('..') || filePath.includes('/..') || filePath.includes('\\..')) {
    errors.push('Относительные пути не разрешены');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация параметров записи
 */
export function validateRecordingParams(params: {
  meetingUrl: string;
  duration?: number;
  format?: string;
  outputPath?: string;
}): ValidationResult {
  const errors: string[] = [];

  // Валидируем URL встречи
  const urlValidation = validateMeetingUrl(params.meetingUrl);
  if (!urlValidation.isValid) {
    errors.push(...urlValidation.errors);
  }

  // Валидируем длительность, если указана
  if (params.duration !== undefined) {
    const durationValidation = validateDuration(params.duration);
    if (!durationValidation.isValid) {
      errors.push(...durationValidation.errors);
    }
  }

  // Валидируем формат, если указан
  if (params.format !== undefined) {
    const formatValidation = validateFormat(params.format);
    if (!formatValidation.isValid) {
      errors.push(...formatValidation.errors);
    }
  }

  // Валидируем путь к файлу, если указан
  if (params.outputPath !== undefined) {
    const pathValidation = validateFilePath(params.outputPath);
    if (!pathValidation.isValid) {
      errors.push(...pathValidation.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация ID записи
 */
export function validateRecordingId(id: string): ValidationResult {
  const errors: string[] = [];

  if (!id) {
    errors.push('ID записи обязателен');
    return { isValid: false, errors };
  }

  if (typeof id !== 'string') {
    errors.push('ID записи должен быть строкой');
    return { isValid: false, errors };
  }

  // Проверяем формат UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    errors.push('ID записи должен быть валидным UUID');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Валидация размера файла
 */
export function validateFileSize(size: number, maxSize: number = 100 * 1024 * 1024): ValidationResult {
  const errors: string[] = [];

  if (typeof size !== 'number') {
    errors.push('Размер файла должен быть числом');
    return { isValid: false, errors };
  }

  if (isNaN(size)) {
    errors.push('Размер файла должен быть валидным числом');
    return { isValid: false, errors };
  }

  if (size < 0) {
    errors.push('Размер файла не может быть отрицательным');
  }

  if (size > maxSize) {
    errors.push(`Размер файла не может превышать ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
