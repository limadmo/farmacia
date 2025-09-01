/**
 * Página de Detalhes da Venda - Sistema de Farmácia
 * 
 * Exibe os detalhes de uma venda específica e permite ações como
 * finalizar pagamento, cancelar venda e registrar arquivamento de receita.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import vendaService from '../services/vendaService';
import { Venda, FormaPagamento, StatusPagamento } from '../types/venda';
import toast from 'react-hot-toast';

const DetalhesVendaPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [numeroReceita, setNumeroReceita] = useState('');
  const [showArquivarReceita, setShowArquivarReceita] = useState(false);
  
  // Carregar dados da venda
  useEffect(() => {
    if (!id) return;
    
    const carregarVenda = async () => {
      try {
        setLoading(true);
        const data = await vendaService.buscarVendaPorId(id);
        setVenda(data);
        
        // Verificar se precisa mostrar modal de arquivamento de receita
        if (data.temMedicamentoControlado && 
            data.statusPagamento === StatusPagamento.PAGO && 
            !data.receitaArquivada) {
          setShowArquivarReceita(true);
        }
      } catch (error) {
        console.error('Erro ao carregar venda:', error);
        toast.error('Erro ao carregar dados da venda');
      } finally {
        setLoading(false);
      }
    };
    
    carregarVenda();
  }, [id]);
  
  // Finalizar pagamento
  const finalizarPagamento = async () => {
    if (!venda || !id) return;
    
    try {
      setLoadingAction(true);
      await vendaService.finalizarPagamento(id);
      
      // Recarregar venda
      const vendaAtualizada = await vendaService.buscarVendaPorId(id);
      setVenda(vendaAtualizada);
      
      toast.success('Pagamento finalizado com sucesso!');
      
      // Verificar se precisa mostrar modal de arquivamento de receita
      if (vendaAtualizada.temMedicamentoControlado && !vendaAtualizada.receitaArquivada) {
        setShowArquivarReceita(true);
      }
    } catch (error: any) {
      console.error('Erro ao finalizar pagamento:', error);
      toast.error(error.response?.data?.mensagem || 'Erro ao finalizar pagamento');
    } finally {
      setLoadingAction(false);
    }
  };
  
  // Cancelar venda
  const cancelarVenda = async () => {
    if (!venda || !id) return;
    
    if (!window.confirm('Tem certeza que deseja cancelar esta venda? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      setLoadingAction(true);
      await vendaService.cancelarVenda(id);
      
      // Recarregar venda
      const vendaAtualizada = await vendaService.buscarVendaPorId(id);
      setVenda(vendaAtualizada);
      
      toast.success('Venda cancelada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao cancelar venda:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.mensagem || error.message || 'Erro ao cancelar venda';
      toast.error(errorMessage);
    } finally {
      setLoadingAction(false);
    }
  };
  
  // Registrar arquivamento de receita
  const registrarArquivamentoReceita = async () => {
    if (!venda || !id) {
      return;
    }
    
    // Usar o número da receita da venda se já foi digitado anteriormente
    const numeroReceitaParaUsar = numeroReceita || venda.numeroReceita;
    
    if (!numeroReceitaParaUsar) {
      toast.error('Número da receita é obrigatório');
      return;
    }
    
    try {
      setLoadingAction(true);
      await vendaService.registrarArquivamentoReceita(id, numeroReceitaParaUsar);
      
      setShowArquivarReceita(false);
      setNumeroReceita('');
      
      toast.success('Receita arquivada com sucesso! Redirecionando para nova venda...');
      
      // Aguardar um pouco para mostrar a mensagem e redirecionar para nova venda
      setTimeout(() => {
        navigate('/vendas/nova');
      }, 1500);
      
    } catch (error: any) {
      console.error('Erro ao arquivar receita:', error);
      toast.error(error.response?.data?.mensagem || 'Erro ao arquivar receita');
    } finally {
      setLoadingAction(false);
    }
  };
  
  // Formatação de valores
  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  // Formatação de data
  const formatarData = (data: Date | string) => {
    const dataObj = data instanceof Date ? data : new Date(data);
    return dataObj.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Formatação de status
  const formatarStatus = (status: StatusPagamento) => {
    switch (status) {
      case StatusPagamento.PENDENTE:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pendente</span>;
      case StatusPagamento.PAGO:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Pago</span>;
      case StatusPagamento.CANCELADO:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };
  
  // Formatação de forma de pagamento
  const formatarFormaPagamento = (forma: FormaPagamento) => {
    switch (forma) {
      case FormaPagamento.DINHEIRO:
        return 'Dinheiro';
      case FormaPagamento.CARTAO_CREDITO:
        return 'Cartão de Crédito';
      case FormaPagamento.CARTAO_DEBITO:
        return 'Cartão de Débito';
      case FormaPagamento.PIX:
        return 'PIX';
      case FormaPagamento.BOLETO:
        return 'Boleto';
      case FormaPagamento.TRANSFERENCIA:
        return 'Transferência';
      case FormaPagamento.CREDITO_LOJA:
        return 'Crédito na Loja';
      default:
        return forma;
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </Layout>
    );
  }
  
  if (!venda) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Venda não encontrada</h1>
            <p className="text-gray-600 mb-4">A venda solicitada não foi encontrada ou você não tem permissão para visualizá-la.</p>
            <button
              onClick={() => navigate('/vendas')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Voltar para Vendas
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Detalhes da Venda #{venda.id.substring(0, 8)}</h1>
        </div>

        {/* Controles */}
        <div className="mb-6 flex justify-start">
          <button
            onClick={() => navigate('/vendas')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Voltar para Vendas
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Informações da venda */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Informações da Venda</h2>
                  <p className="text-gray-500">Código: {venda.id}</p>
                </div>
                <div className="text-right">
                  <div className="mb-1">{formatarStatus(venda.statusPagamento)}</div>
                  <p className="text-gray-500">Data: {formatarData(venda.criadoEm)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Forma de Pagamento</p>
                  <p className="font-medium">{formatarFormaPagamento(venda.formaPagamento)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valor Total</p>
                  <p className="font-medium">{formatarValor(venda.valorTotal)}</p>
                </div>
                {venda.dataPagamento && (
                  <div>
                    <p className="text-sm text-gray-500">Data de Pagamento</p>
                    <p className="font-medium">{formatarData(venda.dataPagamento)}</p>
                  </div>
                )}
                {venda.dataCancelamento && (
                  <div>
                    <p className="text-sm text-gray-500">Data de Cancelamento</p>
                    <p className="font-medium">{formatarData(venda.dataCancelamento)}</p>
                  </div>
                )}
                {venda.numeroReceita && (
                  <div>
                    <p className="text-sm text-gray-500">Número da Receita</p>
                    <p className="font-medium">{venda.numeroReceita}</p>
                  </div>
                )}
                {venda.receitaArquivada && (
                  <div>
                    <p className="text-sm text-gray-500">Receita Arquivada</p>
                    <p className="font-medium">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Sim</span>
                    </p>
                  </div>
                )}
              </div>
              
              {venda.observacoes && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">Observações</p>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{venda.observacoes}</p>
                </div>
              )}
              
              <div className="border-t pt-4">
                <h3 className="text-md font-semibold mb-3">Itens da Venda</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Produto
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qtd
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Preço Unit.
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Desconto
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {venda.itens.map((item, index) => {
                        const precoUnitario = item.precoUnitario || 0;
                        const quantidade = item.quantidade || 0;
                        const desconto = item.desconto || 0;
                        const subtotal = (precoUnitario * quantidade) - desconto;
                        
                        return (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.produto?.nome || 'Produto'}
                              {item.produto?.controlado && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                  Controlado
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {item.quantidade}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatarValor(precoUnitario)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatarValor(desconto)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatarValor(subtotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          {/* Coluna 2: Cliente e Ações */}
          <div>
            {/* Informações do Cliente */}
            {(venda.clienteId || venda.clienteNome) && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Dados do Cliente</h2>
                
                <div className="space-y-3">
                  {venda.clienteNome && (
                    <div>
                      <p className="text-sm text-gray-500">Nome</p>
                      <p className="font-medium">{venda.clienteNome}</p>
                    </div>
                  )}
                  
                  {venda.clienteDocumento && (
                    <div>
                      <p className="text-sm text-gray-500">{venda.clienteTipoDocumento || 'Documento'}</p>
                      <p className="font-medium">{venda.clienteDocumento}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Ações disponíveis */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Ações</h2>
              
              <div className="space-y-3">
                {venda.statusPagamento === StatusPagamento.PENDENTE && (
                  <button
                    onClick={finalizarPagamento}
                    disabled={loadingAction}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loadingAction ? 'Processando...' : 'Finalizar Pagamento'}
                  </button>
                )}
                
                {venda.statusPagamento === StatusPagamento.PENDENTE && (
                  <button
                    onClick={cancelarVenda}
                    disabled={loadingAction}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loadingAction ? 'Processando...' : 'Cancelar Venda'}
                  </button>
                )}
                
                {venda.temMedicamentoControlado && 
                 venda.statusPagamento === StatusPagamento.PAGO && 
                 !venda.receitaArquivada && (
                  <button
                    onClick={() => setShowArquivarReceita(true)}
                    disabled={loadingAction}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loadingAction ? 'Processando...' : 'Registrar Arquivamento de Receita'}
                  </button>
                )}
                
                {venda.temMedicamentoControlado && 
                 venda.statusPagamento === StatusPagamento.PAGO && 
                 venda.receitaArquivada && (
                  <button
                    onClick={() => navigate('/vendas/nova')}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    ✨ Nova Venda
                  </button>
                )}
                
                <button
                  onClick={() => window.print()}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Imprimir Comprovante
                </button>
              </div>
            </div>
            
            {/* Resumo financeiro */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">Resumo Financeiro</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatarValor(venda.valorTotal + venda.valorDesconto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Descontos:</span>
                  <span className="text-red-600">-{formatarValor(venda.valorDesconto || 0)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatarValor(venda.valorTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal de Arquivamento de Receita */}
      {showArquivarReceita && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Registrar Arquivamento de Receita</h2>
            
            {venda.numeroReceita ? (
              <div className="mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Receita já registrada:</strong> {venda.numeroReceita}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        O sistema utilizará o número da receita já informado durante a venda.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  Esta venda contém medicamentos controlados. Por favor, confirme o número da receita para registrar o arquivamento.
                </p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número da Receita</label>
                  <input
                    type="text"
                    value={numeroReceita}
                    onChange={(e) => setNumeroReceita(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Número da receita médica"
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={registrarArquivamentoReceita}
                disabled={loadingAction || (!venda.numeroReceita && !numeroReceita)}
                className={`px-8 py-2 rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${loadingAction || (!venda.numeroReceita && !numeroReceita) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {loadingAction ? 'Arquivando...' : 'Confirmar Arquivamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DetalhesVendaPage;