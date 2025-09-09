export type TipoUsuario = 'ADMINISTRADOR' | 'GERENTE' | 'FARMACEUTICO' | 'VENDEDOR' | 'PDV' | 'CAIXA';

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  tipo: TipoUsuario;
  tipoDescricao?: string;
  ativo: boolean;
  ultimoLogin?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  modulosPermitidos?: string[];
}

export interface LoginRequest {
  login: string;
  senha: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    usuario: Usuario;
  };
}

export interface CreateUsuarioRequest {
  nome: string;
  login: string;
  senha: string;
  tipo: TipoUsuario;
}

export interface UpdateUsuarioRequest {
  nome?: string;
  tipo?: TipoUsuario;
  ativo?: boolean;
  senha?: string;
}

export interface UsuarioResponse {
  success: boolean;
  message: string;
  data: Usuario;
}

export interface UsuarioListResponse {
  success: boolean;
  message: string;
  data: Usuario[];
}

export interface FiltroUsuario {
  tipo?: TipoUsuario;
  ativo?: boolean;
  nome?: string;
  login?: string;
}

export interface TiposGerenciaveisResponse {
  success: boolean;
  message: string;
  data: TipoUsuario[];
}

export interface ApiError {
  error: {
    message: string;
    status: number;
    timestamp: string;
  };
}
