/**
 * Página de Clientes - Sistema de Farmácia
 * 
 * Gerencia listagem, busca, criação e edição de clientes.
 */

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CreditCardIcon,
  UserIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import ClienteModal from '../components/ClienteModal';
import CreditoModal from '../components/CreditoModal';
import { ClienteResponse, ClienteFilters, TipoDocumento } from '../types/cliente';
import { clienteService } from '../services/clienteService';

interface ClientesPageProps {
  isNewClient?: boolean;
}

export default function ClientesPage({ isNewClient = false }: ClientesPageProps) {
  const [clientes, setClientes] = useState<ClienteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ClienteFilters>({});
  const [showModal, setShowModal] = useState(isNewClient);
  const [selectedCliente, setSelectedCliente] = useState<ClienteResponse | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [deletingClienteId, setDeletingClienteId] = useState<string | null>(null);
  console.log('Estado atual do deletingClienteId:', deletingClienteId);

  // Carregar clientes
  const carregarClientes = async () => {
    try {
      setLoading(true);
      const clientesData = await clienteService.listarClientes({
        ...filters,
        search: searchTerm || undefined
      });
      setClientes(clientesData);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  // Efeito para carregar clientes
  useEffect(() => {
    console.log('ClientesPage montado');
    carregarClientes();

    return () => {
      console.log('ClientesPage desmontado');
      setDeletingClienteId(null);
    };
  }, [searchTerm, filters]);

  // Buscar clientes com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== undefined) {
        carregarClientes();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Abrir modal para novo cliente
  const handleNovoCliente = () => {
    setSelectedCliente(null);
    setShowModal(true);
  };

  // Abrir modal para editar cliente
  const handleEditarCliente = (cliente: ClienteResponse) => {
    setSelectedCliente(cliente);
    setShowModal(true);
  };

  // Remover cliente
  const handleRemoverCliente = async (cliente: ClienteResponse) => {
    console.log('handleRemoverCliente chamado com:', cliente);
    
    try {
      const confirmacao = window.confirm(`Tem certeza que deseja remover o cliente "${cliente.nome}"?`);
      console.log('Confirmação do usuário:', confirmacao);
      
      if (!confirmacao) {
        console.log('Exclusão cancelada pelo usuário');
        return;
      }

      // Indica que a exclusão está em andamento
      console.log('Definindo deletingClienteId:', cliente.id);
      setDeletingClienteId(cliente.id);
      
      // Verifica se o token está presente
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('Usuário não está autenticado');
      }
      
      // Executa a exclusão
      console.log('Iniciando chamada à API de remoção');
      await clienteService.removerCliente(cliente.id);
      console.log('API retornou com sucesso');
      
      // Notifica sucesso
      toast.success('Cliente removido com sucesso!');
      
      // Atualiza a lista
      console.log('Atualizando lista de clientes');
      await carregarClientes();
      console.log('Lista de clientes atualizada');
    } catch (error: any) {
      console.error('Erro detalhado na exclusão:', error);
      toast.error(error.message || 'Erro ao remover cliente');
    } finally {
      console.log('Limpando estado de exclusão');
      setDeletingClienteId(null);
    }
  };

  // Abrir modal de crédito
  const handleGerenciarCredito = (cliente: ClienteResponse) => {
    setSelectedCliente(cliente);
    setShowCreditModal(true);
  };

  // Formatar valor monetário
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Formatar data
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Obter cor do status do crédito
  const getStatusCreditoColor = (cliente: ClienteResponse) => {
    if (!cliente.creditoHabilitado) return 'text-gray-500';
    if (cliente.creditoDisponivel <= 0) return 'text-red-600';
    if (cliente.creditoDisponivel < cliente.limiteCredito * 0.2) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie os clientes da farmácia</p>
        </div>

        {/* Controles */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleNovoCliente}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4" />
            Novo Cliente
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white p-8 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Campo de busca */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Cliente
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nome, documento, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtro por status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.ativo?.toString() || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  ativo: e.target.value === '' ? undefined : e.target.value === 'true'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            {/* Filtro por crédito */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crédito
              </label>
              <select
                value={filters.creditoHabilitado?.toString() || ''}
                onChange={(e) => setFilters({
                  ...filters,
                  creditoHabilitado: e.target.value === '' ? undefined : e.target.value === 'true'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="true">Com Crédito</option>
                <option value="false">Sem Crédito</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Clientes */}
        <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando clientes...</p>
            </div>
          ) : clientes.length === 0 ? (
            <div className="p-8 text-center">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || Object.keys(filters).length > 0
                  ? 'Nenhum cliente encontrado com os filtros aplicados'
                  : 'Nenhum cliente cadastrado'}
              </p>
              {!searchTerm && Object.keys(filters).length === 0 && (
                <button
                  onClick={handleNovoCliente}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Cadastrar Primeiro Cliente
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Crédito
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
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {cliente.nome}
                          </div>
                          <div className="text-sm text-gray-500">
                            Cadastrado em {formatarData(cliente.criadoEm)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cliente.documentoFormatado || cliente.documento || '-'}
                        </div>
                        {cliente.tipoDocumento && (
                          <div className="text-sm text-gray-500">
                            {cliente.tipoDocumento}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cliente.email || '-'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cliente.telefone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cliente.creditoHabilitado ? (
                          <div>
                            <div className={`text-sm font-medium ${getStatusCreditoColor(cliente)}`}>
                              {formatarMoeda(cliente.creditoDisponivel)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Limite: {formatarMoeda(cliente.limiteCredito)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Sem crédito</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          cliente.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {cliente.ativo ? (
                            <>
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-3 w-3 mr-1" />
                              Inativo
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium relative">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditarCliente(cliente)}
                            className="text-blue-600 hover:text-blue-900 transition"
                            title="Editar cliente"
                            aria-label="Editar cliente"
                          >
                            <PencilIcon className="h-4 w-4" aria-hidden="true" focusable="false" />
                          </button>
                          {cliente.creditoHabilitado && (
                            <button
                              onClick={() => handleGerenciarCredito(cliente)}
                              className="text-green-600 hover:text-green-900 transition"
                              title="Gerenciar crédito"
                              aria-label="Gerenciar crédito"
                            >
                              <CreditCardIcon className="h-4 w-4" aria-hidden="true" focusable="false" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              console.log('Clique no botão de exclusão detectado');
                              console.log('Elemento do botão:', e.currentTarget);
                              console.log('Estado do botão:', {
                                clienteId: cliente.id,
                                deletingClienteId,
                                isDisabled: deletingClienteId === cliente.id,
                                hasToken: !!localStorage.getItem('accessToken')
                              });
                              handleRemoverCliente(cliente);
                            }}
                            data-cliente-id={cliente.id}
                            className="inline-flex items-center justify-center p-2 rounded-md text-red-600 hover:text-red-900 focus:outline-none transition-colors duration-200 ease-in-out cursor-pointer z-50 relative"
                            title="Remover cliente"
                            aria-label="Remover cliente"
                            style={{ pointerEvents: 'auto' }}
                          >
                            {deletingClienteId === cliente.id ? (
                              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-red-600"></div>
                            ) : (
                              <TrashIcon className="h-5 w-5 pointer-events-none" aria-hidden="true" />
                            )}
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

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="flex items-center">
              <UserIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{clientes.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientes.filter(c => c.ativo).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="flex items-center">
              <CreditCardIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Com Crédito</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clientes.filter(c => c.creditoHabilitado).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Crédito Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatarMoeda(
                    clientes
                      .filter(c => c.creditoHabilitado)
                      .reduce((total, c) => total + c.creditoDisponivel, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cliente */}
      <ClienteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        cliente={selectedCliente}
        onSuccess={carregarClientes}
      />

      {/* Modal de Crédito */}
      {showCreditModal && selectedCliente && (
        <CreditoModal
          isOpen={showCreditModal}
          onClose={() => setShowCreditModal(false)}
          cliente={selectedCliente}
          onSuccess={carregarClientes}
        />
      )}
    </Layout>
  );
}