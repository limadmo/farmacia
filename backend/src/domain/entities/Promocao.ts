/**
 * Entidade Promocao - Sistema de Farmácia
 * 
 * Representa uma promoção aplicável a produtos farmacêuticos.
 * Implementa validações de negócio para diferentes tipos de desconto.
 */

export interface Promocao {
  id: string;
  nome: string;
  descricao?: string;
  
  // Tipo de alcance da promoção
  tipoAlcance: TipoAlcancePromocao;
  
  // Critérios de aplicação (baseado no tipo de alcance)
  produtoId?: string; // Para promoções por produto específico
  laboratorio?: string; // Para promoções por laboratório
  loteId?: string; // Para promoções por lote específico
  
  // Tipo e valor do desconto
  tipo: TipoPromocao;
  valorDesconto?: number; // valor fixo em reais
  porcentagemDesconto?: number; // percentual de desconto
  precoPromocional?: number; // preço final calculado
  
  // Condições de término
  condicaoTermino: CondicaoTermino;
  quantidadeMaxima?: number; // quantidade máxima para venda
  quantidadeVendida: number; // quantidade já vendida
  
  // Período de validade
  dataInicio: Date;
  dataFim: Date;
  
  // Status
  ativo: boolean;
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CreatePromocaoData {
  nome: string;
  descricao?: string;
  tipoAlcance: TipoAlcancePromocao;
  produtoId?: string;
  laboratorio?: string;
  loteId?: string;
  tipo: TipoPromocao;
  valorDesconto?: number;
  porcentagemDesconto?: number;
  condicaoTermino: CondicaoTermino;
  quantidadeMaxima?: number;
  dataInicio: Date;
  dataFim: Date;
  ativo?: boolean;
}

export interface UpdatePromocaoData {
  nome?: string;
  descricao?: string;
  tipoAlcance?: TipoAlcancePromocao;
  produtoId?: string;
  laboratorio?: string;
  loteId?: string;
  tipo?: TipoPromocao;
  valorDesconto?: number;
  porcentagemDesconto?: number;
  condicaoTermino?: CondicaoTermino;
  quantidadeMaxima?: number;
  dataInicio?: Date;
  dataFim?: Date;
  ativo?: boolean;
}

/**
 * Enum para tipos de promoção
 */
export enum TipoPromocao {
  FIXO = 'FIXO',           // Desconto em valor fixo (R$ 10,00 off)
  PORCENTAGEM = 'PORCENTAGEM' // Desconto percentual (20% off)
}

/**
 * Enum para condições de término da promoção
 */
export enum CondicaoTermino {
  ATE_ACABAR_ESTOQUE = 'ATE_ACABAR_ESTOQUE',     // Até acabar o estoque
  QUANTIDADE_LIMITADA = 'QUANTIDADE_LIMITADA'    // Quantidade limitada específica
}

/**
 * Enum para tipos de alcance da promoção
 */
export enum TipoAlcancePromocao {
  PRODUTO = 'PRODUTO',         // Promoção para um produto específico
  LABORATORIO = 'LABORATORIO', // Promoção para todos produtos de um laboratório
  LOTE = 'LOTE'               // Promoção para um lote específico
}

/**
 * Classe com regras de negócio para promoções
 */
export class PromocaoBusinessRules {
  
  /**
   * Valida os dados de uma promoção
   */
  static validatePromocao(data: CreatePromocaoData): string[] {
    const errors: string[] = [];
    
    // Validação do nome
    if (!data.nome || data.nome.trim().length === 0) {
      errors.push('Nome da promoção é obrigatório');
    }
    
    if (data.nome && data.nome.length > 100) {
      errors.push('Nome da promoção deve ter no máximo 100 caracteres');
    }
    
    // Validação baseada no tipo de alcance
    if (data.tipoAlcance === TipoAlcancePromocao.PRODUTO) {
      if (!data.produtoId) {
        errors.push('Produto é obrigatório para promoções por produto');
      }
      if (data.laboratorio || data.loteId) {
        errors.push('Para promoções por produto, apenas produtoId deve ser informado');
      }
    }
    
    if (data.tipoAlcance === TipoAlcancePromocao.LABORATORIO) {
      if (!data.laboratorio || data.laboratorio.trim().length === 0) {
        errors.push('Laboratório é obrigatório para promoções por laboratório');
      }
      if (data.produtoId || data.loteId) {
        errors.push('Para promoções por laboratório, apenas laboratório deve ser informado');
      }
    }
    
    if (data.tipoAlcance === TipoAlcancePromocao.LOTE) {
      if (!data.loteId) {
        errors.push('Lote é obrigatório para promoções por lote');
      }
      if (data.laboratorio || data.produtoId) {
        errors.push('Para promoções por lote, apenas loteId deve ser informado');
      }
    }
    
    // Validação do tipo e valores de desconto
    if (data.tipo === TipoPromocao.FIXO) {
      if (!data.valorDesconto || data.valorDesconto <= 0) {
        errors.push('Valor do desconto deve ser maior que zero para promoções do tipo FIXO');
      }
      if (data.porcentagemDesconto) {
        errors.push('Porcentagem de desconto não deve ser informada para promoções do tipo FIXO');
      }
    }
    
    if (data.tipo === TipoPromocao.PORCENTAGEM) {
      if (!data.porcentagemDesconto || data.porcentagemDesconto <= 0 || data.porcentagemDesconto > 100) {
        errors.push('Porcentagem de desconto deve estar entre 0 e 100 para promoções do tipo PORCENTAGEM');
      }
      if (data.valorDesconto) {
        errors.push('Valor do desconto não deve ser informado para promoções do tipo PORCENTAGEM');
      }
    }
    
    // Validação das datas
    if (!data.dataInicio) {
      errors.push('Data de início é obrigatória');
    }
    
    if (!data.dataFim) {
      errors.push('Data de fim é obrigatória');
    }
    
    if (data.dataInicio && data.dataFim && data.dataInicio >= data.dataFim) {
      errors.push('Data de início deve ser anterior à data de fim');
    }
    
    // Validação da condição de término
    if (data.condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA) {
      if (!data.quantidadeMaxima || data.quantidadeMaxima <= 0) {
        errors.push('Quantidade máxima deve ser maior que zero para promoções com quantidade limitada');
      }
    }
    
    if (data.condicaoTermino === CondicaoTermino.ATE_ACABAR_ESTOQUE && data.quantidadeMaxima) {
      errors.push('Quantidade máxima não deve ser informada para promoções até acabar o estoque');
    }
    
    return errors;
  }
  
