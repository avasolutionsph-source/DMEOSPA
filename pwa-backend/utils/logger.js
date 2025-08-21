import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Logger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    const logEntry = {
      timestamp,
      level,
      message,
      service: 'pwa-backend',
      ...meta
    };
    
    // Console output
    const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (level === 'error') {
      console.error(consoleMessage, meta);
    } else if (level === 'warn') {
      console.warn(consoleMessage, meta);
    } else {
      console.log(consoleMessage, meta);
    }
    
    return JSON.stringify(logEntry) + '\n';
  }

  writeToFile(filename, content) {
    try {
      const filepath = path.join(this.logDir, filename);
      fs.appendFileSync(filepath, content);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  info(message, meta = {}) {
    const logContent = this.formatMessage('info', message, meta);
    this.writeToFile('pwa-info.log', logContent);
  }

  warn(message, meta = {}) {
    const logContent = this.formatMessage('warn', message, meta);
    this.writeToFile('pwa-warning.log', logContent);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      ...meta
    } : meta;
    
    const logContent = this.formatMessage('error', message, errorMeta);
    this.writeToFile('pwa-error.log', logContent);
  }

  sync(message, meta = {}) {
    const logContent = this.formatMessage('sync', message, meta);
    this.writeToFile('pwa-sync.log', logContent);
  }

  auth(message, meta = {}) {
    const logContent = this.formatMessage('auth', message, meta);
    this.writeToFile('pwa-auth.log', logContent);
  }

  api(method, endpoint, statusCode, responseTime, userId = null, meta = {}) {
    const message = `${method} ${endpoint} - ${statusCode} (${responseTime}ms)`;
    const apiMeta = {
      method,
      endpoint,
      statusCode,
      responseTime,
      userId,
      ...meta
    };
    
    const logContent = this.formatMessage('api', message, apiMeta);
    this.writeToFile('pwa-api.log', logContent);
  }
}

export default new Logger();