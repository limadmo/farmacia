// Middleware de Permissões
// Gerencia controle de acesso baseado em hierarquia de usuários

import { Request, Response, NextFunction } from 'express';
import { TipoUsuario } from '@prisma/client';

interface AuthRequest extends Request {
  user?: {
    id: string;
    nome: string;
    login: string;
    tipo: TipoUsuario;
    farmaciaId?: string;
  };
}
import { 
  temPermissaoModulo, 
  temPermissaoAuditoria, 
  temPermissaoFinanceira,
  PERMISSOES_MODULOS 
} from '../../constants/permissions';

// Middleware para verificar se usuário é administrador
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  if (req.user.tipo !== TipoUsuario.ADMINISTRADOR) {
    res.status(403).json({ 
      erro: 'Acesso negado. Apenas administradores podem acessar este recurso.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se usuário é gerente ou superior
export const requireGerente = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  const tiposPermitidos: TipoUsuario[] = [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE];
  if (!tiposPermitidos.includes(req.user.tipo)) {
    res.status(403).json({ 
      erro: 'Acesso negado. Permissão insuficiente.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se usuário é farmacêutico ou superior
export const requireFarmaceutico = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  const tiposPermitidos: TipoUsuario[] = [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO];
  if (!tiposPermitidos.includes(req.user.tipo)) {
    res.status(403).json({ 
      erro: 'Acesso negado. Apenas farmacêuticos ou superior podem acessar este recurso.' 
    });
    return;
  }

  next();
};

// Middleware genérico para verificar permissão de módulo
export const requireModulePermission = (modulo: keyof typeof PERMISSOES_MODULOS) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ erro: 'Usuário não autenticado' });
      return;
    }

    if (!temPermissaoModulo(req.user.tipo, modulo)) {
      res.status(403).json({ 
        erro: `Acesso negado. Sem permissão para o módulo ${modulo}.` 
      });
      return;
    }

    next();
  };
};

// Middleware para verificar acesso à auditoria de vendas controladas
export const requireControlledSalesAudit = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  if (!temPermissaoAuditoria(req.user.tipo, 'vendasControladas')) {
    res.status(403).json({ 
      erro: 'Acesso negado. Sem permissão para auditoria de vendas controladas.' 
    });
    return;
  }

  next();
};

// Middleware para verificar acesso a relatórios de auditoria
export const requireAuditReports = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  if (!temPermissaoAuditoria(req.user.tipo, 'relatoriosAuditoria')) {
    res.status(403).json({ 
      erro: 'Acesso negado. Sem permissão para relatórios de auditoria.' 
    });
    return;
  }

  next();
};

// Middleware para verificar acesso a dados financeiros
export const requireFinancialPermission = (tipoPermissao: 'custos' | 'margens' | 'relatoriosFinanceiros') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ erro: 'Usuário não autenticado' });
      return;
    }

    if (!temPermissaoFinanceira(req.user.tipo, tipoPermissao)) {
      res.status(403).json({ 
        erro: `Acesso negado. Sem permissão para ${tipoPermissao}.` 
      });
      return;
    }

    next();
  };
};

// Middleware para verificar se usuário pode criar outros usuários
export const requireUserCreationPermission = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  const tiposPermitidos: TipoUsuario[] = [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE];
  if (!tiposPermitidos.includes(req.user.tipo)) {
    res.status(403).json({ 
      erro: 'Acesso negado. Sem permissão para criar usuários.' 
    });
    return;
  }

  next();
};

// Middleware para verificar se usuário pode acessar relatórios gerenciais
export const requireReportsPermission = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  if (!temPermissaoModulo(req.user.tipo, 'relatorios')) {
    res.status(403).json({ 
      erro: 'Acesso negado. Apenas administradores podem acessar relatórios gerenciais.' 
    });
    return;
  }

  next();
};

// Middleware para verificar vendas de produtos controlados
export const requireControlledMedicinePermission = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ erro: 'Usuário não autenticado' });
    return;
  }

  // Apenas farmacêuticos podem vender controlados diretamente
  // Vendedores podem fazer venda assistida (será validado no service)
  const tiposPermitidos = [
    TipoUsuario.ADMINISTRADOR, 
    TipoUsuario.GERENTE, 
    TipoUsuario.FARMACEUTICO,
    TipoUsuario.VENDEDOR,
    TipoUsuario.PDV
  ];

  if (!tiposPermitidos.includes(req.user.tipo)) {
    res.status(403).json({ 
      erro: 'Acesso negado. Sem permissão para venda de medicamentos controlados.' 
    });
    return;
  }

  next();
};

// Middleware condicional baseado no tipo de usuário
export const conditionalPermission = (...tiposPermitidos: TipoUsuario[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ erro: 'Usuário não autenticado' });
      return;
    }

    if (!tiposPermitidos.includes(req.user.tipo)) {
      res.status(403).json({ 
        erro: 'Acesso negado. Permissão insuficiente para este recurso.' 
      });
      return;
    }

    next();
  };
};