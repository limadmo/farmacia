/**
 * Tipos para Promoções - Sistema de Farmácia
 * 
 * Define tipos e enums para promoções de produtos farmacêuticos.
 */

// Enums para promoções
export enum TipoPromocao {
  FIXO = 'FIXO',
  PORCENTAGEM = 'PORCENTAGEM'
}

export enum CondicaoTermino {
  ATE_ACABAR_ESTOQUE = 'ATE_ACABAR_ESTOQUE',
  QUANTIDADE_LIMITADA = 'QUANTIDADE_LIMITADA'
}

export interface Promocao {
  id: string;
  nome: string;
  produtoId: string;
  
  // Tipo e valores da promoção
  tipo: TipoPromocao;
  valorDesconto?: number; // Para tipo FIXO
  porcentagemDesconto?: number; // Para tipo PORCENTAGEM
  precoPromocional: number; // Preço final calculado
  
  // Condições de término
  condicaoTermino: CondicaoTermino;
  quantidadeMaxima?: number; // Para QUANTIDADE_LIMITADA
  quantidadeVendida: number;
  
  // Período de vigência
  dataInicio: string;
  dataFim: string;
  
  // Status
  ativo: boolean;
  
  // Metadados
  criadoEm: string;
  atualizadoEm: string;
  
  // Relacionamento com produto
  produto?: {
    id: string;
    nome: string;
    precoVenda: number;
    estoque: number;
  };
}

export interface CreatePromocaoData {
  nome: string;
  produtoId: string;
  tipo: TipoPromocao;
  valorDesconto?: number;
  porcentagemDesconto?: number;
  condicaoTermino: CondicaoTermino;
  quantidadeMaxima?: number;
  dataInicio: string;
  dataFim: string;
  ativo?: boolean;
}

export interface UpdatePromocaoData {
  nome?: string;
  produtoId?: string;
  tipo?: TipoPromocao;
  valorDesconto?: number;
  porcentagemDesconto?: number;
  condicaoTermino?: CondicaoTermino;
  quantidadeMaxima?: number;
  dataInicio?: string;
  dataFim?: string;
  ativo?: boolean;
}

export interface PromocaoResponse {
  promocoes: Promocao[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Interface para filtros de listagem
export interface PromocaoFilters {
  page?: number;
  limit?: number;
  search?: string;
  produtoId?: string;
  tipo?: TipoPromocao;
  ativo?: boolean;
  vigentes?: boolean; // Filtro para promoções vigentes (dentro do período)
  disponiveis?: boolean; // Filtro para promoções disponíveis (vigentes + com quantidade)
}

// Interface para cálculos de promoção
export interface CalculoPromocao {
  precoOriginal: number;
  precoPromocional: number;
  valorDesconto: number;
  porcentagemDesconto: number;
  economia: number;
}

// Interface para validação de promoção
export interface ValidacaoPromocao {
  valida: boolean;
  erros: string[];
}

// Interface para status da promoção
export interface StatusPromocao {
  ativa: boolean;
  vigente: boolean;
  disponivel: boolean;
  quantidadeRestante?: number;
  diasRestantes?: number;
}