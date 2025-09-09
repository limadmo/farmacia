/**
 * Entidade Lote - Sistema de Farmácia
 * 
 * Representa um lote específico de um produto farmacêutico
 */

export enum TipoMovimentacaoLote {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  VENDA = 'VENDA',
  AJUSTE = 'AJUSTE',
  VENCIMENTO = 'VENCIMENTO',
  DEVOLUCAO = 'DEVOLUCAO'
}

export interface Lote {
  id: string;
  produtoId: string;
  numeroLote: string;
  codigoBarrasLote?: string | null;
  
  // Datas
  dataFabricacao: Date;
  dataValidade: Date;
  
  // Quantidades
  quantidadeInicial: number;
  quantidadeAtual: number;
  quantidadeReservada: number;
  
  // Custo e fornecedor
  precoCusto: number;
  fornecedorId?: string | null;
  
  observacoes?: string | null;
  ativo: boolean;
  
  criadoEm: Date;
  atualizadoEm: Date;
  
  // Relacionamentos opcionais
  produto?: any;
  fornecedor?: any;
  movimentacoes?: MovimentacaoLote[];
}

export interface MovimentacaoLote {
  id: string;
  loteId: string;
  tipo: TipoMovimentacaoLote;
  quantidade: number;
  motivo: string;
  usuarioId: string;
  vendaId?: string | null;
  criadoEm: Date;
  
  // Relacionamentos opcionais
  lote?: Lote;
  usuario?: any;
  venda?: any;
}

export interface MovimentacaoLoteData {
  loteId: string;
  tipo: TipoMovimentacaoLote;
  quantidade: number;
  motivo: string;
  usuarioId: string;
  vendaId?: string | null;
}

export interface CreateLoteData {
  produtoId: string;
  numeroLote: string;
  codigoBarrasLote?: string;
  dataFabricacao: Date;
  dataValidade: Date;
  quantidadeInicial: number;
  precoCusto: number;
  fornecedorId?: string;
  observacoes?: string;
}

export interface UpdateLoteData {
  numeroLote?: string;
  codigoBarrasLote?: string;
  dataFabricacao?: Date;
  dataValidade?: Date;
  precoCusto?: number;
  fornecedorId?: string;
  observacoes?: string;
  ativo?: boolean;
}

export interface LoteResponse {
  lotes: Lote[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

/**
 * Regras de negócio para lotes
 */
export class LoteBusinessRules {
  /**
   * Valida se o lote está dentro da validade
   */
  static isValido(lote: Lote): boolean {
    return new Date() <= lote.dataValidade;
  }

  /**
   * Verifica se o lote está próximo do vencimento (30 dias)
   */
  static isProximoVencimento(lote: Lote, diasAlerta: number = 30): boolean {
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + diasAlerta);
    
    return lote.dataValidade <= dataLimite && lote.dataValidade > hoje;
  }

  /**
   * Verifica se há quantidade disponível no lote
   */
  static hasQuantidadeDisponivel(lote: Lote, quantidadeDesejada: number): boolean {
    const disponivel = lote.quantidadeAtual - lote.quantidadeReservada;
    return disponivel >= quantidadeDesejada;
  }

  /**
   * Valida código de barras do lote
   */
  static isCodigoBarrasValido(codigoBarras: string): boolean {
    if (!codigoBarras) return false;
    
    // Remove espaços e caracteres especiais
    const codigo = codigoBarras.replace(/\D/g, '');
    
    // Verifica se tem pelo menos 8 dígitos
    return codigo.length >= 8 && codigo.length <= 50;
  }

  /**
   * Valida número do lote
   */
  static isNumeroLoteValido(numeroLote: string): boolean {
    if (!numeroLote) return false;
    
    // Remove espaços
    const numero = numeroLote.trim();
    
    // Verifica se tem entre 1 e 50 caracteres
    return numero.length >= 1 && numero.length <= 50;
  }

  /**
   * Valida datas do lote
   */
  static isDatasValidas(dataFabricacao: Date, dataValidade: Date): boolean {
    const hoje = new Date();
    
    // Data de fabricação não pode ser futura
    if (dataFabricacao > hoje) return false;
    
    // Data de validade deve ser posterior à fabricação
    if (dataValidade <= dataFabricacao) return false;
    
    return true;
  }

  /**
   * Calcula dias até o vencimento
   */
  static diasAteVencimento(lote: Lote): number {
    const hoje = new Date();
    const diffTime = lote.dataValidade.getTime() - hoje.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtém status do lote baseado na validade
   */
  static getStatusLote(lote: Lote): 'VALIDO' | 'PROXIMO_VENCIMENTO' | 'VENCIDO' {
    const hoje = new Date();
    
    if (lote.dataValidade < hoje) {
      return 'VENCIDO';
    }
    
    if (this.isProximoVencimento(lote)) {
      return 'PROXIMO_VENCIMENTO';
    }
    
    return 'VALIDO';
  }

  /**
   * Ordena lotes por prioridade FEFO (First Expired, First Out)
   */
  static ordenarPorFEFO(lotes: Lote[]): Lote[] {
    return lotes
      .filter(lote => lote.ativo && lote.quantidadeAtual > 0)
      .sort((a, b) => {
        // Primeiro por validade (mais próximo do vencimento primeiro)
        const diffValidade = a.dataValidade.getTime() - b.dataValidade.getTime();
        if (diffValidade !== 0) return diffValidade;
        
        // Depois por data de fabricação (mais antigo primeiro)
        return a.dataFabricacao.getTime() - b.dataFabricacao.getTime();
      });
  }

  /**
   * Seleciona lotes para atender uma quantidade específica (FEFO)
   */
  static selecionarLotesParaVenda(lotes: Lote[], quantidadeDesejada: number): Lote[] {
    const lotesOrdenados = this.ordenarPorFEFO(lotes);
    const lotesSelecionados: Lote[] = [];
    let quantidadeRestante = quantidadeDesejada;

    for (const lote of lotesOrdenados) {
      if (quantidadeRestante <= 0) break;
      
      const disponivel = lote.quantidadeAtual - lote.quantidadeReservada;
      if (disponivel > 0) {
        lotesSelecionados.push(lote);
        quantidadeRestante -= Math.min(disponivel, quantidadeRestante);
      }
    }

    return lotesSelecionados;
  }
}