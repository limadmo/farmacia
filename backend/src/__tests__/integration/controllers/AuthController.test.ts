import request from 'supertest';
import express from 'express';
import { AuthController } from '@/presentation/controllers/AuthController';
import { AuthService } from '@/application/services/AuthService';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';
import { errorHandler, UnauthorizedError } from '@/presentation/middleware/errorHandler';
import { TipoUsuario } from '@prisma/client';
import {
  testUsers,
  createAuthHeaders,
  expectSuccessResponse,
  expectErrorResponse,
  expectAuthHeaders,
  generateTestToken,
  generateExpiredTestToken,
} from '../../helpers/testHelpers.helper';

// Mock do AuthService
jest.mock('@/application/services/AuthService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('AuthController Integration', () => {
  let app: express.Application;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    // Configurar app Express para testes
    app = express();
    app.use(express.json());

    // Mock do AuthService
    authService = new MockedAuthService() as jest.Mocked<AuthService>;
    MockedAuthService.mockImplementation(() => authService);

    // Configurar rotas
    const authController = new AuthController();
    app.post('/auth/login', authController.login.bind(authController));
    app.post('/auth/refresh', authController.refresh.bind(authController));
    app.post('/auth/logout', authMiddleware, authController.logout.bind(authController));
    app.get('/auth/me', authMiddleware, authController.me.bind(authController));
    app.put('/auth/alterar-senha', authMiddleware, authController.alterarSenha.bind(authController));

    // Error handler
    app.use(errorHandler);
  });

  describe('POST /auth/login', () => {
    it('deve fazer login com credenciais válidas', async () => {
      // Arrange
      const loginData = { login: 'admin', senha: 'admin123' };
      const mockResponse = {
        token: 'mock.jwt.token',
        refreshToken: 'mock-refresh-token',
        expiresAt: '2025-01-16T12:00:00Z',
        usuario: {
          id: testUsers.admin.id,
          nome: testUsers.admin.nome,
          login: testUsers.admin.login,
          tipo: testUsers.admin.tipo,
          tipoDescricao: 'Administrador',
          ativo: true,
          criadoEm: testUsers.admin.criadoEm.toISOString(),
          modulosPermitidos: ['Clientes', 'Estoque', 'Fornecedores', 'Vendas', 'Promocoes', 'Usuarios', 'Relatorios'],
        },
      };

      authService.login.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      // Assert
      expectSuccessResponse(response, 200);
      expectAuthHeaders(response);
      expect(response.body.usuario.login).toBe('admin');
      expect(authService.login).toHaveBeenCalledWith(loginData);
    });

    it('deve rejeitar login sem dados', async () => {
      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({});

      // Assert
      expectErrorResponse(response, 400);
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('deve rejeitar login com credenciais inválidas', async () => {
      // Arrange
      const loginData = { login: 'admin', senha: 'senhaerrada' };
      const error = new Error('Credenciais inválidas');
      error.name = 'UnauthorizedError';
      (error as any).statusCode = 401;

      authService.login.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      // Assert
      expectErrorResponse(response, 401);
    });

    it('deve validar campos obrigatórios', async () => {
      // Test sem login
      let response = await request(app)
        .post('/auth/login')
        .send({ senha: 'senha123' });

      expectErrorResponse(response, 400, 'Login e senha são obrigatórios');

      // Test sem senha
      response = await request(app)
        .post('/auth/login')
        .send({ login: 'admin' });

      expectErrorResponse(response, 400, 'Login e senha são obrigatórios');
    });
  });

  describe('POST /auth/refresh', () => {
    it('deve renovar token com refresh token válido', async () => {
      // Arrange
      const refreshData = { refreshToken: 'valid-refresh-token' };
      const mockResponse = {
        token: 'new.jwt.token',
        refreshToken: 'new-refresh-token',
        expiresAt: '2025-01-16T13:00:00Z',
        usuario: {
          id: testUsers.admin.id,
          nome: testUsers.admin.nome,
          login: testUsers.admin.login,
          tipo: testUsers.admin.tipo,
          tipoDescricao: 'Administrador',
          ativo: true,
          criadoEm: testUsers.admin.criadoEm.toISOString(),
          modulosPermitidos: ['Clientes', 'Estoque', 'Fornecedores', 'Vendas', 'Promocoes', 'Usuarios', 'Relatorios'],
        },
      };

      authService.refresh.mockResolvedValue(mockResponse);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      // Assert
      expectSuccessResponse(response, 200);
      expectAuthHeaders(response);
      expect(authService.refresh).toHaveBeenCalledWith(refreshData);
    });

    it('deve rejeitar refresh token inválido', async () => {
      // Arrange
      const refreshData = { refreshToken: 'invalid-refresh-token' };
      const error = new Error('Refresh token inválido ou expirado');
      error.name = 'UnauthorizedError';
      (error as any).statusCode = 401;

      authService.refresh.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData);

      // Assert
      expectErrorResponse(response, 401);
    });

    it('deve validar presença do refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      // Assert
      expectErrorResponse(response, 400, 'Refresh token é obrigatório');
      expect(authService.refresh).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('deve fazer logout com sucesso', async () => {
      // Arrange
      const logoutData = { refreshToken: 'token-to-logout' };
      const token = generateTestToken({});

      authService.verifyToken.mockReturnValue({
        usuarioId: testUsers.admin.id,
        login: testUsers.admin.login,
        tipo: testUsers.admin.tipo,
      });
      authService.logout.mockResolvedValue();

      // Act
      const response = await request(app)
        .post('/auth/logout')
        .set(createAuthHeaders(token))
        .send(logoutData);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body.message).toBe('Logout realizado com sucesso');
      expect(authService.logout).toHaveBeenCalledWith(logoutData.refreshToken);
    });

    it('deve rejeitar logout sem autenticação', async () => {
      // Act
      const response = await request(app)
        .post('/auth/logout')
        .send({ refreshToken: 'some-token' });

      // Assert
      expectErrorResponse(response, 401);
      expect(authService.logout).not.toHaveBeenCalled();
    });

    it('deve aceitar logout sem refresh token', async () => {
      // Arrange
      const token = generateTestToken({});

      authService.verifyToken.mockReturnValue({
        usuarioId: testUsers.admin.id,
        login: testUsers.admin.login,
        tipo: testUsers.admin.tipo,
      });
      authService.logout.mockResolvedValue();

      // Act
      const response = await request(app)
        .post('/auth/logout')
        .set(createAuthHeaders(token))
        .send({});

      // Assert
      expectSuccessResponse(response, 200);
    });
  });

  describe('GET /auth/me', () => {
    it('deve retornar dados do usuário logado', async () => {
      // Arrange
      const token = generateTestToken({});
      const mockUser = {
        id: testUsers.admin.id,
        nome: testUsers.admin.nome,
        login: testUsers.admin.login,
        tipo: testUsers.admin.tipo,
        tipoDescricao: 'Administrador',
        ativo: true,
        criadoEm: testUsers.admin.criadoEm.toISOString(),
        modulosPermitidos: ['Clientes', 'Estoque', 'Fornecedores', 'Vendas', 'Promocoes', 'Usuarios', 'Relatorios'],
      };

      authService.verifyToken.mockReturnValue({
        usuarioId: testUsers.admin.id,
        login: testUsers.admin.login,
        tipo: testUsers.admin.tipo,
      });
      authService.obterUsuarioLogado.mockResolvedValue(mockUser);

      // Act
      const response = await request(app)
        .get('/auth/me')
        .set(createAuthHeaders(token));

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body.id).toBe(testUsers.admin.id);
      expect(response.body.login).toBe(testUsers.admin.login);
      expect(response.body).not.toHaveProperty('senhaHash');
    });

    it('deve rejeitar acesso sem token', async () => {
      // Act
      const response = await request(app)
        .get('/auth/me');

      // Assert
      expectErrorResponse(response, 401);
      expect(authService.obterUsuarioLogado).not.toHaveBeenCalled();
    });

    it('deve rejeitar token expirado', async () => {
      // Arrange
      const expiredToken = generateExpiredTestToken({});

      authService.verifyToken.mockImplementation(() => {
        throw new UnauthorizedError('Token expirado');
      });

      // Act
      const response = await request(app)
        .get('/auth/me')
        .set(createAuthHeaders(expiredToken));

      // Assert
      expectErrorResponse(response, 401);
    });
  });

  describe('PUT /auth/alterar-senha', () => {
    it('deve alterar senha com dados válidos', async () => {
      // Arrange
      const token = generateTestToken({});
      const senhaData = {
        senhaAtual: 'admin123',
        novaSenha: 'novasenha123',
        confirmaNovaSenha: 'novasenha123',
      };

      authService.verifyToken.mockReturnValue({
        usuarioId: testUsers.admin.id,
        login: testUsers.admin.login,
        tipo: testUsers.admin.tipo,
      });
      authService.alterarSenha.mockResolvedValue();

      // Act
      const response = await request(app)
        .put('/auth/alterar-senha')
        .set(createAuthHeaders(token))
        .send(senhaData);

      // Assert
      expectSuccessResponse(response, 200);
      expect(response.body.message).toBe('Senha alterada com sucesso');
      expect(authService.alterarSenha).toHaveBeenCalledWith(testUsers.admin.id, senhaData);
    });

    it('deve rejeitar alteração sem autenticação', async () => {
      // Arrange
      const senhaData = {
        senhaAtual: 'admin123',
        novaSenha: 'novasenha123',
        confirmaNovaSenha: 'novasenha123',
      };

      // Act
      const response = await request(app)
        .put('/auth/alterar-senha')
        .send(senhaData);

      // Assert
      expectErrorResponse(response, 401);
      expect(authService.alterarSenha).not.toHaveBeenCalled();
    });

    it('deve validar confirmação de senha', async () => {
      // Arrange
      const token = generateTestToken({});
      const senhaData = {
        senhaAtual: 'admin123',
        novaSenha: 'novasenha123',
        confirmaNovaSenha: 'senhadiferente',
      };

      authService.verifyToken.mockReturnValue({
        usuarioId: testUsers.admin.id,
        login: testUsers.admin.login,
        tipo: testUsers.admin.tipo,
      });

      const error = new Error('Nova senha e confirmação não coincidem');
      error.name = 'ValidationError';
      (error as any).statusCode = 400;
      authService.alterarSenha.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .put('/auth/alterar-senha')
        .set(createAuthHeaders(token))
        .send(senhaData);

      // Assert
      expectErrorResponse(response, 400);
    });
  });
});
