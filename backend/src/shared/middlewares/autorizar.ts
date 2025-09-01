import { Request, Response, NextFunction } from 'express';
import { TipoUsuario } from '@prisma/client';
import { ForbiddenError } from '@/presentation/middleware/errorHandler';

/**
 * Middleware para autorização baseada em tipos de usuário
 * @param tiposPermitidos Array de tipos de usuário permitidos para acessar o recurso
 */
export const autorizar = (tiposPermitidos: TipoUsuario[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      throw new ForbiddenError('Usuário não autenticado');
    }

    if (!tiposPermitidos.includes(req.usuario.tipo)) {
      throw new ForbiddenError('Acesso negado. Você não tem permissão para acessar este recurso.');
    }

    next();
  };
};