/**
 * Componente de Filtros Rápidos para Auditoria - Sistema de Farmácia
 * 
 * Fornece filtros contextuais inteligentes para acelerar investigações:
 * - Filtros pré-definidos para cenários comuns
 * - Sugestões baseadas no contexto atual
 * - Persistência de filtros favoritos
 * - Indicadores visuais de filtros ativos
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  StarIcon,
  XMarkIcon,
  PlusIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { FiltroAuditoria } from '../types/auditoria';

export interface QuickFilter {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  filter: Partial<FiltroAuditoria>;
  color: string;
  isActive?: boolean;
  isFavorite?: boolean;
}

export interface QuickFiltersProps {
  currentFilters: FiltroAuditoria;
  onFilterChange: (filters: Partial<FiltroAuditoria>) => void;
  onClearFilters: () => void;
  className?: string;
  showFavorites?: boolean;
  storageKey?: string;
}

/**
 * Filtros pré-definidos para cenários comuns de auditoria
 */
const getDefaultQuickFilters = (): QuickFilter[] => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  return [
    {
      id: 'today',
      name: 'Hoje',
      description: 'Vendas controladas de hoje',
      icon: ClockIcon,
      filter: {
        dataInicio: today.toISOString().split('T')[0],
        dataFim: today.toISOString().split('T')[0]
      },
      color: 'blue'
    },
    {
      id: 'yesterday',
      name: 'Ontem',
      description: 'Vendas controladas de ontem',
      icon: ClockIcon,
      filter: {
        dataInicio: yesterday.toISOString().split('T')[0],
        dataFim: yesterday.toISOString().split('T')[0]
      },
      color: 'gray'
    },
    {
      id: 'this-week',
      name: 'Esta Semana',
      description: 'Vendas controladas desta semana',
      icon: ClockIcon,
      filter: {
        dataInicio: thisWeekStart.toISOString().split('T')[0],
        dataFim: today.toISOString().split('T')[0]
      },
      color: 'green'
    },
    {
      id: 'last-week',
      name: 'Semana Passada',
      description: 'Vendas controladas da semana passada',
      icon: ClockIcon,
      filter: {
        dataInicio: lastWeekStart.toISOString().split('T')[0],
        dataFim: lastWeekEnd.toISOString().split('T')[0]
      },
      color: 'purple'
    },
    {
      id: 'this-month',
      name: 'Este Mês',
      description: 'Vendas controladas deste mês',
      icon: ClockIcon,
      filter: {
        dataInicio: thisMonthStart.toISOString().split('T')[0],
        dataFim: today.toISOString().split('T')[0]
      },
      color: 'indigo'
    },
    {
      id: 'assisted-sales',
      name: 'Vendas Assistidas',
      description: 'Apenas vendas assistidas por farmacêuticos',
      icon: ExclamationTriangleIcon,
      filter: {
        apenasVendasAssistidas: true
      },
      color: 'yellow'
    },
    {
      id: 'pharmacists',
      name: 'Farmacêuticos',
      description: 'Vendas realizadas por farmacêuticos',
      icon: UserGroupIcon,
      filter: {
        tipoUsuario: 'FARMACEUTICO'
      },
      color: 'emerald'
    },
    {
      id: 'managers',
      name: 'Gerentes',
      description: 'Vendas realizadas por gerentes',
      icon: UserGroupIcon,
      filter: {
        tipoUsuario: 'GERENTE'
      },
      color: 'violet'
    },
    {
      id: 'sellers',
      name: 'Vendedores',
      description: 'Vendas realizadas por vendedores',
      icon: UserGroupIcon,
      filter: {
        tipoUsuario: 'VENDEDOR'
      },
      color: 'orange'
    },
    {
      id: 'with-prescription',
      name: 'Com Receita',
      description: 'Vendas que possuem número de receita',
      icon: ClipboardDocumentListIcon,
      filter: {
        // Este filtro precisará ser implementado no backend
        comReceita: true
      },
      color: 'cyan'
    }
  ];
};

