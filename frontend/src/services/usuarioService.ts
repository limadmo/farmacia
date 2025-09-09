import api from './api';
import {
  Usuario,
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
  UsuarioResponse,
  UsuarioListResponse,
  FiltroUsuario,
  TiposGerenciaveisResponse,
  TipoUsuario
} from '../types/auth';

export const usuarioService = {
  // Listar todos os usuários
  async listarTodos(filtros?: FiltroUsuario): Promise<Usuario[]> {
    try {
      const params = new URLSearchParams();
      
      if (filtros) {
        if (filtros.tipo) params.append('tipo', filtros.tipo);
        if (filtros.ativo !== undefined) params.append('ativo', filtros.ativo.toString());
        if (filtros.nome) params.append('nome', filtros.nome);
        if (filtros.login) params.append('login', filtros.login);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/usuarios?${queryString}` : '/usuarios';
      
      const response = await api.get<UsuarioListResponse>(url);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      throw new Error(error.response?.data?.message || 'Erro ao listar usuários');
    }
  },

  // Obter usuário por ID
  async obterPorId(id: string): Promise<Usuario> {
    try {
      const response = await api.get<UsuarioResponse>(`/usuarios/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao obter usuário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao obter usuário');
    }
  },

  // Criar novo usuário
  async criar(dados: CreateUsuarioRequest): Promise<Usuario> {
    try {
      const response = await api.post<UsuarioResponse>('/usuarios', dados);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao criar usuário');
    }
  },

  // Atualizar usuário
  async atualizar(id: string, dados: UpdateUsuarioRequest): Promise<Usuario> {
    try {
      const response = await api.put<UsuarioResponse>(`/usuarios/${id}`, dados);
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao atualizar usuário');
    }
  },

  // Excluir usuário (desativar)
  async excluir(id: string): Promise<void> {
    try {
      await api.delete(`/usuarios/${id}`);
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      throw new Error(error.response?.data?.message || 'Erro ao excluir usuário');
    }
  },

  // Obter tipos de usuário que o usuário atual pode gerenciar
  async getTiposGerenciaveis(): Promise<TipoUsuario[]> {
    try {
      const response = await api.get<TiposGerenciaveisResponse>('/usuarios/tipos-gerenciaveis');
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao obter tipos gerenciáveis:', error);
      throw new Error(error.response?.data?.message || 'Erro ao obter tipos gerenciáveis');
    }
  },

  // Listar usuários que o usuário atual pode gerenciar
  async listarGerenciaveis(): Promise<Usuario[]> {
    try {
      const response = await api.get<UsuarioListResponse>('/usuarios/gerenciaveis');
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao listar usuários gerenciáveis:', error);
      throw new Error(error.response?.data?.message || 'Erro ao listar usuários gerenciáveis');
    }
  },

  // Alterar senha de um usuário
  async alterarSenha(id: string, novaSenha: string): Promise<void> {
    try {
      await api.put(`/usuarios/${id}/senha`, { senha: novaSenha });
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      throw new Error(error.response?.data?.message || 'Erro ao alterar senha');
    }
  },

  // Verificar se pode gerenciar um usuário
  async podeGerenciar(tipoGerenciado: TipoUsuario): Promise<boolean> {
    try {
      const response = await api.get<{ success: boolean; data: boolean }>(
        `/usuarios/pode-gerenciar/${tipoGerenciado}`
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  },

  // Obter descrição do tipo de usuário
  getTipoDescricao(tipo: TipoUsuario): string {
    switch (tipo) {
      case 'ADMINISTRADOR':
        return 'Administrador';
      case 'GERENTE':
        return 'Gerente';
      case 'FARMACEUTICO':
        return 'Farmacêutico';
      case 'VENDEDOR':
        return 'Vendedor';
      case 'PDV':
        return 'PDV';
      case 'CAIXA':
        return 'Caixa';
      default:
        return 'Desconhecido';
    }
  },

  // Obter cor do badge do tipo de usuário
  getTipoCor(tipo: TipoUsuario): string {
    switch (tipo) {
      case 'ADMINISTRADOR':
        return 'bg-red-100 text-red-800';
      case 'GERENTE':
        return 'bg-purple-100 text-purple-800';
      case 'FARMACEUTICO':
        return 'bg-blue-100 text-blue-800';
      case 'VENDEDOR':
        return 'bg-green-100 text-green-800';
      case 'PDV':
        return 'bg-yellow-100 text-yellow-800';
      case 'CAIXA':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
};

export default usuarioService;