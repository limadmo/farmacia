/**
 * Entidades de Compras - Sistema de Farmácia
 * 
 * Implementa o fluxo completo de compras:
 * 1. Criação de pedidos para fornecedores
 * 2. Recebimento de mercadorias
 * 3. Conferência manual dos produtos
 * 4. Aprovação e entrada no estoque
 */

export interface Pedido {
  id: string;
  numeroPedido: string;
  fornecedorId: string;
  usuarioId: string; // Quem criou o pedido
  
  // Dados do pedido
  dataEmissao: Date;
  dataPrevisaoEntrega?: Date;
  observacoes?: string;
  
  // Status e controle
  status: StatusPedido;
  valorTotal: number;
  
  // Relacionamentos
  itens: ItemPedido[];
  recebimentos: Recebimento[];
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ItemPedido {
  id: string;
  pedidoId: string;
  produtoId: string;
  
  // Dados do item
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  
  // Controle de recebimento
  quantidadeRecebida: number;
  quantidadePendente: number;
  
  // Cache para facilitar consultas
  nomeProduto: string;
  codigoBarras?: string;
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Recebimento {
  id: string;
  pedidoId: string;
  usuarioId: string; // Quem fez o recebimento
  
  // Dados da nota fiscal
  numeroNotaFiscal: string;
  dataEmissaoNF: Date;
  valorTotalNF: number;
  
  // Controle do recebimento
  dataRecebimento: Date;
  status: StatusRecebimento;
  observacoes?: string;
  
  // Relacionamentos
  itensRecebidos: ItemRecebimento[];
  conferencias: ConferenciaMercadoria[];
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ItemRecebimento {
  id: string;
  recebimentoId: string;
  itemPedidoId: string;
  produtoId: string;
  
  // Quantidades
  quantidadePedida: number;
  quantidadeRecebida: number;
  quantidadeConferida: number;
  quantidadeAprovada: number;
  
  // Dados do lote recebido
  lote?: string;
  dataVencimento?: Date;
  precoUnitario: number;
  
  // Status da conferência
  statusConferencia: StatusConferencia;
  divergencias?: string[];
  
  // Cache
  nomeProduto: string;
  codigoBarras?: string;
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ConferenciaMercadoria {
  id: string;
  recebimentoId: string;
  usuarioId: string; // Quem fez a conferência
  
  // Dados da conferência
  dataConferencia: Date;
  status: StatusConferencia;
  observacoes?: string;
  
  // Divergências encontradas
  divergenciasEncontradas: DivergenciaItem[];
  
  // Aprovação
  aprovadoPor?: string;
  dataAprovacao?: Date;
  motivoRejeicao?: string;
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DivergenciaItem {
  itemRecebimentoId: string;
  produtoId: string;
  nomeProduto: string;
  tipoDivergencia: TipoDivergencia;
  quantidadePedida: number;
  quantidadeRecebida: number;
  quantidadeConferida: number;
  observacao?: string;
  resolvida: boolean;
  resolucao?: string;
}

// DTOs para criação e atualização
export interface CreatePedidoData {
  fornecedorId: string;
  dataPrevisaoEntrega?: Date;
  observacoes?: string;
  itens: CreateItemPedidoData[];
}

export interface CreateItemPedidoData {
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
}

export interface CreateRecebimentoData {
  pedidoId: string;
  numeroNotaFiscal: string;
  dataEmissaoNF: Date;
  valorTotalNF: number;
  observacoes?: string;
  itensRecebidos: CreateItemRecebimentoData[];
}

export interface CreateItemRecebimentoData {
  itemPedidoId: string;
  quantidadeRecebida: number;
  lote?: string;
  dataVencimento?: Date;
  precoUnitario: number;
}

export interface CreateConferenciaData {
  recebimentoId: string;
  observacoes?: string;
  itensConferidos: ItemConferenciaData[];
}

export interface ItemConferenciaData {
  itemRecebimentoId: string;
  quantidadeConferida: number;
  divergencias?: string[];
  observacao?: string;
}

export interface AprovarConferenciaData {
  conferenciaId: string;
  aprovado: boolean;
  observacoes?: string;
  motivoRejeicao?: string;
  ajustesItens?: AjusteItemData[];
}

export interface AjusteItemData {
  itemRecebimentoId: string;
  quantidadeAprovada: number;
  observacao?: string;
}

// Enums
export enum StatusPedido {
  RASCUNHO = 'RASCUNHO',
  ENVIADO = 'ENVIADO',
  CONFIRMADO = 'CONFIRMADO',
  PARCIALMENTE_RECEBIDO = 'PARCIALMENTE_RECEBIDO',
  RECEBIDO = 'RECEBIDO',
  FINALIZADO = 'FINALIZADO',
  CANCELADO = 'CANCELADO'
}

export enum StatusRecebimento {
  AGUARDANDO_CONFERENCIA = 'AGUARDANDO_CONFERENCIA',
  EM_CONFERENCIA = 'EM_CONFERENCIA',
  CONFERIDO = 'CONFERIDO',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
  FINALIZADO = 'FINALIZADO'
}

export enum StatusConferencia {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONFERIDO = 'CONFERIDO',
  COM_DIVERGENCIA = 'COM_DIVERGENCIA',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO'
}

export enum TipoDivergencia {
  QUANTIDADE_MENOR = 'QUANTIDADE_MENOR',
  QUANTIDADE_MAIOR = 'QUANTIDADE_MAIOR',
  PRODUTO_DIFERENTE = 'PRODUTO_DIFERENTE',
  LOTE_DIFERENTE = 'LOTE_DIFERENTE',
  VENCIMENTO_DIFERENTE = 'VENCIMENTO_DIFERENTE',
  PRECO_DIFERENTE = 'PRECO_DIFERENTE',
  PRODUTO_DANIFICADO = 'PRODUTO_DANIFICADO',
  PRODUTO_NAO_RECEBIDO = 'PRODUTO_NAO_RECEBIDO'
}

// Regras de negócio
export class ComprasBusinessRules {
  /**
   * Valida dados de criação de pedido
   */
  static validateCreatePedido(data: CreatePedidoData): string[] {
    const errors: string[] = [];
    
    if (!data.fornecedorId?.trim()) {
      errors.push('Fornecedor é obrigatório');
    }
    
    if (!data.itens || data.itens.length === 0) {
      errors.push('Pedido deve ter pelo menos um item');
    }
    
    data.itens?.forEach((item, index) => {
      if (!item.produtoId?.trim()) {
        errors.push(`Item ${index + 1}: Produto é obrigatório`);
      }
      
      if (!item.quantidade || item.quantidade <= 0) {
        errors.push(`Item ${index + 1}: Quantidade deve ser maior que zero`);
      }
      
      if (!item.precoUnitario || item.precoUnitario <= 0) {
        errors.push(`Item ${index + 1}: Preço unitário deve ser maior que zero`);
      }
    });
    
    return errors;
  }
  
  /**
   * Valida dados de recebimento
   */
  static validateCreateRecebimento(data: CreateRecebimentoData): string[] {
    const errors: string[] = [];
    
    if (!data.pedidoId?.trim()) {
      errors.push('Pedido é obrigatório');
    }
    
    if (!data.numeroNotaFiscal?.trim()) {
      errors.push('Número da nota fiscal é obrigatório');
    }
    
    if (!data.dataEmissaoNF) {
      errors.push('Data de emissão da NF é obrigatória');
    }
    
    if (!data.valorTotalNF || data.valorTotalNF <= 0) {
      errors.push('Valor total da NF deve ser maior que zero');
    }
    
    if (!data.itensRecebidos || data.itensRecebidos.length === 0) {
      errors.push('Recebimento deve ter pelo menos um item');
    }
    
    data.itensRecebidos?.forEach((item, index) => {
      if (!item.itemPedidoId?.trim()) {
        errors.push(`Item ${index + 1}: Item do pedido é obrigatório`);
      }
      
      if (!item.quantidadeRecebida || item.quantidadeRecebida <= 0) {
        errors.push(`Item ${index + 1}: Quantidade recebida deve ser maior que zero`);
      }
      
      if (!item.precoUnitario || item.precoUnitario <= 0) {
        errors.push(`Item ${index + 1}: Preço unitário deve ser maior que zero`);
      }
    });
    
    return errors;
  }
  
  /**
   * Valida dados de conferência
   */
  static validateCreateConferencia(data: CreateConferenciaData): string[] {
    const errors: string[] = [];
    
    if (!data.recebimentoId?.trim()) {
      errors.push('Recebimento é obrigatório');
    }
    
    if (!data.itensConferidos || data.itensConferidos.length === 0) {
      errors.push('Conferência deve ter pelo menos um item');
    }
    
    data.itensConferidos?.forEach((item, index) => {
      if (!item.itemRecebimentoId?.trim()) {
        errors.push(`Item ${index + 1}: Item do recebimento é obrigatório`);
      }
      
      if (item.quantidadeConferida < 0) {
        errors.push(`Item ${index + 1}: Quantidade conferida não pode ser negativa`);
      }
    });
    
    return errors;
  }
  
  /**
   * Calcula valor total do pedido
   */
  static calcularValorTotalPedido(itens: CreateItemPedidoData[]): number {
    return itens.reduce((total, item) => {
      return total + (item.quantidade * item.precoUnitario);
    }, 0);
  }
  
  /**
   * Determina status do pedido baseado nos recebimentos
   */
  static determinarStatusPedido(
    itens: ItemPedido[],
    recebimentos: Recebimento[]
  ): StatusPedido {
    const totalPedido = itens.reduce((sum, item) => sum + item.quantidade, 0);
    const totalRecebido = itens.reduce((sum, item) => sum + item.quantidadeRecebida, 0);
    
    if (totalRecebido === 0) {
      return StatusPedido.ENVIADO;
    }
    
    if (totalRecebido < totalPedido) {
      return StatusPedido.PARCIALMENTE_RECEBIDO;
    }
    
    if (totalRecebido >= totalPedido) {
      const todosAprovados = recebimentos.every(r => r.status === StatusRecebimento.FINALIZADO);
      return todosAprovados ? StatusPedido.FINALIZADO : StatusPedido.RECEBIDO;
    }
    
    return StatusPedido.ENVIADO;
  }
  
  /**
   * Identifica divergências entre pedido e recebimento
   */
  static identificarDivergencias(
    itemPedido: ItemPedido,
    itemRecebimento: ItemRecebimento
  ): DivergenciaItem[] {
    const divergencias: DivergenciaItem[] = [];
    
    // Divergência de quantidade
    if (itemRecebimento.quantidadeConferida !== itemPedido.quantidade) {
      const tipo = itemRecebimento.quantidadeConferida < itemPedido.quantidade 
        ? TipoDivergencia.QUANTIDADE_MENOR 
        : TipoDivergencia.QUANTIDADE_MAIOR;
        
      divergencias.push({
        itemRecebimentoId: itemRecebimento.id,
        produtoId: itemPedido.produtoId,
        nomeProduto: itemPedido.nomeProduto,
        tipoDivergencia: tipo,
        quantidadePedida: itemPedido.quantidade,
        quantidadeRecebida: itemRecebimento.quantidadeRecebida,
        quantidadeConferida: itemRecebimento.quantidadeConferida,
        resolvida: false
      });
    }
    
    // Divergência de preço
    if (Math.abs(itemRecebimento.precoUnitario - itemPedido.precoUnitario) > 0.01) {
      divergencias.push({
        itemRecebimentoId: itemRecebimento.id,
        produtoId: itemPedido.produtoId,
        nomeProduto: itemPedido.nomeProduto,
        tipoDivergencia: TipoDivergencia.PRECO_DIFERENTE,
        quantidadePedida: itemPedido.quantidade,
        quantidadeRecebida: itemRecebimento.quantidadeRecebida,
        quantidadeConferida: itemRecebimento.quantidadeConferida,
        observacao: `Preço pedido: R$ ${itemPedido.precoUnitario.toFixed(2)}, Preço recebido: R$ ${itemRecebimento.precoUnitario.toFixed(2)}`,
        resolvida: false
      });
    }
    
    return divergencias;
  }
  
  /**
   * Verifica se conferência pode ser aprovada
   */
  static podeAprovarConferencia(conferencia: ConferenciaMercadoria): boolean {
    return conferencia.status === StatusConferencia.CONFERIDO;
  }
  
  /**
   * Gera número de pedido sequencial
   */
  static gerarNumeroPedido(ultimoNumero?: string): string {
    const ano = new Date().getFullYear();
    const ultimoNum = ultimoNumero ? parseInt(ultimoNumero.split('-')[1]) || 0 : 0;
    const novoNum = (ultimoNum + 1).toString().padStart(6, '0');
    return `PED-${ano}-${novoNum}`;
  }
}