/**
 * Cores disponíveis para os filtros
 */
const getColorClasses = (color: string, isActive: boolean = false) => {
  const baseClasses = isActive ? 'ring-2 ring-offset-1' : '';
  
  switch (color) {
    case 'blue':
      return `${baseClasses} bg-blue-100 text-blue-800 hover:bg-blue-200 ${isActive ? 'ring-blue-500' : ''}`;
    case 'green':
      return `${baseClasses} bg-green-100 text-green-800 hover:bg-green-200 ${isActive ? 'ring-green-500' : ''}`;
    case 'yellow':
      return `${baseClasses} bg-yellow-100 text-yellow-800 hover:bg-yellow-200 ${isActive ? 'ring-yellow-500' : ''}`;
    case 'red':
      return `${baseClasses} bg-red-100 text-red-800 hover:bg-red-200 ${isActive ? 'ring-red-500' : ''}`;
    case 'purple':
      return `${baseClasses} bg-purple-100 text-purple-800 hover:bg-purple-200 ${isActive ? 'ring-purple-500' : ''}`;
    case 'indigo':
      return `${baseClasses} bg-indigo-100 text-indigo-800 hover:bg-indigo-200 ${isActive ? 'ring-indigo-500' : ''}`;
    case 'emerald':
      return `${baseClasses} bg-emerald-100 text-emerald-800 hover:bg-emerald-200 ${isActive ? 'ring-emerald-500' : ''}`;
    case 'violet':
      return `${baseClasses} bg-violet-100 text-violet-800 hover:bg-violet-200 ${isActive ? 'ring-violet-500' : ''}`;
    case 'orange':
      return `${baseClasses} bg-orange-100 text-orange-800 hover:bg-orange-200 ${isActive ? 'ring-orange-500' : ''}`;
    case 'cyan':
      return `${baseClasses} bg-cyan-100 text-cyan-800 hover:bg-cyan-200 ${isActive ? 'ring-cyan-500' : ''}`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800 hover:bg-gray-200 ${isActive ? 'ring-gray-500' : ''}`;
  }
};

const QuickFilters: React.FC<QuickFiltersProps> = ({
  currentFilters,
  onFilterChange,
  onClearFilters,
  className = '',
  showFavorites = true,
  storageKey = 'audit-quick-filters'
}) => {
  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(getDefaultQuickFilters());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  /**
   * Carrega favoritos do localStorage
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${storageKey}-favorites`);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.warn('Erro ao carregar filtros favoritos:', error);
    }
  }, [storageKey]);

  /**
   * Salva favoritos no localStorage
   */
  const saveFavorites = useCallback((newFavorites: Set<string>) => {
    try {
      localStorage.setItem(`${storageKey}-favorites`, JSON.stringify(Array.from(newFavorites)));
      setFavorites(newFavorites);
    } catch (error) {
      console.warn('Erro ao salvar filtros favoritos:', error);
    }
  }, [storageKey]);

  /**
   * Verifica se um filtro está ativo baseado nos filtros atuais
   */
  const isFilterActive = useCallback((filter: QuickFilter): boolean => {
    return Object.entries(filter.filter).every(([key, value]) => {
      const currentValue = currentFilters[key as keyof FiltroAuditoria];
      
      // Comparação especial para booleans
      if (typeof value === 'boolean') {
        return currentValue === value;
      }
      
      // Comparação especial para datas
      if (key === 'dataInicio' || key === 'dataFim') {
        return currentValue === value;
      }
      
      return currentValue === value;
    });
  }, [currentFilters]);

  /**
   * Atualiza o estado dos filtros ativos
   */
  useEffect(() => {
    const active = new Set<string>();
    quickFilters.forEach(filter => {
      if (isFilterActive(filter)) {
        active.add(filter.id);
      }
    });
    setActiveFilters(active);
  }, [quickFilters, isFilterActive]);

  /**
   * Aplica um filtro rápido
   */
  const applyQuickFilter = (filter: QuickFilter) => {
    const isCurrentlyActive = activeFilters.has(filter.id);
    
    if (isCurrentlyActive) {
      // Se está ativo, remover o filtro
      const updatedFilters: Record<string, undefined> = {};
      Object.keys(filter.filter).forEach(key => {
        updatedFilters[key] = undefined;
      });
      onFilterChange(updatedFilters as Partial<FiltroAuditoria>);
    } else {
      // Se não está ativo, aplicar o filtro
      onFilterChange(filter.filter);
    }
  };

  /**
   * Alterna favorito
   */
  const toggleFavorite = (filterId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newFavorites = new Set(favorites);
    
    if (newFavorites.has(filterId)) {
      newFavorites.delete(filterId);
    } else {
      newFavorites.add(filterId);
    }
    
    saveFavorites(newFavorites);
  };

  /**
   * Conta quantos filtros estão atualmente aplicados
   */
  const getActiveFiltersCount = () => {
    return Object.values(currentFilters).filter(value => 
      value !== undefined && value !== '' && value !== null
    ).length;
  };

  /**
   * Filtra e ordena os filtros para exibição
   */
  const getDisplayFilters = () => {
    let filters = quickFilters;
    
    if (showFavorites && favorites.size > 0) {
      // Mostrar favoritos primeiro, depois outros
      const favoriteFilters = filters.filter(f => favorites.has(f.id));
      const otherFilters = filters.filter(f => !favorites.has(f.id));
      filters = [...favoriteFilters, ...otherFilters];
    }
    
    // Limitar exibição se não estiver mostrando todos
    if (!showAllFilters) {
      const favoriteCount = favorites.size;
      const maxVisible = favoriteCount > 0 ? Math.max(6, favoriteCount + 2) : 6;
      filters = filters.slice(0, maxVisible);
    }
    
    return filters;
  };

  const displayFilters = getDisplayFilters();
  const activeFiltersCount = getActiveFiltersCount();
  const hasMoreFilters = quickFilters.length > displayFilters.length;

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Filtros Rápidos</h3>
            {activeFiltersCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {activeFiltersCount} {activeFiltersCount === 1 ? 'filtro' : 'filtros'}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={onClearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Limpar
              </button>
            )}
            
            {hasMoreFilters && (
              <button
                onClick={() => setShowAllFilters(!showAllFilters)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                {showAllFilters ? 'Menos' : 'Mais'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          {displayFilters.map((filter) => {
            const isActive = activeFilters.has(filter.id);
            const isFavorite = favorites.has(filter.id);
            const IconComponent = filter.icon;
            
            return (
              <button
                key={filter.id}
                onClick={() => applyQuickFilter(filter)}
                className={`
                  inline-flex items-center px-3 py-2 rounded-full text-xs font-medium
                  transition-all duration-200 relative group
                  ${getColorClasses(filter.color, isActive)}
                `}
                title={filter.description}
              >
                <IconComponent className="h-4 w-4 mr-1.5" />
                <span>{filter.name}</span>
                
                {/* Botão de favorito */}
                {showFavorites && (
                  <button
                    onClick={(e) => toggleFavorite(filter.id, e)}
                    className="ml-1.5 p-0.5 rounded-full hover:bg-white hover:bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isFavorite ? (
                      <StarSolidIcon className="h-3 w-3 text-yellow-500" />
                    ) : (
                      <StarIcon className="h-3 w-3" />
                    )}
                  </button>
                )}
                
                {/* Indicador de ativo */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
            );
          })}
          
          {displayFilters.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              Nenhum filtro rápido disponível
            </p>
          )}
        </div>
        
        {/* Sugestões contextuais */}
        {activeFiltersCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Sugestões baseadas nos filtros atuais:</p>
            <div className="flex flex-wrap gap-1">
              {/* Aqui poderiam ser adicionadas sugestões inteligentes baseadas nos filtros atuais */}
              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                💡 Use múltiplos filtros para refinar a busca
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickFilters;