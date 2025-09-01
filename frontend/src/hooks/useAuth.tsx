import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Usuario } from '../types/auth';
import { authService } from '../services/auth';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (login: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVendedor: boolean;
  isGerente: boolean;
  isFarmaceutico: boolean;
  isPDV: boolean;
  isCaixa: boolean;
  canAccess: (module: string) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário logado no localStorage
    const currentUser = authService.getCurrentUser();
    if (currentUser && authService.isAuthenticated()) {
      setUser(currentUser);
    } else {
      // Se não estiver autenticado, limpar o usuário
      setUser(null);
    }
    setLoading(false);
    
    // Verificar periodicamente se o token ainda é válido (a cada 30 segundos)
    const checkAuthInterval = setInterval(() => {
      if (!authService.isAuthenticated()) {
        // Se o token expirou, limpar o usuário
        setUser(null);
      }
    }, 30000);
    
    return () => clearInterval(checkAuthInterval);
  }, []);

  const login = async (login: string, senha: string): Promise<void> => {
    try {
      setLoading(true);
      const user = await authService.login(login, senha);
      setUser(user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await authService.logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user && authService.isAuthenticated(),
    isAdmin: user?.tipo === 'ADMINISTRADOR',
    isVendedor: user?.tipo === 'VENDEDOR',
    isGerente: user?.tipo === 'GERENTE',
    isFarmaceutico: user?.tipo === 'FARMACEUTICO',
    isPDV: user?.tipo === 'PDV',
    isCaixa: user?.tipo === 'CAIXA',
    canAccess: (module: string) => {
      if (!user) return false;
      // Verificar se o usuário tem permissão para o módulo
      return user.modulosPermitidos?.includes(module) || user.tipo === 'ADMINISTRADOR';
    },
    hasPermission: (permission: string) => {
      if (!user) return false;
      // Administrador tem todas as permissões
      if (user.tipo === 'ADMINISTRADOR') return true;
      // Verificar permissões específicas baseadas no tipo de usuário
      return user.modulosPermitidos?.includes(permission) || false;
    },
  };

  return React.createElement(
    AuthContext.Provider,
    { value },
    children
  );
};

export default useAuth;

