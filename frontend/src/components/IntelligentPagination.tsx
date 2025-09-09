/**
 * Componente de Paginação Inteligente - Sistema de Farmácia
 * 
 * Implementa paginação avançada com recursos de:
 * - Configuração adaptativa de itens por página
 * - Navegação inteligente com saltos
 * - Cache e pré-carregamento
 * - Indicadores visuais de progresso
 * - Persistência de preferências
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  Cog6ToothIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface IntelligentPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  loading?: boolean;
  className?: string;
  // Configurações avançadas
  showPageSizeSelector?: boolean;
  showProgress?: boolean;
  enableJumpToPage?: boolean;
  enablePreloading?: boolean;
  storageKey?: string; // Para persistir preferências
  availablePageSizes?: number[];
  // Callbacks para otimização
  onPreloadPage?: (page: number) => void;
  onCachePage?: (page: number, data: any) => void;
}

interface PaginationConfig {
  pageSize: number;
  density: 'compact' | 'normal' | 'comfortable';
  showProgress: boolean;
  enablePreloading: boolean;
}

const IntelligentPagination: React.FC<IntelligentPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
  loading = false,
  className = '',
  showPageSizeSelector = true,
  showProgress = true,
  enableJumpToPage = true,
  enablePreloading = true,
  storageKey = 'audit-pagination-config',
  availablePageSizes = [10, 20, 50, 100],
  onPreloadPage,
  onCachePage
}) => {
  const [inputPage, setInputPage] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<PaginationConfig>({
    pageSize: 20,
    density: 'normal',
    showProgress: true,
    enablePreloading: true
  });

  /**
   * Carrega configurações salvas do localStorage
   */
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(storageKey);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações de paginação:', error);
    }
  }, [storageKey]);

  /**
   * Salva configurações no localStorage
   */
  const saveConfig = useCallback((newConfig: Partial<PaginationConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedConfig));
    } catch (error) {
      console.warn('Erro ao salvar configurações de paginação:', error);
    }
  }, [config, storageKey]);

  /**
   * Detecta tamanho da tela e sugere configuração adaptativa
   */
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      let suggestedPageSize = config.pageSize;
      let suggestedDensity = config.density;

      // Adaptar baseado no tamanho da tela
      if (width < 640) { // mobile
        suggestedPageSize = Math.min(config.pageSize, 10);
        suggestedDensity = 'compact';
      } else if (width < 1024) { // tablet
        suggestedPageSize = Math.min(config.pageSize, 20);
        suggestedDensity = 'normal';
      } else { // desktop
        suggestedDensity = 'comfortable';
      }

      if (suggestedPageSize !== config.pageSize || suggestedDensity !== config.density) {
        saveConfig({
          pageSize: suggestedPageSize,
          density: suggestedDensity
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Executar na inicialização

    return () => window.removeEventListener('resize', handleResize);
  }, [config.pageSize, config.density, saveConfig]);

  /**
   * Pré-carrega próximas páginas se habilitado
   */
  useEffect(() => {
    if (enablePreloading && config.enablePreloading && onPreloadPage && !loading) {
      // Pré-carregar próxima página
      if (currentPage < totalPages) {
        const timer = setTimeout(() => {
          onPreloadPage(currentPage + 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentPage, totalPages, enablePreloading, config.enablePreloading, onPreloadPage, loading]);

  /**
   * Gera páginas inteligentes para navegação
   */
  const getIntelligentPages = (): (number | 'input' | 'gap')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'input' | 'gap')[] = [];
    const delta = 2;

    // Sempre mostrar primeira página
    pages.push(1);

    // Gap após primeira página se necessário
    if (currentPage - delta > 2) {
      pages.push('gap');
    }

    // Páginas ao redor da página atual
    const start = Math.max(2, currentPage - delta);
    const end = Math.min(totalPages - 1, currentPage + delta);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Input para navegação rápida no meio
    if (totalPages > 10 && currentPage > 5 && currentPage < totalPages - 4) {
      pages.push('input');
    }

    // Gap antes da última página se necessário
    if (currentPage + delta < totalPages - 1) {
      pages.push('gap');
    }

    // Sempre mostrar última página
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  /**
   * Calcula progresso da paginação
   */
  const getProgress = () => {
    if (totalPages <= 1) return 100;
    return Math.round(((currentPage - 1) / (totalPages - 1)) * 100);
  };

  /**
   * Submete navegação via input
   */
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
    setInputPage('');
  };

  /**
   * Manipula mudança no tamanho da página
   */
  const handlePageSizeChange = (newSize: number) => {
    saveConfig({ pageSize: newSize });
    if (onPageSizeChange) {
      onPageSizeChange(newSize);
    }
  };

  /**
   * Navega para primeira/última página
   */
  const jumpToFirst = () => onPageChange(1);
  const jumpToLast = () => onPageChange(totalPages);

  // Não mostrar se só tem 1 página
  if (totalPages <= 1) return null;

  const intelligentPages = getIntelligentPages();
  const progress = getProgress();

  return (
    <div className={`bg-white border-t border-gray-200 ${className}`}>
      {/* Barra de progresso se habilitada */}
      {showProgress && config.showProgress && (
        <div className="w-full bg-gray-200 h-1">
          <div
            className="bg-blue-600 h-1 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="px-4 py-3">
        {/* Mobile - versão simplificada */}
        <div className="flex justify-between items-center sm:hidden">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Anterior
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              {currentPage} de {totalPages}
            </span>
            {showProgress && (
              <div className="text-xs text-gray-500">
                ({progress}%)
              </div>
            )}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>

        {/* Desktop - versão completa */}
        <div className="hidden sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando página <span className="font-medium">{currentPage}</span> de{' '}
                <span className="font-medium">{totalPages}</span>
                {' '}({totalItems} itens total)
              </p>
              {showProgress && config.showProgress && (
                <p className="text-xs text-gray-500">
                  Progresso: {progress}% navegado
                </p>
              )}
            </div>

            {/* Seletor de itens por página */}
            {showPageSizeSelector && onPageSizeChange && (
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700">Itens:</label>
                <select
                  value={config.pageSize}
                  onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {availablePageSizes.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-1">
            {/* Botão de configurações */}
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="Configurações de paginação"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>

            {/* Navegação principal */}
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              {/* Botão para primeira página */}
              <button
                onClick={jumpToFirst}
                disabled={currentPage === 1 || loading}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Primeira página"
              >
                <ChevronDoubleLeftIcon className="h-5 w-5" />
              </button>

              {/* Botão anterior */}
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Página anterior"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>

              {/* Páginas inteligentes */}
              {intelligentPages.map((item, index) => {
                if (item === 'gap') {
                  return (
                    <span
                      key={`gap-${index}`}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                    >
                      ...
                    </span>
                  );
                }

                if (item === 'input') {
                  return (
                    <div key="input" className="relative inline-flex">
                      <form onSubmit={handleInputSubmit}>
                        <input
                          type="number"
                          value={inputPage}
                          onChange={(e) => setInputPage(e.target.value)}
                          placeholder="Ir"
                          min="1"
                          max={totalPages}
                          disabled={loading}
                          className="w-12 px-1 py-2 border border-gray-300 bg-white text-sm font-medium text-center focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                          title={`Digite um número de 1 a ${totalPages}`}
                        />
                      </form>
                    </div>
                  );
                }

                const pageNum = item as number;
                const isCurrentPage = currentPage === pageNum;

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    disabled={loading}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors duration-150 ${
                      isCurrentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={`Ir para página ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Botão próxima */}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Próxima página"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>

              {/* Botão para última página */}
              <button
                onClick={jumpToLast}
                disabled={currentPage === totalPages || loading}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Última página"
              >
                <ChevronDoubleRightIcon className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>

        {/* Painel de configurações */}
        {showConfig && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Configurações de Paginação
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.showProgress}
                    onChange={(e) => saveConfig({ showProgress: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Mostrar progresso</span>
                </label>
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enablePreloading}
                    onChange={(e) => saveConfig({ enablePreloading: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Pré-carregamento</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligentPagination;