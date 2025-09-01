import { Request, Response, NextFunction } from 'express';
import { TipoUsuario } from '@prisma/client';
import { ForbiddenError } from './errorHandler';

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.usuario) {
    throw new ForbiddenError('Usuário não autenticado');
  }

  if (req.usuario.tipo !== TipoUsuario.ADMINISTRADOR) {
    throw new ForbiddenError('Acesso negado. Apenas administradores podem acessar este recurso.');
  }

  next();
};
