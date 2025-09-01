import bcrypt from 'bcryptjs';
import { AuthService } from '@/application/services/AuthService';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { UnauthorizedError, ValidationError } from '@/presentation/middleware/errorHandler';
import { TipoUsuario } from '@prisma/client';
import {
  testUsers,
  testRefreshTokens,
  mockPrismaClient,
  resetAllMocks,
  generateTestToken,
} from '../../helpers/testHelpers.helper';

// Mock do bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock do DatabaseConnection
jest.mock('@/infrastructure/database/connection');
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<typeof DatabaseConnection>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    resetAllMocks();
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedPassword');
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
    authService = new AuthService();
    mockDatabaseConnection.getClient.mockReturnValue(mockPrismaClient as any);
  });

  describe('login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      // Arrange
      const loginData = { login: 'admin', senha: 'admin123' };
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const mockUser = { ...testUsers.admin, senhaHash: hashedPassword };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.usuario.update.mockResolvedValue(mockUser);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.refreshToken.create.mockResolvedValue(testRefreshTokens.valid);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('usuario');
      expect(result.usuario.login).toBe('admin');
      expect(result.usuario.tipo).toBe(TipoUsuario.ADMINISTRADOR);
    });

    it('deve rejeitar login com senha incorreta', async () => {
      // Arrange
      const loginData = { login: 'admin', senha: 'senhaerrada' };
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const mockUser = { ...testUsers.admin, senhaHash: hashedPassword };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
      expect(mockPrismaClient.usuario.findUnique).toHaveBeenCalledWith({
        where: { login: 'admin' },
      });
    });

    it('deve rejeitar login com usuário inexistente', async () => {
      // Arrange
      const loginData = { login: 'inexistente', senha: 'senha123' };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
    });

    it('deve rejeitar login com usuário inativo', async () => {
      // Arrange
      const loginData = { login: 'inativo', senha: 'inativo123' };
      const mockUser = { ...testUsers.inativo };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(authService.login(loginData)).rejects.toThrow(UnauthorizedError);
    });

    it('deve validar campos obrigatórios', async () => {
      // Act & Assert
      await expect(authService.login({ login: '', senha: 'senha' })).rejects.toThrow(ValidationError);
      await expect(authService.login({ login: 'user', senha: '' })).rejects.toThrow(ValidationError);
    });

    it('deve atualizar último login do usuário', async () => {
      // Arrange
      const loginData = { login: 'admin', senha: 'admin123' };
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const mockUser = { ...testUsers.admin, senhaHash: hashedPassword };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.usuario.update.mockResolvedValue(mockUser);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.refreshToken.create.mockResolvedValue(testRefreshTokens.valid);

      // Act
      await authService.login(loginData);

      // Assert
      expect(mockPrismaClient.usuario.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { ultimoLogin: expect.any(Date) },
      });
    });
  });

  describe('refresh', () => {
    it('deve renovar token com refresh token válido', async () => {
      // Arrange
      const refreshData = { refreshToken: 'valid-refresh-token-123' };
      const mockTokenRecord = {
        ...testRefreshTokens.valid,
        usuario: testUsers.admin,
      };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockPrismaClient.refreshToken.delete.mockResolvedValue(testRefreshTokens.valid);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.refreshToken.create.mockResolvedValue(testRefreshTokens.valid);

      // Act
      const result = await authService.refresh(refreshData);

      // Assert
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.usuario.id).toBe(testUsers.admin.id);
    });

    it('deve rejeitar refresh token expirado', async () => {
      // Arrange
      const refreshData = { refreshToken: 'expired-refresh-token-123' };
      const mockTokenRecord = {
        ...testRefreshTokens.expired,
        usuario: testUsers.admin,
      };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);

      // Act & Assert
      await expect(authService.refresh(refreshData)).rejects.toThrow(UnauthorizedError);
    });

    it('deve rejeitar refresh token inexistente', async () => {
      // Arrange
      const refreshData = { refreshToken: 'token-inexistente' };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refresh(refreshData)).rejects.toThrow(UnauthorizedError);
    });

    it('deve remover refresh token usado', async () => {
      // Arrange
      const refreshData = { refreshToken: 'valid-refresh-token-123' };
      const mockTokenRecord = {
        ...testRefreshTokens.valid,
        usuario: testUsers.admin,
      };

      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      mockPrismaClient.refreshToken.delete.mockResolvedValue(testRefreshTokens.valid);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.refreshToken.create.mockResolvedValue(testRefreshTokens.valid);

      // Act
      await authService.refresh(refreshData);

      // Assert
      expect(mockPrismaClient.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: testRefreshTokens.valid.id },
      });
    });
  });

  describe('logout', () => {
    it('deve fazer logout removendo refresh token', async () => {
      // Arrange
      const refreshToken = 'token-para-remover';

      mockPrismaClient.refreshToken.delete.mockResolvedValue(testRefreshTokens.valid);

      // Act
      await authService.logout(refreshToken);

      // Assert
      expect(mockPrismaClient.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
    });

    it('deve fazer logout silencioso se refresh token não existir', async () => {
      // Arrange
      const refreshToken = 'token-inexistente';
      const error = new Error('Token not found');

      mockPrismaClient.refreshToken.delete.mockRejectedValue(error);

      // Act & Assert
      await expect(authService.logout(refreshToken)).resolves.not.toThrow();
    });

    it('deve aceitar logout sem refresh token', async () => {
      // Act & Assert
      await expect(authService.logout('')).resolves.not.toThrow();
      expect(mockPrismaClient.refreshToken.delete).not.toHaveBeenCalled();
    });
  });

  describe('alterarSenha', () => {
    it('deve alterar senha com dados válidos', async () => {
      // Arrange
      const usuarioId = testUsers.admin.id;
      const senhaData = {
        senhaAtual: 'admin123',
        novaSenha: 'novasenha123',
        confirmaNovaSenha: 'novasenha123',
      };
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const mockUser = { ...testUsers.admin, senhaHash: hashedPassword };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);
      mockPrismaClient.usuario.update.mockResolvedValue(mockUser);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await authService.alterarSenha(usuarioId, senhaData);

      // Assert
      expect(mockPrismaClient.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioId },
        data: { senhaHash: expect.any(String) },
      });
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId },
      });
    });

    it('deve rejeitar senha atual incorreta', async () => {
      // Arrange
      const usuarioId = testUsers.admin.id;
      const senhaData = {
        senhaAtual: 'senhaerrada',
        novaSenha: 'novasenha123',
        confirmaNovaSenha: 'novasenha123',
      };
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const mockUser = { ...testUsers.admin, senhaHash: hashedPassword };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(mockUser);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.alterarSenha(usuarioId, senhaData)).rejects.toThrow(UnauthorizedError);
    });

    it('deve validar confirmação de senha', async () => {
      // Arrange
      const usuarioId = testUsers.admin.id;
      const senhaData = {
        senhaAtual: 'admin123',
        novaSenha: 'novasenha123',
        confirmaNovaSenha: 'senhadiferente',
      };

      // Act & Assert
      await expect(authService.alterarSenha(usuarioId, senhaData)).rejects.toThrow(ValidationError);
    });

    it('deve validar tamanho mínimo da nova senha', async () => {
      // Arrange
      const usuarioId = testUsers.admin.id;
      const senhaData = {
        senhaAtual: 'admin123',
        novaSenha: '123',
        confirmaNovaSenha: '123',
      };

      // Act & Assert
      await expect(authService.alterarSenha(usuarioId, senhaData)).rejects.toThrow(ValidationError);
    });
  });

  describe('verifyToken', () => {
    it('deve verificar token válido', () => {
      // Arrange
      const payload = {
        usuarioId: testUsers.admin.id,
        login: testUsers.admin.login,
        tipo: testUsers.admin.tipo,
      };
      const token = generateTestToken(payload);

      // Act
      const result = authService.verifyToken(token);

      // Assert
      expect(result.usuarioId).toBe(payload.usuarioId);
      expect(result.login).toBe(payload.login);
      expect(result.tipo).toBe(payload.tipo);
    });

    it('deve rejeitar token inválido', () => {
      // Arrange
      const invalidToken = 'token.invalido.aqui';

      // Act & Assert
      expect(() => authService.verifyToken(invalidToken)).toThrow(UnauthorizedError);
    });

    it('deve rejeitar token expirado', () => {
      // Arrange
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      // Act & Assert
      expect(() => authService.verifyToken(expiredToken)).toThrow(UnauthorizedError);
    });
  });

  describe('obterUsuarioLogado', () => {
    it('deve retornar dados do usuário logado', async () => {
      // Arrange
      const usuarioId = testUsers.admin.id;

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.admin);

      // Act
      const result = await authService.obterUsuarioLogado(usuarioId);

      // Assert
      expect(result.id).toBe(testUsers.admin.id);
      expect(result.nome).toBe(testUsers.admin.nome);
      expect(result.login).toBe(testUsers.admin.login);
      expect(result).not.toHaveProperty('senhaHash');
    });

    it('deve rejeitar usuário inexistente', async () => {
      // Arrange
      const usuarioId = 'usuario-inexistente';

      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.obterUsuarioLogado(usuarioId)).rejects.toThrow(UnauthorizedError);
    });

    it('deve rejeitar usuário inativo', async () => {
      // Arrange
      const usuarioId = testUsers.inativo.id;

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.inativo);

      // Act & Assert
      await expect(authService.obterUsuarioLogado(usuarioId)).rejects.toThrow(UnauthorizedError);
    });
  });
});
