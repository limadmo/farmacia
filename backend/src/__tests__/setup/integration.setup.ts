import 'dotenv/config';
import { setupTestDatabase, seedTestData, cleanupTestDatabase } from './testDatabase';

// Configuração específica para testes de integração (sem mocks)
// Esta configuração será usada apenas pelos testes que precisam de dados reais

// Mock apenas do logger para evitar logs nos testes
jest.mock('../../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Configurar variáveis de ambiente para testes de integração
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-purposes-only';
process.env.JWT_ISSUER = 'FarmaciaTestAPI';
process.env.JWT_AUDIENCE = 'FarmaciaTestApp';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '1d';
process.env.TEST_DATABASE_URL = 'postgresql://admin:dev123456@localhost:5433/farmacia_test';
process.env.LOG_LEVEL = 'silent';

// Setup global para testes de integração
let isSetup = false;

beforeAll(async () => {
  if (!isSetup) {
    await setupTestDatabase();
    await seedTestData();
    isSetup = true;
  }
}, 30000);

afterAll(async () => {
  if (isSetup) {
    await cleanupTestDatabase();
    isSetup = false;
  }
}, 10000);

// Aumentar timeout para testes de integração
jest.setTimeout(30000);