/**
 * Serviço de Auditoria - Sistema de Farmácia
 * 
 * Implementa operações de API para o módulo de auditoria de vendas controladas.
 */

import api from './api';
import {
  VendasControladasResponse,
  VendaControlada,
  ResumoAuditoria,
  FiltroAuditoria,
  VendedoresControladosResponse,
  RelatorioAuditoria
} from '../types/auditoria';

class AuditoriaService {
  /**
   * Lista vendas de medicamentos controlados com filtros
   */
  async listarVendasControladas(filtros: FiltroAuditoria = {}): Promise<VendasControladasResponse> {
    const params = new URLSearchParams();
    
    // Adicionar filtros à query string
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const response = await api.get(`/auditoria/vendas-controladas?${params}`);
    return response.data as VendasControladasResponse;
  }

  /**
   * Obtém resumo estatístico das vendas controladas
   */
  async obterResumoAuditoria(filtros: FiltroAuditoria = {}): Promise<ResumoAuditoria> {
    const params = new URLSearchParams();
    
    // Adicionar filtros de data à query string
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);

    const response = await api.get(`/auditoria/resumo?${params}`);
    return response.data as ResumoAuditoria;
  }

  /**
   * Obtém detalhes completos de uma venda controlada específica
   */
  async obterDetalhesVenda(vendaId: string): Promise<VendaControlada> {
    const response = await api.get(`/auditoria/vendas-controladas/${vendaId}`);
    return response.data as VendaControlada;
  }

  /**
   * Lista vendedores que realizaram vendas controladas no período
   */
  async obterVendedoresComControlados(filtros: Pick<FiltroAuditoria, 'dataInicio' | 'dataFim'> = {}): Promise<VendedoresControladosResponse> {
    const params = new URLSearchParams();
    
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);

    const response = await api.get(`/auditoria/vendedores?${params}`);
    return response.data as VendedoresControladosResponse;
  }

  /**
   * Exporta relatório completo de auditoria
   */
  async exportarRelatorio(filtros: Pick<FiltroAuditoria, 'dataInicio' | 'dataFim'> = {}, formato: string = 'json'): Promise<RelatorioAuditoria> {
    const params = new URLSearchParams();
    
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
    params.append('formato', formato);

    const response = await api.get(`/auditoria/relatorio?${params}`);
    return response.data as RelatorioAuditoria;
  }

  /**
   * Faz download do relatório de auditoria como arquivo JSON
   */
  async downloadRelatorio(filtros: Pick<FiltroAuditoria, 'dataInicio' | 'dataFim'> = {}): Promise<void> {
    try {
      const relatorio = await this.exportarRelatorio(filtros);
      
      // Criar blob com o JSON
      const blob = new Blob([JSON.stringify(relatorio, null, 2)], {
        type: 'application/json'
      });
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nome do arquivo com data atual
      const hoje = new Date().toISOString().slice(0, 10);
      link.download = `auditoria-controlados-${hoje}.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download do relatório:', error);
      throw error;
    }
  }
}

const auditoriaService = new AuditoriaService();
export default auditoriaService;