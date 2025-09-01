import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TipoPromocao, CondicaoTermino, Promocao, CreatePromocaoData } from '../types/promocao';
import { Produto } from '../types/produto';
import { produtoService } from '../services/produtoService';

interface PromocaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePromocaoData) => void;
  promocao?: Promocao;
}

function PromocaoModal({ isOpen, onClose, onSave, promocao }: PromocaoModalProps) {
  const [formData, setFormData] = useState<any>({
    nome: '',
    produtoId: '',
    tipo: TipoPromocao.PORCENTAGEM,
    valorDesconto: '',
    porcentagemDesconto: '',
    precoPromocional: '',
    condicaoTermino: CondicaoTermino.ATE_ACABAR_ESTOQUE,
    quantidadeMaxima: '',
    dataInicio: '',
    dataFim: '',
    ativo: true
  });

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [precoCalculado, setPrecoCalculado] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});



  // Carregar produtos
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        setLoading(true);
        const response = await produtoService.listarProdutos({ page: 1, limit: 1000 });
        setProdutos(response.produtos);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadProdutos();
    }
  }, [isOpen]);

  // Carregar dados da promoção quando em modo de edição
  useEffect(() => {
    if (promocao) {
      const dataInicio = promocao.dataInicio ? new Date(promocao.dataInicio).toISOString().split('T')[0] : '';
      const dataFim = promocao.dataFim ? new Date(promocao.dataFim).toISOString().split('T')[0] : '';
      
      setFormData({
        nome: promocao.nome || '',
        produtoId: promocao.produtoId || '',
        tipo: promocao.tipo || TipoPromocao.PORCENTAGEM,
        valorDesconto: promocao.valorDesconto || '',
        porcentagemDesconto: promocao.porcentagemDesconto || '',
        precoPromocional: promocao.precoPromocional || '',
        condicaoTermino: promocao.condicaoTermino || CondicaoTermino.ATE_ACABAR_ESTOQUE,
        quantidadeMaxima: promocao.quantidadeMaxima || '',
        dataInicio,
        dataFim,
        ativo: promocao.ativo !== undefined ? promocao.ativo : true
      });

      if (promocao.produto) {
        setProdutoSelecionado(promocao.produto as Produto);
      }
    } else {
      // Reset form quando for uma nova promoção
      setFormData({
        nome: '',
        produtoId: '',
        tipo: TipoPromocao.PORCENTAGEM,
        valorDesconto: '',
        porcentagemDesconto: '',
        precoPromocional: '',
        condicaoTermino: CondicaoTermino.ATE_ACABAR_ESTOQUE,
        quantidadeMaxima: '',
        dataInicio: '',
        dataFim: '',
        ativo: true
      });
      setProdutoSelecionado(null);
      setPrecoCalculado(0);
    }
    setErrors({});
  }, [promocao, isOpen]);

  // Calcular preço promocional em tempo real
  useEffect(() => {
    if (produtoSelecionado && (formData.valorDesconto || formData.porcentagemDesconto)) {
      const precoOriginal = Number(produtoSelecionado.precoVenda);
      let novoPreco = 0;

      if (formData.tipo === TipoPromocao.PORCENTAGEM && formData.porcentagemDesconto) {
        const desconto = parseFloat(formData.porcentagemDesconto);
        if (desconto >= 0 && desconto <= 100) {
          novoPreco = precoOriginal * (1 - desconto / 100);
        }
      } else if (formData.tipo === TipoPromocao.FIXO && formData.valorDesconto) {
        const desconto = parseFloat(formData.valorDesconto);
        if (desconto >= 0 && desconto <= precoOriginal) {
          novoPreco = precoOriginal - desconto;
        }
      }

      setPrecoCalculado(Math.max(0, novoPreco));
      setFormData(prev => ({ ...prev, precoPromocional: novoPreco.toFixed(2) }));
    } else {
      setPrecoCalculado(0);
      setFormData(prev => ({ ...prev, precoPromocional: '' }));
    }
  }, [produtoSelecionado, formData.tipo, formData.valorDesconto, formData.porcentagemDesconto]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'produtoId') {
      const produto = produtos.find(p => p.id === value);
      setProdutoSelecionado(produto || null);
      setFormData({ ...formData, [name]: value });
    } else if (name === 'tipo') {
      // Limpar campos de desconto quando mudar o tipo
      setFormData({
        ...formData,
        [name]: value,
        valorDesconto: '',
        porcentagemDesconto: ''
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors: any = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.produtoId) {
      newErrors.produtoId = 'Produto é obrigatório';
    }

    if (formData.tipo === TipoPromocao.PORCENTAGEM) {
      if (!formData.porcentagemDesconto) {
        newErrors.porcentagemDesconto = 'Porcentagem de desconto é obrigatória';
      } else {
        const porcentagem = parseFloat(formData.porcentagemDesconto);
        if (porcentagem <= 0 || porcentagem > 100) {
          newErrors.porcentagemDesconto = 'Porcentagem deve ser entre 0.01 e 100';
        }
      }
    } else {
      if (!formData.valorDesconto) {
        newErrors.valorDesconto = 'Valor de desconto é obrigatório';
      } else {
        const valor = parseFloat(formData.valorDesconto);
        if (valor <= 0 || (produtoSelecionado && valor >= Number(produtoSelecionado.precoVenda))) {
          newErrors.valorDesconto = 'Valor deve ser maior que 0 e menor que o preço do produto';
        }
      }
    }

    if (!formData.dataInicio) {
      newErrors.dataInicio = 'Data de início é obrigatória';
    }
    if (!formData.dataFim) {
      newErrors.dataFim = 'Data de fim é obrigatória';
    }
    if (formData.dataInicio && formData.dataFim && formData.dataInicio >= formData.dataFim) {
      newErrors.dataFim = 'Data de fim deve ser posterior à data de início';
    }

    if (formData.condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA) {
      if (!formData.quantidadeMaxima) {
        newErrors.quantidadeMaxima = 'Quantidade máxima é obrigatória';
      } else {
        const quantidade = parseInt(formData.quantidadeMaxima);
        if (quantidade <= 0) {
          newErrors.quantidadeMaxima = 'Quantidade deve ser maior que 0';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Converter valores numéricos
    const processedData: CreatePromocaoData = {
      nome: formData.nome.trim(),
      produtoId: formData.produtoId,
      tipo: formData.tipo,
      valorDesconto: formData.tipo === TipoPromocao.FIXO ? parseFloat(formData.valorDesconto) : undefined,
      porcentagemDesconto: formData.tipo === TipoPromocao.PORCENTAGEM ? parseFloat(formData.porcentagemDesconto) : undefined,

      condicaoTermino: formData.condicaoTermino,
      quantidadeMaxima: formData.condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA ? parseInt(formData.quantidadeMaxima) : undefined,
      dataInicio: formData.dataInicio,
      dataFim: formData.dataFim,
      ativo: formData.ativo
    };
    
    onSave(processedData);
  };

  const renderFormField = (label: string, name: string, type: string = 'text', required: boolean = false, options?: { value: string; label: string }[]) => {
    const hasError = errors[name];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {type === 'select' ? (
          <select
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Selecione...</option>
            {options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            name={name}
            value={formData[name]}
            onChange={handleChange}
            rows={3}
            className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={`Digite ${label.toLowerCase()}`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={formData[name]}
            onChange={handleChange}
            className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasError ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder={`Digite ${label.toLowerCase()}`}
            step={type === 'number' ? '0.01' : undefined}
            min={type === 'number' ? '0' : undefined}
          />
        )}
        {hasError && (
          <p className="text-red-500 text-xs mt-1">{hasError}</p>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-8 pb-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {promocao ? 'Editar Promoção' : 'Nova Promoção'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-8">
          {/* Informações Básicas */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
              🎯 Informações Básicas
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {renderFormField('Nome da Promoção', 'nome', 'text', true)}
              
              {renderFormField('Produto', 'produtoId', 'select', true, 
                [...produtos]
                  .sort((a, b) => a.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').localeCompare(
                    b.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), 'pt-BR'
                  ))
                  .map(produto => ({
                    value: produto.id,
                    label: `${produto.nome} - R$ ${typeof produto.precoVenda === 'number' ? produto.precoVenda.toFixed(2) : Number(produto.precoVenda).toFixed(2)}`
                  }))
              )}

              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  name="ativo"
                  checked={formData.ativo}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Promoção ativa
                </label>
              </div>
            </div>
          </div>

          {/* Configuração de Desconto */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
              💰 Configuração de Desconto
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {renderFormField('Tipo de Desconto', 'tipo', 'select', true, [
                { value: TipoPromocao.PORCENTAGEM, label: 'Porcentagem' },
                { value: TipoPromocao.FIXO, label: 'Valor Fixo' }
              ])}

              {formData.tipo === TipoPromocao.PORCENTAGEM ? (
                renderFormField('Porcentagem de Desconto (%)', 'porcentagemDesconto', 'number', true)
              ) : (
                renderFormField('Valor de Desconto (R$)', 'valorDesconto', 'number', true)
              )}

              {/* Preview do Cálculo */}
              {produtoSelecionado && precoCalculado > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">💡 Preview do Desconto</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Preço Original:</span>
                      <span className="font-medium">R$ {typeof produtoSelecionado.precoVenda === 'number' ? produtoSelecionado.precoVenda.toFixed(2) : Number(produtoSelecionado.precoVenda).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Desconto:</span>
                      <span className="text-red-600 font-medium">
                        {formData.tipo === TipoPromocao.PORCENTAGEM 
                          ? `${formData.porcentagemDesconto}%` 
                          : `R$ ${formData.valorDesconto}`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-1">
                      <span className="text-blue-900 font-medium">Preço Promocional:</span>
                      <span className="text-green-600 font-bold">R$ {precoCalculado.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Economia:</span>
                      <span className="text-green-600 font-medium">
                        R$ {(Number(produtoSelecionado.precoVenda) - precoCalculado).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Condições de Término */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
              ⏰ Condições de Término
            </h4>
            <div className="grid grid-cols-1 gap-4">
              {renderFormField('Condição de Término', 'condicaoTermino', 'select', true, [
                { value: CondicaoTermino.ATE_ACABAR_ESTOQUE, label: 'Até Acabar Estoque' },
                { value: CondicaoTermino.QUANTIDADE_LIMITADA, label: 'Quantidade Limitada' }
              ])}

              <div className="grid grid-cols-2 gap-4">
                {renderFormField('Data de Início', 'dataInicio', 'date', true)}
                {renderFormField('Data de Fim', 'dataFim', 'date', true)}
              </div>

              {formData.condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA && (
                renderFormField('Quantidade Máxima', 'quantidadeMaxima', 'number', true)
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (promocao ? 'Atualizar' : 'Criar')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PromocaoModal;