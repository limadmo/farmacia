/**
 * Testes Abrangentes do AuthService - Sistema de Farmácia
 * 
 * Cobre cenários críticos:
 * - Login válido/inválido
 * - Geração e validação de tokens JWT
 * - Refresh tokens
 * - Alteração de senhas
 * - Validação de permissões
 * - Casos de erro e edge cases
 */

import { AuthService } from '../../../application/services/AuthService';
import { UsuarioService } from '../../../application/services/UsuarioService';
import { DatabaseConnection } from '../../../infrastructure/database/connection';
import { PrismaClient, TipoUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

// Mocks
jest.mock('../../../application/services/UsuarioService');
jest.mock('../../../infrastructure/database/connection');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('uuid');
jest.mock('crypto');

const mockUsuarioService = {
  buscarPorLogin: jest.fn(),
  buscarPorId: jest.fn(),
  atualizarSenha: jest.fn(),
};

const mockPrisma = {
  usuario: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  $disconnect: jest.fn(),
};

describe('AuthService - Testes Abrangentes', () => {
  let authService: AuthService;
  const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;
  const mockUuid = uuidv4 as jest.Mock;
  const mockRandomBytes = randomBytes as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock do UsuarioService
    (UsuarioService as jest.MockedClass<typeof UsuarioService>).mockImplementation(
      () => mockUsuarioService as any
    );
    
    // Mock do DatabaseConnection
    (DatabaseConnection.getClient as jest.Mock) = jest.fn().mockReturnValue(mockPrisma);
    
    authService = new AuthService();
    
    // Setup de variáveis de ambiente
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'FarmaciaTestAPI';
    process.env.JWT_AUDIENCE = 'FarmaciaTestApp';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
  });

  describe('login', () => {
    const mockUsuario = {
      id: 'user-123',
      nome: 'João Silva',
      login: 'joao',
      senhaHash: 'hashed-password',
      tipo: TipoUsuario.VENDEDOR,
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    };

    it('deve fazer login com sucesso para usuário válido', async () => {
      // Arrange
      const loginData = { login: 'joao', senha: 'senha123' };
      const mockToken = 'mock.jwt.token';
      const mockRefreshToken = 'refresh-token-uuid';
      
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockJwt.sign as jest.Mock).mockReturnValue(mockToken);
      mockUuid.mockReturnValue(mockRefreshToken);
      mockRandomBytes.mockReturnValue({ toString: () => mockRefreshToken });
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'refresh-id',
        token: mockRefreshToken,
        usuarioId: mockUsuario.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result).toHaveProperty('token', mockToken);
      expect(result).toHaveProperty('refreshToken', mockRefreshToken);
      expect(result).toHaveProperty('usuario');
      expect(result.usuario.id).toBe(mockUsuario.id);
      expect(result.usuario.nome).toBe(mockUsuario.nome);
      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({ where: { login: 'joao' } });
      expect(mockBcrypt.compare).toHaveBeenCalledWith('senha123', 'hashed-password');
    });

    it('deve rejeitar login com usuário inexistente', async () => {
      // Arrange
      const loginData = { login: 'inexistente', senha: 'senha123' };
      mockUsuarioService.buscarPorLogin.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects
        .toThrow('Credenciais inválidas');
      
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('deve rejeitar login com senha incorreta', async () => {
      // Arrange
      const loginData = { login: 'joao', senha: 'senhaerrada' };
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects
        .toThrow('Credenciais inválidas');
    });

    it('deve rejeitar login para usuário inativo', async () => {
      // Arrange
      const loginData = { login: 'joao', senha: 'senha123' };
      const usuarioInativo = { ...mockUsuario, ativo: false };
      mockPrisma.usuario.findUnique.mockResolvedValue(usuarioInativo);

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects
        .toThrow('Credenciais inválidas');
      
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
    });

    it('deve incluir módulos permitidos baseados no tipo de usuário', async () => {
      // Arrange
      const loginData = { login: 'admin', senha: 'admin123' };
      const adminUsuario = { ...mockUsuario, tipo: TipoUsuario.ADMINISTRADOR };
      
      mockPrisma.usuario.findUnique.mockResolvedValue(adminUsuario);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.sign.mockReturnValue('token' as never);
      mockUuid.mockReturnValue('refresh-token');
        mockRandomBytes.mockReturnValue({ toString: () => 'refresh-token' });
      mockPrisma.refreshToken.create.mockResolvedValue({} as any);

      // Act
      const result = await authService.login(loginData);

      // Assert
      expect(result.usuario.modulosPermitidos).toContain('usuarios');
      expect(result.usuario.modulosPermitidos).toContain('fornecedores');
      expect(result.usuario.modulosPermitidos).toContain('relatorios');
    });
  });

  describe('refresh', () => {
    it('deve renovar token com refresh token válido', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockUsuario = {
        id: 'user-123',
        nome: 'João Silva',
        login: 'joao',
        tipo: TipoUsuario.VENDEDOR,
        ativo: true,
        criadoEm: new Date(),
      };
      const newToken = 'new.jwt.token';
      
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-id',
        token: refreshToken,
        usuarioId: mockUsuario.id,
        expiresEm: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 dia no futuro
        usuario: mockUsuario,
      });
      (mockJwt.sign as jest.Mock).mockReturnValue(newToken);
      mockPrisma.refreshToken.delete.mockResolvedValue({});
      
      // Mock para generateTokens
      mockRandomBytes.mockReturnValue({ toString: () => 'new-refresh-token' });
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'new-refresh-id',
        token: 'new-refresh-token',
        usuarioId: mockUsuario.id,
        expiresEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      // Act
      const result = await authService.refresh({ refreshToken });

      // Assert
      expect(result).toHaveProperty('token', newToken);
      expect(result).toHaveProperty('usuario');
      expect(result.usuario.id).toBe(mockUsuario.id);
    });

    it('deve rejeitar refresh token inexistente', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refresh({ refreshToken }))
        .rejects
        .toThrow('Refresh token inválido ou expirado');
    });

    it('deve rejeitar refresh token expirado', async () => {
      // Arrange
      const refreshToken = 'expired-refresh-token';
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-id',
        token: refreshToken,
        usuarioId: 'user-123',
        expiresEm: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia no passado
        usuario: { ativo: true },
      });

      // Act & Assert
      await expect(authService.refresh({ refreshToken }))
        .rejects
        .toThrow('Refresh token inválido ou expirado');
    });

    it('deve rejeitar refresh token de usuário inativo', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-id',
        token: refreshToken,
        usuarioId: 'user-123',
        expiresEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usuario: { ativo: false },
      });

      // Act & Assert
      await expect(authService.refresh({ refreshToken }))
        .rejects
        .toThrow('Refresh token inválido ou expirado');
    });
  });

  describe('logout', () => {
    it('deve fazer logout removendo refresh token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      mockPrisma.refreshToken.delete.mockResolvedValue({} as any);

      // Act
      await authService.logout(refreshToken);

      // Assert
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
    });

    it('deve lidar com refresh token inexistente no logout', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      mockPrisma.refreshToken.delete.mockRejectedValue(new Error('Not found'));

      // Act & Assert
      await expect(authService.logout(refreshToken)).resolves.not.toThrow();
    });
  });

  describe('verifyToken', () => {
    it('deve verificar token JWT válido', async () => {
      // Arrange
      const token = 'valid.jwt.token';
      const decodedPayload = {
        id: 'user-123',
        login: 'joao',
        tipo: TipoUsuario.VENDEDOR,
      };
      (mockJwt.verify as jest.Mock).mockReturnValue(decodedPayload);

      // Act
      const result = await authService.verifyToken(token);

      // Assert
      expect(result).toEqual(decodedPayload);
      expect(mockJwt.verify).toHaveBeenCalledWith(
        token,
        'test-secret',
        expect.objectContaining({
          issuer: 'FarmaciaTestAPI',
          audience: 'FarmaciaTestApp',
        })
      );
    });

    it('deve rejeitar token JWT inválido', async () => {
      // Arrange
      const token = 'invalid.jwt.token';
      (mockJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      expect(() => authService.verifyToken(token))
        .toThrow('Token inválido');
    });
  });

  describe('alterarSenha', () => {
    it('deve alterar senha com sucesso', async () => {
      // Arrange
      const userId = 'user-123';
      const senhaAtual = 'senhaatual';
      const novaSenha = 'novasenha123';
      const mockUsuario = {
        id: userId,
        senhaHash: 'current-hash',
      };
      
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockPrisma.usuario.update.mockResolvedValue(undefined);

      // Act
      await authService.alterarSenha(userId, {
        senhaAtual,
        novaSenha,
        confirmaNovaSenha: novaSenha
      });

      // Assert
      expect(mockBcrypt.compare).toHaveBeenCalledWith(senhaAtual, 'current-hash');
      expect(mockBcrypt.hash).toHaveBeenCalledWith(novaSenha, 12);
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { senhaHash: 'new-hash' }
      });
    });

    it('deve rejeitar alteração com senha atual incorreta', async () => {
      // Arrange
      const userId = 'user-123';
      const senhaAtual = 'senhaerrada';
      const novaSenha = 'novasenha123';
      const mockUsuario = { id: userId, senhaHash: 'current-hash' };
      
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(authService.alterarSenha(userId, {
        senhaAtual,
        novaSenha,
        confirmaNovaSenha: novaSenha
      }))
        .rejects
        .toThrow('Senha atual incorreta');
      
      expect(mockPrisma.usuario.update).not.toHaveBeenCalled();
    });

    it('deve rejeitar alteração para usuário inexistente', async () => {
      // Arrange
      const userId = 'user-inexistente';
      const senhaAtual = 'senhaatual';
      const novaSenha = 'novasenha123';
      
      mockUsuarioService.buscarPorId.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.alterarSenha(userId, {
        senhaAtual,
        novaSenha,
        confirmaNovaSenha: novaSenha
      }))
        .rejects
        .toThrow('Usuário não encontrado');
    });
  });

  describe('obterUsuarioLogado', () => {
    it('deve retornar dados do usuário logado', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUsuario = {
        id: userId,
        nome: 'João Silva',
        login: 'joao',
        tipo: TipoUsuario.VENDEDOR,
        ativo: true,
        criadoEm: new Date(),
      };
      
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUsuario);

      // Act
      const result = await authService.obterUsuarioLogado(userId);

      // Assert
      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('nome', 'João Silva');
      expect(result).toHaveProperty('modulosPermitidos');
      expect(result.modulosPermitidos).toContain('vendas');
      expect(result.modulosPermitidos).toHaveLength(4); // vendas, clientes, estoque, produtos
    });

    it('deve rejeitar para usuário inexistente', async () => {
      // Arrange
      const userId = 'user-inexistente';
      mockUsuarioService.buscarPorId.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.obterUsuarioLogado(userId))
        .rejects
        .toThrow('Usuário não encontrado ou inativo');
    });
  });

  describe('Casos de erro e edge cases', () => {
    it('deve lidar com erro de conexão com banco de dados', async () => {
      // Arrange
      const loginData = { login: 'joao', senha: 'senha123' };
      mockPrisma.usuario.findUnique.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(authService.login(loginData))
        .rejects
        .toThrow('connection');
    });

    it('deve validar entrada de dados no login', async () => {
      // Act & Assert
      await expect(authService.login({ login: '', senha: 'senha123' }))
        .rejects
        .toThrow();
      
      await expect(authService.login({ login: 'joao', senha: '' }))
        .rejects
        .toThrow();
    });


  });

  afterEach(async () => {
    await mockPrisma.$disconnect();
  });
});