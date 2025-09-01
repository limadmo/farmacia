/**
 * Página de Vendas - Sistema de Farmácia
 * 
 * Lista vendas com filtros e paginação.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/24/outline';
import Layout from '../components/Layout';
import vendaService from '../services/vendaService';
import { Venda, VendaFiltros } from '../types/venda';
import { FormaPagamento, StatusPagamento } from '../types/venda';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const VendasPage: React.FC = () => {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtros, setFiltros] = useState<VendaFiltros>({
    page: 1,
    limit: 10
  });

  // Carregar vendas
  useEffect(() => {
    carregarVendas();
  }, [currentPage, filtros]);

  const carregarVendas = async () => {
    try {
      setLoading(true);
      const response = await vendaService.listarVendas({
        ...filtros,
        page: currentPage
      });
      setVendas(response.vendas);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Erro ao carregar vendas:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  // Manipuladores de filtros
  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    let valorFinal = value;
    
    // Converter checkbox para boolean
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      valorFinal = target.checked ? 'true' : 'false';
    }
    
    setFiltros(prev => ({
      ...prev,
      [name]: valorFinal
    }));
  };

  const aplicarFiltros = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    carregarVendas();
  };

  const limparFiltros = () => {
    setFiltros({
      page: 1,
      limit: 10
    });
    setCurrentPage(1);
  };

  // Navegação de páginas
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Formatação e exibição
  const formatarData = (data: Date) => {
    return format(new Date(data), 'dd/MM/yyyy HH:mm');
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusClass = (status: StatusPagamento) => {
    switch (status) {
      case StatusPagamento.PAGO:
        return 'bg-green-100 text-green-800';
      case StatusPagamento.PENDENTE:
        return 'bg-yellow-100 text-yellow-800';
      case StatusPagamento.CANCELADO:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormaPagamentoLabel = (forma: FormaPagamento) => {
    const labels = {
      [FormaPagamento.DINHEIRO]: 'Dinheiro',
      [FormaPagamento.CARTAO_CREDITO]: 'Cartão de Crédito',
      [FormaPagamento.CARTAO_DEBITO]: 'Cartão de Débito',
      [FormaPagamento.PIX]: 'PIX',
      [FormaPagamento.BOLETO]: 'Boleto',
      [FormaPagamento.TRANSFERENCIA]: 'Transferência',
      [FormaPagamento.CREDITO_LOJA]: 'Crédito na Loja'
    };
    return labels[forma] || forma;
  };

  const getStatusPagamentoLabel = (status: StatusPagamento) => {
    const labels = {
      [StatusPagamento.PAGO]: 'Pago',
      [StatusPagamento.PENDENTE]: 'Pendente',
      [StatusPagamento.CANCELADO]: 'Cancelado'
    };
    return labels[status] || status;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendas</h1>
          <p className="text-gray-600">Gerencie as vendas da farmácia</p>
        </div>

        {/* Controles */}
        <div className="mb-6 flex justify-end">
          <Link
            to="/vendas/nova"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4" />
            Nova Venda
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          <form onSubmit={aplicarFiltros} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="statusPagamento"
                value={filtros.statusPagamento || ''}
                onChange={handleFiltroChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value={StatusPagamento.PENDENTE}>Pendente</option>
                <option value={StatusPagamento.PAGO}>Pago</option>
                <option value={StatusPagamento.CANCELADO}>Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
              <select
                name="formaPagamento"
                value={filtros.formaPagamento || ''}
                onChange={handleFiltroChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas</option>
                <option value={FormaPagamento.DINHEIRO}>Dinheiro</option>
                <option value={FormaPagamento.CARTAO_CREDITO}>Cartão de Crédito</option>
                <option value={FormaPagamento.CARTAO_DEBITO}>Cartão de Débito</option>
                <option value={FormaPagamento.PIX}>PIX</option>
                <option value={FormaPagamento.BOLETO}>Boleto</option>
                <option value={FormaPagamento.TRANSFERENCIA}>Transferência</option>
                <option value={FormaPagamento.CREDITO_LOJA}>Crédito na Loja</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input
                type="date"
                name="dataInicio"
                value={filtros.dataInicio || ''}
                onChange={handleFiltroChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input
                type="date"
                name="dataFim"
                value={filtros.dataFim || ''}
                onChange={handleFiltroChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center mt-6">
              <label className="flex items-center text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="temMedicamentoControlado"
                  checked={filtros.temMedicamentoControlado === true}
                  onChange={handleFiltroChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                />
                Medicamento Controlado
              </label>
            </div>

            <div className="md:col-span-3 flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={limparFiltros}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Limpar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Aplicar
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Vendas */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando vendas...</p>
            </div>
          ) : vendas.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Nenhuma venda encontrada.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pagamento
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Itens
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vendas.map((venda) => (
                    <tr key={venda.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {venda.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatarData(venda.criadoEm)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venda.cliente?.nome || venda.clienteNome || 'Cliente não identificado'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatarValor(venda.valorFinal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getFormaPagamentoLabel(venda.formaPagamento)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(venda.statusPagamento)}`}>
                          {getStatusPagamentoLabel(venda.statusPagamento)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {venda.itens?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/vendas/${venda.id}`)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Detalhes
                        </button>
                        {venda.statusPagamento === StatusPagamento.PENDENTE && (
                          <button
                            onClick={async () => {
                              try {
                                await vendaService.finalizarPagamento(venda.id);
                                toast.success('Pagamento finalizado com sucesso');
                                carregarVendas();
                              } catch (error) {
                                toast.error('Erro ao finalizar pagamento');
                              }
                            }}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Pagar
                          </button>
                        )}
                        {venda.statusPagamento === StatusPagamento.PENDENTE && (
                          <button
                            onClick={async () => {
                              if (window.confirm('Tem certeza que deseja cancelar esta venda?')) {
                                try {
                                  await vendaService.cancelarVenda(venda.id);
                                  toast.success('Venda cancelada com sucesso');
                                  carregarVendas();
                                } catch (error: any) {
                                  const errorMessage = error.response?.data?.message || error.response?.data?.mensagem || error.message || 'Erro ao cancelar venda';
                                  toast.error(errorMessage);
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div className="flex-1 flex justify-end">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Anterior
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${page === currentPage ? 'bg-blue-50 text-blue-600 z-10' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Próxima
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default VendasPage;