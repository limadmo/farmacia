import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/application/services/AuthService';
import { ValidationError } from '@/presentation/middleware/errorHandler';
import { logger } from '@/shared/utils/logger';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { login, senha } = req.body;

      if (!login || !senha) {
        throw new ValidationError('Login e senha são obrigatórios');
      }

      const resultado = await this.authService.login({ login, senha });

      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError('Refresh token é obrigatório');
      }

      const resultado = await this.authService.refresh({ refreshToken });

      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      await this.authService.logout(refreshToken);

      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const usuario = await this.authService.obterUsuarioLogado(req.usuario!.id);

      res.json(usuario);
    } catch (error) {
      next(error);
    }
  }

  async alterarSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { senhaAtual, novaSenha, confirmaNovaSenha } = req.body;

      await this.authService.alterarSenha(req.usuario!.id, {
        senhaAtual,
        novaSenha,
        confirmaNovaSenha,
      });

      res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
      next(error);
    }
  }
}
