/**
 * Serviço de Lotes - Sistema de Farmácia
 * 
 * Gerencia operações com lotes de medicamentos
 */

import { DatabaseConnection } from '@/infrastructure/database/connection';
import { Lote } from '@prisma/client';

export interface LoteDisponivel {
  id: string;
  numeroLote: string;
  dataFabricacao: Date;
  dataValidade: Date;
  quantidadeInicial: number;
  quantidadeAtual: number;
  quantidadeReservada: number;
  quantidadeDisponivel: number;
  precoCusto: number;
  observacoes?: string;
  diasParaVencimento: number;
}

export interface FiltrosLote {
  produtoId?: string;
  ativo?: boolean;
  apenasDisponiveis?: boolean;
  ordenarPorVencimento?: boolean;
}

export class LoteService {
  
  private get prisma() {
    return DatabaseConnection.getClient();
  }
  
  /**
   * Lista lotes por produto ID
   */
  async listarLotesPorProduto(produtoId: string, filtros: FiltrosLote = {}): Promise<LoteDisponivel[]> {
    const {
      ativo = true,
      apenasDisponiveis = true,
      ordenarPorVencimento = true
    } = filtros;

    const lotes = await this.prisma.lote.findMany({
      where: {
        produtoId,
        ativo,
        ...(apenasDisponiveis && {
          quantidadeAtual: {
            gt: 0
          }
        })
      },
      orderBy: ordenarPorVencimento ? {
        dataValidade: 'asc' // FEFO: First Expire First Out
      } : {
        criadoEm: 'desc'
      }
    });

    // Processar lotes para calcular dados adicionais
    const hoje = new Date();
    
    return lotes.map((lote: any) => {
      const quantidadeDisponivel = lote.quantidadeAtual - (lote.quantidadeReservada || 0);
      const diasParaVencimento = Math.ceil(
        (new Date(lote.dataValidade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: lote.id,
        numeroLote: lote.numeroLote,
        dataFabricacao: lote.dataFabricacao,
        dataValidade: lote.dataValidade,
        quantidadeInicial: lote.quantidadeInicial,
        quantidadeAtual: lote.quantidadeAtual,
        quantidadeReservada: lote.quantidadeReservada,
        quantidadeDisponivel,
        precoCusto: Number(lote.precoCusto),
        observacoes: lote.observacoes || undefined,
        diasParaVencimento
      };
    })
    .filter((lote: any) => apenasDisponiveis ? lote.quantidadeDisponivel > 0 : true);
  }

  /**
   * Busca lote por ID
   */
  async buscarLotePorId(id: string): Promise<Lote | null> {
    return await this.prisma.lote.findUnique({
      where: { id },
      include: {
        produto: {
          select: {
            nome: true,
            codigoBarras: true
          }
        }
      }
    });
  }

  /**
   * Verifica disponibilidade de lotes para um produto
   */
  async verificarDisponibilidade(produtoId: string, quantidadeNecessaria: number): Promise<{
    disponivel: boolean;
    quantidadeDisponivel: number;
    lotesSugeridos: LoteDisponivel[];
  }> {
    const lotes = await this.listarLotesPorProduto(produtoId, {
      apenasDisponiveis: true,
      ordenarPorVencimento: true
    });

    const quantidadeTotal = lotes.reduce((total, lote) => total + lote.quantidadeDisponivel, 0);
    const disponivel = quantidadeTotal >= quantidadeNecessaria;

    // Sugerir lotes seguindo FEFO
    const lotesSugeridos: LoteDisponivel[] = [];
    let quantidadeRestante = quantidadeNecessaria;

    for (const lote of lotes) {
      if (quantidadeRestante <= 0) break;
      
      const quantidadeDoLote = Math.min(quantidadeRestante, lote.quantidadeDisponivel);
      if (quantidadeDoLote > 0) {
        lotesSugeridos.push({
          ...lote,
          quantidadeDisponivel: quantidadeDoLote
        });
        quantidadeRestante -= quantidadeDoLote;
      }
    }

    return {
      disponivel,
      quantidadeDisponivel: quantidadeTotal,
      lotesSugeridos
    };
  }

  /**
   * Reserva quantidade em lotes específicos
   */
  async reservarQuantidade(reservas: { loteId: string; quantidade: number }[]): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      for (const reserva of reservas) {
        const lote = await tx.lote.findUnique({
          where: { id: reserva.loteId }
        });

        if (!lote) {
          throw new Error(`Lote ${reserva.loteId} não encontrado`);
        }

        const quantidadeDisponivel = lote.quantidadeAtual - lote.quantidadeReservada;
        if (quantidadeDisponivel < reserva.quantidade) {
          throw new Error(`Quantidade insuficiente no lote ${lote.numeroLote}`);
        }

        await tx.lote.update({
          where: { id: reserva.loteId },
          data: {
            quantidadeReservada: lote.quantidadeReservada + reserva.quantidade
          }
        });
      }
    });
  }

  /**
   * Libera reserva de quantidade em lotes
   */
  async liberarReserva(reservas: { loteId: string; quantidade: number }[]): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      for (const reserva of reservas) {
        await tx.lote.update({
          where: { id: reserva.loteId },
          data: {
            quantidadeReservada: {
              decrement: reserva.quantidade
            }
          }
        });
      }
    });
  }

  /**
   * Confirma saída de lotes (baixa no estoque)
   */
  async confirmarSaida(saidas: { loteId: string; quantidade: number }[]): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      for (const saida of saidas) {
        const lote = await tx.lote.findUnique({
          where: { id: saida.loteId }
        });

        if (!lote) {
          throw new Error(`Lote ${saida.loteId} não encontrado`);
        }

        if (lote.quantidadeAtual < saida.quantidade) {
          throw new Error(`Quantidade insuficiente no lote ${lote.numeroLote}`);
        }

        await tx.lote.update({
          where: { id: saida.loteId },
          data: {
            quantidadeAtual: lote.quantidadeAtual - saida.quantidade,
            quantidadeReservada: Math.max(0, lote.quantidadeReservada - saida.quantidade)
          }
        });
      }
    });
  }

  /**
   * Busca lote por código de barras
   */
  async buscarLotePorCodigoBarras(codigoBarras: string): Promise<Lote | null> {
    return await this.prisma.lote.findFirst({
      where: { 
        OR: [
          { numeroLote: codigoBarras },
          { codigoBarrasLote: codigoBarras }
        ]
      },
      include: {
        produto: {
          select: {
            nome: true,
            codigoBarras: true
          }
        }
      }
    });
  }

  /**
   * Lista lotes próximos do vencimento
   */
  async listarLotesVencimento(dias: number = 30): Promise<LoteDisponivel[]> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + dias);

    const lotes = await this.prisma.lote.findMany({
      where: {
        ativo: true,
        quantidadeAtual: { gt: 0 },
        dataValidade: { lte: dataLimite }
      },
      include: {
        produto: {
          select: {
            nome: true,
            codigoBarras: true
          }
        }
      },
      orderBy: {
        dataValidade: 'asc'
      }
    });

    return lotes.map((lote: any) => {
      const hoje = new Date();
      const diasParaVencimento = Math.ceil(
        (new Date(lote.dataValidade).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: lote.id,
        numeroLote: lote.numeroLote,
        dataFabricacao: lote.dataFabricacao,
        dataValidade: lote.dataValidade,
        quantidadeInicial: lote.quantidadeInicial,
        quantidadeAtual: lote.quantidadeAtual,
        quantidadeReservada: lote.quantidadeReservada,
        quantidadeDisponivel: lote.quantidadeAtual - lote.quantidadeReservada,
        precoCusto: Number(lote.precoCusto),
        observacoes: lote.observacoes || undefined,
        diasParaVencimento
      };
    });
  }
}