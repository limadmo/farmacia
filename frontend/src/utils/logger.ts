/**
 * Logger para Frontend - Sistema de Farmácia
 * 
 * Sistema de logging simples para o frontend
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMessage {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.isDevelopment && level === 'debug') return;

    const logMessage: LogMessage = {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Console output com cores
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    };
    const reset = '\x1b[0m';

    const prefix = `${colors[level]}[${level.toUpperCase()}]${reset}`;
    
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }

    // Em produção, poderia enviar logs para serviço externo
    if (!this.isDevelopment && level === 'error') {
      // Enviar para serviço de logging
      this.sendToLoggingService(logMessage);
    }
  }

  private sendToLoggingService(logMessage: LogMessage) {
    // Implementar envio para serviço de logging
    // Por exemplo: Sentry, LogRocket, etc.
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

export const logger = new Logger();