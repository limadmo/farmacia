import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

export class BusinessError extends Error implements AppError {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'BusinessError';

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends BusinessError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends BusinessError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends BusinessError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let { statusCode = 500, message } = error;

  // Log do erro
  if (statusCode >= 500) {
    logger.error('❌ Erro interno do servidor:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  } else {
    logger.warn('⚠️ Erro de cliente:', {
      error: error.message,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  // Tratar erros específicos do Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Registro já existe com estes dados';
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Registro não encontrado';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Violação de chave estrangeira';
        break;
      default:
        statusCode = 400;
        message = 'Erro de validação no banco de dados';
    }
  }

  // Tratar erros de validação do Joi
  if (error.name === 'ValidationError' && (error as any).details) {
    statusCode = 400;
    message = (error as any).details.map((detail: any) => detail.message).join(', ');
  }

  // Não expor detalhes internos em produção
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    message = 'Erro interno do servidor';
  }

  res.status(statusCode).json({
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && {
      stack: error.stack,
    }),
  });
};
