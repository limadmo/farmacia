/**
 * Modal de Seleção de Lotes - Sistema de Farmácia
 * 
 * Permite seleção manual de lotes para medicamentos controlados 
 * e produtos com controle de lote obrigatório.
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Produto } from '../types/produto';
import { LoteSelecionado, LoteDisponivel } from '../types/lote';
import { requerLoteObrigatorio, obterTipoProdutoLote, formatarDataValidade, calcularDiasParaVencimento, obterCorVencimento } from '../utils/loteUtils';
import { estoqueService } from '../services/estoqueService';
import { promocaoService } from '../services/promocaoService';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto;
  quantidade: number;
  onConfirmar: (lotesSelecionados: LoteSelecionado[]) => void;
}

interface SelecaoLoteIndividual {
  indice: number;
  loteId: string | null;
  numeroLote: string;
  dataValidade: Date | null;
  quantidade: number;
}

const SeletorLotesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  produto,
  quantidade,
  onConfirmar
}) => {
  const [lotesDisponiveis, setLotesDisponiveis] = useState<LoteDisponivel[]>([]);
  const [selecoes, setSelecoes] = useState<SelecaoLoteIndividual[]>([]);
  const [lotesComPromocao, setLotesComPromocao] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingPromocoes, setLoadingPromocoes] = useState(false);
  const [erro, setErro] = useState<string>('');

  /**
   * Verificar quais lotes possuem promoções ativas
   */
  const verificarPromocoesPorLotes = async (lotes: LoteDisponivel[]) => {
    try {
      setLoadingPromocoes(true);
      const promocoesMap = new Map<string, any>();
      
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
            promocoesMap.set(lote.id, promocoesVigentes[0]); // Primeira promoção encontrada
          }
        } catch (error) {
          console.error(`Erro ao verificar promoções do lote ${lote.numeroLote}:`, error);
        }
      });
      
      await Promise.all(verificacoes);
      setLotesComPromocao(promocoesMap);
      
    } catch (error) {
      console.error('Erro ao verificar promoções dos lotes:', error);
    } finally {
      setLoadingPromocoes(false);
    }
  };

  // Inicializar seleções quando modal abre
  useEffect(() => {
    if (isOpen) {
      const selecoesIniciais: SelecaoLoteIndividual[] = Array.from({ length: quantidade }, (_, i) => ({
        indice: i,
        loteId: null,
        numeroLote: '',
        dataValidade: null,
        quantidade: 1
      }));
      setSelecoes(selecoesIniciais);
      carregarLotesDisponiveis();
    }
  }, [isOpen, quantidade]);

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
   * Carregar lotes disponíveis para o produto
   */
  const carregarLotesDisponiveis = async () => {
    try {
      setLoading(true);
      setErro('');
      
      const lotes = await estoqueService.listarLotesProduto(produto.id);
      
      if (!lotes || !Array.isArray(lotes)) {
        setErro('Erro ao carregar lotes disponíveis.');
        return;
      }
      
      // Processar lotes e calcular dados adicionais
      const lotesProcessados: LoteDisponivel[] = lotes.map(lote => ({
        id: lote.id,
        numeroLote: lote.numeroLote,
        dataFabricacao: new Date(lote.dataFabricacao),
        dataValidade: new Date(lote.dataValidade),
        quantidadeAtual: lote.quantidadeAtual,
        quantidadeReservada: lote.quantidadeReservada || 0,
        quantidadeDisponivel: lote.quantidadeAtual - (lote.quantidadeReservada || 0),
        precoCusto: lote.precoCusto,
        observacoes: lote.observacoes,
        diasParaVencimento: calcularDiasParaVencimento(new Date(lote.dataValidade))
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
   * Atualizar seleção de um lote específico
   */
  const atualizarSelecao = (indice: number, loteId: string) => {
    // Se loteId está vazio, desselecionar
    if (!loteId || loteId === '') {
      setSelecoes(prev => prev.map(selecao => 
        selecao.indice === indice 
          ? {
              ...selecao,
              loteId: null,
              numeroLote: '',
              dataValidade: null
            }
          : selecao
      ));
      return;
    }

    // Encontrar lote selecionado
    const loteEscolhido = lotesDisponiveis.find(l => l.id === loteId);
    if (!loteEscolhido) return;

    // Atualizar seleção com dados do lote
    setSelecoes(prev => prev.map(selecao => 
      selecao.indice === indice 
        ? {
            ...selecao,
            loteId,
            numeroLote: loteEscolhido.numeroLote,
            dataValidade: loteEscolhido.dataValidade
          }
        : selecao
    ));
  };

  /**
   * Validar se todas as seleções estão completas e válidas
   */
  const validarSelecoes = (): { valida: boolean; mensagem?: string } => {
    // Verificar se todas as unidades têm lote selecionado
    const selecoesIncompletas = selecoes.filter(s => !s.loteId);
    if (selecoesIncompletas.length > 0) {
      return {
        valida: false,
        mensagem: `Selecione lotes para todas as ${quantidade} unidades`
      };
    }

    // Verificar se há lotes suficientes (mesmo lote selecionado múltiplas vezes)
    const contadorLotes = selecoes.reduce((acc, selecao) => {
      if (selecao.loteId) {
        acc[selecao.loteId] = (acc[selecao.loteId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    for (const [loteId, quantidadeUsada] of Object.entries(contadorLotes)) {
      const lote = lotesDisponiveis.find(l => l.id === loteId);
      if (lote && quantidadeUsada > lote.quantidadeDisponivel) {
        return {
          valida: false,
          mensagem: `Lote ${lote.numeroLote} tem apenas ${lote.quantidadeDisponivel} unidades disponíveis, mas ${quantidadeUsada} foram selecionadas`
        };
      }
    }

    return { valida: true };
  };

  /**
   * Confirmar seleções e fechar modal
   */
  const confirmarSelecoes = () => {
    const validacao = validarSelecoes();
    
    if (!validacao.valida) {
      toast.error(validacao.mensagem || 'Seleções inválidas');
      return;
    }

    // Agrupar seleções por lote para criar estrutura final
    const lotesSelecionados: LoteSelecionado[] = [];
    const contadorLotes: Record<string, { lote: LoteDisponivel; quantidade: number }> = {};

    selecoes.forEach(selecao => {
      if (selecao.loteId) {
        if (!contadorLotes[selecao.loteId]) {
          const lote = lotesDisponiveis.find(l => l.id === selecao.loteId)!;
          contadorLotes[selecao.loteId] = { lote, quantidade: 0 };
        }
        contadorLotes[selecao.loteId].quantidade += 1;
      }
    });

    Object.values(contadorLotes).forEach(({ lote, quantidade }) => {
      lotesSelecionados.push({
        loteId: lote.id,
        numeroLote: lote.numeroLote,
        dataValidade: lote.dataValidade,
        quantidade
      });
    });

    onConfirmar(lotesSelecionados);
    onClose();
  };

  /**
   * Seleção automática FEFO (First Expire First Out)
   */
  const selecionarAutomaticoFEFO = () => {
    const novasSelecoes: SelecaoLoteIndividual[] = [];
    let quantidadeRestante = quantidade;
    let indiceAtual = 0;

    // Ordenar lotes priorizando promocionais (lotes com promoção ficam primeiro)
    const lotesOrdenados = [...lotesDisponiveis].sort((a, b) => {
      const aTemPromocao = lotesComPromocao.has(a.id) ? 1 : 0;
      const bTemPromocao = lotesComPromocao.has(b.id) ? 1 : 0;
      
      // Se um tem promoção e outro não, priorizar o com promoção
      if (aTemPromocao !== bTemPromocao) {
        return bTemPromocao - aTemPromocao;
      }
      
      // Se ambos têm ou não têm promoção, manter ordem FEFO (vencimento)
      return a.diasParaVencimento - b.diasParaVencimento;
    });

    // Percorrer lotes ordenados (promocionais primeiro, depois FEFO)
    for (const lote of lotesOrdenados) {
      if (quantidadeRestante <= 0) break;

      const quantidadeUsarDesseLote = Math.min(quantidadeRestante, lote.quantidadeDisponivel);
      
      // Criar seleções individuais para este lote
      for (let i = 0; i < quantidadeUsarDesseLote; i++) {
        if (indiceAtual < quantidade) {
          novasSelecoes.push({
            indice: indiceAtual,
            loteId: lote.id,
            numeroLote: lote.numeroLote,
            dataValidade: lote.dataValidade,
            quantidade: 1
          });
          indiceAtual++;
          quantidadeRestante--;
        }
      }
    }

    // Completar com seleções vazias se necessário
    while (indiceAtual < quantidade) {
      novasSelecoes.push({
        indice: indiceAtual,
        loteId: null,
        numeroLote: '',
        dataValidade: null,
        quantidade: 1
      });
      indiceAtual++;
    }

    setSelecoes(novasSelecoes);
    
    if (quantidadeRestante > 0) {
      toast.error(`Apenas ${quantidade - quantidadeRestante} unidades puderam ser selecionadas automaticamente`);
    } else {
      toast.success('Seleção automática FEFO realizada!');
    }
  };

  if (!isOpen) return null;

  const tipoProduto = obterTipoProdutoLote(produto);
  const validacao = validarSelecoes();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Seleção de Lotes
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {produto.nome} - {quantidade} unidade{quantidade > 1 ? 's' : ''}
              {lotesComPromocao.size > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  🎉 {lotesComPromocao.size} lote{lotesComPromocao.size > 1 ? 's' : ''} em promoção
                </span>
              )}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {tipoProduto === 'controlado' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                  Medicamento Controlado
                </span>
              )}
              {tipoProduto === 'lote-obrigatorio' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  🎯 Controle de Lote
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-2 text-gray-600">Carregando lotes...</span>
            </div>
          ) : erro ? (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">{erro}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Botão de seleção automática */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Selecionar lotes individualmente:
                </h3>
                <button
                  onClick={selecionarAutomaticoFEFO}
                  className="btn-secondary text-sm"
                >
                  Seleção Automática FEFO
                </button>
              </div>

              {/* Grid de seleções individuais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selecoes.map((selecao, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        Unidade {index + 1}
                      </span>
                      {selecao.dataValidade && (
                        <span className={`text-xs font-medium ${obterCorVencimento(calcularDiasParaVencimento(selecao.dataValidade))}`}>
                          {formatarDataValidade(selecao.dataValidade)}
                        </span>
                      )}
                    </div>
                    
                    <select
                      value={selecao.loteId || ''}
                      onChange={(e) => atualizarSelecao(index, e.target.value)}
                      className="w-full input-field text-sm"
                    >
                      <option value="">Selecionar lote...</option>
                      {lotesDisponiveis.map(lote => {
                        const promocao = lotesComPromocao.get(lote.id);
                        const isPromocional = !!promocao;
                        
                        // Calcular texto do desconto para lotes promocionais
                        let desconto = '';
                        if (isPromocional && promocao) {
                          if (promocao.tipo === 'PORCENTAGEM' && promocao.porcentagem_desconto != null) {
                            desconto = ` - ${Number(promocao.porcentagem_desconto)}% OFF`;
                          } else if (promocao.tipo === 'FIXO' && promocao.valor_desconto != null) {
                            desconto = ` - R$ ${Number(promocao.valor_desconto).toFixed(2)} OFF`;
                          } else {
                            // Fallback para exibir que tem promoção mesmo sem valor específico
                            desconto = ` - PROMOÇÃO`;
                          }
                        }
                        
                        return (
                          <option 
                            key={lote.id} 
                            value={lote.id}
                            className={isPromocional ? 'bg-green-50 text-green-800 font-medium' : ''}
                            style={isPromocional ? {
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              fontWeight: '500'
                            } : {}}
                          >
                            {isPromocional ? '🎉 ' : ''}{lote.numeroLote}{desconto} - Disp: {lote.quantidadeDisponivel} - Val: {formatarDataValidade(lote.dataValidade)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>

              {/* Resumo dos lotes disponíveis */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Lotes Disponíveis:
                  {loadingPromocoes && (
                    <span className="ml-2 text-xs text-gray-500">
                      <div className="inline-block animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-1"></div>
                      Verificando promoções...
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {lotesDisponiveis.map(lote => {
                    const promocao = lotesComPromocao.get(lote.id);
                    const isPromocional = !!promocao;
                    
                    return (
                      <div 
                        key={lote.id} 
                        className={`flex justify-between items-center text-sm rounded-lg p-2 ${
                          isPromocional 
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
                            : 'bg-white border border-gray-100'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {isPromocional && <span className="text-green-600">🎉</span>}
                            <span className={`font-medium ${
                              isPromocional ? 'text-green-800' : 'text-gray-900'
                            }`}>
                              {lote.numeroLote}
                            </span>
                            {isPromocional && promocao && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                {promocao.tipo === 'PORCENTAGEM' && promocao.porcentagem_desconto != null
                                  ? `${Number(promocao.porcentagem_desconto)}% OFF`
                                  : promocao.tipo === 'FIXO' && promocao.valor_desconto != null
                                  ? `R$ ${Number(promocao.valor_desconto).toFixed(2)} OFF`
                                  : 'PROMOÇÃO'
                                }
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-gray-500 text-xs">
                              Vencimento: {formatarDataValidade(lote.dataValidade)}
                            </span>
                            {isPromocional && promocao?.nomePromocao && (
                              <span className="text-green-600 text-xs font-medium" title={promocao.nomePromocao}>
                                {promocao.nomePromocao}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm ${
                          isPromocional ? 'text-green-700 font-medium' : 'text-gray-600'
                        }`}>
                          Disponível: {lote.quantidadeDisponivel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validação */}
              {!validacao.valida && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-700 text-sm">{validacao.mensagem}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarSelecoes}
            disabled={!validacao.valida || loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Seleção
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeletorLotesModal;