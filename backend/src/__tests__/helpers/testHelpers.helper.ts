import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { TipoUsuario } from '@prisma/client';
import { JwtPayload } from '@/shared/types/auth';

// Mock do bcrypt para testes
jest.mock('bcryptjs', () => ({
  hashSync: jest.fn(() => '$2b$12$hashedPassword'),
  compare: jest.fn(() => Promise.resolve(true)),
  hash: jest.fn(() => Promise.resolve('$2b$12$hashedPassword'))
}));

// Dados de teste padrão
export const testUsers = {
  admin: {
    id: 'admin-test-id',
    nome: 'Admin Teste',
    login: 'admin',
    senhaHash: '$2b$12$hashedPassword',
    tipo: TipoUsuario.ADMINISTRADOR,
    ativo: true,
    ultimoLogin: new Date(),
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  },
  vendedor: {
    id: 'vendedor-test-id',
    nome: 'Vendedor Teste',
    login: 'vendedor',
    senhaHash: '$2b$12$hashedPassword',
    tipo: TipoUsuario.VENDEDOR,
    ativo: true,
    ultimoLogin: new Date(),
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  },
  inativo: {
    id: 'inativo-test-id',
    nome: 'Usuario Inativo',
    login: 'inativo',
    senhaHash: '$2b$12$hashedPassword',
    tipo: TipoUsuario.VENDEDOR,
    ativo: false,
    ultimoLogin: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  },
};

export const testClientes = {
  pessoaFisica: {
    id: 'cliente-pf-test-id',
    nome: 'João Silva',
    documento: '12345678901',
    tipoDocumento: 'CPF',
    email: 'joao@test.com',
    telefone: '11999999999',
    endereco: 'Rua Teste, 123',
    limiteCredito: 1000.00,
    creditoDisponivel: 500.00,
    creditoHabilitado: true,
    ativo: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  },
  pessoaJuridica: {
    id: 'cliente-pj-test-id',
    nome: 'Empresa Teste Ltda',
    documento: '12345678000199',
    tipoDocumento: 'CNPJ',
    email: 'contato@empresateste.com',
    telefone: '1133334444',
    endereco: 'Av. Teste, 456',
    limiteCredito: 5000.00,
    creditoDisponivel: 2500.00,
    creditoHabilitado: true,
    ativo: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  },
};

export const testRefreshTokens = {
  valid: {
    id: 'refresh-token-test-id',
    token: 'valid-refresh-token-123',
    usuarioId: testUsers.admin.id,
    expiresEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
    criadoEm: new Date(),
  },
  expired: {
    id: 'expired-refresh-token-test-id',
    token: 'expired-refresh-token-123',
    usuarioId: testUsers.admin.id,
    expiresEm: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expirado há 1 dia
    criadoEm: new Date(),
  },
};

// Helpers para geração de tokens
export const generateTestToken = (payload: Partial<JwtPayload>): string => {
  const fullPayload: JwtPayload = {
    usuarioId: testUsers.admin.id,
    login: testUsers.admin.login,
    tipo: testUsers.admin.tipo,
    ...payload,
  };

  return jwt.sign(fullPayload, process.env.JWT_SECRET!, {
    expiresIn: '15m',
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
};

export const generateExpiredTestToken = (payload: Partial<JwtPayload>): string => {
  const fullPayload: JwtPayload = {
    usuarioId: testUsers.admin.id,
    login: testUsers.admin.login,
    tipo: testUsers.admin.tipo,
    ...payload,
  };

  return jwt.sign(fullPayload, process.env.JWT_SECRET!, {
    expiresIn: '-1h', // Token já expirado
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  });
};

// Helpers para mocks do Prisma
export const mockPrismaUser = {
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

export const mockPrismaRefreshToken = {
  findUnique: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
};

export const mockPrismaClient = {
  usuario: mockPrismaUser,
  refreshToken: mockPrismaRefreshToken,
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
};

// Helper para reset de mocks
export const resetAllMocks = (): void => {
  Object.values(mockPrismaUser).forEach(mock => mock.mockReset());
  Object.values(mockPrismaRefreshToken).forEach(mock => mock.mockReset());
  mockPrismaClient.$connect.mockReset();
  mockPrismaClient.$disconnect.mockReset();
  mockPrismaClient.$queryRaw.mockReset();
};

// Helper para configurar mocks de sucesso
export const setupSuccessMocks = (): void => {
  mockPrismaUser.findUnique.mockResolvedValue(testUsers.admin);
  mockPrismaUser.create.mockResolvedValue(testUsers.admin);
  mockPrismaUser.update.mockResolvedValue(testUsers.admin);
  mockPrismaRefreshToken.create.mockResolvedValue(testRefreshTokens.valid);
  mockPrismaClient.$connect.mockResolvedValue(undefined);
};

// Helper para configurar mocks de erro
export const setupErrorMocks = (): void => {
  const error = new Error('Database connection error');
  mockPrismaUser.findUnique.mockRejectedValue(error);
  mockPrismaUser.create.mockRejectedValue(error);
  mockPrismaUser.update.mockRejectedValue(error);
  mockPrismaRefreshToken.create.mockRejectedValue(error);
  mockPrismaClient.$connect.mockRejectedValue(error);
};

// Validadores para respostas de API
export const expectSuccessResponse = (response: any, statusCode: number = 200): void => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toBeDefined();
};

export const expectErrorResponse = (response: any, statusCode: number, message?: string): void => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (message) {
    expect(response.body.error).toContain(message);
  }
};

export const expectAuthHeaders = (response: any): void => {
  expect(response.body).toHaveProperty('token');
  expect(response.body).toHaveProperty('refreshToken');
  expect(response.body).toHaveProperty('expiresAt');
  expect(response.body).toHaveProperty('usuario');
};

// Helper para criar request headers com autenticação
export const createAuthHeaders = (token?: string): Record<string, string> => {
  const authToken = token || generateTestToken({});
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
};

// Helper para aguardar promises
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper para verificar estrutura de usuário
export const expectUserStructure = (user: any): void => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('nome');
  expect(user).toHaveProperty('login');
  expect(user).toHaveProperty('tipo');
  expect(user).toHaveProperty('tipoDescricao');
  expect(user).toHaveProperty('ativo');
  expect(user).toHaveProperty('criadoEm');
  expect(user).toHaveProperty('modulosPermitidos');
  expect(user).not.toHaveProperty('senhaHash'); // Não deve expor senha
};
