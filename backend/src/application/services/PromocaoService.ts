/**
 * Serviço de Promoções - Sistema de Farmácia
 * 
 * Implementa regras de negócio para gestão de promoções de produtos farmacêuticos.
 * Inclui validações de período, quantidade e cálculos de preços promocionais.
 */

import { DatabaseConnection } from '@/infrastructure/database/connection';
import { Decimal } from '@prisma/client/runtime/library';
import { 
  Promocao, 
  CreatePromocaoData, 
  UpdatePromocaoData, 
  PromocaoBusinessRules,
  TipoPromocao,
  CondicaoTermino
} from '@/domain/entities/Promocao';
import { logger } from '@/shared/utils/logger';

export interface ListPromocoesParams {
  page?: number;
  limit?: number;
  search?: string;
  produtoId?: string;
  tipo?: TipoPromocao;
  ativo?: boolean;
  vigentes?: boolean; // Filtro para promoções vigentes (dentro do período)
  disponiveis?: boolean; // Filtro para promoções disponíveis (vigentes + com quantidade)
}

export interface ListPromocoesResponse {
  promocoes: PromocaoWithProduto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PromocaoWithProduto extends Promocao {
  produto: {
    id: string;
    nome: string;
    precoVenda: number;
    estoque: number;
  };
}

export class PromocaoService {
  private logger = logger;

  private get prisma() {
    return DatabaseConnection.getClient();
  }

  /**
   * Lista promoções com filtros e paginação
   */
  async listarPromocoes(params: ListPromocoesParams = {}): Promise<ListPromocoesResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        produtoId,
        tipo,
        ativo = true,
        vigentes,
        disponiveis
      } = params;

      const skip = (page - 1) * limit;
      const where: any = { ativo };
      const agora = new Date();

      // Filtro de busca por nome ou descrição
      if (search) {
        where.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { descricao: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Filtro por produto
      if (produtoId) {
        where.produtoId = produtoId;
      }

      // Filtro por tipo
      if (tipo) {
        where.tipo = tipo;
      }

      // Filtro para promoções vigentes
      if (vigentes) {
        where.dataInicio = { lte: agora };
        where.dataFim = { gte: agora };
      }

      // Filtro para promoções disponíveis (vigentes + com quantidade)
      if (disponiveis) {
        where.dataInicio = { lte: agora };
        where.dataFim = { gte: agora };
        where.OR = [
          { condicaoTermino: CondicaoTermino.ATE_ACABAR_ESTOQUE },
          {
            AND: [
              { condicaoTermino: CondicaoTermino.QUANTIDADE_LIMITADA },
              { quantidadeVendida: { lt: { field: 'quantidadeMaxima' } } }
            ]
          }
        ];
      }

      const [promocoes, total] = await Promise.all([
        this.prisma.promocao.findMany({
          where,
          skip,
          take: limit,
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                precoVenda: true,
                estoque: true
              }
            }
          },
          orderBy: { criadoEm: 'desc' }
        }),
        this.prisma.promocao.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        promocoes: promocoes.map(promocao => this.mapPromocao(promocao)),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      this.logger.error('Erro ao listar promoções:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca promoção por ID
   */
  async buscarPromocaoPorId(id: string): Promise<PromocaoWithProduto | null> {
    try {
      const promocao = await this.prisma.promocao.findUnique({
        where: { id },
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
              precoVenda: true,
              estoque: true
            }
          }
        }
      });

      return promocao ? this.mapPromocao(promocao) : null;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar promoção ${id}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca promoções ativas para um produto
   */
  async buscarPromocoesPorProduto(produtoId: string): Promise<PromocaoWithProduto[]> {
    try {
      const agora = new Date();
      
      const promocoes = await this.prisma.promocao.findMany({
        where: {
          produtoId,
          ativo: true,
          dataInicio: { lte: agora },
          dataFim: { gte: agora }
        },
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
              precoVenda: true,
              estoque: true
            }
          }
        },
        orderBy: { criadoEm: 'desc' }
      });

