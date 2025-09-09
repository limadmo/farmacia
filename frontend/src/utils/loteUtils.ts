/**
 * Utilitários para controle de lotes - Sistema de Farmácia
 */

import { Produto } from '../types/produto';

/**
 * Determina se um produto requer seleção manual de lotes
 * Critério: medicamentos controlados OU produtos com loteObrigatorio = true
 */
export const requerLoteObrigatorio = (produto: Produto): boolean => {
  // Medicamentos controlados (exigem receita ou têm classe controlada)
  const ehMedicamentoControlado = produto.exigeReceita || 
                                  (produto.classeControlada && produto.classeControlada.trim() !== '');
  
  // Produtos com controle de lote explícito
  const temControleExplicito = produto.loteObrigatorio === true;
  
  return ehMedicamentoControlado || temControleExplicito;
};

/**
 * Determina o tipo de produto para categorização na interface
 */
export const obterTipoProdutoLote = (produto: Produto): 'controlado' | 'lote-obrigatorio' | 'comum' => {
  const ehControlado = produto.exigeReceita || 
                       (produto.classeControlada && produto.classeControlada.trim() !== '');
  
  if (ehControlado) {
    return 'controlado';
  }
  
  if (produto.loteObrigatorio === true) {
    return 'lote-obrigatorio';
  }
  
  return 'comum';
};

/**
 * Formatar data de validade para exibição
 */
export const formatarDataValidade = (data: Date): string => {
  return new Date(data).toLocaleDateString('pt-BR');
};

/**
 * Calcular dias para vencimento
 */
export const calcularDiasParaVencimento = (dataValidade: Date): number => {
  const hoje = new Date();
  const vencimento = new Date(dataValidade);
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Determinar cor do indicador de vencimento
 */
export const obterCorVencimento = (diasParaVencimento: number): string => {
  if (diasParaVencimento < 0) return 'text-red-600'; // Vencido
  if (diasParaVencimento <= 30) return 'text-orange-600'; // Próximo do vencimento
  if (diasParaVencimento <= 90) return 'text-yellow-600'; // Atenção
  return 'text-green-600'; // OK
};

/**
 * Validar se quantidade selecionada está correta
 */
export const validarQuantidadeLotes = (quantidadeSolicitada: number, quantidadeSelecionada: number): boolean => {
  return quantidadeSelecionada === quantidadeSolicitada;
};

/**
 * Obter descrição do status de controle de lote
 */
export const obterDescricaoControle = (produto: Produto): string => {
  const tipo = obterTipoProdutoLote(produto);
  
  switch (tipo) {
    case 'controlado':
      return 'Medicamento Controlado - Lote Obrigatório';
    case 'lote-obrigatorio':
      return 'Controle de Lote Obrigatório';
    case 'comum':
      return 'FEFO Automático';
    default:
      return 'FEFO Automático';
  }
};