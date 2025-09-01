/**
 * Serviço de Produtos - Sistema de Farmácia
 * 
 * Implementa regras de negócio para gestão de produtos farmacêuticos.
 * Inclui validações conforme regulamentação ANVISA e controle de medicamentos.
 */

import { DatabaseConnection } from '@/infrastructure/database/connection';
import { 
  Produto, 
  CreateProdutoData, 
  UpdateProdutoData, 
  ProdutoBusinessRules,
  ClassificacaoAnvisa,
  ClasseControlada,
  TipoReceita
} from '@/domain/entities/Produto';
import { logger } from '@/shared/utils/logger';

export interface ListProdutosParams {
  page?: number;
  limit?: number;
  search?: string;
  categoriaId?: string;
  classificacaoAnvisa?: ClassificacaoAnvisa;
  exigeReceita?: boolean;
  ativo?: boolean;
  estoqueMinimo?: boolean; // Filtro para produtos com estoque baixo
}

export interface ListProdutosResponse {
  produtos: Produto[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class ProdutoService {
  private logger = logger;

  private get prisma() {
    return DatabaseConnection.getClient();
  }

  /**
   * Lista produtos com filtros e paginação
   */
  async listarProdutos(params: ListProdutosParams = {}): Promise<ListProdutosResponse> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        categoriaId,
        classificacaoAnvisa,
        exigeReceita,
        ativo = true,
        estoqueMinimo
      } = params;

      const skip = (page - 1) * limit;
      const where: any = { ativo };

      // Filtro de busca por nome, código de barras ou princípio ativo
      if (search) {
        where.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { codigoBarras: { contains: search, mode: 'insensitive' } },
          { principioAtivo: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Filtro por categoria
      if (categoriaId) {
        where.categoriaId = categoriaId;
      }

      // Filtro por classificação ANVISA
      if (classificacaoAnvisa) {
        where.classificacaoAnvisa = classificacaoAnvisa;
      }

      // Filtro por medicamentos que exigem receita
      if (exigeReceita !== undefined) {
        where.exigeReceita = exigeReceita;
      }

      // Filtro para produtos com estoque baixo
      if (estoqueMinimo) {
        where.estoque = {
          lte: {
            field: 'estoqueMinimo'
          }
        };
      }

      const [produtos, total] = await Promise.all([
        this.prisma.produto.findMany({
          where,
          skip,
          take: limit,
          include: {
            categoria: true
          },
          orderBy: {
            nome: 'asc'
          }
        }),
        this.prisma.produto.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        produtos: produtos.map((produto: any) => this.mapProduto(produto)),
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
      this.logger.error('Erro ao listar produtos:', error);
      if (error.message && error.message.includes('connection')) {
        throw new Error('connection');
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca produto por ID
   */
  async buscarProdutoPorId(id: string): Promise<Produto | null> {
    try {
      const produto = await this.prisma.produto.findUnique({
        where: { id },
        include: {
          categoria: true
        }
      });

      return produto ? this.mapProduto(produto) : null;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar produto por ID ${id}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca produto por código de barras
   */
  async buscarProdutoPorCodigoBarras(codigoBarras: string): Promise<Produto | null> {
    try {
      const produto = await this.prisma.produto.findFirst({
        where: {
          codigoBarras,
          ativo: true
        },
        include: {
          categoria: true
        }
      });

      return produto ? this.mapProduto(produto) : null;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar produto por código de barras ${codigoBarras}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca produto por termo (código de barras, nome ou princípio ativo)
   */
  async buscarProdutoPorTermo(termo: string): Promise<Produto | null> {
    try {
      const produto = await this.prisma.produto.findFirst({
        where: {
          AND: [
            { ativo: true },
            {
              OR: [
                { codigoBarras: { equals: termo, mode: 'insensitive' } },
                { nome: { contains: termo, mode: 'insensitive' } },
                { principioAtivo: { contains: termo, mode: 'insensitive' } }
              ]
            }
          ]
        },
        include: {
          categoria: true
        }
      });

      return produto ? this.mapProduto(produto) : null;
    } catch (error: any) {
      this.logger.error(`Erro ao buscar produto por termo ${termo}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria novo produto
   */
  async criarProduto(data: CreateProdutoData): Promise<Produto> {
    try {
      // Validações de negócio
      const errors = ProdutoBusinessRules.validateProduto(data);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      // Verificar se categoria existe
      const categoria = await this.prisma.categoria.findUnique({
        where: { id: data.categoriaId }
      });
      if (!categoria) {
        throw new Error('Categoria não encontrada');
      }

      // Verificar código de barras único
      if (data.codigoBarras) {
        const produtoExistente = await this.buscarProdutoPorCodigoBarras(data.codigoBarras);
        if (produtoExistente) {
          throw new Error('Código de barras já cadastrado');
        }
      }

      // Verificar nome único
      const produtoComNome = await this.prisma.produto.findFirst({
        where: {
          nome: {
            equals: data.nome,
            mode: 'insensitive'
          }
        }
      });
      if (produtoComNome) {
        throw new Error('Produto com este nome já existe');
      }

      // Processar regras de medicamentos controlados
      const dadosProcessados = this.processarMedicamentoControlado(data);

      const novoProduto = await this.prisma.produto.create({
        data: {
          nome: data.nome,
          descricao: data.descricao,
          codigoBarras: data.codigoBarras,
          classificacaoAnvisa: data.classificacaoAnvisa,
          categoriaAnvisa: data.categoriaAnvisa,
          registroAnvisa: data.registroAnvisa,
          exigeReceita: dadosProcessados.exigeReceita,
          tipoReceita: dadosProcessados.tipoReceita,
          classeControlada: data.classeControlada,
          retencaoReceita: dadosProcessados.retencaoReceita,
          principioAtivo: data.principioAtivo,
          laboratorio: data.laboratorio,
          peso: data.peso,
          volume: data.volume,
          dosagem: data.dosagem,
          formaFarmaceutica: data.formaFarmaceutica,
          dataVencimento: data.dataVencimento,
          lote: data.lote,
          precoVenda: data.precoVenda,
          precoCusto: data.precoCusto,
          margem: data.precoCusto ? ProdutoBusinessRules.calcularMargem(data.precoCusto, data.precoVenda) : undefined,
          estoque: data.estoque,
          estoqueMinimo: data.estoqueMinimo,
          estoqueMaximo: data.estoqueMaximo,
          categoriaId: data.categoriaId,
          ativo: data.ativo ?? true
        },
        include: {
          categoria: true
        }
      });

      this.logger.info(`Produto criado: ${novoProduto.nome} (${novoProduto.id})`);

      return this.mapProduto(novoProduto);
    } catch (error: any) {
      this.logger.error('Erro ao criar produto:', error);
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
   * Atualiza produto existente
   */
  async atualizarProduto(id: string, data: UpdateProdutoData): Promise<Produto> {
    try {
      // Verificar se produto existe
      const produtoExistente = await this.prisma.produto.findUnique({
        where: { id }
      });
      if (!produtoExistente) {
        throw new Error('Produto não encontrado');
      }

      // Verificar categoria se alterada
      if (data.categoriaId && data.categoriaId !== produtoExistente.categoriaId) {
        const categoria = await this.prisma.categoria.findUnique({
          where: { id: data.categoriaId }
        });
        if (!categoria) {
          throw new Error('Categoria não encontrada');
        }
      }

      // Verificar nome único (se alterado)
      if (data.nome && data.nome !== produtoExistente.nome) {
        const produtoComNome = await this.prisma.produto.findFirst({
          where: {
            nome: {
              equals: data.nome,
              mode: 'insensitive'
            },
            id: {
              not: id
            }
          }
        });
        if (produtoComNome) {
          throw new Error('Produto com este nome já existe');
        }
      }

      // Verificar código de barras único (se alterado)
      if (data.codigoBarras && data.codigoBarras !== produtoExistente.codigoBarras) {
        const produtoComCodigo = await this.buscarProdutoPorCodigoBarras(data.codigoBarras);
        if (produtoComCodigo) {
          throw new Error('Código de barras já cadastrado');
        }
      }

      // Processar regras de medicamentos controlados
      const dadosProcessados = this.processarMedicamentoControlado({
        ...produtoExistente,
        ...data
      } as CreateProdutoData);

      // Calcular margem se preços forem alterados
      let margem = data.margem;
      if ((data.precoCusto !== undefined || data.precoVenda !== undefined) && data.margem === undefined) {
        const precoCusto = data.precoCusto ?? produtoExistente.precoCusto;
        const precoVenda = data.precoVenda ?? produtoExistente.precoVenda;
        if (precoCusto && precoVenda) {
          margem = ProdutoBusinessRules.calcularMargem(Number(precoCusto), Number(precoVenda));
        }
      }

      const produtoAtualizado = await this.prisma.produto.update({
        where: { id },
        data: {
          ...(data.nome && { nome: data.nome }),
          ...(data.descricao !== undefined && { descricao: data.descricao }),
          ...(data.codigoBarras !== undefined && { codigoBarras: data.codigoBarras }),
          ...(data.classificacaoAnvisa && { classificacaoAnvisa: data.classificacaoAnvisa }),
          ...(data.categoriaAnvisa !== undefined && { categoriaAnvisa: data.categoriaAnvisa }),
          ...(data.registroAnvisa !== undefined && { registroAnvisa: data.registroAnvisa }),
          exigeReceita: dadosProcessados.exigeReceita,
          tipoReceita: dadosProcessados.tipoReceita,
          ...(data.classeControlada !== undefined && { classeControlada: data.classeControlada }),
          retencaoReceita: dadosProcessados.retencaoReceita,
          ...(data.principioAtivo !== undefined && { principioAtivo: data.principioAtivo }),
          ...(data.laboratorio !== undefined && { laboratorio: data.laboratorio }),
          ...(data.peso !== undefined && { peso: data.peso }),
          ...(data.volume !== undefined && { volume: data.volume }),
          ...(data.dosagem !== undefined && { dosagem: data.dosagem }),
          ...(data.formaFarmaceutica !== undefined && { formaFarmaceutica: data.formaFarmaceutica }),
          ...(data.dataVencimento !== undefined && { dataVencimento: data.dataVencimento }),
          ...(data.lote !== undefined && { lote: data.lote }),
          ...(data.precoVenda !== undefined && { precoVenda: data.precoVenda }),
          ...(data.precoCusto !== undefined && { precoCusto: data.precoCusto }),
          ...(margem !== undefined && { margem }),
          ...(data.estoque !== undefined && { estoque: data.estoque }),
          ...(data.estoqueMinimo !== undefined && { estoqueMinimo: data.estoqueMinimo }),
          ...(data.estoqueMaximo !== undefined && { estoqueMaximo: data.estoqueMaximo }),
          ...(data.ativo !== undefined && { ativo: data.ativo }),
          ...(data.categoriaId && { categoriaId: data.categoriaId })
        },
        include: {
          categoria: true
        }
      });

      this.logger.info(`Produto atualizado: ${produtoAtualizado.nome} (${produtoAtualizado.id})`);

      return this.mapProduto(produtoAtualizado);
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar produto ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Remove produto (soft delete)
   */
  async removerProduto(id: string): Promise<void> {
    try {
      const produto = await this.prisma.produto.findUnique({
        where: { id }
      });

      if (!produto) {
        throw new Error('Produto não encontrado');
      }

      await this.prisma.produto.update({
        where: { id },
        data: {
          ativo: false
        }
      });

      this.logger.info(`Produto removido: ${produto.nome} (${produto.id})`);
    } catch (error: any) {
      this.logger.error(`Erro ao remover produto ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Atualiza estoque do produto
   */
  async atualizarEstoque(id: string, quantidade: number, operacao: 'ENTRADA' | 'SAIDA', usuarioId: string): Promise<Produto> {
    try {
      const produto = await this.prisma.produto.findUnique({
        where: { id }
      });

      if (!produto) {
        throw new Error('Produto não encontrado');
      }

      const novoEstoque = operacao === 'ENTRADA' 
        ? produto.estoque + quantidade
        : produto.estoque - quantidade;

      if (novoEstoque < 0) {
        throw new Error('Estoque insuficiente para esta operação');
      }

      const produtoAtualizado = await this.prisma.produto.update({
        where: { id },
        data: {
          estoque: novoEstoque
        },
        include: {
          categoria: true
        }
      });

      // Registrar movimentação de estoque
      await this.prisma.movimentacaoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: operacao,
          quantidade,
          motivo: `${operacao} manual de estoque`,
          usuarioId
        }
      });

      this.logger.info(`Estoque atualizado: ${produto.nome} - ${operacao} ${quantidade} (${produto.estoque} → ${novoEstoque})`);

      return this.mapProduto(produtoAtualizado);
    } catch (error: any) {
      this.logger.error(`Erro ao atualizar estoque do produto ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista produtos com estoque baixo
   */
  async listarProdutosEstoqueBaixo(): Promise<Produto[]> {
    try {
      const produtos = await this.prisma.produto.findMany({
        where: {
          ativo: true,
          estoque: {
            lte: this.prisma.produto.fields.estoqueMinimo
          }
        },
        include: {
          categoria: true
        },
        orderBy: [
          {
            estoque: 'asc'
          },
          {
            nome: 'asc'
          }
        ]
      });

      return produtos.map((produto: any) => this.mapProduto(produto));
    } catch (error: any) {
      this.logger.error('Erro ao listar produtos com estoque baixo:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Processa regras de medicamentos controlados
   */
  private processarMedicamentoControlado(data: CreateProdutoData) {
    let exigeReceita = data.exigeReceita || false;
    let tipoReceita = data.tipoReceita;
    let retencaoReceita = false;

    // Se é medicamento e tem classe controlada
    if (data.classificacaoAnvisa === ClassificacaoAnvisa.MEDICAMENTO && data.classeControlada) {
      exigeReceita = true;
      tipoReceita = ProdutoBusinessRules.getTipoReceita(data.classeControlada as ClasseControlada);
      retencaoReceita = ProdutoBusinessRules.requiresRecipeRetention(data.classeControlada as ClasseControlada);
    }

    return {
      exigeReceita,
      tipoReceita,
      retencaoReceita
    };
  }

  /**
   * Mapeia produto do Prisma para entidade
   */
  private mapProduto(produto: any): Produto & { controlado: boolean } {
    return {
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao || undefined,
      codigoBarras: produto.codigoBarras || undefined,
      classificacaoAnvisa: produto.classificacaoAnvisa as ClassificacaoAnvisa,
      categoriaAnvisa: produto.categoriaAnvisa || undefined,
      registroAnvisa: produto.registroAnvisa || undefined,
      exigeReceita: produto.exigeReceita,
      tipoReceita: produto.tipoReceita as TipoReceita || undefined,
      classeControlada: produto.classeControlada as ClasseControlada || undefined,
      retencaoReceita: produto.retencaoReceita,
      principioAtivo: produto.principioAtivo || undefined,
      laboratorio: produto.laboratorio || undefined,
      peso: produto.peso ? Number(produto.peso) : undefined,
      volume: produto.volume ? Number(produto.volume) : undefined,
      dosagem: produto.dosagem || undefined,
      formaFarmaceutica: produto.formaFarmaceutica || undefined,
      dataVencimento: produto.dataVencimento || undefined,
      lote: produto.lote || undefined,
      precoVenda: Number(produto.precoVenda),
      precoCusto: produto.precoCusto ? Number(produto.precoCusto) : undefined,
      margem: produto.margem ? Number(produto.margem) : undefined,
      estoque: produto.estoque,
      estoqueMinimo: produto.estoqueMinimo,
      estoqueMaximo: produto.estoqueMaximo || undefined,
      ativo: produto.ativo,
      criadoEm: produto.criadoEm,
      atualizadoEm: produto.atualizadoEm,
      categoriaId: produto.categoriaId,
      // Adicionar propriedade controlado baseada em exigeReceita
      controlado: produto.exigeReceita || false
    };
  }
}