  /**
   * Calcula o preço promocional baseado no tipo de desconto
   */
  static calcularPrecoPromocional(
    precoOriginal: number,
    tipo: TipoPromocao,
    valorDesconto?: number,
    porcentagemDesconto?: number
  ): number {
    if (tipo === TipoPromocao.FIXO && valorDesconto) {
      const precoFinal = precoOriginal - valorDesconto;
      return Math.max(precoFinal, 0); // Não pode ser negativo
    }
    
    if (tipo === TipoPromocao.PORCENTAGEM && porcentagemDesconto) {
      const desconto = (precoOriginal * porcentagemDesconto) / 100;
      return precoOriginal - desconto;
    }
    
    return precoOriginal;
  }
  
  /**
   * Verifica se a promoção está ativa no momento
   */
  static isPromocaoAtiva(promocao: Promocao): boolean {
    const agora = new Date();
    return promocao.ativo && 
           promocao.dataInicio <= agora && 
           promocao.dataFim >= agora;
  }
  
  /**
   * Verifica se ainda há quantidade disponível na promoção
   */
  static hasQuantidadeDisponivel(promocao: Promocao): boolean {
    if (promocao.condicaoTermino === CondicaoTermino.ATE_ACABAR_ESTOQUE) {
      return true; // Depende do estoque do produto
    }
    
    if (promocao.condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA && promocao.quantidadeMaxima) {
      return promocao.quantidadeVendida < promocao.quantidadeMaxima;
    }
    
    return false;
  }
  
  /**
   * Verifica se a promoção pode ser aplicada
   */
  static podeAplicarPromocao(promocao: Promocao): boolean {
    return this.isPromocaoAtiva(promocao) && this.hasQuantidadeDisponivel(promocao);
  }
  
  /**
   * Calcula a economia gerada pela promoção
   */
  static calcularEconomia(
    precoOriginal: number,
    precoPromocional: number
  ): number {
    return Math.max(precoOriginal - precoPromocional, 0);
  }
  
  /**
   * Calcula o percentual de desconto efetivo
   */
  static calcularPercentualDesconto(
    precoOriginal: number,
    precoPromocional: number
  ): number {
    if (precoOriginal <= 0) return 0;
    const economia = this.calcularEconomia(precoOriginal, precoPromocional);
    return (economia / precoOriginal) * 100;
  }
  
  /**
   * Verifica se uma promoção se aplica a um produto específico
   */
  static promocaoAplicaAoProduto(
    promocao: Promocao, 
    produto: { id: string; laboratorio?: string; },
    loteId?: string
  ): boolean {
    if (!this.podeAplicarPromocao(promocao)) {
      return false;
    }
    
    switch (promocao.tipoAlcance) {
      case TipoAlcancePromocao.PRODUTO:
        return promocao.produtoId === produto.id;
        
      case TipoAlcancePromocao.LABORATORIO:
        return promocao.laboratorio === produto.laboratorio;
        
      case TipoAlcancePromocao.LOTE:
        return promocao.loteId === loteId && promocao.produtoId === produto.id;
        
      default:
        return false;
    }
  }
  
  /**
   * Obtém a descrição do tipo de alcance da promoção
   */
  static obterDescricaoAlcance(promocao: Promocao): string {
    switch (promocao.tipoAlcance) {
      case TipoAlcancePromocao.PRODUTO:
        return 'Produto específico';
      case TipoAlcancePromocao.LABORATORIO:
        return `Laboratório ${promocao.laboratorio}`;
      case TipoAlcancePromocao.LOTE:
        return 'Lote específico';
      default:
        return 'Indefinido';
    }
  }
  
  /**
   * Verifica se a promoção tem hierarquia superior (mais específica)
   */
  static compararHierarquiaPromocoes(promocaoA: Promocao, promocaoB: Promocao): number {
    const hierarquia = {
      [TipoAlcancePromocao.LOTE]: 3,        // Mais específica
      [TipoAlcancePromocao.PRODUTO]: 2,     // Especificidade média
      [TipoAlcancePromocao.LABORATORIO]: 1  // Mais geral
    };
    
    return hierarquia[promocaoA.tipoAlcance] - hierarquia[promocaoB.tipoAlcance];
  }
}