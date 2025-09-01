/**
 * Modal para gerenciamento de crédito de clientes
 * 
 * Permite movimentar crédito (adicionar/remover) e visualizar histórico
 */

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CreditCardIcon,
  PlusIcon,
  MinusIcon,
  ClockIcon,
  CheckIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { ClienteResponse, TipoMovimentacaoCredito, HistoricoCredito, HistoricoCreditoResponse, MovimentarCreditoData } from '../types/cliente';
import { clienteService } from '../services/clienteService';

interface CreditoModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: ClienteResponse;
  onSuccess: () => void;
}

interface MovimentacaoForm {
  valor: string;
  tipo: TipoMovimentacaoCredito;
  observacao: string;
}

const initialForm: MovimentacaoForm = {
  valor: '',
  tipo: TipoMovimentacaoCredito.CREDITO,
  observacao: ''
};

export default function CreditoModal({ isOpen, onClose, cliente, onSuccess }: CreditoModalProps) {
  const [activeTab, setActiveTab] = useState<'movimentacao' | 'historico'>('movimentacao');
  const [formData, setFormData] = useState<MovimentacaoForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<HistoricoCreditoResponse[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar histórico de crédito
  const carregarHistorico = async () => {
    try {
      setLoadingHistorico(true);
      const historicoData = await clienteService.obterHistoricoCredito(cliente.id);
      setHistorico(historicoData);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar histórico de crédito');
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Carregar histórico quando abrir o modal ou mudar para aba de histórico
  useEffect(() => {
    if (isOpen && activeTab === 'historico') {
      carregarHistorico();
    }
  }, [isOpen, activeTab, cliente.id]);

  // Resetar formulário quando abrir o modal
  useEffect(() => {
    if (isOpen) {
      setFormData(initialForm);
      setErrors({});
      setActiveTab('movimentacao');
    }
  }, [isOpen]);

  // Validar formulário
  const validarFormulario = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Valor obrigatório e válido
    const valor = parseFloat(formData.valor);
    if (!formData.valor.trim()) {
      newErrors.valor = 'Valor é obrigatório';
    } else if (isNaN(valor) || valor <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    } else if (formData.tipo === TipoMovimentacaoCredito.DEBITO && valor > cliente.creditoDisponivel) {
      newErrors.valor = 'Valor não pode ser maior que o crédito disponível';
    }

    // Observação obrigatória
    if (!formData.observacao.trim()) {
      newErrors.observacao = 'Observação é obrigatória';
    } else if (formData.observacao.trim().length < 5) {
      newErrors.observacao = 'Observação deve ter pelo menos 5 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manipular mudanças no formulário
  const handleInputChange = (field: keyof MovimentacaoForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Submeter movimentação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    
    try {
      const dadosMovimentacao: MovimentarCreditoData = {
        clienteId: cliente.id,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        descricao: formData.observacao.trim()
      };

      await clienteService.movimentarCredito(dadosMovimentacao);
      
      const tipoTexto = formData.tipo === TipoMovimentacaoCredito.CREDITO ? 'adicionado' : 'removido';
      toast.success(`Crédito ${tipoTexto} com sucesso!`);
      
      onSuccess();
      setFormData(initialForm);
      
      // Recarregar histórico se estiver na aba de histórico
      if (activeTab === 'historico') {
        carregarHistorico();
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao movimentar crédito');
    } finally {
      setLoading(false);
    }
  };

  // Formatar valor monetário
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Formatar data e hora
  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  // Obter cor do tipo de movimentação
  const getCorTipoMovimentacao = (tipo: string) => {
    return tipo === 'CREDITO'
      ? 'text-green-600'
      : 'text-red-600';
  };

  // Obter ícone do tipo de movimentação
  const getIconeTipoMovimentacao = (tipo: string) => {
    return tipo === 'CREDITO'
      ? <ArrowUpIcon className="h-4 w-4" />
      : <ArrowDownIcon className="h-4 w-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-8 border-b">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="h-6 w-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Gerenciar Crédito
              </h2>
              <p className="text-sm text-gray-600">
                {cliente.nome}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Informações do Crédito */}
        <div className="p-8 bg-gray-50 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Limite de Crédito</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatarMoeda(cliente.limiteCredito)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Crédito Disponível</p>
              <p className={`text-2xl font-bold ${
                cliente.creditoDisponivel > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatarMoeda(cliente.creditoDisponivel)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Crédito Utilizado</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatarMoeda(cliente.limiteCredito - cliente.creditoDisponivel)}
              </p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('movimentacao')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'movimentacao'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CreditCardIcon className="h-4 w-4" />
              Nova Movimentação
            </div>
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition ${
              activeTab === 'historico'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <ClockIcon className="h-4 w-4" />
              Histórico
            </div>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-8">
          {activeTab === 'movimentacao' ? (
            /* Aba de Movimentação */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Tipo de Movimentação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleInputChange('tipo', TipoMovimentacaoCredito.CREDITO)}
                    className={`p-4 border-2 rounded-lg transition flex items-center justify-center gap-2 ${
                      formData.tipo === TipoMovimentacaoCredito.CREDITO
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <PlusIcon className="h-5 w-5" />
                    Adicionar Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('tipo', TipoMovimentacaoCredito.DEBITO)}
                    className={`p-4 border-2 rounded-lg transition flex items-center justify-center gap-2 ${
                      formData.tipo === TipoMovimentacaoCredito.DEBITO
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <MinusIcon className="h-5 w-5" />
                    Remover Crédito
                  </button>
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => handleInputChange('valor', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.valor ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.valor && (
                  <p className="mt-1 text-sm text-red-600">{errors.valor}</p>
                )}
                {formData.tipo === TipoMovimentacaoCredito.DEBITO && (
                  <p className="mt-1 text-sm text-gray-600">
                    Máximo disponível: {formatarMoeda(cliente.creditoDisponivel)}
                  </p>
                )}
              </div>

              {/* Observação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observação *
                </label>
                <textarea
                  value={formData.observacao}
                  onChange={(e) => handleInputChange('observacao', e.target.value)}
                  rows={3}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.observacao ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Descreva o motivo da movimentação..."
                />
                {errors.observacao && (
                  <p className="mt-1 text-sm text-red-600">{errors.observacao}</p>
                )}
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                    formData.tipo === TipoMovimentacaoCredito.CREDITO
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      {formData.tipo === TipoMovimentacaoCredito.CREDITO ? 'Adicionar' : 'Remover'} Crédito
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Aba de Histórico */
            <div className="space-y-4">
              {loadingHistorico ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Carregando histórico...</p>
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma movimentação de crédito encontrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {historico.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            item.tipo === 'CREDITO'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {getIconeTipoMovimentacao(item.tipo)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${
                                getCorTipoMovimentacao(item.tipo)
                              }`}>
                                {item.tipo === 'CREDITO' ? '+' : '-'}
                                {formatarMoeda(item.valor)}
                              </span>
                              <span className="text-sm text-gray-500">
                                {formatarDataHora(item.criadoEm)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">
                              {item.descricao}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}