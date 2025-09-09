/**
 * Controller de Compras - Sistema de Farmácia
 * 
 * Gerencia endpoints REST para:
 * - Gestão de pedidos para fornecedores
 * - Recebimento de mercadorias
 * - Conferência manual dos produtos
 * - Aprovação e entrada automática no estoque
 */

import { Request, Response } from 'express';
import { ComprasService } from '../../application/services/ComprasService';
import { 
  CreatePedidoData,
  CreateRecebimentoData,
  CreateConferenciaData,
  AprovarConferenciaData,
  StatusPedido,
  StatusRecebimento,
  StatusConferencia
} from '../../domain/entities/Compras';
import { logger } from '../../shared/utils/logger';
import { validationResult } from 'express-validator';

export class ComprasController {
  private comprasService: ComprasService;
  private logger = logger;

  constructor() {
    this.comprasService = new ComprasService();
  }

  /**
   * Lista pedidos com filtros
   * GET /api/compras/pedidos
   */
  async listarPedidos(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        fornecedorId,
        status,
        dataInicio,
        dataFim,
        numeroPedido
      } = req.query;

      const params = {
        page: Number(page),
        limit: Number(limit),
        fornecedorId: fornecedorId as string,
        status: status as StatusPedido,
        dataInicio: dataInicio ? new Date(dataInicio as string) : undefined,
        dataFim: dataFim ? new Date(dataFim as string) : undefined,
        numeroPedido: numeroPedido as string
      };

      const resultado = await this.comprasService.listarPedidos(params);
      
      res.json({
        success: true,
        data: resultado.pedidos,
        pagination: resultado.pagination
      });
    } catch (error) {
      this.logger.error('Erro ao listar pedidos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Busca pedido por ID
   * GET /api/compras/pedidos/:id
   */
  async buscarPedidoPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID do pedido é obrigatório'
        });
        return;
      }

      const pedido = await this.comprasService.buscarPedidoPorId(id);
      
      if (!pedido) {
        res.status(404).json({
          success: false,
          message: 'Pedido não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: pedido
      });
    } catch (error) {
      this.logger.error('Erro ao buscar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Cria novo pedido
   * POST /api/compras/pedidos
   */
  async criarPedido(req: Request, res: Response): Promise<void> {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
        return;
      }

      const {
        fornecedorId,
        dataPrevisaoEntrega,
        observacoes,
        itens
      } = req.body;

      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const dadosPedido: CreatePedidoData = {
        fornecedorId,
        dataPrevisaoEntrega: dataPrevisaoEntrega ? new Date(dataPrevisaoEntrega) : undefined,
        observacoes,
        itens
      };

      const pedido = await this.comprasService.criarPedido(dadosPedido, usuarioId);
      
      res.status(201).json({
        success: true,
        message: 'Pedido criado com sucesso',
        data: pedido
      });
    } catch (error) {
      this.logger.error('Erro ao criar pedido:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualiza status do pedido
   * PATCH /api/compras/pedidos/:id/status
   */
  async atualizarStatusPedido(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id || !status) {
        res.status(400).json({
          success: false,
          message: 'ID do pedido e status são obrigatórios'
        });
        return;
      }

      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      await this.comprasService.atualizarStatusPedido(id, status, usuarioId);
      
      res.json({
        success: true,
        message: 'Status do pedido atualizado com sucesso'
      });
    } catch (error) {
      this.logger.error('Erro ao atualizar status do pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Lista recebimentos com filtros
   * GET /api/compras/recebimentos
   */
  async listarRecebimentos(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        pedidoId,
        status,
        dataInicio,
        dataFim,
        numeroNotaFiscal
      } = req.query;

      const params = {
        page: Number(page),
        limit: Number(limit),
        pedidoId: pedidoId as string,
        status: status as StatusRecebimento,
        dataInicio: dataInicio ? new Date(dataInicio as string) : undefined,
        dataFim: dataFim ? new Date(dataFim as string) : undefined,
        numeroNotaFiscal: numeroNotaFiscal as string
      };

      const resultado = await this.comprasService.listarRecebimentos(params);
      
      res.json({
        success: true,
        data: resultado.recebimentos,
        pagination: resultado.pagination
      });
    } catch (error) {
      this.logger.error('Erro ao listar recebimentos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Busca recebimento por ID
   * GET /api/compras/recebimentos/:id
   */
  async buscarRecebimentoPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID do recebimento é obrigatório'
        });
        return;
      }

      const recebimento = await this.comprasService.buscarRecebimentoPorId(id);
      
      if (!recebimento) {
        res.status(404).json({
          success: false,
          message: 'Recebimento não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: recebimento
      });
    } catch (error) {
      this.logger.error('Erro ao buscar recebimento:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Cria recebimento de mercadoria
   * POST /api/compras/recebimentos
   */
  async criarRecebimento(req: Request, res: Response): Promise<void> {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
        return;
      }

      const {
        pedidoId,
        numeroNotaFiscal,
        dataEmissaoNF,
        valorTotalNF,
        observacoes,
        itensRecebidos
      } = req.body;

      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const dadosRecebimento: CreateRecebimentoData = {
        pedidoId,
        numeroNotaFiscal,
        dataEmissaoNF: new Date(dataEmissaoNF),
        valorTotalNF,
        observacoes,
        itensRecebidos
      };

      const recebimento = await this.comprasService.criarRecebimento(dadosRecebimento, usuarioId);
      
      res.status(201).json({
        success: true,
        message: 'Recebimento criado com sucesso',
        data: recebimento
      });
    } catch (error) {
      this.logger.error('Erro ao criar recebimento:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Inicia conferência manual
   * POST /api/compras/conferencias
   */
  async iniciarConferencia(req: Request, res: Response): Promise<void> {
    try {
      // Verificar erros de validação
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Dados inválidos',
          errors: errors.array()
        });
        return;
      }

      const {
        recebimentoId,
        observacoes,
        itensConferidos
      } = req.body;

      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const dadosConferencia: CreateConferenciaData = {
        recebimentoId,
        observacoes,
        itensConferidos
      };

      const conferencia = await this.comprasService.iniciarConferencia(dadosConferencia, usuarioId);
      
      res.status(201).json({
        success: true,
        message: 'Conferência iniciada com sucesso',
        data: conferencia
      });
    } catch (error) {
      this.logger.error('Erro ao iniciar conferência:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Busca conferência por ID
   * GET /api/compras/conferencias/:id
   */
  async buscarConferenciaPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID da conferência é obrigatório'
        });
        return;
      }

      const conferencia = await this.comprasService.buscarConferenciaPorId(id);
      
      if (!conferencia) {
        res.status(404).json({
          success: false,
          message: 'Conferência não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: conferencia
      });
    } catch (error) {
      this.logger.error('Erro ao buscar conferência:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Aprova ou rejeita conferência
   * PATCH /api/compras/conferencias/:id/aprovar
   */
  async aprovarConferencia(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        aprovado,
        motivoRejeicao,
        ajustesItens
      } = req.body;
      
      if (!id || typeof aprovado !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'ID da conferência e status de aprovação são obrigatórios'
        });
        return;
      }

      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      const dadosAprovacao: AprovarConferenciaData = {
        conferenciaId: id,
        aprovado,
        motivoRejeicao,
        ajustesItens
      };

      const conferencia = await this.comprasService.aprovarConferencia(dadosAprovacao, usuarioId);
      
      res.json({
        success: true,
        message: `Conferência ${aprovado ? 'aprovada' : 'rejeitada'} com sucesso`,
        data: conferencia
      });
    } catch (error) {
      this.logger.error('Erro ao aprovar conferência:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  /**
   * Lista conferências pendentes
   * GET /api/compras/conferencias/pendentes
   */
  async listarConferenciasPendentes(req: Request, res: Response): Promise<void> {
    try {
      const conferencias = await this.comprasService.listarConferenciasPendentes();
      
      res.json({
        success: true,
        data: conferencias
      });
    } catch (error) {
      this.logger.error('Erro ao listar conferências pendentes:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obtém dashboard de compras
   * GET /api/compras/dashboard
   */
  async obterDashboardCompras(req: Request, res: Response): Promise<void> {
    try {
      const dashboard = await this.comprasService.obterDashboardCompras();
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      this.logger.error('Erro ao obter dashboard de compras:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Cancela pedido
   * DELETE /api/compras/pedidos/:id
   */
  async cancelarPedido(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID do pedido é obrigatório'
        });
        return;
      }

      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      await this.comprasService.atualizarStatusPedido(id, StatusPedido.CANCELADO, usuarioId);
      
      res.json({
        success: true,
        message: 'Pedido cancelado com sucesso'
      });
    } catch (error) {
      this.logger.error('Erro ao cancelar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Envia pedido para fornecedor
   * PATCH /api/compras/pedidos/:id/enviar
   */
  async enviarPedido(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID do pedido é obrigatório'
        });
        return;
      }

      const usuarioId = (req as any).user?.id;
      if (!usuarioId) {
        res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
        return;
      }

      await this.comprasService.atualizarStatusPedido(id, StatusPedido.ENVIADO, usuarioId);
      
      res.json({
        success: true,
        message: 'Pedido enviado com sucesso'
      });
    } catch (error) {
      this.logger.error('Erro ao enviar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}