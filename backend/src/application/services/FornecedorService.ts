/**
 * Service de Fornecedores - Sistema de Farmácia
 * 
 * Implementa regras de negócio para gestão de fornecedores,
 * produtos de fornecedores e notas fiscais.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../shared/utils/logger';
import {
  Fornecedor,
  CreateFornecedorData,
  UpdateFornecedorData,
  ProdutoFornecedor,
  CreateProdutoFornecedorData,
  NotaFiscal,
  CreateNotaFiscalData,
  FornecedorBusinessRules
} from '../../domain/entities/Fornecedor';

export interface FornecedorListOptions {
  skip?: number;
  take?: number;
  search?: string;
  ativo?: boolean;
}

export interface ProdutoFornecedorListOptions {
  fornecedorId?: string;
  produtoId?: string;
  ativo?: boolean;
}

export class FornecedorService {
  private prisma: PrismaClient;
  private logger = logger;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Lista fornecedores com paginação e filtros
   */
  async listarFornecedores(options: FornecedorListOptions = {}): Promise<{
    fornecedores: Fornecedor[];
    total: number;
  }> {
    try {
      const { skip = 0, take = 20, search, ativo } = options;

      const where: any = {};

      // Filtro por status ativo
      if (ativo !== undefined) {
        where.ativo = ativo;
      }

      // Filtro de busca
      if (search) {
        where.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { cnpj: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [fornecedores, total] = await Promise.all([
        this.prisma.fornecedor.findMany({
          where,
          skip,
          take,
          orderBy: { nome: 'asc' }
        }),
        this.prisma.fornecedor.count({ where })
      ]);

      this.logger.info(`Listados ${fornecedores.length} fornecedores`);

      return {
        fornecedores: fornecedores.map(this.mapFornecedor),
        total
      };
    } catch (error) {
      this.logger.error('Erro ao listar fornecedores:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca fornecedor por ID (apenas ativos por padrão)
   */
  async buscarFornecedorPorId(id: string, incluirInativos: boolean = false): Promise<Fornecedor | null> {
    try {
      const where: any = { id };
      
      // Por padrão, buscar apenas fornecedores ativos
      if (!incluirInativos) {
        where.ativo = true;
      }

      const fornecedor = await this.prisma.fornecedor.findUnique({
        where
      });

      if (!fornecedor) {
        return null;
      }

      return this.mapFornecedor(fornecedor);
    } catch (error) {
      this.logger.error(`Erro ao buscar fornecedor ${id}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Busca fornecedor por CNPJ
   */
  async buscarFornecedorPorCNPJ(cnpj: string): Promise<Fornecedor | null> {
    try {
      const fornecedor = await this.prisma.fornecedor.findUnique({
        where: { cnpj: cnpj.replace(/\D/g, '') }
      });

      if (!fornecedor) {
        return null;
      }

      return this.mapFornecedor(fornecedor);
    } catch (error) {
      this.logger.error(`Erro ao buscar fornecedor por CNPJ ${cnpj}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Cria novo fornecedor
   */
  async criarFornecedor(data: CreateFornecedorData): Promise<Fornecedor> {
    try {
      // Validações de negócio
      const validationErrors = FornecedorBusinessRules.validateFornecedor(data);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Verificar se CNPJ já existe
      const cnpjLimpo = data.cnpj.replace(/\D/g, '');
      const fornecedorExistente = await this.buscarFornecedorPorCNPJ(cnpjLimpo);
      if (fornecedorExistente) {
        throw new Error('CNPJ já cadastrado');
      }

      const novoFornecedor = await this.prisma.fornecedor.create({
        data: {
          nome: data.nome,
          cnpj: cnpjLimpo,
          email: data.email,
          telefone: data.telefone,
          endereco: data.endereco,
          representanteNome: data.representanteNome,
          representanteTelefone: data.representanteTelefone,
          representanteEmail: data.representanteEmail,
          ativo: data.ativo ?? true
        }
      });

      this.logger.info(`Fornecedor criado: ${novoFornecedor.nome} (${novoFornecedor.id})`);

      return this.mapFornecedor(novoFornecedor);
    } catch (error) {
      this.logger.error('Erro ao criar fornecedor:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Atualiza fornecedor
   */
  async atualizarFornecedor(id: string, data: UpdateFornecedorData): Promise<Fornecedor> {
    try {
      // Verificar se fornecedor existe
      const fornecedorExistente = await this.buscarFornecedorPorId(id);
      if (!fornecedorExistente) {
        throw new Error('Fornecedor não encontrado');
      }

      // Validar dados se fornecidos
      if (data.cnpj || data.nome || data.email || data.telefone) {
        const dataToValidate: CreateFornecedorData = {
          nome: data.nome ?? fornecedorExistente.nome,
          cnpj: data.cnpj ?? fornecedorExistente.cnpj,
          email: data.email ?? fornecedorExistente.email,
          telefone: data.telefone ?? fornecedorExistente.telefone,
          endereco: data.endereco ?? fornecedorExistente.endereco
        };

        const validationErrors = FornecedorBusinessRules.validateFornecedor(dataToValidate);
        if (validationErrors.length > 0) {
          throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
        }
      }

      // Verificar CNPJ único se está sendo alterado
      if (data.cnpj) {
        const cnpjLimpo = data.cnpj.replace(/\D/g, '');
        if (cnpjLimpo !== fornecedorExistente.cnpj) {
          const fornecedorComCNPJ = await this.buscarFornecedorPorCNPJ(cnpjLimpo);
          if (fornecedorComCNPJ) {
            throw new Error('CNPJ já cadastrado');
          }
        }
        data.cnpj = cnpjLimpo;
      }

      const fornecedorAtualizado = await this.prisma.fornecedor.update({
        where: { id },
        data: {
          ...(data.nome && { nome: data.nome }),
          ...(data.cnpj && { cnpj: data.cnpj }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.telefone !== undefined && { telefone: data.telefone }),
          ...(data.endereco !== undefined && { endereco: data.endereco }),
          ...(data.representanteNome !== undefined && { representanteNome: data.representanteNome }),
          ...(data.representanteTelefone !== undefined && { representanteTelefone: data.representanteTelefone }),
          ...(data.representanteEmail !== undefined && { representanteEmail: data.representanteEmail }),
          ...(data.ativo !== undefined && { ativo: data.ativo })
        }
      });

      this.logger.info(`Fornecedor atualizado: ${fornecedorAtualizado.nome} (${id})`);

      return this.mapFornecedor(fornecedorAtualizado);
    } catch (error) {
      this.logger.error(`Erro ao atualizar fornecedor ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Remove fornecedor (soft delete)
   */
  async removerFornecedor(id: string): Promise<void> {
    try {
      // Buscar fornecedor incluindo inativos para poder "remover" fornecedores já inativos
      const fornecedorExistente = await this.buscarFornecedorPorId(id, true);
      if (!fornecedorExistente) {
        throw new Error('Fornecedor não encontrado');
      }

      // Verificar se já está inativo
      if (!fornecedorExistente.ativo) {
        throw new Error('Fornecedor já foi removido');
      }

      await this.prisma.fornecedor.update({
        where: { id },
        data: { ativo: false }
      });

      this.logger.info(`Fornecedor removido: ${fornecedorExistente.nome} (${id})`);
    } catch (error) {
      this.logger.error(`Erro ao remover fornecedor ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Reativa fornecedor (desfaz soft delete)
   */
  async reativarFornecedor(id: string): Promise<void> {
    try {
      // Buscar fornecedor incluindo inativos
      const fornecedorExistente = await this.buscarFornecedorPorId(id, true);
      if (!fornecedorExistente) {
        throw new Error('Fornecedor não encontrado');
      }

      // Verificar se já está ativo
      if (fornecedorExistente.ativo) {
        throw new Error('Fornecedor já está ativo');
      }

      await this.prisma.fornecedor.update({
        where: { id },
        data: { ativo: true }
      });

      this.logger.info(`Fornecedor reativado: ${fornecedorExistente.nome} (${id})`);
    } catch (error) {
      this.logger.error(`Erro ao reativar fornecedor ${id}:`, error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Lista produtos de um fornecedor
   */
  async listarProdutosFornecedor(options: ProdutoFornecedorListOptions = {}): Promise<ProdutoFornecedor[]> {
    try {
      const where: any = {};

      if (options.fornecedorId) {
        where.fornecedorId = options.fornecedorId;
      }

      if (options.produtoId) {
        where.produtoId = options.produtoId;
      }

      if (options.ativo !== undefined) {
        where.ativo = options.ativo;
      }

      const produtosFornecedor = await this.prisma.produtoFornecedor.findMany({
        where,
        include: {
          produto: true,
          fornecedor: true
        },
        orderBy: { criadoEm: 'desc' }
      });

      return produtosFornecedor.map(pf => ({
        id: pf.id,
        produtoId: pf.produtoId,
        fornecedorId: pf.fornecedorId,
        precoCusto: Number(pf.precoCusto),
        prazoEntrega: pf.prazoEntrega,
        ativo: pf.ativo,
        criadoEm: pf.criadoEm,
        atualizadoEm: pf.atualizadoEm
      }));
    } catch (error) {
      this.logger.error('Erro ao listar produtos do fornecedor:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Adiciona produto ao fornecedor
   */
  async adicionarProdutoFornecedor(data: CreateProdutoFornecedorData): Promise<ProdutoFornecedor> {
    try {
      // Validações de negócio
      const validationErrors = FornecedorBusinessRules.validateProdutoFornecedor(data);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Verificar se relação já existe
      const relacaoExistente = await this.prisma.produtoFornecedor.findUnique({
        where: {
          produtoId_fornecedorId: {
            produtoId: data.produtoId,
            fornecedorId: data.fornecedorId
          }
        }
      });

      if (relacaoExistente) {
        throw new Error('Produto já cadastrado para este fornecedor');
      }

      const novoProdutoFornecedor = await this.prisma.produtoFornecedor.create({
        data: {
          ...data,
          ativo: data.ativo ?? true
        }
      });

      this.logger.info(`Produto adicionado ao fornecedor: ${data.produtoId} -> ${data.fornecedorId}`);

      return {
        id: novoProdutoFornecedor.id,
        produtoId: novoProdutoFornecedor.produtoId,
        fornecedorId: novoProdutoFornecedor.fornecedorId,
        precoCusto: Number(novoProdutoFornecedor.precoCusto),
        prazoEntrega: novoProdutoFornecedor.prazoEntrega,
        ativo: novoProdutoFornecedor.ativo,
        criadoEm: novoProdutoFornecedor.criadoEm,
        atualizadoEm: novoProdutoFornecedor.atualizadoEm
      };
    } catch (error) {
      this.logger.error('Erro ao adicionar produto ao fornecedor:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Registra nota fiscal
   */
  async registrarNotaFiscal(data: CreateNotaFiscalData): Promise<NotaFiscal> {
    try {
      // Validações de negócio
      const validationErrors = FornecedorBusinessRules.validateNotaFiscal(data);
      if (validationErrors.length > 0) {
        throw new Error(`Dados inválidos: ${validationErrors.join(', ')}`);
      }

      // Verificar se nota já existe
      const notaExistente = await this.prisma.notaFiscal.findUnique({
        where: {
          numero_serie_fornecedorId: {
            numero: data.numero,
            serie: data.serie,
            fornecedorId: data.fornecedorId
          }
        }
      });

      if (notaExistente) {
        throw new Error('Nota fiscal já cadastrada');
      }

      const novaNotaFiscal = await this.prisma.notaFiscal.create({
        data
      });

      this.logger.info(`Nota fiscal registrada: ${data.numero}/${data.serie} - R$ ${data.valorTotal}`);

      return {
        id: novaNotaFiscal.id,
        fornecedorId: novaNotaFiscal.fornecedorId,
        numero: novaNotaFiscal.numero,
        serie: novaNotaFiscal.serie,
        chaveAcesso: novaNotaFiscal.chaveAcesso || undefined,
        valorTotal: Number(novaNotaFiscal.valorTotal),
        dataEmissao: novaNotaFiscal.dataEmissao,
        processada: novaNotaFiscal.processada,
        criadoEm: novaNotaFiscal.criadoEm
      };
    } catch (error) {
      this.logger.error('Erro ao registrar nota fiscal:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Mapeia fornecedor do Prisma para entidade
   */
  private mapFornecedor(fornecedor: any): Fornecedor {
    return {
      id: fornecedor.id,
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj,
      email: fornecedor.email || undefined,
      telefone: fornecedor.telefone || undefined,
      endereco: fornecedor.endereco || undefined,
      representanteNome: fornecedor.representanteNome || undefined,
      representanteTelefone: fornecedor.representanteTelefone || undefined,
      representanteEmail: fornecedor.representanteEmail || undefined,
      ativo: fornecedor.ativo,
      criadoEm: fornecedor.criadoEm,
      atualizadoEm: fornecedor.atualizadoEm
    };
  }
}
