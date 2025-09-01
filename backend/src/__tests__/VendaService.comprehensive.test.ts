/**
 * Testes Abrangentes - VendaService
 * 
 * Cobertura de cenários críticos:
 * - Criação de vendas (balcão e controlada)
 * - Validações de estoque e produtos
 * - Medicamentos controlados e receitas
 * - Cálculos de valores e descontos
 * - Pagamentos e finalizações
 * - Cancelamentos e estornos
 * - Relatórios e consultas
 * - Casos de erro e validações
 */

import { VendaService } from '../application/services/VendaService';
import type { CriarVendaData, AtualizarVendaData, FiltroVenda } from '../domain/entities/Venda';
import { FormaPagamento } from '../domain/enums/FormaPagamento';
import { StatusPagamento } from '../domain/enums/StatusPagamento';

// Mocks
// Mock objects defined before jest.mock calls
const mockPrismaClient = {
  venda: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  itemVenda: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  produto: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  movimentacaoEstoque: {
    create: jest.fn()
  },
  $transaction: jest.fn(),
  $queryRaw: jest.fn(),
  $connect: jest.fn()
};

const mockEstoqueService = {
  movimentarEstoque: jest.fn(),
  verificarEstoqueSuficiente: jest.fn()
};

// Jest mocks
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient)
}));

jest.mock('../application/services/EstoqueService', () => ({
  EstoqueService: jest.fn(() => mockEstoqueService)
}));

