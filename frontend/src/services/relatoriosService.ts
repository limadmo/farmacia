// Serviço de Relatórios - Frontend
// Cliente HTTP para consumir API de relatórios gerenciais

import api from './api';

// Interfaces baseadas no backend
export interface FiltrosRelatorio {
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  categoriaId?: string;
  fornecedorId?: string;
  clienteId?: string;
  vendedorId?: string;
}

export interface ResumoExecutivo {
  vendas: {
    total: number;
    valor: number;
    crescimento: number;
    ticketMedio: number;
  };
  produtos: {
    maisVendidos: Array<{
      id: string;
      nome: string;
      quantidadeVendida: number;
      valorTotal: number;
    }>;
    estoqueBaixo: number;
    vencendo: number;
  };
  clientes: {
    novos: number;
    recorrentes: number;
    topCompradores: Array<{
      id: string;
      nome: string;
      totalCompras: number;
      valorTotal: number;
    }>;
  };
  financeiro: {
    receitaTotal: number;
    custoTotal: number;
    lucroOperacional: number;
    margemLucro: number;
  };
}

export interface AnaliseVendas {
  porPeriodo: Array<{
    data: string;
    vendas: number;
    valor: number;
  }>;
  porCategoria: Array<{
    categoria: string;
    vendas: number;
    valor: number;
    percentual: number;
  }>;
  porVendedor: Array<{
    vendedor: string;
    vendas: number;
    valor: number;
    ticketMedio: number;
  }>;
  porFormaPagamento: Array<{
    formaPagamento: string;
    vendas: number;
    valor: number;
    percentual: number;
  }>;
}

export interface AnaliseEstoque {
  valorTotal: number;
  itensTotal: number;
  categorias: Array<{
    categoria: string;
    quantidade: number;
    valorEstoque: number;
    percentual: number;
  }>;
  curvaABC: {
    A: Array<{ produto: string; valor: number; percentualAcumulado: number }>;
    B: Array<{ produto: string; valor: number; percentualAcumulado: number }>;
    C: Array<{ produto: string; valor: number; percentualAcumulado: number }>;
  };
  movimentacao: Array<{
    tipo: string;
    quantidade: number;
    valor: number;
  }>;
  alertas: {
    estoqueBaixo: number;
    vencendo: number;
    vencidos: number;
  };
}

export interface AnaliseFinanceira {
  fluxoCaixa: Array<{
    data: string;
    entradas: number;
    saidas: number;
    saldo: number;
  }>;
  dre: {
    receita: number;
    custos: number;
    despesas: number;
    lucroOperacional: number;
    margemBruta: number;
    margemLiquida: number;
  };
  contasReceber: {
    total: number;
    vencidas: number;
    aVencer: number;
  };
  contasPagar: {
    total: number;
    vencidas: number;
    aVencer: number;
  };
}

export interface AnaliseClientes {
  total: number;
  novos: number;
  ativos: number;
  inativos: number;
  segmentacao: Array<{
    segmento: string;
    quantidade: number;
    valorMedio: number;
  }>;
  frequenciaCompra: Array<{
    frequencia: string;
    quantidade: number;
    percentual: number;
  }>;
  satisfacao: {
    media: number;
    nps: number;
  };
}

// ===== INTERFACES DE ESTOQUE =====

export interface DashboardEstoque {
  valorTotal: number;
  valorCusto: number;
  itensTotal: number;
  alertas: {
    estoqueBaixo: number;
    vencendo: number;
    vencidos: number;
  };
  categorias: Array<{
    categoria: string;
    quantidade: number;
    valorEstoque: number;
    percentual: number;
  }>;
  movimentacoesRecentes: Array<{
    id: string;
    tipo: string;
    produto: string;
    quantidade: number;
    motivo: string;
    usuario: string;
    data: string;
  }>;
  resumo: {
    totalProdutos: number;
    valorMedio: number;
    margemEstimada: number;
  };
}

