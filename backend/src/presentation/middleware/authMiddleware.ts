import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/application/services/AuthService';
import { UnauthorizedError } from './errorHandler';
import { AuthenticatedRequest } from '@/shared/types/auth';

// Estender a interface Request do Express
declare global {
  namespace Express {
    interface Request extends AuthenticatedRequest {}
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Token de acesso não fornecido');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedError('Formato de token inválido');
    }

    const authService = new AuthService();
    const payload = authService.verifyToken(token);

    // Adicionar informações do usuário à requisição
    req.usuario = {
      id: payload.usuarioId,
      login: payload.login,
      tipo: payload.tipo,
    };

    next();
  } catch (error) {
    next(error);
  }
};
