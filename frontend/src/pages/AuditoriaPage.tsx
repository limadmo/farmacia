/**
 * Página de Auditoria - Sistema de Farmácia
 * 
 * Interface para auditoria de vendas de medicamentos controlados.
 * Acesso restrito a farmacêuticos, gerentes e administradores.
 */

import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  ChartBarIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import {
  VendaControlada,
  FiltroAuditoria,
  ResumoAuditoria,
  VendedoresControladosResponse
} from '../types/auditoria';
import auditoriaService from '../services/auditoriaService';
import toast from 'react-hot-toast';

interface DetalhesModalProps {
  venda: VendaControlada | null;
  isOpen: boolean;
  onClose: () => void;
}

const DetalhesModal: React.FC<DetalhesModalProps> = ({ venda, isOpen, onClose }) => {
  if (!isOpen || !venda) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Detalhes da Venda Controlada</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="mt-4 space-y-4">
          {/* Informações gerais */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Data da Venda</label>
              <p className="text-sm text-gray-900">{new Date(venda.dataVenda).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Valor Total</label>
              <p className="text-sm text-gray-900">R$ {venda.valorTotal.toFixed(2)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Número da Receita</label>
              <p className="text-sm text-gray-900">{venda.numeroReceita || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Data da Receita</label>
              <p className="text-sm text-gray-900">
                {venda.dataReceita ? new Date(venda.dataReceita).toLocaleDateString('pt-BR') : 'N/A'}
              </p>
            </div>
          </div>

          {/* Vendedor */}
          <div>
            <label className="text-sm font-medium text-gray-500">Vendedor</label>
            <div className="flex items-center space-x-2">
              <p className="text-sm text-gray-900">{venda.vendedor.nome}</p>
              <span className={`px-2 py-1 text-xs rounded-full ${
                venda.vendaAssistida 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {venda.vendaAssistida ? 'Venda Assistida' : venda.vendedor.tipo}
              </span>
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="text-sm font-medium text-gray-500">Cliente</label>
            <p className="text-sm text-gray-900">
              {venda.cliente.nome} {venda.cliente.documento && `(${venda.cliente.documento})`}
            </p>
          </div>

          {/* Produtos controlados */}
          <div>
            <label className="text-sm font-medium text-gray-500">Medicamentos Controlados</label>
            <div className="mt-2 space-y-2">
              {venda.produtos.map((produto, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{produto.nome}</h4>
                      <p className="text-xs text-gray-500">Classificação: {produto.classificacao}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">Qtd: {produto.quantidade}</p>
                      <p className="text-xs text-gray-500">R$ {produto.precoUnitario.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Justificativa se for venda assistida */}
          {venda.vendaAssistida && venda.justificativa && (
            <div>
              <label className="text-sm font-medium text-gray-500">Justificativa da Venda Assistida</label>
              <p className="text-sm text-gray-900 bg-yellow-50 p-2 rounded border">
                {venda.justificativa}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const AuditoriaPage: React.FC = () => {
  const [vendas, setVendas] = useState<VendaControlada[]>([]);
  const [resumo, setResumo] = useState<ResumoAuditoria | null>(null);
  const [, setVendedores] = useState<VendedoresControladosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaControlada | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [filtros, setFiltros] = useState<FiltroAuditoria>({
    dataInicio: '',
    dataFim: '',
    vendedorId: '',
    numeroReceita: '',
    tipoUsuario: '',
    apenasVendasAssistidas: false
  });

  // Carregar dados inicial
  useEffect(() => {
    carregarDados();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const carregarDados = async (filtrosAplicados: FiltroAuditoria = filtros) => {
    try {
      setLoading(true);
      
      const [vendasData, resumoData, vendedoresData] = await Promise.all([
        auditoriaService.listarVendasControladas(filtrosAplicados),
        auditoriaService.obterResumoAuditoria(filtrosAplicados),
        auditoriaService.obterVendedoresComControlados({
          dataInicio: filtrosAplicados.dataInicio,
          dataFim: filtrosAplicados.dataFim
        })
      ]);

      setVendas(vendasData.vendas);
      setResumo(resumoData);
      setVendedores(vendedoresData);
    } catch (error) {
      console.error('Erro ao carregar dados de auditoria:', error);
      toast.error('Erro ao carregar dados de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    carregarDados(filtros);
  };

  const limparFiltros = () => {
    const filtrosLimpos: FiltroAuditoria = {
      dataInicio: '',
      dataFim: '',
      vendedorId: '',
      numeroReceita: '',
      tipoUsuario: '',
      apenasVendasAssistidas: false
    };
    setFiltros(filtrosLimpos);
    carregarDados(filtrosLimpos);
  };

  const handleDownloadRelatorio = async () => {
    try {
      await auditoriaService.downloadRelatorio({
        dataInicio: filtros.dataInicio,
        dataFim: filtros.dataFim
      });
      toast.success('Relatório baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar relatório');
    }
  };

  const abrirDetalhes = (venda: VendaControlada) => {
    setVendaSelecionada(venda);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auditoria de Medicamentos Controlados</h1>
            <p className="text-gray-600">Monitoramento e rastreabilidade de vendas controladas</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFiltrosVisible(!filtrosVisible)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filtros
            </button>
            <button
              onClick={handleDownloadRelatorio}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Exportar Relatório
            </button>
          </div>
        </div>

        {/* Filtros */}
        {filtrosVisible && (
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número da Receita</label>
                <input
                  type="text"
                  value={filtros.numeroReceita}
                  onChange={(e) => setFiltros({...filtros, numeroReceita: e.target.value})}
                  placeholder="Digite o número da receita"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Usuário</label>
                <select
                  value={filtros.tipoUsuario}
                  onChange={(e) => setFiltros({...filtros, tipoUsuario: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Todos</option>
                  <option value="FARMACEUTICO">Farmacêutico</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="PDV">PDV</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="vendasAssistidas"
                  checked={filtros.apenasVendasAssistidas}
                  onChange={(e) => setFiltros({...filtros, apenasVendasAssistidas: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="vendasAssistidas" className="ml-2 text-sm text-gray-700">
                  Apenas vendas assistidas
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={limparFiltros}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Limpar
              </button>
              <button
                onClick={aplicarFiltros}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Cards de Resumo */}
        {resumo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{resumo.totalVendasControladas}</h3>
                  <p className="text-sm text-gray-600">Vendas Controladas</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{resumo.totalVendasAssistidas}</h3>
                  <p className="text-sm text-gray-600">Vendas Assistidas</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{resumo.totalVendedores}</h3>
                  <p className="text-sm text-gray-600">Vendedores Ativos</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">R$ {resumo.valorTotalPeriodo.toFixed(2)}</h3>
                  <p className="text-sm text-gray-600">Valor Total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de Vendas */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Vendas de Medicamentos Controlados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendas.map((venda) => (
                  <tr key={venda.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(venda.dataVenda).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{venda.vendedor.nome}</div>
                        <div className="text-sm text-gray-500">{venda.vendedor.tipo}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venda.cliente.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {venda.numeroReceita || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      R$ {venda.valorTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {venda.vendaAssistida ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Venda Assistida
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Regular
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => abrirDetalhes(venda)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vendas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma venda controlada encontrada no período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* Modal de Detalhes */}
        <DetalhesModal
          venda={vendaSelecionada}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default AuditoriaPage;