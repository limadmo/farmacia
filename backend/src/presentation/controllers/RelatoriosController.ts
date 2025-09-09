// Controller de Relatórios - Métricas reais baseadas em consultas diretas
// Interface REST para consumir dados de relatórios gerenciais

import { Request, Response, NextFunction } from 'express';
import RelatoriosService from '../../application/services/RelatoriosService';
import { logger } from '../../shared/utils/logger';

interface AuthRequest extends Request {
  user?: {
    id: string;
    nome: string;
    login: string;
    tipo: string;
    farmaciaId?: string;
  };
}

class RelatoriosController {
  
  // Dashboard principal com dados reais do banco
  async obterDashboard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de dashboard de relatórios', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar dados diretamente do banco
      const dashboard = await RelatoriosService.obterDashboard();

      logger.info('Dashboard de relatórios gerado com sucesso', {
        usuario: req.user?.nome,
        totalVendas: dashboard.resumo.vendas.total,
        valorTotal: dashboard.resumo.vendas.valor
      });

      res.json(dashboard);
      
    } catch (error) {
      logger.error('Erro ao gerar dashboard de relatórios', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Análise detalhada de vendas com dados reais do banco
  async obterAnaliseVendas(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de análise de vendas', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar análise de vendas diretamente do banco
      const analiseVendas = await RelatoriosService.obterAnaliseVendas();

      logger.info('Análise de vendas gerada com sucesso', {
        usuario: req.user?.nome,
        totalCategorias: analiseVendas.porCategoria.length,
        totalVendedores: analiseVendas.porVendedor.length
      });

      res.json(analiseVendas);
      
    } catch (error) {
      logger.error('Erro ao gerar análise de vendas', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Análise financeira detalhada com dados reais do banco
  async obterAnaliseFinanceira(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de análise financeira', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar análise financeira diretamente do banco
      const analiseFinanceira = await RelatoriosService.obterAnaliseFinanceira();

      logger.info('Análise financeira gerada com sucesso', {
        usuario: req.user?.nome,
        receitaTotal: analiseFinanceira.dre.receita,
        margemBruta: analiseFinanceira.dre.margemBruta
      });

      res.json(analiseFinanceira);
      
    } catch (error) {
      logger.error('Erro ao gerar análise financeira', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Dashboard de clientes com dados reais do banco
  async obterDashboardCliente(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de dashboard de cliente', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar dados de clientes diretamente do banco
      const dashboardCliente = await RelatoriosService.obterDashboardCliente();

      logger.info('Dashboard de cliente gerado com sucesso', {
        usuario: req.user?.nome,
        totalClientes: dashboardCliente.metricas.totalClientes,
        clientesAtivos: dashboardCliente.metricas.clientesAtivos,
        ticketMedio: dashboardCliente.metricas.ticketMedio
      });

      res.json(dashboardCliente);
      
    } catch (error) {
      logger.error('Erro ao gerar dashboard de cliente', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Dashboard de estoque com dados reais do banco
  async obterDashboardEstoque(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de dashboard de estoque', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar dados de estoque diretamente do banco
      const dashboardEstoque = await RelatoriosService.obterDashboardEstoque();

      logger.info('Dashboard de estoque gerado com sucesso', {
        usuario: req.user?.nome,
        valorTotal: dashboardEstoque.valorTotal,
        totalItens: dashboardEstoque.itensTotal
      });

      res.json(dashboardEstoque);
      
    } catch (error) {
      logger.error('Erro ao gerar dashboard de estoque', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Análise ABC (Curva de Pareto) com dados reais do banco
  async obterAnaliseABC(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de análise ABC', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar análise ABC diretamente do banco
      const analiseABC = await RelatoriosService.obterAnaliseABC();

      logger.info('Análise ABC gerada com sucesso', {
        usuario: req.user?.nome,
        totalA: analiseABC.curvaABC.A.length,
        totalB: analiseABC.curvaABC.B.length,
        totalC: analiseABC.curvaABC.C.length
      });

      res.json(analiseABC);
      
    } catch (error) {
      logger.error('Erro ao gerar análise ABC', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Controle de validade com dados reais do banco
  async obterControleValidade(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de controle de validade', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar controle de validade diretamente do banco
      const controleValidade = await RelatoriosService.obterControleValidade();

      logger.info('Controle de validade gerado com sucesso', {
        usuario: req.user?.nome,
        vencendo: controleValidade.alertas.vencendo,
        vencidos: controleValidade.alertas.vencidos
      });

      res.json(controleValidade);
      
    } catch (error) {
      logger.error('Erro ao gerar controle de validade', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Movimentação de estoque com dados reais do banco
  async obterMovimentacaoEstoque(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de movimentação de estoque', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id,
        filtros: req.query
      });

      // Extrair filtros da query
      const filtros = {
        dataInicio: req.query.dataInicio as string,
        dataFim: req.query.dataFim as string,
        tipo: req.query.tipo as string,
        produtoId: req.query.produtoId as string
      };

      // Buscar movimentação de estoque diretamente do banco
      const movimentacaoEstoque = await RelatoriosService.obterMovimentacaoEstoque();

      logger.info('Movimentação de estoque gerada com sucesso', {
        usuario: req.user?.nome,
        totalMovimentacoes: movimentacaoEstoque.movimentacao.length
      });

      res.json(movimentacaoEstoque);
      
    } catch (error) {
      logger.error('Erro ao gerar movimentação de estoque', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }

  // Análise de giro/rotatividade com dados reais do banco
  async obterAnaliseGiro(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Solicitação de análise de giro', {
        usuario: req.user?.nome,
        usuarioId: req.user?.id
      });

      // Buscar análise de giro diretamente do banco
      const analiseGiro = await RelatoriosService.obterAnaliseGiro();

      logger.info('Análise de giro gerada com sucesso', {
        usuario: req.user?.nome,
        totalProdutos: analiseGiro.giroMedio.length
      });

      res.json(analiseGiro);
      
    } catch (error) {
      logger.error('Erro ao gerar análise de giro', {
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        usuario: req.user?.nome
      });
      next(error);
    }
  }
}

export default new RelatoriosController();