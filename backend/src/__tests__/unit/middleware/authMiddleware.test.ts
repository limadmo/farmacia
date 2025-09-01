import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';
import { AuthService } from '@/application/services/AuthService';
import { UnauthorizedError } from '@/presentation/middleware/errorHandler';
import { TipoUsuario } from '@prisma/client';
import { generateTestToken, testUsers } from '../../helpers/testHelpers.helper';

// Mock do AuthService
jest.mock('@/application/services/AuthService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('authMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {};
    next = jest.fn();

    // Reset do mock
    authService = new MockedAuthService() as jest.Mocked<AuthService>;
    MockedAuthService.mockImplementation(() => authService);
  });

  it('deve autenticar usuário com token válido', async () => {
    // Arrange
    const token = generateTestToken({});
    const payload = {
      usuarioId: testUsers.admin.id,
      login: testUsers.admin.login,
      tipo: testUsers.admin.tipo,
    };

    req.headers = {
      authorization: `Bearer ${token}`,
    };

    authService.verifyToken.mockReturnValue(payload);

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect((req as any).usuario).toEqual({
      id: payload.usuarioId,
      login: payload.login,
      tipo: payload.tipo,
    });
    expect(next).toHaveBeenCalledWith();
    expect(authService.verifyToken).toHaveBeenCalledWith(token);
  });

  it('deve rejeitar requisição sem header Authorization', async () => {
    // Arrange
    req.headers = {};

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect((req as any).usuario).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  it('deve rejeitar header Authorization inválido', async () => {
    // Arrange
    req.headers = {
      authorization: 'InvalidFormat token',
    };

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect((req as any).usuario).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  it('deve rejeitar token ausente após Bearer', async () => {
    // Arrange
    req.headers = {
      authorization: 'Bearer',
    };

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect((req as any).usuario).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  it('deve rejeitar token malformado', async () => {
    // Arrange
    const invalidToken = 'token.malformado.aqui';
    req.headers = {
      authorization: `Bearer ${invalidToken}`,
    };

    authService.verifyToken.mockImplementation(() => {
      throw new UnauthorizedError('Token inválido');
    });

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect((req as any).usuario).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(authService.verifyToken).toHaveBeenCalledWith(invalidToken);
  });

  it('deve rejeitar token expirado', async () => {
    // Arrange
    const expiredToken = 'expired.jwt.token';
    req.headers = {
      authorization: `Bearer ${expiredToken}`,
    };

    authService.verifyToken.mockImplementation(() => {
      throw new UnauthorizedError('Token expirado');
    });

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect((req as any).usuario).toBeUndefined();
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('deve processar diferentes tipos de usuário', async () => {
    // Test Administrador
    const adminToken = generateTestToken({
      usuarioId: testUsers.admin.id,
      login: testUsers.admin.login,
      tipo: TipoUsuario.ADMINISTRADOR,
    });

    req.headers = { authorization: `Bearer ${adminToken}` };
    authService.verifyToken.mockReturnValue({
      usuarioId: testUsers.admin.id,
      login: testUsers.admin.login,
      tipo: TipoUsuario.ADMINISTRADOR,
    });

    await authMiddleware(req as Request, res as Response, next);

    expect((req as any).usuario?.tipo).toBe(TipoUsuario.ADMINISTRADOR);
    expect(next).toHaveBeenCalledWith();

    // Reset
    jest.clearAllMocks();
    (req as any).usuario = undefined;

    // Test Vendedor
    const vendedorToken = generateTestToken({
      usuarioId: testUsers.vendedor.id,
      login: testUsers.vendedor.login,
      tipo: TipoUsuario.VENDEDOR,
    });

    req.headers = { authorization: `Bearer ${vendedorToken}` };
    authService.verifyToken.mockReturnValue({
      usuarioId: testUsers.vendedor.id,
      login: testUsers.vendedor.login,
      tipo: TipoUsuario.VENDEDOR,
    });

    await authMiddleware(req as Request, res as Response, next);

    expect((req as any).usuario?.tipo).toBe(TipoUsuario.VENDEDOR);
    expect(next).toHaveBeenCalledWith();
  });

  it('deve tratar erros inesperados', async () => {
    // Arrange
    const token = generateTestToken({});
    req.headers = {
      authorization: `Bearer ${token}`,
    };

    const unexpectedError = new Error('Erro inesperado no serviço');
    authService.verifyToken.mockImplementation(() => {
      throw unexpectedError;
    });

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect((req as any).usuario).toBeUndefined();
    expect(next).toHaveBeenCalledWith(unexpectedError);
  });

  it('deve preservar case sensitivity do Bearer', async () => {
    // Test com 'bearer' em minúsculo
    const token = generateTestToken({});
    req.headers = {
      authorization: `bearer ${token}`,
    };

    await authMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });

  it('deve tratar header authorization com espaços extras', async () => {
    // Arrange
    const token = generateTestToken({});
    req.headers = {
      authorization: `  Bearer   ${token}  `,
    };

    // Act
    await authMiddleware(req as Request, res as Response, next);

    // Assert
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    expect(authService.verifyToken).not.toHaveBeenCalled();
  });
});
