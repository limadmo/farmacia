/**
 * Tipos para Produtos - Sistema de Farmácia
 * 
 * Define tipos e enums para produtos farmacêuticos conforme classificação ANVISA.
 */

// Enums conforme ANVISA
export enum ClassificacaoAnvisa {
  MEDICAMENTO = 'MEDICAMENTO',
  COSMÉTICO = 'COSMÉTICO',
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
  loteObrigatorio: boolean; // Controla se seleção de lote é obrigatória na venda
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
  criadoEm: string;
  atualizadoEm: string;
  
  // Relacionamentos
  categoriaId: string;
  categoria?: {
    id: string;
    nome: string;
  };
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
  loteObrigatorio?: boolean;
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
  loteObrigatorio?: boolean;
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

export interface ProdutoResponse {
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
