import api from './api';
import { Usuario } from '../types/auth';

class AuthService {
  async login(login: string, senha: string): Promise<Usuario> {
    try {
      const response = await api.post('/auth/login', { login, senha });
      
      // A nova API retorna diretamente os dados
      const responseData = response.data as { token: string, refreshToken: string, usuario: Usuario };
      const { token, refreshToken, usuario: user } = responseData;
      
      // Salvar token e dados do usuário
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      return user;
    } catch (error: any) {
      if (error.response && error.response.data) {
        const message = error.response.data?.message || 'Erro ao fazer login';
        throw new Error(message);
      }
      
      throw new Error('Erro de rede ao fazer login');
    }
  }

  // Método removido - usar usuarioService para criar usuários

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Limpar dados locais independentemente do resultado
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  getCurrentUser(): Usuario | null {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        return JSON.parse(userString);
      } catch (error) {
        console.error('Erro ao recuperar usuário do localStorage:', error);
        localStorage.removeItem('user');
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('accessToken');
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  /**
   * Limpa caches de desenvolvimento que podem interferir na funcionalidade
   * Remove caches desnecessários mas mantém dados essenciais de autenticação
   */
  clearDevelopmentCache(): void {
    // Limpar caches de paginação e filtros
    Object.keys(localStorage).forEach(key => {
      if (key.includes('pagination-config') || 
          key.includes('audit-page-cache') ||
          key.includes('auditoria-saved-filters') ||
          key.includes('favorites') ||
          key.startsWith('lote_info_')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ Cache de desenvolvimento limpo');
  }
}

export const authService = new AuthService();
export default authService;