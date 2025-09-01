/**
 * Modal para criação e edição de usuários
 * 
 * Permite criar novos usuários ou editar usuários existentes
 * com validação de formulário e controle de hierarquia.
 */

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  UserIcon,
  KeyIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Usuario, CreateUsuarioRequest, UpdateUsuarioRequest, TipoUsuario } from '../types/auth';
import { usuarioService } from '../services/usuarioService';
// import { useAuth } from '../contexts/AuthContext';

interface UsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario?: Usuario | null;
  onSuccess: () => void;
}

interface FormData {
  nome: string;
  login: string;
  senha: string;
  confirmarSenha: string;
  tipo: TipoUsuario;
  ativo: boolean;
}

const initialFormData: FormData = {
  nome: '',
  login: '',
  senha: '',
  confirmarSenha: '',
  tipo: 'VENDEDOR',
  ativo: true
};

export default function UsuarioModal({ isOpen, onClose, usuario, onSuccess }: UsuarioModalProps) {
  // const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tiposGerenciaveis, setTiposGerenciaveis] = useState<TipoUsuario[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [alterarSenha, setAlterarSenha] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsEditMode(!!usuario);
      setAlterarSenha(false);
      
      if (usuario) {
        setFormData({
          nome: usuario.nome,
          login: usuario.login,
          senha: '',
          confirmarSenha: '',
          tipo: usuario.tipo,
          ativo: usuario.ativo
        });
      } else {
        setFormData(initialFormData);
      }
      
      setErrors({});
      loadTiposGerenciaveis();
    }
  }, [isOpen, usuario]);

  const loadTiposGerenciaveis = async () => {
    try {
      const tipos = await usuarioService.getTiposGerenciaveis();
      setTiposGerenciaveis(tipos);
    } catch (error) {
      console.error('Erro ao carregar tipos gerenciáveis:', error);
      toast.error('Erro ao carregar tipos de usuário');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    // Validar nome
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Validar login
    if (!formData.login.trim()) {
      newErrors.login = 'Login é obrigatório';
    } else if (formData.login.trim().length < 3) {
      newErrors.login = 'Login deve ter pelo menos 3 caracteres';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.login)) {
      newErrors.login = 'Login deve conter apenas letras, números, pontos, hífens e underscores';
    }

    // Validar senha (apenas para criação ou quando alterarSenha está ativo)
    if (!isEditMode || alterarSenha) {
      if (!formData.senha) {
        newErrors.senha = 'Senha é obrigatória';
      } else if (formData.senha.length < 6) {
        newErrors.senha = 'Senha deve ter pelo menos 6 caracteres';
      }

      if (!formData.confirmarSenha) {
        newErrors.confirmarSenha = 'Confirmação de senha é obrigatória';
      } else if (formData.senha !== formData.confirmarSenha) {
        newErrors.confirmarSenha = 'Senhas não coincidem';
      }
    }

    // Validar tipo
    if (!tiposGerenciaveis.includes(formData.tipo)) {
      newErrors.tipo = formData.tipo; // Manter o tipo atual para mostrar o erro
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode && usuario) {
        // Atualizar usuário existente
        const updateData: UpdateUsuarioRequest = {
          nome: formData.nome,
          tipo: formData.tipo,
          ativo: formData.ativo
        };

        if (alterarSenha && formData.senha) {
          updateData.senha = formData.senha;
        }

        await usuarioService.atualizar(usuario.id, updateData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        const createData: CreateUsuarioRequest = {
          nome: formData.nome,
          login: formData.login,
          senha: formData.senha,
          tipo: formData.tipo
        };

        await usuarioService.criar(createData);
        toast.success('Usuário criado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast.error(error.message || 'Erro ao salvar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditMode ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditMode ? 'Atualize as informações do usuário' : 'Preencha os dados do novo usuário'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-8">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="h-4 w-4 inline mr-1" />
              Nome Completo
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.nome ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Digite o nome completo"
            />
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
            )}
          </div>

          {/* Login */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <UserIcon className="h-4 w-4 inline mr-1" />
              Login
            </label>
            <input
              type="text"
              value={formData.login}
              onChange={(e) => handleInputChange('login', e.target.value.toLowerCase())}
              disabled={isEditMode}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.login ? 'border-red-300' : 'border-gray-300'
              } ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Digite o login"
            />
            {errors.login && (
              <p className="mt-1 text-sm text-red-600">{errors.login}</p>
            )}
            {isEditMode && (
              <p className="mt-1 text-sm text-gray-500">O login não pode ser alterado</p>
            )}
          </div>

          {/* Tipo de Usuário */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
              Tipo de Usuário
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => handleInputChange('tipo', e.target.value as TipoUsuario)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.tipo ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {tiposGerenciaveis.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {usuarioService.getTipoDescricao(tipo)}
                </option>
              ))}
            </select>
            {errors.tipo && (
              <p className="mt-1 text-sm text-red-600">{errors.tipo}</p>
            )}
          </div>

          {/* Senha (apenas para criação ou quando alterarSenha está ativo) */}
          {(!isEditMode || alterarSenha) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <KeyIcon className="h-4 w-4 inline mr-1" />
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => handleInputChange('senha', e.target.value)}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.senha ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Digite a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.senha && (
                  <p className="mt-1 text-sm text-red-600">{errors.senha}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <KeyIcon className="h-4 w-4 inline mr-1" />
                  Confirmar Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmarSenha}
                    onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
                    className={`w-full px-4 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmarSenha ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirme a senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmarSenha && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmarSenha}</p>
                )}
              </div>
            </>
          )}

          {/* Opção para alterar senha (apenas no modo edição) */}
          {isEditMode && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="alterarSenha"
                checked={alterarSenha}
                onChange={(e) => {
                  setAlterarSenha(e.target.checked);
                  if (!e.target.checked) {
                    setFormData(prev => ({ ...prev, senha: '', confirmarSenha: '' }));
                    setErrors(prev => ({ ...prev, senha: undefined, confirmarSenha: undefined }));
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="alterarSenha" className="ml-2 block text-sm text-gray-700">
                Alterar senha
              </label>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="ativo"
              checked={formData.ativo}
              onChange={(e) => handleInputChange('ativo', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="ativo" className="ml-2 block text-sm text-gray-700">
              Usuário ativo
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  <span>{isEditMode ? 'Atualizar' : 'Criar'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}