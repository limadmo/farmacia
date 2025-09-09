import { Request, Response, NextFunction } from 'express';
import { TipoUsuario } from '@prisma/client';
import { UsuarioService } from '@/application/services/UsuarioService';
import { ValidationError, NotFoundError } from '@/presentation/middleware/errorHandler';

export class UsuarioController {
  private usuarioService: UsuarioService;

  constructor() {
    this.usuarioService = new UsuarioService();
  }

  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tipo, ativo, nome, login } = req.query;
      
      const filtros: any = {};
      if (tipo) filtros.tipo = tipo as TipoUsuario;
      if (ativo !== undefined) filtros.ativo = ativo === 'true';
      if (nome) filtros.nome = nome as string;
      if (login) filtros.login = login as string;
      
      const usuarios = await this.usuarioService.listarTodos(filtros);
      
      res.json({
        success: true,
        data: usuarios
      });
    } catch (error) {
      next(error);
    }
  }

  async obterPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ValidationError('ID do usuário é obrigatório');
      }

      const usuario = await this.usuarioService.obterPorId(id);
      
      if (!usuario) {
        throw new NotFoundError('Usuário não encontrado');
      }

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      next(error);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nome, login, senha, tipo } = req.body;
      const { tipo: tipoUsuarioCriador } = (req as any).usuario;

      // Validações básicas
      if (!nome || !login || !senha) {
        throw new ValidationError('Nome, login e senha são obrigatórios');
      }

      if (!Object.values(TipoUsuario).includes(tipo)) {
        throw new ValidationError('Tipo de usuário inválido');
      }

      const usuario = await this.usuarioService.criar({
        nome,
        login,
        senha,
        tipo,
      }, tipoUsuarioCriador);

      res.status(201).json({
        success: true,
        data: usuario
      });
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { nome, tipo, ativo } = req.body;
      const { tipo: tipoUsuarioAtualizador } = (req as any).usuario;

      if (!id) {
        throw new ValidationError('ID do usuário é obrigatório');
      }

      const usuario = await this.usuarioService.atualizar(id, {
        nome,
        tipo,
        ativo,
      }, tipoUsuarioAtualizador);

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      next(error);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { id: usuarioId, tipo: tipoUsuarioExcluidor } = (req as any).usuario;

      if (!id) {
        throw new ValidationError('ID do usuário é obrigatório');
      }

      // Não permitir excluir o próprio usuário
      if (id === usuarioId) {
        throw new ValidationError('Não é possível excluir seu próprio usuário');
      }

      await this.usuarioService.excluir(id, tipoUsuarioExcluidor);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async listarPerfis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const perfis = [
        { codigo: TipoUsuario.ADMINISTRADOR, descricao: 'Administrador' },
        { codigo: TipoUsuario.VENDEDOR, descricao: 'Vendedor' },
      ];

      res.json(perfis);
    } catch (error) {
      next(error);
    }
  }

  async getTiposGerenciaveis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tipo: tipoUsuario } = (req as any).usuario;
      
      if (!tipoUsuario) {
        throw new ValidationError('Tipo de usuário não informado');
      }

      const tipos = await this.usuarioService.getTiposGerenciaveis(tipoUsuario);
      
      res.json({
        success: true,
        data: tipos
      });
    } catch (error) {
      next(error);
    }
  }

  async listarGerenciaveis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: usuarioId, tipo: tipoUsuario } = (req as any).usuario;
      
      if (!tipoUsuario) {
        throw new ValidationError('Tipo de usuário não informado');
      }

      const usuarios = await this.usuarioService.listarUsuariosGerenciaveis(tipoUsuario);
      
      res.json({
        success: true,
        data: usuarios
      });
    } catch (error) {
      next(error);
    }
  }

  async alterarSenha(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { senha } = req.body;
      const { tipo: tipoUsuarioAlterador } = (req as any).usuario;

      if (!id) {
        throw new ValidationError('ID do usuário é obrigatório');
      }

      if (!senha) {
        throw new ValidationError('Nova senha é obrigatória');
      }

      await this.usuarioService.alterarSenha(id, senha, tipoUsuarioAlterador);

      res.json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }
}
