import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, CalendarIcon, TagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { TipoPromocao, CondicaoTermino, Promocao, PromocaoResponse, PromocaoFilters, CreatePromocaoData } from '../types/promocao';
import Layout from '../components/Layout';
import { promocaoService } from '../services/promocaoService';
import PromocaoModal from '../components/PromocaoModal';
import Pagination from '../components/Pagination';

export default function PromocoesPage() {
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromocao, setEditingPromocao] = useState<Promocao | undefined>();

  // Filtros
  const [filters, setFilters] = useState<PromocaoFilters>({
    search: '',
    tipo: undefined,
    ativo: true,
    vigentes: true,
    produtoId: undefined
  });

  const loadPromocoes = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await promocaoService.listarPromocoes({ ...filters, page });
      setPromocoes(response.promocoes);
      setPagination({
        totalPages: response.pagination.totalPages,
        totalItems: response.pagination.totalItems,
        hasNext: response.pagination.hasNext,
        hasPrev: response.pagination.hasPrev
      });
      setCurrentPage(page);
    } catch (error: any) {
      // Não mostrar erro para listas vazias (404) ou respostas bem-sucedidas vazias
      if (error.response?.status === 404 || (error.response?.data?.promocoes && error.response.data.promocoes.length === 0)) {
        // Lista vazia - não é um erro
        setPromocoes([]);
        setPagination({ totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false });
        return;
      }
      
      // Mostrar erro apenas para problemas reais
      if (error.response?.status >= 500 || !error.response) {
        toast.error('Erro ao carregar promoções');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Acesso negado para visualizar promoções');
      }
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromocoes();
  }, []);

  // Busca automática com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search && (filters.search.length >= 2 || filters.search.length === 0)) {
        setCurrentPage(1);
        loadPromocoes(1);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [filters.search]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadPromocoes(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFilters(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [name]: value === '' ? undefined : value
      }));
    }
  };

  const handleEdit = (promocao: Promocao) => {
    setEditingPromocao(promocao);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta promoção?')) {
      try {
        await promocaoService.removerPromocao(id);
        toast.success('Promoção removida com sucesso!');
        loadPromocoes(currentPage);
      } catch (error) {
        toast.error('Erro ao remover promoção');
        console.error('Erro:', error);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPromocao(undefined);
  };

  const handleSave = async (data: CreatePromocaoData) => {
    try {
      if (editingPromocao) {
        await promocaoService.atualizarPromocao(editingPromocao.id, data);
        toast.success('Promoção atualizada com sucesso!');
      } else {
        await promocaoService.criarPromocao(data);
        toast.success('Promoção criada com sucesso!');
      }
      handleModalClose();
      loadPromocoes(currentPage);
    } catch (error: any) {
      // Extrair mensagem específica do backend ou usar mensagem genérica
      const errorMessage = error?.response?.data?.error || 'Erro ao salvar promoção';
      toast.error(errorMessage);
      console.error('Erro:', error);
    }
  };

  const getTipoPromocaoLabel = (tipo: TipoPromocao) => {
    const labels: Record<TipoPromocao, string> = {
      FIXO: 'Desconto Fixo',
      PORCENTAGEM: 'Desconto %'
    };
    return labels[tipo] || tipo;
  };

  const getStatusBadge = (promocao: Promocao) => {
    const agora = new Date();
    const inicio = new Date(promocao.dataInicio);
    const fim = new Date(promocao.dataFim);
    
    let status = 'INATIVA';
    let bgColor = 'bg-gray-100 text-gray-800';
    
    if (!promocao.ativo) {
      status = 'INATIVA';
      bgColor = 'bg-gray-100 text-gray-800';
    } else if (agora < inicio) {
      status = 'AGENDADA';
      bgColor = 'bg-blue-100 text-blue-800';
    } else if (agora >= inicio && agora <= fim) {
      status = 'ATIVA';
      bgColor = 'bg-green-100 text-green-800';
    } else {
      status = 'EXPIRADA';
      bgColor = 'bg-red-100 text-red-800';
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
        {status}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const calcularPrecoPromocional = (promocao: Promocao) => {
    if (!promocao.produto) return 0;
    
    const precoOriginal = promocao.produto.precoVenda;
    
    switch (promocao.tipo) {
      case TipoPromocao.PORCENTAGEM:
        return precoOriginal * (1 - (promocao.porcentagemDesconto || 0) / 100);
      case TipoPromocao.FIXO:
        return precoOriginal - (promocao.valorDesconto || 0);
      default:
        return promocao.precoPromocional;
    }
  };

  return (
    <Layout>
      <div className="p-6">

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Busca
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="search"
                  value={filters.search || ''}
                  onChange={handleFilterChange}
                  placeholder="Nome da promoção, produto..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Promoção
              </label>
              <select
                name="tipo"
                value={filters.tipo || ''}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="PORCENTAGEM">Desconto %</option>
                <option value="FIXO">Desconto Fixo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="ativo"
                value={filters.ativo === undefined ? '' : filters.ativo.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters(prev => ({
                    ...prev,
                    ativo: value === '' ? undefined : value === 'true'
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="vigentes"
                checked={filters.vigentes || false}
                onChange={handleFilterChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Apenas vigentes
              </label>
            </div>

            <div>
              <button
                onClick={handleSearch}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-600">
            {pagination.totalItems} promoção(ões) encontrada(s)
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Nova Promoção
          </button>
        </div>

        {/* Lista de Promoções */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {promocoes.length === 0 ? (
              <div className="text-center py-12">
                <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma promoção encontrada</h3>
                <p className="mt-1 text-sm text-gray-500">Comece criando uma nova promoção.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="-ml-1 mr-2 h-4 w-4" />
                    Nova Promoção
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Promoção
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preços
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Período
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendas
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {promocoes.map((promocao) => (
                      <tr key={promocao.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {promocao.nome}
                            </div>

                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {promocao.produto?.nome || 'Produto não encontrado'}
                          </div>
                          <div className="text-sm text-gray-500">
                            Estoque: {promocao.produto?.estoque || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {getTipoPromocaoLabel(promocao.tipo)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <span className="line-through text-gray-500">
                              {formatCurrency(promocao.produto?.precoVenda || 0)}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(calcularPrecoPromocional(promocao))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(promocao.dataInicio)}
                          </div>
                          <div className="text-sm text-gray-500">
                            até {formatDate(promocao.dataFim)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(promocao)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {promocao.quantidadeVendida || 0}
                          </div>
                          {promocao.quantidadeMaxima && (
                            <div className="text-sm text-gray-500">
                              de {promocao.quantidadeMaxima}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(promocao)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(promocao.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Remover"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Paginação Inteligente */}
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          onPageChange={(page) => loadPromocoes(page)}
          loading={loading}
        />

        {/* Modal de Promoção */}
        <PromocaoModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleSave}
          promocao={editingPromocao}
        />
      </div>
    </Layout>
  );
}