/**
 * Tipos para o módulo de Auditoria - Sistema de Farmácia
 */

export interface VendaControlada {
  id: string;
  dataVenda: string;
  numeroReceita: string;
  dataReceita: string;
  vendedor: {
    nome: string;
    login: string;
    tipo: string;
  };
  cliente: {
    nome: string;
    documento?: string;
  };
  produtos: Array<{
    nome: string;
    quantidade: number;
    precoUnitario: number;
    classificacao: string;
  }>;
  valorTotal: number;
  vendaAssistida: boolean;
  justificativa?: string;
}

export interface FiltroAuditoria {
  dataInicio?: string;
  dataFim?: string;
  vendedorId?: string;
  numeroReceita?: string;
  tipoUsuario?: string;
  apenasVendasAssistidas?: boolean;
}

export interface ResumoAuditoria {
  totalVendasControladas: number;
  totalVendasAssistidas: number;
  totalVendedores: number;
  valorTotalPeriodo: number;
  principaisControlados: Array<{
    nome: string;
    quantidade: number;
    classificacao: string;
  }>;
}

export interface VendasControladasResponse {
  vendas: VendaControlada[];
  total: number;
}

export interface VendedorComControlados {
  id: string;
  nome: string;
  tipo: string;
  totalVendas: number;
  totalAssistidas: number;
  valorTotal: number;
}

export interface VendedoresControladosResponse {
  vendedores: VendedorComControlados[];
}

export interface RelatorioAuditoria {
  periodoConsulta: {
    inicio: string | null;
    fim: string | null;
  };
  resumo: ResumoAuditoria;
  vendas: VendaControlada[];
  totalRegistros: number;
  geradoEm: string;
  geradoPor?: string;
}