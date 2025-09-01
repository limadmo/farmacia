import api from './api';

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
  quantidade: number;
  motivo: string;
  usuarioId: string;
  dataMovimentacao: string;
  sincronizado: boolean;
  observacoes?: string;
  produto: {
    nome: string;
    codigoBarras?: string;
  };
  usuario: {
    nome: string;
  };
}

export interface ResumoEstoque {
  totalProdutos: number;
  totalItens: number;
  produtosEstoqueBaixo: number;
  produtosVencimento: number;
}

export interface AlertaEstoque {
  id: string;
  tipo: 'ESTOQUE_BAIXO' | 'ESTOQUE_CRITICO' | 'VENCIMENTO_PROXIMO' | 'VENCIDO';
  produtoId: string;
  quantidade: number;
  dataVencimento?: string;
  diasParaVencimento?: number;
  produto: {
    nome: string;
    estoqueMinimo: number;
  };
}

export interface AlertasEstoqueResponse {
  total: number;
  estoqueBaixo: any[];
  estoqueCritico: any[];
  estoqueZerado: any[];
  proximosVencimento: any[];
  resumo: {
    totalAlertas: number;
    estoqueBaixo: number;
    estoqueCritico: number;
    estoqueZerado: number;
    proximosVencimento: number;
  };
}

export interface ProdutoEstoque {
  id: string;
  nome: string;
  codigoBarras?: string;
  quantidade: number;
  estoqueMinimo: number;
  dataVencimento?: string;
  precoVenda: number;
}

export interface EstoqueResumo {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  valorTotal: number;
  ultimaMovimentacao?: string;
  status: 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERADO' | 'EXCESSO';
}

export interface ListMovimentacoesResponse {
  movimentacoes: MovimentacaoEstoque[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListProdutosEstoqueBaixoResponse {
  produtos: EstoqueResumo[];
  total: number;
  message: string;
}

export const estoqueService = {
  // Visualização (permitido para vendedor)
  async listarMovimentacoes(params?: {
    page?: number;
    limit?: number;
    produtoId?: string;
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<ListMovimentacoesResponse> {
    const response = await api.get('/estoque/movimentacoes', { params });
    return response.data as ListMovimentacoesResponse;
  },

  async obterResumoEstoque(): Promise<ResumoEstoque> {
    const response = await api.get('/estoque/resumo');
    const data = response.data as any;
    
    // Backend retorna { resumo, total, estatisticas }  
    // Extrair dados das estatísticas para criar ResumoEstoque
    return {
      totalProdutos: data.estatisticas?.totalProdutos || 0,
      totalItens: data.estatisticas?.totalItens || 0,
      produtosEstoqueBaixo: data.estatisticas?.produtosEstoqueBaixo || 0,
      produtosVencimento: data.estatisticas?.produtosVencimento || 0
    } as ResumoEstoque;
  },

  async listarProdutosEstoqueBaixo(): Promise<EstoqueResumo[]> {
    const response = await api.get('/estoque/baixo');
    // O backend retorna { produtos: [...], total: number, message: string }
    const data = response.data as ListProdutosEstoqueBaixoResponse;
    return data.produtos || [];
  },

  async obterAlertasEstoque(): Promise<AlertaEstoque[]> {
    const response = await api.get('/estoque/alertas');
    const data = response.data as AlertasEstoqueResponse;
    
    // Converter os dados categorizados em um array unificado de alertas
    const alertas: AlertaEstoque[] = [];
    
    // Produtos com estoque baixo
    data.estoqueBaixo.forEach((produto: any) => {
      alertas.push({
        id: `baixo_${produto.id}`,
        tipo: 'ESTOQUE_BAIXO',
        produtoId: produto.id,
        quantidade: produto.estoque,
        produto: {
          nome: produto.nome,
          estoqueMinimo: produto.estoqueMinimo || 0
        }
      });
    });
    
    // Produtos com estoque crítico
    data.estoqueCritico.forEach((produto: any) => {
      alertas.push({
        id: `critico_${produto.id}`,
        tipo: 'ESTOQUE_CRITICO',
        produtoId: produto.id,
        quantidade: produto.estoque,
        produto: {
          nome: produto.nome,
          estoqueMinimo: produto.estoqueMinimo || 0
        }
      });
    });
    
    // Produtos esgotados
    data.estoqueZerado.forEach((produto: any) => {
      alertas.push({
        id: `zerado_${produto.id}`,
        tipo: 'ESTOQUE_CRITICO',
        produtoId: produto.id,
        quantidade: produto.estoque,
        produto: {
          nome: produto.nome,
          estoqueMinimo: produto.estoqueMinimo || 0
        }
      });
    });
    
    // Produtos próximos do vencimento
    data.proximosVencimento.forEach((produto: any) => {
      const dataVenc = new Date(produto.dataVencimento);
      const hoje = new Date();
      const diasParaVencimento = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      
      alertas.push({
        id: `vencimento_${produto.id}`,
        tipo: diasParaVencimento <= 0 ? 'VENCIDO' : 'VENCIMENTO_PROXIMO',
        produtoId: produto.id,
        quantidade: produto.estoque,
        dataVencimento: produto.dataVencimento,
        diasParaVencimento: diasParaVencimento,
        produto: {
          nome: produto.nome,
          estoqueMinimo: produto.estoqueMinimo || 0
        }
      });
    });
    
    return alertas;
  },

  async listarProdutosVencimento(dias: number = 30): Promise<ProdutoEstoque[]> {
    const response = await api.get('/estoque/produtos/vencimento', {
      params: { dias }
    });
    const data = response.data as any;
    
    // Backend retorna { produtos, total, diasVencimento, message }
    // Mapear produtos do backend para ProdutoEstoque do frontend
    const produtos = data.produtos || [];
    return produtos.map((produto: any) => ({
      id: produto.id,
      nome: produto.nome,
      codigoBarras: produto.codigoBarras,
      quantidade: produto.estoque, // Backend usa 'estoque', frontend espera 'quantidade'
      estoqueMinimo: produto.estoqueMinimo || 0,
      dataVencimento: produto.dataVencimento,
      precoVenda: produto.precoVenda || 0
    })) as ProdutoEstoque[];
  },

  // Operações restritas (não permitidas para vendedor - apenas para admin/gerente/farmaceutico)
  async registrarMovimentacao(data: {
    produtoId: string;
    tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
    quantidade: number;
    motivo: string;
    observacoes?: string;
  }) {
    const response = await api.post('/estoque/movimentacoes', data);
    return response.data;
  },

  async obterDashboardEstoque() {
    const response = await api.get('/estoque/dashboard');
    return response.data;
  },

  async gerarRelatorioMovimentacoes(params: {
    dataInicio: string;
    dataFim: string;
    tipo?: string;
    produtoId?: string;
  }) {
    const response = await api.get('/estoque/relatorio', { params });
    return response.data;
  }
};