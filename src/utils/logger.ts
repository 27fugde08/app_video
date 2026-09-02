/**
 * CreatorOS - System Wide Centralized Error Logger & Safe Execution Utility
 * =========================================================================
 * Provides robust try-catch wrappers, structured logging, and error tracking
 * for every module across the application.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  moduleName: string;
  actionName: string;
  message: string;
  error?: Error | any;
  context?: Record<string, any>;
  stack?: string;
}

export interface SafeExecuteOptions<T> {
  onError?: (error: Error, entry: LogEntry) => void;
  showToast?: boolean;
  rethrow?: boolean;
  fallbackValue?: T;
}

class SystemLogger {
  private logsHistory: LogEntry[] = [];
  private maxHistory: number = 200;

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Log an error entry with detailed stack trace & module context
   */
  public error(
    moduleName: string,
    actionName: string,
    error: Error | any,
    context?: Record<string, any>
  ): LogEntry {
    const message = error?.message || String(error) || 'Lỗi không xác định';
    const stack = error?.stack || new Error().stack;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.ERROR,
      moduleName,
      actionName,
      message,
      error,
      context,
      stack
    };

    this.storeLog(entry);

    // Styled Console Output for Desktop DevTools & Debugging
    console.group(`❌ [ERROR] [${entry.timestamp}] Module: ${moduleName} -> Action: ${actionName}`);
    console.error(`Message: ${message}`);
    if (context) console.error('Context:', context);
    if (stack) console.error('Stack Trace:', stack);
    console.groupEnd();

    return entry;
  }

  /**
   * Log an info entry
   */
  public info(moduleName: string, actionName: string, message: string, context?: Record<string, any>): LogEntry {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.INFO,
      moduleName,
      actionName,
      message,
      context
    };

    this.storeLog(entry);
    console.log(`ℹ️ [INFO] [${entry.timestamp}] [${moduleName}::${actionName}] ${message}`, context || '');
    return entry;
  }

  /**
   * Log a warning entry
   */
  public warn(moduleName: string, actionName: string, message: string, context?: Record<string, any>): LogEntry {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level: LogLevel.WARN,
      moduleName,
      actionName,
      message,
      context
    };

    this.storeLog(entry);
    console.warn(`⚠️ [WARN] [${entry.timestamp}] [${moduleName}::${actionName}] ${message}`, context || '');
    return entry;
  }

  /**
   * Safely execute an asynchronous function with automatic try-catch logging
   * @example
   * const data = await sysLogger.tryCatchAsync('BatchDownloader', 'DownloadVideo', async () => {
   *   return await fetchVideoData(url);
   * }, fallbackData);
   */
  public async tryCatchAsync<T>(
    moduleName: string,
    actionName: string,
    fn: () => Promise<T>,
    options?: SafeExecuteOptions<T> | T
  ): Promise<T | undefined> {
    const opts: SafeExecuteOptions<T> =
      typeof options === 'object' && options !== null && ('onError' in options || 'showToast' in options || 'rethrow' in options)
        ? (options as SafeExecuteOptions<T>)
        : { fallbackValue: options as T };

    try {
      return await fn();
    } catch (err: any) {
      const logEntry = this.error(moduleName, actionName, err);

      if (opts.onError) {
        try {
          opts.onError(err, logEntry);
        } catch (callbackErr) {
          console.error('Error executing onError callback:', callbackErr);
        }
      }

      if (opts.rethrow) {
        throw err;
      }

      return opts.fallbackValue;
    }
  }

  /**
   * Safely execute a synchronous function with automatic try-catch logging
   * @example
   * const result = sysLogger.tryCatchSync('VideoMutator', 'ParseSettings', () => {
   *   return JSON.parse(configStr);
   * }, defaultConfig);
   */
  public tryCatchSync<T>(
    moduleName: string,
    actionName: string,
    fn: () => T,
    options?: SafeExecuteOptions<T> | T
  ): T | undefined {
    const opts: SafeExecuteOptions<T> =
      typeof options === 'object' && options !== null && ('onError' in options || 'showToast' in options || 'rethrow' in options)
        ? (options as SafeExecuteOptions<T>)
        : { fallbackValue: options as T };

    try {
      return fn();
    } catch (err: any) {
      const logEntry = this.error(moduleName, actionName, err);

      if (opts.onError) {
        try {
          opts.onError(err, logEntry);
        } catch (callbackErr) {
          console.error('Error executing onError callback:', callbackErr);
        }
      }

      if (opts.rethrow) {
        throw err;
      }

      return opts.fallbackValue;
    }
  }

  /**
   * Get log history for UI Terminal or Diagnostic Export
   */
  public getLogsHistory(): LogEntry[] {
    return [...this.logsHistory];
  }

  /**
   * Clear all logs
   */
  public clearLogs(): void {
    this.logsHistory = [];
  }

  private storeLog(entry: LogEntry): void {
    this.logsHistory.push(entry);
    if (this.logsHistory.length > this.maxHistory) {
      this.logsHistory.shift();
    }
  }
}

export const sysLogger = new SystemLogger();

/**
 * Shorthand helper functions for fast try-catch wrapping anywhere in code
 */

export async function safeAsync<T>(
  moduleName: string,
  actionName: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  return sysLogger.tryCatchAsync(moduleName, actionName, fn, fallback);
}

export function safeSync<T>(
  moduleName: string,
  actionName: string,
  fn: () => T,
  fallback?: T
): T | undefined {
  return sysLogger.tryCatchSync(moduleName, actionName, fn, fallback);
}
