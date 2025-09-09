// Dashboard de Clientes - Análise detalhada de base, retenção e segmentação
// Métricas avançadas baseadas nos dados reais do banco de dados

import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  UserPlusIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import relatoriosService from '../../services/relatoriosService';

// Interface baseada no backend RelatoriosService
interface DashboardCliente {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  metricas: {
    totalClientes: number;
    novosClientes: number;
    clientesRecorrentes: number;
    clientesAtivos: number;
    crescimentoBase: number;
    ticketMedio: number;
    frequenciaCompra: number;
    taxaRetencao: number;
  };
  segmentacao: {
    A: {
      quantidade: number;
      percentual: number;
      valorMedio: number;
      contribuicaoReceita: number;
    };
    B: {
      quantidade: number;
      percentual: number;
      valorMedio: number;
      contribuicaoReceita: number;
    };
    C: {
      quantidade: number;
      percentual: number;
      valorMedio: number;
      contribuicaoReceita: number;
    };
  };
  topClientes: Array<{
    id: string;
    nome: string;
    valorTotal: number;
    totalCompras: number;
    ultimaCompra: string;
    ticketMedio: number;
  }>;
  tendencias: Array<{
    mes: string;
    novosClientes: number;
    clientesAtivos: number;
    vendas: number;
    receita: number;
    ticketMedio: number;
  }>;
  alertas: Array<{
    tipo: 'critico' | 'atencao' | 'info';
    titulo: string;
    descricao: string;
    impacto: 'alto' | 'medio' | 'baixo';
  }>;
  ultimaAtualizacao: string;
}

interface ClienteDashboardProps {
  className?: string;
}

const ClienteDashboard: React.FC<ClienteDashboardProps> = ({ className = '' }) => {
  const [dashboard, setDashboard] = useState<DashboardCliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do dashboard de clientes
  useEffect(() => {
    const carregarDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const dados = await relatoriosService.obterDashboardCliente();
        setDashboard(dados);
      } catch (error) {
        console.error('Erro ao carregar dashboard de clientes:', error);
        setError('Erro ao carregar dados de clientes. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    carregarDashboard();
  }, []);

  // Função para formatação de moeda
  const formatarMoeda = (valor: number): string => {
    return relatoriosService.formatarMoeda(valor);
  };

  // Função para formatação de percentual
  const formatarPercentual = (valor: number): string => {
    return relatoriosService.formatarPercentual(valor);
  };

  // Função para determinar cor do crescimento
  const obterCorCrescimento = (valor: number): string => {
    if (valor > 10) return 'text-green-600';
    if (valor > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Função para determinar cor do alerta
  const obterCorAlerta = (tipo: 'critico' | 'atencao' | 'info'): string => {
    switch (tipo) {
      case 'critico': return 'bg-red-50 text-red-800 border-red-200';
      case 'atencao': return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-50 text-blue-800 border-blue-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-500">Carregando dados de clientes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Erro no Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-gray-500">Nenhum dado disponível</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Clientes */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Clientes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboard.metricas.totalClientes.toLocaleString('pt-BR')}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm text-gray-500">
                {dashboard.metricas.clientesAtivos} ativos nos últimos 90 dias
              </div>
            </div>
          </div>
        </div>

        {/* Novos Clientes */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserPlusIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Novos Clientes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboard.metricas.novosClientes}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm text-gray-500">
                Este mês
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ticket Médio
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatarMoeda(dashboard.metricas.ticketMedio)}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-sm ${obterCorCrescimento(dashboard.metricas.crescimentoBase)}`}>
                {dashboard.metricas.crescimentoBase > 0 ? '+' : ''}{formatarPercentual(dashboard.metricas.crescimentoBase)} vs mês anterior
              </div>
            </div>
          </div>
        </div>

        {/* Taxa de Retenção */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Taxa de Retenção
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatarPercentual(dashboard.metricas.taxaRetencao)}
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-sm text-gray-500">
                {dashboard.metricas.clientesRecorrentes} clientes recorrentes
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segmentação ABC */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Segmentação de Clientes (ABC)
            </h3>
            
            <div className="space-y-4">
              {/* Segmento A */}
              <div className="border-l-4 border-green-400 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-green-800">Segmento A - Premium</h4>
                    <p className="text-sm text-gray-600">
                      {dashboard.segmentacao.A.quantidade} clientes ({formatarPercentual(dashboard.segmentacao.A.percentual)})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {formatarPercentual(dashboard.segmentacao.A.contribuicaoReceita)} da receita
                    </div>
                    <div className="text-xs text-gray-500">
                      Ticket médio: {formatarMoeda(dashboard.segmentacao.A.valorMedio)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmento B */}
              <div className="border-l-4 border-yellow-400 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-yellow-800">Segmento B - Padrão</h4>
                    <p className="text-sm text-gray-600">
                      {dashboard.segmentacao.B.quantidade} clientes ({formatarPercentual(dashboard.segmentacao.B.percentual)})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yellow-600">
                      {formatarPercentual(dashboard.segmentacao.B.contribuicaoReceita)} da receita
                    </div>
                    <div className="text-xs text-gray-500">
                      Ticket médio: {formatarMoeda(dashboard.segmentacao.B.valorMedio)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmento C */}
              <div className="border-l-4 border-gray-400 pl-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-800">Segmento C - Ocasional</h4>
                    <p className="text-sm text-gray-600">
                      {dashboard.segmentacao.C.quantidade} clientes ({formatarPercentual(dashboard.segmentacao.C.percentual)})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-600">
                      {formatarPercentual(dashboard.segmentacao.C.contribuicaoReceita)} da receita
                    </div>
                    <div className="text-xs text-gray-500">
                      Ticket médio: {formatarMoeda(dashboard.segmentacao.C.valorMedio)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Clientes */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Top Clientes
            </h3>
            
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {dashboard.topClientes.slice(0, 5).map((cliente, index) => (
                  <li key={cliente.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-800' : 
                          index === 1 ? 'bg-gray-100 text-gray-800' : 
                          index === 2 ? 'bg-orange-100 text-orange-800' : 
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {cliente.nome}
                        </p>
                        <p className="text-sm text-gray-500">
                          {cliente.totalCompras} compras • Última: {cliente.ultimaCompra}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatarMoeda(cliente.valorTotal)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Ticket: {formatarMoeda(cliente.ticketMedio)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {dashboard.topClientes.length === 0 && (
              <div className="text-center py-4">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum cliente encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Ainda não há clientes com vendas registradas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas e Tendências */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Alertas e Insights
            </h3>
            
            <div className="space-y-3">
              {dashboard.alertas.length > 0 ? (
                dashboard.alertas.map((alerta, index) => (
                  <div key={index} className={`p-4 rounded-md border ${obterCorAlerta(alerta.tipo)}`}>
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium">{alerta.titulo}</h4>
                        <p className="text-sm mt-1">{alerta.descricao}</p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 bg-opacity-50">
                          Impacto: {alerta.impacto}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <div className="text-green-500">
                    <ArrowTrendingUpIcon className="mx-auto h-12 w-12" />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Tudo em ordem!</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Não há alertas ou problemas com a base de clientes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tendências Mensais */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Tendências Mensais
            </h3>
            
            <div className="space-y-3">
              {dashboard.tendencias.slice(-3).map((tendencia, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-4 w-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{tendencia.mes}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {tendencia.novosClientes} novos • {tendencia.clientesAtivos} ativos
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatarMoeda(tendencia.receita)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {tendencia.vendas} vendas
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {dashboard.tendencias.length === 0 && (
              <div className="text-center py-4">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Sem dados históricos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Dados de tendência estarão disponíveis conforme o histórico se acumula.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteDashboard;