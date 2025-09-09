// Página de Relatórios Gerenciais
// Interface para análise e visualização de dados da farmácia (apenas administradores)

import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Permission from '../components/Permission';
import relatoriosService, { DashboardRelatorios, FiltrosRelatorio } from '../services/relatoriosService';
import EstoqueDashboard from '../components/relatorios/EstoqueDashboard';
import ClienteDashboard from '../components/relatorios/ClienteDashboard';
import { 
  ChartBarIcon, 
  DocumentArrowDownIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface RelatorioTab {
  id: string;
  nome: string;
  icone: React.ComponentType<any>;
  permissao: string;
  modulo: string;
}

const RelatoriosPage: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardRelatorios | null>(null);
  const [dadosVendas, setDadosVendas] = useState<any>(null);
  const [dadosFinanceiros, setDadosFinanceiros] = useState<any>(null);
  const [abaSelecionada, setAbaSelecionada] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({});

  // Configuração das abas
  const abas: RelatorioTab[] = [
    {
      id: 'dashboard',
      nome: 'Dashboard',
      icone: ChartBarIcon,
      permissao: 'visualizar',
      modulo: 'relatorios'
    },
    {
      id: 'vendas',
      nome: 'Vendas',
      icone: ShoppingCartIcon,
      permissao: 'visualizar',
      modulo: 'relatorios'
    },
    {
      id: 'financeiro',
      nome: 'Financeiro',
      icone: CurrencyDollarIcon,
      permissao: 'visualizar',
      modulo: 'relatorios'
    },
    {
      id: 'estoque',
      nome: 'Estoque',
      icone: CubeIcon,
      permissao: 'visualizar',
      modulo: 'relatorios'
    },
    {
      id: 'clientes',
      nome: 'Clientes',
      icone: UserGroupIcon,
      permissao: 'visualizar',
      modulo: 'relatorios'
    }
  ];

  // Carregar dashboard inicial
  useEffect(() => {
    carregarDashboard();
  }, []);

  // Carregar dados de vendas quando selecionada
  useEffect(() => {
    if (abaSelecionada === 'vendas' && !dadosVendas) {
      carregarDadosVendas();
    }
    if (abaSelecionada === 'financeiro' && !dadosFinanceiros) {
      carregarDadosFinanceiros();
    }
  }, [abaSelecionada]);

  const carregarDashboard = async () => {
    try {
      setLoading(true);
      setErro(null);
      const dados = await relatoriosService.obterDashboard();
      setDashboard(dados);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      setErro('Erro ao carregar dados dos relatórios');
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosVendas = async () => {
    try {
      setLoading(true);
      setErro(null);
      const dados = await relatoriosService.obterAnaliseVendas();
      setDadosVendas(dados);
    } catch (error) {
      console.error('Erro ao carregar dados de vendas:', error);
      setErro('Erro ao carregar análise de vendas');
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosFinanceiros = async () => {
    try {
      setLoading(true);
      setErro(null);
      const dados = await relatoriosService.obterAnaliseFinanceira();
      setDadosFinanceiros(dados);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      setErro('Erro ao carregar análise financeira');
    } finally {
      setLoading(false);
    }
  };

  const handleExportarRelatorio = async (tipo: string, formato: string) => {
    try {
      await relatoriosService.exportarRelatorio(
        tipo as any,
        formato as any,
        filtros
      );
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      setErro('Erro ao exportar relatório');
    }
  };

  const renderCardMetrica = (
    titulo: string,
    valor: string | number,
    variacao?: number,
    icone?: React.ComponentType<any>,
    tipo: 'moeda' | 'numero' | 'percentual' = 'numero'
  ) => {
    const IconeComponente = icone || InformationCircleIcon;
    
    let valorFormatado: string;
    if (tipo === 'moeda') {
      valorFormatado = relatoriosService.formatarMoeda(Number(valor));
    } else if (tipo === 'percentual') {
      valorFormatado = relatoriosService.formatarPercentual(Number(valor));
    } else {
      valorFormatado = relatoriosService.formatarNumero(Number(valor));
    }

    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <IconeComponente className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {titulo}
                </dt>
                <dd className="flex items-baseline">
                  <div className="text-2xl font-semibold text-gray-900">
                    {valorFormatado}
                  </div>
                  {variacao !== undefined && (
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                      relatoriosService.obterCorVariacao(variacao)
                    }`}>
                      {variacao > 0 ? (
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      ) : variacao < 0 ? (
                        <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                      ) : null}
                      {relatoriosService.formatarPercentual(Math.abs(variacao))}
                    </div>
                  )}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    if (!dashboard) return null;

    return (
      <div className="space-y-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {renderCardMetrica(
            'Receita Total',
            dashboard.resumo.financeiro.receitaTotal,
            undefined,
            CurrencyDollarIcon,
            'moeda'
          )}
          {renderCardMetrica(
            'Total de Vendas',
            dashboard.resumo.vendas.total,
            dashboard.resumo.vendas.crescimento,
            ShoppingCartIcon
          )}
          {renderCardMetrica(
            'Ticket Médio',
            dashboard.resumo.vendas.ticketMedio,
            undefined,
            ChartBarIcon,
            'moeda'
          )}
          {renderCardMetrica(
            'Margem de Lucro',
            dashboard.resumo.financeiro.margemLucro,
            undefined,
            ArrowTrendingUpIcon,
            'percentual'
          )}
        </div>

        {/* Alertas */}
        {dashboard.alertas.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Alertas Importantes</h3>
                <div className="mt-2 text-sm text-yellow-700 space-y-1">
                  {dashboard.alertas.map((alerta, index) => (
                    <p key={index}>• {alerta.mensagem}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráficos e Análises */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendas por Período */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Vendas - Últimos 7 Dias
              </h3>
              <div className="space-y-3">
                {dashboard.graficos.vendasPorDia.slice(-7).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {relatoriosService.formatarData(item.data)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {item.vendas} vendas
                      </span>
                      <span className="text-sm text-gray-500">
                        {relatoriosService.formatarMoeda(item.valor)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Categorias */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Top 5 Categorias
              </h3>
              <div className="space-y-3">
                {dashboard.graficos.categoriasMaisVendidas.length > 0 ? (
                  dashboard.graficos.categoriasMaisVendidas.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{item.categoria}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">
                          {relatoriosService.formatarMoeda(item.valor)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Dados de categorias em desenvolvimento
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Produtos e Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produtos Mais Vendidos */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Produtos Mais Vendidos
              </h3>
              <div className="space-y-3">
                {dashboard.resumo.produtos.maisVendidos.map((produto, index) => (
                  <div key={produto.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-gray-600 truncate">
                        {produto.nome}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {produto.quantidadeVendida}
                      </span>
                      <span className="text-sm text-gray-500">
                        {relatoriosService.formatarMoeda(produto.valorTotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Clientes */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Top Clientes
              </h3>
              <div className="space-y-3">
                {dashboard.resumo.clientes.topCompradores.map((cliente, index) => (
                  <div key={cliente.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-gray-600 truncate">
                        {cliente.nome}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {cliente.totalCompras} compras
                      </span>
                      <span className="text-sm text-gray-500">
                        {relatoriosService.formatarMoeda(cliente.valorTotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVendas = () => {
    if (!dadosVendas) return <div className="text-center py-8 text-gray-500">Carregando dados de vendas...</div>;
    
    // Calcular métricas básicas
    const totalVendas = dadosVendas.porPeriodo?.reduce((sum: number, item: any) => sum + item.vendas, 0) || 0;
    const receitaTotal = dadosVendas.porPeriodo?.reduce((sum: number, item: any) => sum + item.valor, 0) || 0;
    const ticketMedio = totalVendas > 0 ? receitaTotal / totalVendas : 0;

    return (
      <div className="space-y-6">
        {/* Métricas de Vendas */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {renderCardMetrica(
            'Vendas do Período',
            totalVendas.toString(),
            8.5,
            ShoppingCartIcon
          )}
          {renderCardMetrica(
            'Receita Total',
            receitaTotal,
            12.3,
            CurrencyDollarIcon,
            'moeda'
          )}
          {renderCardMetrica(
            'Ticket Médio',
            ticketMedio,
            -2.1,
            ChartBarIcon,
            'moeda'
          )}
          {renderCardMetrica(
            'Conversão',
            85.2,
            5.8,
            ArrowTrendingUpIcon,
            'percentual'
          )}
        </div>

        {/* Vendas por Período e Vendedores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vendas Diárias */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Vendas dos Últimos 30 Dias
              </h3>
              <div className="space-y-3">
                {dadosVendas.porPeriodo?.slice(-7).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {relatoriosService.formatarData(item.data)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {item.vendas} vendas
                      </span>
                      <span className="text-sm text-gray-500">
                        {relatoriosService.formatarMoeda(item.valor)}
                      </span>
                    </div>
                  </div>
                )) || <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>}
              </div>
            </div>
          </div>

          {/* Top Vendedores */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Top Vendedores
              </h3>
              <div className="space-y-3">
                {dadosVendas.porVendedor?.slice(0, 5).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-sm text-gray-600">{item.vendedor}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {item.vendas} vendas
                      </span>
                      <span className="text-sm text-gray-500">
                        {relatoriosService.formatarMoeda(item.valor)}
                      </span>
                    </div>
                  </div>
                )) || <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Categorias e Formas de Pagamento */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categorias Mais Vendidas */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Categorias Mais Vendidas
              </h3>
              <div className="space-y-3">
                {dadosVendas.porCategoria?.slice(0, 6).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.categoria}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {item.percentual}%
                      </span>
                      <span className="text-sm text-gray-500">
                        {relatoriosService.formatarMoeda(item.valor)}
                      </span>
                    </div>
                  </div>
                )) || <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>}
              </div>
            </div>
          </div>

          {/* Formas de Pagamento */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Formas de Pagamento
              </h3>
              <div className="space-y-3">
                {dadosVendas.porFormaPagamento?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.formaPagamento}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {item.percentual}%
                      </span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(item.percentual, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )) || <p className="text-sm text-gray-500 text-center py-4">Nenhum dado disponível</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinanceiro = () => {
    if (!dadosFinanceiros) return <div className="text-center py-8 text-gray-500">Carregando dados financeiros...</div>;

    return (
      <div className="space-y-6">
        {/* Cards de Métricas Financeiras */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderCardMetrica(
            'Receita Total',
            dadosFinanceiros.dre.receita || 0,
            undefined,
            CurrencyDollarIcon,
            'moeda'
          )}
          {renderCardMetrica(
            'Custos',
            dadosFinanceiros.dre.custos || 0,
            undefined,
            CubeIcon,
            'moeda'
          )}
          {renderCardMetrica(
            'Lucro Operacional',
            dadosFinanceiros.dre.lucroOperacional || 0,
            undefined,
            ArrowTrendingUpIcon,
            'moeda'
          )}
          {renderCardMetrica(
            'Margem Bruta',
            dadosFinanceiros.dre.margemBruta || 0,
            undefined,
            ChartBarIcon,
            'percentual'
          )}
        </div>

        {/* Seção DRE */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Demonstração do Resultado do Exercício (DRE)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">Receita Bruta</span>
              <span className="text-lg font-bold text-green-600">
                {relatoriosService.formatarMoeda(dadosFinanceiros.dre.receita || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">(-) Custos das Mercadorias</span>
              <span className="text-lg font-bold text-red-600">
                {relatoriosService.formatarMoeda(dadosFinanceiros.dre.custos || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded border-2 border-blue-200">
              <span className="font-bold text-gray-900">Lucro Bruto</span>
              <span className="text-xl font-bold text-blue-600">
                {relatoriosService.formatarMoeda(dadosFinanceiros.dre.lucroOperacional || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">Margem Bruta</span>
              <span className="text-lg font-bold text-purple-600">
                {relatoriosService.formatarPercentual(dadosFinanceiros.dre.margemBruta || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Contas a Receber */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contas a Receber
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total a Receber</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {relatoriosService.formatarMoeda(dadosFinanceiros.contasReceber.total || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Vencidas</p>
                  <p className="text-2xl font-bold text-red-800">
                    {relatoriosService.formatarMoeda(dadosFinanceiros.contasReceber.vencidas || 0)}
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">A Vencer</p>
                  <p className="text-2xl font-bold text-green-800">
                    {relatoriosService.formatarMoeda(dadosFinanceiros.contasReceber.aVencer || 0)}
                  </p>
                </div>
                <InformationCircleIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Fluxo de Caixa Resumido */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Fluxo de Caixa (Últimos 10 dias)
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entradas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saídas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dadosFinanceiros.fluxoCaixa?.slice(-10).map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                      {relatoriosService.formatarMoeda(item.entradas || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                      {relatoriosService.formatarMoeda(item.saidas || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                      {relatoriosService.formatarMoeda(item.saldo || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderConteudoAba = () => {
    switch (abaSelecionada) {
      case 'dashboard':
        return renderDashboard();
      case 'vendas':
        return renderVendas();
      case 'financeiro':
        return renderFinanceiro();
      case 'estoque':
        return <EstoqueDashboard className="space-y-6" />;
      case 'clientes':
        return <ClienteDashboard className="space-y-6" />;
      default:
        return renderDashboard();
    }
  };

  return (
    <Permission requiredModule="relatorios" requiredPermission="visualizar">
      <Layout>
        <div className="p-6">
          {/* Cards de resumo diretos */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Relatórios Gerenciais
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExportarRelatorio('resumo', 'pdf')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </button>
                  <button
                    onClick={() => handleExportarRelatorio('resumo', 'excel')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </button>
                </div>
              </div>

              {/* Abas */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {abas.map((aba) => {
                    const IconeAba = aba.icone;
                    const isActive = abaSelecionada === aba.id;
                    
                    return (
                      <button
                        key={aba.id}
                        onClick={() => setAbaSelecionada(aba.id)}
                        className={`${
                          isActive
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                      >
                        <IconeAba className="h-4 w-4" />
                        <span>{aba.nome}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Conteúdo da aba */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-500">Carregando dados...</p>
                </div>
              ) : erro ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Erro</h3>
                      <p className="text-sm text-red-700 mt-1">{erro}</p>
                      <button
                        onClick={carregarDashboard}
                        className="mt-2 text-sm text-red-600 hover:text-red-500"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                renderConteudoAba()
              )}
            </div>
          </div>
        </div>
      </Layout>
    </Permission>
  );
};

export default RelatoriosPage;