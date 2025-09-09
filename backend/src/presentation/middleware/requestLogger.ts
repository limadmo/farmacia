import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Log da requisição inicial
  logger.info(`📥 ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
  });

  // Interceptar a resposta para logar o resultado
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // Escolher nível de log baseado no status
    let logLevel: 'info' | 'warn' | 'error' = 'info';
    let emoji = '📤';
    
    if (statusCode >= 400 && statusCode < 500) {
      logLevel = 'warn';
      emoji = '⚠️';
    } else if (statusCode >= 500) {
      logLevel = 'error';
      emoji = '❌';
    } else if (statusCode >= 200 && statusCode < 300) {
      emoji = '✅';
    }

    logger[logLevel](`${emoji} ${req.method} ${req.url} - ${statusCode} - ${duration}ms`, {
      statusCode,
      duration,
      contentLength: res.get('Content-Length'),
    });

    return originalSend.call(this, data);
  };

  next();
};
