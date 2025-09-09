import React, { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon, ClockIcon, CubeIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { ProdutoEstoqueCompleto } from '../services/estoqueService';
import { estoqueService } from '../services/estoqueService';

interface DetalhesEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: ProdutoEstoqueCompleto | null;
}

interface MovimentacaoEstoque {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'PERDA';
  quantidade: number;
  motivo: string;
  observacoes?: string;
  dataMovimentacao: string;
  usuario: {
    nome: string;
  };
}

interface LoteDetalhe {
  id: string;
  numeroLote: string;
  dataFabricacao: string;
  dataVencimento: string;
  quantidadeAtual: number;
}

const DetalhesEstoqueModal: React.FC<DetalhesEstoqueModalProps> = ({
  isOpen,
  onClose,
  produto
}) => {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [lotes, setLotes] = useState<LoteDetalhe[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'lotes' | 'historico'>('info');

  // Carregar dados detalhados quando o modal abrir
  useEffect(() => {
    if (isOpen && produto) {
      carregarDetalhes();
    }
  }, [isOpen, produto]);

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

  const carregarDetalhes = async () => {
    if (!produto) return;
    
    try {
      setLoading(true);
      
      // Carregar movimentações em paralelo
      const [movimentacoesResponse, lotesResponse] = await Promise.allSettled([
        estoqueService.listarMovimentacoes({ produtoId: produto.id, limit: 10 }),
        produto.loteObrigatorio ? estoqueService.listarLotesProduto(produto.id) : Promise.resolve([])
      ]);

      // Processar movimentações
      if (movimentacoesResponse.status === 'fulfilled') {
        const movData = movimentacoesResponse.value;
        setMovimentacoes(movData?.movimentacoes || []);
      }

      // Processar lotes se disponível
      if (lotesResponse.status === 'fulfilled') {
        setLotes(Array.isArray(lotesResponse.value) ? lotesResponse.value : []);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return 'Data não disponível';
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return 'Data inválida';
    
    return dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatarDataSimples = (data: string) => {
    if (!data) return 'N/A';
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return 'Data inválida';
    
    return dataObj.toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor: number) => {
    if (valor === null || valor === undefined || isNaN(valor)) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusEstoqueColor = (estoque: number, minimo: number) => {
    if (estoque === 0) return 'text-red-600 bg-red-50';
    if (estoque <= minimo) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusEstoqueTexto = (estoque: number, minimo: number) => {
    if (estoque === 0) return 'Sem Estoque';
    if (estoque <= minimo) return 'Estoque Baixo';
    return 'Estoque OK';
  };

  const getTipoMovimentacaoColor = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA': return 'text-green-600 bg-green-50';
      case 'SAIDA': return 'text-red-600 bg-red-50';
      case 'AJUSTE': return 'text-blue-600 bg-blue-50';
      case 'PERDA': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTipoMovimentacaoTexto = (tipo: string) => {
    switch (tipo) {
      case 'ENTRADA': return 'Entrada';
      case 'SAIDA': return 'Saída';
      case 'AJUSTE': return 'Ajuste';
      case 'PERDA': return 'Perda';
      default: return tipo;
    }
  };

  const verificarLoteVencendo = (dataVencimento: string) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diasAteVencimento = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasAteVencimento < 0) return 'text-red-600 bg-red-50';
    if (diasAteVencimento <= 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (!isOpen || !produto) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl leading-6 font-semibold text-gray-900 mb-2">
                  Detalhes do Estoque
                </h3>
                <div className="flex items-center space-x-2">
                  <h4 className="text-lg font-medium text-gray-700">{produto.nome}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusEstoqueColor(produto.estoqueTotal, produto.estoqueMinimo)}`}>
                    {getStatusEstoqueTexto(produto.estoqueTotal, produto.estoqueMinimo)}
                  </span>
                </div>
                {produto.codigoBarras && (
                  <p className="text-sm text-gray-500">Código: {produto.codigoBarras}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'info'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Informações Gerais
                </button>
                {produto.loteObrigatorio && (
                  <button
                    onClick={() => setActiveTab('lotes')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'lotes'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Lotes ({produto.totalLotes})
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('historico')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'historico'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Histórico de Movimentações
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Carregando detalhes...</span>
              </div>
            ) : (
              <>
                {/* Tab: Informações Gerais */}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Estoque */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <CubeIcon className="h-5 w-5 text-gray-600 mr-2" />
                        <h5 className="font-medium text-gray-900">Estoque</h5>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Quantidade Atual:</span>
                          <span className="font-semibold text-lg">{produto.estoqueTotal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Estoque Mínimo:</span>
                          <span className="font-medium">{produto.estoqueMinimo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total de Lotes:</span>
                          <span className="font-medium">{produto.totalLotes}</span>
                        </div>
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-600 mr-2" />
                        <h5 className="font-medium text-gray-900">Valores</h5>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Preço Venda:</span>
                          <span className="font-semibold">{formatarMoeda(produto.precoVenda)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Preço Custo:</span>
                          <span className="font-medium">{formatarMoeda(produto.precoCusto || produto.custoMedioPonderado || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Valor Total Estoque:</span>
                          <span className="font-semibold text-green-600">
                            {formatarMoeda(produto.estoqueTotal * produto.precoVenda)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Produto Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-3">Informações do Produto</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Categoria:</span>
                          <span className="font-medium">{produto.categoria}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Classificação ANVISA:</span>
                          <span className="font-medium">{produto.classificacaoAnvisa}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Exige Receita:</span>
                          <span className={`font-medium ${produto.exigeReceita ? 'text-red-600' : 'text-green-600'}`}>
                            {produto.exigeReceita ? 'Sim' : 'Não'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Controle de Lote:</span>
                          <span className={`font-medium ${produto.loteObrigatorio ? 'text-blue-600' : 'text-gray-600'}`}>
                            {produto.loteObrigatorio ? 'Obrigatório' : 'Opcional'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Datas */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <ClockIcon className="h-5 w-5 text-gray-600 mr-2" />
                        <h5 className="font-medium text-gray-900">Datas</h5>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Cadastrado em:</span>
                          <span className="font-medium">{produto.criadoEm ? formatarDataSimples(produto.criadoEm) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Atualizado em:</span>
                          <span className="font-medium">{produto.atualizadoEm ? formatarDataSimples(produto.atualizadoEm) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Lotes */}
                {activeTab === 'lotes' && produto.loteObrigatorio && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-4">Lotes Disponíveis</h5>
                    {lotes.length > 0 ? (
                      <div className="space-y-3">
                        {lotes.map((lote) => (
                          <div key={lote.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">{lote.numeroLote}</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${verificarLoteVencendo(lote.dataVencimento)}`}>
                                  {new Date(lote.dataVencimento) < new Date() ? 'Vencido' : 
                                   Math.ceil((new Date(lote.dataVencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <= 30 ? 
                                   'Vence em breve' : 'OK'}
                                </span>
                              </div>
                              <span className="font-semibold">{lote.quantidadeAtual} unidades</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Fabricação:</span>
                                <span className="ml-2 font-medium">{formatarDataSimples(lote.dataFabricacao)}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Vencimento:</span>
                                <span className="ml-2 font-medium">{formatarDataSimples(lote.dataVencimento)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum lote encontrado</h3>
                        <p className="mt-1 text-sm text-gray-500">Este produto não possui lotes registrados.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Histórico */}
                {activeTab === 'historico' && (
                  <div>
                    <h5 className="font-medium text-gray-900 mb-4">Últimas Movimentações</h5>
                    {movimentacoes.length > 0 ? (
                      <div className="space-y-3">
                        {movimentacoes.map((mov) => (
                          <div key={mov.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTipoMovimentacaoColor(mov.tipo)}`}>
                                  {getTipoMovimentacaoTexto(mov.tipo)}
                                </span>
                                <span className="font-semibold">{mov.quantidade > 0 ? '+' : ''}{mov.quantidade}</span>
                              </div>
                              <span className="text-sm text-gray-500">{formatarData(mov.dataMovimentacao)}</span>
                            </div>
                            <div className="text-sm">
                              <div className="mb-1">
                                <span className="text-gray-600">Motivo:</span>
                                <span className="ml-2 font-medium">{mov.motivo}</span>
                              </div>
                              {mov.observacoes && (
                                <div className="mb-1">
                                  <span className="text-gray-600">Observações:</span>
                                  <span className="ml-2">{mov.observacoes}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-600">Usuário:</span>
                                <span className="ml-2">{mov.usuario.nome}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma movimentação encontrada</h3>
                        <p className="mt-1 text-sm text-gray-500">Este produto ainda não possui movimentações registradas.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalhesEstoqueModal;