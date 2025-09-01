import { TipoUsuario } from '@prisma/client';

export interface JwtPayload {
  usuarioId: string;
  login: string;
  tipo: TipoUsuario;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  login: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  usuario: UsuarioResponse;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AlterarSenhaRequest {
  senhaAtual: string;
  novaSenha: string;
  confirmaNovaSenha: string;
}

export interface UsuarioResponse {
  id: string;
  nome: string;
  login: string;
  tipo: TipoUsuario;
  tipoDescricao: string;
  ativo: boolean;
  ultimoLogin?: string;
  criadoEm: string;
  modulosPermitidos: string[];
}

export interface AuthenticatedRequest {
  usuario: {
    id: string;
    login: string;
    tipo: TipoUsuario;
  };
}
