import request from 'supertest';
import express from 'express';
import { AuthController } from '../../presentation/controllers/AuthController';
import { errorHandler } from '../../presentation/middleware/errorHandler';

// Mock do AuthService
const mockAuthService = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  obterUsuarioLogado: jest.fn(),
  alterarSenha: jest.fn(),
  verifyToken: jest.fn(),
};

jest.mock('../../application/services/AuthService', () => ({
  AuthService: jest.fn().mockImplementation(() => mockAuthService),
}));

describe('Auth Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    const authController = new AuthController();
    
    // Rotas
    app.post('/auth/login', authController.login.bind(authController));
    app.post('/auth/refresh', authController.refresh.bind(authController));
    
    // Error handler
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('deve fazer login com sucesso', async () => {
      const mockResponse = {
        token: 'mock.jwt.token',
        refreshToken: 'mock-refresh-token',
        expiresAt: '2025-01-16T12:00:00Z',
        usuario: {
          id: 'admin-id',
          nome: 'Admin',
          login: 'admin',
          tipo: 'ADMINISTRADOR',
          tipoDescricao: 'Administrador',
          ativo: true,
          criadoEm: '2025-01-16T10:00:00Z',
          modulosPermitidos: ['Clientes', 'Estoque', 'Usuarios'],
        },
      };

      mockAuthService.login.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/login')
        .send({
          login: 'admin',
          senha: 'admin123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.login).toBe('admin');
    });

    it('deve rejeitar login sem dados', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('deve rejeitar login com credenciais inválidas', async () => {
      const error = new Error('Credenciais inválidas');
      error.name = 'UnauthorizedError';
      (error as any).statusCode = 401;

      mockAuthService.login.mockRejectedValue(error);

      const response = await request(app)
        .post('/auth/login')
        .send({
          login: 'admin',
          senha: 'senhaerrada',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/refresh', () => {
    it('deve renovar token com sucesso', async () => {
      const mockResponse = {
        token: 'new.jwt.token',
        refreshToken: 'new-refresh-token',
        expiresAt: '2025-01-16T13:00:00Z',
        usuario: {
          id: 'admin-id',
          nome: 'Admin',
          login: 'admin',
          tipo: 'ADMINISTRADOR',
          tipoDescricao: 'Administrador',
          ativo: true,
          criadoEm: '2025-01-16T10:00:00Z',
          modulosPermitidos: ['Clientes', 'Estoque', 'Usuarios'],
        },
      };

      mockAuthService.refresh.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'valid-refresh-token',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(mockAuthService.refresh).toHaveBeenCalledWith({
        refreshToken: 'valid-refresh-token',
      });
    });

    it('deve rejeitar refresh token inválido', async () => {
      const error = new Error('Refresh token inválido');
      error.name = 'UnauthorizedError';
      (error as any).statusCode = 401;

      mockAuthService.refresh.mockRejectedValue(error);

      const response = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('deve validar presença do refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Refresh token é obrigatório');
    });
  });

  describe('Error Handling', () => {
    it('deve tratar erros internos do servidor', async () => {
      const error = new Error('Database connection failed');
      mockAuthService.login.mockRejectedValue(error);

      const response = await request(app)
        .post('/auth/login')
        .send({
          login: 'admin',
          senha: 'admin123',
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('deve incluir timestamp e path nos erros', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
      expect(response.body).toHaveProperty('method');
      expect(response.body.path).toBe('/auth/login');
      expect(response.body.method).toBe('POST');
    });
  });

  describe('Request Validation', () => {
    it('deve validar Content-Type JSON', async () => {
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'text/plain')
        .send('invalid data');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('deve aceitar dados JSON válidos', async () => {
      mockAuthService.login.mockResolvedValue({
        token: 'test',
        refreshToken: 'test',
        expiresAt: '2025-01-16T12:00:00Z',
        usuario: { id: 'test', nome: 'Test', login: 'test' },
      });

      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          login: 'admin',
          senha: 'admin123',
        }));

      expect(response.status).toBe(200);
    });
  });
});
