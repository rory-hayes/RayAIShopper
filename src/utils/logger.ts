// Production-safe logging utility
// Only logs in development mode, silent in production

interface Logger {
  info: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
}

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV

class ProductionLogger implements Logger {
  private shouldLog = isDevelopment

  info(message: string, ...args: any[]): void {
    if (this.shouldLog) {
      console.log(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, ...args: any[]): void {
    // Always log errors, even in production
    console.error(`[ERROR] ${message}`, ...args)
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog) {
      console.log(`[DEBUG] ${message}`, ...args)
    }
  }
}

// Export singleton logger instance
export const logger = new ProductionLogger()

// Helper functions for specific contexts
export const chatLogger = {
  info: (message: string, ...args: any[]) => logger.info(`CHAT: ${message}`, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(`CHAT: ${message}`, ...args),
  error: (message: string, ...args: any[]) => logger.error(`CHAT: ${message}`, ...args),
  debug: (message: string, ...args: any[]) => logger.debug(`CHAT: ${message}`, ...args),
}

export const wizardLogger = {
  info: (message: string, ...args: any[]) => logger.info(`WIZARD: ${message}`, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(`WIZARD: ${message}`, ...args),
  error: (message: string, ...args: any[]) => logger.error(`WIZARD: ${message}`, ...args),
  debug: (message: string, ...args: any[]) => logger.debug(`WIZARD: ${message}`, ...args),
}

export const stepLogger = {
  info: (step: string, message: string, ...args: any[]) => logger.info(`${step}: ${message}`, ...args),
  warn: (step: string, message: string, ...args: any[]) => logger.warn(`${step}: ${message}`, ...args),
  error: (step: string, message: string, ...args: any[]) => logger.error(`${step}: ${message}`, ...args),
  debug: (step: string, message: string, ...args: any[]) => logger.debug(`${step}: ${message}`, ...args),
} 