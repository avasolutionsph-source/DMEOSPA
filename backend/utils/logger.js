// Simple logger utility for backend

class Logger {
  constructor(name = 'APP') {
    this.name = name;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] [${this.name}] ${message}${dataStr}`;
  }

  info(message, data) {
    console.log(this.formatMessage('INFO', message, data));
  }

  warn(message, data) {
    console.warn(this.formatMessage('WARN', message, data));
  }

  error(message, data) {
    console.error(this.formatMessage('ERROR', message, data));
  }

  debug(message, data) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(this.formatMessage('DEBUG', message, data));
    }
  }
}

// Export singleton instance
const logger = new Logger();
export default logger;

// Also export class for creating named loggers
export { Logger };