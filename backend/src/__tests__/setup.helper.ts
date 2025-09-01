import 'dotenv/config';

// Mock do bcrypt para testes
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

// Mock do Winston logger para testes
jest.mock('../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock do Prisma Client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    usuario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    produto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
  TipoUsuario: {
    ADMINISTRADOR: 'ADMINISTRADOR',
    GERENTE: 'GERENTE',
    FARMACEUTICO: 'FARMACEUTICO',
    VENDEDOR: 'VENDEDOR',
    PDV: 'PDV',
  },
}));

// Mock do DatabaseConnection
jest.mock('../infrastructure/database/connection', () => ({
  DatabaseConnection: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    getClient: jest.fn(() => ({
      usuario: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    })),
    healthCheck: jest.fn().mockResolvedValue(true),
  },
}));

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-purposes-only';
process.env.JWT_ISSUER = 'FarmaciaTestAPI';
process.env.JWT_AUDIENCE = 'FarmaciaTestApp';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '1d';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/farmacia_test';
process.env.LOG_LEVEL = 'silent';

// Aumentar timeout para testes de integração
jest.setTimeout(30000);

// Limpar todos os mocks antes de cada teste
beforeEach(() => {
  jest.clearAllMocks();
});

// Limpar todos os mocks e timers após cada teste
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
});

// Limpar todos os timers após todos os testes
afterAll(() => {
  jest.clearAllTimers();
  
  // Limpar intervalos do DuplaLeituraService
  try {
    const { DuplaLeituraService } = require('../application/services/DuplaLeituraService');
    const instances = Object.values(global).filter(val => val instanceof DuplaLeituraService);
    instances.forEach(instance => {
      if (typeof instance.limparIntervalo === 'function') {
        instance.limparIntervalo();
      }
    });
  } catch (error) {
    console.warn('Erro ao limpar intervalos do DuplaLeituraService:', error);
  }
  
  // Usar jest.clearAllTimers() para limpar todos os timers
  jest.clearAllTimers();
});
