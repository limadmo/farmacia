/**
 * Service de Compras - Sistema de Farmácia
 * 
 * Implementa o fluxo completo de compras:
 * 1. Gestão de pedidos para fornecedores
 * 2. Recebimento de mercadorias
 * 3. Conferência manual dos produtos
 * 4. Aprovação e entrada automática no estoque
 */

import { PrismaClient } from '@prisma/client';
import { 
  Pedido,
  ItemPedido,
  Recebimento,
  ItemRecebimento,
  ConferenciaMercadoria,
  DivergenciaItem,
  CreatePedidoData,
  CreateRecebimentoData,
  CreateConferenciaData,
  AprovarConferenciaData,
  StatusPedido,
  StatusRecebimento,
  StatusConferencia,
  TipoDivergencia,
  ComprasBusinessRules
} from '../../domain/entities/Compras';
import { EstoqueService } from './EstoqueService';
import { TipoMovimentacao } from '../../domain/entities/Estoque';
import { logger } from '../../shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ListPedidosParams {
  page?: number;
  limit?: number;
  fornecedorId?: string;
  status?: StatusPedido;
  dataInicio?: Date;
  dataFim?: Date;
  numeroPedido?: string;
}

export interface ListRecebimentosParams {
  page?: number;
  limit?: number;
  pedidoId?: string;
  status?: StatusRecebimento;
  dataInicio?: Date;
  dataFim?: Date;
  numeroNotaFiscal?: string;
}

export class ComprasService {
  private prisma: PrismaClient;
  private estoqueService: EstoqueService;
  private logger = logger;

  constructor() {
    this.prisma = new PrismaClient();
    this.estoqueService = new EstoqueService();
  }

  /**
   * Lista pedidos com filtros
   */
  async listarPedidos(params: ListPedidosParams = {}): Promise<{
    pedidos: any[];
    pagination: any;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        fornecedorId,
        status,
        dataInicio,
        dataFim,
        numeroPedido
      } = params;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE p.ativo = true';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (fornecedorId) {
        whereClause += ` AND p.fornecedor_id = $${paramIndex}`;
        queryParams.push(fornecedorId);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (numeroPedido) {
        whereClause += ` AND p.numero_pedido ILIKE $${paramIndex}`;
        queryParams.push(`%${numeroPedido}%`);
        paramIndex++;
      }

      if (dataInicio) {
        whereClause += ` AND p.data_emissao >= $${paramIndex}`;
        queryParams.push(dataInicio);
        paramIndex++;
      }

      if (dataFim) {
        whereClause += ` AND p.data_emissao <= $${paramIndex}`;
        queryParams.push(dataFim);
        paramIndex++;
      }

      const pedidos = await this.prisma.$queryRaw`
        SELECT 
          p.*,
          f.nome as fornecedor_nome,
          u.nome as usuario_nome,
          COUNT(ip.id) as total_itens,
          SUM(ip.quantidade) as total_quantidade,
          SUM(ip.quantidade_recebida) as total_recebido
        FROM pedidos p
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        LEFT JOIN usuarios u ON p.usuario_id = u.id
        LEFT JOIN itens_pedido ip ON p.id = ip.pedido_id
        ${whereClause}
        GROUP BY p.id, f.nome, u.nome
        ORDER BY p.criado_em DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const totalQuery = await this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT p.id) as total
        FROM pedidos p
        ${whereClause}
      `;

      const total = Number((totalQuery as any[])[0]?.total || 0);

