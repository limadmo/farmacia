/**
 * Serviço de Promoções - Sistema de Farmácia
 * 
 * Implementa regras de negócio para gestão de promoções de produtos farmacêuticos.
 * Inclui validações de período, quantidade e cálculos de preços promocionais.
 */

import { DatabaseConnection } from '@/infrastructure/database/connection';
import { Decimal } from '@prisma/client/runtime/library';
import { ValidationError, ConflictError } from '@/presentation/middleware/errorHandler';
import { 
  Promocao, 
  CreatePromocaoData, 
  UpdatePromocaoData, 
  PromocaoBusinessRules,
  TipoPromocao,
  CondicaoTermino,
  TipoAlcancePromocao
} from '@/domain/entities/Promocao';

// Interfaces para seleção de lotes
export interface LotePromocaoSelecionado {
  loteId: string;
  numeroLote: string;
  dataValidade: string;
  quantidadeDisponivel: number;
  quantidadeAplicavel: number;
  diasParaVencimento?: number;
  precoCusto?: number;
}

export interface PromocaoLote {
  id: string;
  promocaoId: string;
  loteId: string;
  quantidadeAplicavel: number;
  criadoEm: Date;
  lote?: {
    id: string;
    numeroLote: string;
    dataValidade: Date;
    quantidadeAtual: number;
    precoCusto: number;
  };
}

// Extensão das interfaces existentes para suportar lotes selecionados
export interface CreatePromocaoDataExtended extends CreatePromocaoData {
  lotesSelecionados?: LotePromocaoSelecionado[];
}

export interface UpdatePromocaoDataExtended extends UpdatePromocaoData {
  lotesSelecionados?: LotePromocaoSelecionado[];
}
import { logger } from '@/shared/utils/logger';

export interface ListPromocoesParams {
  page?: number;
  limit?: number;
  search?: string;
  produtoId?: string;
  laboratorio?: string;
  loteId?: string;
  tipoAlcance?: TipoAlcancePromocao;
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
  produto?: {
    id: string;
    nome: string;
    precoVenda: number;
    estoque: number;
  };
  lote?: {
    id: string;
    numeroLote: string;
    dataValidade: Date;
  };
  lotesSelecionados?: LotePromocaoSelecionado[];
  promocaoLotes?: PromocaoLote[];
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
        laboratorio,
        loteId,
        tipoAlcance,
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
      
      // Filtro por laboratório
      if (laboratorio) {
        where.laboratorio = laboratorio;
      }
      
      // Filtro por lote
      if (loteId) {
        where.loteId = loteId;
      }
      
      // Filtro por tipo de alcance
      if (tipoAlcance) {
        where.tipoAlcance = tipoAlcance;
      }

