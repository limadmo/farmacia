/**
 * Entidade Produto - Sistema de Farmácia
 * 
 * Representa um produto farmacêutico conforme classificação ANVISA.
 * Implementa validações de negócio conforme regulamentação brasileira.
 */

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  codigoBarras?: string;
  
  // Classificação ANVISA obrigatória
  classificacaoAnvisa: ClassificacaoAnvisa;
  categoriaAnvisa?: string;
  registroAnvisa?: string;
  
  // Controle de medicamentos controlados (Portaria SVS/MS nº 344/1998)
  exigeReceita: boolean;
  tipoReceita?: TipoReceita;
  classeControlada?: ClasseControlada;
  retencaoReceita: boolean;
  principioAtivo?: string;
  laboratorio?: string;
  
  // Dados físicos
  peso?: number; // em gramas
  volume?: number; // em ml
  dosagem?: string; // ex: "500mg", "10ml"
  formaFarmaceutica?: string; // ex: "comprimido", "xarope"
  
  // Validade e lote
  dataVencimento?: Date;
  lote?: string;
  
  // Dados comerciais
  precoVenda: number;
  precoCusto?: number;
  margem?: number; // percentual
  
  // Estoque
  estoque: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  
  // Status
  ativo: boolean;
  
  // Metadata
  criadoEm: Date;
  atualizadoEm: Date;
  
  // Relacionamentos
  categoriaId: string;
}

export interface CreateProdutoData {
  nome: string;
  descricao?: string;
  codigoBarras?: string;
  classificacaoAnvisa: ClassificacaoAnvisa;
  categoriaAnvisa?: string;
  registroAnvisa?: string;
  exigeReceita?: boolean;
  tipoReceita?: TipoReceita;
  classeControlada?: ClasseControlada;
  principioAtivo?: string;
  laboratorio?: string;
  peso?: number;
  volume?: number;
  dosagem?: string;
  formaFarmaceutica?: string;
  dataVencimento?: Date;
  lote?: string;
  precoVenda: number;
  precoCusto?: number;
  estoque: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  ativo?: boolean;
  categoriaId: string;
}

export interface UpdateProdutoData {
  nome?: string;
  descricao?: string;
  codigoBarras?: string;
  classificacaoAnvisa?: ClassificacaoAnvisa;
  categoriaAnvisa?: string;
  registroAnvisa?: string;
  exigeReceita?: boolean;
  tipoReceita?: TipoReceita;
  classeControlada?: ClasseControlada;
  principioAtivo?: string;
  laboratorio?: string;
  peso?: number;
  volume?: number;
  dosagem?: string;
  formaFarmaceutica?: string;
  dataVencimento?: Date;
  lote?: string;
  precoVenda?: number;
  precoCusto?: number;
  margem?: number;
  estoque?: number;
  estoqueMinimo?: number;
  estoqueMaximo?: number;
  ativo?: boolean;
  categoriaId?: string;
}

// Enums conforme ANVISA
export enum ClassificacaoAnvisa {
  MEDICAMENTO = 'MEDICAMENTO',
  COSMETICO = 'COSMÉTICO',
  SANEANTE = 'SANEANTE',
  CORRELATO = 'CORRELATO',
  ALIMENTO = 'ALIMENTO',
  PRODUTO_HIGIENE = 'PRODUTO_HIGIENE',
  OUTROS = 'OUTROS'
}

export enum ClasseControlada {
  A1 = 'A1', // Entorpecentes
  A2 = 'A2', // Entorpecentes
  A3 = 'A3', // Psicotrópicos
  B1 = 'B1', // Psicotrópicos
  B2 = 'B2', // Psicotrópicos anorexígenos
  C1 = 'C1', // Outras substâncias sujeitas a controle especial
  C2 = 'C2', // Retinoides
  C3 = 'C3', // Imunossupressores
  C4 = 'C4', // Antirretrovirais
  C5 = 'C5'  // Anabolizantes
}

export enum TipoReceita {
  RECEITA_AMARELA = 'RECEITA_AMARELA', // Classes A1, A2, A3
  RECEITA_AZUL = 'RECEITA_AZUL',       // Classes B1, B2
  RECEITA_BRANCA = 'RECEITA_BRANCA'    // Classes C1-C5 e medicamentos tarjados
}

/**
 * Regras de negócio para produtos farmacêuticos
 */
