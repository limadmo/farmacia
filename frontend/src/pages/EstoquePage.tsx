import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CubeIcon } from '@heroicons/react/24/outline';
import { estoqueService, ResumoEstoque, AlertaEstoque, MovimentacaoEstoque, ProdutoEstoque, EstoqueResumo, ListMovimentacoesResponse } from '../services/estoqueService';
import Permission from '../components/Permission';
import Layout from '../components/Layout';

const EstoquePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('resumo');
  const [resumo, setResumo] = useState<ResumoEstoque | null>(null);
  const [alertas, setAlertas] = useState<AlertaEstoque[]>([]);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<EstoqueResumo[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [produtosVencimento, setProdutosVencimento] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [resumoData, alertasData, estoqueBaixoData, movimentacoesData, vencimentoData] = await Promise.all([
        estoqueService.obterResumoEstoque(),
        estoqueService.obterAlertasEstoque(),
        estoqueService.listarProdutosEstoqueBaixo(),
        estoqueService.listarMovimentacoes({ limit: 10 }),
        estoqueService.listarProdutosVencimento(30)
      ]);

      setResumo(resumoData);
      setAlertas(alertasData);
      setProdutosEstoqueBaixo(estoqueBaixoData);
      setMovimentacoes((movimentacoesData as ListMovimentacoesResponse).movimentacoes || []);
      setProdutosVencimento(vencimentoData);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao carregar dados do estoque');
      console.error('Erro ao carregar estoque:', error);
    } finally {
      setLoading(false);
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
        return 'text-red-600 bg-red-100';
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

  const getTipoMovimentacaoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA':
        return 'text-green-600';
      case 'SAIDA':
        return 'text-red-600';
      case 'AJUSTE':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erro</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Estoque</h1>
          <p className="text-gray-600">
            Consulte informações sobre o estoque da farmácia
          </p>
        </div>

      {/* Cards de Resumo */}
      {resumo && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
                  <CubeIcon className="h-6 w-6 text-green-400" />
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

      {/* Tabs */}
      <div className="mt-6 bg-white shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('resumo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'resumo'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resumo
            </button>
            <button
              onClick={() => setActiveTab('estoque-baixo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'estoque-baixo'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Estoque Baixo
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'alertas'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Alertas
            </button>
            <button
              onClick={() => setActiveTab('movimentacoes')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'movimentacoes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Movimentações
            </button>
            <button
              onClick={() => setActiveTab('vencimento')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'vencimento'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Vencimento
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'estoque-baixo' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Produtos com Estoque Baixo</h3>
              {produtosEstoqueBaixo.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CubeIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Tudo em ordem!</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Nenhum produto com estoque baixo encontrado.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {produtosEstoqueBaixo.map((produto: EstoqueResumo) => (
                      <li key={produto.produtoId} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              produto.status === 'ZERADO'
                                ? 'bg-red-100 text-red-800' 
                                : produto.status === 'CRITICO'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {produto.status === 'ZERADO' ? 'ESGOTADO' : 
                               produto.status === 'CRITICO' ? 'CRÍTICO' : 'BAIXO'}
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">
                                {produto.nomeProduto}
                              </p>
                              <p className="text-sm text-gray-500">
                                Estoque: {produto.quantidade} • Mínimo: {produto.estoqueMinimo}
                                {produto.ultimaMovimentacao && ` • Última: ${new Date(produto.ultimaMovimentacao).toLocaleDateString('pt-BR')}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              Valor Total: R$ {produto.valorTotal.toFixed(2)}
                            </p>
                            <p className={`text-sm font-medium ${
                              produto.status === 'ZERADO' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {produto.status === 'ZERADO' ? 'Repor urgente' : 'Repor estoque'}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alertas' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Alertas de Estoque</h3>
              {alertas.length === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CubeIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Tudo em ordem!</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Nenhum alerta de estoque encontrado.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {alertas.map((alerta) => (
                      <li key={alerta.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTipoAlertaColor(alerta.tipo)}`}>
                              {getTipoAlertaTexto(alerta.tipo)}
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">
                                {alerta.produto.nome}
                              </p>
                              <p className="text-sm text-gray-500">
                                Quantidade: {alerta.quantidade}
                                {alerta.diasParaVencimento && ` • Vence em ${alerta.diasParaVencimento} dias`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'movimentacoes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Últimas Movimentações</h3>
              {movimentacoes.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <div className="flex">
                    <CubeIcon className="h-5 w-5 text-gray-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-800">Nenhuma movimentação</h3>
                      <div className="mt-2 text-sm text-gray-700">
                        <p>Nenhuma movimentação de estoque encontrada.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                  <ul className="divide-y divide-gray-200">
                    {movimentacoes.map((mov) => (
                      <li key={mov.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`text-sm font-medium ${getTipoMovimentacaoColor(mov.tipo)}`}>
                              {mov.tipo}
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">
                                {mov.produto.nome}
                              </p>
                              <p className="text-sm text-gray-500">
                                Quantidade: {mov.quantidade} • {mov.motivo}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">
                              {mov.usuario.nome}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(mov.dataMovimentacao).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                  <ul className="divide-y divide-gray-200">
                    {produtosVencimento.map((produto) => (
                      <li key={produto.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {produto.nome}
                            </p>
                            <p className="text-sm text-gray-500">
                              Quantidade: {produto.quantidade}
                              {produto.codigoBarras && ` • ${produto.codigoBarras}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              R$ {produto.precoVenda.toFixed(2)}
                            </p>
                            {produto.dataVencimento && (
                              <p className="text-sm text-red-600">
                                Vence: {new Date(produto.dataVencimento).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'resumo' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Informações do Estoque</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <CubeIcon className="h-5 w-5 text-blue-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Acesso Somente Leitura
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Você tem acesso para visualizar informações do estoque, mas não pode fazer movimentações.</p>
                      <Permission requiredPermission="movimentacao" requiredModule="estoque">
                        <p className="mt-1 text-green-700">Você também pode registrar movimentações de estoque.</p>
                      </Permission>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default EstoquePage;