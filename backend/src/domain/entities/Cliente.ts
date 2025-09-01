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

export interface HistoricoCredito {
  id: string;
  clienteId: string;
  tipo: TipoMovimentacaoCredito;
  valor: number;
  descricao?: string;
  usuarioId: string;
  criadoEm: Date;
}

export interface Cliente {
  id: string;
  nome: string;
  documento?: string; // CPF ou CNPJ (opcional)
  tipoDocumento?: TipoDocumento; // Tipo do documento (opcional)
  email?: string;
  telefone?: string;
  endereco?: string;
  
  // Sistema de crédito
  limiteCredito: number;
  creditoDisponivel: number;
  creditoHabilitado: boolean;
  
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
  
  // Relacionamentos
  historicoCredito?: HistoricoCredito[];
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
  usuarioId: string;
}
