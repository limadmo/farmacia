import React, { useState, useEffect } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { produtoService } from '../services/produtoService';
import { estoqueService } from '../services/estoqueService';
import { Produto } from '../types/produto';

interface MovimentacaoEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovimentacaoRegistrada?: () => void;
  produtoInicial?: { id: string; nome: string } | null;
}

type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

interface FormData {
  produtoId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: string;
  observacoes: string;
}

const MovimentacaoEstoqueModal: React.FC<MovimentacaoEstoqueModalProps> = ({
  isOpen,
  onClose,
  onMovimentacaoRegistrada,
  produtoInicial
}) => {
  const [formData, setFormData] = useState<FormData>({
    produtoId: '',
    tipo: 'ENTRADA',
    quantidade: 0,
    motivo: '',
    observacoes: ''
  });
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [searchProduto, setSearchProduto] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProdutosList, setShowProdutosList] = useState(false);
  const [showMotivosSugeridos, setShowMotivosSugeridos] = useState(false);

  // Sugest\u00f5es de motivos pr\u00e9-definidos
  const motivosSugeridos = {
    AJUSTE: ['Erro de invent\u00e1rio', 'Acerto de contagem', 'Diferen\u00e7a de estoque'],
    ENTRADA: ['Compra', 'Transfer\u00eancia', 'Devolu\u00e7\u00e3o de cliente'],
    SAIDA: ['Transfer\u00eancia', 'Amostra gr\u00e1tis', 'Uso interno']
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
      carregarProdutos();
      
      // Se há produto inicial, pré-selecionar
      if (produtoInicial) {
        // @ts-ignore
        const produtoParaSelecionar: Produto = {
          id: produtoInicial.id,
          nome: produtoInicial.nome,
          descricao: '',
          codigoBarras: '',
          classificacaoAnvisa: 'MEDICAMENTO' as any,
          categoriaId: '',
          categoria: { id: '', nome: '' },
          precoVenda: 0,
          precoCusto: 0,
          estoque: 0,
          estoqueMinimo: 0,
          ativo: true,
          exigeReceita: false,
          retencaoReceita: false,
          loteObrigatorio: false,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString()
        };
        
        setProdutoSelecionado(produtoParaSelecionar);
        setSearchProduto(produtoInicial.nome);
        setFormData(prev => ({
          ...prev,
          produtoId: produtoInicial.id,
          tipo: 'AJUSTE' // Pré-selecionar AJUSTE para acertos
        }));
        setShowProdutosList(false);
      }
    }
  }, [isOpen, produtoInicial]);

  // Fechar modal com tecla ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Não mostrar lista de produtos se produto veio pré-selecionado
    if (produtoInicial) {
      setShowProdutosList(false);
      return;
    }
    
    if (searchProduto.length >= 2) {
      carregarProdutos(searchProduto);
      setShowProdutosList(true);
    } else if (searchProduto.length === 0) {
      carregarProdutos();
      setShowProdutosList(false);
    }
  }, [searchProduto, produtoInicial]);

  const resetForm = () => {
    setFormData({
      produtoId: '',
      tipo: 'ENTRADA',
      quantidade: 0,
      motivo: '',
      observacoes: ''
    });
    setProdutoSelecionado(null);
    setSearchProduto('');
    setError(null);
    setShowProdutosList(false);
  };

  const carregarProdutos = async (search?: string) => {
    try {
      setLoading(true);
      const response = await produtoService.listarProdutos({
        page: 1,
        limit: 20,
        search: search,
        ativo: 'true'
      });
      setProdutos(response.produtos);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const selecionarProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setFormData(prev => ({ ...prev, produtoId: produto.id }));
    setSearchProduto(produto.nome);
    setShowProdutosList(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) {
      setError('Selecione um produto');
      return;
    }

    if (formData.quantidade <= 0) {
      setError('Quantidade deve ser maior que zero');
      return;
    }

    if (!formData.motivo.trim()) {
      setError('Motivo é obrigatório');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await estoqueService.registrarMovimentacao({
        produtoId: formData.produtoId,
        tipo: formData.tipo,
        quantidade: formData.quantidade,
        motivo: formData.motivo,
        observacoes: formData.observacoes
      });

      onMovimentacaoRegistrada?.();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Erro ao registrar movimentação');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Acerto de Estoque
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Busca de Produto */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Produto *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchProduto}
                        onChange={(e) => {
                          if (!produtoInicial) {
                            setSearchProduto(e.target.value);
                          }
                        }}
                        placeholder={produtoInicial ? "Produto selecionado" : "Buscar produto..."}
                        readOnly={!!produtoInicial}
                        className={`block w-full pl-10 pr-3 py-2 border rounded-md leading-5 placeholder-gray-500 focus:outline-none ${
                          !!produtoInicial 
                            ? 'bg-gray-50 border-gray-200 text-gray-700 cursor-default' 
                            : 'bg-white border-gray-300 focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    {/* Lista de Produtos - só mostrar se não há produto pré-selecionado */}
                    {showProdutosList && !produtoInicial && (
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                        {loading ? (
                          <div className="px-3 py-2 text-sm text-gray-500">Carregando...</div>
                        ) : produtos.length > 0 ? (
                          produtos.map((produto) => (
                            <div
                              key={produto.id}
                              onClick={() => selecionarProduto(produto)}
                              className="cursor-pointer px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            >
                              <div className="font-medium text-gray-900">{produto.nome}</div>
                              {produto.codigoBarras && (
                                <div className="text-sm text-gray-500">{produto.codigoBarras}</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            Nenhum produto encontrado
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tipo de Movimentação */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Movimentação *
                    </label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as TipoMovimentacao }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ENTRADA">Entrada</option>
                      <option value="SAIDA">Saída</option>
                      <option value="AJUSTE">Ajuste</option>
                    </select>
                  </div>

                  {/* Quantidade */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade *
                      {produtoSelecionado && formData.tipo === 'SAIDA' && (
                        <span className="text-xs text-gray-500 ml-1">
                          (Estoque disponível: {produtoSelecionado.estoque})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={formData.quantidade || ''}
                      onChange={(e) => {
                        const novaQuantidade = parseInt(e.target.value) || 0;
                        
                        // Validação para não permitir estoque negativo em saídas
                        if (formData.tipo === 'SAIDA' && produtoSelecionado && novaQuantidade > produtoSelecionado.estoque) {
                          setError(`Quantidade não pode ser maior que o estoque disponível: ${produtoSelecionado.estoque}`);
                          setFormData(prev => ({ ...prev, quantidade: produtoSelecionado.estoque }));
                          return;
                        }
                        
                        setError(null);
                        setFormData(prev => ({ ...prev, quantidade: novaQuantidade }));
                      }}
                      min="1"
                      max={formData.tipo === 'SAIDA' && produtoSelecionado ? produtoSelecionado.estoque : undefined}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Digite a quantidade"
                    />
                  </div>

                  {/* Motivo */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo *
                    </label>
                    <input
                      type="text"
                      value={formData.motivo}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                      onFocus={() => setShowMotivosSugeridos(true)}
                      onBlur={() => setTimeout(() => setShowMotivosSugeridos(false), 50)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Descreva o motivo da movimentação"
                    />
                    
                    {/* Sugestões de motivos */}
                    {showMotivosSugeridos && motivosSugeridos[formData.tipo] && (
                      <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-40 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
                        <div className="px-3 py-1 text-xs text-gray-500 font-medium">Sugestões:</div>
                        {motivosSugeridos[formData.tipo].map((motivo) => (
                          <div
                            key={motivo}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, motivo }));
                              setShowMotivosSugeridos(false);
                            }}
                            className="cursor-pointer px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            {motivo}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações
                    </label>
                    <textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Observações adicionais (opcional)"
                    />
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Registrando...' : 'Registrar Acerto'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovimentacaoEstoqueModal;