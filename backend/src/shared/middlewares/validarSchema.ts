/**
 * Middleware de validação de schema com Zod
 * 
 * Valida os dados da requisição (body, query, params) contra um schema Zod
 */

import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';

export const validarSchema = (schema: ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Valida o corpo da requisição contra o schema
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      // Se for um erro de validação do Zod, retorna os erros formatados
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Dados inválidos',
          errors: error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      // Se for outro tipo de erro, passa para o próximo middleware
      next(error);
    }
  };
};