      // Filtro por tipo de desconto
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
            },
            lotesSelecionados: {
              include: {
                lote: {
                  select: {
                    id: true,
                    numeroLote: true,
                    dataValidade: true,
                    quantidadeAtual: true,
                    precoCusto: true
                  }
                }
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
          },
          lotesSelecionados: {
            include: {
              lote: {
                select: {
                  id: true,
                  numeroLote: true,
                  dataValidade: true,
                  quantidadeAtual: true,
                  precoCusto: true
                }
              }
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
          tipoAlcance: TipoAlcancePromocao.PRODUTO,
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
   * Busca promoções ativas para um laboratório
   */
  async buscarPromocoesPorLaboratorio(laboratorio: string): Promise<PromocaoWithProduto[]> {
    try {
      const agora = new Date();
      
      const promocoes = await this.prisma.promocao.findMany({
        where: {
          laboratorio,
          tipoAlcance: TipoAlcancePromocao.LABORATORIO,
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
      this.logger.error(`Erro ao buscar promoções do laboratório ${laboratorio}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca promoções ativas para um lote específico
   */
  async buscarPromocoesPorLote(loteId: string): Promise<PromocaoWithProduto[]> {
    try {
      const agora = new Date();
      
      const promocoes = await this.prisma.promocao.findMany({
        where: {
          loteId,
          tipoAlcance: TipoAlcancePromocao.LOTE,
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
          },
          lote: {
            select: {
              id: true,
              numeroLote: true,
              dataValidade: true
            }
          }
        },
        orderBy: { criadoEm: 'desc' }
      });

      return promocoes
        .map(promocao => this.mapPromocao(promocao))
        .filter(promocao => PromocaoBusinessRules.podeAplicarPromocao(promocao));
    } catch (error: any) {
      this.logger.error(`Erro ao buscar promoções do lote ${loteId}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca todas as promoções aplicáveis a um produto (produto + laboratório + lote)
   * Retorna ordenado por hierarquia (lote > produto > laboratório)
   */
  async buscarTodasPromocoesAplicaveis(
    produtoId: string, 
    laboratorio?: string, 
    loteId?: string
  ): Promise<PromocaoWithProduto[]> {
    try {
      const agora = new Date();
      
      const where: any = {
        ativo: true,
        dataInicio: { lte: agora },
        dataFim: { gte: agora },
        OR: []
      };
      
      // Adicionar condições para cada tipo de alcance
      where.OR.push({
        tipoAlcance: TipoAlcancePromocao.PRODUTO,
        produtoId: produtoId
      });
      
      if (laboratorio) {
        where.OR.push({
          tipoAlcance: TipoAlcancePromocao.LABORATORIO,
          laboratorio: laboratorio
        });
      }
      
      if (loteId) {
        where.OR.push({
          tipoAlcance: TipoAlcancePromocao.LOTE,
          loteId: loteId
        });
      }
      
      const promocoes = await this.prisma.promocao.findMany({
        where,
        include: {
          produto: {
            select: {
              id: true,
              nome: true,
              precoVenda: true,
              estoque: true
            }
          },
          lote: {
            select: {
              id: true,
              numeroLote: true,
              dataValidade: true
            }
          }
        },
        orderBy: { criadoEm: 'desc' }
      });

      const promocoesMapeadas = promocoes
        .map(promocao => this.mapPromocao(promocao))
        .filter(promocao => PromocaoBusinessRules.podeAplicarPromocao(promocao));
      
      // Ordenar por hierarquia (lote > produto > laboratório)
      return promocoesMapeadas.sort((a, b) => 
        PromocaoBusinessRules.compararHierarquiaPromocoes(b, a) // Ordem decrescente
      );
    } catch (error: any) {
      this.logger.error(`Erro ao buscar promoções aplicáveis ao produto ${produtoId}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria nova promoção com suporte a lotes selecionados
   */
  async criarPromocao(data: CreatePromocaoDataExtended): Promise<PromocaoWithProduto> {
    try {
      // Validações de negócio
      const errors = PromocaoBusinessRules.validatePromocao(data);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Verificar se produto existe (para promoções por produto ou lote)
      let produto: any = null;
      if (data.tipoAlcance === TipoAlcancePromocao.PRODUTO && data.produtoId) {
        produto = await this.prisma.produto.findUnique({
          where: { id: data.produtoId }
        });
        if (!produto) {
          throw new Error('Produto não encontrado');
        }
      }
      
      // Verificar se lote existe (para promoções por lote)
      if (data.tipoAlcance === TipoAlcancePromocao.LOTE && data.loteId) {
        const lote = await this.prisma.lote.findUnique({
          where: { id: data.loteId },
          include: { produto: true }
        });
        if (!lote) {
          throw new Error('Lote não encontrado');
        }
        produto = lote.produto;
      }

      // Verificar se já existe promoção ativa com mesmo alcance no período
      const whereConflito: any = {
        tipoAlcance: data.tipoAlcance,
        ativo: true,
        OR: [
          {
            AND: [
              { dataInicio: { lte: data.dataFim } },
              { dataFim: { gte: data.dataInicio } }
            ]
          }
        ]
      };
      
      // Adicionar filtros específicos baseados no tipo de alcance
      if (data.tipoAlcance === TipoAlcancePromocao.PRODUTO) {
        whereConflito.produtoId = data.produtoId;
      } else if (data.tipoAlcance === TipoAlcancePromocao.LABORATORIO) {
        whereConflito.laboratorio = data.laboratorio;
      } else if (data.tipoAlcance === TipoAlcancePromocao.LOTE) {
        whereConflito.loteId = data.loteId;
      }
      
      const promocaoConflitante = await this.prisma.promocao.findFirst({
        where: whereConflito
      });

      if (promocaoConflitante) {
        const tipoMensagem = {
          [TipoAlcancePromocao.PRODUTO]: 'produto',
          [TipoAlcancePromocao.LABORATORIO]: 'laboratório',
          [TipoAlcancePromocao.LOTE]: 'lote'
        };
        throw new ConflictError(`Já existe uma promoção ativa para este ${tipoMensagem[data.tipoAlcance]} no período informado`);
      }

      // Calcular preço promocional (apenas para promoções que têm produto associado)
      let precoPromocional: number | null = null;
      if (produto) {
        precoPromocional = PromocaoBusinessRules.calcularPrecoPromocional(
          Number(produto.precoVenda),
          data.tipo,
          data.valorDesconto,
          data.porcentagemDesconto
        );
      }

      // Usar transação para criar promoção e lotes relacionados
      const novaPromocao = await this.prisma.$transaction(async (tx) => {
        // Criar a promoção
        const promocao = await tx.promocao.create({
          data: {
            nome: data.nome,
            descricao: data.descricao,
            tipoAlcance: data.tipoAlcance,
            produtoId: data.produtoId,
            laboratorio: data.laboratorio,
            loteId: data.loteId,
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
          }
        });

        // Criar relacionamentos com lotes selecionados (se houver)
        if (data.lotesSelecionados && data.lotesSelecionados.length > 0) {
          const promocaoLotesData = data.lotesSelecionados.map(lote => ({
            promocaoId: promocao.id,
            loteId: lote.loteId,
            quantidadeAplicavel: lote.quantidadeAplicavel
          }));

          await tx.promocaoLote.createMany({
            data: promocaoLotesData
          });
        }

        // Retornar promoção com includes
        return await tx.promocao.findUnique({
          where: { id: promocao.id },
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                precoVenda: true,
                estoque: true
              }
            },
            lote: {
              select: {
                id: true,
                numeroLote: true,
                dataValidade: true
              }
            },
            lotesSelecionados: {
              include: {
                lote: {
                  select: {
                    id: true,
                    numeroLote: true,
                    dataValidade: true,
                    quantidadeAtual: true,
                    precoCusto: true
                  }
                }
              }
            }
          }
        });
      });

      if (!novaPromocao) {
        throw new Error('Erro ao criar promoção');
      }

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
   * Atualiza promoção existente com suporte a lotes selecionados
   */
  async atualizarPromocao(id: string, data: UpdatePromocaoDataExtended): Promise<PromocaoWithProduto> {
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
        
        if (promocaoExistente.produto) {
          precoPromocional = PromocaoBusinessRules.calcularPrecoPromocional(
            Number(promocaoExistente.produto.precoVenda),
            tipo as TipoPromocao,
            valorDesconto,
            porcentagemDesconto
          );
        }
      }

      // Usar transação para atualizar promoção e lotes relacionados
      const promocaoAtualizada = await this.prisma.$transaction(async (tx) => {
        // Atualizar a promoção
        const { lotesSelecionados, ...dadosPromocao } = data;
        
        const promocao = await tx.promocao.update({
          where: { id },
          data: {
            ...dadosPromocao,
            precoPromocional: precoPromocional
          }
        });

        // Atualizar lotes selecionados se fornecidos
        if (lotesSelecionados !== undefined) {
          // Remover lotes existentes
          await tx.promocaoLote.deleteMany({
            where: { promocaoId: id }
          });

          // Criar novos relacionamentos
          if (lotesSelecionados.length > 0) {
            const promocaoLotesData = lotesSelecionados.map(lote => ({
              promocaoId: id,
              loteId: lote.loteId,
              quantidadeAplicavel: lote.quantidadeAplicavel
            }));

            await tx.promocaoLote.createMany({
              data: promocaoLotesData
            });
          }
        }

        // Retornar promoção atualizada com includes
        return await tx.promocao.findUnique({
          where: { id },
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                precoVenda: true,
                estoque: true
              }
            },
            lotesSelecionados: {
              include: {
                lote: {
                  select: {
                    id: true,
                    numeroLote: true,
                    dataValidade: true,
                    quantidadeAtual: true,
                    precoCusto: true
                  }
                }
              }
            }
          }
        });
      });

      if (!promocaoAtualizada) {
        throw new Error('Erro ao atualizar promoção');
      }

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
   * Lista lotes disponíveis para aplicação de promoção
   */
  async listarLotesDisponiveis(produtoId: string): Promise<LotePromocaoSelecionado[]> {
    try {
      const lotes = await this.prisma.lote.findMany({
        where: {
          produtoId: produtoId,
          quantidadeAtual: { gt: 0 } // Apenas lotes com estoque
        },
        select: {
          id: true,
          numeroLote: true,
          dataValidade: true,
          quantidadeAtual: true,
          precoCusto: true
        },
        orderBy: {
          dataValidade: 'asc' // FEFO - First Expire, First Out
        }
      });

      const hoje = new Date();
      
      return lotes.map(lote => {
        const dataValidade = new Date(lote.dataValidade);
        const diasParaVencimento = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          loteId: lote.id,
          numeroLote: lote.numeroLote,
          dataValidade: lote.dataValidade.toISOString(),
          quantidadeDisponivel: lote.quantidadeAtual,
          quantidadeAplicavel: lote.quantidadeAtual, // Por padrão, toda quantidade disponível
          diasParaVencimento: diasParaVencimento,
          precoCusto: lote.precoCusto ? Number(lote.precoCusto) : undefined
        };
      });
    } catch (error: any) {
      this.logger.error(`Erro ao listar lotes disponíveis para produto ${produtoId}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Mapeia dados do Prisma para entidade Promocao
   */
  private mapPromocao(promocao: any): PromocaoWithProduto {
    // Mapear lotes selecionados se existirem
    let lotesSelecionados: LotePromocaoSelecionado[] | undefined;
    if (promocao.lotesSelecionados && promocao.lotesSelecionados.length > 0) {
      const hoje = new Date();
      lotesSelecionados = promocao.lotesSelecionados.map((pl: any) => {
        const dataValidade = new Date(pl.lote.dataValidade);
        const diasParaVencimento = Math.floor((dataValidade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          loteId: pl.lote.id,
          numeroLote: pl.lote.numeroLote,
          dataValidade: pl.lote.dataValidade.toISOString(),
          quantidadeDisponivel: pl.lote.quantidadeAtual,
          quantidadeAplicavel: pl.quantidadeAplicavel,
          diasParaVencimento: diasParaVencimento,
          precoCusto: pl.lote.precoCusto ? Number(pl.lote.precoCusto) : undefined
        };
      });
    }

    return {
      id: promocao.id,
      nome: promocao.nome,
      descricao: promocao.descricao,
      tipoAlcance: promocao.tipoAlcance,
      produtoId: promocao.produtoId,
      laboratorio: promocao.laboratorio,
      loteId: promocao.loteId,
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
      produto: promocao.produto,
      lote: promocao.lote,
      lotesSelecionados: lotesSelecionados,
      promocaoLotes: promocao.lotesSelecionados
    };
  }
}