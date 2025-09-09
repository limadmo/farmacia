/**
 * Componente para gerenciamento de tokens CSRF
 * 
 * Obtém e gerencia tokens CSRF automaticamente
 */

import { useEffect, useContext, createContext } from 'react';
import { useState } from 'react';
import api from '../services/api';
import { logger } from '../utils/logger';

interface CSRFContextType {
  token: string | null;
  refreshToken: () => Promise<void>;
  isLoading: boolean;
}

const CSRFContext = createContext<CSRFContextType>({
  token: null,
  refreshToken: async () => {},
  isLoading: true
});

export const useCSRF = () => useContext(CSRFContext);

interface CSRFProviderProps {
  children: React.ReactNode;
}

export const CSRFProvider: React.FC<CSRFProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshToken = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/csrf-token');
      const newToken = response.data.csrfToken;
      
      setToken(newToken);
      
      // Configurar token no axios para próximas requisições
      api.defaults.headers.common['X-CSRF-Token'] = newToken;
      
      // Armazenar token no sessionStorage
      sessionStorage.setItem('csrfToken', newToken);
      
      logger.debug('Token CSRF atualizado');
    } catch (error) {
      logger.error('Erro ao obter token CSRF:', error);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Tentar recuperar token do sessionStorage
    const storedToken = sessionStorage.getItem('csrfToken');
    if (storedToken) {
      setToken(storedToken);
      api.defaults.headers.common['X-CSRF-Token'] = storedToken;
    }
    
    // Obter novo token do servidor
    refreshToken();
  }, []);

  // Interceptor para lidar com erros 403 (token expirado)
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 403 && 
            error.response?.data?.error?.includes('CSRF')) {
          logger.warn('Token CSRF expirado, renovando...');
          await refreshToken();
          
          // Retentar a requisição original
          const originalRequest = error.config;
          if (originalRequest && token) {
            originalRequest.headers['X-CSRF-Token'] = token;
            return api.request(originalRequest);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [token]);

  return (
    <CSRFContext.Provider value={{ token, refreshToken, isLoading }}>
      {children}
    </CSRFContext.Provider>
  );
};

/**
 * Hook para adicionar token CSRF em formulários
 */
export const useCSRFFormData = () => {
  const { token } = useCSRF();
  
  return {
    getCSRFData: () => ({
      _csrf: token
    }),
    getCSRFHeaders: () => ({
      'X-CSRF-Token': token
    })
  };
};

/**
 * Componente de campo hidden para formulários HTML
 */
export const CSRFTokenInput: React.FC = () => {
  const { token } = useCSRF();
  
  if (!token) return null;
  
  return (
    <input
      type="hidden"
      name="_csrf"
      value={token}
    />
  );
};

/**
 * HOC para proteger componentes com CSRF
 */
export function withCSRF<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return (props: P) => (
    <CSRFProvider>
      <Component {...props} />
    </CSRFProvider>
  );
}