export class ProdutoBusinessRules {
  /**
   * Valida dados básicos do produto
   */
  static validateProduto(data: CreateProdutoData): string[] {
    const errors: string[] = [];

    // Validar nome
    if (!data.nome || data.nome.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }
    if (data.nome && data.nome.length > 200) {
      errors.push('Nome não pode ter mais de 200 caracteres');
    }

    // Validar classificação ANVISA (obrigatória)
    if (!data.classificacaoAnvisa) {
      errors.push('Classificação ANVISA é obrigatória');
    }

    // Validar preços
    if (!data.precoVenda || data.precoVenda <= 0) {
      errors.push('Preço de venda deve ser maior que zero');
    }

    if (data.precoCusto && data.precoCusto < 0) {
      errors.push('Preço de custo não pode ser negativo');
    }

    if (data.precoCusto && data.precoVenda && data.precoCusto > data.precoVenda) {
      errors.push('Preço de custo não pode ser maior que preço de venda');
    }

    // Validar estoque
    if (data.estoque < 0) {
      errors.push('Quantidade em estoque não pode ser negativa');
    }

    if (data.estoqueMinimo < 0) {
      errors.push('Estoque mínimo não pode ser negativo');
    }

    if (data.estoqueMaximo && data.estoqueMaximo < data.estoqueMinimo) {
      errors.push('Estoque máximo deve ser maior que estoque mínimo');
    }

    // Validar código de barras se fornecido
    if (data.codigoBarras && !this.isValidBarcode(data.codigoBarras)) {
      errors.push('Código de barras inválido');
    }

    // Validar medicamentos controlados
    if (data.classeControlada) {
      const validacaoControlado = this.validateMedicamentoControlado(data);
      errors.push(...validacaoControlado);
    }

    return errors;
  }

  /**
   * Valida medicamentos controlados
   */
  static validateMedicamentoControlado(data: CreateProdutoData): string[] {
    const errors: string[] = [];

    if (data.classeControlada) {
      // Medicamentos controlados devem ser medicamentos
      if (data.classificacaoAnvisa !== ClassificacaoAnvisa.MEDICAMENTO) {
        errors.push('Apenas medicamentos podem ter classe controlada');
      }

      // Medicamentos controlados devem ter registro ANVISA
      if (!data.registroAnvisa) {
        errors.push('Medicamentos controlados devem ter registro ANVISA');
      }

      // Medicamentos controlados devem ter princípio ativo
      if (!data.principioAtivo) {
        errors.push('Medicamentos controlados devem ter princípio ativo informado');
      }
    }

    return errors;
  }

  /**
   * Determina o tipo de receita necessária
   */
  static getTipoReceita(classeControlada?: ClasseControlada): TipoReceita | undefined {
    if (!classeControlada) return undefined;

    switch (classeControlada) {
      case ClasseControlada.A1:
      case ClasseControlada.A2:
      case ClasseControlada.A3:
        return TipoReceita.RECEITA_AMARELA;
      
      case ClasseControlada.B1:
      case ClasseControlada.B2:
        return TipoReceita.RECEITA_AZUL;
      
      case ClasseControlada.C1:
      case ClasseControlada.C2:
      case ClasseControlada.C3:
      case ClasseControlada.C4:
      case ClasseControlada.C5:
        return TipoReceita.RECEITA_BRANCA;
      
      default:
        return undefined;
    }
  }

  /**
   * Verifica se medicamento requer retenção de receita
   */
  static requiresRecipeRetention(classeControlada?: ClasseControlada): boolean {
    if (!classeControlada) return false;
    
    // Classes A e B requerem retenção de receita
    return ['A1', 'A2', 'A3', 'B1', 'B2'].includes(classeControlada);
  }

  /**
   * Validação de código de barras (EAN-13 ou EAN-8)
   */
  private static isValidBarcode(barcode: string): boolean {
    const cleanBarcode = barcode.replace(/\D/g, '');
    
    // Deve ter 8 ou 13 dígitos
    if (cleanBarcode.length !== 8 && cleanBarcode.length !== 13) {
      return false;
    }

    // Algoritmo de validação EAN
    let sum = 0;
    const length = cleanBarcode.length;
    
    for (let i = 0; i < length - 1; i++) {
      const digit = parseInt(cleanBarcode[i]);
      if (i % 2 === 0) {
        sum += digit;
      } else {
        sum += digit * 3;
      }
    }
    
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(cleanBarcode[length - 1]);
  }

  /**
   * Calcula margem de lucro
   */
  static calcularMargem(precoCusto: number, precoVenda: number): number {
    if (precoCusto <= 0) return 0;
    return ((precoVenda - precoCusto) / precoCusto) * 100;
  }

  /**
   * Verifica se produto está em estoque baixo
   */
  static isEstoqueBaixo(quantidadeAtual: number, estoqueMinimo: number): boolean {
    return quantidadeAtual <= estoqueMinimo;
  }
}