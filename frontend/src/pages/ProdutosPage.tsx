import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ClassificacaoAnvisa, ClasseControlada, Produto } from '../types/produto';
import Layout from '../components/Layout';
import ProdutoModal from '../components/ProdutoModal';
import Permission from '../components/Permission';
import { produtoService } from '../services/produtoService';

// Serviço de API para Produtos
// Usando service centralizado importado

// Componente Principal
interface ProdutosPageProps {
  isNewProduct?: boolean;
}

export default function ProdutosPage({ isNewProduct = false }: ProdutosPageProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | undefined>();
  

  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    classificacaoAnvisa: '',
    exigeReceita: '',
    ativo: 'true',
    estoqueMinimo: ''
  });

  const loadProdutos = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await produtoService.listarProdutos({ page, ...filters });
      setProdutos(response.produtos);
      setPagination({
        totalPages: response.pagination.totalPages,
        totalItems: response.pagination.totalItems,
        hasNext: response.pagination.hasNext,
        hasPrev: response.pagination.hasPrev
      });
      setCurrentPage(page);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
    
    // Abrir modal automaticamente se for para criar novo produto
    if (isNewProduct) {
      setIsModalOpen(true);
    }
  }, [isNewProduct]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadProdutos(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveProduto = async (data: any) => {
    try {
      if (editingProduto) {
        await produtoService.atualizarProduto(editingProduto.id, data);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await produtoService.criarProduto(data);
        toast.success('Produto criado com sucesso!');
      }
      
      setIsModalOpen(false);
      setEditingProduto(undefined);
      loadProdutos(currentPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar produto');
    }
  };

  const handleEditProduto = (produto: Produto) => {
    setEditingProduto(produto);
    setIsModalOpen(true);
  };

  const handleDeleteProduto = async (produto: Produto) => {
    if (!window.confirm(`Tem certeza que deseja remover o produto "${produto.nome}"?`)) {
      return;
    }

    try {
      await produtoService.removerProduto(produto.id);
      toast.success('Produto removido com sucesso!');
      loadProdutos(currentPage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover produto');
    }
  };

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getClassificacaoLabel = (classificacao: ClassificacaoAnvisa) => {
    const labels: Record<ClassificacaoAnvisa, string> = {
      MEDICAMENTO: 'Medicamento',
      COSMÉTICO: 'Cosmético',
      SANEANTE: 'Saneante',
      CORRELATO: 'Correlato',
      ALIMENTO: 'Alimento',
      PRODUTO_HIGIENE: 'Produto de Higiene',
      OUTROS: 'Outros'
    };
    return labels[classificacao] || classificacao;
  };

  const getClasseControladaBadge = (classeControlada?: ClasseControlada) => {
    if (!classeControlada) return null;
    
    const classes: Record<string, { color: string, label: string }> = {
      'A1': { color: 'yellow', label: 'A1 - Entorpecente' },
      'A2': { color: 'yellow', label: 'A2 - Entorpecente' },
      'A3': { color: 'yellow', label: 'A3 - Psicotrópico' },
      'B1': { color: 'blue', label: 'B1 - Psicotrópico' },
      'B2': { color: 'blue', label: 'B2 - Psicotrópico Anorexígeno' },
      'C1': { color: 'white', label: 'C1 - Outras Substâncias' },
      'C2': { color: 'white', label: 'C2 - Retinoide' },
      'C3': { color: 'white', label: 'C3 - Imunossupressor' },
      'C4': { color: 'white', label: 'C4 - Antirretroviral' },
      'C5': { color: 'white', label: 'C5 - Anabolizante' },
    };

    const { color, label } = classes[classeControlada];
    
    let bgColor = 'bg-gray-100 text-gray-800';
    if (color === 'yellow') bgColor = 'bg-yellow-100 text-yellow-800';
    if (color === 'blue') bgColor = 'bg-blue-100 text-blue-800';

    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${bgColor}`}>
        {label}
      </span>
    );
  };

  const isEstoqueBaixo = (produto: Produto) => {
    return produto.estoque <= produto.estoqueMinimo;
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Produtos</h1>
          <p className="text-gray-600">Gerencie os produtos da farmácia</p>
        </div>

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
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Nome, código de barras..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Classificação ANVISA
            </label>
            <select
              name="classificacaoAnvisa"
              value={filters.classificacaoAnvisa}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas</option>
              <option value="MEDICAMENTO">Medicamento</option>
              <option value="COSMÉTICO">Cosmético</option>
              <option value="SANEANTE">Saneante</option>
              <option value="CORRELATO">Correlato</option>
              <option value="ALIMENTO">Alimento</option>
              <option value="PRODUTO_HIGIENE">Produto de Higiene</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Exige Receita
            </label>
            <select
              name="exigeReceita"
              value={filters.exigeReceita}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="ativo"
              value={filters.ativo}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
              <option value="">Todos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estoque
            </label>
            <select
              name="estoqueMinimo"
              value={filters.estoqueMinimo}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="true">Estoque Baixo</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Filtrar
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="mb-6 flex justify-between">
        <div className="flex items-center">
          <span className="text-gray-600">
            {pagination.totalItems} produtos encontrados
          </span>
        </div>
        
        <Permission requiredModule="produtos">
          <button
            onClick={() => {
              setEditingProduto(undefined);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4" />
            Novo Produto
          </button>
        </Permission>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando produtos...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Classificação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estoque
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preço
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {produtos.map((produto) => (
                    <tr key={produto.id} className={`hover:bg-gray-50 ${isEstoqueBaixo(produto) ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{produto.nome}</div>
                          {produto.codigoBarras && (
                            <div className="text-sm text-gray-500">Cód: {produto.codigoBarras}</div>
                          )}
                          {produto.principioAtivo && (
                            <div className="text-xs text-gray-500 italic">{produto.principioAtivo}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getClassificacaoLabel(produto.classificacaoAnvisa)}</div>
                        <div className="mt-1">
                          {produto.classeControlada && getClasseControladaBadge(produto.classeControlada)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isEstoqueBaixo(produto) ? 'text-red-700' : 'text-gray-900'}`}>
                          {isEstoqueBaixo(produto) && (
                            <ExclamationTriangleIcon className="inline-block h-4 w-4 mr-1 text-red-500" />
                          )}
                          {produto.estoque} un
                        </div>
                        <div className="text-xs text-gray-500">
                          Min: {produto.estoqueMinimo} {produto.estoqueMaximo ? `| Max: ${produto.estoqueMaximo}` : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{formatMoney(produto.precoVenda)}</div>
                        <Permission adminOnly={true}>
                          {produto.precoCusto && produto.margem && (
                            <div className="text-xs text-gray-500">
                              Custo: {formatMoney(produto.precoCusto)} | Margem: {produto.margem.toFixed(2)}%
                            </div>
                          )}
                        </Permission>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          produto.ativo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {produto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Permission requiredModule="produtos">
                            <button
                              onClick={() => handleEditProduto(produto)}
                              className="text-blue-600 hover:text-blue-900 p-1"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduto(produto)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Remover"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </Permission>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {produtos.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500">Nenhum produto encontrado</p>
              </div>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => loadProdutos(currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => loadProdutos(currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                      <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalItems} produtos)
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => loadProdutos(currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => loadProdutos(currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Modal de Produto */}
      <ProdutoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduto(undefined);
        }}
        onSave={handleSaveProduto}
        produto={editingProduto}
      />
      </div>
    </Layout>
  );
}
