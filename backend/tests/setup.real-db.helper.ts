import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Setup para testes com banco REAL conforme CLAUDE.md
// REGRA ABSOLUTA: SEMPRE USE DADOS REAIS DO SEED - NUNCA MOCKS

let prismaTestClient: PrismaClient;

const setupTestDatabase = async (): Promise<PrismaClient> => {
  // Usar banco de teste separado
  const testDatabaseUrl = process.env.TEST_DATABASE_URL || 
    'postgresql://admin:dev123456@localhost:5433/farmacia_test';
    
  prismaTestClient = new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });

  return prismaTestClient;
};

const seedTestData = async (): Promise<void> => {
  console.log('🌱 Executando seed para testes...');
  
  try {
    // Reset completo + seed com dados farmacêuticos reais
    execSync('npx prisma migrate reset --force', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL || 
          'postgresql://admin:dev123456@localhost:5433/farmacia_test',
      },
      stdio: 'pipe',
    });
    
    console.log('✅ Seed de teste concluído com dados reais');
  } catch (error) {
    console.error('❌ Erro no seed de teste:', error);
    throw error;
  }
};

// Setup global para todos os testes
beforeAll(async () => {
  prismaTestClient = await setupTestDatabase();
  await seedTestData();
});

// Cleanup após todos os testes
afterAll(async () => {
  if (prismaTestClient) {
    await prismaTestClient.$disconnect();
  }
});

// Mock mínimo apenas para logger (mantém dados reais)
jest.mock('@/shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing-purposes-only-with-32-chars';
process.env.JWT_ISSUER = 'FarmaciaTestAPI';
process.env.JWT_AUDIENCE = 'FarmaciaTestApp';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '1d';
process.env.LOG_LEVEL = 'silent';

// Timeout para operações de banco real
jest.setTimeout(60000);

// Limpar apenas cache entre testes (mantém dados do seed)
beforeEach(() => {
  // Não limpar dados reais, apenas cache de jest
  jest.clearAllMocks();
});

export { prismaTestClient, setupTestDatabase, seedTestData };