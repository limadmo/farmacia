import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ClassificacaoAnvisa, ClasseControlada, TipoReceita, Produto } from '../types/produto';
import { useAuth } from '../hooks/useAuth';
import Permission from './Permission';
import api from '../services/api';

interface ProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  produto?: Produto;
}

function ProdutoModal({ isOpen, onClose, onSave, produto }: ProdutoModalProps) {
  const [step, setStep] = useState(1);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    nome: '',
    descricao: '',
    codigoBarras: '',
    classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO,
    exigeReceita: false,
    classeControlada: '',
    tipoReceita: '',
    principioAtivo: '',
    laboratorio: '',
    registroAnvisa: '',
    precoVenda: '',
    precoCusto: '',
    estoque: '',
    estoqueMinimo: '',
    estoqueMaximo: '',
    categoriaId: '',
    ativo: true
  });

  // Efeito para carregar categorias
  useEffect(() => {
    const carregarCategorias = async () => {
      try {
        const response = await api.get('/produtos/categorias');
        setCategorias((response.data as any)?.categorias || []);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    };

    if (isOpen) {
      carregarCategorias();
    }
  }, [isOpen]);

  // Efeito para carregar dados do produto quando em modo de edição
  useEffect(() => {
    if (produto) {
      setFormData({
        nome: produto.nome || '',
        descricao: produto.descricao || '',
        codigoBarras: produto.codigoBarras || '',
        classificacaoAnvisa: produto.classificacaoAnvisa || ClassificacaoAnvisa.MEDICAMENTO,
        exigeReceita: produto.exigeReceita || false,
        classeControlada: produto.classeControlada || '',
        tipoReceita: produto.tipoReceita || '',
        principioAtivo: produto.principioAtivo || '',
        laboratorio: produto.laboratorio || '',
        registroAnvisa: produto.registroAnvisa || '',
        precoVenda: produto.precoVenda || '',
        precoCusto: produto.precoCusto || '',
        estoque: produto.estoque || '',
        estoqueMinimo: produto.estoqueMinimo || '',
        estoqueMaximo: produto.estoqueMaximo || '',
        categoriaId: produto.categoriaId || '',
        ativo: produto.ativo
      });
    } else {
      // Reset form quando for um novo produto
      setFormData({
        nome: '',
        descricao: '',
        codigoBarras: '',
        classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO,
        exigeReceita: false,
        classeControlada: '',
        tipoReceita: '',
        principioAtivo: '',
        laboratorio: '',
        registroAnvisa: '',
        precoVenda: '',
        precoCusto: '',
        estoque: '',
        estoqueMinimo: '',
        estoqueMaximo: '',
        categoriaId: '',
        ativo: true
      });
    }
    setStep(1);
  }, [produto, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'classificacaoAnvisa' && value !== ClassificacaoAnvisa.MEDICAMENTO) {
      // Se não for medicamento, limpar campos específicos de medicamentos
      setFormData({
        ...formData,
        [name]: value,
        exigeReceita: false,
        classeControlada: '',
        tipoReceita: '',
      });
    } else if (name === 'exigeReceita') {
      // Se não exige receita, limpar classe controlada
      const exigeReceita = value === 'true';
      setFormData({
        ...formData,
        [name]: exigeReceita,
        classeControlada: exigeReceita ? formData.classeControlada : '',
        tipoReceita: exigeReceita ? formData.tipoReceita : ''
      });
    } else if (name === 'classeControlada') {
      // Determinar tipo de receita com base na classe controlada
      let tipoReceita = '';
      if (['A1', 'A2', 'A3'].includes(value)) {
        tipoReceita = TipoReceita.RECEITA_AMARELA;
      } else if (['B1', 'B2'].includes(value)) {
        tipoReceita = TipoReceita.RECEITA_AZUL;
      } else if (['C1', 'C2', 'C3', 'C4', 'C5'].includes(value)) {
        tipoReceita = TipoReceita.RECEITA_BRANCA;
      }
      
      setFormData({
        ...formData,
        [name]: value,
        tipoReceita
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Converter valores numéricos
    const processedData = {
      ...formData,
      precoVenda: parseFloat(formData.precoVenda),
      precoCusto: formData.precoCusto ? parseFloat(formData.precoCusto) : undefined,
      estoque: parseInt(formData.estoque, 10),
      estoqueMinimo: parseInt(formData.estoqueMinimo, 10),
      estoqueMaximo: formData.estoqueMaximo ? parseInt(formData.estoqueMaximo, 10) : undefined
    };
    
    onSave(processedData);
  };

  const nextStep = () => {
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            1
          </div>
          <div className={`h-1 w-12 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            2
          </div>
          <div className={`h-1 w-12 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            3
          </div>
          <div className={`h-1 w-12 ${step > 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
            step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            4
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => {
    return (
      <>
        <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
          📋 Informações Básicas
        </h4>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Produto *
            </label>
            <input
              type="text"
              name="nome"
              required
              value={formData.nome}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome do produto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Descrição do produto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Barras
            </label>
            <input
              type="text"
              name="codigoBarras"
              value={formData.codigoBarras}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Código de barras EAN-13 ou EAN-8"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceitos: EAN-13 (13 dígitos) ou EAN-8 (8 dígitos)
            </p>
          </div>

          <div className="flex items-center pt-2">
            <input
              type="checkbox"
              name="ativo"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Produto ativo
            </label>
          </div>
        </div>
      </>
    );
  };

  const renderStep2 = () => {
    return (
      <>
        <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
          🏥 Classificação ANVISA
        </h4>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Classificação ANVISA *
            </label>
            <select
              name="classificacaoAnvisa"
              required
              value={formData.classificacaoAnvisa}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={ClassificacaoAnvisa.MEDICAMENTO}>Medicamento</option>
              <option value={ClassificacaoAnvisa.COSMÉTICO}>Cosmético</option>
              <option value={ClassificacaoAnvisa.SANEANTE}>Saneante</option>
              <option value={ClassificacaoAnvisa.CORRELATO}>Correlato</option>
              <option value={ClassificacaoAnvisa.ALIMENTO}>Alimento</option>
              <option value={ClassificacaoAnvisa.PRODUTO_HIGIENE}>Produto de Higiene</option>
              <option value={ClassificacaoAnvisa.OUTROS}>Outros</option>
            </select>
          </div>

          {formData.classificacaoAnvisa === ClassificacaoAnvisa.MEDICAMENTO && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Exige Receita
                </label>
                <select
                  name="exigeReceita"
                  value={formData.exigeReceita.toString()}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </div>

              {formData.exigeReceita && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Classe Controlada
                  </label>
                  <select
                    name="classeControlada"
                    value={formData.classeControlada}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione a classe</option>
                    <optgroup label="Receita Amarela">
                      <option value={ClasseControlada.A1}>A1 - Entorpecentes</option>
                      <option value={ClasseControlada.A2}>A2 - Entorpecentes</option>
                      <option value={ClasseControlada.A3}>A3 - Psicotrópicos</option>
                    </optgroup>
                    <optgroup label="Receita Azul">
                      <option value={ClasseControlada.B1}>B1 - Psicotrópicos</option>
                      <option value={ClasseControlada.B2}>B2 - Psicotrópicos Anorexígenos</option>
                    </optgroup>
                    <optgroup label="Receita Branca">
                      <option value={ClasseControlada.C1}>C1 - Outras Substâncias</option>
                      <option value={ClasseControlada.C2}>C2 - Retinoides</option>
                      <option value={ClasseControlada.C3}>C3 - Imunossupressores</option>
                      <option value={ClasseControlada.C4}>C4 - Antirretrovirais</option>
                      <option value={ClasseControlada.C5}>C5 - Anabolizantes</option>
                    </optgroup>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Princípio Ativo
                </label>
                <input
                  type="text"
                  name="principioAtivo"
                  value={formData.principioAtivo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Dipirona, Paracetamol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Laboratório
                </label>
                <input
                  type="text"
                  name="laboratorio"
                  value={formData.laboratorio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: EMS, Medley"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registro ANVISA
            </label>
            <input
              type="text"
              name="registroAnvisa"
              value={formData.registroAnvisa}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Número de registro na ANVISA"
            />
          </div>
        </div>
      </>
    );
  };

  const renderStep3 = () => {
    return (
      <>
        <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
          💰 Dados Comerciais
        </h4>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preço de Venda *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                R$
              </span>
              <input
                type="number"
                name="precoVenda"
                required
                value={formData.precoVenda}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0,00"
              />
            </div>
          </div>

          <Permission adminOnly={true}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço de Custo
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  R$
                </span>
                <input
                  type="number"
                  name="precoCusto"
                  value={formData.precoCusto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0,00"
                />
              </div>
            </div>
          </Permission>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <select
              name="categoriaId"
              required
              value={formData.categoriaId}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione uma categoria</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </>
    );
  };

  const renderStep4 = () => {
    return (
      <>
        <h4 className="text-md font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
          📦 Estoque
        </h4>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estoque Atual *
            </label>
            <input
              type="number"
              name="estoque"
              required
              value={formData.estoque}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Quantidade em estoque"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estoque Mínimo *
            </label>
            <input
              type="number"
              name="estoqueMinimo"
              required
              value={formData.estoqueMinimo}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Quantidade mínima"
            />
            <p className="text-xs text-gray-500 mt-1">
              Alerta será gerado quando estoque for menor ou igual a este valor
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estoque Máximo
            </label>
            <input
              type="number"
              name="estoqueMaximo"
              value={formData.estoqueMaximo}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Quantidade máxima (opcional)"
            />
          </div>
        </div>
      </>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const renderStepButtons = () => {
    return (
      <div className="flex justify-between mt-6">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Anterior
          </button>
        )}
        <div className="ml-auto">
          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Próximo
            </button>
          ) : (
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {produto ? 'Atualizar' : 'Criar'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-8 pb-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {produto ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-0 space-y-8">
          {renderStepIndicator()}
          {renderStepContent()}
          {renderStepButtons()}
        </form>
      </div>
    </div>
  );
}

export default ProdutoModal;