jest.mock('../shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('VendaService - Testes Abrangentes', () => {
  let vendaService: VendaService;
  const mockUsuarioId = 'user-123';
  const mockClienteId = 'cliente-123';
  const mockProdutoId = 'produto-123';
  const mockVendaId = 'venda-123';

  beforeEach(() => {
    jest.clearAllMocks();
    vendaService = new VendaService();
    // Inject the mock prisma client
    (vendaService as any).prisma = mockPrismaClient;
  });

  describe('Criação de Vendas', () => {
    const mockProduto = {
      id: mockProdutoId,
      nome: 'Paracetamol 500mg',
      precoVenda: 12.99,
      estoque: 100,
      exigeReceita: false
    };

    const mockVendaData: CriarVendaData = {
      clienteId: mockClienteId,
      formaPagamento: FormaPagamento.DINHEIRO,
      itens: [{
        produtoId: mockProdutoId,
        quantidade: 2,
        precoUnitario: 12.99,
        desconto: 0
      }]
    };

    beforeEach(() => {
      mockPrismaClient.produto.findMany.mockResolvedValue([mockProduto]);
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        const result = await callback(mockPrismaClient);
        return result || {
          id: mockVendaId,
          clienteId: mockClienteId,
          usuarioId: mockUsuarioId,
          valorTotal: 25.98,
          valorDesconto: 0,
          valorFinal: 25.98,
          formaPagamento: FormaPagamento.DINHEIRO,
          statusPagamento: StatusPagamento.PENDENTE,
          temMedicamentoControlado: false,
          receitaArquivada: false,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
          itens: [{
            id: 'item-123',
            vendaId: mockVendaId,
            produtoId: mockProdutoId,
            quantidade: 2,
            precoUnitario: 12.99,
            desconto: 0,
            total: 25.98
          }]
        };
      });
      mockEstoqueService.verificarEstoqueSuficiente.mockResolvedValue(true);
      mockEstoqueService.movimentarEstoque.mockResolvedValue(undefined);
    });

    it('deve criar venda de balcão com sucesso', async () => {
      const mockVenda = {
        id: mockVendaId,
        clienteId: mockClienteId,
        usuarioId: mockUsuarioId,
        valorTotal: 25.98,
        valorDesconto: 0,
        valorFinal: 25.98,
        formaPagamento: FormaPagamento.DINHEIRO,
        statusPagamento: StatusPagamento.PENDENTE,
        temMedicamentoControlado: false,
        receitaArquivada: false,
        criadoEm: new Date(),
        atualizadoEm: new Date()
      };

      const mockItemVenda = {
        id: 'item-123',
        vendaId: mockVendaId,
        produtoId: mockProdutoId,
        quantidade: 2,
        precoUnitario: 12.99,
        desconto: 0,
        total: 25.98
      };

      mockPrismaClient.venda.create.mockResolvedValue(mockVenda);
      mockPrismaClient.itemVenda.create.mockResolvedValue(mockItemVenda);
      mockPrismaClient.produto.update.mockResolvedValue({});
      mockPrismaClient.movimentacaoEstoque.create.mockResolvedValue({});

      const resultado = await vendaService.criarVenda(mockVendaData, mockUsuarioId);

      expect(resultado).toBeDefined();
      expect(resultado).toHaveProperty('id', mockVendaId);
      expect(resultado).toHaveProperty('valorTotal', 25.98);
      expect(resultado.itens).toHaveLength(1);
      expect(mockPrismaClient.venda.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clienteId: mockClienteId,
          usuarioId: mockUsuarioId,
          valorTotal: 25.98,
          formaPagamento: FormaPagamento.DINHEIRO
        })
      });
    });

    it('deve criar venda com medicamento controlado', async () => {
      const produtoControlado = {
        ...mockProduto,
        exigeReceita: true,
        nome: 'Rivotril 2mg'
      };

      const vendaControlada: CriarVendaData = {
        ...mockVendaData,
        numeroReceita: 'REC-123456',
        dataReceita: new Date().toISOString().split('T')[0], // Data atual
        pacienteNome: 'João Silva',
        pacienteDocumento: '11144477735',
        pacienteTipoDocumento: 'CPF',
        pacienteEndereco: 'Rua das Flores, 123, Centro, São Paulo - SP'
      };

      mockPrismaClient.produto.findMany.mockResolvedValue([produtoControlado]);

      const mockVenda = {
        id: mockVendaId,
        temMedicamentoControlado: true,
        numeroReceita: 'REC-123456',
        clienteNome: 'João Silva',
        clienteDocumento: '12345678901'
      };

      mockPrismaClient.venda.create.mockResolvedValue(mockVenda);
      mockPrismaClient.itemVenda.create.mockResolvedValue({});
      mockPrismaClient.produto.update.mockResolvedValue({});
      mockPrismaClient.movimentacaoEstoque.create.mockResolvedValue({});

      const resultado = await vendaService.criarVenda(vendaControlada, mockUsuarioId);

      expect(resultado).toHaveProperty('temMedicamentoControlado', true);
      expect(mockPrismaClient.venda.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          temMedicamentoControlado: true,
          numeroReceita: 'REC-123456',
          clienteId: 'cliente-123'
        })
      });
    });

    it('deve calcular valores com desconto corretamente', async () => {
      const vendaComDesconto: CriarVendaData = {
        ...mockVendaData,
        itens: [{
          produtoId: mockProdutoId,
          quantidade: 3,
          precoUnitario: 10.00,
          desconto: 5.00
        }]
      };

      mockPrismaClient.venda.create.mockResolvedValue({
        id: mockVendaId,
        valorTotal: 30.00,
        valorDesconto: 5.00,
        valorFinal: 25.00
      });
      mockPrismaClient.itemVenda.create.mockResolvedValue({});
      mockPrismaClient.produto.update.mockResolvedValue({});
      mockPrismaClient.movimentacaoEstoque.create.mockResolvedValue({});

      await vendaService.criarVenda(vendaComDesconto, mockUsuarioId);

      expect(mockPrismaClient.venda.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          valorTotal: 30.00,
          valorDesconto: 1.50,
          valorFinal: 28.50
        })
      });
    });

    it('deve falhar se desconto inválido', async () => {
      const vendaComDescontoInvalido: CriarVendaData = {
        ...mockVendaData,
        itens: [{
          produtoId: mockProdutoId,
          quantidade: 1,
          precoUnitario: 10.00,
          desconto: 150.00 // Desconto maior que 100%
        }]
      };

      await expect(vendaService.criarVenda(vendaComDescontoInvalido, mockUsuarioId))
        .rejects.toThrow(/Desconto deve estar entre 0% e 100%/);
    });

    it('deve falhar se não houver itens na venda', async () => {
      const vendaSemItens: CriarVendaData = {
        ...mockVendaData,
        itens: []
      };

      await expect(vendaService.criarVenda(vendaSemItens, mockUsuarioId))
        .rejects.toThrow('Venda deve ter pelo menos um item');
    });

    it('deve falhar se produto não existir', async () => {
      mockPrismaClient.produto.findMany.mockResolvedValue([]);

      await expect(vendaService.criarVenda(mockVendaData, mockUsuarioId))
        .rejects.toThrow('Um ou mais produtos não foram encontrados');
    });

    it('deve falhar se estoque insuficiente', async () => {
      const produtoSemEstoque = {
        ...mockProduto,
        estoque: 1
      };

      mockPrismaClient.produto.findMany.mockResolvedValue([produtoSemEstoque]);

      await expect(vendaService.criarVenda(mockVendaData, mockUsuarioId))
        .rejects.toThrow('Estoque insuficiente para o produto');
    });

    it('deve falhar se medicamento controlado sem receita', async () => {
      const produtoControlado = {
        ...mockProduto,
        exigeReceita: true
      };

      mockPrismaClient.produto.findMany.mockResolvedValue([produtoControlado]);

      await expect(vendaService.criarVenda(mockVendaData, mockUsuarioId))
        .rejects.toThrow(/Número da receita é obrigatório/);
    });

    it('deve falhar se medicamento controlado sem dados do cliente', async () => {
      const produtoControlado = {
        ...mockProduto,
        exigeReceita: true
      };

      const vendaSemCliente: CriarVendaData = {
        ...mockVendaData,
        clienteId: undefined,
        numeroReceita: 'REC-123',
        dataReceita: new Date().toISOString().split('T')[0] // Data atual
      };

      mockPrismaClient.produto.findMany.mockResolvedValue([produtoControlado]);

      await expect(vendaService.criarVenda(vendaSemCliente, mockUsuarioId))
        .rejects.toThrow(/Nome do cliente é obrigatório/);
    });
  });

  describe('Atualização de Vendas', () => {
    it('deve atualizar status de pagamento', async () => {
      const vendaExistente = {
        id: mockVendaId,
        statusPagamento: 'PENDENTE'
      };

      const dadosAtualizacao: AtualizarVendaData = {
        statusPagamento: StatusPagamento.PAGO
      };

      const vendaAtualizada = {
        ...vendaExistente,
        statusPagamento: StatusPagamento.PAGO,
        valorTotal: 25.98,
        valorDesconto: 0,
        valorFinal: 25.98,
        formaPagamento: FormaPagamento.DINHEIRO,
        atualizadoEm: new Date()
      };

      mockPrismaClient.venda.findUnique.mockResolvedValue(vendaExistente);
      mockPrismaClient.venda.update.mockResolvedValue(vendaAtualizada);

      const resultado = await vendaService.atualizarVenda(mockVendaId, dadosAtualizacao);

      expect(resultado.statusPagamento).toBe('PAGO');
      expect(mockPrismaClient.venda.update).toHaveBeenCalledWith({
        where: { id: mockVendaId },
        data: expect.objectContaining({
          statusPagamento: StatusPagamento.PAGO
        })
      });
    });

    it('deve falhar ao atualizar venda inexistente', async () => {
      mockPrismaClient.venda.findUnique.mockResolvedValue(null);

      await expect(vendaService.atualizarVenda('venda-inexistente', {}))
        .rejects.toThrow('Venda não encontrada');
    });
  });

  describe('Busca de Vendas', () => {
    it('deve buscar venda por ID com itens', async () => {
      const mockVenda = {
        id: mockVendaId,
        valorTotal: 25.98,
        valorDesconto: 0,
        valorFinal: 25.98,
        formaPagamento: FormaPagamento.DINHEIRO,
        statusPagamento: StatusPagamento.PAGO
      };

      const mockItens = [{
        id: 'item-123',
        vendaId: mockVendaId,
        produtoId: mockProdutoId,
        quantidade: 2,
        precoUnitario: 12.99,
        total: 25.98
      }];

      mockPrismaClient.venda.findUnique.mockResolvedValue({
        ...mockVenda,
        itens: mockItens
      });

      const resultado = await vendaService.buscarVendaPorId(mockVendaId);

      expect(resultado).toBeDefined();
      expect(resultado).toHaveProperty('id', mockVendaId);
      expect(resultado?.itens).toHaveLength(1);
    });

    it('deve retornar null para venda inexistente', async () => {
      mockPrismaClient.venda.findUnique.mockResolvedValue(null);

      const resultado = await vendaService.buscarVendaPorId('venda-inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('Listagem de Vendas', () => {
    it('deve listar vendas com paginação', async () => {
      const mockVendas = [
        {
          id: 'venda-1',
          valorTotal: 25.98,
          statusPagamento: StatusPagamento.PAGO
        },
        {
          id: 'venda-2',
          valorTotal: 45.50,
          statusPagamento: 'PENDENTE'
        }
      ];

      mockPrismaClient.venda.findMany.mockResolvedValue(mockVendas);
      mockPrismaClient.venda.count.mockResolvedValue(2);

      const resultado = await vendaService.listarVendas({
        page: 1,
        limit: 10
      });

      expect(resultado.vendas).toHaveLength(2);
      expect(resultado.pagination.totalItems).toBe(2);
      expect(resultado.pagination.currentPage).toBe(1);
    });

    it('deve filtrar vendas por status de pagamento', async () => {
      mockPrismaClient.venda.findMany.mockResolvedValue([]);
      mockPrismaClient.venda.count.mockResolvedValue(0);

      await vendaService.listarVendas({
        statusPagamento: StatusPagamento.PAGO
      });

      expect(mockPrismaClient.venda.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            statusPagamento: StatusPagamento.PAGO
          })
        })
      );
    });
  });

  describe('Cancelamento de Vendas', () => {
    it('deve cancelar venda e estornar estoque', async () => {
      const mockVenda = {
        id: mockVendaId,
        statusPagamento: StatusPagamento.PENDENTE,
        itens: [{
          produtoId: mockProdutoId,
          quantidade: 2
        }]
      };

      mockPrismaClient.venda.findUnique.mockResolvedValue(mockVenda);
      mockPrismaClient.venda.update.mockResolvedValue({
        ...mockVenda,
        statusPagamento: StatusPagamento.CANCELADO
      });
      mockPrismaClient.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrismaClient);
      });

      const resultado = await vendaService.cancelarVenda(mockVendaId, mockUsuarioId);

      expect(resultado.statusPagamento).toBe('CANCELADO');
      expect(mockPrismaClient.produto.update).toHaveBeenCalledWith({
        where: { id: mockProdutoId },
        data: { estoque: { increment: 2 } }
      });
    });

    it('deve falhar ao cancelar venda já paga', async () => {
      const vendaPaga = {
        id: mockVendaId,
        statusPagamento: 'PAGO'
      };

      mockPrismaClient.venda.findUnique.mockResolvedValue(vendaPaga);

      await expect(vendaService.cancelarVenda(mockVendaId, mockUsuarioId))
        .rejects.toThrow('Não é possível cancelar uma venda que já foi paga');
    });
  });

  describe('Finalização de Pagamento', () => {
    it('deve finalizar pagamento com sucesso', async () => {
      const vendaPendente = {
        id: mockVendaId,
        statusPagamento: StatusPagamento.PENDENTE,
        valorFinal: 25.98
      };

      const vendaFinalizada = {
        ...vendaPendente,
        statusPagamento: 'PAGO'
      };

      mockPrismaClient.venda.findUnique.mockResolvedValue(vendaPendente);
      mockPrismaClient.venda.update.mockResolvedValue(vendaFinalizada);

      const resultado = await vendaService.finalizarPagamento(mockVendaId);

      expect(resultado.statusPagamento).toBe('PAGO');
    });

    it('deve falhar se venda já estiver paga', async () => {
      const vendaPaga = {
        id: mockVendaId,
        statusPagamento: 'PAGO'
      };

      mockPrismaClient.venda.findUnique.mockResolvedValue(vendaPaga);

      await expect(vendaService.finalizarPagamento(mockVendaId))
        .rejects.toThrow('O pagamento desta venda não pode ser finalizado');
    });
  });

  describe('Arquivamento de Receitas', () => {
    it('deve registrar arquivamento de receita', async () => {
      const vendaComReceita = {
        id: mockVendaId,
        temMedicamentoControlado: true,
        receitaArquivada: false,
        numeroReceita: null
      };

      const vendaArquivada = {
        ...vendaComReceita,
        receitaArquivada: true,
        numeroReceita: 'RX-123456'
      };

      mockPrismaClient.venda.findUnique.mockResolvedValue(vendaComReceita);
      mockPrismaClient.venda.update.mockResolvedValue(vendaArquivada);

      const resultado = await vendaService.registrarArquivamentoReceita(mockVendaId, 'RX-123456');

      expect(resultado.receitaArquivada).toBe(true);
    });

    it('deve falhar se venda não tem medicamento controlado', async () => {
      const vendaSemControlado = {
        id: mockVendaId,
        temMedicamentoControlado: false
      };

      mockPrismaClient.venda.findUnique.mockResolvedValue(vendaSemControlado);

      await expect(vendaService.registrarArquivamentoReceita(mockVendaId))
        .rejects.toThrow('Esta receita não pode ser arquivada');
    });
  });

  describe('Relatórios', () => {
    it('deve gerar relatório de vendas por período', async () => {
      const mockVendas = [{
        id: 'venda-1',
        valorTotal: 100.00,
        valorDesconto: 10.00,
        valorFinal: 90.00,
        formaPagamento: 'DINHEIRO',
        statusPagamento: 'PAGO',
        criadoEm: new Date(),
        cliente: { id: 'cliente-1', nome: 'Cliente Teste' },
        usuario: { id: 'user-1', nome: 'Vendedor Teste' },
        itens: [{
          id: 'item-1',
          produtoId: 'produto-1',
          quantidade: 2,
          total: 90.00,
          produto: { id: 'produto-1', nome: 'Produto Teste', categoria: 'Medicamento' }
        }]
      }];

      mockPrismaClient.venda.findMany.mockResolvedValue(mockVendas);

      const filtro = {
        dataInicio: new Date('2024-01-01'),
        dataFim: new Date('2024-01-31')
      };

      const resultado = await vendaService.gerarRelatorioVendas(filtro);

      expect(resultado).toBeDefined();
      expect(resultado.resumo.totalVendas).toBe(1);
      expect(mockPrismaClient.venda.findMany).toHaveBeenCalled();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erro de conexão com banco de dados', async () => {
      mockPrismaClient.produto.findMany.mockRejectedValue(new Error('Conexão perdida'));

      await expect(vendaService.criarVenda({
        formaPagamento: FormaPagamento.DINHEIRO,
        itens: [{ produtoId: 'produto-1', quantidade: 1 }]
      }, mockUsuarioId)).rejects.toThrow('Conexão perdida');
    });

    it('deve tratar erro de transação', async () => {
      mockPrismaClient.produto.findMany.mockResolvedValue([{
        id: mockProdutoId,
        estoque: 10,
        precoVenda: 10.00,
        exigeReceita: false
      }]);
      
      mockPrismaClient.$transaction.mockRejectedValue(new Error('Falha na transação'));

      await expect(vendaService.criarVenda({
        formaPagamento: FormaPagamento.DINHEIRO,
        itens: [{ produtoId: mockProdutoId, quantidade: 1 }]
      }, mockUsuarioId)).rejects.toThrow('transaction');
    });
  });
});