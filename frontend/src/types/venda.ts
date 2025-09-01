/**
 * Tipos para o módulo de Vendas - Sistema de Farmácia
 */

export enum FormaPagamento {
  DINHEIRO = 'DINHEIRO',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CREDITO_LOJA = 'CREDITO_LOJA'
}

export enum StatusPagamento {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  CANCELADO = 'CANCELADO'
}

export interface ItemVenda {
  id?: string;
  produtoId: string;
  quantidade: number;
  precoUnitario?: number;
  desconto?: number;
  total?: number;
  produto?: any;
}

export interface Venda {
  id: string;
  clienteId?: string;
  usuarioId: string;
  clienteNome?: string;
  clienteDocumento?: string;
  clienteTipoDocumento?: string;
  pacienteNome?: string;
  pacienteDocumento?: string;
  pacienteTipoDocumento?: string;
  pacienteEndereco?: string;
  pacienteRg?: string;
  valorTotal: number;
  valorDesconto: number;
  valorFinal: number;
  formaPagamento: FormaPagamento;
  statusPagamento: StatusPagamento;
  temMedicamentoControlado: boolean;
  receitaArquivada: boolean;
  numeroReceita?: string;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
  dataPagamento?: Date;
  dataCancelamento?: Date;
  itens: ItemVenda[];
  cliente?: any;
  usuario?: any;
}

export interface CriarVendaData {
  clienteId?: string;
  clienteNome?: string;
  clienteDocumento?: string;
  clienteTipoDocumento?: string;
  pacienteNome?: string;
  pacienteDocumento?: string;
  pacienteTipoDocumento?: string;
  pacienteEndereco?: string;
  pacienteRg?: string;
  formaPagamento: FormaPagamento;
  numeroReceita?: string;
  dataReceita?: string;
  observacoes?: string;
  itens: {
    produtoId: string;
    quantidade: number;
    precoUnitario?: number;
    desconto?: number;
  }[];
}

export interface AtualizarVendaData {
  statusPagamento?: StatusPagamento;
  receitaArquivada?: boolean;
  observacoes?: string;
}

export interface VendaFiltros {
  page?: number;
  limit?: number;
  clienteId?: string;
  usuarioId?: string;
  formaPagamento?: FormaPagamento;
  statusPagamento?: StatusPagamento;
  dataInicio?: string;
  dataFim?: string;
  temMedicamentoControlado?: boolean;
}

export interface VendaListResponse {
  vendas: Venda[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface RelatorioVendas {
  periodo: {
    inicio: string;
    fim: string;
    dataInicio?: Date;
    dataFim?: Date;
  };
  totais: {
    vendas: number;
    valorBruto: number;
    descontos: number;
    valorLiquido: number;
  };
  porFormaPagamento: {
    formaPagamento: FormaPagamento;
    quantidade: number;
    valorTotal: number;
  }[];
  porDia: {
    data: string;
    quantidade: number;
    valorTotal: number;
  }[];
  medicamentosControlados: {
    quantidade: number;
    valorTotal: number;
    percentual: number;
  };
  resumo: {
    totalVendas: number;
    valorTotal: number;
    valorDesconto: number;
    valorFinal: number;
    ticketMedio: number;
  };
  vendasPorFormaPagamento: Record<string, { quantidade: number; valor: number }>;
  vendasPorStatus: Record<string, { quantidade: number; valor: number }>;
  produtosMaisVendidos: Array<{
    id: string;
    nome: string;
    quantidade: number;
    valor: number;
  }>;
  vendas: Array<{
    id: string;
    data: Date;
    cliente: string;
    vendedor: string;
    valorFinal: number;
    formaPagamento: FormaPagamento;
  }>;
}