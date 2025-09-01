/**
 * Service de Vendas - Sistema de Farmácia
 * 
 * Implementa operações de vendas, incluindo criação, consulta e relatórios.
 * Gerencia itens de venda e integração com estoque.
 */

import { PrismaClient } from '@prisma/client';
import { 
  Venda, 
  ItemVenda, 
  CriarVendaData, 
  AtualizarVendaData,
  FiltroVenda,
  VendaBusinessRules
} from '@/domain/entities/Venda';
import { FormaPagamento } from '@/domain/enums/FormaPagamento';
import { StatusPagamento } from '@/domain/enums/StatusPagamento';
import { TipoMovimentacao } from '@/domain/entities/Estoque';
import { EstoqueService } from './EstoqueService';
import { ClienteService } from './ClienteService';
import { logger } from '@/shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ListVendasParams {
  page?: number;
  limit?: number;
  clienteId?: string;
  usuarioId?: string;
  formaPagamento?: FormaPagamento;
  statusPagamento?: StatusPagamento;
  dataInicio?: Date;
  dataFim?: Date;
  temMedicamentoControlado?: boolean;
}

export interface VendaComItens extends Venda {
  itens: ItemVenda[];
}

export interface VendaResponse {
  id: string;
  clienteId?: string;
  usuarioId: string;
  clienteNome?: string;
  clienteDocumento?: string;
  clienteTipoDocumento?: string;
  valorTotal: number;
  valorDesconto: number;
  valorFinal: number;
  formaPagamento: FormaPagamento;
  statusPagamento: StatusPagamento;
  temMedicamentoControlado: boolean;
  receitaArquivada: boolean;
  numeroReceita?: string;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  cliente?: any;
  usuario?: any;
  itens?: ItemVenda[];
}

export interface VendaListResponse {
  vendas: VendaResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class VendaService {
  private prisma: PrismaClient;
  private estoqueService: EstoqueService;
  private clienteService: ClienteService;
  private logger = logger;

  constructor() {
    this.prisma = new PrismaClient();
    this.estoqueService = new EstoqueService();
    this.clienteService = new ClienteService();
  }

  /**
   * Cria uma nova venda com seus itens
   */
  async criarVenda(data: CriarVendaData, usuarioId: string): Promise<VendaComItens> {
    // Validações básicas usando regras de negócio
    const validationErrors = VendaBusinessRules.validateCriarVenda(data);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join('; '));
    }

