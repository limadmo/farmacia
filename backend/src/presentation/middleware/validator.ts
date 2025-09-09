/**
 * Middleware de Validação Global - Sistema de Farmácia
 * 
 * Fornece validação centralizada usando Zod e sanitização de dados
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '@/shared/utils/logger';

/**
 * Middleware para validar requisições com schema Zod
 */
export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar e transformar dados
      const validatedData = await schema.parseAsync(req.body);
      
      // Substituir body com dados validados e sanitizados
      req.body = validatedData;
      
      // Log de validação bem-sucedida
      logger.debug('Validação bem-sucedida', {
        endpoint: req.path,
        method: req.method
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Log de erro de validação
        logger.warn('Erro de validação', {
          endpoint: req.path,
          errors: error.issues,
          ip: getClientIp(req)
        });

        return res.status(400).json({
          error: 'Dados inválidos',
          message: 'Os dados fornecidos não são válidos',
          details: error.issues.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      // Erro inesperado
      logger.error('Erro inesperado na validação:', error);
      next(error);
    }
  };
};

/**
 * Middleware para validar parâmetros de query
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Erro de validação de query', {
          endpoint: req.path,
          errors: error.issues
        });

        return res.status(400).json({
          error: 'Parâmetros inválidos',
          message: 'Os parâmetros da consulta não são válidos',
          details: error.issues
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware para validar parâmetros de rota
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync(req.params);
      req.params = validatedData as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Erro de validação de parâmetros', {
          endpoint: req.path,
          errors: error.issues
        });

        return res.status(400).json({
          error: 'Parâmetros inválidos',
          message: 'Os parâmetros da rota não são válidos',
          details: error.issues
        });
      }
      next(error);
    }
  };
};

/**
 * Funções auxiliares de sanitização
 */
export const sanitizers = {
  /**
   * Sanitiza HTML para prevenir XSS
   */
  html: (value: string): string => {
    return DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  },

  /**
   * Escapa caracteres especiais HTML
   */
  escape: (value: string): string => {
    return validator.escape(value);
  },

  /**
   * Remove espaços extras e normaliza
   */
  normalize: (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  },

  /**
   * Sanitiza email
   */
  email: (value: string): string => {
    return validator.normalizeEmail(value) || value;
  },

  /**
   * Remove caracteres não numéricos
   */
  numeric: (value: string): string => {
    return value.replace(/\D/g, '');
  },

  /**
   * Sanitiza nome de arquivo
   */
  filename: (value: string): string => {
    return value.replace(/[^a-zA-Z0-9._-]/g, '');
  },

  /**
   * Sanitiza URL
   */
  url: (value: string): string => {
    try {
      const url = new URL(value);
      return url.href;
    } catch {
      return '';
    }
  }
};

/**
 * Schemas de validação comuns
 */
export const commonSchemas = {
  /**
   * Schema para UUID
   */
  uuid: z.string().uuid('ID inválido'),

  /**
   * Schema para paginação
   */
  pagination: z.object({
    page: z.coerce.number().min(1).max(1000).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    orderBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc')
  }),

  /**
   * Schema para busca
   */
  search: z.object({
    search: z.string()
      .max(100, 'Busca muito longa')
      .transform(val => sanitizers.escape(val))
      .optional()
  }),

  /**
   * Schema para datas
   */
  dateRange: z.object({
    dataInicio: z.coerce.date().optional(),
    dataFim: z.coerce.date().optional()
  }).refine(data => {
    if (data.dataInicio && data.dataFim) {
      return data.dataInicio <= data.dataFim;
    }
    return true;
  }, {
    message: 'Data inicial deve ser anterior à data final'
  }),

  /**
   * Schema para valores monetários
   */
  money: z.number()
    .min(0, 'Valor não pode ser negativo')
    .max(999999999.99, 'Valor muito alto')
    .multipleOf(0.01, 'Valor deve ter no máximo 2 casas decimais'),

  /**
   * Schema para telefone brasileiro
   */
  telefone: z.string()
    .transform(val => sanitizers.numeric(val))
    .refine(val => val.length === 10 || val.length === 11, 'Telefone inválido'),

  /**
   * Schema para CPF
   */
  cpf: z.string()
    .transform(val => sanitizers.numeric(val))
    .refine(val => val.length === 11 && validarCPF(val), 'CPF inválido'),

  /**
   * Schema para CNPJ
   */
  cnpj: z.string()
    .transform(val => sanitizers.numeric(val))
    .refine(val => val.length === 14 && validarCNPJ(val), 'CNPJ inválido'),

  /**
   * Schema para email
   */
  email: z.string()
    .email('Email inválido')
    .transform(val => sanitizers.email(val))
};

/**
 * Validador de CPF
 */
function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;

  return true;
}

/**
 * Validador de CNPJ
 */
function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/\D/g, '');

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Validação dos dígitos verificadores
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  // Primeiro dígito
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpj.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  const digito1 = resto < 2 ? 0 : 11 - resto;
  if (digito1 !== parseInt(cnpj.charAt(12))) return false;

  // Segundo dígito
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpj.charAt(i)) * pesos2[i];
  }
  resto = soma % 11;
  const digito2 = resto < 2 ? 0 : 11 - resto;
  if (digito2 !== parseInt(cnpj.charAt(13))) return false;

  return true;
}

/**
 * Obter IP do cliente
 */
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.socket.remoteAddress || 
         'unknown';
}

/**
 * Middleware para sanitizar todas as strings do body
 */
export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizers.html(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitizeObject(req.body);
  next();
};