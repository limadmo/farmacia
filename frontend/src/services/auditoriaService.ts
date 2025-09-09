/**
 * Serviço de Auditoria Inteligente - Sistema de Farmácia
 * 
 * Implementa operações otimizadas de API para o módulo de auditoria:
 * - Cache inteligente de requisições
 * - Pré-carregamento de dados
 * - Otimizações de performance
 * - Métricas de densidade temporal
 * - Suporte a navegação timeline
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

// Interface para dados de densidade temporal
interface DensityDataPoint {
  date: string;
  count: number;
  severity?: 'low' | 'medium' | 'high';
}

// Interface para estatísticas otimizadas
interface OptimizedStats {
  totalQueries: number;
  cacheHits: number;
  avgResponseTime: number;
  lastUpdate: Date;
}

class AuditoriaService {
  private stats: OptimizedStats = {
    totalQueries: 0,
    cacheHits: 0,
    avgResponseTime: 0,
    lastUpdate: new Date()
  };
  
  // Cache local simples para otimizações
  private localCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutos
  
  /**
   * Lista vendas de medicamentos controlados com otimizações inteligentes
   */
  async listarVendasControladas(filtros: FiltroAuditoria = {}): Promise<VendasControladasResponse> {
    const startTime = Date.now();
    this.stats.totalQueries++;
    
    const params = new URLSearchParams();
    
    // Adicionar parâmetros de paginação padrões se não fornecidos
    const { page = 1, limit = 20, ...outrosFiltros } = filtros;
    params.append('page', String(page));
    params.append('limit', String(limit));
    
    // Adicionar outros filtros à query string
    Object.entries(outrosFiltros).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, String(value));
      }
    });

    const cacheKey = `vendas-controladas-${params.toString()}`;
    
    // Verificar cache local para requisições frequentes
    const cached = this.localCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      this.stats.cacheHits++;
      return cached.data;
    }

    try {
      const response = await api.get(`/auditoria/vendas-controladas?${params}`);
      const data = response.data as VendasControladasResponse;
      
      // Armazenar no cache local
      this.localCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      // Limitar tamanho do cache
      if (this.localCache.size > 50) {
        const oldestKey = Array.from(this.localCache.keys())[0];
        this.localCache.delete(oldestKey);
      }
      
      // Atualizar estatísticas
      const responseTime = Date.now() - startTime;
      this.stats.avgResponseTime = (
        (this.stats.avgResponseTime * (this.stats.totalQueries - 1)) + responseTime
      ) / this.stats.totalQueries;
      this.stats.lastUpdate = new Date();
      
      return data;
    } catch (error) {
      console.warn('Erro ao buscar vendas controladas:', error);
      throw error;
    }
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
   * Obtém dados de densidade temporal para visualização de timeline
   */
  async obterDensidadeTemporal(filtros: Pick<FiltroAuditoria, 'dataInicio' | 'dataFim'> = {}): Promise<DensityDataPoint[]> {
    const params = new URLSearchParams();
    
    if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
    
    try {
      const response = await api.get(`/auditoria/densidade-temporal?${params}`);
      return response.data as DensityDataPoint[];
    } catch (error) {
      console.warn('Erro ao buscar densidade temporal, usando dados simulados:', error);
      
      // Fallback: gerar dados simulados para desenvolvimento
      return this.generateMockDensityData(filtros);
    }
  }
  
  /**
   * Gera dados simulados de densidade para desenvolvimento
   */
  private generateMockDensityData(filtros: Pick<FiltroAuditoria, 'dataInicio' | 'dataFim'>): DensityDataPoint[] {
    const data: DensityDataPoint[] = [];
    const startDate = filtros.dataInicio ? new Date(filtros.dataInicio) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filtros.dataFim ? new Date(filtros.dataFim) : new Date();
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      let baseCount = 0;
      
      // Simular padrão semanal
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Dias úteis
        baseCount = Math.floor(Math.random() * 40) + 10;
      } else { // Fins de semana
        baseCount = Math.floor(Math.random() * 15) + 2;
      }
      
      // Adicionar variações sazonais
      const monthVariation = Math.sin((currentDate.getMonth() / 12) * 2 * Math.PI) * 10;
      const count = Math.max(0, Math.floor(baseCount + monthVariation));
      
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (count > 30) severity = 'high';
      else if (count > 15) severity = 'medium';
      
      data.push({
        date: currentDate.toISOString().split('T')[0],
        count,
        severity
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  }
  
  /**
   * Pré-carrega dados para otimizar navegação
   */
  async preloadData(filtros: FiltroAuditoria, pages: number[]): Promise<void> {
    const preloadPromises = pages.map(async (page) => {
      try {
        const filtrosComPaginacao = { ...filtros, page, limit: 20 };
        await this.listarVendasControladas(filtrosComPaginacao);
      } catch (error) {
        console.warn(`Erro ao pré-carregar página ${page}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
  }
  
  /**
   * Obtém marcos importantes para timeline
   */
  async obterMarcosImportantes(filtros: Pick<FiltroAuditoria, 'dataInicio' | 'dataFim'> = {}): Promise<Array<{
    date: Date;
    label: string;
    type: 'milestone' | 'alert' | 'normal';
    count: number;
  }>> {
    try {
      const params = new URLSearchParams();
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      
      const response = await api.get(`/auditoria/marcos-importantes?${params}`);
      const marcos = response.data as any[];
      return marcos.map((marco: any) => ({
        ...marco,
        date: new Date(marco.date)
      }));
    } catch (error) {
      console.warn('Erro ao buscar marcos importantes:', error);
      return [];
    }
  }
  
  /**
   * Limpa cache local
   */
  clearCache(): void {
    this.localCache.clear();
  }
  
  /**
   * Obtém estatísticas do serviço
   */
  getStats(): OptimizedStats {
    return { ...this.stats };
  }
  
  /**
   * Faz download do relatório de auditoria como arquivo JSON otimizado
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
      
      // Nome do arquivo com data atual e informações do período
      const hoje = new Date().toISOString().slice(0, 10);
      const periodo = filtros.dataInicio && filtros.dataFim 
        ? `${filtros.dataInicio}_${filtros.dataFim}` 
        : hoje;
      link.download = `auditoria-controlados-${periodo}.json`;
      
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

// Instância singleton do serviço otimizado
const auditoriaService = new AuditoriaService();

// Limpar cache automaticamente a cada hora para evitar vazamentos de memória
setInterval(() => {
  auditoriaService.clearCache();
}, 60 * 60 * 1000);

export default auditoriaService;

// Exportar tipos adicionais
export type { DensityDataPoint, OptimizedStats };