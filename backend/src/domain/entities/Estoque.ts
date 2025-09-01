/**
 * Entidades de Estoque - Sistema de Farmácia
 * 
 * Representa movimentações de estoque e controle offline-first.
 * Implementa sincronização automática para cenários sem internet.
 */

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  quantidadeAnterior: number;
  quantidadeAtual: number;
  motivo: string;
  observacoes?: string;
  
  // Dados da venda (se aplicável)
  vendaId?: string;
  itemVendaId?: string;
  
  // Dados do usuário
  usuarioId: string;
  
  // Controle offline/online
  sincronizado: boolean;
  clienteTimestamp: Date; // Timestamp do cliente (para ordenação offline)
  servidorTimestamp?: Date; // Timestamp do servidor (quando sincronizado)
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CreateMovimentacaoEstoqueData {
  produtoId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: string;
  observacoes?: string;
  vendaId?: string;
  itemVendaId?: string;
  usuarioId: string;
  clienteTimestamp?: Date; // Para sincronização offline
}

export interface EstoqueResumo {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  valorTotal: number; // quantidade * preço de custo
  ultimaMovimentacao?: Date;
  status: StatusEstoque;
}

export interface VendaOffline {
  id: string; // UUID gerado no cliente
  itens: ItemVendaOffline[];
  valorTotal: number;
  clienteId?: string;
  usuarioId: string;
  observacoes?: string;
  sincronizado: boolean;
  clienteTimestamp: Date;
  servidorTimestamp?: Date;
  
  // Para revalidação no servidor
  hashIntegridade: string;
}

export interface ItemVendaOffline {
  id: string; // UUID gerado no cliente
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
  
  // Cache para validação offline
  nomeProduto: string;
  codigoBarras?: string;
  exigeReceita: boolean;
}

// Enums
export enum TipoMovimentacao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  AJUSTE = 'AJUSTE',
  PERDA = 'PERDA',
  VENCIMENTO = 'VENCIMENTO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  INVENTARIO = 'INVENTARIO'
}

export enum StatusEstoque {
  NORMAL = 'NORMAL',
  BAIXO = 'BAIXO',
  CRITICO = 'CRITICO',
  ZERADO = 'ZERADO',
  EXCESSO = 'EXCESSO'
}

export enum StatusSincronizacao {
  PENDENTE = 'PENDENTE',
  SINCRONIZANDO = 'SINCRONIZANDO',
  SINCRONIZADO = 'SINCRONIZADO',
  ERRO = 'ERRO',
  CONFLITO = 'CONFLITO'
}

/**
 * Regras de negócio para estoque
 */
export class EstoqueBusinessRules {
  /**
   * Valida movimentação de estoque
   */
  static validateMovimentacao(data: CreateMovimentacaoEstoqueData): string[] {
    const errors: string[] = [];

    if (!data.produtoId || data.produtoId.trim() === '') {
      errors.push('ID do produto é obrigatório');
    }

    if (!data.tipo || !Object.values(TipoMovimentacao).includes(data.tipo)) {
      errors.push('Tipo de movimentação inválido');
    }

    if (data.quantidade === undefined || data.quantidade === null || data.quantidade <= 0) {
      errors.push('Quantidade deve ser maior que zero');
    }

    if (!data.motivo || data.motivo.trim().length < 3) {
      errors.push('Motivo deve ter pelo menos 3 caracteres');
    }

    if (data.motivo && data.motivo.length > 200) {
      errors.push('Motivo não pode ter mais de 200 caracteres');
    }

    if (data.observacoes && data.observacoes.length > 500) {
      errors.push('Observações não podem ter mais de 500 caracteres');
    }

    if (!data.usuarioId || data.usuarioId.trim() === '') {
      errors.push('ID do usuário é obrigatório');
    }

    return errors;
  }

  /**
   * Determina status do estoque baseado na quantidade
   */
  static determinarStatusEstoque(
    quantidade: number, 
    estoqueMinimo: number, 
    estoqueMaximo?: number
  ): StatusEstoque {
    if (quantidade === 0) {
      return StatusEstoque.ZERADO;
    }

    if (quantidade <= estoqueMinimo * 0.5) {
      return StatusEstoque.CRITICO;
    }

    if (quantidade <= estoqueMinimo) {
      return StatusEstoque.BAIXO;
    }

    if (estoqueMaximo && quantidade > estoqueMaximo) {
      return StatusEstoque.EXCESSO;
    }

    return StatusEstoque.NORMAL;
  }

  /**
   * Valida se é possível realizar saída de estoque
   */
  static validateSaidaEstoque(quantidadeAtual: number, quantidadeSaida: number): string[] {
    const errors: string[] = [];

    if (quantidadeSaida > quantidadeAtual) {
      errors.push(`Estoque insuficiente. Disponível: ${quantidadeAtual}, Solicitado: ${quantidadeSaida}`);
    }

    return errors;
  }

  /**
   * Calcula valor total do estoque
   */
  static calcularValorEstoque(quantidade: number, precoCusto: number): number {
    return quantidade * precoCusto;
  }

  /**
   * Gera hash de integridade para venda offline
   */
  static gerarHashIntegridade(venda: Omit<VendaOffline, 'hashIntegridade' | 'sincronizado' | 'servidorTimestamp'>): string {
    const dadosParaHash = {
      id: venda.id,
      itens: venda.itens.map(item => ({
        id: item.id,
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario
      })),
      valorTotal: venda.valorTotal,
      clienteId: venda.clienteId,
      usuarioId: venda.usuarioId,
      clienteTimestamp: venda.clienteTimestamp.toISOString()
    };

    // Simples hash baseado em JSON (em produção usar crypto hash)
    return Buffer.from(JSON.stringify(dadosParaHash)).toString('base64');
  }

  /**
   * Valida integridade de venda offline
   */
  static validarIntegridade(venda: VendaOffline): boolean {
    const hashCalculado = this.gerarHashIntegridade(venda);
    return hashCalculado === venda.hashIntegridade;
  }

  /**
   * Determina prioridade de sincronização
   */
  static obterPrioridadeSincronizacao(movimentacao: MovimentacaoEstoque): number {
    // Vendas têm prioridade máxima
    if (movimentacao.vendaId) {
      return 1;
    }

    // Saídas têm prioridade alta
    if (movimentacao.tipo === TipoMovimentacao.SAIDA) {
      return 2;
    }

    // Ajustes e perdas têm prioridade média
    if ([TipoMovimentacao.AJUSTE, TipoMovimentacao.PERDA].includes(movimentacao.tipo)) {
      return 3;
    }

    // Entradas têm prioridade baixa
    return 4;
  }

  /**
   * Verifica se estoque está em nível crítico
   */
  static isEstoqueCritico(quantidade: number, estoqueMinimo: number): boolean {
    return quantidade <= estoqueMinimo * 0.5;
  }

  /**
   * Calcula dias de estoque baseado na média de vendas
   */
  static calcularDiasEstoque(quantidadeAtual: number, mediaVendasDiarias: number): number {
    if (mediaVendasDiarias <= 0) {
      return Infinity;
    }
    return Math.floor(quantidadeAtual / mediaVendasDiarias);
  }
}
