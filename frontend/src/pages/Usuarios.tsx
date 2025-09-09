/**
 * Página de gerenciamento de usuários
 * 
 * Permite listar, criar, editar e excluir usuários
 * com controle de hierarquia e permissões.
 */

import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  KeyIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { Usuario, TipoUsuario, FiltroUsuario } from '../types/auth';
import { usuarioService } from '../services/usuarioService';
import UsuarioModal from '../components/UsuarioModal';
import ConfirmDialog from '../components/ConfirmDialog';

interface FiltrosState {
  nome: string;
  login: string;
  tipo: TipoUsuario | '';
  ativo: boolean | '';
}

const initialFiltros: FiltrosState = {
  nome: '',
  login: '',
  tipo: '',
  ativo: ''
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtros, setFiltros] = useState<FiltrosState>(initialFiltros);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [usuarioToDelete, setUsuarioToDelete] = useState<Usuario | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tiposGerenciaveis, setTiposGerenciaveis] = useState<TipoUsuario[]>([]);

  useEffect(() => {
    loadUsuarios();
    loadTiposGerenciaveis();
  }, []);

  const loadUsuarios = async () => {
    try {
      setIsLoading(true);
      
      const filtroParams: FiltroUsuario = {};
      if (filtros.nome) filtroParams.nome = filtros.nome;
      if (filtros.login) filtroParams.login = filtros.login;
      if (filtros.tipo) filtroParams.tipo = filtros.tipo;
      if (filtros.ativo !== '') filtroParams.ativo = filtros.ativo as boolean;
      
      const data = await usuarioService.listarTodos(filtroParams);
      setUsuarios(data);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      
      // Não mostrar erro para listas vazias (404) ou respostas bem-sucedidas vazias
      if (error.response?.status === 404 || (error.response?.data && Array.isArray(error.response.data) && error.response.data.length === 0)) {
        // Lista vazia - não é um erro
        setUsuarios([]);
        return;
      }
      
      // Mostrar erro apenas para problemas reais
      if (error.response?.status >= 500 || !error.response) {
        toast.error(error.message || 'Erro ao carregar usuários');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Acesso negado para visualizar usuários');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadTiposGerenciaveis = async () => {
    try {
      const tipos = await usuarioService.getTiposGerenciaveis();
      setTiposGerenciaveis(tipos);
    } catch (error) {
      console.error('Erro ao carregar tipos gerenciáveis:', error);
    }
  };

  // Busca automática com debounce para nome e login
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if ((filtros.nome.length >= 2 || filtros.nome.length === 0) || 
          (filtros.login.length >= 2 || filtros.login.length === 0)) {
        loadUsuarios();
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [filtros.nome, filtros.login]);

  const handleSearch = () => {
    loadUsuarios();
  };

  const handleClearFilters = () => {
    setFiltros(initialFiltros);
    setTimeout(() => {
      loadUsuarios();
    }, 100);
  };

  const handleEdit = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setShowModal(true);
  };

  const handleDelete = (usuario: Usuario) => {
    setUsuarioToDelete(usuario);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!usuarioToDelete) return;

    try {
      await usuarioService.excluir(usuarioToDelete.id);
      toast.success('Usuário excluído com sucesso!');
      loadUsuarios();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
    } finally {
      setShowConfirmDialog(false);
      setUsuarioToDelete(null);
    }
  };

  const handleChangePassword = (usuario: Usuario) => {
    setSelectedUsuario(usuario);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const confirmChangePassword = async () => {
    if (!selectedUsuario) return;

    if (!newPassword) {
      toast.error('Digite a nova senha');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      await usuarioService.alterarSenha(selectedUsuario.id, newPassword);
      toast.success('Senha alterada com sucesso!');
      setShowPasswordModal(false);
      setSelectedUsuario(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    }
  };

  const handleModalSuccess = () => {
    loadUsuarios();
    setSelectedUsuario(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="p-6">


          {/* Filters */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <FunnelIcon className="h-5 w-5" />
                <span>Filtros</span>
              </button>
            </div>
            
            {showFilters && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={filtros.nome}
                      onChange={(e) => setFiltros(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Filtrar por nome"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Login
                    </label>
                    <input
                      type="text"
                      value={filtros.login}
                      onChange={(e) => setFiltros(prev => ({ ...prev, login: e.target.value }))}
                      placeholder="Filtrar por login"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo
                    </label>
                    <select
                      value={filtros.tipo}
                      onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value as TipoUsuario | '' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos os tipos</option>
                      {tiposGerenciaveis.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {usuarioService.getTipoDescricao(tipo)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filtros.ativo.toString()}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFiltros(prev => ({ 
                          ...prev, 
                          ativo: value === '' ? '' : value === 'true'
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Todos</option>
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleSearch}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    <span>Buscar</span>
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Limpar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ações Rápidas */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  setSelectedUsuario(null);
                  setShowModal(true);
                }}
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <PlusIcon className="h-8 w-8 text-blue-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Novo Usuário</span>
              </button>
              
              <button
                onClick={() => {
                  setFiltros(prev => ({ ...prev, ativo: true }));
                  setTimeout(() => loadUsuarios(), 100);
                }}
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <UserIcon className="h-8 w-8 text-green-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Usuários Ativos</span>
              </button>

              <button
                onClick={() => {
                  setFiltros(prev => ({ ...prev, tipo: 'ADMINISTRADOR' }));
                  setTimeout(() => loadUsuarios(), 100);
                }}
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <UserGroupIcon className="h-8 w-8 text-purple-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Administradores</span>
              </button>

              <button
                onClick={() => {
                  setFiltros(prev => ({ ...prev, tipo: 'VENDEDOR' }));
                  setTimeout(() => loadUsuarios(), 100);
                }}
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <UserGroupIcon className="h-8 w-8 text-yellow-500 mb-2" />
                <span className="text-sm font-medium text-gray-900">Vendedores</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando usuários...</p>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center">
                <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum usuário encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criado em
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {usuarios.map((usuario) => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {usuario.nome}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{usuario.login}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            usuarioService.getTipoCor(usuario.tipo)
                          }`}>
                            {usuarioService.getTipoDescricao(usuario.tipo)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            usuario.ativo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {usuario.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(usuario.ultimoLogin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(usuario.criadoEm)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(usuario)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="Editar usuário"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleChangePassword(usuario)}
                              className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                              title="Alterar senha"
                            >
                              <KeyIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(usuario)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Excluir usuário"
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

          {/* Modals */}
          <UsuarioModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setSelectedUsuario(null);
            }}
            usuario={selectedUsuario}
            onSuccess={handleModalSuccess}
          />

          <ConfirmDialog
            isOpen={showConfirmDialog}
            onClose={() => {
              setShowConfirmDialog(false);
              setUsuarioToDelete(null);
            }}
            onConfirm={confirmDelete}
            title="Excluir Usuário"
            message={`Tem certeza que deseja excluir o usuário "${usuarioToDelete?.nome}"? Esta ação não pode ser desfeita.`}
            confirmText="Excluir"
            confirmButtonClass="bg-red-600 hover:bg-red-700"
          />

          {/* Password Change Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <KeyIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Alterar Senha</h2>
                      <p className="text-sm text-gray-500">
                        Usuário: {selectedUsuario?.nome}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nova Senha
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowPasswordModal(false);
                        setSelectedUsuario(null);
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmChangePassword}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      Alterar Senha
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </Layout>
  );
}