/**
 * Testes de Validação de Estoque - Sistema de Farmácia
 * 
 * Garante que o estoque nunca fique negativo em vendas e movimentações.
 * Usa dados reais do seed conforme política do CLAUDE.md
 */

import { PrismaClient } from '@prisma/client';
import { VendaService } from '../../application/services/VendaService';
import { EstoqueService } from '../../application/services/EstoqueService';
import { TipoMovimentacao } from '../../domain/entities/Estoque';
import { FormaPagamento } from '../../domain/enums/FormaPagamento';
import { v4 as uuidv4 } from 'uuid';

describe('Validação de Estoque Negativo', () => {
  let prisma: PrismaClient;
  let vendaService: VendaService;
  let estoqueService: EstoqueService;
  let produtoTeste: any;
  let usuarioTeste: any;
  
  beforeAll(async () => {
    // Usar banco de dados real com dados do seed
    prisma = new PrismaClient();
    vendaService = new VendaService();
    estoqueService = new EstoqueService();
    
    // Buscar um produto existente do seed para testes
    produtoTeste = await prisma.produto.findFirst({
      where: {
        ativo: true,
        estoque: { gt: 0 } // Produto com estoque disponível
      }
    });
    
    // Buscar um usuário existente do seed
    usuarioTeste = await prisma.usuario.findFirst({
      where: { ativo: true }
    });
    
    // Garantir que temos dados para teste
    expect(produtoTeste).toBeTruthy();
    expect(usuarioTeste).toBeTruthy();
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  describe('Validação em Vendas', () => {
    it('deve impedir venda quando quantidade solicitada é maior que o estoque', async () => {
      // Arrange
      const estoqueAtual = produtoTeste.estoque;
      const quantidadeInvalida = estoqueAtual + 1;
      
      const vendaData = {
        itens: [{
          produtoId: produtoTeste.id,
          quantidade: quantidadeInvalida,
          precoUnitario: Number(produtoTeste.precoVenda),
          desconto: 0
        }],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Teste de validação de estoque'
      };
      
      // Act & Assert
      await expect(
        vendaService.criarVenda(vendaData, usuarioTeste.id)
      ).rejects.toThrow(/estoque insuficiente/i);
      
      // Verificar que o estoque não foi alterado
      const produtoAposErro = await prisma.produto.findUnique({
        where: { id: produtoTeste.id }
      });
      expect(produtoAposErro?.estoque).toBe(estoqueAtual);
    });
    
    it('deve permitir venda quando quantidade é igual ao estoque disponível', async () => {
      // Arrange - buscar produto com estoque suficiente
      const produtoComEstoque = await prisma.produto.findFirst({
        where: {
          ativo: true,
          estoque: { gte: 5 } // Pelo menos 5 unidades
        }
      });
      
      if (!produtoComEstoque) {
        throw new Error('Nenhum produto com estoque suficiente para teste');
      }
      
      const estoqueInicial = produtoComEstoque.estoque;
      const quantidadeVenda = 2;
      
      const vendaData = {
        itens: [{
          produtoId: produtoComEstoque.id,
          quantidade: quantidadeVenda,
          precoUnitario: Number(produtoComEstoque.precoVenda),
          desconto: 0
        }],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Teste de venda válida'
      };
      
      // Act
      const venda = await vendaService.criarVenda(vendaData, usuarioTeste.id);
      
      // Assert
      expect(venda).toBeTruthy();
      expect(venda.itens).toHaveLength(1);
      expect(venda.itens[0].quantidade).toBe(quantidadeVenda);
      
      // Verificar que o estoque foi reduzido corretamente
      const produtoAposVenda = await prisma.produto.findUnique({
        where: { id: produtoComEstoque.id }
      });
      expect(produtoAposVenda?.estoque).toBe(estoqueInicial - quantidadeVenda);
    });
    
    it('deve impedir venda múltipla que resultaria em estoque negativo', async () => {
      // Arrange - produto com estoque limitado
      const produtoLimitado = await prisma.produto.findFirst({
        where: {
          ativo: true,
          estoque: { gte: 3, lte: 10 } // Entre 3 e 10 unidades
        }
      });
      
      if (!produtoLimitado) {
        throw new Error('Nenhum produto com estoque limitado para teste');
      }
      
      const estoqueInicial = produtoLimitado.estoque;
      
      // Primeira venda válida (metade do estoque)
      const primeiraQuantidade = Math.floor(estoqueInicial / 2);
      const primeiraVendaData = {
        itens: [{
          produtoId: produtoLimitado.id,
          quantidade: primeiraQuantidade,
          precoUnitario: Number(produtoLimitado.precoVenda),
          desconto: 0
        }],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Primeira venda do teste'
      };
      
      // Act - primeira venda deve funcionar
      const primeiraVenda = await vendaService.criarVenda(primeiraVendaData, usuarioTeste.id);
      expect(primeiraVenda).toBeTruthy();
      
      // Segunda venda que tentaria usar mais que o restante
      const estoqueRestante = estoqueInicial - primeiraQuantidade;
      const segundaQuantidade = estoqueRestante + 1; // 1 a mais que o disponível
      
      const segundaVendaData = {
        itens: [{
          produtoId: produtoLimitado.id,
          quantidade: segundaQuantidade,
          precoUnitario: Number(produtoLimitado.precoVenda),
          desconto: 0
        }],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Segunda venda que deve falhar'
      };
      
      // Assert - segunda venda deve falhar
      await expect(
        vendaService.criarVenda(segundaVendaData, usuarioTeste.id)
      ).rejects.toThrow(/estoque insuficiente/i);
      
      // Verificar que o estoque está correto (apenas primeira venda processada)
      const produtoFinal = await prisma.produto.findUnique({
        where: { id: produtoLimitado.id }
      });
      expect(produtoFinal?.estoque).toBe(estoqueRestante);
    });
    
    it('deve validar estoque atomicamente em venda com múltiplos itens', async () => {
      // Arrange - buscar 2 produtos diferentes
      const produtos = await prisma.produto.findMany({
        where: {
          ativo: true,
          estoque: { gt: 0 }
        },
        take: 2
      });
      
      if (produtos.length < 2) {
        throw new Error('Precisa de pelo menos 2 produtos para teste');
      }
      
      const [produto1, produto2] = produtos;
      const estoque1Inicial = produto1.estoque;
      const estoque2Inicial = produto2.estoque;
      
      // Criar venda onde o segundo item excede o estoque
      const vendaData = {
        itens: [
          {
            produtoId: produto1.id,
            quantidade: 1, // OK
            precoUnitario: Number(produto1.precoVenda),
            desconto: 0
          },
          {
            produtoId: produto2.id,
            quantidade: produto2.estoque + 1, // Excede estoque
            precoUnitario: Number(produto2.precoVenda),
            desconto: 0
          }
        ],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Teste de transação atômica'
      };
      
      // Act & Assert
      await expect(
        vendaService.criarVenda(vendaData, usuarioTeste.id)
      ).rejects.toThrow(/estoque insuficiente/i);
      
      // Verificar que NENHUM estoque foi alterado (transação revertida)
      const produto1Depois = await prisma.produto.findUnique({
        where: { id: produto1.id }
      });
      const produto2Depois = await prisma.produto.findUnique({
        where: { id: produto2.id }
      });
      
      expect(produto1Depois?.estoque).toBe(estoque1Inicial);
      expect(produto2Depois?.estoque).toBe(estoque2Inicial);
    });
  });
  
  describe('Validação em Movimentações de Estoque', () => {
    it('deve impedir movimentação de SAIDA que excede o estoque', async () => {
      // Arrange
      const produto = await prisma.produto.findFirst({
        where: {
          ativo: true,
          estoque: { gt: 0, lte: 50 } // Produto com estoque moderado
        }
      });
      
      if (!produto) {
        throw new Error('Nenhum produto adequado para teste');
      }
      
      const estoqueInicial = produto.estoque;
      const quantidadeInvalida = estoqueInicial + 1;
      
      const movimentacaoData = {
        produtoId: produto.id,
        tipo: TipoMovimentacao.SAIDA,
        quantidade: quantidadeInvalida,
        motivo: 'Teste de saída inválida',
        usuarioId: usuarioTeste.id
      };
      
      // Act & Assert
      await expect(
        estoqueService.registrarMovimentacao(movimentacaoData)
      ).rejects.toThrow(/estoque insuficiente/i);
      
      // Verificar que o estoque não foi alterado
      const produtoApos = await prisma.produto.findUnique({
        where: { id: produto.id }
      });
      expect(produtoApos?.estoque).toBe(estoqueInicial);
    });
    
    it('deve permitir movimentação de SAIDA válida', async () => {
      // Arrange
      const produto = await prisma.produto.findFirst({
        where: {
          ativo: true,
          estoque: { gte: 10 } // Pelo menos 10 unidades
        }
      });
      
      if (!produto) {
        throw new Error('Nenhum produto com estoque suficiente');
      }
      
      const estoqueInicial = produto.estoque;
      const quantidadeSaida = 3;
      
      const movimentacaoData = {
        produtoId: produto.id,
        tipo: TipoMovimentacao.SAIDA,
        quantidade: quantidadeSaida,
        motivo: 'Teste de saída válida',
        observacoes: 'Movimentação autorizada',
        usuarioId: usuarioTeste.id
      };
      
      // Act
      const movimentacao = await estoqueService.registrarMovimentacao(movimentacaoData);
      
      // Assert
      expect(movimentacao).toBeTruthy();
      expect(movimentacao.tipo).toBe(TipoMovimentacao.SAIDA);
      expect(movimentacao.quantidade).toBe(quantidadeSaida);
      
      // Verificar que o estoque foi reduzido
      const produtoApos = await prisma.produto.findUnique({
        where: { id: produto.id }
      });
      expect(produtoApos?.estoque).toBe(estoqueInicial - quantidadeSaida);
    });
    
    it('deve permitir zerar o estoque mas não deixar negativo', async () => {
      // Arrange - criar produto específico para este teste
      const produtoTeste = await prisma.produto.create({
        data: {
          id: uuidv4(),
          nome: 'Produto Teste Zerar Estoque',
          descricao: 'Teste de estoque zero',
          codigoBarras: `TEST${Date.now()}`,
          categoriaId: (await prisma.categoria.findFirst())!.id,
          classificacaoAnvisa: 'MEDICAMENTO',
          precoVenda: 10,
          precoCusto: 5,
          estoque: 5, // Exatamente 5 unidades
          estoqueMinimo: 0,
          ativo: true
        }
      });
      
      // Movimentação que zera o estoque (OK)
      const movimentacaoZerar = {
        produtoId: produtoTeste.id,
        tipo: TipoMovimentacao.SAIDA,
        quantidade: 5,
        motivo: 'Zerar estoque',
        usuarioId: usuarioTeste.id
      };
      
      // Act
      const movimentacao = await estoqueService.registrarMovimentacao(movimentacaoZerar);
      
      // Assert
      expect(movimentacao).toBeTruthy();
      
      const produtoZerado = await prisma.produto.findUnique({
        where: { id: produtoTeste.id }
      });
      expect(produtoZerado?.estoque).toBe(0);
      
      // Tentar nova saída com estoque zero (deve falhar)
      const movimentacaoInvalida = {
        produtoId: produtoTeste.id,
        tipo: TipoMovimentacao.SAIDA,
        quantidade: 1,
        motivo: 'Tentar saída com estoque zero',
        usuarioId: usuarioTeste.id
      };
      
      await expect(
        estoqueService.registrarMovimentacao(movimentacaoInvalida)
      ).rejects.toThrow(/estoque insuficiente/i);
      
      // Cleanup
      await prisma.produto.delete({ where: { id: produtoTeste.id } });
    });
    
    it('deve permitir ENTRADA mesmo com estoque zero', async () => {
      // Arrange - buscar produto com estoque zero ou criar um
      let produtoZero = await prisma.produto.findFirst({
        where: {
          ativo: true,
          estoque: 0
        }
      });
      
      if (!produtoZero) {
        // Criar produto com estoque zero
        produtoZero = await prisma.produto.create({
          data: {
            id: uuidv4(),
            nome: 'Produto Sem Estoque Teste',
            descricao: 'Teste de entrada com estoque zero',
            codigoBarras: `ZERO${Date.now()}`,
            categoriaId: (await prisma.categoria.findFirst())!.id,
            classificacaoAnvisa: 'MEDICAMENTO',
            precoVenda: 20,
            precoCusto: 10,
            estoque: 0,
            estoqueMinimo: 5,
            ativo: true
          }
        });
      }
      
      const quantidadeEntrada = 10;
      
      const movimentacaoData = {
        produtoId: produtoZero.id,
        tipo: TipoMovimentacao.ENTRADA,
        quantidade: quantidadeEntrada,
        motivo: 'Reposição de estoque',
        observacoes: 'Compra de fornecedor',
        usuarioId: usuarioTeste.id
      };
      
      // Act
      const movimentacao = await estoqueService.registrarMovimentacao(movimentacaoData);
      
      // Assert
      expect(movimentacao).toBeTruthy();
      expect(movimentacao.tipo).toBe(TipoMovimentacao.ENTRADA);
      
      const produtoApos = await prisma.produto.findUnique({
        where: { id: produtoZero.id }
      });
      expect(produtoApos?.estoque).toBe(quantidadeEntrada);
    });
    
    it('deve validar PERDA não pode exceder estoque disponível', async () => {
      // Arrange
      const produto = await prisma.produto.findFirst({
        where: {
          ativo: true,
          estoque: { gt: 0, lte: 20 }
        }
      });
      
      if (!produto) {
        throw new Error('Nenhum produto adequado para teste de perda');
      }
      
      const estoqueInicial = produto.estoque;
      
      const movimentacaoPerda = {
        produtoId: produto.id,
        tipo: TipoMovimentacao.PERDA,
        quantidade: estoqueInicial + 1,
        motivo: 'Produto vencido',
        usuarioId: usuarioTeste.id
      };
      
      // Act & Assert
      await expect(
        estoqueService.registrarMovimentacao(movimentacaoPerda)
      ).rejects.toThrow(/estoque insuficiente/i);
      
      // Verificar que o estoque permanece inalterado
      const produtoApos = await prisma.produto.findUnique({
        where: { id: produto.id }
      });
      expect(produtoApos?.estoque).toBe(estoqueInicial);
    });
  });
  
  describe('Validação de Cancelamento de Venda', () => {
    it('deve restaurar estoque corretamente ao cancelar venda', async () => {
      // Arrange - produto com estoque
      const produto = await prisma.produto.findFirst({
        where: {
          ativo: true,
          estoque: { gte: 10 }
        }
      });
      
      if (!produto) {
        throw new Error('Nenhum produto adequado para teste');
      }
      
      const estoqueInicial = produto.estoque;
      const quantidadeVenda = 5;
      
      // Criar venda
      const vendaData = {
        itens: [{
          produtoId: produto.id,
          quantidade: quantidadeVenda,
          precoUnitario: Number(produto.precoVenda),
          desconto: 0
        }],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Venda para teste de cancelamento'
      };
      
      const venda = await vendaService.criarVenda(vendaData, usuarioTeste.id);
      
      // Verificar que estoque foi reduzido
      const produtoAposVenda = await prisma.produto.findUnique({
        where: { id: produto.id }
      });
      expect(produtoAposVenda?.estoque).toBe(estoqueInicial - quantidadeVenda);
      
      // Act - cancelar a venda
      const vendaCancelada = await vendaService.cancelarVenda(venda.id, usuarioTeste.id);
      
      // Assert
      expect(vendaCancelada.statusPagamento).toBe('CANCELADO');
      
      // Verificar que estoque foi restaurado
      const produtoAposCancelamento = await prisma.produto.findUnique({
        where: { id: produto.id }
      });
      expect(produtoAposCancelamento?.estoque).toBe(estoqueInicial);
    });
  });
  
  describe('Cenários Concorrentes', () => {
    it('deve lidar com vendas concorrentes sem permitir estoque negativo', async () => {
      // Arrange - produto com estoque limitado
      const produtoConcorrencia = await prisma.produto.create({
        data: {
          id: uuidv4(),
          nome: 'Produto Teste Concorrência',
          descricao: 'Teste de vendas simultâneas',
          codigoBarras: `CONC${Date.now()}`,
          categoriaId: (await prisma.categoria.findFirst())!.id,
          classificacaoAnvisa: 'MEDICAMENTO',
          precoVenda: 50,
          precoCusto: 25,
          estoque: 10, // Apenas 10 unidades
          estoqueMinimo: 2,
          ativo: true
        }
      });
      
      // Preparar duas vendas que juntas excederiam o estoque
      const venda1Data = {
        itens: [{
          produtoId: produtoConcorrencia.id,
          quantidade: 7,
          precoUnitario: 50,
          desconto: 0
        }],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Venda concorrente 1'
      };
      
      const venda2Data = {
        itens: [{
          produtoId: produtoConcorrencia.id,
          quantidade: 6,
          precoUnitario: 50,
          desconto: 0
        }],
        formaPagamento: FormaPagamento.DINHEIRO,
        observacoes: 'Venda concorrente 2'
      };
      
      // Act - executar vendas em paralelo
      const [resultado1, resultado2] = await Promise.allSettled([
        vendaService.criarVenda(venda1Data, usuarioTeste.id),
        vendaService.criarVenda(venda2Data, usuarioTeste.id)
      ]);
      
      // Assert - uma deve ter sucesso, outra deve falhar
      const sucessos = [resultado1, resultado2].filter(r => r.status === 'fulfilled');
      const falhas = [resultado1, resultado2].filter(r => r.status === 'rejected');
      
      expect(sucessos.length).toBe(1);
      expect(falhas.length).toBe(1);
      
      // Verificar que o estoque nunca ficou negativo
      const produtoFinal = await prisma.produto.findUnique({
        where: { id: produtoConcorrencia.id }
      });
      
      expect(produtoFinal?.estoque).toBeGreaterThanOrEqual(0);
      expect(produtoFinal?.estoque).toBeLessThanOrEqual(10);
      
      // Cleanup
      await prisma.produto.delete({ where: { id: produtoConcorrencia.id } });
    });
  });
});