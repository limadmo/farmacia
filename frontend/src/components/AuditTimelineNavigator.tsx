/**
 * Navegador Timeline para Auditoria - Sistema de Farmácia
 * 
 * Componente especializado para navegação temporal em dados de auditoria:
 * - Timeline visual interativa
 * - Saltos inteligentes por período
 * - Indicadores de densidade de dados
 * - Navegação por marcos temporais
 * - Zoom temporal (dia, semana, mês, trimestre)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export interface TimelinePeriod {
  start: Date;
  end: Date;
  label: string;
  count?: number;
  density?: 'low' | 'medium' | 'high';
}

export interface TimelineMarker {
  date: Date;
  label: string;
  type: 'milestone' | 'alert' | 'normal';
  count: number;
}

export interface AuditTimelineNavigatorProps {
  currentPeriod: { start: string; end: string };
  onPeriodChange: (period: { start: string; end: string }) => void;
  markers?: TimelineMarker[];
  className?: string;
  // Configurações de zoom temporal
  zoomLevel: 'day' | 'week' | 'month' | 'quarter' | 'year';
  onZoomChange: (zoom: 'day' | 'week' | 'month' | 'quarter' | 'year') => void;
  // Limites temporais
  minDate?: Date;
  maxDate?: Date;
  // Dados de densidade para visualização
  densityData?: { date: string; count: number }[];
}

/**
 * Utilitários para manipulação de datas
 */
