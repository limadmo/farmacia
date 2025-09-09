/**
 * Tipos para controle de lotes - Sistema de Farmácia
 */

export interface Lote {
  id: string;
  produtoId: string;
  numeroLote: string;
  codigoBarrasLote?: string;
  dataFabricacao: Date;
  dataValidade: Date;
  quantidadeInicial: number;
  quantidadeAtual: number;
  quantidadeReservada: number;
  precoCusto: number;
  fornecedorId?: string;
  observacoes?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface LoteSelecionado {
  loteId: string;
  numeroLote: string;
  dataValidade: Date;
  quantidade: number;
}

export interface LoteDisponivel {
  id: string;
  numeroLote: string;
  dataFabricacao: Date;
  dataValidade: Date;
  quantidadeAtual: number;
  quantidadeReservada: number;
  quantidadeDisponivel: number;
  precoCusto: number;
  observacoes?: string;
  diasParaVencimento: number;
}

export interface SelecaoLotes {
  produtoId: string;
  produtoNome: string;
  quantidadeSolicitada: number;
  quantidadeSelecionada: number;
  lotesSelecionados: LoteSelecionado[];
  lotesDisponiveis: LoteDisponivel[];
  requerSelecaoManual: boolean;
}

export interface ValidacaoLote {
  valida: boolean;
  mensagem?: string;
  lotesProblematicos?: {
    loteId: string;
    numeroLote: string;
    problema: string;
  }[];
}

export interface ResumoSelecaoLotes {
  totalProdutos: number;
  produtosComLoteObrigatorio: number;
  produtosSemSelecao: string[];
  todasSelecoesConcluidas: boolean;
}