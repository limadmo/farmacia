/**
 * Hook para gerenciamento inteligente de configuração de paginação
 * 
 * Fornece configuração adaptativa baseada em:
 * - Tamanho da tela
 * - Preferências do usuário
 * - Contexto da aplicação
 * - Performance do dispositivo
 */

import { useState, useEffect, useCallback } from 'react';

export interface PaginationConfig {
  pageSize: number;
  density: 'compact' | 'normal' | 'comfortable';
  showProgress: boolean;
  enablePreloading: boolean;
  autoAdapt: boolean;
}

export interface ScreenBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
  pixelRatio: number;
  isLowEnd: boolean;
}

const defaultConfig: PaginationConfig = {
  pageSize: 20,
  density: 'normal',
  showProgress: true,
  enablePreloading: true,
  autoAdapt: true
};

const breakpoints: ScreenBreakpoints = {
  mobile: 640,
  tablet: 1024,
  desktop: 1280
};

/**
 * Detecta informações do dispositivo
 */
const getDeviceInfo = (): DeviceInfo => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = window.devicePixelRatio || 1;

  // Detecta dispositivos de baixo desempenho
  const isLowEnd = (
    navigator.hardwareConcurrency < 4 ||
    (navigator as any).deviceMemory < 4 ||
    pixelRatio < 2
  );

  return {
    isMobile: width < breakpoints.mobile,
    isTablet: width >= breakpoints.mobile && width < breakpoints.desktop,
    isDesktop: width >= breakpoints.desktop,
    width,
    height,
    pixelRatio,
    isLowEnd
  };
};

/**
 * Calcula configuração otimizada baseada no dispositivo
 */
const getOptimalConfig = (device: DeviceInfo, currentConfig: PaginationConfig): Partial<PaginationConfig> => {
  const suggestions: Partial<PaginationConfig> = {};

  // Adaptações para mobile
  if (device.isMobile) {
    suggestions.pageSize = Math.min(currentConfig.pageSize, 10);
    suggestions.density = 'compact';
    suggestions.enablePreloading = !device.isLowEnd;
  }
  
  // Adaptações para tablet
  else if (device.isTablet) {
    suggestions.pageSize = Math.min(currentConfig.pageSize, 20);
    suggestions.density = 'normal';
    suggestions.enablePreloading = true;
  }
  
  // Adaptações para desktop
  else if (device.isDesktop) {
    suggestions.density = 'comfortable';
    suggestions.enablePreloading = true;
    
    // Aumentar pageSize em telas muito grandes
    if (device.width > 1920) {
      suggestions.pageSize = Math.max(currentConfig.pageSize, 50);
    }
  }

  // Desabilitar recursos pesados em dispositivos de baixo desempenho
  if (device.isLowEnd) {
    suggestions.enablePreloading = false;
    suggestions.showProgress = false;
  }

  return suggestions;
};

/**
 * Hook principal para configuração de paginação
 */
export const usePaginationConfig = (storageKey: string = 'pagination-config') => {
  const [config, setConfig] = useState<PaginationConfig>(defaultConfig);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());
  const [isAdapting, setIsAdapting] = useState(false);

  /**
   * Carrega configuração salva
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      }
    } catch (error) {
      console.warn('Erro ao carregar configuração de paginação:', error);
    }
  }, [storageKey]);

  /**
   * Salva configuração no localStorage
   */
  const saveConfig = useCallback((updates: Partial<PaginationConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(newConfig));
    } catch (error) {
      console.warn('Erro ao salvar configuração de paginação:', error);
    }
  }, [config, storageKey]);

  /**
   * Atualiza informações do dispositivo
   */
  const updateDeviceInfo = useCallback(() => {
    setDeviceInfo(getDeviceInfo());
  }, []);

  /**
   * Aplica adaptações automáticas baseadas no dispositivo
   */
  const adaptToDevice = useCallback(async () => {
    if (!config.autoAdapt) return;

    setIsAdapting(true);
    
    try {
      const currentDevice = getDeviceInfo();
      const optimalConfig = getOptimalConfig(currentDevice, config);
      
      // Só atualizar se há mudanças significativas
      const hasChanges = Object.keys(optimalConfig).some(
        key => optimalConfig[key as keyof PaginationConfig] !== config[key as keyof PaginationConfig]
      );

      if (hasChanges) {
        // Pequeno delay para suavizar a transição
        await new Promise(resolve => setTimeout(resolve, 300));
        saveConfig(optimalConfig);
        setDeviceInfo(currentDevice);
      }
    } finally {
      setIsAdapting(false);
    }
  }, [config, saveConfig]);

  /**
   * Monitora mudanças no tamanho da tela
   */
  useEffect(() => {
    const handleResize = () => {
      updateDeviceInfo();
      
      // Debounce para evitar muitas atualizações
      const timer = setTimeout(adaptToDevice, 500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('resize', handleResize);
    
    // Executar adaptação inicial
    adaptToDevice();

    return () => window.removeEventListener('resize', handleResize);
  }, [adaptToDevice, updateDeviceInfo]);

  /**
   * Monitora mudanças de orientação em mobile
   */
  useEffect(() => {
    const handleOrientationChange = () => {
      // Delay para aguardar o resize completar
      setTimeout(() => {
        updateDeviceInfo();
        adaptToDevice();
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, [adaptToDevice, updateDeviceInfo]);

  /**
   * Calcula opções de pageSize disponíveis baseado no dispositivo
   */
  const getAvailablePageSizes = useCallback((): number[] => {
    const baseSizes = [10, 20, 50, 100];
    
    if (deviceInfo.isMobile) {
      return [5, 10, 15, 20];
    } else if (deviceInfo.isTablet) {
      return [10, 20, 30, 50];
    } else if (deviceInfo.isDesktop) {
      if (deviceInfo.width > 1920) {
        return [20, 50, 100, 200];
      }
      return baseSizes;
    }
    
    return baseSizes;
  }, [deviceInfo]);

  /**
   * Sugere configuração otimizada
   */
  const getSuggestions = useCallback((): Partial<PaginationConfig> => {
    return getOptimalConfig(deviceInfo, config);
  }, [deviceInfo, config]);

  /**
   * Aplica configuração sugerida
   */
  const applySuggestions = useCallback(() => {
    const suggestions = getSuggestions();
    saveConfig(suggestions);
  }, [getSuggestions, saveConfig]);

  /**
   * Reseta para configuração padrão adaptada ao dispositivo
   */
  const resetToDefaults = useCallback(() => {
    const deviceOptimized = getOptimalConfig(deviceInfo, defaultConfig);
    const resetConfig = { ...defaultConfig, ...deviceOptimized };
    setConfig(resetConfig);
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(resetConfig));
    } catch (error) {
      console.warn('Erro ao resetar configuração:', error);
    }
  }, [deviceInfo, storageKey]);

  /**
   * Calcula densidade de layout CSS classes
   */
  const getDensityClasses = useCallback(() => {
    switch (config.density) {
      case 'compact':
        return 'text-sm py-1 px-2';
      case 'comfortable':
        return 'text-base py-3 px-4';
      default:
        return 'text-sm py-2 px-3';
    }
  }, [config.density]);

  return {
    config,
    deviceInfo,
    isAdapting,
    saveConfig,
    adaptToDevice,
    getAvailablePageSizes,
    getSuggestions,
    applySuggestions,
    resetToDefaults,
    getDensityClasses
  };
};