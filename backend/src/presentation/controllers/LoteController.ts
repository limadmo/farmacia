/**
 * Controller de Lotes - Sistema de Farmácia
 * 
 * Gerencia requisições HTTP relacionadas aos lotes de medicamentos
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { LoteService } from '../../application/services/LoteService';
import { CreateLoteData, UpdateLoteData, MovimentacaoLoteData } from '../../domain/entities/Lote';
import { AuthenticatedRequest } from '../middleware/auth';

export class LoteController {
  private loteService: LoteService;

  constructor() {
    const prisma = new PrismaClient();
    this.loteService = new LoteService(prisma);
  }

  /**
   * Lista lotes com filtros e paginação
   */
  async listarLotes(req: Request, res: Response): Promise<void> {
    try {
      const {
        page,
        limit,
        produtoId,
        numeroLote,
        codigoBarrasLote,
        fornecedorId,
        ativo,
        vencidosAte,
        proximosVencimento,
        comEstoque,
        orderBy,
        orderDirection
      } = req.query;

      const params = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        produtoId: produtoId as string,
        numeroLote: numeroLote as string,
        codigoBarrasLote: codigoBarrasLote as string,
        fornecedorId: fornecedorId as string,
        ativo: ativo ? ativo === 'true' : undefined,
        vencidosAte: vencidosAte ? new Date(vencidosAte as string) : undefined,
        proximosVencimento: proximosVencimento ? proximosVencimento === 'true' : undefined,
        comEstoque: comEstoque ? comEstoque === 'true' : undefined,
        orderBy: orderBy as 'dataValidade' | 'numeroLote' | 'quantidadeAtual' | 'criadoEm',
        orderDirection: orderDirection as 'asc' | 'desc'
      };

      const resultado = await this.loteService.listarLotes(params);
      res.json(resultado);
    } catch (error) {
      console.error('Erro ao listar lotes:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca lote por ID
   */
  async buscarLotePorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const lote = await this.loteService.buscarLotePorId(id);
      
      if (!lote) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }
      
      res.json(lote);
    } catch (error) {
      console.error('Erro ao buscar lote:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca lote por código de barras
   */
  async buscarLotePorCodigoBarras(req: Request, res: Response): Promise<void> {
    try {
      const { codigoBarras } = req.params;
      const lote = await this.loteService.buscarLotePorCodigoBarras(codigoBarras);
      
      if (!lote) {
        res.status(404).json({ error: 'Lote não encontrado' });
        return;
      }
      
      res.json(lote);
    } catch (error) {
      console.error('Erro ao buscar lote por código de barras:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca lotes por produto
   */
  async buscarLotesPorProduto(req: Request, res: Response): Promise<void> {
    try {
      const { produtoId } = req.params;
      const { apenasComEstoque } = req.query;
      
      const lotes = await this.loteService.buscarLotesPorProduto(produtoId);
      
      res.json(lotes);
    } catch (error) {
      console.error('Erro ao buscar lotes por produto:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista lotes próximos ao vencimento
   */
  async listarLotesVencimento(req: Request, res: Response): Promise<void> {
    try {
      const { diasAlerta } = req.query;
      const dias = diasAlerta ? parseInt(diasAlerta as string) : 30;
      
      const resultado = await this.loteService.listarLotesVencimento(dias);
      res.json(resultado);
    } catch (error) {
      console.error('Erro ao listar lotes próximos ao vencimento:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cria novo lote
   */
  async criarLote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const dadosLote: CreateLoteData = req.body;
      const lote = await this.loteService.criarLote(dadosLote, usuarioId);
      
      res.status(201).json(lote);
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('já existe')) {
          res.status(409).json({ error: error.message });
          return;
        }
        if (error.message.includes('não encontrado')) {
          res.status(404).json({ error: error.message });
          return;
        }
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualiza lote
   */
  async atualizarLote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id;
      
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const dadosAtualizacao: UpdateLoteData = req.body;
      const lote = await this.loteService.atualizarLote(id, dadosAtualizacao, usuarioId);
      
      res.json(lote);
    } catch (error) {
      console.error('Erro ao atualizar lote:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('não encontrado')) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message.includes('já existe')) {
          res.status(409).json({ error: error.message });
          return;
        }
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Remove lote (soft delete)
   */
  async removerLote(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id;
      
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      await this.loteService.removerLote(id, usuarioId);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao remover lote:', error);
      
      if (error instanceof Error && error.message.includes('não encontrado')) {
        res.status(404).json({ error: error.message });
        return;
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Atualiza estoque do lote
   */
  async atualizarEstoque(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id;
      
      if (!usuarioId) {
        res.status(401).json({ error: 'Usuário não autenticado' });
        return;
      }

      const { novaQuantidade, motivo } = req.body;
      const lote = await this.loteService.atualizarEstoque(id, novaQuantidade, motivo, usuarioId);
      
      res.json(lote);
    } catch (error) {
      console.error('Erro ao atualizar estoque do lote:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('não encontrado')) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message.includes('insuficiente')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Reserva quantidade de produtos
   */
  async reservarQuantidade(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { loteId, quantidade } = req.body;
      const usuarioId = req.user?.id;
      
      if (!loteId || !quantidade || !usuarioId) {
        res.status(400).json({ error: 'Lote ID, quantidade e usuário são obrigatórios' });
        return;
      }

      const resultado = await this.loteService.reservarQuantidade(loteId, quantidade, usuarioId);
      res.json(resultado);
    } catch (error) {
      console.error('Erro ao reservar quantidade:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Libera reserva de produtos
   */
  async liberarReserva(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { loteId, quantidade } = req.body;
      const usuarioId = req.user?.id;
      
      if (!loteId || !quantidade || !usuarioId) {
        res.status(400).json({ error: 'Lote ID, quantidade e usuário são obrigatórios' });
        return;
      }

      await this.loteService.liberarReserva(loteId, quantidade, usuarioId);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca movimentações de um lote
   */
  async buscarMovimentacoes(req: Request, res: Response): Promise<void> {
    try {
      const { loteId } = req.params;
      const { limit } = req.query;
      
      const movimentacoes = await this.loteService.buscarMovimentacoes(loteId);
      
      res.json(movimentacoes);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}