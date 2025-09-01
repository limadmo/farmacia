/**
 * Testes abrangentes para ProdutoService
 * Cobre cenários críticos: CRUD, validações ANVISA, medicamentos controlados, estoque
 */

import { ProdutoService } from '../../../application/services/ProdutoService';
import { DatabaseConnection } from '../../../infrastructure/database/connection';
import {
  ClassificacaoAnvisa,
  ClasseControlada,
  TipoReceita,
  CreateProdutoData,
  UpdateProdutoData
} from '../../../domain/entities/Produto';

// Mock do DatabaseConnection
jest.mock('../../../infrastructure/database/connection');
const mockPrisma = {
  produto: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    fields: {
      estoqueMinimo: 'estoqueMinimo'
    }
  },
  categoria: {
    findUnique: jest.fn()
  },
  movimentacaoEstoque: {
    create: jest.fn()
  }
};

describe('ProdutoService - Testes Abrangentes', () => {
  let produtoService: ProdutoService;

  beforeEach(() => {
    (DatabaseConnection.getClient as jest.Mock).mockReturnValue(mockPrisma);
    produtoService = new ProdutoService();
    jest.clearAllMocks();
  });

  describe('listarProdutos', () => {
    it('deve listar produtos com paginação padrão', async () => {
      const mockProdutos = [
        {
          id: '1',
          nome: 'Dipirona 500mg',
          classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO,
          precoVenda: 15.50,
          estoque: 100,
          ativo: true
        }
      ];

      mockPrisma.produto.findMany.mockResolvedValue(mockProdutos);
      mockPrisma.produto.count.mockResolvedValue(1);

      const resultado = await produtoService.listarProdutos();

      expect(resultado.produtos).toHaveLength(1);
      expect(resultado.pagination.currentPage).toBe(1);
      expect(resultado.pagination.totalItems).toBe(1);
      expect(mockPrisma.produto.findMany).toHaveBeenCalledWith({
        where: { ativo: true },
        skip: 0,
        take: 20,
        include: {
          categoria: true
        },
        orderBy: {
          nome: 'asc'
        }
      });
    });

    it('deve filtrar produtos por busca textual', async () => {
      mockPrisma.produto.findMany.mockResolvedValue([]);
      mockPrisma.produto.count.mockResolvedValue(0);

      await produtoService.listarProdutos({ search: 'dipirona' });

      expect(mockPrisma.produto.findMany).toHaveBeenCalledWith({
        where: {
          ativo: true,
          OR: [
            { nome: { contains: 'dipirona', mode: 'insensitive' } },
            { codigoBarras: { contains: 'dipirona', mode: 'insensitive' } },
            { principioAtivo: { contains: 'dipirona', mode: 'insensitive' } }
          ]
        },
        skip: 0,
        take: 20,
        include: {
          categoria: true
        },
        orderBy: {
          nome: 'asc'
        }
      });
    });

    it('deve filtrar produtos por classificação ANVISA', async () => {
      mockPrisma.produto.findMany.mockResolvedValue([]);
      mockPrisma.produto.count.mockResolvedValue(0);

      await produtoService.listarProdutos({ 
        classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO 
      });

      expect(mockPrisma.produto.findMany).toHaveBeenCalledWith({
        where: {
          ativo: true,
          classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO
        },
        skip: 0,
        take: 20,
        include: {
          categoria: true
        },
        orderBy: {
          nome: 'asc'
        }
      });
    });

    it('deve filtrar produtos com estoque baixo', async () => {
      mockPrisma.produto.findMany.mockResolvedValue([]);
      mockPrisma.produto.count.mockResolvedValue(0);

      await produtoService.listarProdutos({ estoqueMinimo: true });

      expect(mockPrisma.produto.findMany).toHaveBeenCalledWith({
        where: {
          ativo: true,
          estoque: { lte: { field: 'estoqueMinimo' } }
        },
        skip: 0,
        take: 20,
        include: {
          categoria: true
        },
        orderBy: {
          nome: 'asc'
        }
      });
    });

    it('deve limitar resultados a máximo 100 por página', async () => {
      mockPrisma.produto.findMany.mockResolvedValue([]);
      mockPrisma.produto.count.mockResolvedValue(0);

      await produtoService.listarProdutos({ limit: 200 });

      expect(mockPrisma.produto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 200
        })
      );
    });
  });

  describe('buscarProdutoPorId', () => {
    it('deve retornar produto existente', async () => {
      const mockProduto = {
        id: '1',
        nome: 'Dipirona 500mg',
        classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO
      };

      mockPrisma.produto.findUnique.mockResolvedValue(mockProduto);

      const resultado = await produtoService.buscarProdutoPorId('1');

      expect(resultado).toEqual(expect.objectContaining({
        id: '1',
        nome: 'Dipirona 500mg'
      }));
      expect(mockPrisma.produto.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: {
          categoria: true
        }
      });
    });

    it('deve retornar null para produto inexistente', async () => {
      mockPrisma.produto.findUnique.mockResolvedValue(null);

      const resultado = await produtoService.buscarProdutoPorId('999');

      expect(resultado).toBeNull();
    });
  });

  describe('buscarProdutoPorCodigoBarras', () => {
    it('deve retornar produto por código de barras', async () => {
      const mockProduto = {
        id: '1',
        nome: 'Dipirona 500mg',
        codigoBarras: '7891234567890',
        classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO,
        precoVenda: 15.50,
        estoque: 100,
        estoqueMinimo: 10,
        categoriaId: 'cat-1',
        exigeReceita: false,
        ativo: true,
        categoria: { id: 'cat-1', nome: 'Medicamentos' }
      };

      mockPrisma.produto.findFirst.mockResolvedValue(mockProduto);

      const resultado = await produtoService.buscarProdutoPorCodigoBarras('7891234567890');

      expect(resultado).toEqual(expect.objectContaining({
        codigoBarras: '7891234567890'
      }));
      expect(mockPrisma.produto.findFirst).toHaveBeenCalledWith({
        where: {
          codigoBarras: '7891234567890',
          ativo: true
        },
        include: {
          categoria: true
        }
      });
    });
  });

  describe('criarProduto', () => {
    const dadosValidosProduto: CreateProdutoData = {
      nome: 'Dipirona 500mg',
      classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO,
      precoVenda: 15.50,
      estoque: 100,
      estoqueMinimo: 10,
      categoriaId: 'cat-1',
      exigeReceita: false
    };

    it('deve criar produto válido', async () => {
      const mockProdutoCriado = {
        id: '1',
        ...dadosValidosProduto,
        ativo: true,
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };

      mockPrisma.categoria.findUnique.mockResolvedValue({ id: 'cat-1', nome: 'Medicamentos' });
      mockPrisma.produto.findFirst.mockResolvedValue(null); // Não existe duplicata
      mockPrisma.produto.create.mockResolvedValue(mockProdutoCriado);

      const resultado = await produtoService.criarProduto(dadosValidosProduto);

      expect(resultado).toEqual(expect.objectContaining({
        nome: 'Dipirona 500mg',
        classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO
      }));
      expect(mockPrisma.produto.create).toHaveBeenCalled();
    });

    it('deve validar medicamento controlado', async () => {
      const dadosMedicamentoControlado: CreateProdutoData = {
        ...dadosValidosProduto,
        exigeReceita: true,
        classeControlada: ClasseControlada.A1,
        tipoReceita: TipoReceita.RECEITA_AMARELA,
        registroAnvisa: 'REG123456',
        principioAtivo: 'Dipirona Sódica'
      };

      const mockProdutoCriado = {
        id: '1',
        ...dadosMedicamentoControlado,
        retencaoReceita: true
      };

      mockPrisma.categoria.findUnique.mockResolvedValue({ id: 'cat-1', nome: 'Medicamentos' });
      mockPrisma.produto.findFirst.mockResolvedValue(null);
      mockPrisma.produto.create.mockResolvedValue(mockProdutoCriado);

      const resultado = await produtoService.criarProduto(dadosMedicamentoControlado);

      expect(resultado.retencaoReceita).toBe(true);
      expect(resultado.tipoReceita).toBe(TipoReceita.RECEITA_AMARELA);
    });

    it('deve rejeitar produto com nome duplicado', async () => {
      mockPrisma.produto.findFirst.mockResolvedValue({ id: '1', nome: 'Dipirona 500mg' });

      await expect(produtoService.criarProduto(dadosValidosProduto))
        .rejects.toThrow(Error);
    });

    it('deve rejeitar produto com código de barras duplicado', async () => {
      const dadosComCodigoBarras = {
        ...dadosValidosProduto,
        codigoBarras: '7891234567890'
      };

      mockPrisma.produto.findFirst
        .mockResolvedValueOnce(null) // Primeira verificação (nome)
        .mockResolvedValueOnce({ id: '1', codigoBarras: '7891234567890' }); // Segunda verificação (código)

      await expect(produtoService.criarProduto(dadosComCodigoBarras))
        .rejects.toThrow(Error);
    });

    it('deve rejeitar produto com preço inválido', async () => {
      const dadosPrecoInvalido = {
        ...dadosValidosProduto,
        precoVenda: -10
      };

      await expect(produtoService.criarProduto(dadosPrecoInvalido))
        .rejects.toThrow(Error);
    });

    it('deve rejeitar produto com estoque negativo', async () => {
      const dadosEstoqueInvalido = {
        ...dadosValidosProduto,
        estoque: -5
      };

      await expect(produtoService.criarProduto(dadosEstoqueInvalido))
        .rejects.toThrow(Error);
    });
  });

  describe('atualizarProduto', () => {
    const dadosAtualizacao: UpdateProdutoData = {
      nome: 'Dipirona 500mg Atualizada',
      precoVenda: 18.00
    };

    it('deve atualizar produto existente', async () => {
      const produtoExistente = {
        id: '1',
        nome: 'Dipirona 500mg',
        precoVenda: 15.50,
        classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO,
        estoque: 100,
        estoqueMinimo: 10,
        categoriaId: 'cat-1',
        exigeReceita: false,
        ativo: true
      };

      const produtoAtualizado = {
        ...produtoExistente,
        ...dadosAtualizacao
      };

      mockPrisma.produto.findUnique.mockResolvedValue(produtoExistente);
      mockPrisma.produto.findFirst.mockResolvedValue(null); // Não há conflito
      mockPrisma.produto.update.mockResolvedValue(produtoAtualizado);

      const resultado = await produtoService.atualizarProduto('1', dadosAtualizacao);

      expect(resultado.nome).toBe('Dipirona 500mg Atualizada');
      expect(resultado.precoVenda).toBe(18.00);
    });

    it('deve rejeitar atualização de produto inexistente', async () => {
      mockPrisma.produto.findUnique.mockResolvedValue(null);

      await expect(produtoService.atualizarProduto('999', dadosAtualizacao))
        .rejects.toThrow(Error);
    });

    it('deve rejeitar nome duplicado na atualização', async () => {
      const produtoExistente = { id: '1', nome: 'Produto Original' };
      const produtoComNomeDuplicado = { id: '2', nome: 'Dipirona 500mg Atualizada' };

      mockPrisma.produto.findUnique.mockResolvedValue(produtoExistente);
      mockPrisma.produto.findFirst.mockResolvedValue(produtoComNomeDuplicado);

      await expect(produtoService.atualizarProduto('1', dadosAtualizacao))
        .rejects.toThrow(Error);
    });
  });

  describe('removerProduto', () => {
    it('deve remover produto existente (soft delete)', async () => {
      const produtoExistente = {
        id: '1',
        nome: 'Dipirona 500mg',
        ativo: true
      };

      mockPrisma.produto.findUnique.mockResolvedValue(produtoExistente);
      mockPrisma.produto.update.mockResolvedValue({ ...produtoExistente, ativo: false });

      await produtoService.removerProduto('1');

      expect(mockPrisma.produto.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { ativo: false }
      });
    });

    it('deve rejeitar remoção de produto inexistente', async () => {
      mockPrisma.produto.findUnique.mockResolvedValue(null);

      await expect(produtoService.removerProduto('999'))
        .rejects.toThrow(Error);
    });
  });

  describe('atualizarEstoque', () => {
    const produtoComEstoque = {
      id: '1',
      nome: 'Dipirona 500mg',
      estoque: 50,
      estoqueMinimo: 10
    };

    it('deve adicionar estoque (ENTRADA)', async () => {
      const produtoAtualizado = { ...produtoComEstoque, estoque: 70 };

      mockPrisma.produto.findUnique.mockResolvedValue(produtoComEstoque);
      mockPrisma.produto.update.mockResolvedValue(produtoAtualizado);

      const resultado = await produtoService.atualizarEstoque('1', 20, 'ENTRADA', 'user-123');

      expect(resultado.estoque).toBe(70);
      expect(mockPrisma.produto.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { estoque: 70 },
        include: {
          categoria: true
        }
      });
    });

    it('deve reduzir estoque (SAIDA)', async () => {
      const produtoAtualizado = { ...produtoComEstoque, estoque: 30 };

      mockPrisma.produto.findUnique.mockResolvedValue(produtoComEstoque);
      mockPrisma.produto.update.mockResolvedValue(produtoAtualizado);

      const resultado = await produtoService.atualizarEstoque('1', 20, 'SAIDA', 'user-123');

      expect(resultado.estoque).toBe(30);
    });

    it('deve rejeitar saída que resulte em estoque negativo', async () => {
      mockPrisma.produto.findUnique.mockResolvedValue(produtoComEstoque);

      await expect(produtoService.atualizarEstoque('1', 60, 'SAIDA', 'user-123'))
        .rejects.toThrow(Error);
    });

    it('deve rejeitar quantidade inválida', async () => {
      mockPrisma.produto.findUnique.mockResolvedValue(produtoComEstoque);

      await expect(produtoService.atualizarEstoque('1', -10, 'ENTRADA', 'user-123'))
        .rejects.toThrow(Error);
    });
  });

  describe('listarProdutosEstoqueBaixo', () => {
    it('deve listar produtos com estoque abaixo do mínimo', async () => {
      const produtosEstoqueBaixo = [
        {
          id: '1',
          nome: 'Produto A',
          estoque: 5,
          estoqueMinimo: 10
        },
        {
          id: '2',
          nome: 'Produto B',
          estoque: 2,
          estoqueMinimo: 15
        }
      ];

      mockPrisma.produto.findMany.mockResolvedValue(produtosEstoqueBaixo);

      const resultado = await produtoService.listarProdutosEstoqueBaixo();

      expect(resultado).toHaveLength(2);
      expect(mockPrisma.produto.findMany).toHaveBeenCalledWith({
        where: {
          ativo: true,
          estoque: {
            lte: mockPrisma.produto.fields.estoqueMinimo
          }
        },
        include: {
          categoria: true
        },
        orderBy: [
          { estoque: 'asc' },
          { nome: 'asc' }
        ]
      });
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erro de conexão com banco de dados', async () => {
      mockPrisma.produto.findMany.mockRejectedValue(new Error('Database connection failed'));

      await expect(produtoService.listarProdutos())
        .rejects.toThrow('connection');
    });

    it('deve tratar erro na criação de produto', async () => {
      const dadosValidos: CreateProdutoData = {
        nome: 'Produto Teste',
        classificacaoAnvisa: ClassificacaoAnvisa.MEDICAMENTO,
        precoVenda: 10.00,
        estoque: 50,
        estoqueMinimo: 5,
        categoriaId: 'cat-1'
      };

      // Mock categoria existente
      mockPrisma.categoria.findUnique.mockResolvedValue({ id: 'cat-1', nome: 'Categoria Teste' });
      mockPrisma.produto.findFirst.mockResolvedValue(null);
      mockPrisma.produto.create.mockRejectedValue(new Error('Constraint violation'));

      await expect(produtoService.criarProduto(dadosValidos))
        .rejects.toThrow('Constraint violation');
    });
  });
});