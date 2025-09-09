/**
 * Modal de Seleção de Estoque para Promoções - Sistema de Farmácia
 * 
 * Permite seleção de lotes específicos para aplicar promoções quando
 * a condição de término for "Até Acabar Estoque".
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Produto } from '../types/produto';
import { LotePromocaoSelecionado } from '../types/promocao';
import { LoteDisponivel } from '../types/lote';
import { formatarDataValidade, calcularDiasParaVencimento, obterCorVencimento } from '../utils/loteUtils';
import { promocaoService } from '../services/promocaoService';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto;
  onConfirmar: (lotesSelecionados: LotePromocaoSelecionado[]) => void;
  lotesPreviamenteSelecionados?: LotePromocaoSelecionado[];
}

const SeletorEstoquePromocaoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  produto,
  onConfirmar,
  lotesPreviamenteSelecionados = []
}) => {
  const [lotesDisponiveis, setLotesDisponiveis] = useState<LoteDisponivel[]>([]);
  const [lotesSelecionados, setLotesSelecionados] = useState<{[loteId: string]: LotePromocaoSelecionado}>({});
  const [lotesComPromocao, setLotesComPromocao] = useState<Set<string>>(new Set());
  const [promocoesPorLote, setPromocoesPorLote] = useState<{[loteId: string]: any}>({});
  const [loading, setLoading] = useState(false);
  const [loadingPromocoes, setLoadingPromocoes] = useState(false);
  const [erro, setErro] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);

  // Inicializar com lotes previamente selecionados
  useEffect(() => {
    if (isOpen) {
      const lotesPrevios: {[loteId: string]: LotePromocaoSelecionado} = {};
      lotesPreviamenteSelecionados.forEach(lote => {
        lotesPrevios[lote.loteId] = lote;
      });
      setLotesSelecionados(lotesPrevios);
      carregarLotesDisponiveis();
    }
  }, [isOpen, lotesPreviamenteSelecionados]);

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

  /**
   * Verificar quais lotes já possuem promoções ativas
   */
  const verificarPromocoesPorLotes = async (lotes: LoteDisponivel[]) => {
    try {
      setLoadingPromocoes(true);
      
      const lotesComPromocaoSet = new Set<string>();
      const promocoesMap: {[loteId: string]: any} = {};
      
      // Verificar promoções para cada lote em paralelo
      const verificacoes = lotes.map(async (lote) => {
        try {
          const promocoes = await promocaoService.buscarPromocoesAplicaveis(
            { id: produto.id, laboratorio: produto.laboratorio }, 
            lote.id
          );
          
          // Filtrar apenas promoções vigentes e ativas
          const promocoesVigentes = promocoes.filter(promocao => {
            const agora = new Date();
            const inicio = new Date(promocao.dataInicio);
            const fim = new Date(promocao.dataFim);
            return promocao.ativo && agora >= inicio && agora <= fim;
          });
          
          if (promocoesVigentes.length > 0) {
            lotesComPromocaoSet.add(lote.id);
            promocoesMap[lote.id] = promocoesVigentes[0]; // Primeira promoção encontrada
          }
        } catch (error) {
          console.error(`Erro ao verificar promoções do lote ${lote.numeroLote}:`, error);
        }
      });
      
      await Promise.all(verificacoes);
      
      setLotesComPromocao(lotesComPromocaoSet);
      setPromocoesPorLote(promocoesMap);
      
    } catch (error) {
      console.error('Erro ao verificar promoções dos lotes:', error);
    } finally {
      setLoadingPromocoes(false);
    }
  };

  /**
   * Carregar lotes disponíveis para o produto
   */
  const carregarLotesDisponiveis = async () => {
    try {
      setLoading(true);
      setErro('');
      
      const lotes = await promocaoService.listarLotesDisponiveis(produto.id);
      
      if (!lotes || !Array.isArray(lotes)) {
        setErro('Erro ao carregar lotes disponíveis.');
        return;
      }
      
      // Converter para formato LoteDisponivel compatível com o componente
      const lotesProcessados: LoteDisponivel[] = lotes.map(lote => ({
        id: lote.loteId,
        numeroLote: lote.numeroLote,
        dataFabricacao: new Date(), // Não disponível na nova interface
        dataValidade: new Date(lote.dataValidade),
        quantidadeAtual: lote.quantidadeDisponivel,
        quantidadeReservada: 0,
        quantidadeDisponivel: lote.quantidadeDisponivel,
        precoCusto: lote.precoCusto || 0,
        observacoes: '',
        diasParaVencimento: lote.diasParaVencimento || calcularDiasParaVencimento(new Date(lote.dataValidade))
      }))
      .filter(lote => lote.quantidadeDisponivel > 0) // Apenas lotes com estoque
      .sort((a, b) => a.diasParaVencimento - b.diasParaVencimento); // FEFO: primeiro a vencer
      
      setLotesDisponiveis(lotesProcessados);

      // Se não há lotes disponíveis, mostrar erro
      if (lotesProcessados.length === 0) {
        setErro('Nenhum lote disponível para este produto.');
      } else {
        // Verificar promoções para os lotes carregados
        await verificarPromocoesPorLotes(lotesProcessados);
      }
    } catch (error) {
      console.error('Erro ao carregar lotes:', error);
      setErro('Erro ao carregar lotes disponíveis.');
      toast.error('Erro ao carregar lotes disponíveis');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle seleção de um lote específico
   */
  const toggleLote = (lote: LoteDisponivel) => {
    console.log('Toggle lote chamado:', lote);
    const novosLotesSelecionados = { ...lotesSelecionados };
    
    if (novosLotesSelecionados[lote.id]) {
      // Desmarcar lote
      delete novosLotesSelecionados[lote.id];
    } else {
      // Marcar lote com quantidade total disponível
      novosLotesSelecionados[lote.id] = {
        loteId: lote.id,
        numeroLote: lote.numeroLote,
        dataValidade: lote.dataValidade.toISOString(),
        quantidadeDisponivel: lote.quantidadeDisponivel,
        quantidadeAplicavel: lote.quantidadeDisponivel,
        diasParaVencimento: lote.diasParaVencimento,
        precoCusto: lote.precoCusto
      };
    }
    
    setLotesSelecionados(novosLotesSelecionados);
    
    // Atualizar estado do "Selecionar Todos"
    const totalLotes = lotesDisponiveis.length;
    const lotesSelecionadosCount = Object.keys(novosLotesSelecionados).length;
    setSelectAll(lotesSelecionadosCount === totalLotes);
  };

  /**
   * Atualizar quantidade aplicável de um lote
   */
  const atualizarQuantidadeAplicavel = (loteId: string, novaQuantidade: number) => {
    const lote = lotesSelecionados[loteId];
    if (!lote) return;

    const loteDisponivel = lotesDisponiveis.find(l => l.id === loteId);
    if (!loteDisponivel) return;

    // Validar quantidade
    const quantidadeValidada = Math.min(
      Math.max(1, novaQuantidade), 
      loteDisponivel.quantidadeDisponivel
    );

    setLotesSelecionados({
      ...lotesSelecionados,
      [loteId]: {
        ...lote,
        quantidadeAplicavel: quantidadeValidada
      }
    });
  };

  /**
   * Selecionar/Desmarcar todos os lotes
   */
  const toggleSelectAll = () => {
    if (selectAll) {
      // Desmarcar todos
      setLotesSelecionados({});
      setSelectAll(false);
    } else {
      // Selecionar todos
      const todosLotesSelecionados: {[loteId: string]: LotePromocaoSelecionado} = {};
      
      lotesDisponiveis.forEach(lote => {
        todosLotesSelecionados[lote.id] = {
          loteId: lote.id,
          numeroLote: lote.numeroLote,
          dataValidade: lote.dataValidade.toISOString(),
          quantidadeDisponivel: lote.quantidadeDisponivel,
          quantidadeAplicavel: lote.quantidadeDisponivel,
          diasParaVencimento: lote.diasParaVencimento,
          precoCusto: lote.precoCusto
        };
      });
      
      setLotesSelecionados(todosLotesSelecionados);
      setSelectAll(true);
    }
  };

  /**
   * Seleção automática FEFO (First Expire First Out)
   */
  const selecionarFEFO = () => {
    const lotesFEFO: {[loteId: string]: LotePromocaoSelecionado} = {};
    
    // Selecionar lotes próximos ao vencimento primeiro
    const lotesProximosVencimento = lotesDisponiveis
      .filter(lote => lote.diasParaVencimento <= 90) // Próximos 90 dias
      .slice(0, 5); // Máximo 5 lotes

    if (lotesProximosVencimento.length === 0) {
      toast.error('Não há lotes próximos ao vencimento (90 dias)');
      return;
    }

    lotesProximosVencimento.forEach(lote => {
      lotesFEFO[lote.id] = {
        loteId: lote.id,
        numeroLote: lote.numeroLote,
        dataValidade: lote.dataValidade.toISOString(),
        quantidadeDisponivel: lote.quantidadeDisponivel,
        quantidadeAplicavel: lote.quantidadeDisponivel,
        diasParaVencimento: lote.diasParaVencimento,
        precoCusto: lote.precoCusto
      };
    });

    setLotesSelecionados(lotesFEFO);
    setSelectAll(false);
    
    toast.success(`${lotesProximosVencimento.length} lotes FEFO selecionados (próximos ao vencimento)`);
  };

  /**
   * Confirmar seleção
   */
  const confirmarSelecao = () => {
    const lotesParaConfirmar = Object.values(lotesSelecionados);
    
    if (lotesParaConfirmar.length === 0) {
      toast.error('Selecione pelo menos um lote');
      return;
    }

    onConfirmar(lotesParaConfirmar);
    onClose();
  };

  if (!isOpen) return null;

  const lotesSelecionadosArray = Object.values(lotesSelecionados);
  const totalQuantidadeAplicavel = lotesSelecionadosArray.reduce(
    (total, lote) => total + lote.quantidadeAplicavel, 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Seleção de Estoque para Promoção
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {produto.nome} - Selecione os lotes que participarão da promoção
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🎯 Estoque Promocional
              </span>
              {lotesSelecionadosArray.length > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {lotesSelecionadosArray.length} lotes selecionados ({totalQuantidadeAplicavel} unidades)
                </span>
              )}
              {lotesComPromocao.size > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  🎉 {lotesComPromocao.size} lotes em promoção
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Carregando lotes disponíveis...</p>
            </div>
          )}

          {loadingPromocoes && !loading && (
            <div className="text-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-gray-500 mt-1 text-sm">Verificando promoções...</p>
            </div>
          )}

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{erro}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !erro && lotesDisponiveis.length > 0 && (
            <>
              {/* Botões de ação */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={toggleSelectAll}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    selectAll 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {selectAll ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </button>
                <button
                  onClick={selecionarFEFO}
                  className="px-4 py-2 text-sm font-medium text-orange-700 bg-orange-100 rounded-md hover:bg-orange-200"
                >
                  🕒 FEFO (Próximos ao Vencimento)
                </button>
              </div>

              {/* Tabela de lotes */}
              <div className="overflow-y-auto max-h-96 border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Seleção
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lote
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Validade
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd. Disponível
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd. Aplicável
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lotesDisponiveis.map((lote) => {
                      const estaSelecionado = !!lotesSelecionados[lote.id];
                      const temPromocao = lotesComPromocao.has(lote.id);
                      const promocao = promocoesPorLote[lote.id];
                      const corVencimento = obterCorVencimento(lote.diasParaVencimento);

                      // Definir classes CSS baseadas no estado
                      let rowClasses = 'hover:bg-gray-50';
                      if (estaSelecionado && temPromocao) {
                        rowClasses = 'bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-l-blue-400 border-r-4 border-r-green-500';
                      } else if (estaSelecionado) {
                        rowClasses = 'bg-blue-50 border-l-4 border-blue-400';
                      } else if (temPromocao) {
                        rowClasses = 'bg-green-50 border-l-4 border-green-500 hover:bg-green-100';
                      }

                      return (
                        <tr
                          key={lote.id}
                          className={rowClasses}
                          title={temPromocao ? `🎉 Lote em promoção: ${promocao?.nome || 'Promoção ativa'}` : undefined}
                        >
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleLote(lote)}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                estaSelecionado
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'border-gray-300 hover:border-blue-400'
                              }`}
                            >
                              {estaSelecionado && <CheckIcon className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {lote.numeroLote}
                              </div>
                              {temPromocao && (
                                <span className="text-green-600" title={`Promoção: ${promocao?.nome}`}>
                                  🎉
                                </span>
                              )}
                            </div>
                            {temPromocao && promocao && (
                              <div className="text-xs text-green-600 mt-1">
                                {promocao.nome}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className={`text-sm ${corVencimento}`}>
                              {formatarDataValidade(lote.dataValidade)}
                            </div>
                            <div className={`text-xs ${corVencimento}`}>
                              {lote.diasParaVencimento > 0 
                                ? `${lote.diasParaVencimento} dias`
                                : 'Vencido'
                              }
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900">
                              {lote.quantidadeDisponivel} un
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {estaSelecionado ? (
                              <input
                                type="number"
                                min="1"
                                max={lote.quantidadeDisponivel}
                                value={lotesSelecionados[lote.id].quantidadeAplicavel}
                                onChange={(e) => atualizarQuantidadeAplicavel(lote.id, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                              />
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              lote.diasParaVencimento <= 30 
                                ? 'bg-red-100 text-red-800'
                                : lote.diasParaVencimento <= 90
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {lote.diasParaVencimento <= 0 
                                ? '🔴 Vencido'
                                : lote.diasParaVencimento <= 30
                                ? '🟡 Vence em breve'
                                : lote.diasParaVencimento <= 90
                                ? '🟠 Atenção'
                                : '🟢 OK'
                              }
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        {!loading && !erro && (
          <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {lotesSelecionadosArray.length > 0 ? (
                <>
                  <span className="font-medium">{lotesSelecionadosArray.length}</span> lotes selecionados
                  {' • '}
                  <span className="font-medium">{totalQuantidadeAplicavel}</span> unidades total
                </>
              ) : (
                'Nenhum lote selecionado'
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarSelecao}
                disabled={lotesSelecionadosArray.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Seleção
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeletorEstoquePromocaoModal;