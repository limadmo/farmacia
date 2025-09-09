/**
 * Página de Auditoria - Sistema de Farmácia
 * 
 * Interface para auditoria de vendas de medicamentos controlados.
 * Acesso restrito a farmacêuticos, gerentes e administradores.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import SmartFilters from '../components/SmartFilters';
import {
  ChartBarIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  VendaControlada,
  FiltroAuditoria,
  ResumoAuditoria,
  VendedoresControladosResponse
} from '../types/auditoria';
import auditoriaService from '../services/auditoriaService';
import toast from 'react-hot-toast';

interface DetalhesModalProps {
  venda: VendaControlada | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetalhesModal: React.FC<DetalhesModalProps> = ({ venda, isOpen, onClose }) => {
  if (!isOpen || !venda) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Detalhes da Venda Controlada</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID da Venda</label>
              <p className="mt-1 text-sm text-gray-900">{venda.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Data/Hora</label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(venda.dataVenda).toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vendedor</label>
              <p className="mt-1 text-sm text-gray-900">{venda.vendedor.nome}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo do Vendedor</label>
              <p className="mt-1 text-sm text-gray-900">{venda.vendedor.tipo}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Valor Total</label>
              <p className="mt-1 text-sm text-gray-900 font-semibold">
                R$ {venda.valorTotal.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Venda Assistida</label>
              <p className="mt-1 text-sm text-gray-900">
                {venda.vendaAssistida ? 'Sim' : 'Não'}
              </p>
            </div>
          </div>

          {venda.numeroReceita && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Número da Receita</label>
              <p className="mt-1 text-sm text-gray-900">{venda.numeroReceita}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medicamentos</label>
            <div className="space-y-2">
              {venda.produtos.map((produto, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <span className="font-medium text-gray-900">{produto.nome}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Quantidade: {produto.quantidade}
                    </div>
                    <div className="text-sm text-gray-600">
                      Valor: R$ {produto.precoUnitario.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 mt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const AuditoriaPage: React.FC = () => {
  // Estados principais
  const [vendas, setVendas] = useState<VendaControlada[]>([]);
  const [resumo, setResumo] = useState<ResumoAuditoria | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20; // Itens por página fixo para o componente Pagination padrão
  
  // Estados de interface
  const [selectedVenda, setSelectedVenda] = useState<VendaControlada | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState<FiltroAuditoria>({
    page: 1,
    limit: 20
  });

  // Calcular total de páginas a partir do total de itens
  useEffect(() => {
    const calculatedTotalPages = Math.ceil(totalItems / itemsPerPage);
    setTotalPages(calculatedTotalPages);
  }, [totalItems]);

  // Carregar dados da API
  const carregarDados = useCallback(async (filtrosParam: FiltroAuditoria, pageParam: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const filtrosComPaginacao = {
        ...filtrosParam,
        page: pageParam,
        limit: itemsPerPage
      };
      
      const response = await auditoriaService.listarVendasControladas(filtrosComPaginacao);
      
      setVendas(response.vendas);
      setTotalItems(response.total);
      setCurrentPage(pageParam);
      
    } catch (err: any) {
      // Não mostrar erro para listas vazias (404) ou respostas bem-sucedidas vazias
      if (err.response?.status === 404 || (err.response?.data?.vendas && err.response.data.vendas.length === 0)) {
        // Lista vazia - não é um erro
        setVendas([]);
        setTotalItems(0);
        setError('');
        return;
      }
      
      // Mostrar erro apenas para problemas reais
      if (err.response?.status >= 500 || !err.response) {
        const errorMsg = err.message || 'Erro ao carregar dados da auditoria';
        setError(errorMsg);
        toast.error('Erro ao carregar dados da auditoria');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Acesso negado');
        toast.error('Acesso negado para visualizar auditoria');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar resumo
  const carregarResumo = useCallback(async () => {
    try {
      const resumoData = await auditoriaService.obterResumoAuditoria(filtros);
      setResumo(resumoData);
    } catch (err) {
      console.error('Erro ao carregar resumo:', err);
    }
  }, [filtros.dataInicio, filtros.dataFim]);

  // Carregamento inicial
  useEffect(() => {
    carregarDados(filtros);
    carregarResumo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpar filtros
  const limparFiltros = () => {
    const filtrosLimpos: FiltroAuditoria = {
      page: 1,
      limit: itemsPerPage
    };
    setFiltros(filtrosLimpos);
    setCurrentPage(1);
    carregarDados(filtrosLimpos, 1);
  };

  // Manipuladores de eventos
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    carregarDados(filtros, page);
  };


  const handleFilterChange = (newFilters: Partial<FiltroAuditoria>) => {
    const updatedFilters = { 
      ...filtros, 
      ...newFilters, 
      page: 1, // Reset page quando filtros mudam
      limit: itemsPerPage 
    };
    setFiltros(updatedFilters);
    setCurrentPage(1);
    carregarDados(updatedFilters, 1);
  };

  const handleClearFilters = () => {
    limparFiltros();
  };

  const abrirDetalhes = (venda: VendaControlada) => {
    setSelectedVenda(venda);
    setModalOpen(true);
  };

  const fecharDetalhes = () => {
    setSelectedVenda(null);
    setModalOpen(false);
  };

  const exportarRelatorio = async () => {
    try {
      setLoading(true);
      toast.loading('Gerando relatório...');
      
      await auditoriaService.downloadRelatorio(filtros);
      
      toast.dismiss();
      toast.success('Relatório exportado com sucesso!');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Erro ao exportar relatório: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Sistema Unificado de Filtros Inteligentes */}
        <SmartFilters
          currentFilters={filtros}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          resultCount={totalItems}
          isLoading={loading}
          onExportClick={exportarRelatorio}
          exportLoading={loading}
        />

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total de Vendas</dt>
                      <dd className="text-lg font-medium text-gray-900">{resumo.totalVendasControladas}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Vendedores Ativos</dt>
                      <dd className="text-lg font-medium text-gray-900">{resumo.totalVendedores}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Vendas Assistidas</dt>
                      <dd className="text-lg font-medium text-gray-900">{resumo.totalVendasAssistidas}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Valor Total</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        R$ {resumo.valorTotalPeriodo.toFixed(2).replace('.', ',')}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Vendas */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vendas de Medicamentos Controlados</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Carregando dados...
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
                <p>{error}</p>
              </div>
            ) : vendas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCartIcon className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhuma venda encontrada</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data/Hora
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendedor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Medicamentos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Receita
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vendas.map((venda) => (
                        <tr key={venda.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(venda.dataVenda).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{venda.vendedor.nome}</div>
                              <div className="text-gray-500">{venda.vendedor.tipo}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="max-w-xs truncate">
                              {venda.produtos.map(produto => produto.nome).join(', ')}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {venda.produtos.length} item(s)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            R$ {venda.valorTotal.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {venda.numeroReceita || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {venda.vendaAssistida ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Assistida
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => abrirDetalhes(venda)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação Inteligente */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  onPageChange={handlePageChange}
                  loading={loading}
                />
              </>
            )}
          </div>
        </div>

        {/* Modal de Detalhes */}
        <DetalhesModal
          venda={selectedVenda}
          isOpen={modalOpen}
          onClose={fecharDetalhes}
        />
      </div>
    </Layout>
  );
};

export default AuditoriaPage;