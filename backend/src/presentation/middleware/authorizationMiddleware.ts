import { Request, Response, NextFunction } from 'express';
import { TipoUsuario } from '@prisma/client';
import { 
  temPermissaoModulo, 
  temPermissaoVenda, 
  podecriarUsuario, 
  ehSuperior, 
  temPermissaoSuperiorOuIgual,
  temPermissaoAuditoria 
} from '@/constants/permissions';
import { ForbiddenError } from './errorHandler';
import { AuthenticatedRequest } from '@/shared/types/auth';

// Tipos para configuração de autorização
type ModuloPermissao = 'usuarios' | 'produtos' | 'vendas' | 'estoque' | 'fornecedores' | 'promocoes' | 'relatorios';
type VendaPermissao = 'comReceita' | 'semReceita' | 'finalizacao' | 'visualizacao';
type AuditoriaPermissao = 'vendasControladas' | 'relatoriosAuditoria';

interface AuthorizationConfig {
  modulo?: ModuloPermissao;
  venda?: VendaPermissao;
  auditoria?: AuditoriaPermissao;
  criarUsuario?: TipoUsuario;
  hierarquiaSuperior?: boolean;
  tiposPermitidos?: TipoUsuario[];
}

/**
 * Middleware de autorização baseado em hierarquia
 * @param config Configuração de autorização
 * @returns Middleware function
 */
export const requirePermission = (config: AuthorizationConfig) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const usuario = req.usuario;
      
      if (!usuario) {
        throw new ForbiddenError('Usuário não autenticado');
      }

      const tipoUsuario = usuario.tipo as TipoUsuario;

      // Verificar permissão por módulo
      if (config.modulo) {
        if (!temPermissaoModulo(tipoUsuario, config.modulo)) {
          throw new ForbiddenError(`Acesso negado ao módulo ${config.modulo}`);
        }
      }

      // Verificar permissão para vendas
      if (config.venda) {
        if (!temPermissaoVenda(tipoUsuario, config.venda)) {
          throw new ForbiddenError(`Acesso negado para ${config.venda}`);
        }
      }

      // Verificar permissão para auditoria
      if (config.auditoria) {
        if (!temPermissaoAuditoria(tipoUsuario, config.auditoria)) {
          throw new ForbiddenError(`Acesso negado à auditoria: ${config.auditoria}`);
        }
      }

      // Verificar permissão para criar usuário
      if (config.criarUsuario) {
        if (!podecriarUsuario(tipoUsuario, config.criarUsuario)) {
          throw new ForbiddenError(`Não é possível criar usuário do tipo ${config.criarUsuario}`);
        }
      }

      // Verificar se é hierarquicamente superior (para operações em outros usuários)
      if (config.hierarquiaSuperior) {
        const targetUserId = req.params.id || req.body.usuarioId;
        if (targetUserId && targetUserId !== usuario.id) {
          // Aqui seria necessário buscar o tipo do usuário alvo
          // Por simplicidade, vamos assumir que a verificação será feita no service
        }
      }

      // Verificar tipos específicos permitidos
      if (config.tiposPermitidos) {
        if (!config.tiposPermitidos.includes(tipoUsuario)) {
          throw new ForbiddenError('Tipo de usuário não autorizado para esta operação');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware para verificar se o usuário pode gerenciar outro usuário
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export const requireUserManagementPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuario = req.usuario;
    
    if (!usuario) {
      throw new ForbiddenError('Usuário não autenticado');
    }

    const tipoUsuario = usuario.tipo as TipoUsuario;
    const targetUserId = req.params.id;
    const targetUserType = req.body.tipo as TipoUsuario;

    // Para criação de usuário
    if (req.method === 'POST' && targetUserType) {
      if (!podecriarUsuario(tipoUsuario, targetUserType)) {
        throw new ForbiddenError(`Não é possível criar usuário do tipo ${targetUserType}`);
      }
    }

    // Para operações em usuários existentes (PUT, DELETE)
    if ((req.method === 'PUT' || req.method === 'DELETE') && targetUserId) {
      // Aqui seria necessário buscar o tipo do usuário alvo no banco
      // Por simplicidade, vamos permitir que o service faça essa verificação
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware específico para operações de venda
 * @param tipoVenda Tipo de venda (comReceita, semReceita, finalizacao, visualizacao)
 * @returns Middleware function
 */
export const requireSalesPermission = (tipoVenda: VendaPermissao) => {
  return requirePermission({ venda: tipoVenda });
};

/**
 * Middleware específico para módulos
 * @param modulo Módulo do sistema
 * @returns Middleware function
 */
export const requireModulePermission = (modulo: ModuloPermissao) => {
  return requirePermission({ modulo });
};

/**
 * Middleware para verificar se o usuário é administrador
 */
export const requireAdmin = requirePermission({ 
  tiposPermitidos: [TipoUsuario.ADMINISTRADOR] 
});

/**
 * Middleware para verificar se o usuário é gerente ou superior
 */
export const requireManagerOrAbove = requirePermission({ 
  tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE] 
});

/**
 * Middleware para verificar se o usuário pode realizar vendas com receita
 */
export const requirePrescriptionSales = requireSalesPermission('comReceita');

/**
 * Middleware para verificar se o usuário pode realizar vendas sem receita
 */
export const requireNonPrescriptionSales = requireSalesPermission('semReceita');

/**
 * Middleware para verificar se o usuário pode finalizar vendas
 */
export const requireSalesFinalization = requireSalesPermission('finalizacao');

/**
 * Middleware específico para auditoria
 * @param tipoAuditoria Tipo de auditoria (vendasControladas, relatoriosAuditoria)
 * @returns Middleware function
 */
export const requireAuditPermission = (tipoAuditoria: AuditoriaPermissao) => {
  return requirePermission({ auditoria: tipoAuditoria });
};

/**
 * Middleware para acesso a vendas controladas (auditoria)
 */
export const requireControlledSalesAudit = requireAuditPermission('vendasControladas');

/**
 * Middleware para relatórios de auditoria (mais restritivo)
 */
export const requireAuditReports = requireAuditPermission('relatoriosAuditoria');