    // Verificar se os produtos existem e têm estoque suficiente
    const produtosIds = data.itens.map(item => item.produtoId);
    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: produtosIds } }
    });

    if (produtos.length !== produtosIds.length) {
      throw new Error('Um ou mais produtos não foram encontrados');
    }

    // Verificar medicamentos controlados
    const temMedicamentoControlado = produtos.some(p => p.exigeReceita);
    
    // Para venda assistida simplificada (farmácias menores)
    
    // Validações específicas para medicamentos controlados
    const controlledValidationErrors = VendaBusinessRules.validateVendaControlada(data, temMedicamentoControlado);
    if (controlledValidationErrors.length > 0) {
      throw new Error(controlledValidationErrors.join('; '));
    }

    // Preparar itens para cálculo e validar estoque
    const itensParaCalculo: {
      quantidade: number;
      precoUnitario: number;
      desconto?: number;
    }[] = [];

    const itensProcessados: {
      id: string;
      produtoId: string;
      quantidade: number;
      precoUnitario: number;
      desconto: number;
      total: number;
    }[] = [];

    for (const item of data.itens) {
      const produto = produtos.find(p => p.id === item.produtoId);
      
      if (!produto) {
        throw new Error(`Produto ${item.produtoId} não encontrado`);
      }

      if (produto.estoque < item.quantidade) {
        throw new Error(`Estoque insuficiente para o produto ${produto.nome}`);
      }

      const precoUnitario = Number(item.precoUnitario || produto.precoVenda);
      const desconto = Number(item.desconto || 0);

      itensParaCalculo.push({
        quantidade: item.quantidade,
        precoUnitario,
        desconto
      });
    }

    // Usar regras de negócio para calcular valores com precisão otimizada
    const calculoResultado = VendaBusinessRules.calcularValores(itensParaCalculo);
    const { valorTotal, valorDesconto, valorFinal, itensCalculados } = calculoResultado;

    // Cadastro automático de cliente baseado nos dados do paciente (se solicitado)
    let clienteIdFinal = data.clienteId;
    if (temMedicamentoControlado && 
        data.cadastrarPacienteComoCliente && 
        data.pacienteNome && 
        data.pacienteDocumento) {
      
      const clienteAutomatico = await this.clienteService.criarClienteAutomatico({
        nome: data.pacienteNome,
        documento: data.pacienteDocumento,
        telefone: data.pacienteTelefone,
        endereco: data.pacienteEndereco
      });

      if (clienteAutomatico) {
        clienteIdFinal = clienteAutomatico.id;
        this.logger.info(`✅ Cliente vinculado automaticamente à venda: ${clienteAutomatico.nome} (ID: ${clienteAutomatico.id})`);
      }
    }

    // Preparar itens processados com os valores calculados
    data.itens.forEach((item, index) => {
      const itemCalculado = itensCalculados[index];
      itensProcessados.push({
        id: uuidv4(),
        produtoId: item.produtoId,
        quantidade: itemCalculado.quantidade,
        precoUnitario: itemCalculado.precoUnitario,
        desconto: itemCalculado.valorDesconto,
        total: itemCalculado.total
      });
    });

    // Criar venda e itens em uma transação
    try {
      // Verificar conexão com o banco de dados antes de iniciar a transação
      await this.prisma.$connect();
      
      return await this.prisma.$transaction(async (tx) => {
      // Criar a venda
      const venda = await tx.venda.create({
        data: {
          id: uuidv4(),
          clienteId: clienteIdFinal,
          usuarioId,
          clienteNome: data.clienteNome,
          clienteDocumento: data.clienteDocumento,
          clienteTipoDocumento: data.clienteTipoDocumento,
          valorTotal,
          valorDesconto,
          valorFinal,
          formaPagamento: data.formaPagamento,
          statusPagamento: StatusPagamento.PENDENTE,
          temMedicamentoControlado,
          receitaArquivada: false,
          numeroReceita: data.numeroReceita,
          dataReceita: data.dataReceita,
          observacoes: data.observacoes
        }
      });

      // Criar os itens da venda
      const itensVenda = [];
      for (const item of itensProcessados) {
        const itemVenda = await tx.itemVenda.create({
          data: {
            id: item.id,
            vendaId: venda.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            desconto: item.desconto,
            total: item.total
          }
        });
        itensVenda.push(itemVenda);

        // Atualizar estoque do produto
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoque: { decrement: item.quantidade } }
        });

        // Registrar movimentação de estoque
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            tipo: TipoMovimentacao.SAIDA,
            quantidade: item.quantidade,
            motivo: `Venda #${venda.id}`,
            usuarioId
          }
        });
      }

      // Log detalhado para auditoria de venda assistida
      if (temMedicamentoControlado && data.vendaAssistida) {
        const produtosControlados = produtos.filter(p => p.exigeReceita).map(p => p.nome).join(', ');
        const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
        
        this.logger.info(`🩺 VENDA_CONTROLADA_ASSISTIDA: {
          "vendaId": "${venda.id}",
          "usuario": "${usuario?.nome} (${usuario?.login})",
          "tipoUsuario": "${usuario?.tipo}",
          "produtosControlados": "${produtosControlados}",
          "numeroReceita": "${data.numeroReceita}",
          "dataReceita": "${data.dataReceita}",
          "clienteNome": "${data.clienteNome || 'Cliente cadastrado'}",
          "clienteDocumento": "${data.clienteDocumento || 'N/A'}",
          "justificativa": "${data.justificativaVendaAssistida}",
          "valorTotal": ${Number(venda.valorFinal)},
          "timestamp": "${new Date().toISOString()}"
        }`);
      }

      // Retornar venda com itens, convertendo explicitamente os tipos
      return {
        ...venda,
        id: venda.id,
        clienteId: venda.clienteId,
        usuarioId: venda.usuarioId,
        clienteNome: venda.clienteNome,
        clienteDocumento: venda.clienteDocumento,
        clienteTipoDocumento: venda.clienteTipoDocumento,
        valorTotal: Number(venda.valorTotal),
        valorDesconto: Number(venda.valorDesconto),
        valorFinal: Number(venda.valorFinal),
        formaPagamento: venda.formaPagamento as FormaPagamento,
        statusPagamento: venda.statusPagamento as StatusPagamento,
        temMedicamentoControlado: venda.temMedicamentoControlado,
        receitaArquivada: venda.receitaArquivada,
        numeroReceita: venda.numeroReceita || undefined,
        observacoes: venda.observacoes || undefined,
        criadoEm: venda.criadoEm,
        atualizadoEm: venda.atualizadoEm,
        itens: itensVenda.map(item => ({
          ...item,
          id: item.id,
          vendaId: item.vendaId,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: Number(item.precoUnitario),
          desconto: Number(item.desconto),
          total: Number(item.total)
        }))
      };
    });
    } catch (error: any) {
      // Tratar erros específicos
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error.message && error.message.includes('Falha na transação')) {
        throw new Error('transaction');
      }
      // Repassar outros erros
      throw error;
    }
  }

  /**
   * Atualiza uma venda existente
   */
  async atualizarVenda(id: string, data: AtualizarVendaData): Promise<Venda> {
    try {
      const venda = await this.prisma.venda.findUnique({
        where: { id }
      });

      if (!venda) {
        throw new Error('Venda não encontrada');
      }

      const vendaAtualizada = await this.prisma.venda.update({
        where: { id },
        data: {
          statusPagamento: data.statusPagamento,
          receitaArquivada: data.receitaArquivada,
          observacoes: data.observacoes,
          atualizadoEm: new Date()
        }
      });

    // Converter explicitamente os tipos
      return {
        ...vendaAtualizada,
        id: vendaAtualizada.id,
        clienteId: vendaAtualizada.clienteId || undefined,
      usuarioId: vendaAtualizada.usuarioId,
        clienteNome: vendaAtualizada.clienteNome || undefined,
        clienteDocumento: vendaAtualizada.clienteDocumento || undefined,
        clienteTipoDocumento: vendaAtualizada.clienteTipoDocumento || undefined,
        valorTotal: Number(vendaAtualizada.valorTotal),
        valorDesconto: Number(vendaAtualizada.valorDesconto),
        valorFinal: Number(vendaAtualizada.valorFinal),
        formaPagamento: vendaAtualizada.formaPagamento as FormaPagamento,
        statusPagamento: vendaAtualizada.statusPagamento as StatusPagamento,
        temMedicamentoControlado: vendaAtualizada.temMedicamentoControlado,
        receitaArquivada: vendaAtualizada.receitaArquivada,
        numeroReceita: vendaAtualizada.numeroReceita || undefined,
        observacoes: vendaAtualizada.observacoes || undefined,
        criadoEm: vendaAtualizada.criadoEm,
        atualizadoEm: vendaAtualizada.atualizadoEm
      };
    } catch (error: any) {
      this.logger.error('Erro ao atualizar venda:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error.message && error.message.includes('Falha na transação')) {
        throw new Error('transaction');
      }
      // Repassar outros erros
      throw error;
    }
  }

  /**
   * Busca uma venda por ID com seus itens
   */
  async buscarVendaPorId(id: string): Promise<VendaComItens | null> {
    try {
      const venda = await this.prisma.venda.findUnique({
        where: { id },
        include: {
          cliente: true,
          usuario: {
            select: {
              id: true,
              nome: true,
              tipo: true
            }
          },
          itens: {
            include: {
              produto: true
            }
          }
        }
      });

      if (!venda) return null;

      // Converter explicitamente para o formato VendaComItens
      return {
        ...venda,
        id: venda.id,
        clienteId: venda.clienteId || undefined,
        usuarioId: venda.usuarioId,
        clienteNome: venda.clienteNome || undefined,
        clienteDocumento: venda.clienteDocumento || undefined,
        clienteTipoDocumento: venda.clienteTipoDocumento || undefined,
        valorTotal: Number(venda.valorTotal),
        valorDesconto: Number(venda.valorDesconto),
        valorFinal: Number(venda.valorFinal),
        formaPagamento: venda.formaPagamento as FormaPagamento,
        statusPagamento: venda.statusPagamento as StatusPagamento,
        temMedicamentoControlado: venda.temMedicamentoControlado,
        receitaArquivada: venda.receitaArquivada,
      numeroReceita: venda.numeroReceita || undefined,
      observacoes: venda.observacoes || undefined,
      criadoEm: venda.criadoEm,
      atualizadoEm: venda.atualizadoEm,
      itens: venda.itens?.map(item => ({
        id: item.id,
        vendaId: item.vendaId,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario),
        desconto: Number(item.desconto),
        total: Number(item.total),
        produto: item.produto
      }))
    };
  } catch (error: any) {
    this.logger.error('Erro ao buscar venda por ID:', error);
    if (error.message && error.message.includes('Conexão perdida')) {
      throw new Error('connection');
    }
    // Repassar outros erros
    throw error;
  }
  }

  /**
   * Lista vendas com filtros e paginação
   */
  async listarVendas(params: ListVendasParams): Promise<VendaListResponse> {
    try {
      const {
        page = 1,
        limit = 10,
        clienteId,
        usuarioId,
        formaPagamento,
        statusPagamento,
        dataInicio,
        dataFim,
        temMedicamentoControlado
      } = params;

      // Construir filtro
      const where: any = {};

      if (clienteId) where.clienteId = clienteId;
      if (usuarioId) where.usuarioId = usuarioId;
      if (formaPagamento) where.formaPagamento = formaPagamento;
      if (statusPagamento) where.statusPagamento = statusPagamento;
      if (temMedicamentoControlado !== undefined) where.temMedicamentoControlado = temMedicamentoControlado;

      // Filtro de data
      if (dataInicio || dataFim) {
        where.criadoEm = {};
        if (dataInicio) where.criadoEm.gte = dataInicio;
        if (dataFim) where.criadoEm.lte = dataFim;
      }

      // Contar total de registros
      const totalItems = await this.prisma.venda.count({ where });
      const totalPages = Math.ceil(totalItems / limit);

      // Buscar vendas paginadas
      const vendas = await this.prisma.venda.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            documento: true,
            tipoDocumento: true
          }
        },
        usuario: {
          select: {
            id: true,
            nome: true
          }
        },
        itens: {
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                codigoBarras: true
              }
            }
          }
        }
      },
      orderBy: { criadoEm: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    // Converter explicitamente cada venda para o formato VendaResponse
    const vendasResponse = vendas.map(venda => ({
      id: venda.id,
      clienteId: venda.clienteId || undefined, // Garantir que seja string ou undefined, não null
      usuarioId: venda.usuarioId,
      clienteNome: venda.clienteNome || undefined, // Garantir que seja string ou undefined, não null
      clienteDocumento: venda.clienteDocumento || undefined, // Garantir que seja string ou undefined, não null
      clienteTipoDocumento: venda.clienteTipoDocumento || undefined, // Garantir que seja string ou undefined, não null
      valorTotal: Number(venda.valorTotal),
      valorDesconto: Number(venda.valorDesconto),
      valorFinal: Number(venda.valorFinal),
      formaPagamento: venda.formaPagamento as FormaPagamento,
      statusPagamento: venda.statusPagamento as StatusPagamento,
      temMedicamentoControlado: venda.temMedicamentoControlado,
      receitaArquivada: venda.receitaArquivada,
      numeroReceita: venda.numeroReceita || undefined,
      observacoes: venda.observacoes || undefined,
      criadoEm: venda.criadoEm,
      atualizadoEm: venda.atualizadoEm,
      cliente: venda.cliente,
      usuario: venda.usuario,
      itens: venda.itens?.map(item => ({
        id: item.id,
        vendaId: item.vendaId,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: Number(item.precoUnitario),
        desconto: Number(item.desconto),
        total: Number(item.total),
        produto: item.produto
      }))
    }));

    return {
        vendas: vendasResponse,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      this.logger.error('Erro ao listar vendas:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  /**
   * Cancela uma venda e estorna o estoque
   */
  async cancelarVenda(id: string, usuarioId: string): Promise<Venda> {
    try {
      const venda = await this.prisma.venda.findUnique({
        where: { id },
        include: { itens: true }
      });

      if (!venda) {
        throw new Error('Venda não encontrada');
      }

      // Usar regras de negócio para validar cancelamento
      if (!VendaBusinessRules.podeCancelar(venda.statusPagamento as StatusPagamento)) {
        const status = venda.statusPagamento;
        if (status === StatusPagamento.PAGO) {
          throw new Error('Não é possível cancelar uma venda que já foi paga. Vendas pagas não podem ser canceladas.');
        } else if (status === StatusPagamento.CANCELADO) {
          throw new Error('Esta venda já foi cancelada anteriormente.');
        } else {
          throw new Error(`Não é possível cancelar uma venda com status "${status}". Apenas vendas pendentes podem ser canceladas.`);
        }
      }

      // Cancelar venda e estornar estoque em uma transação
      return await this.prisma.$transaction(async (tx) => {
      // Atualizar status da venda
      const vendaAtualizada = await tx.venda.update({
        where: { id },
        data: {
          statusPagamento: StatusPagamento.CANCELADO,
          atualizadoEm: new Date()
        }
      });

      // Estornar estoque para cada item
      for (const item of venda.itens) {
        // Atualizar estoque do produto
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoque: { increment: item.quantidade } }
        });

        // Registrar movimentação de estoque (entrada por cancelamento)
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            tipo: TipoMovimentacao.ENTRADA,
            quantidade: item.quantidade,
            motivo: `Cancelamento da Venda #${venda.id}`,
            usuarioId
          }
        });
      }

      // Converter explicitamente os tipos
      return {
        ...vendaAtualizada,
        id: vendaAtualizada.id,
        clienteId: vendaAtualizada.clienteId || undefined,
        usuarioId: vendaAtualizada.usuarioId,
        clienteNome: vendaAtualizada.clienteNome || undefined,
        clienteDocumento: vendaAtualizada.clienteDocumento || undefined,
        clienteTipoDocumento: vendaAtualizada.clienteTipoDocumento || undefined,
        valorTotal: Number(vendaAtualizada.valorTotal),
        valorDesconto: Number(vendaAtualizada.valorDesconto),
        valorFinal: Number(vendaAtualizada.valorFinal),
        formaPagamento: vendaAtualizada.formaPagamento as FormaPagamento,
        statusPagamento: vendaAtualizada.statusPagamento as StatusPagamento,
        temMedicamentoControlado: vendaAtualizada.temMedicamentoControlado,
        receitaArquivada: vendaAtualizada.receitaArquivada,
        numeroReceita: vendaAtualizada.numeroReceita || undefined,
        observacoes: vendaAtualizada.observacoes || undefined,
        criadoEm: vendaAtualizada.criadoEm,
        atualizadoEm: vendaAtualizada.atualizadoEm
      };
    });
    } catch (error: any) {
      this.logger.error('Erro ao cancelar venda:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error.message && error.message.includes('Falha na transação')) {
        throw new Error('transaction');
      }
      // Repassar outros erros
      throw error;
    }
  }

  /**
   * Finaliza o pagamento de uma venda
   */
  async finalizarPagamento(id: string): Promise<Venda> {
    try {
      const venda = await this.prisma.venda.findUnique({
        where: { id }
      });

      if (!venda) {
        throw new Error('Venda não encontrada');
      }

      // Usar regras de negócio para validar finalização de pagamento
      if (!VendaBusinessRules.podeFinalizarPagamento(venda.statusPagamento as StatusPagamento)) {
        throw new Error('O pagamento desta venda não pode ser finalizado');
      }

      const vendaAtualizada = await this.prisma.venda.update({
        where: { id },
        data: {
          statusPagamento: StatusPagamento.PAGO,
          atualizadoEm: new Date()
        }
      });

      // Converter explicitamente os tipos
      return {
        ...vendaAtualizada,
        id: vendaAtualizada.id,
        clienteId: vendaAtualizada.clienteId || undefined,
        usuarioId: vendaAtualizada.usuarioId,
        clienteNome: vendaAtualizada.clienteNome || undefined,
        clienteDocumento: vendaAtualizada.clienteDocumento || undefined,
        clienteTipoDocumento: vendaAtualizada.clienteTipoDocumento || undefined,
        valorTotal: Number(vendaAtualizada.valorTotal),
        valorDesconto: Number(vendaAtualizada.valorDesconto),
        valorFinal: Number(vendaAtualizada.valorFinal),
        formaPagamento: vendaAtualizada.formaPagamento as FormaPagamento,
        statusPagamento: vendaAtualizada.statusPagamento as StatusPagamento,
        temMedicamentoControlado: vendaAtualizada.temMedicamentoControlado,
        receitaArquivada: vendaAtualizada.receitaArquivada,
        numeroReceita: vendaAtualizada.numeroReceita || undefined,
        observacoes: vendaAtualizada.observacoes || undefined,
        criadoEm: vendaAtualizada.criadoEm,
        atualizadoEm: vendaAtualizada.atualizadoEm
      };
    } catch (error: any) {
      this.logger.error('Erro ao finalizar pagamento:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  /**
   * Extorna uma venda paga
   */
  async extornarVenda(id: string, usuarioId: string): Promise<Venda> {
    try {
      const venda = await this.prisma.venda.findUnique({
        where: { id },
        include: { itens: true }
      });

      if (!venda) {
        throw new Error('Venda não encontrada');
      }

      // Usar regras de negócio para validar extorno
      if (!VendaBusinessRules.podeExtornar(venda.statusPagamento as StatusPagamento)) {
        const status = venda.statusPagamento;
        if (status === StatusPagamento.PENDENTE) {
          throw new Error('Não é possível extornar uma venda pendente. Use a opção "Cancelar" para vendas não pagas.');
        } else if (status === StatusPagamento.CANCELADO) {
          throw new Error('Esta venda já foi cancelada anteriormente.');
        } else if (status === StatusPagamento.EXTORNADO) {
          throw new Error('Esta venda já foi extornada anteriormente.');
        } else {
          throw new Error(`Não é possível extornar uma venda com status "${status}". Apenas vendas pagas podem ser extornadas.`);
        }
      }

      // Extornar venda e estornar estoque em uma transação
      return await this.prisma.$transaction(async (tx) => {
        // Atualizar status da venda para extornada
        const vendaAtualizada = await tx.venda.update({
          where: { id },
          data: {
            statusPagamento: StatusPagamento.EXTORNADO,
            atualizadoEm: new Date()
          }
        });

        // Estornar estoque para cada item
        for (const item of venda.itens) {
          // Atualizar estoque do produto
          await tx.produto.update({
            where: { id: item.produtoId },
            data: { estoque: { increment: item.quantidade } }
          });

          // Registrar movimentação de estoque
          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: item.produtoId,
              tipo: TipoMovimentacao.ENTRADA,
              quantidade: item.quantidade,
              motivo: `Extorno da Venda #${venda.id}`,
              usuarioId
            }
          });
        }

        // Log da ação
        this.logger.info(`Venda ${id} extornada por usuário ${usuarioId}. Valor extornado: R$ ${Number(venda.valorFinal).toFixed(2)}`);

        // Converter explicitamente os tipos
        return {
          ...vendaAtualizada,
          id: vendaAtualizada.id,
          clienteId: vendaAtualizada.clienteId || undefined,
          usuarioId: vendaAtualizada.usuarioId,
          clienteNome: vendaAtualizada.clienteNome || undefined,
          clienteDocumento: vendaAtualizada.clienteDocumento || undefined,
          clienteTipoDocumento: vendaAtualizada.clienteTipoDocumento || undefined,
          valorTotal: Number(vendaAtualizada.valorTotal),
          valorDesconto: Number(vendaAtualizada.valorDesconto),
          valorFinal: Number(vendaAtualizada.valorFinal),
          formaPagamento: vendaAtualizada.formaPagamento as FormaPagamento,
          statusPagamento: vendaAtualizada.statusPagamento as StatusPagamento,
          temMedicamentoControlado: vendaAtualizada.temMedicamentoControlado,
          receitaArquivada: vendaAtualizada.receitaArquivada,
          numeroReceita: vendaAtualizada.numeroReceita || undefined,
          observacoes: vendaAtualizada.observacoes || undefined,
          criadoEm: vendaAtualizada.criadoEm,
          atualizadoEm: vendaAtualizada.atualizadoEm
        };
      });
    } catch (error: any) {
      this.logger.error('Erro ao extornar venda:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error.message && error.message.includes('Falha na transação')) {
        throw new Error('transaction');
      }
      // Repassar outros erros
      throw error;
    }
  }

  /**
   * Registra arquivamento de receita médica
   */
  async registrarArquivamentoReceita(id: string, numeroReceita?: string): Promise<Venda> {
    const venda = await this.prisma.venda.findUnique({
      where: { id }
    });

    if (!venda) {
      throw new Error('Venda não encontrada');
    }

    // Usar regras de negócio para validar arquivamento de receita
    if (!VendaBusinessRules.podeArquivarReceita({ 
      temMedicamentoControlado: venda.temMedicamentoControlado, 
      receitaArquivada: venda.receitaArquivada 
    })) {
      throw new Error('Esta receita não pode ser arquivada');
    }

    // Validar se tem número de receita
    const numeroReceitaFinal = numeroReceita || venda.numeroReceita;
    if (!numeroReceitaFinal) {
      throw new Error('Número da receita é obrigatório para arquivamento');
    }

    const vendaAtualizada = await this.prisma.venda.update({
      where: { id },
      data: {
        receitaArquivada: true,
        numeroReceita: numeroReceitaFinal,
        atualizadoEm: new Date()
      }
    });

    // Converter explicitamente os tipos
    return {
      ...vendaAtualizada,
      id: vendaAtualizada.id,
      clienteId: vendaAtualizada.clienteId || undefined,
      usuarioId: vendaAtualizada.usuarioId,
      clienteNome: vendaAtualizada.clienteNome || undefined,
      clienteDocumento: vendaAtualizada.clienteDocumento || undefined,
      clienteTipoDocumento: vendaAtualizada.clienteTipoDocumento || undefined,
      valorTotal: Number(vendaAtualizada.valorTotal),
      valorDesconto: Number(vendaAtualizada.valorDesconto),
      valorFinal: Number(vendaAtualizada.valorFinal),
      formaPagamento: vendaAtualizada.formaPagamento as FormaPagamento,
      statusPagamento: vendaAtualizada.statusPagamento as StatusPagamento,
      temMedicamentoControlado: vendaAtualizada.temMedicamentoControlado,
      receitaArquivada: vendaAtualizada.receitaArquivada,
      numeroReceita: vendaAtualizada.numeroReceita || undefined,
      observacoes: vendaAtualizada.observacoes || undefined,
      criadoEm: vendaAtualizada.criadoEm,
      atualizadoEm: vendaAtualizada.atualizadoEm
    };
  }

  /**
   * Gera relatório de vendas por período
   */
  async gerarRelatorioVendas(filtro: FiltroVenda): Promise<any> {
    // Construir filtro
    const where: any = {};

    if (filtro.clienteId) where.clienteId = filtro.clienteId;
    if (filtro.usuarioId) where.usuarioId = filtro.usuarioId;
    if (filtro.formaPagamento) where.formaPagamento = filtro.formaPagamento;
    if (filtro.statusPagamento) where.statusPagamento = filtro.statusPagamento;
    if (filtro.temMedicamentoControlado !== undefined) where.temMedicamentoControlado = filtro.temMedicamentoControlado;

    // Filtro de data
    if (filtro.dataInicio || filtro.dataFim) {
      where.criadoEm = {};
      if (filtro.dataInicio) where.criadoEm.gte = filtro.dataInicio;
      if (filtro.dataFim) where.criadoEm.lte = filtro.dataFim;
    }

    // Buscar vendas
    const vendas = await this.prisma.venda.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nome: true
          }
        },
        usuario: {
          select: {
            id: true,
            nome: true
          }
        },
        itens: {
          include: {
            produto: {
              select: {
                id: true,
                nome: true,
                categoria: true
              }
            }
          }
        }
      },
      orderBy: { criadoEm: 'desc' }
    });

    // Calcular estatísticas
    const totalVendas = vendas.length;
    const valorTotal = vendas.reduce((sum, venda) => sum + Number(venda.valorTotal), 0);
    const valorDesconto = vendas.reduce((sum, venda) => sum + Number(venda.valorDesconto), 0);
    const valorFinal = vendas.reduce((sum, venda) => sum + Number(venda.valorFinal), 0);
    
    // Agrupar por forma de pagamento
    const vendasPorFormaPagamento = vendas.reduce((acc: any, venda) => {
      const forma = venda.formaPagamento;
      if (!acc[forma]) acc[forma] = { quantidade: 0, valor: 0 };
      acc[forma].quantidade += 1;
      acc[forma].valor += Number(venda.valorFinal);
      return acc;
    }, {});

    // Agrupar por status
    const vendasPorStatus = vendas.reduce((acc: any, venda) => {
      const status = venda.statusPagamento;
      if (!acc[status]) acc[status] = { quantidade: 0, valor: 0 };
      acc[status].quantidade += 1;
      acc[status].valor += Number(venda.valorFinal);
      return acc;
    }, {});

    // Produtos mais vendidos
    const produtosVendidos: Record<string, { id: string, nome: string, quantidade: number, valor: number }> = {};
    
    vendas.forEach(venda => {
      venda.itens.forEach(item => {
        const produtoId = item.produtoId;
        if (!produtosVendidos[produtoId]) {
          produtosVendidos[produtoId] = {
            id: produtoId,
            nome: item.produto.nome,
            quantidade: 0,
            valor: 0
          };
        }
        produtosVendidos[produtoId].quantidade += item.quantidade;
        produtosVendidos[produtoId].valor += Number(item.total);
      });
    });

    const produtosMaisVendidos = Object.values(produtosVendidos)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    return {
      periodo: {
        dataInicio: filtro.dataInicio,
        dataFim: filtro.dataFim
      },
      resumo: {
        totalVendas,
        valorTotal,
        valorDesconto,
        valorFinal,
        ticketMedio: totalVendas > 0 ? valorFinal / totalVendas : 0
      },
      vendasPorFormaPagamento,
      vendasPorStatus,
      produtosMaisVendidos,
      vendas: vendas.map(venda => ({
        id: venda.id,
        data: venda.criadoEm,
        cliente: venda.cliente?.nome || 'Cliente não identificado',
        vendedor: venda.usuario.nome,
        valorFinal: venda.valorFinal,
        formaPagamento: venda.formaPagamento,
        statusPagamento: venda.statusPagamento,
        itens: venda.itens.length
      }))
    };
  }
}