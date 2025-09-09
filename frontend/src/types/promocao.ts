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

export enum TipoAlcancePromocao {
  PRODUTO = 'PRODUTO',
  LABORATORIO = 'LABORATORIO', 
  LOTE = 'LOTE'
}

export interface Promocao {
  id: string;
  nome: string;
  
  // Tipo de alcance da promoção
  tipoAlcance: TipoAlcancePromocao;
  
  // Critérios de aplicação (baseado no tipo de alcance)
  produtoId?: string; // Para promoções por produto específico
  laboratorio?: string; // Para promoções por laboratório
  loteId?: string; // Para promoções por lote específico
  
  // Tipo e valores da promoção
  tipo: TipoPromocao;
  valorDesconto?: number; // Para tipo FIXO
  porcentagemDesconto?: number; // Para tipo PORCENTAGEM
  precoPromocional?: number; // Preço final calculado
  
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
  
  // Lotes selecionados para a promoção
  lotesSelecionados?: LotePromocaoSelecionado[];
  
  // Valor da economia calculada
  economia?: number;
  
  // Relacionamentos
  produto?: {
    id: string;
    nome: string;
    precoVenda: number;
    estoque: number;
  };
  lote?: {
    id: string;
    numeroLote: string;
    dataValidade: string;
  };
}

export interface CreatePromocaoData {
  nome: string;
  tipoAlcance: TipoAlcancePromocao;
  produtoId?: string;
  laboratorio?: string;
  loteId?: string;
  tipo: TipoPromocao;
  valorDesconto?: number;
  porcentagemDesconto?: number;
  condicaoTermino: CondicaoTermino;
  quantidadeMaxima?: number;
  dataInicio: string;
  dataFim: string;
  ativo?: boolean;
  lotesSelecionados?: LotePromocaoSelecionado[];
}

export interface UpdatePromocaoData {
  nome?: string;
  tipoAlcance?: TipoAlcancePromocao;
  produtoId?: string;
  laboratorio?: string;
  loteId?: string;
  tipo?: TipoPromocao;
  valorDesconto?: number;
  porcentagemDesconto?: number;
  condicaoTermino?: CondicaoTermino;
  quantidadeMaxima?: number;
  dataInicio?: string;
  dataFim?: string;
  ativo?: boolean;
  lotesSelecionados?: LotePromocaoSelecionado[];
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
  laboratorio?: string;
  loteId?: string;
  tipoAlcance?: TipoAlcancePromocao;
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

// Interfaces para seleção de estoque em promoções
export interface LotePromocaoSelecionado {
  loteId: string;
  numeroLote: string;
  dataValidade: string;
  quantidadeDisponivel: number;
  quantidadeAplicavel: number;
  diasParaVencimento?: number;
  precoCusto?: number;
}

export interface PromocaoLote {
  id: string;
  promocaoId: string;
  loteId: string;
  quantidadeAplicavel: number;
  criadoEm: string;
  lote?: {
    id: string;
    numeroLote: string;
    dataValidade: string;
    quantidadeAtual: number;
    precoCusto: number;
  };
}