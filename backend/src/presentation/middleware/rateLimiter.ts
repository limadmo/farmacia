/**
 * Rate Limiter - Sistema de Farmácia
 * 
 * Implementa limitação de taxa para proteger contra ataques de força bruta
 * e uso excessivo de recursos
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '@/shared/utils/logger';

/**
 * Função para obter IP do cliente
 */
const getClientId = (req: Request): string => {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.socket.remoteAddress || 
         'unknown';
};

/**
 * Rate limiter para login - Muito restritivo
 */
export const loginLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: {
    error: 'Muitas tentativas de login',
    message: 'Tente novamente em 15 minutos',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para login: IP ${ip}`, {
      ip,
      endpoint: req.path,
      userAgent: req.headers['user-agent']
    });
  },
  // Resetar contador após login bem-sucedido
  skipSuccessfulRequests: true
});

/**
 * Rate limiter para refresh token - Moderado
 */
export const refreshLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 renovações por IP
  message: {
    error: 'Muitas renovações de token',
    message: 'Tente novamente em alguns minutos',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para refresh token: IP ${ip}`, {
      ip,
      endpoint: req.path
    });
  }
});

/**
 * Rate limiter para criação de usuários - Muito restritivo
 */
export const createUserLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 criações por IP por hora
  message: {
    error: 'Limite de criação de usuários excedido',
    message: 'Máximo 3 usuários por hora por IP',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para criação de usuário: IP ${ip}`, {
      ip,
      endpoint: req.path,
      body: req.body ? Object.keys(req.body) : []
    });
  }
});

/**
 * Rate limiter para alteração de senha - Restritivo
 */
export const changePasswordLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 alterações por IP por hora
  message: {
    error: 'Muitas alterações de senha',
    message: 'Máximo 5 alterações por hora',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para alteração de senha: IP ${ip}`, {
      ip,
      endpoint: req.path
    });
  }
});

/**
 * Rate limiter para operações de criação - Moderado
 */
export const createLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // 20 criações por IP
  message: {
    error: 'Muitas operações de criação',
    message: 'Limite de criações excedido, tente novamente em alguns minutos',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para criações: IP ${ip}`, {
      ip,
      endpoint: req.path
    });
  }
});

/**
 * Rate limiter para operações de atualização - Moderado
 */
export const updateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 50, // 50 atualizações por IP
  message: {
    error: 'Muitas operações de atualização',
    message: 'Limite de atualizações excedido, tente novamente em alguns minutos',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para atualizações: IP ${ip}`, {
      ip,
      endpoint: req.path
    });
  }
});

/**
 * Rate limiter para operações de busca - Liberal
 */
export const searchLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // 100 buscas por minuto
  message: {
    error: 'Muitas operações de busca',
    message: 'Limite de buscas excedido, aguarde um momento',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para buscas: IP ${ip}`, {
      ip,
      endpoint: req.path,
      query: req.query
    });
  }
});

/**
 * Rate limiter para operações de exclusão - Muito restritivo
 */
export const deleteLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 exclusões por hora
  message: {
    error: 'Muitas operações de exclusão',
    message: 'Limite de exclusões excedido por segurança',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para exclusões: IP ${ip}`, {
      ip,
      endpoint: req.path,
      params: req.params
    });
  }
});

/**
 * Rate limiter geral para API - Liberal
 */
export const generalLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisições por IP
  message: {
    error: 'Limite de requisições excedido',
    message: 'Muitas requisições, aguarde alguns minutos',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit geral atingido: IP ${ip}`, {
      ip,
      endpoint: req.path,
      method: req.method
    });
  }
});

/**
 * Rate limiter para uploads - Restritivo
 */
export const uploadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // 10 uploads por IP
  message: {
    error: 'Muitos uploads',
    message: 'Limite de uploads excedido, aguarde alguns minutos',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para uploads: IP ${ip}`, {
      ip,
      endpoint: req.path,
      fileSize: req.headers['content-length']
    });
  }
});

/**
 * Rate limiter para relatórios - Moderado
 */
export const reportLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 20, // 20 relatórios por IP
  message: {
    error: 'Muitas consultas de relatórios',
    message: 'Limite de relatórios excedido, aguarde alguns minutos',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientId,
  onLimitReached: (req: Request) => {
    const ip = getClientId(req);
    logger.warn(`Rate limit atingido para relatórios: IP ${ip}`, {
      ip,
      endpoint: req.path,
      query: req.query
    });
  }
});

/**
 * Rate limiter específico por usuário (além do IP)
 */
export const createUserBasedLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Limite excedido',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request): string => {
      // Usar combinação de IP + user ID se disponível
      const ip = getClientId(req);
      const userId = req.usuario?.id || 'anonymous';
      return `${ip}:${userId}`;
    },
    onLimitReached: (req: Request) => {
      const ip = getClientId(req);
      const userId = req.usuario?.id || 'anonymous';
      logger.warn(`Rate limit baseado em usuário atingido: ${ip}:${userId}`, {
        ip,
        userId,
        endpoint: req.path
      });
    }
  });
};

/**
 * Middleware para logging de requests suspeitos
 */
export const suspiciousActivityLogger = (req: Request, res: Response, next: Function) => {
  const ip = getClientId(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Detectar padrões suspeitos
  const suspiciousPatterns = [
    /script/i,
    /union.*select/i,
    /drop.*table/i,
    /<script/i,
    /javascript:/i,
    /eval\(/i,
    /alert\(/i
  ];

  const requestData = JSON.stringify(req.body) + JSON.stringify(req.query) + req.url;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestData)) {
      logger.warn('Atividade suspeita detectada', {
        ip,
        userAgent,
        endpoint: req.path,
        method: req.method,
        pattern: pattern.source,
        data: requestData.substring(0, 200) // Limitar tamanho do log
      });
      break;
    }
  }

  next();
};