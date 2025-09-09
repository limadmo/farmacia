/**
 * Middleware de Proteção CSRF - Sistema de Farmácia
 * 
 * Implementa proteção contra ataques Cross-Site Request Forgery
 * usando tokens seguros e validação de origem
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '@/shared/utils/logger';

// Interface para requisições com CSRF
interface CSRFRequest extends Request {
  csrfToken?: string;
  generateCSRFToken?: () => string;
}

// Cache de tokens CSRF válidos (em produção, use Redis)
const tokenStore = new Map<string, { token: string; expires: Date; userId?: string }>();

// Limpar tokens expirados a cada hora
setInterval(() => {
  const now = new Date();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expires < now) {
      tokenStore.delete(key);
    }
  }
}, 3600000); // 1 hora

/**
 * Gerar token CSRF seguro
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Obter chave da sessão (IP + User-Agent + User ID se disponível)
 */
function getSessionKey(req: Request): string {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
             req.socket.remoteAddress || 
             'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const userId = (req as any).usuario?.id || 'anonymous';
  
  return crypto
    .createHash('sha256')
    .update(`${ip}:${userAgent}:${userId}`)
    .digest('hex');
}

/**
 * Middleware para gerar token CSRF
 */
export const generateCSRFToken = (req: CSRFRequest, res: Response, next: NextFunction) => {
  try {
    const sessionKey = getSessionKey(req);
    const token = generateToken();
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
    
    // Armazenar token
    tokenStore.set(sessionKey, {
      token,
      expires,
      userId: (req as any).usuario?.id
    });
    
    // Adicionar função para gerar token na requisição
    req.generateCSRFToken = () => token;
    req.csrfToken = token;
    
    // Adicionar token no header da resposta
    res.set('X-CSRF-Token', token);
    
    logger.debug('Token CSRF gerado', {
      sessionKey: sessionKey.substring(0, 8) + '...',
      userId: (req as any).usuario?.id
    });
    
    next();
  } catch (error) {
    logger.error('Erro ao gerar token CSRF:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Middleware para validar token CSRF
 */
export const validateCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Métodos seguros não precisam de validação CSRF
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    const sessionKey = getSessionKey(req);
    const tokenFromHeader = req.headers['x-csrf-token'] as string;
    const tokenFromBody = req.body?._csrf;
    const tokenFromQuery = req.query._csrf as string;
    
    // Obter token de qualquer origem
    const clientToken = tokenFromHeader || tokenFromBody || tokenFromQuery;
    
    if (!clientToken) {
      logger.warn('Token CSRF ausente', {
        ip: req.socket.remoteAddress,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      
      return res.status(403).json({
        error: 'Token CSRF obrigatório',
        message: 'Requisição bloqueada por segurança'
      });
    }
    
    // Verificar se o token existe e é válido
    const storedTokenData = tokenStore.get(sessionKey);
    
    if (!storedTokenData) {
      logger.warn('Token CSRF não encontrado na sessão', {
        ip: req.socket.remoteAddress,
        sessionKey: sessionKey.substring(0, 8) + '...'
      });
      
      return res.status(403).json({
        error: 'Token CSRF inválido',
        message: 'Token não encontrado ou expirado'
      });
    }
    
    // Verificar se o token não expirou
    if (storedTokenData.expires < new Date()) {
      tokenStore.delete(sessionKey);
      
      logger.warn('Token CSRF expirado', {
        ip: req.socket.remoteAddress,
        sessionKey: sessionKey.substring(0, 8) + '...'
      });
      
      return res.status(403).json({
        error: 'Token CSRF expirado',
        message: 'Token expirou, recarregue a página'
      });
    }
    
    // Comparação segura de tokens
    const expectedToken = storedTokenData.token;
    const tokensMatch = crypto.timingSafeEqual(
      Buffer.from(clientToken, 'hex'),
      Buffer.from(expectedToken, 'hex')
    );
    
    if (!tokensMatch) {
      logger.warn('Token CSRF inválido', {
        ip: req.socket.remoteAddress,
        method: req.method,
        path: req.path,
        expected: expectedToken.substring(0, 8) + '...',
        received: clientToken.substring(0, 8) + '...'
      });
      
      return res.status(403).json({
        error: 'Token CSRF inválido',
        message: 'Token não confere'
      });
    }
    
    logger.debug('Token CSRF validado com sucesso', {
      sessionKey: sessionKey.substring(0, 8) + '...',
      method: req.method,
      path: req.path
    });
    
    next();
  } catch (error) {
    logger.error('Erro na validação CSRF:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Middleware combinado que gera token para GET e valida para outros métodos
 */
export const csrfProtection = (req: CSRFRequest, res: Response, next: NextFunction) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Para métodos seguros, gerar token
    generateCSRFToken(req, res, next);
  } else {
    // Para outros métodos, validar token
    validateCSRFToken(req, res, next);
  }
};

/**
 * Endpoint para obter token CSRF
 */
export const getCSRFToken = (req: CSRFRequest, res: Response) => {
  const sessionKey = getSessionKey(req);
  const storedTokenData = tokenStore.get(sessionKey);
  
  if (storedTokenData && storedTokenData.expires > new Date()) {
    res.json({ csrfToken: storedTokenData.token });
  } else {
    // Gerar novo token
    const token = generateToken();
    const expires = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas
    
    tokenStore.set(sessionKey, {
      token,
      expires,
      userId: (req as any).usuario?.id
    });
    
    res.json({ csrfToken: token });
  }
};

/**
 * Middleware para adicionar proteção de origem
 */
export const originProtection = (req: Request, res: Response, next: NextFunction) => {
  // Verificar Referer para métodos que modificam dados
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const referer = req.headers.referer;
    const origin = req.headers.origin;
    const host = req.headers.host;
    
    // Lista de origens permitidas
    const allowedOrigins = [
      process.env.FRONTEND_DOMAIN,
      `http://localhost:3000`,
      `https://localhost:3000`,
      `http://${host}`,
      `https://${host}`
    ].filter(Boolean);
    
    const requestOrigin = origin || (referer && new URL(referer).origin);
    
    if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
      logger.warn('Origem não permitida', {
        requestOrigin,
        allowedOrigins,
        ip: req.socket.remoteAddress,
        path: req.path
      });
      
      return res.status(403).json({
        error: 'Origem não permitida',
        message: 'Requisição de origem não autorizada'
      });
    }
  }
  
  next();
};

/**
 * Configuração para desenvolvimento (menos restritiva)
 */
export const devCSRFProtection = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'development') {
    // Em desenvolvimento, apenas log warnings
    logger.debug('CSRF protection em modo desenvolvimento');
    return next();
  }
  
  // Em produção, usar proteção completa
  csrfProtection(req as CSRFRequest, res, next);
};

/**
 * Middleware para SameSite cookies (proteção adicional)
 */
export const sameSiteProtection = (req: Request, res: Response, next: NextFunction) => {
  // Configurar cookies com SameSite
  res.cookie = ((originalCookie) => {
    return function(name: string, value: any, options: any = {}) {
      options.sameSite = options.sameSite || 'strict';
      options.secure = options.secure !== false && process.env.NODE_ENV === 'production';
      options.httpOnly = options.httpOnly !== false;
      
      return originalCookie.call(this, name, value, options);
    };
  })(res.cookie);
  
  next();
};