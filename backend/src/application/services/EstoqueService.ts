/**
 * Service de Estoque - Sistema de Farmácia
 * 
 * Implementa controle de estoque com sincronização offline-first.
 * Permite vendas sem internet e sincronização automática.
 */

import { PrismaClient } from '@prisma/client';
import { 
  MovimentacaoEstoque, 
  CreateMovimentacaoEstoqueData, 
  EstoqueResumo,
  VendaOffline,
  TipoMovimentacao,
  StatusEstoque,
  StatusSincronizacao,
  EstoqueBusinessRules
} from '@/domain/entities/Estoque';
import { logger } from '@/shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ListMovimentacoesParams {
  page?: number;
  limit?: number;
  produtoId?: string;
  tipo?: TipoMovimentacao;
  usuarioId?: string;
  dataInicio?: Date;
  dataFim?: Date;

}

export interface SincronizacaoResult {
  processadas: number;
  sucessos: number;
  erros: number;
  conflitos: number;
  detalhes: SincronizacaoDetalhe[];
}

export interface SincronizacaoDetalhe {
  id: string;
  tipo: 'movimentacao' | 'venda';
  status: StatusSincronizacao;
  erro?: string;
  dados?: any;
}

export class EstoqueService {
  private prisma: PrismaClient;
  private logger = logger;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Movimenta estoque (método público para uso externo)
   */
  async movimentarEstoque(data: {
    produtoId: string;
    tipo: string;
    quantidade: number;
    motivo: string;
    usuarioId: string;
  }): Promise<void> {
    await this.registrarMovimentacao({
      produtoId: data.produtoId,
      tipo: data.tipo as TipoMovimentacao,
      quantidade: data.quantidade,
      motivo: data.motivo,
      usuarioId: data.usuarioId,
    });
  }