      return promocoes
        .map(promocao => this.mapPromocao(promocao))
        .filter(promocao => PromocaoBusinessRules.podeAplicarPromocao(promocao));
    } catch (error: any) {
      this.logger.error(`Erro ao buscar promoções do produto ${produtoId}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria nova promoção
   */
  async criarPromocao(data: CreatePromocaoData): Promise<PromocaoWithProduto> {
    try {
      // Validações de negócio
      const errors = PromocaoBusinessRules.validatePromocao(data);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Verificar se produto existe
      const produto = await this.prisma.produto.findUnique({
        where: { id: data.produtoId }
      });
      if (!produto) {
        throw new Error('Produto não encontrado');
      }

      // Verificar se já existe promoção ativa para o produto no período
      const promocaoConflitante = await this.prisma.promocao.findFirst({
        where: {
          produtoId: data.produtoId,
          ativo: true,
          OR: [
            {
              AND: [
                { dataInicio: { lte: data.dataFim } },
                { dataFim: { gte: data.dataInicio } }
              ]
            }
          ]
        }
      });

      if (promocaoConflitante) {
        throw new Error('Já existe uma promoção ativa para este produto no período informado');
      }

      // Calcular preço promocional
      const precoPromocional = PromocaoBusinessRules.calcularPrecoPromocional(
        Number(produto.precoVenda),
        data.tipo,
        data.valorDesconto,
        data.porcentagemDesconto
      );

      const novaPromocao = await this.prisma.promocao.create({
        data: {
          nome: data.nome,
          descricao: data.descricao,
          produtoId: data.produtoId,
          tipo: data.tipo,
          valorDesconto: data.valorDesconto,
          porcentagemDesconto: data.porcentagemDesconto,
          precoPromocional: precoPromocional,
          condicaoTermino: data.condicaoTermino,
          quantidadeMaxima: data.quantidadeMaxima,
          quantidadeVendida: 0,
          dataInicio: data.dataInicio,
          dataFim: data.dataFim,
          ativo: data.ativo ?? true
        },
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
              precoVenda: true,
              estoque: true
            }
          }
        }
      });

      this.logger.info(`Promoção criada: ${novaPromocao.nome} (${novaPromocao.id})`);

      return this.mapPromocao(novaPromocao);
    } catch (error: any) {
      this.logger.error('Erro ao criar promoção:', error);
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Atualiza promoção existente
   */
  async atualizarPromocao(id: string, data: UpdatePromocaoData): Promise<PromocaoWithProduto> {
    try {
      // Verificar se promoção existe
      const promocaoExistente = await this.prisma.promocao.findUnique({
        where: { id },
        include: { produto: true }
      });
      if (!promocaoExistente) {
        throw new Error('Promoção não encontrada');
      }

      // Verificar conflitos de período se as datas foram alteradas
      if (data.dataInicio || data.dataFim) {
        const dataInicio = data.dataInicio || promocaoExistente.dataInicio;
        const dataFim = data.dataFim || promocaoExistente.dataFim;

        const promocaoConflitante = await this.prisma.promocao.findFirst({
          where: {
            produtoId: promocaoExistente.produtoId,
            ativo: true,
            id: { not: id },
            OR: [
              {
                AND: [
                  { dataInicio: { lte: dataFim } },
                  { dataFim: { gte: dataInicio } }
                ]
              }
            ]
          }
        });

        if (promocaoConflitante) {
          throw new Error('Já existe uma promoção ativa para este produto no período informado');
        }
      }

      // Recalcular preço promocional se necessário
      let precoPromocional = Number(promocaoExistente.precoPromocional);
      if (data.tipo || data.valorDesconto !== undefined || data.porcentagemDesconto !== undefined) {
        const tipo = data.tipo || promocaoExistente.tipo;
        const valorDesconto = data.valorDesconto !== undefined ? data.valorDesconto : (promocaoExistente.valorDesconto ? Number(promocaoExistente.valorDesconto) : undefined);
        const porcentagemDesconto = data.porcentagemDesconto !== undefined ? data.porcentagemDesconto : (promocaoExistente.porcentagemDesconto ? Number(promocaoExistente.porcentagemDesconto) : undefined);
        
        precoPromocional = PromocaoBusinessRules.calcularPrecoPromocional(
          Number(promocaoExistente.produto.precoVenda),
          tipo as TipoPromocao,
          valorDesconto,
          porcentagemDesconto
        );
      }

      const promocaoAtualizada = await this.prisma.promocao.update({
        where: { id },
        data: {
          ...data,
          precoPromocional: precoPromocional
        },
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
              precoVenda: true,
              estoque: true
            }
          }
        }
      });

      this.logger.info(`Promoção atualizada: ${promocaoAtualizada.nome} (${promocaoAtualizada.id})`);

      return this.mapPromocao(promocaoAtualizada);
    } catch (error: any) {
      this.logger.error('Erro ao atualizar promoção:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Remove promoção (soft delete)
   */
  async removerPromocao(id: string): Promise<void> {
    try {
      const promocao = await this.prisma.promocao.findUnique({
        where: { id }
      });
      if (!promocao) {
        throw new Error('Promoção não encontrada');
      }

      await this.prisma.promocao.update({
        where: { id },
        data: { ativo: false }
      });

      this.logger.info(`Promoção removida: ${promocao.nome} (${promocao.id})`);
    } catch (error: any) {
      this.logger.error('Erro ao remover promoção:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Incrementa quantidade vendida de uma promoção
   */
  async incrementarQuantidadeVendida(id: string, quantidade: number = 1): Promise<void> {
    try {
      const promocao = await this.prisma.promocao.findUnique({
        where: { id }
      });
      if (!promocao) {
        throw new Error('Promoção não encontrada');
      }

      await this.prisma.promocao.update({
        where: { id },
        data: {
          quantidadeVendida: {
            increment: quantidade
          }
        }
      });

      this.logger.info(`Quantidade vendida incrementada para promoção ${id}: +${quantidade}`);
    } catch (error: any) {
      this.logger.error('Erro ao incrementar quantidade vendida:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista promoções vigentes (ativas e dentro do período)
   */
  async listarPromocoesVigentes(): Promise<PromocaoWithProduto[]> {
    try {
      const agora = new Date();
      
      const promocoes = await this.prisma.promocao.findMany({
        where: {
          ativo: true,
          dataInicio: { lte: agora },
          dataFim: { gte: agora }
        },
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
              precoVenda: true,
              estoque: true
            }
          }
        },
        orderBy: { criadoEm: 'desc' }
      });

      return promocoes
        .map(promocao => this.mapPromocao(promocao))
        .filter(promocao => PromocaoBusinessRules.podeAplicarPromocao(promocao));
    } catch (error: any) {
      this.logger.error('Erro ao listar promoções vigentes:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Mapeia dados do Prisma para entidade Promocao
   */
  private mapPromocao(promocao: any): PromocaoWithProduto {
    return {
      id: promocao.id,
      nome: promocao.nome,
      descricao: promocao.descricao,
      produtoId: promocao.produtoId,
      tipo: promocao.tipo,
      valorDesconto: promocao.valorDesconto,
      porcentagemDesconto: promocao.porcentagemDesconto,
      precoPromocional: promocao.precoPromocional,
      condicaoTermino: promocao.condicaoTermino,
      quantidadeMaxima: promocao.quantidadeMaxima,
      quantidadeVendida: promocao.quantidadeVendida,
      dataInicio: promocao.dataInicio,
      dataFim: promocao.dataFim,
      ativo: promocao.ativo,
      criadoEm: promocao.criadoEm,
      atualizadoEm: promocao.atualizadoEm,
      produto: promocao.produto
    };
  }
}