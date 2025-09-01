/**
 * Serviço de Vendas - Sistema de Farmácia
 * 
 * Implementa operações de API para o módulo de vendas.
 */

import api from './api';
import { Venda, CriarVendaData, AtualizarVendaData, VendaListResponse, VendaFiltros } from '../types/venda';

// Interfaces importadas de '../types/venda'

class VendaService {
  /**
   * Lista vendas com filtros e paginação
   */
  async listarVendas(filtros: VendaFiltros = {}): Promise<VendaListResponse> {
    const params = new URLSearchParams();
    
    // Adicionar filtros à query string
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/vendas?${params}`);
    return response.data as VendaListResponse;
  }

  /**
   * Busca uma venda por ID
   */
  async buscarVendaPorId(id: string): Promise<Venda> {
    const response = await api.get(`/vendas/${id}`);
    return response.data as Venda;
  }

  /**
   * Cria uma nova venda
   */
  async criarVenda(data: CriarVendaData): Promise<Venda> {
    const response = await api.post('/vendas', data);
    return (response.data as { data: Venda }).data;
  }

  /**
   * Atualiza uma venda existente
   */
  async atualizarVenda(id: string, data: AtualizarVendaData): Promise<Venda> {
    const response = await api.patch(`/vendas/${id}`, data);
    return (response.data as { data: Venda }).data;
  }

  /**
   * Cancela uma venda
   */
  async cancelarVenda(id: string): Promise<Venda> {
    const response = await api.post(`/vendas/${id}/cancelar`);
    return (response.data as { data: Venda }).data;
  }

  /**
   * Finaliza o pagamento de uma venda
   */
  async finalizarPagamento(id: string): Promise<Venda> {
    const response = await api.post(`/vendas/${id}/finalizar-pagamento`);
    return (response.data as { data: Venda }).data;
  }

  /**
   * Registra arquivamento de receita médica
   */
  async registrarArquivamentoReceita(id: string, numeroReceita: string): Promise<Venda> {
    const response = await api.post(`/vendas/${id}/arquivar-receita`, { numeroReceita });
    return (response.data as { data: Venda }).data;
  }

  /**
   * Gera relatório de vendas por período
   */
  async gerarRelatorioVendas(filtros: Record<string, any> = {}): Promise<import('../types/venda').RelatorioVendas> {
    const params = new URLSearchParams();
    
    // Adicionar filtros à query string
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/vendas/relatorios/vendas?${params}`);
    return (response.data as { data: import('../types/venda').RelatorioVendas }).data;
  }
}

const vendaService = new VendaService();
export default vendaService;