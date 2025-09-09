/**
 * SmartFilters - Sistema Unificado de Filtros Inteligentes
 * 
 * Componente que substitui os 3 sistemas de filtros da auditoria por uma interface
 * unificada, compacta e intuitiva com agrupamento por cores e funcionalidades inteligentes.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BookmarkIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  CurrencyDollarIcon,
  TagIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { FiltroAuditoria } from '../types/auditoria';

// Definição dos grupos de filtros com cores
export interface FilterGroup {
  id: string;
  name: string;
  color: 'blue' | 'green' | 'yellow' | 'purple';
  icon: React.ComponentType<{ className?: string }>;
  mutuallyExclusive: boolean;
  filters: FilterOption[];
}

export interface FilterOption {
  id: string;
  label: string;
  value: Partial<FiltroAuditoria>;
  description?: string;
  badge?: string; // Para mostrar contadores
}

export interface SmartFiltersProps {
  currentFilters: FiltroAuditoria;
  onFilterChange: (filters: Partial<FiltroAuditoria>) => void;
  onClearFilters: () => void;
  resultCount?: number;
  isLoading?: boolean;
  className?: string;
  onExportClick?: () => void;
  exportLoading?: boolean;
}

const SmartFilters: React.FC<SmartFiltersProps> = ({
  currentFilters,
  onFilterChange,
  onClearFilters,
  resultCount,
  isLoading,
  className = '',
  onExportClick,
  exportLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [savedFilters, setSavedFilters] = useState<Array<{id: string, name: string, filters: FiltroAuditoria}>>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');

  // Definir grupos de filtros com agrupamento por cores
  const filterGroups: FilterGroup[] = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    return [
      {
        id: 'periodo',
        name: 'Período',
        color: 'blue',
        icon: ClockIcon,
        mutuallyExclusive: true,
        filters: [
          { id: 'hoje', label: 'Hoje', value: { dataInicio: today, dataFim: today } },
          { id: 'ontem', label: 'Ontem', value: { dataInicio: yesterday, dataFim: yesterday } },
          { id: 'semana', label: 'Esta Semana', value: { dataInicio: weekStartStr, dataFim: today } },
          { id: 'mes', label: 'Este Mês', value: { 
            dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            dataFim: today 
          }},
          { id: 'personalizado', label: 'Personalizado', value: {} }
        ]
      },
      {
        id: 'tipoVenda',
        name: 'Tipo de Venda',
        color: 'green',
        icon: UserGroupIcon,
        mutuallyExclusive: true,
        filters: [
          { id: 'todas', label: 'Todas', value: {} },
          { id: 'assistidas', label: 'Apenas Assistidas', value: { apenasVendasAssistidas: true } },
          { id: 'normais', label: 'Apenas Normais', value: { apenasVendasAssistidas: false } }
        ]
      },
      {
        id: 'statusReceita',
        name: 'Status da Receita',
        color: 'yellow',
        icon: DocumentCheckIcon,
        mutuallyExclusive: true,
        filters: [
          { id: 'todas', label: 'Todas', value: {} },
          { id: 'comReceita', label: 'Com Receita', value: { comReceita: true } },
          { id: 'semReceita', label: 'Sem Receita', value: { comReceita: false } }
        ]
      }
    ];
  }, []);

  // Carregar filtros salvos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('auditoria-saved-filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.warn('Erro ao carregar filtros salvos:', error);
      }
    }
  }, []);

  // Verificar quais filtros estão ativos
  const getActiveFilters = useCallback(() => {
    const active: Array<{groupId: string, filterId: string, label: string, color: string}> = [];
    
    filterGroups.forEach(group => {
      group.filters.forEach(filter => {
        const isActive = Object.keys(filter.value).every(key => {
          const filterValue = filter.value[key as keyof FiltroAuditoria];
          const currentValue = currentFilters[key as keyof FiltroAuditoria];
          return filterValue === currentValue;
        });
        
        if (isActive && Object.keys(filter.value).length > 0) {
          active.push({
            groupId: group.id,
            filterId: filter.id,
            label: filter.label,
            color: group.color
          });
        }
      });
    });

    // Adicionar filtros personalizados (vendedor, receita, etc.)
    if (currentFilters.vendedorId) {
      active.push({
        groupId: 'outros',
        filterId: 'vendedor',
        label: `Vendedor: ${currentFilters.vendedorId}`,
        color: 'purple'
      });
    }
    
    if (currentFilters.numeroReceita) {
      active.push({
        groupId: 'outros', 
        filterId: 'receita',
        label: `Receita: ${currentFilters.numeroReceita}`,
        color: 'purple'
      });
    }

    return active;
  }, [currentFilters, filterGroups]);

  const activeFilters = getActiveFilters();

  // Aplicar filtro
  const applyFilter = useCallback((groupId: string, filterId: string, value: Partial<FiltroAuditoria>) => {
    const group = filterGroups.find(g => g.id === groupId);
    
    if (group?.mutuallyExclusive) {
      // Para grupos mutuamente exclusivos, limpar outros filtros do mesmo grupo
      let newFilters = { ...currentFilters };
      
      // Remover filtros do mesmo grupo
      group.filters.forEach(filter => {
        Object.keys(filter.value).forEach(key => {
          delete newFilters[key as keyof FiltroAuditoria];
        });
      });
      
      // Aplicar novo filtro
      newFilters = { ...newFilters, ...value };
      onFilterChange(newFilters);
    } else {
      // Para filtros combinávei, apenas adicionar
      onFilterChange({ ...currentFilters, ...value });
    }
  }, [currentFilters, onFilterChange, filterGroups]);

  // Remover filtro específico
  const removeFilter = useCallback((groupId: string, filterId: string) => {
    const group = filterGroups.find(g => g.id === groupId);
    const filter = group?.filters.find(f => f.id === filterId);
    
    if (filter) {
      const newFilters = { ...currentFilters };
      Object.keys(filter.value).forEach(key => {
        delete newFilters[key as keyof FiltroAuditoria];
      });
      onFilterChange(newFilters);
    } else if (groupId === 'outros') {
      // Remover filtros personalizados
      const newFilters = { ...currentFilters };
      if (filterId === 'vendedor') delete newFilters.vendedorId;
      if (filterId === 'receita') delete newFilters.numeroReceita;
      onFilterChange(newFilters);
    }
  }, [currentFilters, onFilterChange, filterGroups]);

  // Salvar filtro atual
  const saveCurrentFilter = useCallback(() => {
    if (!saveFilterName.trim()) return;
    
    const newFilter = {
      id: Date.now().toString(),
      name: saveFilterName,
      filters: currentFilters
    };
    
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('auditoria-saved-filters', JSON.stringify(updated));
    setSaveFilterName('');
    setShowSaveDialog(false);
  }, [saveFilterName, currentFilters, savedFilters]);

  // Aplicar filtro salvo
  const applySavedFilter = useCallback((savedFilter: FiltroAuditoria) => {
    onFilterChange(savedFilter);
  }, [onFilterChange]);

  // Obter cor da badge baseada no grupo
  const getColorClasses = (color: string) => {
    const classes = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  return (
    <div className={`bg-white shadow rounded-lg ${className}`}>
      {/* Header compacto com filtros ativos */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <FunnelIcon className="h-5 w-5" />
              <span className="font-medium">Filtros</span>
              {isExpanded ? 
                <ChevronUpIcon className="h-4 w-4" /> : 
                <ChevronDownIcon className="h-4 w-4" />
              }
            </button>
            
            {/* Badges dos filtros ativos */}
            <div className="flex flex-wrap gap-1">
              {activeFilters.map((filter, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getColorClasses(filter.color)}`}
                >
                  {filter.label}
                  <button
                    onClick={() => removeFilter(filter.groupId, filter.filterId)}
                    className="ml-1 inline-flex items-center justify-center w-3 h-3 rounded-full hover:bg-opacity-80"
                  >
                    <XMarkIcon className="h-2 w-2" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Contador de resultados */}
            {resultCount !== undefined && (
              <span className="text-sm text-gray-600">
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Carregando...
                  </div>
                ) : (
                  `${resultCount.toLocaleString()} registros`
                )}
              </span>
            )}

            {/* Botão de exportar */}
            {onExportClick && (
              <button
                onClick={onExportClick}
                disabled={exportLoading}
                className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50 transition-colors"
                title="Exportar relatório"
              >
                <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                {exportLoading ? 'Exportando...' : 'Exportar'}
              </button>
            )}
            
            {/* Botão limpar tudo */}
            {activeFilters.length > 0 && (
              <button
                onClick={onClearFilters}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Limpar Tudo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Painel expandido com todos os filtros */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Grupos de filtros */}
          {filterGroups.map(group => (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center space-x-2">
                <group.icon className="h-4 w-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-900">{group.name}</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.filters.map(filter => {
                  const isActive = activeFilters.some(af => 
                    af.groupId === group.id && af.filterId === filter.id
                  );
                  
                  return (
                    <button
                      key={filter.id}
                      onClick={() => applyFilter(group.id, filter.id, filter.value)}
                      className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
                        isActive
                          ? `${getColorClasses(group.color)} border-opacity-80`
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Filtros personalizados */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-500" />
              <h4 className="text-sm font-medium text-gray-900">Filtros Específicos</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="ID do Vendedor"
                value={currentFilters.vendedorId || ''}
                onChange={(e) => onFilterChange({ ...currentFilters, vendedorId: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              />
              <input
                type="text"
                placeholder="Número da Receita"
                value={currentFilters.numeroReceita || ''}
                onChange={(e) => onFilterChange({ ...currentFilters, numeroReceita: e.target.value || undefined })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-purple-500 focus:border-purple-500"
              />
              <div className="flex space-x-1">
                <input
                  type="date"
                  value={currentFilters.dataInicio || ''}
                  onChange={(e) => onFilterChange({ ...currentFilters, dataInicio: e.target.value || undefined })}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={currentFilters.dataFim || ''}
                  onChange={(e) => onFilterChange({ ...currentFilters, dataFim: e.target.value || undefined })}
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Filtros salvos */}
          {savedFilters.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900">Filtros Salvos</h4>
              <div className="flex flex-wrap gap-2">
                {savedFilters.map(saved => (
                  <button
                    key={saved.id}
                    onClick={() => applySavedFilter(saved.filters)}
                    className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <BookmarkSolidIcon className="h-3 w-3 mr-1" />
                    {saved.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-between items-center border-t pt-4">
            <button
              onClick={() => setShowSaveDialog(true)}
              disabled={activeFilters.length === 0}
              className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <BookmarkIcon className="h-4 w-4 mr-1" />
              Salvar Filtro
            </button>
            
            <div className="text-sm text-gray-500">
              {activeFilters.length} filtros ativos
            </div>
          </div>

          {/* Modal salvar filtro */}
          {showSaveDialog && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowSaveDialog(false)}></div>
                <div className="inline-block bg-white rounded-lg p-6 text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Salvar Filtro</h3>
                  <input
                    type="text"
                    value={saveFilterName}
                    onChange={(e) => setSaveFilterName(e.target.value)}
                    placeholder="Nome do filtro..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && saveCurrentFilter()}
                  />
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={saveCurrentFilter}
                      disabled={!saveFilterName.trim()}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartFilters;