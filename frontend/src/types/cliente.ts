/**
 * Tipos TypeScript para Cliente - Sistema de Farmácia
 * 
 * Define interfaces e enums para gestão de clientes no frontend.
 */

export enum TipoDocumento {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  PASSAPORTE = 'PASSAPORTE',
}

export enum TipoMovimentacaoCredito {
  CREDITO = 'CREDITO',
  DEBITO = 'DEBITO',
  PAGAMENTO = 'PAGAMENTO',
}

export interface Cliente {
  id: string;
  nome: string;
  documento?: string;
  tipoDocumento?: TipoDocumento;
  documentoFormatado?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  limiteCredito: number;
  creditoDisponivel: number;
  creditoHabilitado: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CriarClienteData {
  nome: string;
  documento?: string;
  tipoDocumento?: TipoDocumento;
  email?: string;
  telefone?: string;
  endereco?: string;
  limiteCredito?: number;
  creditoHabilitado?: boolean;
}

export interface AtualizarClienteData {
  nome?: string;
  documento?: string;
  tipoDocumento?: TipoDocumento;
  email?: string;
  telefone?: string;
  endereco?: string;
  limiteCredito?: number;
  creditoHabilitado?: boolean;
  ativo?: boolean;
}

export interface MovimentarCreditoData {
  clienteId: string;
  tipo: TipoMovimentacaoCredito;
  valor: number;
  descricao?: string;
}

export interface HistoricoCredito {
  id: string;
  tipo: TipoMovimentacaoCredito;
  valor: number;
  descricao?: string;
  criadoEm: string;
  saldoAnterior: number;
  saldoPosterior: number;
}

export interface ClienteResponse {
  id: string;
  nome: string;
  documento?: string;
  tipoDocumento?: string;
  documentoFormatado?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  limiteCredito: number;
  creditoDisponivel: number;
  creditoHabilitado: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface HistoricoCreditoResponse {
  id: string;
  tipo: string;
  valor: number;
  descricao?: string;
  criadoEm: string;
  saldoAnterior: number;
  saldoPosterior: number;
}

export interface ClienteListResponse {
  clientes: ClienteResponse[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ClienteFilters {
  search?: string;
  ativo?: boolean;
  creditoHabilitado?: boolean;
  tipoDocumento?: TipoDocumento;
}