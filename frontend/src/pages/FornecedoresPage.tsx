import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { fornecedorService, type Fornecedor, type CreateFornecedorData } from '../services/fornecedorService';

// Tipos importados do service centralizado

// Service centralizado importado

// Componente de Modal para Criar/Editar Fornecedor
interface FornecedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateFornecedorData) => void;
  fornecedor?: Fornecedor;
}

function FornecedorModal({ isOpen, onClose, onSave, fornecedor }: FornecedorModalProps) {
  // Função para aplicar máscara de CNPJ em tempo real
  const formatCNPJ = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 14 dígitos
    const limitedNumbers = numbers.substring(0, 14);
    
    // Aplica a máscara progressivamente
    if (limitedNumbers.length <= 2) return limitedNumbers;
    if (limitedNumbers.length <= 5) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
    if (limitedNumbers.length <= 8) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
    if (limitedNumbers.length <= 12) return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12, 14)}`;
  };

  // Função para aplicar máscara de telefone em tempo real
  const formatTelefone = (value: string) => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (celular) ou 10 (fixo)
    const limitedNumbers = numbers.substring(0, 11);
    
    // Aplica a máscara progressivamente
    if (limitedNumbers.length <= 2) return limitedNumbers;
    if (limitedNumbers.length <= 6) return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
    if (limitedNumbers.length <= 10) return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`;
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7)}`;
  };

  const [formData, setFormData] = useState<CreateFornecedorData>({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    representanteNome: '',
    representanteTelefone: '',
    representanteEmail: '',
    ativo: true
  });

  useEffect(() => {
    if (fornecedor) {
      setFormData({
        nome: fornecedor.nome,
        cnpj: formatCNPJ(fornecedor.cnpj), // Aplica máscara no CNPJ existente
        email: fornecedor.email || '',
        telefone: formatTelefone(fornecedor.telefone || ''), // Aplica máscara no telefone existente
        endereco: fornecedor.endereco || '',
        representanteNome: fornecedor.representanteNome || '',
        representanteTelefone: formatTelefone(fornecedor.representanteTelefone || ''),
        representanteEmail: fornecedor.representanteEmail || '',
        ativo: fornecedor.ativo
      });
    } else {
      setFormData({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        endereco: '',
        representanteNome: '',
        representanteTelefone: '',
        representanteEmail: '',
        ativo: true
      });
    }
  }, [fornecedor, isOpen]);

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setFormData({ ...formData, telefone: formatted });
  };

  const handleRepresentanteTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTelefone(e.target.value);
    setFormData({ ...formData, representanteTelefone: formatted });
  };

  // Função para prevenir entrada de caracteres não numéricos
  const handleNumericKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permite apenas números, backspace, delete, tab, escape, enter, arrows
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    
    if (allowedKeys.includes(e.key)) {
      return; // Permite teclas de controle
    }
    
    // Bloqueia se não for um número
    if (!/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* Dados do Fornecedor */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
              📋 Dados do Fornecedor
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome do fornecedor"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cnpj}
                    onChange={handleCNPJChange}
                    onKeyPress={handleNumericKeyPress}
                    maxLength={18}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email da Empresa
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="contato@fornecedor.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone da Empresa
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={handleTelefoneChange}
                    onKeyPress={handleNumericKeyPress}
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-700">
                    Fornecedor ativo
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endereço
                </label>
                <textarea
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Endereço completo da empresa"
                />
              </div>
            </div>
          </div>

          {/* Representante de Vendas */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
              👤 Representante de Vendas
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Representante
                </label>
                <input
                  type="text"
                  value={formData.representanteNome}
                  onChange={(e) => setFormData({ ...formData, representanteNome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo do representante"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone do Representante
                  </label>
                  <input
                    type="tel"
                    value={formData.representanteTelefone}
                    onChange={handleRepresentanteTelefoneChange}
                    onKeyPress={handleNumericKeyPress}
                    maxLength={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email do Representante
                  </label>
                  <input
                    type="email"
                    value={formData.representanteEmail}
                    onChange={(e) => setFormData({ ...formData, representanteEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="representante@email.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fornecedor ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente Principal
export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalItems: 0,
    hasNext: false,
    hasPrev: false
  });

  const loadFornecedores = async (page: number = 1, search?: string) => {
    try {
      setLoading(true);
      const response = await fornecedorService.listarFornecedores(page, search);
      setFornecedores(response.fornecedores);
      setPagination({
        totalPages: response.pagination.totalPages,
        totalItems: response.pagination.totalItems,
        hasNext: response.pagination.hasNext,
        hasPrev: response.pagination.hasPrev
      });
      setCurrentPage(page);
    } catch (error: any) {
      console.error('Erro:', error);
      
      // Não mostrar erro para listas vazias (404) ou respostas bem-sucedidas vazias
      if (error.response?.status === 404 || (error.response?.data?.fornecedores && error.response.data.fornecedores.length === 0)) {
        // Lista vazia - não é um erro
        setFornecedores([]);
        setPagination({ totalPages: 1, totalItems: 0, hasNext: false, hasPrev: false });
        return;
      }
      
      // Mostrar erro apenas para problemas reais
      if (error.response?.status >= 500 || !error.response) {
        toast.error('Erro ao carregar fornecedores');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Acesso negado para visualizar fornecedores');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFornecedores();
  }, []);

  // Busca automática com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        setCurrentPage(1);
        loadFornecedores(1, searchTerm);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadFornecedores(1, searchTerm);
  };

  const handleSaveFornecedor = async (data: CreateFornecedorData) => {
    try {
      if (editingFornecedor) {
        await fornecedorService.atualizarFornecedor(editingFornecedor.id, data);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await fornecedorService.criarFornecedor(data);
        toast.success('Fornecedor criado com sucesso!');
      }
      
      setIsModalOpen(false);
      setEditingFornecedor(undefined);
      loadFornecedores(currentPage, searchTerm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar fornecedor');
    }
  };

  const handleEditFornecedor = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setIsModalOpen(true);
  };

  const handleDeleteFornecedor = async (fornecedor: Fornecedor) => {
    if (!window.confirm(`Tem certeza que deseja remover o fornecedor "${fornecedor.nome}"?`)) {
      return;
    }

    try {
      await fornecedorService.removerFornecedor(fornecedor.id);
      toast.success('Fornecedor removido com sucesso!');
      loadFornecedores(currentPage, searchTerm);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover fornecedor');
    }
  };

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="p-6">

      {/* Controles */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Buscar
          </button>
        </div>
        
        <button
          onClick={() => {
            setEditingFornecedor(undefined);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4" />
          Novo Fornecedor
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando fornecedores...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fornecedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CNPJ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cadastrado em
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fornecedores.map((fornecedor) => (
                    <tr key={fornecedor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{fornecedor.nome}</div>
                          {fornecedor.endereco && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{fornecedor.endereco}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCNPJ(fornecedor.cnpj)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">Empresa:</div>
                          <div>{fornecedor.email || '-'}</div>
                          <div className="text-gray-500">{fornecedor.telefone || '-'}</div>
                        </div>
                        {(fornecedor.representanteNome || fornecedor.representanteEmail || fornecedor.representanteTelefone) && (
                          <div className="text-sm text-blue-900 mt-2 pt-2 border-t border-gray-100">
                            <div className="font-medium text-blue-700">Representante:</div>
                            {fornecedor.representanteNome && (
                              <div className="text-blue-800">{fornecedor.representanteNome}</div>
                            )}
                            {fornecedor.representanteEmail && (
                              <div className="text-blue-600">{fornecedor.representanteEmail}</div>
                            )}
                            {fornecedor.representanteTelefone && (
                              <div className="text-blue-600">{fornecedor.representanteTelefone}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          fornecedor.ativo 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(fornecedor.criadoEm)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditFornecedor(fornecedor)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFornecedor(fornecedor)}
                            className="text-red-600 hover:text-red-900 p-1"
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

            {fornecedores.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-500">Nenhum fornecedor encontrado</p>
              </div>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => loadFornecedores(currentPage - 1, searchTerm)}
                    disabled={!pagination.hasPrev}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => loadFornecedores(currentPage + 1, searchTerm)}
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
                      <span className="font-medium">{pagination.totalPages}</span> ({pagination.totalItems} fornecedores)
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => loadFornecedores(currentPage - 1, searchTerm)}
                        disabled={!pagination.hasPrev}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => loadFornecedores(currentPage + 1, searchTerm)}
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

      {/* Modal */}
      <FornecedorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingFornecedor(undefined);
        }}
        onSave={handleSaveFornecedor}
        fornecedor={editingFornecedor}
      />
      </div>
    </Layout>
  );
}
