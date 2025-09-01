import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock do bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

// Mock manual do Prisma para este teste
const mockPrismaClient = {
  usuario: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    deleteMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

// Mock do DatabaseConnection
jest.mock('../../../infrastructure/database/connection', () => ({
  DatabaseConnection: {
    getClient: () => mockPrismaClient,
  },
}));

// Mock do logger
jest.mock('../../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { AuthService } from '../../../application/services/AuthService';
import { UnauthorizedError, ValidationError } from '../../../presentation/middleware/errorHandler';

describe('AuthService - Simplified Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('deve validar campos obrigatórios', async () => {
      // Teste sem login
      await expect(authService.login({ login: '', senha: 'senha' }))
        .rejects.toThrow(ValidationError);

      // Teste sem senha
      await expect(authService.login({ login: 'user', senha: '' }))
        .rejects.toThrow(ValidationError);
    });

    it('deve rejeitar usuário inexistente', async () => {
      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);

      await expect(authService.login({ login: 'inexistente', senha: 'senha' }))
        .rejects.toThrow(UnauthorizedError);
    });

    it('deve rejeitar usuário inativo', async () => {
      const userInativo = {
        id: 'user-id',
        login: 'user',
        senhaHash: 'hash',
        ativo: false,
      };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(userInativo);

      await expect(authService.login({ login: 'user', senha: 'senha' }))
        .rejects.toThrow(UnauthorizedError);
    });

    it('deve processar login com credenciais válidas', async () => {
      const senha = 'admin123';
      const senhaHash = 'hashed-password';
      const mockUser = {
        id: 'admin-id',
        nome: 'Admin',
        login: 'admin',
        senhaHash,
        tipo: 'ADMINISTRADOR',
        ativo: true,
        ultimoLogin: new Date(),
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      // Mock bcrypt.compare para retornar true
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.usuario.update.mockResolvedValue(mockUser);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.refreshToken.create.mockResolvedValue({
        id: 'refresh-id',
        token: 'refresh-token',
        usuarioId: 'admin-id',
        expiresEm: new Date(),
        criadoEm: new Date(),
      });

      const result = await authService.login({ login: 'admin', senha });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('usuario');
      expect(result.usuario.login).toBe('admin');
    });
  });

  describe('verifyToken', () => {
    it('deve verificar token válido', () => {
      const payload = {
        usuarioId: 'user-id',
        login: 'user',
        tipo: 'ADMINISTRADOR',
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '15m',
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });

      const result = authService.verifyToken(token);

      expect(result.usuarioId).toBe(payload.usuarioId);
      expect(result.login).toBe(payload.login);
      expect(result.tipo).toBe(payload.tipo);
    });

    it('deve rejeitar token inválido', () => {
      const invalidToken = 'token.invalido.aqui';

      expect(() => authService.verifyToken(invalidToken))
        .toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('deve fazer logout removendo refresh token', async () => {
      const refreshToken = 'token-para-remover';

      mockPrismaClient.refreshToken.delete.mockResolvedValue({});

      await authService.logout(refreshToken);

      expect(mockPrismaClient.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
    });

    it('deve fazer logout silencioso se token não existir', async () => {
      const refreshToken = 'token-inexistente';
      const error = new Error('Token not found');

      mockPrismaClient.refreshToken.delete.mockRejectedValue(error);

      await expect(authService.logout(refreshToken)).resolves.not.toThrow();
    });
  });

  describe('obterUsuarioLogado', () => {
    it('deve retornar dados do usuário logado', async () => {
      const mockUser = {
        id: 'user-id',
        nome: 'Usuario Teste',
        login: 'user',
        tipo: 'VENDEDOR',
        ativo: true,
        ultimoLogin: new Date(),
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);

      const result = await authService.obterUsuarioLogado('user-id');

      expect(result.id).toBe('user-id');
      expect(result.nome).toBe('Usuario Teste');
      expect(result).not.toHaveProperty('senhaHash');
    });

    it('deve rejeitar usuário inexistente', async () => {
      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);

      await expect(authService.obterUsuarioLogado('user-inexistente'))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});