export interface AnaliseABC {
  curvaABC: {
    A: Array<{
      produto: string;
      produtoId: string;
      valor: number;
      quantidade: number;
      percentual: number;
      percentualAcumulado: number;
      classe: 'A' | 'B' | 'C';
      categoriaAnvisa?: string;
      estoque: number;
    }>;
    B: Array<{
      produto: string;
      produtoId: string;
      valor: number;
      quantidade: number;
      percentual: number;
      percentualAcumulado: number;
      classe: 'A' | 'B' | 'C';
      categoriaAnvisa?: string;
      estoque: number;
    }>;
    C: Array<{
      produto: string;
      produtoId: string;
      valor: number;
      quantidade: number;
      percentual: number;
      percentualAcumulado: number;
      classe: 'A' | 'B' | 'C';
      categoriaAnvisa?: string;
      estoque: number;
    }>;
  };
  estatisticas: {
    totalProdutos: number;
    faturamentoTotal: number;
    distribuicao: {
      A: {
        produtos: number;
        percentualProdutos: number;
        faturamento: number;
        percentualFaturamento: number;
      };
      B: {
        produtos: number;
        percentualProdutos: number;
        faturamento: number;
        percentualFaturamento: number;
      };
      C: {
        produtos: number;
        percentualProdutos: number;
        faturamento: number;
        percentualFaturamento: number;
      };
    };
  };
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
}

export interface ControleValidade {
  alertas: {
    vencidos: number;
    vencendo: number;
  };
  lotes: {
    vencidos: Array<{
      id: string;
      produto: string;
      numeroLote: string;
      dataValidade: string;
      quantidade: number;
      valorPrejuizo: number;
      categoria?: string;
      diasVencido: number;
    }>;
    vencendoEm7Dias: Array<{
      id: string;
      produto: string;
      numeroLote: string;
      dataValidade: string;
      quantidade: number;
      valorEstimado: number;
      categoria?: string;
      diasParaVencer: number;
      periodo: string;
    }>;
    vencendoEm15Dias: Array<{
      id: string;
      produto: string;
      numeroLote: string;
      dataValidade: string;
      quantidade: number;
      valorEstimado: number;
      categoria?: string;
      diasParaVencer: number;
      periodo: string;
    }>;
    vencendoEm30Dias: Array<{
      id: string;
      produto: string;
      numeroLote: string;
      dataValidade: string;
      quantidade: number;
      valorEstimado: number;
      categoria?: string;
      diasParaVencer: number;
      periodo: string;
    }>;
  };
  produtosProximaValidade: Array<{
    id: string;
    nome: string;
    estoque: number;
    proximaValidade: string;
    diasParaVencer: number;
    numeroLote: string;
    quantidadeLote: number;
  }>;
  estatisticas: {
    vencidos: {
      total: number;
      quantidadeTotal: number;
      valorPrejuizo: number;
    };
    vencendoEm7Dias: {
      total: number;
      quantidadeTotal: number;
      valorEstimado: number;
    };
    vencendoEm30Dias: {
      total: number;
      quantidadeTotal: number;
      valorEstimado: number;
    };
  };
  cronograma: {
    proximosSete: number;
    proximosQuinze: number;
    proximosTrinta: number;
  };
}

export interface MovimentacaoEstoque {
  movimentacao: Array<{
    id: string;
    tipo: string;
    produto: string;
    categoria?: string;
    quantidade: number;
    motivo: string;
    usuario: string;
    data: string;
    venda?: {
      id: string;
      valor: number;
    };
  }>;
  resumo: {
    porTipo: Array<{
      tipo: string;
      quantidade: number;
      quantidadeTotal: number;
    }>;
    porProduto: Array<{
      produto: string;
      categoria?: string;
      totalMovimentacoes: number;
      quantidadeTotal: number;
    }>;
  };
  estatisticas: {
    totalMovimentacoes: number;
    entradas: number;
    saidas: number;
  };
  filtros: {
    dataInicio: string;
    dataFim: string;
    tipo?: string;
    produtoId?: string;
  };
}

export interface FiltrosMovimentacaoEstoque {
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
  produtoId?: string;
}

