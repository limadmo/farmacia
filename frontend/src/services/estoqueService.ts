import api from './api';

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'PERDA';
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
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message: string;
}

export interface ProdutoEstoqueCompleto {
  id: string;
  nome: string;
  laboratorio: string;
  principioAtivo: string;
  categoria: string;
  categoriaId: string;
  codigoBarras?: string;
  loteObrigatorio: boolean;
  classificacaoAnvisa: string;
  
  // Estoque
  estoqueTotal: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  statusEstoque: 'NORMAL' | 'BAIXO' | 'CRITICO' | 'ZERADO';
  
  // Financeiro
  custoMedioPonderado: number;
  valorTotalEstoque: number;
  precoVenda: number;
  precoCusto: number;
  margemLucro: number;
  
  // Lotes
  totalLotes: number;
  proximoVencimento?: string;
  lotesCriticos: number;
  
  // Compliance
  exigeReceita: boolean;
  tipoReceita?: string;
  retencaoReceita: boolean;
  
  // Datas
  criadoEm: string;
  atualizadoEm: string;
  
  // Detalhes dos lotes (opcional)
  lotes?: {
    id: string;
    numeroLote: string;
    quantidade: number;
    dataValidade: string;
    precoCusto: number;
    fornecedorId?: string;
  }[];
}

export interface ListProdutosEstoqueResponse {
  produtos: ProdutoEstoqueCompleto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

  async listarProdutosEstoqueBaixo(params?: {
    page?: number;
    limit?: number;
  }): Promise<ListProdutosEstoqueBaixoResponse | EstoqueResumo[]> {
    const response = await api.get('/estoque/baixo', { params });
    return response.data as ListProdutosEstoqueBaixoResponse | EstoqueResumo[];
  },

  async obterAlertasEstoque(params?: {
    page?: number;
    limit?: number;
  }): Promise<AlertaEstoque[] | { alertas: AlertaEstoque[]; pagination: any; resumo: any }> {
    const response = await api.get('/estoque/alertas', { params });
    const data = response.data;
    
    // Se tem paginação, retornar dados paginados
    if (params?.page && params?.limit) {
      const paginatedData = data as any;
      return {
        alertas: paginatedData.alertas || [],
        pagination: paginatedData.pagination,
        resumo: paginatedData.resumo
      };
    }
    
    // Se não tem paginação, processar como antes (compatibilidade)
    const alertasData = data as AlertasEstoqueResponse;
    const alertas: AlertaEstoque[] = [];
    
    // Produtos com estoque baixo
    alertasData.estoqueBaixo.forEach((produto: any) => {
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
    alertasData.estoqueCritico.forEach((produto: any) => {
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
    alertasData.estoqueZerado.forEach((produto: any) => {
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
    alertasData.proximosVencimento.forEach((produto: any) => {
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

  async listarProdutosVencimento(params?: {
    dias?: number;
    page?: number;
    limit?: number;
  }): Promise<ProdutoEstoque[] | { produtos: ProdutoEstoque[]; pagination: any; total: number; message: string }> {
    const { dias = 30, page, limit } = params || {};
    
    const response = await api.get('/estoque/produtos/vencimento', {
      params: { dias, page, limit }
    });
    const data = response.data as any;
    
    // Mapear produtos do backend para ProdutoEstoque do frontend
    const mapearProdutos = (produtos: any[]) => produtos.map((produto: any) => ({
      id: produto.id,
      nome: produto.nome,
      codigoBarras: produto.codigoBarras,
      quantidade: produto.estoque, // Backend usa 'estoque', frontend espera 'quantidade'
      estoqueMinimo: produto.estoqueMinimo || 0,
      dataVencimento: produto.dataVencimento,
      precoVenda: produto.precoVenda || 0
    })) as ProdutoEstoque[];
    
    // Se tem paginação, retornar dados paginados
    if (page && limit) {
      return {
        produtos: mapearProdutos(data.produtos || []),
        pagination: data.pagination,
        total: data.total || 0,
        message: data.message || ''
      };
    }
    
    // Se não tem paginação, retornar apenas os produtos (compatibilidade)
    return mapearProdutos(data.produtos || []);
  },

  async listarProdutosEstoque(params?: {
    page?: number;
    limit?: number;
    search?: string;
    categoria?: string;
    status?: string;
    laboratorio?: string;
    orderBy?: string;
    incluirLotes?: boolean;
  }): Promise<ListProdutosEstoqueResponse> {
    const response = await api.get('/estoque/produtos', { params });
    return response.data as ListProdutosEstoqueResponse;
  },

  async listarLotesProduto(produtoId: string) {
    try {
      const response = await api.get(`/lotes/produto/${produtoId}`);
      
      // Verificar se a resposta tem a estrutura esperada
      if (response.data && (response.data as any).success) {
        return (response.data as any).data || [];
      } else {
        return response.data || [];
      }
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
      return [];
    }
  },

  // Operações restritas (não permitidas para vendedor - apenas para admin/gerente/farmaceutico)
  async registrarMovimentacao(data: {
    produtoId: string;
    tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'PERDA';
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