  /**
   * Registra movimentação de estoque
   */
  async registrarMovimentacao(data: CreateMovimentacaoEstoqueData): Promise<MovimentacaoEstoque> {
    try {
      // Validações de negócio
      const validationErrors = EstoqueBusinessRules.validateMovimentacao(data);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Buscar produto atual
      const produto = await this.prisma.produto.findUnique({
        where: { id: data.produtoId }
      });

      if (!produto) {
        throw new Error('Produto não encontrado');
      }

      // Verificar se é saída e há estoque suficiente
      if (data.tipo === TipoMovimentacao.SAIDA) {
        const errosEstoque = EstoqueBusinessRules.validateSaidaEstoque(produto.estoque, data.quantidade);
        if (errosEstoque.length > 0) {
          throw new Error(errosEstoque.join(', '));
        }
      }

      // Calcular nova quantidade
      let novaQuantidade = produto.estoque;
      if ([TipoMovimentacao.ENTRADA, TipoMovimentacao.AJUSTE].includes(data.tipo)) {
        novaQuantidade += data.quantidade;
      } else if ([TipoMovimentacao.SAIDA, TipoMovimentacao.PERDA, TipoMovimentacao.VENCIMENTO].includes(data.tipo)) {
        novaQuantidade -= data.quantidade;
      }

      // Executar transação
      const resultado = await this.prisma.$transaction(async (tx) => {
        // Atualizar estoque do produto
        await tx.produto.update({
          where: { id: data.produtoId },
          data: { estoque: novaQuantidade }
        });

        // Registrar movimentação
        const movimentacao = await tx.movimentacaoEstoque.create({
          data: {
            produtoId: data.produtoId,
            tipo: data.tipo,
            quantidade: data.quantidade,
            motivo: data.motivo,
            usuarioId: data.usuarioId,
          }
        });

        return movimentacao;
      });

      this.logger.info(`Movimentação registrada: ${data.tipo} ${data.quantidade} - ${produto.nome}`);

      return this.mapMovimentacao(resultado);
    } catch (error: any) {
      this.logger.error('Erro ao registrar movimentação:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error.message && error.message.includes('Falha na transação')) {
        throw new Error('transaction');
      }
      // Repassar outros erros
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista movimentações com filtros
   */
  async listarMovimentacoes(params: ListMovimentacoesParams = {}): Promise<{
    movimentacoes: MovimentacaoEstoque[];
    pagination: any;
  }> {
    try {
              const {
          page = 1,
          limit = 50,
          produtoId,
          tipo,
          usuarioId,
          dataInicio,
          dataFim
        } = params;

      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100);

      // Construir filtros
      const where: any = {};
      
      if (produtoId) where.produtoId = produtoId;
      if (tipo) where.tipo = tipo;
      if (usuarioId) where.usuarioId = usuarioId;

      
      if (dataInicio || dataFim) {
        where.criadoEm = {};
        if (dataInicio) where.criadoEm.gte = dataInicio;
        if (dataFim) where.criadoEm.lte = dataFim;
      }

      const [movimentacoes, total] = await Promise.all([
        this.prisma.movimentacaoEstoque.findMany({
          where,
          include: {
            produto: true,
            usuario: true
          },
          skip,
          take,
          orderBy: { criadoEm: 'desc' }
        }),
        this.prisma.movimentacaoEstoque.count({ where })
      ]);

      const totalPages = Math.ceil(total / take);

      return {
        movimentacoes: movimentacoes.map(this.mapMovimentacao),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: take,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      this.logger.error('Erro ao listar movimentações:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Obtém resumo do estoque
   */
  async obterResumoEstoque(): Promise<EstoqueResumo[]> {
    try {
      const produtos = await this.prisma.produto.findMany({
        where: { ativo: true },
        include: {
          categoria: true,
          movimentacoes: {
            orderBy: { criadoEm: 'desc' },
            take: 1
          }
        }
      });

      return produtos.map(produto => {
        const status = EstoqueBusinessRules.determinarStatusEstoque(
          produto.estoque,
          produto.estoqueMinimo,
          produto.estoqueMaximo || undefined
        );

        const valorTotal = EstoqueBusinessRules.calcularValorEstoque(
          produto.estoque,
          produto.precoCusto ? Number(produto.precoCusto) : 0
        );

        return {
          produtoId: produto.id,
          nomeProduto: produto.nome,
          quantidade: produto.estoque,
          estoqueMinimo: produto.estoqueMinimo,
          estoqueMaximo: produto.estoqueMaximo || undefined,
          valorTotal,
          ultimaMovimentacao: produto.movimentacoes[0]?.criadoEm,
          status
        };
      });
    } catch (error: any) {
      this.logger.error('Erro ao obter resumo do estoque:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista produtos com estoque baixo
   */
  async listarProdutosEstoqueBaixo(): Promise<EstoqueResumo[]> {
    try {
      const resumo = await this.obterResumoEstoque();
      return resumo.filter(item => 
        [StatusEstoque.BAIXO, StatusEstoque.CRITICO, StatusEstoque.ZERADO].includes(item.status)
      );
    } catch (error: any) {
      this.logger.error('Erro ao listar produtos com estoque baixo:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Sincroniza vendas offline
   */
  async sincronizarVendasOffline(vendas: VendaOffline[]): Promise<SincronizacaoResult> {
    const resultado: SincronizacaoResult = {
      processadas: 0,
      sucessos: 0,
      erros: 0,
      conflitos: 0,
      detalhes: []
    };

    for (const venda of vendas) {
      resultado.processadas++;
      
      try {
        // Validar integridade
        if (!EstoqueBusinessRules.validarIntegridade(venda)) {
          resultado.erros++;
          resultado.detalhes.push({
            id: venda.id,
            tipo: 'venda',
            status: StatusSincronizacao.ERRO,
            erro: 'Falha na validação de integridade'
          });
          continue;
        }

        // Verificar se já foi sincronizada
        const vendaExistente = await this.prisma.venda.findUnique({
          where: { id: venda.id }
        });

        if (vendaExistente) {
          resultado.conflitos++;
          resultado.detalhes.push({
            id: venda.id,
            tipo: 'venda',
            status: StatusSincronizacao.CONFLITO,
            erro: 'Venda já existe no servidor'
          });
          continue;
        }

        // Processar venda
        await this.processarVendaOffline(venda);
        
        resultado.sucessos++;
        resultado.detalhes.push({
          id: venda.id,
          tipo: 'venda',
          status: StatusSincronizacao.SINCRONIZADO
        });

      } catch (error: any) {
        let mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
        
        // Verificar se é erro de estoque insuficiente (conflito)
        if (error.message && error.message.includes('Estoque insuficiente')) {
          resultado.conflitos++;
          resultado.detalhes.push({
            id: venda.id,
            tipo: 'venda',
            status: StatusSincronizacao.CONFLITO,
            erro: mensagemErro
          });
        } else {
          resultado.erros++;
          
          // Verificar se é erro de conexão
          if (error.message && error.message.includes('Conexão perdida')) {
            mensagemErro = 'Falha na conexão com o servidor';
          } else if (error.message && error.message.includes('Falha na transação')) {
            mensagemErro = 'Falha na transação do banco de dados';
          }
          
          resultado.detalhes.push({
            id: venda.id,
            tipo: 'venda',
            status: StatusSincronizacao.ERRO,
            erro: mensagemErro
          });
        }
      }
    }

    this.logger.info(`Sincronização concluída: ${resultado.sucessos} sucessos, ${resultado.erros} erros, ${resultado.conflitos} conflitos`);

    return resultado;
  }

  /**
   * Processa venda offline no servidor
   */
  private async processarVendaOffline(vendaOffline: VendaOffline): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Criar venda
      const venda = await tx.venda.create({
        data: {
          id: vendaOffline.id,
          clienteId: vendaOffline.clienteId,
          usuarioId: vendaOffline.usuarioId,
          valorTotal: vendaOffline.valorTotal,
          valorFinal: vendaOffline.valorTotal, // Campo obrigatório
          formaPagamento: 'DINHEIRO', // Campo obrigatório - padrão para vendas offline
          observacoes: vendaOffline.observacoes,
          criadoEm: vendaOffline.clienteTimestamp
        }
      });

      // Criar itens e movimentações
      for (const item of vendaOffline.itens) {
        // Criar item da venda
        await tx.itemVenda.create({
          data: {
            id: item.id,
            vendaId: venda.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            total: item.subtotal // Campo correto é 'total'
          }
        });

        // Registrar movimentação de estoque
        const produto = await tx.produto.findUniqueOrThrow({
          where: { id: item.produtoId }
        });

        // Verificar se há estoque suficiente
        if (produto.estoque < item.quantidade) {
          throw new Error(`Estoque insuficiente para o produto ${produto.nome || item.produtoId}. Disponível: ${produto.estoque}, Solicitado: ${item.quantidade}`);
        }

        const novaQuantidade = produto.estoque - item.quantidade;

        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoque: novaQuantidade }
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            tipo: TipoMovimentacao.SAIDA,
            quantidade: item.quantidade,
            motivo: `Venda #${venda.id}`,
            usuarioId: venda.usuarioId
          }
        });
      }
    });
  }

  /**
   * Busca movimentações pendentes de sincronização
   */
  async buscarMovimentacoesPendentes(): Promise<MovimentacaoEstoque[]> {
    try {
      const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
        include: {
          produto: true,
          usuario: true
        },
        orderBy: { criadoEm: 'asc' }
      });

      return movimentacoes.map(this.mapMovimentacao);
    } catch (error: any) {
      this.logger.error('Erro ao buscar movimentações pendentes:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Marca movimentação como sincronizada
   */
  async marcarComoSincronizada(id: string): Promise<void> {
    try {
      // Schema atual não possui campos de sincronização
      this.logger.info(`Movimentação ${id} processada`);
    } catch (error: any) {
      this.logger.error(`Erro ao processar movimentação ${id}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Simula venda offline (para testes)
   */
  gerarVendaOffline(itens: Array<{
    produtoId: string;
    quantidade: number;
    precoUnitario: number;
    nomeProduto: string;
    exigeReceita: boolean;
  }>, usuarioId: string, clienteId?: string): VendaOffline {
    const vendaId = uuidv4();
    const itensVenda = itens.map(item => ({
      id: uuidv4(),
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      subtotal: item.quantidade * item.precoUnitario,
      nomeProduto: item.nomeProduto,
      exigeReceita: item.exigeReceita
    }));

    const valorTotal = itensVenda.reduce((total, item) => total + item.subtotal, 0);
    const clienteTimestamp = new Date();

    const vendaBase = {
      id: vendaId,
      itens: itensVenda,
      valorTotal,
      clienteId,
      usuarioId,
      clienteTimestamp
    };

    const hashIntegridade = EstoqueBusinessRules.gerarHashIntegridade(vendaBase);

    return {
      ...vendaBase,
      sincronizado: false,
      hashIntegridade
    };
  }

  /**
   * Obtém alertas de estoque (baixo, crítico, vencimento)
   */
  async obterAlertasEstoque(): Promise<any> {
    try {
      const produtos = await this.prisma.produto.findMany({
        where: {
          ativo: true,
          OR: [
            { estoque: { lte: 10 } }, // Estoque baixo
            { estoque: { lte: 5 } },  // Estoque crítico
            { estoque: { equals: 0 } } // Estoque zerado
          ]
        },
        include: {
          categoria: true
        }
      });

      const produtosVencimento = await this.prisma.produto.findMany({
        where: {
          ativo: true,
          dataVencimento: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            gte: new Date()
          }
        },
        include: {
          categoria: true
        }
      });

      return {
        total: produtos.length + produtosVencimento.length,
        estoqueBaixo: produtos.filter(p => p.estoque <= 10 && p.estoque > 5),
        estoqueCritico: produtos.filter(p => p.estoque <= 5 && p.estoque > 0),
        estoqueZerado: produtos.filter(p => p.estoque === 0),
        proximosVencimento: produtosVencimento,
        resumo: {
          totalAlertas: produtos.length + produtosVencimento.length,
          estoqueBaixo: produtos.filter(p => p.estoque <= 10 && p.estoque > 5).length,
          estoqueCritico: produtos.filter(p => p.estoque <= 5 && p.estoque > 0).length,
          estoqueZerado: produtos.filter(p => p.estoque === 0).length,
          proximosVencimento: produtosVencimento.length
        }
      };
    } catch (error) {
      this.logger.error('Erro ao obter alertas de estoque:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Obtém dados para dashboard de estoque
   */
  async obterDashboardEstoque(): Promise<any> {
    try {
      const [
        totalProdutos,
        produtosAtivos,
        produtosInativos,
        valorTotalEstoque,
        movimentacoesHoje,
        movimentacoesSemana
      ] = await Promise.all([
        this.prisma.produto.count(),
        this.prisma.produto.count({ where: { ativo: true } }),
        this.prisma.produto.count({ where: { ativo: false } }),
        this.prisma.produto.aggregate({
          where: { ativo: true },
          _sum: {
            estoque: true
          }
        }),
        this.prisma.movimentacaoEstoque.count({
          where: {
            criadoEm: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        this.prisma.movimentacaoEstoque.count({
          where: {
            criadoEm: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      const produtosEstoqueBaixo = await this.prisma.produto.count({
        where: {
          ativo: true,
          estoque: { lte: 10 }
        }
      });

      const produtosVencimento = await this.prisma.produto.count({
        where: {
          ativo: true,
          dataVencimento: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date()
          }
        }
      });

      return {
        estatisticas: {
          totalProdutos,
          produtosAtivos,
          produtosInativos,
          valorTotalEstoque: valorTotalEstoque._sum.estoque || 0,
          produtosEstoqueBaixo,
          produtosVencimento
        },
        movimentacoes: {
          hoje: movimentacoesHoje,
          ultimaSemana: movimentacoesSemana
        },
        alertas: {
          estoqueBaixo: produtosEstoqueBaixo > 0,
          vencimento: produtosVencimento > 0
        }
      };
    } catch (error) {
      this.logger.error('Erro ao obter dashboard de estoque:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Gera relatório de movimentações por período
   */
  async gerarRelatorioMovimentacoes(
    dataInicio: Date,
    dataFim: Date,
    tipo?: string,
    produtoId?: string
  ): Promise<any> {
    try {
      const where: any = {
        criadoEm: {
          gte: dataInicio,
          lte: dataFim
        }
      };

      if (tipo) where.tipo = tipo;
      if (produtoId) where.produtoId = produtoId;

      const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
        where,
        include: {
          produto: {
            select: {
              nome: true,
              codigoBarras: true,
              categoria: {
                select: { nome: true }
              }
            }
          },
          usuario: {
            select: {
              nome: true,
              login: true
            }
          }
        },
        orderBy: {
          criadoEm: 'desc'
        }
      });

      const resumo = {
        periodo: {
          inicio: dataInicio,
          fim: dataFim
        },
        totalMovimentacoes: movimentacoes.length,
        porTipo: movimentacoes.reduce((acc, mov) => {
          acc[mov.tipo] = (acc[mov.tipo] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        movimentacoes
      };

      return resumo;
    } catch (error) {
      this.logger.error('Erro ao gerar relatório de movimentações:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista produtos próximos do vencimento
   */
  async listarProdutosVencimento(dias: number = 30): Promise<any[]> {
    try {
      const dataLimite = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

      const produtos = await this.prisma.produto.findMany({
        where: {
          ativo: true,
          dataVencimento: {
            lte: dataLimite,
            gte: new Date()
          }
        },
        include: {
          categoria: {
            select: { nome: true }
          }
        },
        orderBy: {
          dataVencimento: 'asc'
        }
      });

      return produtos.map(produto => ({
        id: produto.id,
        nome: produto.nome,
        codigoBarras: produto.codigoBarras,
        estoque: produto.estoque,
        dataVencimento: produto.dataVencimento,
        lote: produto.lote,
        categoria: produto.categoria.nome,
        diasParaVencimento: Math.ceil((produto.dataVencimento!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        estoqueMinimo: produto.estoqueMinimo,
        precoVenda: Number(produto.precoVenda || 0)
      }));
    } catch (error) {
      this.logger.error('Erro ao listar produtos próximos do vencimento:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Mapeia movimentação do Prisma para entidade
   */
  private mapMovimentacao(movimentacao: any): any {
    return {
      id: movimentacao.id,
      produtoId: movimentacao.produtoId,
      tipo: movimentacao.tipo as TipoMovimentacao,
      quantidade: movimentacao.quantidade,
      quantidadeAnterior: movimentacao.quantidadeAnterior,
      quantidadeAtual: movimentacao.quantidadeAtual,
      motivo: movimentacao.motivo,
      observacoes: movimentacao.observacoes || undefined,
      vendaId: movimentacao.vendaId || undefined,
      itemVendaId: movimentacao.itemVendaId || undefined,
      usuarioId: movimentacao.usuarioId,
      sincronizado: movimentacao.sincronizado,
      clienteTimestamp: movimentacao.clienteTimestamp,
      servidorTimestamp: movimentacao.servidorTimestamp || undefined,
      criadoEm: movimentacao.criadoEm,
      atualizadoEm: movimentacao.atualizadoEm,
      dataMovimentacao: movimentacao.criadoEm ? movimentacao.criadoEm.toISOString() : new Date().toISOString(),
      // Incluir dados das relações
      produto: movimentacao.produto ? {
        nome: movimentacao.produto.nome,
        codigoBarras: movimentacao.produto.codigoBarras
      } : undefined,
      usuario: movimentacao.usuario ? {
        nome: movimentacao.usuario.nome
      } : undefined
    };
  }
}