export interface AnaliseGiro {
  giroMedio: Array<{
    produto: string;
    categoria?: string;
    estoqueAtual: number;
    quantidadeVendida: number;
    giro: number;
    classificacaoGiro: 'Alto' | 'Médio' | 'Baixo';
    diasParaAcabar: number;
    valorEstoque: number;
    valorCusto: number;
    receita90Dias: number;
  }>;
  estatisticas: {
    giroAlto: number;
    giroMedio: number;
    giroBaixo: number;
    produtosSemGiro: number;
  };
  destaques: {
    maiorGiro: {
      produto: string;
      giro: number;
    } | null;
    menorGiro: {
      produto: string;
      giro: number;
    } | null;
    produtosParados: Array<{
      produto: string;
      categoria?: string;
      estoqueAtual: number;
      valorEstoque: number;
      diasParados: number;
    }>;
  };
  recomendacoes: {
    comprarMenos: Array<{
      produto: string;
      giro: number;
      diasParaAcabar: number;
    }>;
    comprarMais: Array<{
      produto: string;
      giro: number;
      diasParaAcabar: number;
    }>;
  };
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
}

export interface DashboardRelatorios {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  resumo: {
    vendas: {
      total: number;
      valor: number;
      crescimento: number;
      ticketMedio: number;
    };
    produtos: {
      maisVendidos: Array<{
        id: string;
        nome: string;
        quantidadeVendida: number;
        valorTotal: number;
      }>;
      estoqueBaixo: number;
      vencendo: number;
    };
    clientes: {
      novos: number;
      recorrentes: number;
      topCompradores: Array<{
        id: string;
        nome: string;
        totalCompras: number;
        valorTotal: number;
      }>;
    };
    financeiro: {
      receitaTotal: number;
      custoTotal: number;
      lucroOperacional: number;
      margemLucro: number;
    };
  };
  graficos: {
    vendasPorDia: Array<{ data: string; vendas: number; valor: number }>;
    produtosMaisVendidos: Array<{ produto: string; quantidade: number }>;
    categoriasMaisVendidas: Array<{ categoria: string; valor: number }>;
  };
  destaques: {
    melhorDia: {
      data: string;
      vendas: number;
      valor: number;
    };
    produtoDestaque: {
      nome: string;
      quantidade: number;
      crescimento: number;
    };
  };
  alertas: Array<{
    tipo: 'warning' | 'error' | 'info';
    titulo: string;
    mensagem: string;
  }>;
}

class RelatoriosService {
  // Dashboard principal com métricas consolidadas
  async obterDashboard(): Promise<DashboardRelatorios> {
    try {
      const response = await api.get('/relatorios/dashboard');
      return response.data as DashboardRelatorios;
    } catch (error) {
      console.error('Erro ao buscar dashboard de relatórios:', error);
      throw error;
    }
  }