      return {
        pedidos: pedidos as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Erro ao listar pedidos:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca pedido por ID
   */
  async buscarPedidoPorId(id: string): Promise<any | null> {
    try {
      const pedido = await this.prisma.$queryRaw`
        SELECT 
          p.*,
          f.nome as fornecedor_nome,
          f.email as fornecedor_email,
          f.telefone as fornecedor_telefone,
          u.nome as usuario_nome
        FROM pedidos p
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        LEFT JOIN usuarios u ON p.usuario_id = u.id
        WHERE p.id = ${id} AND p.ativo = true
      `;

      if (!(pedido as any[]).length) {
        return null;
      }

      const pedidoData = (pedido as any[])[0];

      // Buscar itens do pedido
      const itens = await this.prisma.$queryRaw`
        SELECT 
          ip.*,
          pr.nome as produto_nome,
          pr.codigo_barras,
          pr.preco_venda
        FROM itens_pedido ip
        LEFT JOIN produtos pr ON ip.produto_id = pr.id
        WHERE ip.pedido_id = ${id}
        ORDER BY ip.criado_em
      `;

      // Buscar recebimentos
      const recebimentos = await this.prisma.$queryRaw`
        SELECT r.*, u.nome as usuario_nome
        FROM recebimentos r
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.pedido_id = ${id}
        ORDER BY r.criado_em DESC
      `;

      return {
        ...pedidoData,
        itens: itens as any[],
        recebimentos: recebimentos as any[]
      };
    } catch (error) {
      this.logger.error('Erro ao buscar pedido:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria novo pedido
   */
  async criarPedido(data: CreatePedidoData, usuarioId: string): Promise<any> {
    try {
      // Validações
      const validationErrors = ComprasBusinessRules.validateCreatePedido(data);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Gerar número do pedido
      const ultimoPedido = await this.prisma.$queryRaw`
        SELECT numero_pedido FROM pedidos 
        WHERE numero_pedido LIKE 'PED-${new Date().getFullYear()}-%'
        ORDER BY numero_pedido DESC LIMIT 1
      `;
      
      const ultimoNumero = (ultimoPedido as any[])[0]?.numero_pedido;
      const numeroPedido = ComprasBusinessRules.gerarNumeroPedido(ultimoNumero);

      // Calcular valor total
      const valorTotal = ComprasBusinessRules.calcularValorTotalPedido(data.itens);

      const pedidoId = uuidv4();

      // Criar pedido
      await this.prisma.$queryRaw`
        INSERT INTO pedidos (
          id, numero_pedido, fornecedor_id, usuario_id,
          data_emissao, data_previsao_entrega, observacoes,
          status, valor_total, criado_em, atualizado_em, ativo
        ) VALUES (
          ${pedidoId}, ${numeroPedido}, ${data.fornecedorId}, ${usuarioId},
          NOW(), ${data.dataPrevisaoEntrega || null}, ${data.observacoes || null},
          ${StatusPedido.RASCUNHO}, ${valorTotal}, NOW(), NOW(), true
        )
      `;

      // Criar itens do pedido
      for (const item of data.itens) {
        const itemId = uuidv4();
        const subtotal = item.quantidade * item.precoUnitario;

        // Buscar dados do produto
        const produto = await this.prisma.$queryRaw`
          SELECT nome, codigo_barras FROM produtos WHERE id = ${item.produtoId}
        `;
        
        const produtoData = (produto as any[])[0];

        await this.prisma.$queryRaw`
          INSERT INTO itens_pedido (
            id, pedido_id, produto_id, quantidade, preco_unitario, subtotal,
            quantidade_recebida, quantidade_pendente, nome_produto, codigo_barras,
            criado_em, atualizado_em
          ) VALUES (
            ${itemId}, ${pedidoId}, ${item.produtoId}, ${item.quantidade}, ${item.precoUnitario}, ${subtotal},
            0, ${item.quantidade}, ${produtoData?.nome || ''}, ${produtoData?.codigo_barras || null},
            NOW(), NOW()
          )
        `;
      }

      this.logger.info(`Pedido criado: ${numeroPedido}`, { pedidoId, usuarioId });
      return await this.buscarPedidoPorId(pedidoId);
    } catch (error) {
      this.logger.error('Erro ao criar pedido:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Atualiza status do pedido
   */
  async atualizarStatusPedido(id: string, status: StatusPedido, usuarioId: string): Promise<void> {
    try {
      await this.prisma.$queryRaw`
        UPDATE pedidos SET 
          status = ${status},
          atualizado_em = NOW()
        WHERE id = ${id} AND ativo = true
      `;

      this.logger.info(`Status do pedido atualizado: ${id} -> ${status}`, { usuarioId });
    } catch (error) {
      this.logger.error('Erro ao atualizar status do pedido:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista recebimentos
   */
  async listarRecebimentos(params: ListRecebimentosParams = {}): Promise<{
    recebimentos: any[];
    pagination: any;
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        pedidoId,
        status,
        dataInicio,
        dataFim,
        numeroNotaFiscal
      } = params;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE r.ativo = true';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (pedidoId) {
        whereClause += ` AND r.pedido_id = $${paramIndex}`;
        queryParams.push(pedidoId);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND r.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (numeroNotaFiscal) {
        whereClause += ` AND r.numero_nota_fiscal ILIKE $${paramIndex}`;
        queryParams.push(`%${numeroNotaFiscal}%`);
        paramIndex++;
      }

      if (dataInicio) {
        whereClause += ` AND r.data_recebimento >= $${paramIndex}`;
        queryParams.push(dataInicio);
        paramIndex++;
      }

      if (dataFim) {
        whereClause += ` AND r.data_recebimento <= $${paramIndex}`;
        queryParams.push(dataFim);
        paramIndex++;
      }

      const recebimentos = await this.prisma.$queryRaw`
        SELECT 
          r.*,
          p.numero_pedido,
          f.nome as fornecedor_nome,
          u.nome as usuario_nome,
          COUNT(ir.id) as total_itens
        FROM recebimentos r
        LEFT JOIN pedidos p ON r.pedido_id = p.id
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        LEFT JOIN itens_recebimento ir ON r.id = ir.recebimento_id
        ${whereClause}
        GROUP BY r.id, p.numero_pedido, f.nome, u.nome
        ORDER BY r.criado_em DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const totalQuery = await this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT r.id) as total
        FROM recebimentos r
        LEFT JOIN pedidos p ON r.pedido_id = p.id
        ${whereClause}
      `;

      const total = Number((totalQuery as any[])[0]?.total || 0);

      return {
        recebimentos: recebimentos as any[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Erro ao listar recebimentos:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria recebimento de mercadoria
   */
  async criarRecebimento(data: CreateRecebimentoData, usuarioId: string): Promise<any> {
    try {
      // Validações
      const validationErrors = ComprasBusinessRules.validateCreateRecebimento(data);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Verificar se pedido existe
      const pedido = await this.buscarPedidoPorId(data.pedidoId);
      if (!pedido) {
        throw new Error('Pedido não encontrado');
      }

      const recebimentoId = uuidv4();

      // Criar recebimento
      await this.prisma.$queryRaw`
        INSERT INTO recebimentos (
          id, pedido_id, usuario_id, numero_nota_fiscal,
          data_emissao_nf, valor_total_nf, data_recebimento,
          status, observacoes, criado_em, atualizado_em, ativo
        ) VALUES (
          ${recebimentoId}, ${data.pedidoId}, ${usuarioId}, ${data.numeroNotaFiscal},
          ${data.dataEmissaoNF}, ${data.valorTotalNF}, NOW(),
          ${StatusRecebimento.AGUARDANDO_CONFERENCIA}, ${data.observacoes || null},
          NOW(), NOW(), true
        )
      `;

      // Criar itens do recebimento
      for (const item of data.itensRecebidos) {
        const itemId = uuidv4();

        // Buscar dados do item do pedido
        const itemPedido = await this.prisma.$queryRaw`
          SELECT ip.*, pr.nome as produto_nome, pr.codigo_barras
          FROM itens_pedido ip
          LEFT JOIN produtos pr ON ip.produto_id = pr.id
          WHERE ip.id = ${item.itemPedidoId}
        `;
        
        const itemPedidoData = (itemPedido as any[])[0];
        if (!itemPedidoData) {
          throw new Error(`Item do pedido não encontrado: ${item.itemPedidoId}`);
        }

        await this.prisma.$queryRaw`
          INSERT INTO itens_recebimento (
            id, recebimento_id, item_pedido_id, produto_id,
            quantidade_pedida, quantidade_recebida, quantidade_conferida, quantidade_aprovada,
            lote, data_vencimento, preco_unitario, status_conferencia,
            nome_produto, codigo_barras, criado_em, atualizado_em
          ) VALUES (
            ${itemId}, ${recebimentoId}, ${item.itemPedidoId}, ${itemPedidoData.produto_id},
            ${itemPedidoData.quantidade}, ${item.quantidadeRecebida}, 0, 0,
            ${item.lote || null}, ${item.dataVencimento || null}, ${item.precoUnitario},
            ${StatusConferencia.PENDENTE}, ${itemPedidoData.produto_nome}, ${itemPedidoData.codigo_barras},
            NOW(), NOW()
          )
        `;

        // Atualizar quantidade recebida no item do pedido
        await this.prisma.$queryRaw`
          UPDATE itens_pedido SET 
            quantidade_recebida = quantidade_recebida + ${item.quantidadeRecebida},
            quantidade_pendente = quantidade - (quantidade_recebida + ${item.quantidadeRecebida}),
            atualizado_em = NOW()
          WHERE id = ${item.itemPedidoId}
        `;
      }

      // Atualizar status do pedido se necessário
      await this.atualizarStatusPedidoAutomatico(data.pedidoId);

      this.logger.info(`Recebimento criado: ${data.numeroNotaFiscal}`, { recebimentoId, usuarioId });
      return await this.buscarRecebimentoPorId(recebimentoId);
    } catch (error) {
      this.logger.error('Erro ao criar recebimento:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca recebimento por ID
   */
  async buscarRecebimentoPorId(id: string): Promise<any | null> {
    try {
      const recebimento = await this.prisma.$queryRaw`
        SELECT 
          r.*,
          p.numero_pedido,
          f.nome as fornecedor_nome,
          u.nome as usuario_nome
        FROM recebimentos r
        LEFT JOIN pedidos p ON r.pedido_id = p.id
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        LEFT JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.id = ${id} AND r.ativo = true
      `;

      if (!(recebimento as any[]).length) {
        return null;
      }

      const recebimentoData = (recebimento as any[])[0];

      // Buscar itens do recebimento
      const itens = await this.prisma.$queryRaw`
        SELECT ir.*, ip.quantidade as quantidade_pedida_original
        FROM itens_recebimento ir
        LEFT JOIN itens_pedido ip ON ir.item_pedido_id = ip.id
        WHERE ir.recebimento_id = ${id}
        ORDER BY ir.criado_em
      `;

      // Buscar conferências
      const conferencias = await this.prisma.$queryRaw`
        SELECT c.*, u.nome as usuario_nome, ua.nome as aprovado_por_nome
        FROM conferencias_mercadoria c
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        LEFT JOIN usuarios ua ON c.aprovado_por = ua.id
        WHERE c.recebimento_id = ${id}
        ORDER BY c.criado_em DESC
      `;

      return {
        ...recebimentoData,
        itens: itens as any[],
        conferencias: conferencias as any[]
      };
    } catch (error) {
      this.logger.error('Erro ao buscar recebimento:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Inicia conferência manual
   */
  async iniciarConferencia(data: CreateConferenciaData, usuarioId: string): Promise<any> {
    try {
      // Validações
      const validationErrors = ComprasBusinessRules.validateCreateConferencia(data);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Verificar se recebimento existe
      const recebimento = await this.buscarRecebimentoPorId(data.recebimentoId);
      if (!recebimento) {
        throw new Error('Recebimento não encontrado');
      }

      if (recebimento.status !== StatusRecebimento.AGUARDANDO_CONFERENCIA) {
        throw new Error('Recebimento não está aguardando conferência');
      }

      const conferenciaId = uuidv4();
      const divergenciasEncontradas: DivergenciaItem[] = [];

      // Atualizar status do recebimento
      await this.prisma.$queryRaw`
        UPDATE recebimentos SET 
          status = ${StatusRecebimento.EM_CONFERENCIA},
          atualizado_em = NOW()
        WHERE id = ${data.recebimentoId}
      `;

      // Processar itens conferidos
      for (const itemConferido of data.itensConferidos) {
        // Buscar item do recebimento
        const itemRecebimento = await this.prisma.$queryRaw`
          SELECT ir.*, ip.quantidade as quantidade_pedida
          FROM itens_recebimento ir
          LEFT JOIN itens_pedido ip ON ir.item_pedido_id = ip.id
          WHERE ir.id = ${itemConferido.itemRecebimentoId}
        `;
        
        const itemData = (itemRecebimento as any[])[0];
        if (!itemData) {
          throw new Error(`Item do recebimento não encontrado: ${itemConferido.itemRecebimentoId}`);
        }

        // Atualizar quantidade conferida
        await this.prisma.$queryRaw`
          UPDATE itens_recebimento SET 
            quantidade_conferida = ${itemConferido.quantidadeConferida},
            status_conferencia = ${StatusConferencia.CONFERIDO},
            atualizado_em = NOW()
          WHERE id = ${itemConferido.itemRecebimentoId}
        `;

        // Identificar divergências
        const divergencias = ComprasBusinessRules.identificarDivergencias(
          {
            id: itemData.item_pedido_id,
            pedidoId: '',
            produtoId: itemData.produto_id,
            quantidade: itemData.quantidade_pedida,
            precoUnitario: itemData.preco_unitario,
            subtotal: 0,
            quantidadeRecebida: 0,
            quantidadePendente: 0,
            nomeProduto: itemData.nome_produto,
            codigoBarras: itemData.codigo_barras,
            criadoEm: new Date(),
            atualizadoEm: new Date()
          },
          {
            id: itemData.id,
            recebimentoId: data.recebimentoId,
            itemPedidoId: itemData.item_pedido_id,
            produtoId: itemData.produto_id,
            quantidadePedida: itemData.quantidade_pedida,
            quantidadeRecebida: itemData.quantidade_recebida,
            quantidadeConferida: itemConferido.quantidadeConferida,
            quantidadeAprovada: 0,
            lote: itemData.lote,
            dataVencimento: itemData.data_vencimento,
            precoUnitario: itemData.preco_unitario,
            statusConferencia: StatusConferencia.CONFERIDO,
            nomeProduto: itemData.nome_produto,
            codigoBarras: itemData.codigo_barras,
            criadoEm: new Date(),
            atualizadoEm: new Date()
          }
        );

        divergenciasEncontradas.push(...divergencias);
      }

      // Determinar status da conferência
      const statusConferencia = divergenciasEncontradas.length > 0 
        ? StatusConferencia.COM_DIVERGENCIA 
        : StatusConferencia.CONFERIDO;

      // Criar registro de conferência
      await this.prisma.$queryRaw`
        INSERT INTO conferencias_mercadoria (
          id, recebimento_id, usuario_id, data_conferencia,
          status, observacoes, divergencias_encontradas,
          criado_em, atualizado_em
        ) VALUES (
          ${conferenciaId}, ${data.recebimentoId}, ${usuarioId}, NOW(),
          ${statusConferencia}, ${data.observacoes || null}, ${JSON.stringify(divergenciasEncontradas)},
          NOW(), NOW()
        )
      `;

      // Atualizar status do recebimento
      await this.prisma.$queryRaw`
        UPDATE recebimentos SET 
          status = ${StatusRecebimento.CONFERIDO},
          atualizado_em = NOW()
        WHERE id = ${data.recebimentoId}
      `;

      this.logger.info(`Conferência iniciada: ${data.recebimentoId}`, { 
        conferenciaId, 
        usuarioId, 
        divergencias: divergenciasEncontradas.length 
      });

      return await this.buscarConferenciaPorId(conferenciaId);
    } catch (error) {
      this.logger.error('Erro ao iniciar conferência:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca conferência por ID
   */
  async buscarConferenciaPorId(id: string): Promise<any | null> {
    try {
      const conferencia = await this.prisma.$queryRaw`
        SELECT 
          c.*,
          r.numero_nota_fiscal,
          p.numero_pedido,
          u.nome as usuario_nome,
          ua.nome as aprovado_por_nome
        FROM conferencias_mercadoria c
        LEFT JOIN recebimentos r ON c.recebimento_id = r.id
        LEFT JOIN pedidos p ON r.pedido_id = p.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        LEFT JOIN usuarios ua ON c.aprovado_por = ua.id
        WHERE c.id = ${id}
      `;

      if (!(conferencia as any[]).length) {
        return null;
      }

      const conferenciaData = (conferencia as any[])[0];
      
      // Parse das divergências
      if (conferenciaData.divergencias_encontradas) {
        conferenciaData.divergencias_encontradas = JSON.parse(conferenciaData.divergencias_encontradas);
      }

      return conferenciaData;
    } catch (error) {
      this.logger.error('Erro ao buscar conferência:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Aprova ou rejeita conferência
   */
  async aprovarConferencia(data: AprovarConferenciaData, usuarioId: string): Promise<any> {
    try {
      // Buscar conferência
      const conferencia = await this.buscarConferenciaPorId(data.conferenciaId);
      if (!conferencia) {
        throw new Error('Conferência não encontrada');
      }

      if (!ComprasBusinessRules.podeAprovarConferencia(conferencia)) {
        throw new Error('Conferência não pode ser aprovada no status atual');
      }

      const novoStatus = data.aprovado ? StatusConferencia.APROVADO : StatusConferencia.REJEITADO;
      const statusRecebimento = data.aprovado ? StatusRecebimento.APROVADO : StatusRecebimento.REJEITADO;

      // Atualizar conferência
      await this.prisma.$queryRaw`
        UPDATE conferencias_mercadoria SET 
          status = ${novoStatus},
          aprovado_por = ${usuarioId},
          data_aprovacao = NOW(),
          motivo_rejeicao = ${data.motivoRejeicao || null},
          atualizado_em = NOW()
        WHERE id = ${data.conferenciaId}
      `;

      // Atualizar recebimento
      await this.prisma.$queryRaw`
        UPDATE recebimentos SET 
          status = ${statusRecebimento},
          atualizado_em = NOW()
        WHERE id = ${conferencia.recebimento_id}
      `;

      if (data.aprovado) {
        // Processar ajustes se houver
        if (data.ajustesItens && data.ajustesItens.length > 0) {
          for (const ajuste of data.ajustesItens) {
            await this.prisma.$queryRaw`
              UPDATE itens_recebimento SET 
                quantidade_aprovada = ${ajuste.quantidadeAprovada},
                atualizado_em = NOW()
              WHERE id = ${ajuste.itemRecebimentoId}
            `;
          }
        } else {
          // Aprovar todas as quantidades conferidas
          await this.prisma.$queryRaw`
            UPDATE itens_recebimento SET 
              quantidade_aprovada = quantidade_conferida,
              atualizado_em = NOW()
            WHERE recebimento_id = ${conferencia.recebimento_id}
          `;
        }

        // Dar entrada no estoque
        await this.darEntradaNoEstoque(conferencia.recebimento_id, usuarioId);

        // Finalizar recebimento
        await this.prisma.$queryRaw`
          UPDATE recebimentos SET 
            status = ${StatusRecebimento.FINALIZADO},
            atualizado_em = NOW()
          WHERE id = ${conferencia.recebimento_id}
        `;

        // Atualizar status do pedido
        const recebimento = await this.buscarRecebimentoPorId(conferencia.recebimento_id);
        if (recebimento) {
          await this.atualizarStatusPedidoAutomatico(recebimento.pedido_id);
        }
      }

      this.logger.info(`Conferência ${data.aprovado ? 'aprovada' : 'rejeitada'}: ${data.conferenciaId}`, { 
        usuarioId,
        motivo: data.motivoRejeicao 
      });

      return await this.buscarConferenciaPorId(data.conferenciaId);
    } catch (error) {
      this.logger.error('Erro ao aprovar conferência:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Dá entrada no estoque dos itens aprovados
   */
  private async darEntradaNoEstoque(recebimentoId: string, usuarioId: string): Promise<void> {
    try {
      // Buscar itens aprovados
      const itensAprovados = await this.prisma.$queryRaw`
        SELECT ir.*, p.numero_pedido, r.numero_nota_fiscal
        FROM itens_recebimento ir
        LEFT JOIN recebimentos r ON ir.recebimento_id = r.id
        LEFT JOIN pedidos p ON r.pedido_id = p.id
        WHERE ir.recebimento_id = ${recebimentoId} 
          AND ir.quantidade_aprovada > 0
      `;

      for (const item of itensAprovados as any[]) {
        // Registrar movimentação de entrada no estoque
        await this.estoqueService.movimentarEstoque({
          produtoId: item.produto_id,
          tipo: TipoMovimentacao.ENTRADA,
          quantidade: item.quantidade_aprovada,
          motivo: `Recebimento NF: ${item.numero_nota_fiscal} - Pedido: ${item.numero_pedido}`,
          usuarioId
        });

        // Se tem lote, criar/atualizar lote
        if (item.lote) {
          await this.criarOuAtualizarLote({
            produtoId: item.produto_id,
            lote: item.lote,
            dataVencimento: item.data_vencimento,
            quantidade: item.quantidade_aprovada,
            precoUnitario: item.preco_unitario,
            numeroNotaFiscal: item.numero_nota_fiscal
          });
        }
      }

      this.logger.info(`Entrada no estoque processada: ${recebimentoId}`, { 
        itens: (itensAprovados as any[]).length,
        usuarioId 
      });
    } catch (error) {
      this.logger.error('Erro ao dar entrada no estoque:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw error;
    }
  }

  /**
   * Cria ou atualiza lote
   */
  private async criarOuAtualizarLote(data: {
    produtoId: string;
    lote: string;
    dataVencimento?: Date;
    quantidade: number;
    precoUnitario: number;
    numeroNotaFiscal: string;
  }): Promise<void> {
    try {
      // Verificar se lote já existe
      const loteExistente = await this.prisma.$queryRaw`
        SELECT id, quantidade_atual FROM lotes 
        WHERE produto_id = ${data.produtoId} 
          AND lote = ${data.lote} 
          AND ativo = true
      `;

      if ((loteExistente as any[]).length > 0) {
        // Atualizar lote existente
        const lote = (loteExistente as any[])[0];
        const novaQuantidade = lote.quantidade_atual + data.quantidade;
        
        await this.prisma.$queryRaw`
          UPDATE lotes SET 
            quantidade_atual = ${novaQuantidade},
            preco_custo = ${data.precoUnitario},
            atualizado_em = NOW()
          WHERE id = ${lote.id}
        `;
      } else {
        // Criar novo lote
        const loteId = uuidv4();
        
        await this.prisma.$queryRaw`
          INSERT INTO lotes (
            id, produto_id, lote, data_vencimento, quantidade_inicial,
            quantidade_atual, quantidade_reservada, preco_custo,
            numero_nota_fiscal, criado_em, atualizado_em, ativo
          ) VALUES (
            ${loteId}, ${data.produtoId}, ${data.lote}, ${data.dataVencimento || null},
            ${data.quantidade}, ${data.quantidade}, 0, ${data.precoUnitario},
            ${data.numeroNotaFiscal}, NOW(), NOW(), true
          )
        `;
      }
    } catch (error) {
      this.logger.error('Erro ao criar/atualizar lote:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw error;
    }
  }

  /**
   * Atualiza status do pedido automaticamente baseado nos recebimentos
   */
  private async atualizarStatusPedidoAutomatico(pedidoId: string): Promise<void> {
    try {
      const pedido = await this.buscarPedidoPorId(pedidoId);
      if (!pedido) return;

      const novoStatus = ComprasBusinessRules.determinarStatusPedido(
        pedido.itens,
        pedido.recebimentos
      );

      if (novoStatus !== pedido.status) {
        await this.prisma.$queryRaw`
          UPDATE pedidos SET 
            status = ${novoStatus},
            atualizado_em = NOW()
          WHERE id = ${pedidoId}
        `;
      }
    } catch (error) {
      this.logger.error('Erro ao atualizar status do pedido automaticamente:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      // Não propagar erro para não interromper o fluxo principal
    }
  }

  /**
   * Lista conferências pendentes
   */
  async listarConferenciasPendentes(): Promise<any[]> {
    try {
      const conferencias = await this.prisma.$queryRaw`
        SELECT 
          c.*,
          r.numero_nota_fiscal,
          p.numero_pedido,
          f.nome as fornecedor_nome,
          u.nome as usuario_nome
        FROM conferencias_mercadoria c
        LEFT JOIN recebimentos r ON c.recebimento_id = r.id
        LEFT JOIN pedidos p ON r.pedido_id = p.id
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        LEFT JOIN usuarios u ON c.usuario_id = u.id
        WHERE c.status IN (${StatusConferencia.CONFERIDO}, ${StatusConferencia.COM_DIVERGENCIA})
        ORDER BY c.criado_em ASC
      `;

      return (conferencias as any[]).map(c => {
        if (c.divergencias_encontradas) {
          c.divergencias_encontradas = JSON.parse(c.divergencias_encontradas);
        }
        return c;
      });
    } catch (error) {
      this.logger.error('Erro ao listar conferências pendentes:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Obtém dashboard de compras
   */
  async obterDashboardCompras(): Promise<any> {
    try {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

      // Estatísticas gerais
      const estatisticas = await this.prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN status = ${StatusPedido.ENVIADO} THEN 1 END) as pedidos_enviados,
          COUNT(CASE WHEN status = ${StatusPedido.PARCIALMENTE_RECEBIDO} THEN 1 END) as pedidos_parciais,
          COUNT(CASE WHEN status = ${StatusPedido.RECEBIDO} THEN 1 END) as pedidos_recebidos,
          SUM(CASE WHEN data_emissao >= ${inicioMes} AND data_emissao <= ${fimMes} THEN valor_total ELSE 0 END) as valor_mes,
          COUNT(CASE WHEN data_emissao >= ${inicioMes} AND data_emissao <= ${fimMes} THEN 1 END) as pedidos_mes
        FROM pedidos 
        WHERE ativo = true
      `;

      // Conferências pendentes
      const conferenciasPendentes = await this.prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM conferencias_mercadoria
        WHERE status IN (${StatusConferencia.CONFERIDO}, ${StatusConferencia.COM_DIVERGENCIA})
      `;

      // Recebimentos aguardando
      const recebimentosAguardando = await this.prisma.$queryRaw`
        SELECT COUNT(*) as total
        FROM recebimentos
        WHERE status = ${StatusRecebimento.AGUARDANDO_CONFERENCIA}
          AND ativo = true
      `;

      // Top fornecedores do mês
      const topFornecedores = await this.prisma.$queryRaw`
        SELECT 
          f.nome,
          COUNT(p.id) as total_pedidos,
          SUM(p.valor_total) as valor_total
        FROM pedidos p
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
        WHERE p.data_emissao >= ${inicioMes} 
          AND p.data_emissao <= ${fimMes}
          AND p.ativo = true
        GROUP BY f.id, f.nome
        ORDER BY valor_total DESC
        LIMIT 5
      `;

      return {
        estatisticas: (estatisticas as any[])[0],
        conferenciasPendentes: Number((conferenciasPendentes as any[])[0]?.total || 0),
        recebimentosAguardando: Number((recebimentosAguardando as any[])[0]?.total || 0),
        topFornecedores: topFornecedores as any[]
      };
    } catch (error) {
      this.logger.error('Erro ao obter dashboard de compras:', error);
      
      // Verificar o tipo de erro para retornar a mensagem apropriada
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('conexão') || errorMessage.includes('connection')) {
          throw new Error('connection');
        } else if (errorMessage.includes('transação') || errorMessage.includes('transaction')) {
          throw new Error('transaction');
        }
      }
      
      throw new Error('Erro interno do servidor');
    }
  }
}