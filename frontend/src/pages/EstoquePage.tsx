import React, { useState, useEffect, useCallback } from 'react';
import { ExclamationTriangleIcon, CubeIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { estoqueService, ResumoEstoque, AlertaEstoque, MovimentacaoEstoque, ProdutoEstoque, EstoqueResumo, ProdutoEstoqueCompleto } from '../services/estoqueService';
import Permission from '../components/Permission';
import Layout from '../components/Layout';
import MovimentacaoEstoqueModal from '../components/MovimentacaoEstoqueModal';
import DetalhesEstoqueModal from '../components/DetalhesEstoqueModal';
import Pagination from '../components/Pagination';

const EstoquePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('produtos');
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<EstoqueResumo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [produtosVencimento, setProdutosVencimento] = useState<ProdutoEstoque[]>([]);
  const [produtosEstoque, setProdutosEstoque] = useState<ProdutoEstoqueCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [produtoSelecionadoParaAjuste, setProdutoSelecionadoParaAjuste] = useState<{ id: string; nome: string } | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [produtoSelecionadoDetalhes, setProdutoSelecionadoDetalhes] = useState<ProdutoEstoqueCompleto | null>(null);
  // Filtros para produtos (similar ao ProdutosPage)
  const [filters, setFilters] = useState({
    search: '',
    categoria: '',
    status: ''
  });
  
  // Estados de paginação para cada aba
  const [paginationState, setPaginationState] = useState({
    produtos: { currentPage: 1, totalPages: 0, totalItems: 0 },
    estoqueBaixo: { currentPage: 1, totalPages: 0, totalItems: 0 },
    alertas: { currentPage: 1, totalPages: 0, totalItems: 0 },
    movimentacoes: { currentPage: 1, totalPages: 0, totalItems: 0 },
    vencimento: { currentPage: 1, totalPages: 0, totalItems: 0 }
  });
  const [itemsPerPage] = useState(20);

  // Função para carregar dados gerais (resumo, alertas, etc.) - sem dependências de busca
  const carregarDadosGerais = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar dados gerais em paralelo (sem busca de produtos)
      const [
        resumoData,
        alertasResult,
        estoqueBaixoData,
        movimentacoesData,
        vencimentoResult
      ] = await Promise.all([
        estoqueService.obterResumoEstoque(),
        estoqueService.obterAlertasEstoque({ page: paginationState.alertas?.currentPage || 1, limit: itemsPerPage }),
        estoqueService.listarProdutosEstoqueBaixo({ page: paginationState.estoqueBaixo?.currentPage || 1, limit: itemsPerPage }),
        estoqueService.listarMovimentacoes({ page: paginationState.movimentacoes?.currentPage || 1, limit: itemsPerPage }),
        estoqueService.listarProdutosVencimento({ dias: 30, page: paginationState.vencimento?.currentPage || 1, limit: itemsPerPage })
      ]);
      
      // Processar resumo
      setResumo(resumoData);
      
      // Processar alertas com paginação
      if (alertasResult && typeof alertasResult === 'object' && 'alertas' in alertasResult) {
        const alertasData = alertasResult as { alertas: AlertaEstoque[]; pagination: any; resumo: any };
        setAlertas(alertasData.alertas);
        setPaginationState(prev => ({
          ...prev,
          alertas: {
            ...prev?.alertas,
            totalPages: alertasData.pagination?.totalPages || 0,
            totalItems: alertasData.pagination?.total || 0
          }
        }));
      } else {
        const alertasArray = alertasResult as AlertaEstoque[];
        setAlertas(alertasArray);
      }
      
      // Processar produtos com estoque baixo
      if (estoqueBaixoData && typeof estoqueBaixoData === 'object' && !Array.isArray(estoqueBaixoData) && 'produtos' in estoqueBaixoData && 'pagination' in estoqueBaixoData) {
        const data = estoqueBaixoData as any;
        setProdutosEstoqueBaixo(data.produtos);
        setPaginationState(prev => ({
          ...prev,
          estoqueBaixo: {
            ...prev?.estoqueBaixo,
            totalPages: data.pagination?.totalPages || 0,
            totalItems: data.pagination?.total || 0
          }
        }));
      } else if (estoqueBaixoData && typeof estoqueBaixoData === 'object' && 'produtos' in estoqueBaixoData) {
        const data = estoqueBaixoData as any;
        const produtos = data.produtos || [];
        setProdutosEstoqueBaixo(produtos);
        const totalItems = data.total || produtos.length;
        setPaginationState(prev => ({
          ...prev,
          estoqueBaixo: {
            ...prev?.estoqueBaixo,
            totalPages: Math.ceil(totalItems / itemsPerPage),
            totalItems: totalItems
          }
        }));
      } else if (Array.isArray(estoqueBaixoData)) {
        setProdutosEstoqueBaixo(estoqueBaixoData);
        setPaginationState(prev => ({
          ...prev,
          estoqueBaixo: {
            ...prev?.estoqueBaixo,
            totalPages: 1,
            totalItems: estoqueBaixoData?.length || 0
          }
        }));
      }
      
      // Processar movimentações
      const movResult = movimentacoesData as any;
      setMovimentacoes(movResult.movimentacoes || []);
      setPaginationState(prev => ({
        ...prev,
        movimentacoes: {
          ...prev?.movimentacoes,
          totalPages: movResult.pagination?.totalPages || 0,
          totalItems: movResult.pagination?.total || 0
        }
      }));
      
      // Processar produtos próximos do vencimento
      if (vencimentoResult && typeof vencimentoResult === 'object' && 'produtos' in vencimentoResult) {
        const vencData = vencimentoResult as { produtos: ProdutoEstoque[]; pagination: any; total: number; message: string };
        setProdutosVencimento(vencData.produtos);
        setPaginationState(prev => ({
          ...prev,
          vencimento: {
            ...prev?.vencimento,
            totalPages: vencData.pagination?.totalPages || 0,
            totalItems: vencData.total || 0
          }
        }));
      } else {
        const vencArray = vencimentoResult as ProdutoEstoque[];
        setProdutosVencimento(vencArray);
        setPaginationState(prev => ({
          ...prev,
          vencimento: {
            ...prev?.vencimento,
            totalPages: 1,
            totalItems: vencArray.length
          }
        }));
      }
      
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao carregar dados do estoque');
      console.error('Erro ao carregar estoque:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função separada para carregar produtos com filtros de busca
  const carregarProdutos = async (page: number = 1, showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const produtosResult = await estoqueService.listarProdutosEstoque({ 
        page,
        limit: itemsPerPage,
        search: filters.search,
        categoria: filters.categoria,
        status: filters.status
      });
      
      // Processar produtos do estoque completo
      setProdutosEstoque(produtosResult.produtos);
      setPaginationState(prev => ({
        ...prev,
        produtos: {
          ...prev?.produtos,
          currentPage: page,
          totalPages: produtosResult.pagination?.totalPages || 0,
          totalItems: produtosResult.pagination?.total || 0
        }
      }));
      
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao carregar produtos do estoque');
      console.error('Erro ao carregar produtos:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    carregarDadosGerais();
    carregarProdutos(1, true); // Mostrar loading na carga inicial
  }, []);

  // Busca automática com debounce para produtos (apenas search)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search.length >= 2 || filters.search.length === 0) {
        carregarProdutos(1); // Reset para página 1 ao buscar, sem loading
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  // Para categoria e status, buscar imediatamente (sem debounce)
  useEffect(() => {
    carregarProdutos(1);
  }, [filters.categoria, filters.status]);

  // Função para atualizar filtros (similar ao ProdutosPage)
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMovimentacaoRegistrada = () => {
    carregarDadosGerais();
    carregarProdutos(1, true);
  };

  const handleAbrirAjuste = (produto: EstoqueResumo | ProdutoEstoqueCompleto) => {
    // Extrair informações básicas do produto dependendo do tipo
    let produtoInfo: { id: string; nome: string };
    
    if ('produtoId' in produto) {
      // EstoqueResumo
      produtoInfo = {
        id: produto.produtoId,
        nome: produto.nomeProduto
      };
    } else {
      // ProdutoEstoqueCompleto
      produtoInfo = {
        id: produto.id,
        nome: produto.nome
      };
    }
    
    setProdutoSelecionadoParaAjuste(produtoInfo);
    setShowMovimentacaoModal(true);
  };

  const handleVerDetalhes = (produto: ProdutoEstoqueCompleto) => {
    setProdutoSelecionadoDetalhes(produto);
    setShowDetalhesModal(true);
  };

  const handlePageChange = (tab: 'produtos' | 'estoqueBaixo' | 'alertas' | 'movimentacoes' | 'vencimento', page: number) => {
    setPaginationState(prev => ({
      ...prev,
      [tab]: {
        ...prev?.[tab],
        currentPage: page
      }
    }));
    
    // Se for a aba produtos, usar a função específica
    if (tab === 'produtos') {
      carregarProdutos(page);
    } else {
      // Para outras abas, usar a função geral (será implementada depois se necessário)
      carregarDadosGerais();
    }
  };

  const getTipoAlertaColor = (tipo: string) => {
    switch (tipo) {
      case 'ESTOQUE_CRITICO':
        return 'text-red-600 bg-red-100';
      case 'ESTOQUE_BAIXO':
        return 'text-yellow-600 bg-yellow-100';
      case 'VENCIMENTO_PROXIMO':
        return 'text-orange-600 bg-orange-100';
      case 'VENCIDO':
        return 'text-red-800 bg-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTipoAlertaTexto = (tipo: string) => {
    switch (tipo) {
      case 'ESTOQUE_CRITICO':
        return 'Estoque Crítico';
      case 'ESTOQUE_BAIXO':
        return 'Estoque Baixo';
      case 'VENCIMENTO_PROXIMO':
        return 'Vencimento Próximo';
      case 'VENCIDO':
        return 'Vencido';
      default:
        return tipo;
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusEstoqueColor = (status: string) => {
    switch (status) {
      case 'CRITICO':
        return 'bg-red-100 text-red-800';
      case 'BAIXO':
        return 'bg-yellow-100 text-yellow-800';
      case 'ZERADO':
        return 'bg-red-100 text-red-800';
      case 'NORMAL':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusEstoqueTexto = (status: string) => {
    switch (status) {
      case 'CRITICO':
        return 'Crítico';
      case 'BAIXO':
        return 'Baixo';
      case 'ZERADO':
        return 'Zerado';
      case 'NORMAL':
        return 'Normal';
      default:
        return status;
    }
  };

  const getTipoMovimentacaoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return 'bg-green-100 text-green-800';
      case 'SAIDA':
        return 'bg-red-100 text-red-800';
      case 'AJUSTE':
        return 'bg-blue-100 text-blue-800';
      case 'PERDA':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erro</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CubeIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Produtos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {resumo.totalProdutos}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CubeIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total de Itens
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {resumo.totalItens}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Estoque Baixo
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {resumo.produtosEstoqueBaixo}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Próximos do Vencimento
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {resumo.produtosVencimento}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navegação por Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex justify-center space-x-12 px-6 py-1" aria-label="Tabs">
              {[
                { key: 'produtos', label: 'Produtos' },
                { key: 'estoqueBaixo', label: 'Estoque Baixo' },
                { key: 'alertas', label: 'Alertas' },
                { key: 'movimentacoes', label: 'Movimentações' },
                { key: 'vencimento', label: 'Vencimento' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'estoqueBaixo' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Produtos com Estoque Baixo</h3>
                  <Permission requiredPermission="movimentacao" requiredModule="estoque">
                    <button
                      onClick={() => setShowMovimentacaoModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Acerto
                    </button>
                  </Permission>
                </div>
                {produtosEstoqueBaixo.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <CubeIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Estoque em dia!</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Nenhum produto com estoque baixo no momento.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Atual
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Mínimo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Máximo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor Total
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {produtosEstoqueBaixo.map((produto) => (
                          <tr key={produto.produtoId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-72">
                                {produto.nomeProduto}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                produto.status === 'CRITICO' ? 'bg-red-100 text-red-800' :
                                produto.status === 'BAIXO' ? 'bg-yellow-100 text-yellow-800' :
                                produto.status === 'ZERADO' ? 'bg-red-100 text-red-800' :
                                produto.status === 'EXCESSO' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {produto.status === 'CRITICO' ? 'Crítico' :
                                 produto.status === 'BAIXO' ? 'Baixo' :
                                 produto.status === 'ZERADO' ? 'Zerado' :
                                 produto.status === 'EXCESSO' ? 'Excesso' :
                                 produto.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {produto.quantidade}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {produto.estoqueMinimo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {produto.estoqueMaximo || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              R$ {produto.valorTotal.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Permission requiredPermission="movimentacao" requiredModule="estoque">
                                <button
                                  onClick={() => handleAbrirAjuste(produto)}
                                  className={`inline-flex items-center px-3 py-1 border border-transparent rounded-md text-xs font-medium text-white transition-colors duration-200 ${
                                    produto.status === 'ZERADO' 
                                      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                                >
                                  Acerto
                                </button>
                              </Permission>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Paginação usando componente */}
                <Pagination
                  currentPage={paginationState.estoqueBaixo?.currentPage || 1}
                  totalPages={paginationState.estoqueBaixo?.totalPages || 0}
                  totalItems={paginationState.estoqueBaixo?.totalItems || 0}
                  onPageChange={(page) => handlePageChange('estoqueBaixo', page)}
                  loading={loading}
                />
              </div>
            )}

            {activeTab === 'alertas' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Alertas do Estoque</h3>
                {alertas.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <CubeIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Nenhum alerta!</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Não há alertas de estoque no momento.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo Alerta
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qtd
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Est. Mín
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Est. Máx
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vencimento
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {alertas.map((alerta) => (
                          <tr key={alerta.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-72">
                                {alerta.produto.nome}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTipoAlertaColor(alerta.tipo)}`}>
                                {getTipoAlertaTexto(alerta.tipo)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {alerta.quantidade}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {alerta.produto.estoqueMinimo}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {alerta.dataVencimento ? (
                                <div>
                                  <div>{formatarData(alerta.dataVencimento)}</div>
                                  {alerta.diasParaVencimento !== undefined && (
                                    <div className="text-xs">
                                      {alerta.diasParaVencimento > 0 
                                        ? <span className="text-orange-600 font-medium">{alerta.diasParaVencimento} dias</span>
                                        : <span className="text-red-600 font-medium">Vencido</span>
                                      }
                                    </div>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs text-gray-400">
                              #{alerta.id.substring(0, 8)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Paginação usando componente */}
                <Pagination
                  currentPage={paginationState.alertas?.currentPage || 1}
                  totalPages={paginationState.alertas?.totalPages || 0}
                  totalItems={paginationState.alertas?.totalItems || 0}
                  onPageChange={(page) => handlePageChange('alertas', page)}
                  loading={loading}
                />
              </div>
            )}

            {activeTab === 'movimentacoes' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Movimentações Recentes</h3>
                {movimentacoes.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex">
                      <CubeIcon className="h-5 w-5 text-gray-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-800">Nenhuma movimentação</h3>
                        <div className="mt-2 text-sm text-gray-700">
                          <p>Não há movimentações registradas.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qtd
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Motivo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuário
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {movimentacoes.map((movimentacao) => (
                          <tr key={movimentacao.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-72">
                                {movimentacao.produto.nome}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTipoMovimentacaoColor(movimentacao.tipo)}`}>
                                {movimentacao.tipo}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {movimentacao.quantidade}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="truncate max-w-48">
                                {movimentacao.motivo}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {movimentacao.usuario.nome}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-400">
                              {formatarData(movimentacao.dataMovimentacao)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Paginação usando componente */}
                <Pagination
                  currentPage={paginationState.movimentacoes?.currentPage || 1}
                  totalPages={paginationState.movimentacoes?.totalPages || 0}
                  totalItems={paginationState.movimentacoes?.totalItems || 0}
                  onPageChange={(page) => handlePageChange('movimentacoes', page)}
                  loading={loading}
                />
              </div>
            )}

            {activeTab === 'vencimento' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Produtos Próximos do Vencimento</h3>
                {produtosVencimento.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <CubeIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Tudo em dia!</h3>
                        <div className="mt-2 text-sm text-green-700">
                          <p>Nenhum produto próximo do vencimento.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estoque
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Est. Mín
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Est. Máx
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Vencimento
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Preço
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {produtosVencimento.map((produto) => (
                          <tr key={produto.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 truncate max-w-72">
                                {produto.nome}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="truncate max-w-32">
                                {produto.codigoBarras || '-'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {produto.quantidade}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {produto.estoqueMinimo || 0}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              -
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                                {produto.dataVencimento ? formatarData(produto.dataVencimento) : 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              R$ {produto.precoVenda.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Paginação usando componente */}
                <Pagination
                  currentPage={paginationState.vencimento?.currentPage || 1}
                  totalPages={paginationState.vencimento?.totalPages || 0}
                  totalItems={paginationState.vencimento?.totalItems || 0}
                  onPageChange={(page) => handlePageChange('vencimento', page)}
                  loading={loading}
                />
              </div>
            )}

            {activeTab === 'produtos' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Produtos em Estoque</h3>
                  <Permission requiredPermission="movimentacao" requiredModule="estoque">
                    <button
                      onClick={() => setShowMovimentacaoModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Nova Movimentação
                    </button>
                  </Permission>
                </div>
                
                {/* Filtros */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Buscar Produto
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="search"
                          placeholder="Buscar por nome, código ou princípio ativo..."
                          value={filters.search}
                          onChange={handleFilterChange}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Categoria
                      </label>
                      <select
                        name="categoria"
                        value={filters.categoria}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Todas as categorias</option>
                        {/* Categorias serão carregadas dinamicamente */}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status do Estoque
                      </label>
                      <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Todos os status</option>
                        <option value="NORMAL">Normal</option>
                        <option value="BAIXO">Estoque Baixo</option>
                        <option value="CRITICO">Crítico</option>
                        <option value="ZERADO">Zerado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {produtosEstoque.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex">
                      <CubeIcon className="h-5 w-5 text-gray-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-800">Nenhum produto encontrado</h3>
                        <div className="mt-2 text-sm text-gray-700">
                          <p>Não há produtos que atendam aos filtros selecionados.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Produto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Laboratório
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoria
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estoque
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Custo Médio
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Preço Venda
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor Total
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lotes
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Controle de Lote
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {produtosEstoque.map((produto) => (
                          <tr key={produto.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-900 truncate max-w-64">
                                  {produto.nome}
                                </div>
                                {produto.principioAtivo && (
                                  <div className="text-xs text-gray-500 truncate max-w-64">
                                    {produto.principioAtivo}
                                  </div>
                                )}
                                {produto.codigoBarras && (
                                  <div className="text-xs text-gray-400 font-mono">
                                    {produto.codigoBarras}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {produto.laboratorio}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {produto.categoria}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium text-gray-900 mr-2">
                                    {produto.estoqueTotal}
                                  </span>
                                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusEstoqueColor(produto.statusEstoque)}`}>
                                    {getStatusEstoqueTexto(produto.statusEstoque)}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Min: {produto.estoqueMinimo} {produto.estoqueMaximo ? `| Max: ${produto.estoqueMaximo}` : ''}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatarMoeda(produto.custoMedioPonderado)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="text-sm font-medium text-gray-900">
                                  {formatarMoeda(produto.precoVenda)}
                                </div>
                                <div className={`text-xs ${produto.margemLucro > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {produto.margemLucro.toFixed(1)}% margem
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatarMoeda(produto.valorTotalEstoque)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <span className="text-sm text-gray-900 mr-1">{produto.totalLotes}</span>
                                  <span className="text-xs text-gray-500">lotes</span>
                                  {produto.lotesCriticos > 0 && (
                                    <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 ml-1" title={`${produto.lotesCriticos} lotes vencendo em 30 dias`} />
                                  )}
                                </div>
                                {produto.proximoVencimento && (
                                  <div className="text-xs text-orange-600">
                                    Próximo: {formatarData(produto.proximoVencimento)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {produto.loteObrigatorio ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Manual
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                  </svg>
                                  FEFO
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleVerDetalhes(produto)}
                                  className="text-blue-600 hover:text-blue-900 text-xs font-medium"
                                  title="Ver detalhes"
                                >
                                  Detalhes
                                </button>
                                <Permission requiredPermission="movimentacao" requiredModule="estoque">
                                  <button
                                    onClick={() => handleAbrirAjuste(produto)}
                                    className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                                  >
                                    Acerto
                                  </button>
                                </Permission>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Paginação */}
                <Pagination
                  currentPage={paginationState.produtos?.currentPage || 1}
                  totalPages={paginationState.produtos?.totalPages || 0}
                  totalItems={paginationState.produtos?.totalItems || 0}
                  onPageChange={(page) => handlePageChange('produtos', page)}
                  loading={loading}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Movimentação */}
      <MovimentacaoEstoqueModal
        isOpen={showMovimentacaoModal}
        onClose={() => {
          setShowMovimentacaoModal(false);
          setProdutoSelecionadoParaAjuste(null);
        }}
        onMovimentacaoRegistrada={handleMovimentacaoRegistrada}
        produtoInicial={produtoSelecionadoParaAjuste}
      />

      {/* Modal de Detalhes */}
      <DetalhesEstoqueModal
        isOpen={showDetalhesModal}
        onClose={() => {
          setShowDetalhesModal(false);
          setProdutoSelecionadoDetalhes(null);
        }}
        produto={produtoSelecionadoDetalhes}
      />
    </Layout>
  );
};

export default EstoquePage;