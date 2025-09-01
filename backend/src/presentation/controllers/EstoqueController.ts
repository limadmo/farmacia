/**
 * Controller de Estoque - Sistema de Farmácia
 * 
 * Gerencia endpoints REST para controle de estoque e sincronização offline.
 * Inclui funcionalidades para vendas sem internet.
 */

import { Request, Response, NextFunction } from 'express';
import { EstoqueService, ListMovimentacoesParams } from '@/application/services/EstoqueService';
import { ValidationError } from '@/presentation/middleware/errorHandler';
import { logger } from '@/shared/utils/logger';
import { TipoMovimentacao } from '@/domain/entities/Estoque';

export class EstoqueController {
  private estoqueService: EstoqueService;
  private logger = logger;

  constructor() {
    this.estoqueService = new EstoqueService();
  }

  async registrarMovimentacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        produtoId,
        tipo,
        quantidade,
        motivo,
        observacoes,
        vendaId,
        itemVendaId,
        clienteTimestamp
      } = req.body;

      // Validações básicas
      if (!produtoId || typeof produtoId !== 'string') {
        throw new ValidationError('ID do produto é obrigatório');
      }

      if (!tipo || !Object.values(TipoMovimentacao).includes(tipo)) {
        throw new ValidationError('Tipo de movimentação inválido');
      }

      if (quantidade === undefined || quantidade === null || isNaN(Number(quantidade)) || Number(quantidade) <= 0) {
        throw new ValidationError('Quantidade deve ser um número maior que zero');
      }

      if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 3) {
        throw new ValidationError('Motivo deve ter pelo menos 3 caracteres');
      }

      const dadosMovimentacao = {
        produtoId: produtoId.trim(),
        tipo,
        quantidade: Number(quantidade),
        motivo: motivo.trim(),
        observacoes: observacoes?.trim(),
        vendaId: vendaId?.trim(),
        itemVendaId: itemVendaId?.trim(),
        usuarioId: req.usuario!.id,
        clienteTimestamp: clienteTimestamp ? new Date(clienteTimestamp) : undefined
      };

      const movimentacao = await this.estoqueService.registrarMovimentacao(dadosMovimentacao);

      this.logger.info(`📦 Movimentação registrada: ${tipo} ${quantidade} - Produto ${produtoId}`);

      res.status(201).json({
        message: 'Movimentação registrada com sucesso',
        movimentacao
      });
    } catch (error) {
      this.logger.error('Erro ao registrar movimentação:', error);
      next(error);
    }
  }

  async listarMovimentacoes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = '1',
        limit = '50',
        produtoId,
        tipo,
        usuarioId,
        dataInicio,
        dataFim,
        sincronizado
      } = req.query;

      const params: ListMovimentacoesParams = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        produtoId: produtoId as string,
        tipo: tipo as TipoMovimentacao,
        usuarioId: usuarioId as string,
        dataInicio: dataInicio ? new Date(dataInicio as string) : undefined,
        dataFim: dataFim ? new Date(dataFim as string) : undefined
      };

      // Remover parâmetros undefined
      Object.keys(params).forEach(key => {
        if (params[key as keyof ListMovimentacoesParams] === undefined) {
          delete params[key as keyof ListMovimentacoesParams];
        }
      });

      const resultado = await this.estoqueService.listarMovimentacoes(params);

      this.logger.info(`📋 Movimentações listadas: ${resultado.movimentacoes.length} registros (página ${params.page})`);

      res.json(resultado);
    } catch (error) {
      this.logger.error('Erro ao listar movimentações:', error);
      next(error);
    }
  }

  async obterResumoEstoque(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resumo = await this.estoqueService.obterResumoEstoque();
      
      // Obter produtos próximos do vencimento para incluir no resumo
      const produtosVencimento = await this.estoqueService.listarProdutosVencimento(30);

      this.logger.info(`📊 Resumo do estoque obtido: ${resumo.length} produtos`);

      res.json({
        resumo,
        total: resumo.length,
        estatisticas: {
          totalProdutos: resumo.length,
          totalItens: resumo.reduce((total, p) => total + p.quantidade, 0),
          produtosEstoqueBaixo: resumo.filter(p => ['BAIXO', 'CRITICO', 'ZERADO'].includes(p.status)).length,
          produtosVencimento: produtosVencimento.length,
          valorTotalEstoque: resumo.reduce((total, p) => total + p.valorTotal, 0)
        }
      });
    } catch (error) {
      this.logger.error('Erro ao obter resumo do estoque:', error);
      next(error);
    }
  }

  async listarProdutosEstoqueBaixo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const produtos = await this.estoqueService.listarProdutosEstoqueBaixo();

      this.logger.info(`⚠️ Produtos com estoque baixo: ${produtos.length} produtos`);

      res.json({
        produtos,
        total: produtos.length,
        message: produtos.length === 0 ? 'Nenhum produto com estoque baixo' : `${produtos.length} produtos precisam de reposição`
      });
    } catch (error) {
      this.logger.error('Erro ao listar produtos com estoque baixo:', error);
      next(error);
    }
  }

  async sincronizarVendasOffline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { vendas } = req.body;

      if (!Array.isArray(vendas)) {
        throw new ValidationError('Vendas deve ser um array');
      }

      if (vendas.length === 0) {
        res.json({
          message: 'Nenhuma venda para sincronizar',
          resultado: {
            processadas: 0,
            sucessos: 0,
            erros: 0,
            conflitos: 0,
            detalhes: []
          }
        });
        return;
      }

      // Validar estrutura básica das vendas
      for (const venda of vendas) {
        if (!venda.id || !venda.itens || !Array.isArray(venda.itens)) {
          throw new ValidationError('Estrutura de venda inválida: ID e itens são obrigatórios');
        }

        if (!venda.hashIntegridade) {
          throw new ValidationError('Hash de integridade é obrigatório para vendas offline');
        }
      }

      const resultado = await this.estoqueService.sincronizarVendasOffline(vendas);

      this.logger.info(`🔄 Sincronização offline concluída: ${resultado.sucessos}/${resultado.processadas} vendas sincronizadas`);

      res.json({
        message: `Sincronização concluída: ${resultado.sucessos} sucessos, ${resultado.erros} erros, ${resultado.conflitos} conflitos`,
        resultado
      });
    } catch (error) {
      this.logger.error('Erro ao sincronizar vendas offline:', error);
      next(error);
    }
  }

  async buscarMovimentacoesPendentes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const movimentacoes = await this.estoqueService.buscarMovimentacoesPendentes();

      this.logger.info(`⏳ Movimentações pendentes: ${movimentacoes.length} registros`);

      res.json({
        movimentacoes,
        total: movimentacoes.length,
        message: movimentacoes.length === 0 ? 'Todas as movimentações estão sincronizadas' : `${movimentacoes.length} movimentações aguardando sincronização`
      });
    } catch (error) {
      this.logger.error('Erro ao buscar movimentações pendentes:', error);
      next(error);
    }
  }

  async marcarComoSincronizada(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID da movimentação é obrigatório');
      }

      await this.estoqueService.marcarComoSincronizada(id);

      this.logger.info(`✅ Movimentação ${id} marcada como sincronizada`);

      res.json({
        message: 'Movimentação marcada como sincronizada'
      });
    } catch (error) {
      this.logger.error(`Erro ao marcar movimentação ${req.params.id} como sincronizada:`, error);
      next(error);
    }
  }

  async gerarVendaOfflineDemo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { itens, clienteId } = req.body;

      if (!Array.isArray(itens) || itens.length === 0) {
        throw new ValidationError('Itens da venda são obrigatórios');
      }

      // Validar estrutura dos itens
      for (const item of itens) {
        if (!item.produtoId || !item.quantidade || !item.precoUnitario || !item.nomeProduto) {
          throw new ValidationError('Cada item deve ter produtoId, quantidade, precoUnitario e nomeProduto');
        }
      }

      const vendaOffline = this.estoqueService.gerarVendaOffline(
        itens,
        req.usuario!.id,
        clienteId
      );

      this.logger.info(`🧪 Venda offline demo gerada: ${vendaOffline.id}`);

      res.json({
        message: 'Venda offline gerada para demonstração',
        venda: vendaOffline
      });
    } catch (error) {
      this.logger.error('Erro ao gerar venda offline demo:', error);
      next(error);
    }
  }

  /**
   * Obtém alertas de estoque (baixo, crítico, vencimento)
   */
  async obterAlertasEstoque(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alertas = await this.estoqueService.obterAlertasEstoque();

      this.logger.info(`🚨 Alertas de estoque obtidos: ${alertas.total} alertas`);

      res.json(alertas);
    } catch (error) {
      this.logger.error('Erro ao obter alertas de estoque:', error);
      next(error);
    }
  }

  /**
   * Obtém dados para dashboard de estoque
   */
  async obterDashboardEstoque(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await this.estoqueService.obterDashboardEstoque();

      this.logger.info(`📊 Dashboard de estoque obtido`);

      res.json(dashboard);
    } catch (error) {
      this.logger.error('Erro ao obter dashboard de estoque:', error);
      next(error);
    }
  }

  /**
   * Gera relatório de movimentações por período
   */
  async gerarRelatorioMovimentacoes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dataInicio, dataFim, tipo, produtoId } = req.query;

      if (!dataInicio || !dataFim) {
        throw new ValidationError('Data de início e fim são obrigatórias');
      }

      const relatorio = await this.estoqueService.gerarRelatorioMovimentacoes(
        new Date(dataInicio as string),
        new Date(dataFim as string),
        tipo as string,
        produtoId as string
      );

      this.logger.info(`📋 Relatório de movimentações gerado: ${dataInicio} a ${dataFim}`);

      res.json(relatorio);
    } catch (error) {
      this.logger.error('Erro ao gerar relatório de movimentações:', error);
      next(error);
    }
  }

  /**
   * Lista produtos próximos do vencimento
   */
  async listarProdutosVencimento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dias = '30' } = req.query;
      const diasVencimento = parseInt(dias as string, 10);

      const produtos = await this.estoqueService.listarProdutosVencimento(diasVencimento);

      this.logger.info(`⏰ Produtos próximos do vencimento: ${produtos.length} produtos (${diasVencimento} dias)`);

      res.json({
        produtos,
        total: produtos.length,
        diasVencimento,
        message: `${produtos.length} produtos vencem nos próximos ${diasVencimento} dias`
      });
    } catch (error) {
      this.logger.error('Erro ao listar produtos próximos do vencimento:', error);
      next(error);
    }
  }
}
