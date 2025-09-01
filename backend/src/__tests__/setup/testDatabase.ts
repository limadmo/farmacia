/**
 * Configuração de banco de dados para testes de integração
 * Usa dados reais do seed para testes mais confiáveis
 */

import { PrismaClient, TipoUsuario } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Cliente Prisma para testes
let testPrisma: PrismaClient | null = null;

export interface TestUser {
  id: string;
  login: string;
  senha: string;
  tipo: TipoUsuario;
  nome: string;
}

export interface TestProduct {
  id: string;
  nome: string;
  codigoBarras: string;
  estoque: number;
  precoVenda: number;
  precoCusto: number;
  categoriaId: string;
  estoqueMinimo?: number;
}

export interface TestClient {
  id: string;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
}

// Cache de dados de teste
let testData: {
  users: TestUser[];
  products: TestProduct[];
  categories: any[];
  clients: TestClient[];
} | null = null;

export async function setupTestDatabase(): Promise<PrismaClient> {
  // Se já existe uma instância, reutiliza
  if (testPrisma) {
    return testPrisma;
  }

  // Usar banco de teste em memória ou separado
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  await testPrisma.$connect();
  return testPrisma;
}

export async function seedTestData(prismaInstance?: PrismaClient): Promise<typeof testData> {
  if (testData) return testData;

  // Usar a instância fornecida ou a global
  const prisma = prismaInstance || testPrisma;
  if (!prisma) {
    throw new Error('Nenhuma instância do Prisma disponível para seeding.');
  }

  // Limpar dados existentes nos testes
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.categoria.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.fornecedor.deleteMany();

  // Criar categorias base
  const categories = await prisma.categoria.createMany({
    data: [
      { id: 'cat-medicamentos', nome: 'Medicamentos', descricao: 'Produtos farmacêuticos' },
      { id: 'cat-controlados', nome: 'Controlados', descricao: 'Medicamentos controlados' },
      { id: 'cat-cosmeticos', nome: 'Cosméticos', descricao: 'Produtos de beleza' },
      { id: 'cat-suplementos', nome: 'Suplementos', descricao: 'Suplementos alimentares' }
    ]
  });

  const createdCategories = await prisma.categoria.findMany();

  // Criar usuários de teste com diferentes perfis
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  const users: TestUser[] = [
    {
      id: 'user-admin',
      login: 'admin.farmacia',
      senha: '123456',
      tipo: TipoUsuario.ADMINISTRADOR,
      nome: 'Administrator Farmácia'
    },
    {
      id: 'user-farmaceutico',
      login: 'dr.silva',
      senha: '123456',
      tipo: TipoUsuario.FARMACEUTICO,
      nome: 'Dr. Silva Santos - CRF 12345'
    },
    {
      id: 'user-gerente',
      login: 'gerente.maria',
      senha: '123456',
      tipo: TipoUsuario.GERENTE,
      nome: 'Maria Gerente'
    },
    {
      id: 'user-vendedor',
      login: 'vendedor.jose',
      senha: '123456',
      tipo: TipoUsuario.VENDEDOR,
      nome: 'José Vendedor'
    },
    {
      id: 'user-pdv',
      login: 'caixa.ana',
      senha: '123456',
      tipo: TipoUsuario.PDV,
      nome: 'Ana Caixa'
    }
  ];

  await prisma.usuario.createMany({
    data: users.map(user => ({
      id: user.id,
      login: user.login,
      senhaHash: hashedPassword,
      tipo: user.tipo,
      nome: user.nome,
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date()
    }))
  });

  // Criar produtos de teste com diferentes características
  const products: TestProduct[] = [
    {
      id: 'prod-dipirona',
      nome: 'Dipirona 500mg - Genérico',
      codigoBarras: '7891234567890',
      estoque: 100,
      precoVenda: 15.50,
      precoCusto: 8.25,
      categoriaId: 'cat-medicamentos'
    },
    {
      id: 'prod-rivotril',
      nome: 'Rivotril 2mg - Controlado',
      codigoBarras: '7891234567891',
      estoque: 50,
      precoVenda: 85.90,
      precoCusto: 62.50,
      categoriaId: 'cat-controlados'
    },
    {
      id: 'prod-protetor',
      nome: 'Protetor Solar FPS 60',
      codigoBarras: '7891234567892',
      estoque: 75,
      precoVenda: 45.99,
      precoCusto: 28.50,
      categoriaId: 'cat-cosmeticos'
    },
    {
      id: 'prod-vitamina',
      nome: 'Vitamina D3 2000UI',
      codigoBarras: '7891234567893',
      estoque: 200,
      precoVenda: 32.90,
      precoCusto: 18.75,
      categoriaId: 'cat-suplementos'
    },
    {
      id: 'prod-antibiotico',
      nome: 'Amoxicilina 875mg - Com Receita',
      codigoBarras: '7891234567894',
      estoque: 30,
      precoVenda: 28.90,
      precoCusto: 16.45,
      categoriaId: 'cat-medicamentos'
    },
    {
      id: 'prod-insulina',
      nome: 'Insulina NPH 100UI/ml',
      codigoBarras: '7891234567895',
      estoque: 25,
      precoVenda: 89.90,
      precoCusto: 55.50,
      categoriaId: 'cat-medicamentos'
    }
  ];

  // Adicionar a insulina ao array products também
  products.push({
    id: 'prod-insulina',
    nome: 'Insulina NPH 100UI/ml',
    codigoBarras: '7891234567895',
    estoque: 25,
    precoVenda: 89.90,
    precoCusto: 55.50,
    categoriaId: 'cat-medicamentos'
  });

  await prisma.produto.createMany({
    data: products.map(product => ({
      id: product.id,
      nome: product.nome,
      codigoBarras: product.codigoBarras,
      classificacaoAnvisa: product.nome.includes('Controlado') ? 'MEDICAMENTO_CONTROLADO' : 
                          product.nome.includes('Protetor') ? 'COSMÉTICO' :
                          product.nome.includes('Vitamina') ? 'SUPLEMENTO' : 'MEDICAMENTO',
      exigeReceita: product.nome.includes('Controlado') || product.nome.includes('Amoxicilina'),
      tipoReceita: product.nome.includes('Rivotril') ? 'B1' : 
                   product.nome.includes('Amoxicilina') ? 'BRANCA' : null,
      retencaoReceita: product.nome.includes('Rivotril'),
      estoque: product.estoque,
      precoVenda: product.precoVenda,
      precoCusto: product.precoCusto,
      categoriaId: product.categoriaId,
      ativo: true,
      dataVencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano no futuro
      criadoEm: new Date(),
      atualizadoEm: new Date()
    }))
  });

  // Criar clientes de teste
  const clients: TestClient[] = [
    {
      id: 'client-joao',
      nome: 'João Silva',
      cpf: '123.456.789-00',
      email: 'joao.silva@email.com',
      telefone: '(11) 99999-1234'
    },
    {
      id: 'client-maria',
      nome: 'Maria Santos',
      cpf: '987.654.321-00',
      email: 'maria.santos@email.com',
      telefone: '(11) 88888-5678'
    }
  ];

  await prisma.cliente.createMany({
    data: clients.map(client => ({
      id: client.id,
      nome: client.nome,
      cpf: client.cpf,
      email: client.email,
      telefone: client.telefone,
      dataNascimento: new Date('1980-01-01'),
      ativo: true,
      limiteCredito: 1000.00,
      saldoAtual: 0.00,
      criadoEm: new Date(),
      atualizadoEm: new Date()
    }))
  });

  // Criar fornecedores de teste
  await prisma.fornecedor.createMany({
    data: [
      {
        id: 'forn-distribuidora-1',
        nome: 'Distribuidora Farmacêutica ABC Ltda',
        cnpj: '12345678000195',
        telefone: '(11) 9876-5432',
        email: 'contato@farmaabc.com.br',
        endereco: 'Rua dos Farmacêuticos, 100',
        ativo: true
      },
      {
        id: 'forn-distribuidora-2', 
        nome: 'Medicamentos XYZ S/A',
        cnpj: '98765432000195',
        telefone: '(11) 1234-5678',
        email: 'vendas@medxyz.com.br',
        endereco: 'Av. das Medicinas, 200',
        ativo: true
      }
    ]
  });

  testData = {
    users,
    products,
    categories: createdCategories,
    clients
  };

  return testData;
}

