/**
 * Controller de Lotes - Sistema de Farmácia
 * 
 * Controla operações HTTP relacionadas aos lotes de medicamentos
 */

import { Request, Response } from 'express';
import { LoteService } from '@/application/services/LoteService';

export class LoteController {
  private loteService: LoteService;

  constructor() {
    this.loteService = new LoteService();
  }

  /**
   * Busca lotes por produto
   */
  async buscarLotesPorProduto(req: Request, res: Response): Promise<void> {
    try {
      const { id, produtoId } = req.params;
      const produtoIdFinal = id || produtoId; // Aceita tanto 'id' quanto 'produtoId'
      const {
        ativo = 'true',
        apenasDisponiveis = 'true',
        ordenarPorVencimento = 'true'
      } = req.query;

      const filtros = {
        ativo: ativo === 'true',
        apenasDisponiveis: apenasDisponiveis === 'true',
        ordenarPorVencimento: ordenarPorVencimento === 'true'
      };

      const lotes = await this.loteService.listarLotesPorProduto(produtoIdFinal, filtros);

      res.json({
        success: true,
        data: lotes,
        message: 'Lotes encontrados com sucesso'
      });

    } catch (error) {
      console.error('Erro ao buscar lotes por produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
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
        res.status(404).json({
          success: false,
          error: 'Lote não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: lote,
        message: 'Lote encontrado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao buscar lote por ID:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista lotes próximos ao vencimento
   */
  async listarLotesVencimento(req: Request, res: Response): Promise<void> {
    try {
      const { dias = '30' } = req.query;

      const lotes = await this.loteService.listarLotesVencimento(parseInt(dias as string));

      res.json({
        success: true,
        data: lotes,
        message: 'Lotes próximos ao vencimento listados com sucesso'
      });

    } catch (error) {
      console.error('Erro ao listar lotes próximos ao vencimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Verifica disponibilidade de lotes para um produto
   */
  async verificarDisponibilidade(req: Request, res: Response): Promise<void> {
    try {
      const { produtoId } = req.params;
      const { quantidade } = req.query;

      if (!quantidade) {
        res.status(400).json({
          success: false,
          error: 'Quantidade é obrigatória'
        });
        return;
      }

      const disponibilidade = await this.loteService.verificarDisponibilidade(
        produtoId,
        parseInt(quantidade as string)
      );

      res.json({
        success: true,
        data: disponibilidade,
        message: 'Disponibilidade verificada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao verificar disponibilidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Reserva quantidade em lotes específicos
   */
  async reservarQuantidade(req: Request, res: Response): Promise<void> {
    try {
      const { reservas } = req.body;

      if (!reservas || !Array.isArray(reservas)) {
        res.status(400).json({
          success: false,
          error: 'Lista de reservas é obrigatória'
        });
        return;
      }

      await this.loteService.reservarQuantidade(reservas);

      res.json({
        success: true,
        message: 'Quantidades reservadas com sucesso'
      });

    } catch (error) {
      console.error('Erro ao reservar quantidade:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Libera reserva de quantidade em lotes
   */
  async liberarReserva(req: Request, res: Response): Promise<void> {
    try {
      const { reservas } = req.body;

      if (!reservas || !Array.isArray(reservas)) {
        res.status(400).json({
          success: false,
          error: 'Lista de reservas é obrigatória'
        });
        return;
      }

      await this.loteService.liberarReserva(reservas);

      res.json({
        success: true,
        message: 'Reservas liberadas com sucesso'
      });

    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  // Métodos placeholder para compatibilidade com as rotas existentes
  async listarLotes(req: Request, res: Response): Promise<void> {
    // Redireciona para buscarLotesPorProduto se tiver produtoId
    if (req.query.produtoId) {
      req.params.produtoId = req.query.produtoId as string;
      return this.buscarLotesPorProduto(req, res);
    }
    
    res.status(400).json({
      success: false,
      error: 'produtoId é obrigatório para listar lotes'
    });
  }

  async buscarLotePorCodigoBarras(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: 'Método não implementado'
    });
  }

  async buscarMovimentacoes(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: 'Método não implementado'
    });
  }

  async criarLote(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: 'Método não implementado'
    });
  }

  async atualizarLote(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: 'Método não implementado'
    });
  }

  async removerLote(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: 'Método não implementado'
    });
  }

  async atualizarEstoque(req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: 'Método não implementado'
    });
  }
}