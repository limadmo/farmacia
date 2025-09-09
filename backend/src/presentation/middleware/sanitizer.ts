/**
 * Sanitizador de Dados - Sistema de Farmácia
 * 
 * Implementa sanitização robusta contra XSS e outros ataques
 */

import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { logger } from '@/shared/utils/logger';

/**
 * Configuração do DOMPurify para máxima segurança
 */
const purifyConfig = {
  ALLOWED_TAGS: [], // Nenhuma tag HTML permitida
  ALLOWED_ATTR: [], // Nenhum atributo permitido
  KEEP_CONTENT: true, // Manter o conteúdo, removendo apenas as tags
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false
};

/**
 * Funções de sanitização
 */
export class Sanitizer {
  /**
   * Remove completamente HTML e scripts
   */
  static stripHTML(input: string): string {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input, purifyConfig);
  }

  /**
   * Escapa caracteres HTML
   */
  static escapeHTML(input: string): string {
    if (typeof input !== 'string') return input;
    return validator.escape(input);
  }

  /**
   * Sanitiza para SQL (remove aspas e caracteres perigosos)
   */
  static sanitizeSQL(input: string): string {
    if (typeof input !== 'string') return input;
    
    // Remove ou escapa caracteres perigosos para SQL
    return input
      .replace(/'/g, "''") // Escapar aspas simples
      .replace(/;/g, '') // Remover ponto e vírgula
      .replace(/--/g, '') // Remover comentários SQL
      .replace(/\/\*/g, '') // Remover início de comentário de bloco
      .replace(/\*\//g, '') // Remover fim de comentário de bloco
      .replace(/union/gi, '') // Remover UNION
      .replace(/select/gi, '') // Remover SELECT
      .replace(/insert/gi, '') // Remover INSERT
      .replace(/update/gi, '') // Remover UPDATE
      .replace(/delete/gi, '') // Remover DELETE
      .replace(/drop/gi, '') // Remover DROP
      .replace(/create/gi, '') // Remover CREATE
      .replace(/alter/gi, '') // Remover ALTER
      .replace(/exec/gi, '') // Remover EXEC
      .replace(/execute/gi, ''); // Remover EXECUTE
  }

  /**
   * Normaliza espaços em branco
   */
  static normalizeWhitespace(input: string): string {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/\s+/g, ' ');
  }

  /**
   * Remove caracteres de controle
   */
  static removeControlChars(input: string): string {
    if (typeof input !== 'string') return input;
    // Remove caracteres de controle (exceto \n, \r, \t)
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Sanitiza número de telefone
   */
  static sanitizePhone(input: string): string {
    if (typeof input !== 'string') return input;
    return input.replace(/\D/g, ''); // Manter apenas dígitos
  }

  /**
   * Sanitiza CPF/CNPJ
   */
  static sanitizeDocument(input: string): string {
    if (typeof input !== 'string') return input;
    return input.replace(/\D/g, ''); // Manter apenas dígitos
  }

  /**
   * Sanitiza email
   */
  static sanitizeEmail(input: string): string {
    if (typeof input !== 'string') return input;
    
    const normalized = validator.normalizeEmail(input.toLowerCase());
    
    // Validar se é um email válido após normalização
    if (!normalized || !validator.isEmail(normalized)) {
      throw new Error('Email inválido');
    }
    
    return normalized;
  }

  /**
   * Sanitiza nome de arquivo
   */
  static sanitizeFilename(input: string): string {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '') // Apenas caracteres seguros
      .replace(/\.\./g, '') // Remover path traversal
      .substring(0, 255); // Limitar tamanho
  }

  /**
   * Sanitiza URL
   */
  static sanitizeURL(input: string): string {
    if (typeof input !== 'string') return input;
    
    try {
      const url = new URL(input);
      
      // Permitir apenas protocolos seguros
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Protocolo não permitido');
      }
      
      return url.href;
    } catch {
      throw new Error('URL inválida');
    }
  }

  /**
   * Sanitização completa de objeto
   */
  static sanitizeObject(obj: any, depth = 0): any {
    // Prevenir recursão infinita
    if (depth > 10) {
      logger.warn('Profundidade máxima de sanitização atingida');
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, depth + 1));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          // Sanitizar a chave também
          const sanitizedKey = this.sanitizeString(key);
          sanitized[sanitizedKey] = this.sanitizeObject(obj[key], depth + 1);
        }
      }
      
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Sanitização básica de string
   */
  private static sanitizeString(input: string): string {
    let sanitized = input;
    
    // Aplicar sanitizações em ordem
    sanitized = this.removeControlChars(sanitized);
    sanitized = this.stripHTML(sanitized);
    sanitized = this.normalizeWhitespace(sanitized);
    
    return sanitized;
  }
}

/**
 * Middleware para sanitizar body da requisição
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = Sanitizer.sanitizeObject(req.body);
      
      logger.debug('Body sanitizado', {
        endpoint: req.path,
        method: req.method
      });
    }
    
    next();
  } catch (error) {
    logger.error('Erro na sanitização do body:', error);
    
    res.status(400).json({
      error: 'Dados inválidos',
      message: 'Os dados fornecidos contêm caracteres não permitidos'
    });
  }
};

/**
 * Middleware para sanitizar query parameters
 */
export const sanitizeQuery = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.query && typeof req.query === 'object') {
      req.query = Sanitizer.sanitizeObject(req.query);
      
      logger.debug('Query sanitizada', {
        endpoint: req.path,
        method: req.method
      });
    }
    
    next();
  } catch (error) {
    logger.error('Erro na sanitização da query:', error);
    
    res.status(400).json({
      error: 'Parâmetros inválidos',
      message: 'Os parâmetros fornecidos contêm caracteres não permitidos'
    });
  }
};

/**
 * Middleware para sanitizar parâmetros da URL
 */
export const sanitizeParams = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.params && typeof req.params === 'object') {
      req.params = Sanitizer.sanitizeObject(req.params);
      
      logger.debug('Parâmetros sanitizados', {
        endpoint: req.path,
        method: req.method
      });
    }
    
    next();
  } catch (error) {
    logger.error('Erro na sanitização dos parâmetros:', error);
    
    res.status(400).json({
      error: 'Parâmetros inválidos',
      message: 'Os parâmetros da URL contêm caracteres não permitidos'
    });
  }
};

/**
 * Middleware completo de sanitização
 */
export const sanitizeAll = (req: Request, res: Response, next: NextFunction) => {
  sanitizeParams(req, res, (err1) => {
    if (err1) return next(err1);
    
    sanitizeQuery(req, res, (err2) => {
      if (err2) return next(err2);
      
      sanitizeBody(req, res, next);
    });
  });
};

/**
 * Middleware para detectar tentativas de XSS
 */
export const detectXSS = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<applet/gi,
    /<meta/gi,
    /<link/gi,
    /expression\(/gi,
    /eval\(/gi,
    /alert\(/gi,
    /confirm\(/gi,
    /prompt\(/gi
  ];

  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers
  });

  for (const pattern of xssPatterns) {
    if (pattern.test(requestData)) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                 req.socket.remoteAddress || 
                 'unknown';
      
      logger.warn('Tentativa de XSS detectada', {
        ip,
        endpoint: req.path,
        method: req.method,
        pattern: pattern.source,
        userAgent: req.headers['user-agent']
      });

      return res.status(400).json({
        error: 'Conteúdo não permitido',
        message: 'Os dados fornecidos contêm código malicioso'
      });
    }
  }

  next();
};