/**
 * Middleware de Autenticação - Sistema de Farmácia
 * 
 * Middleware para verificar tokens JWT nas requisições
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Interface para requisições autenticadas
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    nome: string;
    tipo: string;
  };
}

/**
 * Middleware para autenticar token JWT
 */
export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Token de acesso requerido' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET not configured');
    res.status(500).json({ error: 'Configuração de segurança inválida' });
    return;
  }

  jwt.verify(token, jwtSecret, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Token inválido' });
      return;
    }

    req.user = user;
    next();
  });
};

/**
 * Middleware para verificar roles específicas
 */
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    if (!roles.includes(req.user.tipo)) {
      res.status(403).json({ error: 'Permissão insuficiente' });
      return;
    }

    next();
  };
};