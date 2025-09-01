/**
 * Controller de Auditoria - Sistema de Farmácia
 * 
 * Gerencia endpoints REST para auditoria de vendas de medicamentos controlados.
 * Acesso restrito a farmacêuticos, gerentes e administradores.
 */

import { Request, Response, NextFunction } from 'express';
import { AuditoriaService, FiltroAuditoria } from '@/application/services/AuditoriaService';
import { ValidationError } from '@/presentation/middleware/errorHandler';
import { logger } from '@/shared/utils/logger';
import { AuthenticatedRequest } from '@/presentation/middleware/auth';

export class AuditoriaController {
  private auditoriaService: AuditoriaService;
  private logger = logger;

  constructor() {
    this.auditoriaService = new AuditoriaService();
  }

  async listarVendasControladas(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        dataInicio,
        dataFim,
        vendedorId,
        numeroReceita,
        tipoUsuario,
        apenasVendasAssistidas = 'false'
      } = req.query;

      const filtro: FiltroAuditoria = {};

      // Converter datas se fornecidas
      if (dataInicio && typeof dataInicio === 'string') {
        filtro.dataInicio = new Date(dataInicio);
      }
      if (dataFim && typeof dataFim === 'string') {
        filtro.dataFim = new Date(dataFim);
      }

      // Outros filtros
      if (vendedorId && typeof vendedorId === 'string') {
        filtro.vendedorId = vendedorId;
      }
      if (numeroReceita && typeof numeroReceita === 'string') {
        filtro.numeroReceita = numeroReceita;
      }
      if (tipoUsuario && typeof tipoUsuario === 'string') {
        filtro.tipoUsuario = tipoUsuario;
      }
      if (apenasVendasAssistidas === 'true') {
        filtro.apenasVendasAssistidas = true;
      }

      const resultado = await this.auditoriaService.listarVendasControladas(filtro);

      this.logger.info(`🔍 Auditoria consultada por ${req.user?.nome}: ${resultado.total} vendas controladas`);

      res.json(resultado);
    } catch (error) {
      this.logger.error('Erro ao listar vendas controladas para auditoria:', error);
      next(error);
    }
  }

  async obterResumoAuditoria(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      const filtro: FiltroAuditoria = {};

      // Converter datas se fornecidas
      if (dataInicio && typeof dataInicio === 'string') {
        filtro.dataInicio = new Date(dataInicio);
      }
      if (dataFim && typeof dataFim === 'string') {
        filtro.dataFim = new Date(dataFim);
      }

      const resumo = await this.auditoriaService.obterResumoAuditoria(filtro);

      this.logger.info(`📊 Resumo auditoria consultado por ${req.user?.nome}`);

      res.json(resumo);
    } catch (error) {
      this.logger.error('Erro ao obter resumo de auditoria:', error);
      next(error);
    }
  }

  async obterDetalhesVenda(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID da venda é obrigatório');
      }

      const detalhes = await this.auditoriaService.obterDetalhesVendaControlada(id);

      if (!detalhes) {
        res.status(404).json({
          error: 'Venda não encontrada',
          message: 'A venda controlada solicitada não foi encontrada',
          statusCode: 404
        });
        return;
      }

      this.logger.info(`🔍 Detalhes venda controlada consultados: ${id} por ${req.user?.nome}`);

      res.json(detalhes);
    } catch (error) {
      this.logger.error(`Erro ao obter detalhes da venda ${req.params.id}:`, error);
      next(error);
    }
  }

  async obterVendedoresComControlados(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dataInicio, dataFim } = req.query;

      // Consulta para obter vendedores que venderam controlados no período
      const filtro: FiltroAuditoria = {};
      
      if (dataInicio && typeof dataInicio === 'string') {
        filtro.dataInicio = new Date(dataInicio);
      }
      if (dataFim && typeof dataFim === 'string') {
        filtro.dataFim = new Date(dataFim);
      }

      const vendas = await this.auditoriaService.listarVendasControladas(filtro);
      
      // Agrupar por vendedor
      const vendedoresMap = new Map();
      
      vendas.vendas.forEach(venda => {
        const vendedorId = venda.vendedor.login;
        if (!vendedoresMap.has(vendedorId)) {
          vendedoresMap.set(vendedorId, {
            id: vendedorId,
            nome: venda.vendedor.nome,
            tipo: venda.vendedor.tipo,
            totalVendas: 0,
            totalAssistidas: 0,
            valorTotal: 0
          });
        }
        
        const vendedor = vendedoresMap.get(vendedorId);
        vendedor.totalVendas++;
        if (venda.vendaAssistida) vendedor.totalAssistidas++;
        vendedor.valorTotal += venda.valorTotal;
      });

      const vendedores = Array.from(vendedoresMap.values())
        .sort((a, b) => b.totalVendas - a.totalVendas);

      res.json({ vendedores });
    } catch (error) {
      this.logger.error('Erro ao obter vendedores com controlados:', error);
      next(error);
    }
  }

  async exportarRelatorioAuditoria(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { dataInicio, dataFim, formato = 'json' } = req.query;

      const filtro: FiltroAuditoria = {};
      
      if (dataInicio && typeof dataInicio === 'string') {
        filtro.dataInicio = new Date(dataInicio);
      }
      if (dataFim && typeof dataFim === 'string') {
        filtro.dataFim = new Date(dataFim);
      }

      const [vendas, resumo] = await Promise.all([
        this.auditoriaService.listarVendasControladas(filtro),
        this.auditoriaService.obterResumoAuditoria(filtro)
      ]);

      const relatorio = {
        periodoConsulta: {
          inicio: filtro.dataInicio?.toISOString() || null,
          fim: filtro.dataFim?.toISOString() || null,
        },
        resumo,
        vendas: vendas.vendas,
        totalRegistros: vendas.total,
        geradoEm: new Date().toISOString(),
        geradoPor: req.user?.nome
      };

      // Por enquanto apenas JSON, mas pode ser expandido para Excel/PDF
      if (formato === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="auditoria-controlados-${new Date().toISOString().slice(0,10)}.json"`);
      }

      this.logger.info(`📄 Relatório auditoria exportado por ${req.user?.nome}: ${vendas.total} registros`);

      res.json(relatorio);
    } catch (error) {
      this.logger.error('Erro ao exportar relatório de auditoria:', error);
      next(error);
    }
  }
}