const dateUtils = {
  formatDate: (date: Date, format: 'short' | 'medium' | 'long' = 'medium') => {
    switch (format) {
      case 'short':
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      case 'long':
        return date.toLocaleDateString('pt-BR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      default:
        return date.toLocaleDateString('pt-BR');
    }
  },

  getWeekStart: (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  },

  getWeekEnd: (date: Date) => {
    const end = new Date(date);
    end.setDate(date.getDate() + (6 - date.getDay()));
    end.setHours(23, 59, 59, 999);
    return end;
  },

  getMonthStart: (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },

  getMonthEnd: (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  },

  getQuarterStart: (date: Date) => {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
  },

  getQuarterEnd: (date: Date) => {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
  },

  getYearStart: (date: Date) => {
    return new Date(date.getFullYear(), 0, 1);
  },

  getYearEnd: (date: Date) => {
    return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  }
};

const AuditTimelineNavigator: React.FC<AuditTimelineNavigatorProps> = ({
  currentPeriod,
  onPeriodChange,
  markers = [],
  className = '',
  zoomLevel,
  onZoomChange,
  minDate = new Date(2020, 0, 1),
  maxDate = new Date(),
  densityData = []
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(false);
  
  /**
   * Converte strings de data para objetos Date
   */
  const currentStart = useMemo(() => new Date(currentPeriod.start), [currentPeriod.start]);
  const currentEnd = useMemo(() => new Date(currentPeriod.end), [currentPeriod.end]);

  /**
   * Calcula o período baseado no zoom e data selecionada
   */
  const calculatePeriod = useCallback((date: Date, zoom: string) => {
    let start: Date, end: Date;

    switch (zoom) {
      case 'day':
        start = new Date(date);
        start.setHours(0, 0, 0, 0);
        end = new Date(date);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start = dateUtils.getWeekStart(date);
        end = dateUtils.getWeekEnd(date);
        break;
      case 'month':
        start = dateUtils.getMonthStart(date);
        end = dateUtils.getMonthEnd(date);
        break;
      case 'quarter':
        start = dateUtils.getQuarterStart(date);
        end = dateUtils.getQuarterEnd(date);
        break;
      case 'year':
        start = dateUtils.getYearStart(date);
        end = dateUtils.getYearEnd(date);
        break;
      default:
        start = new Date(date);
        end = new Date(date);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, []);

  /**
   * Navega para o período anterior
   */
  const navigatePrevious = useCallback(() => {
    const newDate = new Date(selectedDate);
    
    switch (zoomLevel) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() - 3);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    
    if (newDate >= minDate) {
      setSelectedDate(newDate);
      const newPeriod = calculatePeriod(newDate, zoomLevel);
      onPeriodChange(newPeriod);
    }
  }, [selectedDate, zoomLevel, minDate, calculatePeriod, onPeriodChange]);

  /**
   * Navega para o próximo período
   */
  const navigateNext = useCallback(() => {
    const newDate = new Date(selectedDate);
    
    switch (zoomLevel) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    
    if (newDate <= maxDate) {
      setSelectedDate(newDate);
      const newPeriod = calculatePeriod(newDate, zoomLevel);
      onPeriodChange(newPeriod);
    }
  }, [selectedDate, zoomLevel, maxDate, calculatePeriod, onPeriodChange]);

  /**
   * Salta para uma data específica
   */
  const jumpToDate = useCallback((date: Date) => {
    if (date >= minDate && date <= maxDate) {
      setSelectedDate(date);
      const newPeriod = calculatePeriod(date, zoomLevel);
      onPeriodChange(newPeriod);
    }
  }, [minDate, maxDate, zoomLevel, calculatePeriod, onPeriodChange]);

  /**
   * Gera períodos para timeline visual
   */
  const generateTimelinePeriods = useCallback((): TimelinePeriod[] => {
    const periods: TimelinePeriod[] = [];
    const baseDate = new Date(selectedDate);
    const numPeriods = 7; // Mostrar 7 períodos na timeline
    
    for (let i = -3; i <= 3; i++) {
      const periodDate = new Date(baseDate);
      
      switch (zoomLevel) {
        case 'day':
          periodDate.setDate(baseDate.getDate() + i);
          break;
        case 'week':
          periodDate.setDate(baseDate.getDate() + (i * 7));
          break;
        case 'month':
          periodDate.setMonth(baseDate.getMonth() + i);
          break;
        case 'quarter':
          periodDate.setMonth(baseDate.getMonth() + (i * 3));
          break;
        case 'year':
          periodDate.setFullYear(baseDate.getFullYear() + i);
          break;
      }
      
      const period = calculatePeriod(periodDate, zoomLevel);
      const start = new Date(period.start);
      const end = new Date(period.end);
      
      // Calcular densidade baseada nos dados
      const count = densityData.filter(d => {
        const date = new Date(d.date);
        return date >= start && date <= end;
      }).reduce((sum, d) => sum + d.count, 0);
      
      let density: 'low' | 'medium' | 'high' = 'low';
      if (count > 50) density = 'high';
      else if (count > 10) density = 'medium';
      
      periods.push({
        start,
        end,
        label: dateUtils.formatDate(start, 'short'),
        count,
        density
      });
    }
    
    return periods;
  }, [selectedDate, zoomLevel, calculatePeriod, densityData]);

  /**
   * Obtém o rótulo do período atual
   */
  const getCurrentPeriodLabel = useCallback(() => {
    const format = zoomLevel === 'day' ? 'long' : 'medium';
    
    switch (zoomLevel) {
      case 'day':
        return dateUtils.formatDate(currentStart, format);
      case 'week':
        return `${dateUtils.formatDate(currentStart, 'short')} - ${dateUtils.formatDate(currentEnd, 'short')}`;
      case 'month':
        return currentStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      case 'quarter':
        const quarter = Math.floor(currentStart.getMonth() / 3) + 1;
        return `${quarter}º Trimestre ${currentStart.getFullYear()}`;
      case 'year':
        return currentStart.getFullYear().toString();
      default:
        return dateUtils.formatDate(currentStart);
    }
  }, [currentStart, currentEnd, zoomLevel]);

  /**
   * Obtém as opções de zoom
   */
  const getZoomOptions = () => [
    { value: 'day' as const, label: 'Dia', icon: ClockIcon },
    { value: 'week' as const, label: 'Semana', icon: CalendarIcon },
    { value: 'month' as const, label: 'Mês', icon: CalendarIcon },
    { value: 'quarter' as const, label: 'Trimestre', icon: CalendarIcon },
    { value: 'year' as const, label: 'Ano', icon: CalendarIcon }
  ];

  const timelinePeriods = generateTimelinePeriods();
  const currentPeriodLabel = getCurrentPeriodLabel();
  const zoomOptions = getZoomOptions();

  return (
    <div className={`bg-white border rounded-lg ${className}`}>
      {/* Header com controles principais */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <CalendarIcon className="h-5 w-5" />
            <span>Timeline</span>
          </button>
          
          <div className="text-lg font-semibold text-gray-900">
            {currentPeriodLabel}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Controles de zoom */}
          <div className="flex items-center border rounded-md">
            {zoomOptions.map((option, index) => (
              <button
                key={option.value}
                onClick={() => onZoomChange(option.value)}
                className={`
                  px-3 py-1 text-xs font-medium border-r last:border-r-0
                  ${zoomLevel === option.value 
                    ? 'bg-blue-500 text-white' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                  ${index === 0 ? 'rounded-l-md' : ''}
                  ${index === zoomOptions.length - 1 ? 'rounded-r-md' : ''}
                `}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Navegação */}
          <div className="flex items-center space-x-1">
            <button
              onClick={navigatePrevious}
              className="p-2 text-gray-400 hover:text-gray-600 border rounded-md hover:bg-gray-50"
              title="Período anterior"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => jumpToDate(new Date())}
              className="px-3 py-2 text-xs font-medium text-gray-600 border rounded-md hover:bg-gray-50"
              title="Ir para hoje"
            >
              Hoje
            </button>
            
            <button
              onClick={navigateNext}
              className="p-2 text-gray-400 hover:text-gray-600 border rounded-md hover:bg-gray-50"
              title="Próximo período"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline visual expandida */}
      {isExpanded && (
        <div className="p-4 bg-gray-50">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Navegação Temporal</h4>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-2 bg-green-300 rounded"></div>
                  <span>Baixa atividade</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-2 bg-yellow-400 rounded"></div>
                  <span>Atividade moderada</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-2 bg-red-500 rounded"></div>
                  <span>Alta atividade</span>
                </div>
              </div>
            </div>
            
            {/* Timeline visual */}
            <div className="flex items-center space-x-1">
              {timelinePeriods.map((period, index) => {
                const isSelected = period.start <= currentStart && period.end >= currentEnd;
                const densityColor = {
                  low: 'bg-green-300',
                  medium: 'bg-yellow-400',
                  high: 'bg-red-500'
                }[period.density || 'low'];
                
                return (
                  <button
                    key={index}
                    onClick={() => jumpToDate(period.start)}
                    className={`
                      flex-1 h-8 rounded ${densityColor} 
                      hover:opacity-80 transition-all duration-200
                      ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                    `}
                    title={`${period.label} - ${period.count || 0} registros`}
                  >
                    <div className="text-xs text-center mt-1 text-white font-medium">
                      {period.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Marcadores temporais */}
          {markers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Marcos Importantes</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {markers
                  .filter(marker => marker.date >= minDate && marker.date <= maxDate)
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .slice(0, 6)
                  .map((marker, index) => (
                    <button
                      key={index}
                      onClick={() => jumpToDate(marker.date)}
                      className="flex items-center space-x-2 p-2 text-left text-xs border rounded hover:bg-gray-50"
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        marker.type === 'alert' ? 'bg-red-500' :
                        marker.type === 'milestone' ? 'bg-blue-500' : 'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{marker.label}</div>
                        <div className="text-gray-500">
                          {dateUtils.formatDate(marker.date)} • {marker.count} registros
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Estatísticas do período atual */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {densityData.filter(d => {
                    const date = new Date(d.date);
                    return date >= currentStart && date <= currentEnd;
                  }).reduce((sum, d) => sum + d.count, 0)}
                </div>
                <div className="text-xs text-gray-500">Registros no período</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.floor((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1}
                </div>
                <div className="text-xs text-gray-500">Dias no período</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {markers.filter(m => m.date >= currentStart && m.date <= currentEnd).length}
                </div>
                <div className="text-xs text-gray-500">Marcos importantes</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {zoomLevel.charAt(0).toUpperCase() + zoomLevel.slice(1)}
                </div>
                <div className="text-xs text-gray-500">Nível de zoom</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTimelineNavigator;