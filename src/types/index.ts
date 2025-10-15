/**
 * Основные типы для приложения Puppeteer Telemost Recorder
 */

import { Request, Response } from 'express';
// import puppeteer from 'puppeteer';
import { Readable } from 'stream';

// ===== КОНФИГУРАЦИЯ =====

export interface BrowserConfig {
  headless?: boolean | 'new';
  args: string[];
  executablePath?: string;
}

export interface PageConfig {
  viewport: {
    width: number;
    height: number;
  };
  timeout: number;
  waitForSelector: {
    timeout: number;
    polling: number;
  };
}

export interface RecordingConfig {
  defaultDuration: number;
  outputDir: string;
  fileFormat: string;
  progressInterval: number;
}

export interface WebRTCConfig {
  selectors: string[];
  stabilizationDelay: number;
}

export interface LoggingConfig {
  enableConsoleLogs: boolean;
  enablePageErrors: boolean;
  enableProgress: boolean;
}

export interface AppConfig {
  browser: BrowserConfig;
  page: PageConfig;
  recording: RecordingConfig;
  webrtc: WebRTCConfig;
  logging: LoggingConfig;
}

// ===== API ТИПЫ =====

export interface RecordRequest {
  meetingUrl: string;
  duration?: number;
  format?: 'webm' | 'mp3' | 'wav';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
}


// ===== RECORDER ТИПЫ =====

export interface TelemostRecorderOptions {
  browser?: Partial<BrowserConfig>;
  page?: Partial<PageConfig>;
  recording?: Partial<RecordingConfig>;
  webrtc?: Partial<WebRTCConfig>;
  logging?: Partial<LoggingConfig>;
}

export interface RecordingProgress {
  secondsElapsed: number;
  totalSeconds: number;
  percentage: number;
}

export interface RecordingResult {
  success: boolean;
  filePath?: string;
  duration?: number;
  fileSize?: number | undefined;
  error?: string;
}

// ===== PUPPETEER ТИПЫ =====

export interface MediaStreamInfo {
  audioPackets: number;
  audioBytes: number;
  videoPackets?: number;
  videoBytes?: number;
}

export interface WebRTCStats {
  inboundRtp: MediaStreamInfo;
  outboundRtp: MediaStreamInfo;
  connectionState: string;
}

// ===== УТИЛИТЫ =====

export interface FileInfo {
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  recordingId: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ===== УПРОЩЕННЫЕ ТИПЫ =====

export interface SimpleRecordRequest {
  meetingUrl: string;
  duration?: number;
  format?: 'webm' | 'mp3' | 'wav';
  recordUntilEnd?: boolean; // Новая опция для записи до завершения встречи
  maxDuration?: number; // Максимальная продолжительность в секундах (по умолчанию 2 часа)
}

// ===== EXPRESS ТИПЫ =====

export interface CustomRequest extends Request {
  tempFiles?: string[];
  recordingId?: string;
}

export interface CustomResponse extends Response {
  // Дополнительные методы для API
}

// ===== СТРИМЫ =====

export interface AudioStream extends Readable {
  destroy(): this;
  cancel?(): void;
  pipe<T extends NodeJS.WritableStream>(destination: T): T;
}

export interface FileStream extends NodeJS.WritableStream {
  end(): this;
  on(event: string, listener: (...args: any[]) => void): this;
  pipe(destination: NodeJS.WritableStream): NodeJS.WritableStream;
}

// ===== ОШИБКИ =====

export class TelemostError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'TelemostError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends TelemostError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class RecordingError extends TelemostError {
  constructor(message: string, originalError?: Error) {
    super(message, 'RECORDING_ERROR', 500);
    this.name = 'RecordingError';
    if (originalError) {
      this.stack = originalError.stack || '';
    }
  }
}

// ===== КОНСТАНТЫ =====

export const SUPPORTED_FORMATS = ['webm', 'mp3', 'wav'] as const;
export type SupportedFormat = typeof SUPPORTED_FORMATS[number];

export const MIN_DURATION = 10;
export const MAX_DURATION = 3600;

export const DEFAULT_CONFIG: AppConfig = {
  browser: {
    // headless: 'new',
    args: [
      // '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      // '--mute-audio',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-client-side-phishing-detection',
      '--disable-component-extensions-with-background-pages',
      '--disable-hang-monitor',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-sync-preferences',
      '--disable-domain-reliability',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-web-resources',
      '--disable-xss-auditor',
      '--disable-plugins-discovery',
      '--disable-preconnect',
      '--disable-print-preview',
      '--disable-speech-api',
      '--disable-file-system',
      '--disable-permissions-api',
      '--disable-presentation-api',
      '--disable-remote-fonts',
      '--disable-shared-workers',
      '--disable-speech-synthesis-api',
      '--disable-webgl',
      '--disable-webgl2',
      '--disable-accelerated-2d-canvas',
      '--disable-accelerated-jpeg-decoding',
      '--disable-accelerated-mjpeg-decode',
      '--disable-accelerated-video-decode',
      '--disable-accelerated-video-encode',
      '--disable-gpu-sandbox',
      '--disable-software-rasterizer',
      '--disable-threaded-compositing',
      '--disable-threaded-scrolling',
      '--disable-checker-imaging',
      '--disable-new-content-rendering-timeout',
      '--disable-threaded-animation',
      '--disable-in-process-stack-traces',
      '--disable-histogram-customizer',
      '--disable-gl-extensions',
      '--disable-composited-antialiasing',
      '--disable-canvas-aa',
      '--disable-3d-apis',
      '--disable-app-list',
      '--password-store=basic',
      '--use-mock-keychain',
      '--no-pings',
      '--disable-x11',
      '--disable-dbus',
      '--disable-udev',
      '--disable-system-font-check',
      '--disable-font-subpixel-positioning',
      '--disable-lcd-text',
      '--disable-background-mode',
    ],
    // executablePath: '/usr/bin/chromium',
    // executablePath: puppeteer.executablePath(),
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  },
  page: {
    viewport: {
      width: 1280,
      height: 720,
    },
    timeout: 60000,
    waitForSelector: {
      timeout: 30000,
      polling: 1000,
    },
  },
  recording: {
    defaultDuration: 300,
    outputDir: './recordings',
    fileFormat: 'webm',
    progressInterval: 5000,
  },
  webrtc: {
    selectors: [
      'window.remoteStream',
      'window.localStream',
      'window.pc',
      'window.webrtc',
      'window.mediaStream',
      "document.querySelector('audio')",
      "document.querySelector('video')",
    ],
    stabilizationDelay: 2000,
  },
  logging: {
    enableConsoleLogs: true,
    enablePageErrors: true,
    enableProgress: true,
  },
};