export async function cleanupTestDatabase(): Promise<void> {
  try {
    if (testPrisma) {
      // Limpar todas as tabelas em ordem correta
      await testPrisma.movimentacaoEstoque.deleteMany();
      await testPrisma.produto.deleteMany();
      await testPrisma.categoria.deleteMany();
      await testPrisma.refreshToken.deleteMany();
      await testPrisma.usuario.deleteMany();
      await testPrisma.cliente.deleteMany();
      await testPrisma.fornecedor.deleteMany();
      
      await testPrisma.$disconnect();
      testPrisma = null;
    }
  } catch (error) {
    console.warn('Erro durante cleanup:', error);
  }
  testData = null;
}

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    throw new Error('testPrisma não inicializado. Chame setupTestDatabase() primeiro.');
  }
  return testPrisma;
}

export function getTestData() {
  return testData;
}

// Utilitários para testes
export const TestHelpers = {
  // Encontrar usuário por tipo
  findUserByType: (tipo: TipoUsuario) => {
    return testData?.users.find(user => user.tipo === tipo);
  },

  // Encontrar produto por categoria
  findProductByCategory: (categoryName: string) => {
    const category = testData?.categories.find(cat => cat.nome === categoryName);
    return testData?.products.find(prod => prod.categoriaId === category?.id);
  },

  // Obter produto controlado
  getControlledProduct: () => {
    return testData?.products.find(prod => prod.nome.includes('Controlado'));
  },

  // Obter produto comum
  getCommonProduct: () => {
    return testData?.products.find(prod => prod.nome.includes('Dipirona'));
  },

  // Obter farmacêutico
  getPharmacist: () => {
    return testData?.users.find(user => user.tipo === TipoUsuario.FARMACEUTICO);
  },

  // Obter vendedor
  getSeller: () => {
    return testData?.users.find(user => user.tipo === TipoUsuario.VENDEDOR);
  },

  // Obter cliente de teste
  getTestClient: () => {
    return testData?.clients[0]; // Retorna o primeiro cliente (João Silva)
  },

  // Encontrar produto por nome
  findProductByName: (name: string) => {
    return testData?.products.find(prod => prod.nome.toLowerCase().includes(name.toLowerCase()));
  }
};