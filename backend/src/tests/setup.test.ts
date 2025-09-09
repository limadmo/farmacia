/**
 * Setup de Testes - Sistema de Farmácia
 * 
 * Configuração para usar banco de dados real com seed
 * conforme política definida no CLAUDE.md
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Usar banco de teste real
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://admin:dev123456@localhost:5432/farmacia_dev?schema=public';

// Cliente Prisma global para testes
export const prisma = new PrismaClient({
  log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
});

// Setup global antes de todos os testes
beforeAll(async () => {
  console.log('🔧 Configurando ambiente de testes...');
  
  try {
    // Conectar ao banco
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados de teste');
    
    // Verificar se há dados no banco (do seed)
    const userCount = await prisma.usuario.count();
    const productCount = await prisma.produto.count();
    
    if (userCount === 0 || productCount === 0) {
      console.log('⚠️ Banco vazio detectado. Executando seed...');
      execSync('npm run db:seed', { stdio: 'inherit' });
      console.log('✅ Seed executado com sucesso');
    } else {
      console.log(`📊 Banco já populado: ${userCount} usuários, ${productCount} produtos`);
    }
  } catch (error) {
    console.error('❌ Erro na configuração de testes:', error);
    throw error;
  }
});

// Cleanup após todos os testes
afterAll(async () => {
  await prisma.$disconnect();
  console.log('🔌 Desconectado do banco de dados');
});

// Helper para limpar dados de teste específicos (não limpa seed base)
export async function limparDadosTeste(prefixo: string = 'TEST') {
  // Limpar apenas dados criados durante testes (com prefixo específico)
  await prisma.$executeRawUnsafe(`
    DELETE FROM "Produto" WHERE nome LIKE '${prefixo}%' OR "codigoBarras" LIKE '${prefixo}%'
  `);
  
  console.log(`🧹 Dados de teste com prefixo '${prefixo}' limpos`);
}

// Helper para criar produto de teste
export async function criarProdutoTeste(opcoes: {
  nome?: string;
  estoque?: number;
  estoqueMinimo?: number;
  preco?: number;
} = {}) {
  const categoria = await prisma.categoria.findFirst();
  if (!categoria) throw new Error('Nenhuma categoria encontrada no seed');
  
  return prisma.produto.create({
    data: {
      nome: opcoes.nome || `TEST_Produto_${Date.now()}`,
      descricao: 'Produto criado para teste',
      codigoBarras: `TEST${Date.now()}`,
      categoriaId: categoria.id,
      classificacaoAnvisa: 'MEDICAMENTO',
      estoque: opcoes.estoque ?? 10,
      estoqueMinimo: opcoes.estoqueMinimo ?? 5,
      precoVenda: opcoes.preco ?? 10.00,
      precoCusto: (opcoes.preco ?? 10.00) * 0.6,
      ativo: true
    }
  });
}

// Helper para buscar usuário de teste
export async function obterUsuarioTeste() {
  const usuario = await prisma.usuario.findFirst({
    where: { ativo: true }
  });
  
  if (!usuario) throw new Error('Nenhum usuário encontrado no seed');
  return usuario;
}

// Helper para verificar estoque
export async function verificarEstoque(produtoId: string): Promise<number> {
  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
    select: { estoque: true }
  });
  
  if (!produto) throw new Error(`Produto ${produtoId} não encontrado`);
  return produto.estoque;
}

// Exportar cliente Prisma para uso nos testes
export default prisma;