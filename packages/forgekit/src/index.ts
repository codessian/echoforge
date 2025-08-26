import { EventEmitter as NodeEventEmitter } from 'events';
import { createLogger as createPinoLogger } from '@org/logger';
import { env } from '@org/config';

// Re-export EventEmitter from Node.js events module
export class EventEmitter extends NodeEventEmitter {
  constructor(options?: ConstructorParameters<typeof NodeEventEmitter>[0]) {
    super(options);
    // Set max listeners to avoid memory leak warnings in development
    this.setMaxListeners(100);
  }
}

// Enhanced logger factory
export interface LoggerOptions {
  name?: string;
  level?: string;
  context?: Record<string, any>;
}

export function createLogger(options: LoggerOptions = {}) {
  const { name = 'forgekit', level = env.LOG_LEVEL, context = {} } = options;
  
  const logger = createPinoLogger({
    name,
    level,
    ...context,
  });

  return logger;
}

// Utility functions
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Type utilities
export type Awaitable<T> = T | Promise<T>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Default exports
export default {
  EventEmitter,
  createLogger,
  sleep,
  debounce,
  throttle,
};