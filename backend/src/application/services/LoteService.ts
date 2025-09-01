/**
 * Serviço de Lotes - Sistema de Farmácia
 * 
 * Gerencia operações relacionadas a lotes de medicamentos
 */

import { PrismaClient } from '@prisma/client';
import { CreateLoteData, UpdateLoteData, MovimentacaoLoteData, TipoMovimentacaoLote } from '../../domain/entities/Lote';

export class LoteService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Lista todos os lotes com filtros opcionais
   */
  async listarLotes(filtros?: {
    produtoId?: string;
    ativo?: boolean;
    vencimentoAte?: Date;
    fornecedorId?: string;
  }): Promise<any[]> {
    try {
      const where: any = {};

      if (filtros?.produtoId) {
        where.produtoId = filtros.produtoId;
      }

      if (filtros?.ativo !== undefined) {
        where.ativo = filtros.ativo;
      }

      if (filtros?.vencimentoAte) {
        where.dataValidade = {
          lte: filtros.vencimentoAte
        };
      }

      if (filtros?.fornecedorId) {
        where.fornecedorId = filtros.fornecedorId;
      }

      // Usando query raw para contornar problemas de tipos
      const lotes = await this.prisma.$queryRaw`
        SELECT l.*, p.nome as produto_nome, p.codigo_barras as produto_codigo_barras,
               f.nome as fornecedor_nome
        FROM lotes l
        LEFT JOIN produtos p ON l.produto_id = p.id
        LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
        WHERE l.ativo = true
        ORDER BY l.data_validade ASC
      `;

      return lotes as any[];
    } catch (error) {
      console.error('Erro ao listar lotes:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca lote por ID
   */
  async buscarLotePorId(id: string): Promise<any | null> {
    try {
      const lote = await this.prisma.$queryRaw`
        SELECT l.*, p.nome as produto_nome, p.codigo_barras as produto_codigo_barras,
               f.nome as fornecedor_nome
        FROM lotes l
        LEFT JOIN produtos p ON l.produto_id = p.id
        LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
        WHERE l.id = ${id} AND l.ativo = true
      `;

      const result = lote as any[];
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar lote por ID:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca lote por código de barras
   */
  async buscarLotePorCodigoBarras(codigoBarras: string): Promise<any | null> {
    try {
      const lote = await this.prisma.$queryRaw`
        SELECT l.*, p.nome as produto_nome, p.codigo_barras as produto_codigo_barras,
               f.nome as fornecedor_nome
        FROM lotes l
        LEFT JOIN produtos p ON l.produto_id = p.id
        LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
        WHERE l.codigo_barras_lote = ${codigoBarras} AND l.ativo = true
      `;

      const result = lote as any[];
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Erro ao buscar lote por código de barras:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca lotes por produto
   */
  async buscarLotesPorProduto(produtoId: string): Promise<any[]> {
    try {
      const lotes = await this.prisma.$queryRaw`
        SELECT l.*, p.nome as produto_nome, p.codigo_barras as produto_codigo_barras,
               f.nome as fornecedor_nome
        FROM lotes l
        LEFT JOIN produtos p ON l.produto_id = p.id
        LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
        WHERE l.produto_id = ${produtoId} AND l.ativo = true
        ORDER BY l.data_validade ASC
      `;

      return lotes as any[];
    } catch (error) {
      console.error('Erro ao buscar lotes por produto:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista lotes próximos ao vencimento
   */
  async listarLotesVencimento(dias: number = 30): Promise<any[]> {
    try {
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() + dias);

      const lotes = await this.prisma.$queryRaw`
        SELECT l.*, p.nome as produto_nome, p.codigo_barras as produto_codigo_barras,
               f.nome as fornecedor_nome
        FROM lotes l
        LEFT JOIN produtos p ON l.produto_id = p.id
        LEFT JOIN fornecedores f ON l.fornecedor_id = f.id
        WHERE l.data_validade <= ${dataLimite} AND l.ativo = true AND l.quantidade_atual > 0
        ORDER BY l.data_validade ASC
      `;

      return lotes as any[];
    } catch (error) {
      console.error('Erro ao listar lotes próximos ao vencimento:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria um novo lote
   */
  async criarLote(data: CreateLoteData, usuarioId: string): Promise<any> {
    try {
      const lote = await this.prisma.$queryRaw`
        INSERT INTO lotes (
          id, produto_id, numero_lote, codigo_barras_lote, data_fabricacao,
          data_validade, quantidade_inicial, quantidade_atual, preco_custo,
          fornecedor_id, observacoes, criado_em, atualizado_em
        ) VALUES (
          gen_random_uuid(), ${data.produtoId}, ${data.numeroLote}, ${data.codigoBarrasLote},
          ${data.dataFabricacao}, ${data.dataValidade}, ${data.quantidadeInicial},
          ${data.quantidadeInicial}, ${data.precoCusto}, ${data.fornecedorId},
          ${data.observacoes}, NOW(), NOW()
        ) RETURNING *
      `;

      // Registrar movimentação de entrada
      await this.registrarMovimentacao({
        loteId: (lote as any[])[0].id,
        tipo: TipoMovimentacaoLote.ENTRADA,
        quantidade: data.quantidadeInicial,
        motivo: 'Entrada inicial do lote',
        usuarioId
      });

      return (lote as any[])[0];
    } catch (error) {
      console.error('Erro ao criar lote:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Atualiza um lote
   */
  async atualizarLote(id: string, data: UpdateLoteData, usuarioId: string): Promise<any> {
    try {
      const lote = await this.prisma.$queryRaw`
        UPDATE lotes SET
          numero_lote = ${data.numeroLote},
          codigo_barras_lote = ${data.codigoBarrasLote},
          data_fabricacao = ${data.dataFabricacao},
          data_validade = ${data.dataValidade},
          preco_custo = ${data.precoCusto},
          fornecedor_id = ${data.fornecedorId},
          observacoes = ${data.observacoes},
          atualizado_em = NOW()
        WHERE id = ${id} AND ativo = true
        RETURNING *
      `;

      return (lote as any[])[0];
    } catch (error) {
      console.error('Erro ao atualizar lote:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Remove um lote (soft delete)
   */
  async removerLote(id: string, usuarioId: string): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`
        UPDATE lotes SET ativo = false, atualizado_em = NOW()
        WHERE id = ${id}
      `;

      return true;
    } catch (error) {
      console.error('Erro ao remover lote:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Atualiza estoque do lote
   */
  async atualizarEstoque(id: string, novaQuantidade: number, motivo: string, usuarioId: string): Promise<any> {
    try {
      const loteAtual = await this.prisma.$queryRaw`
        SELECT * FROM lotes WHERE id = ${id} AND ativo = true
      `;

      if (!(loteAtual as any[]).length) {
        throw new Error('Lote não encontrado');
      }

      const lote = (loteAtual as any[])[0];
      const quantidadeAnterior = lote.quantidade_atual;
      const diferenca = novaQuantidade - quantidadeAnterior;

      await this.prisma.$queryRaw`
        UPDATE lotes SET quantidade_atual = ${novaQuantidade}, atualizado_em = NOW()
        WHERE id = ${id}
      `;

      // Registrar movimentação
      await this.registrarMovimentacao({
        loteId: id,
        tipo: diferenca > 0 ? TipoMovimentacaoLote.ENTRADA : TipoMovimentacaoLote.SAIDA,
        quantidade: Math.abs(diferenca),
        motivo,
        usuarioId
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Reserva quantidade do lote
   */
  async reservarQuantidade(loteId: string, quantidade: number, usuarioId: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw`
        UPDATE lotes SET 
          quantidade_reservada = quantidade_reservada + ${quantidade},
          atualizado_em = NOW()
        WHERE id = ${loteId} AND ativo = true 
          AND (quantidade_atual - quantidade_reservada) >= ${quantidade}
      `;

      return true;
    } catch (error) {
      console.error('Erro ao reservar quantidade:', error);
      return false;
    }
  }

  /**
   * Libera reserva do lote
   */
  async liberarReserva(loteId: string, quantidade: number, usuarioId: string): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`
        UPDATE lotes SET 
          quantidade_reservada = GREATEST(0, quantidade_reservada - ${quantidade}),
          atualizado_em = NOW()
        WHERE id = ${loteId} AND ativo = true
      `;

      return true;
    } catch (error) {
      console.error('Erro ao liberar reserva:', error);
      return false;
    }
  }

  /**
   * Busca movimentações do lote
   */
  async buscarMovimentacoes(loteId: string): Promise<any[]> {
    try {
      const movimentacoes = await this.prisma.$queryRaw`
        SELECT m.*, u.nome as usuario_nome, v.id as venda_id
        FROM movimentacao_lote m
        LEFT JOIN usuarios u ON m.usuario_id = u.id
        LEFT JOIN vendas v ON m.venda_id = v.id
        WHERE m.lote_id = ${loteId}
        ORDER BY m.criado_em DESC
      `;

      return movimentacoes as any[];
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Registra movimentação do lote
   */
  private async registrarMovimentacao(data: MovimentacaoLoteData): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        INSERT INTO movimentacao_lote (
          id, lote_id, tipo, quantidade, motivo, usuario_id, venda_id, criado_em
        ) VALUES (
          gen_random_uuid(), ${data.loteId}, ${data.tipo}, ${data.quantidade},
          ${data.motivo}, ${data.usuarioId}, ${data.vendaId || null}, NOW()
        )
      `;
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      throw new Error('Erro ao registrar movimentação');
    }
  }
}