  // Resumo executivo
  async obterResumoExecutivo(filtros: FiltrosRelatorio = {}): Promise<ResumoExecutivo> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/relatorios/resumo?${params.toString()}`);
      return response.data as ResumoExecutivo;
    } catch (error) {
      console.error('Erro ao buscar resumo executivo:', error);
      throw error;
    }
  }

  // Análise de vendas
  async obterAnaliseVendas(filtros: FiltrosRelatorio = {}): Promise<AnaliseVendas> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/relatorios/vendas?${params.toString()}`);
      return response.data as AnaliseVendas;
    } catch (error) {
      console.error('Erro ao buscar análise de vendas:', error);
      throw error;
    }
  }

  // Análise de estoque
  async obterAnaliseEstoque(filtros: Omit<FiltrosRelatorio, 'dataInicio' | 'dataFim' | 'vendedorId' | 'clienteId'> = {}): Promise<AnaliseEstoque> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/relatorios/estoque?${params.toString()}`);
      return response.data as AnaliseEstoque;
    } catch (error) {
      console.error('Erro ao buscar análise de estoque:', error);
      throw error;
    }
  }

  // Análise financeira
  async obterAnaliseFinanceira(filtros: Pick<FiltrosRelatorio, 'dataInicio' | 'dataFim'> = {}): Promise<AnaliseFinanceira> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/relatorios/financeiro?${params.toString()}`);
      return response.data as AnaliseFinanceira;
    } catch (error) {
      console.error('Erro ao buscar análise financeira:', error);
      throw error;
    }
  }

  // Análise de clientes
  async obterAnaliseClientes(filtros: Pick<FiltrosRelatorio, 'dataInicio' | 'dataFim'> = {}): Promise<AnaliseClientes> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/relatorios/clientes?${params.toString()}`);
      return response.data as AnaliseClientes;
    } catch (error) {
      console.error('Erro ao buscar análise de clientes:', error);
      throw error;
    }
  }

  // Exportar relatório
  async exportarRelatorio(
    tipo: 'resumo' | 'vendas' | 'estoque' | 'financeiro' | 'clientes',
    formato: 'json' | 'csv' | 'excel' | 'pdf',
    filtros: FiltrosRelatorio = {}
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/relatorios/exportar/${tipo}/${formato}?${params.toString()}`);
      
      // Se for download de arquivo, tratar adequadamente
      if (formato !== 'json') {
        // Aqui seria feito o download do arquivo
        const blob = new Blob([JSON.stringify(response.data)], {
          type: this.getMimeType(formato)
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.${formato}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      throw error;
    }
  }

  // Utilitário para obter MIME type
  private getMimeType(formato: string): string {
    const mimeTypes: Record<string, string> = {
      csv: 'text/csv',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
      json: 'application/json'
    };
    
    return mimeTypes[formato] || 'application/octet-stream';
  }

  // Utilitários para formatação
  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  formatarNumero(numero: number): string {
    return new Intl.NumberFormat('pt-BR').format(numero);
  }

  formatarPercentual(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(valor / 100);
  }

  formatarData(data: string): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(data));
  }

  // Utilitário para calcular variação percentual
  calcularVariacao(valorAtual: number, valorAnterior: number): number {
    if (valorAnterior === 0) return valorAtual > 0 ? 100 : 0;
    return ((valorAtual - valorAnterior) / valorAnterior) * 100;
  }

  // Utilitário para obter cor baseada na variação
  obterCorVariacao(variacao: number): string {
    if (variacao > 0) return 'text-green-600';
    if (variacao < 0) return 'text-red-600';
    return 'text-gray-600';
  }

  // Utilitário para obter ícone baseado na variação
  obterIconeVariacao(variacao: number): string {
    if (variacao > 0) return 'arrow-up';
    if (variacao < 0) return 'arrow-down';
    return 'minus';
  }

  // ===== MÉTODOS DE CLIENTES =====

  // Dashboard de clientes com métricas de retenção e segmentação
  async obterDashboardCliente(): Promise<any> {
    try {
      const response = await api.get('/relatorios/clientes/dashboard');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar dashboard de clientes:', error);
      throw error;
    }
  }

  // ===== MÉTODOS DE ESTOQUE =====

  // Dashboard de estoque com métricas consolidadas
  async obterDashboardEstoque(): Promise<DashboardEstoque> {
    try {
      const response = await api.get('/relatorios/estoque/dashboard');
      return response.data as DashboardEstoque;
    } catch (error) {
      console.error('Erro ao buscar dashboard de estoque:', error);
      throw error;
    }
  }

  // Análise ABC (Curva de Pareto) baseada em faturamento
  async obterAnaliseABC(): Promise<AnaliseABC> {
    try {
      const response = await api.get('/relatorios/estoque/abc');
      return response.data as AnaliseABC;
    } catch (error) {
      console.error('Erro ao buscar análise ABC:', error);
      throw error;
    }
  }

  // Controle de validade com alertas de vencimento
  async obterControleValidade(): Promise<ControleValidade> {
    try {
      const response = await api.get('/relatorios/estoque/validade');
      return response.data as ControleValidade;
    } catch (error) {
      console.error('Erro ao buscar controle de validade:', error);
      throw error;
    }
  }

  // Movimentação de estoque com filtros
  async obterMovimentacaoEstoque(filtros: FiltrosMovimentacaoEstoque = {}): Promise<MovimentacaoEstoque> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await api.get(`/relatorios/estoque/movimentacao?${params.toString()}`);
      return response.data as MovimentacaoEstoque;
    } catch (error) {
      console.error('Erro ao buscar movimentação de estoque:', error);
      throw error;
    }
  }

  // Análise de giro/rotatividade de produtos
  async obterAnaliseGiro(): Promise<AnaliseGiro> {
    try {
      const response = await api.get('/relatorios/estoque/giro');
      return response.data as AnaliseGiro;
    } catch (error) {
      console.error('Erro ao buscar análise de giro:', error);
      throw error;
    }
  }
}

export default new RelatoriosService();