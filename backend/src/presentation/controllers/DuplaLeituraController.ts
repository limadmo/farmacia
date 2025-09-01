/**
 * Controller de Dupla Leitura - Sistema de Farmácia
 * 
 * Gerencia as APIs para o processo de dupla leitura de código de barras
 */

import { Request, Response } from 'express';
import { DuplaLeituraService } from '../../application/services/DuplaLeituraService';
import { ProdutoService } from '../../application/services/ProdutoService';
import { LoteService } from '../../application/services/LoteService';
import { PrismaClient } from '@prisma/client';

export class DuplaLeituraController {
  private duplaLeituraService: DuplaLeituraService;

  constructor(prisma: PrismaClient) {
    const produtoService = new ProdutoService();
    const loteService = new LoteService(prisma);
    this.duplaLeituraService = new DuplaLeituraService(prisma, produtoService, loteService);
  }

  /**
   * POST /api/dupla-leitura/iniciar
   * Inicia uma nova sessão de dupla leitura
   */
  iniciarSessao = async (req: Request, res: Response): Promise<void> => {
    try {
      const resultado = this.duplaLeituraService.iniciarSessao();
      
      res.status(200).json({
        success: true,
        data: resultado,
        message: 'Sessão de dupla leitura iniciada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao iniciar sessão de dupla leitura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  /**
   * POST /api/dupla-leitura/:sessionId/ler
   * Processa a leitura de um código de barras
   */
  processarLeitura = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { codigoBarras } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'ID da sessão é obrigatório'
        });
        return;
      }

      if (!codigoBarras || typeof codigoBarras !== 'string' || codigoBarras.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Código de barras é obrigatório e deve ser uma string válida'
        });
        return;
      }

      const resultado = await this.duplaLeituraService.processarLeitura(sessionId, codigoBarras.trim());
      
      const statusCode = resultado.success ? 200 : 400;
      
      res.status(statusCode).json({
        success: resultado.success,
        data: resultado,
        message: resultado.message
      });
    } catch (error) {
      console.error('Erro ao processar leitura:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  /**
   * GET /api/dupla-leitura/:sessionId
   * Obtém informações de uma sessão
   */
  obterSessao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'ID da sessão é obrigatório'
        });
        return;
      }

      const sessao = this.duplaLeituraService.obterSessao(sessionId);
      
      if (!sessao) {
        res.status(404).json({
          success: false,
          message: 'Sessão não encontrada ou expirada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: sessao,
        message: 'Sessão encontrada'
      });
    } catch (error) {
      console.error('Erro ao obter sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  /**
   * POST /api/dupla-leitura/:sessionId/finalizar
   * Finaliza uma sessão
   */
  finalizarSessao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'ID da sessão é obrigatório'
        });
        return;
      }

      const sucesso = this.duplaLeituraService.finalizarSessao(sessionId);
      
      if (!sucesso) {
        res.status(404).json({
          success: false,
          message: 'Sessão não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Sessão finalizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  /**
   * POST /api/dupla-leitura/:sessionId/cancelar
   * Cancela uma sessão
   */
  cancelarSessao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'ID da sessão é obrigatório'
        });
        return;
      }

      const sucesso = this.duplaLeituraService.cancelarSessao(sessionId);
      
      if (!sucesso) {
        res.status(404).json({
          success: false,
          message: 'Sessão não encontrada'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Sessão cancelada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao cancelar sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  /**
   * POST /api/dupla-leitura/:sessionId/validar
   * Valida se uma sessão está completa
   */
  validarSessao = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'ID da sessão é obrigatório'
        });
        return;
      }

      const validacao = this.duplaLeituraService.validarSessaoCompleta(sessionId);
      
      const statusCode = validacao.valida ? 200 : 400;
      
      res.status(statusCode).json({
        success: validacao.valida,
        data: {
          produto: validacao.produto,
          lote: validacao.lote
        },
        message: validacao.message
      });
    } catch (error) {
      console.error('Erro ao validar sessão:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };

  /**
   * GET /api/dupla-leitura/sessoes
   * Lista todas as sessões ativas (para admin/debug)
   */
  listarSessoesAtivas = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessoes = this.duplaLeituraService.listarSessoesAtivas();
      
      res.status(200).json({
        success: true,
        data: sessoes,
        message: `${sessoes.length} sessões ativas encontradas`
      });
    } catch (error) {
      console.error('Erro ao listar sessões ativas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  };
}