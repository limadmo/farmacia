/**
 * Modal para criação e edição de clientes
 * 
 * Permite criar novos clientes ou editar clientes existentes
 * com validação de formulário e formatação de documentos.
 */

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  UserIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CreditCardIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ClienteResponse, CriarClienteData, AtualizarClienteData, TipoDocumento } from '../types/cliente';
import { clienteService } from '../services/clienteService';
import { 
  validarCPF, 
  validarCNPJ, 
  formatarCPF, 
  formatarCNPJ, 
  formatarTelefone, 
  validarEmail, 
  validarTelefone,
  limparDocumento,
  formatarDocumento 
} from '../utils/documentValidation';

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: ClienteResponse | null;
  onSuccess: () => void;
}

interface FormData {
  nome: string;
  documento: string;
  tipoDocumento: TipoDocumento;
  email: string;
  telefone: string;
  endereco: string;
  limiteCredito: string;
  creditoHabilitado: boolean;
  ativo: boolean;
}

const initialFormData: FormData = {
  nome: '',
  documento: '',
  tipoDocumento: TipoDocumento.CPF,
  email: '',
  telefone: '',
  endereco: '',
  limiteCredito: '0',
  creditoHabilitado: false,
  ativo: true
};

export default function ClienteModal({ isOpen, onClose, cliente, onSuccess }: ClienteModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Carregar dados do cliente para edição
  useEffect(() => {
    if (cliente) {
      // Aplicar formatação ao documento quando carrega o cliente
      const tipoDoc = (cliente.tipoDocumento as TipoDocumento) || TipoDocumento.CPF;
      let docFormatado = '';
      
      if (cliente.documento) {
        // Converter TipoDocumento para string 'CPF' ou 'CNPJ' para usar com formatarDocumento
        const tipoFormatacao = tipoDoc === TipoDocumento.CPF ? 'CPF' : 'CNPJ';
        docFormatado = formatarDocumento(cliente.documento, tipoFormatacao);
      }
      
      setFormData({
        nome: cliente.nome,
        documento: docFormatado,
        tipoDocumento: tipoDoc,
        email: cliente.email || '',
        telefone: cliente.telefone ? formatarTelefone(cliente.telefone) : '',
        endereco: cliente.endereco || '',
        limiteCredito: cliente.limiteCredito.toString(),
        creditoHabilitado: cliente.creditoHabilitado,
        ativo: cliente.ativo
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [cliente, isOpen]);

  // Validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Nome obrigatório
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 2) {
      newErrors.nome = 'Nome deve ter pelo menos 2 caracteres';
    }

    // Documento obrigatório e validação
    if (!formData.documento.trim()) {
      newErrors.documento = 'Documento é obrigatório';
    } else {
      const documentoLimpo = limparDocumento(formData.documento);
      if (formData.tipoDocumento === TipoDocumento.CPF) {
        if (documentoLimpo.length !== 11) {
          newErrors.documento = 'CPF deve ter 11 dígitos';
        } else if (!validarCPF(documentoLimpo)) {
          newErrors.documento = 'CPF inválido';
        }
      } else if (formData.tipoDocumento === TipoDocumento.CNPJ) {
        if (documentoLimpo.length !== 14) {
          newErrors.documento = 'CNPJ deve ter 14 dígitos';
        } else if (!validarCNPJ(documentoLimpo)) {
          newErrors.documento = 'CNPJ inválido';
        }
      }
    }

    // Email opcional, mas se preenchido deve ser válido
    if (formData.email.trim()) {
      if (!validarEmail(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }

    // Telefone opcional, mas se preenchido deve ter formato válido
    if (formData.telefone.trim()) {
      if (!validarTelefone(formData.telefone)) {
        newErrors.telefone = 'Telefone deve ter 10 ou 11 dígitos';
      }
    }

    // Limite de crédito deve ser um número válido
    const limiteCredito = parseFloat(formData.limiteCredito);
    if (isNaN(limiteCredito) || limiteCredito < 0) {
      newErrors.limiteCredito = 'Limite de crédito deve ser um valor válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Formatar documento enquanto digita
  const formatarDocumentoInput = (valor: string, tipo: TipoDocumento): string => {
    // Converter TipoDocumento para string 'CPF' ou 'CNPJ' para usar com formatarDocumento
    const tipoFormatacao = tipo === TipoDocumento.CPF ? 'CPF' : 'CNPJ';
    return formatarDocumento(valor, tipoFormatacao);
  };



  // Manipular mudanças no formulário
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Formatação automática
      if (field === 'documento' && typeof value === 'string') {
        newData.documento = formatarDocumentoInput(value, prev.tipoDocumento);
      } else if (field === 'telefone' && typeof value === 'string') {
        newData.telefone = formatarTelefone(value);
      } else if (field === 'tipoDocumento') {
        // Limpar documento ao mudar tipo
        newData.documento = '';
        newData.tipoDocumento = value as TipoDocumento;
      }
      
      return newData;
    });
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Submeter formulário
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    
    try {
      const dadosCliente = {
        nome: formData.nome.trim(),
        documento: limparDocumento(formData.documento),
        tipoDocumento: formData.tipoDocumento,
        email: formData.email.trim() || undefined,
        telefone: limparDocumento(formData.telefone) || undefined,
        endereco: formData.endereco.trim() || undefined,
        limiteCredito: parseFloat(formData.limiteCredito),
        creditoHabilitado: formData.creditoHabilitado,
        ativo: formData.ativo
      };

      if (cliente) {
        // Editar cliente existente
        await clienteService.atualizarCliente(cliente.id, dadosCliente as AtualizarClienteData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Criar novo cliente
        await clienteService.criarCliente(dadosCliente as CriarClienteData);
        toast.success('Cliente criado com sucesso!');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cliente');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-8 pb-6 border-b">
          <div className="flex items-center gap-3">
            <UserIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {cliente ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-8">
          {/* Informações Básicas */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Informações Básicas
            </h3>
            
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nome ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nome completo do cliente"
              />
              {errors.nome && (
                <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
              )}
            </div>

            {/* Tipo de Documento e Documento */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Documento *
                </label>
                <select
                  name="tipoDocumento"
                  value={formData.tipoDocumento}
                  onChange={(e) => handleInputChange('tipoDocumento', e.target.value as TipoDocumento)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={TipoDocumento.CPF}>CPF</option>
                  <option value={TipoDocumento.CNPJ}>CNPJ</option>
                </select>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.tipoDocumento} *
                </label>
                <div className="relative">
                  <DocumentTextIcon className="h-5 w-5 absolute left-4 top-4 text-gray-400" />
                  <input
                    type="text"
                    name="documento"
                    value={formData.documento}
                    onChange={(e) => handleInputChange('documento', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.documento ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder={formData.tipoDocumento === TipoDocumento.CPF ? '000.000.000-00' : '00.000.000/0000-00'}
                  />
                </div>
                {errors.documento && (
                  <p className="mt-1 text-sm text-red-600">{errors.documento}</p>
                )}
              </div>
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5" />
              Contato
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="h-5 w-5 absolute left-4 top-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="email@exemplo.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <div className="relative">
                  <PhoneIcon className="h-5 w-5 absolute left-4 top-4 text-gray-400" />
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.telefone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                {errors.telefone && (
                  <p className="mt-1 text-sm text-red-600">{errors.telefone}</p>
                )}
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <div className="relative">
                <MapPinIcon className="h-5 w-5 absolute left-4 top-4 text-gray-400" />
                <textarea
                  name="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  rows={3}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Endereço completo do cliente"
                />
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5" />
              Configurações
            </h3>
            
            {/* Limite de Crédito */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Limite de Crédito (R$)
              </label>
              <input
                type="number"
                name="limiteCredito"
                min="0"
                step="0.01"
                value={formData.limiteCredito}
                onChange={(e) => handleInputChange('limiteCredito', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.limiteCredito ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.limiteCredito && (
                <p className="mt-1 text-sm text-red-600">{errors.limiteCredito}</p>
              )}
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="creditoHabilitado"
                  checked={formData.creditoHabilitado}
                  onChange={(e) => handleInputChange('creditoHabilitado', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Habilitar sistema de crédito
                </span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="ativo"
                  checked={formData.ativo}
                  onChange={(e) => handleInputChange('ativo', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Cliente ativo
                </span>
              </label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4 pt-8 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  {cliente ? 'Atualizar' : 'Criar'} Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}