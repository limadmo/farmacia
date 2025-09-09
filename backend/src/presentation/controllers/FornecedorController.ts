/**
 * Controller de Fornecedores - Sistema de Farmácia
 * 
 * Implementa endpoints REST para gestão de fornecedores,
 * produtos de fornecedores e notas fiscais.
 */

import { Request, Response } from 'express';
import { FornecedorService, FornecedorListOptions, ProdutoFornecedorListOptions } from '../../application/services/FornecedorService';
import { logger } from '../../shared/utils/logger';
import { CreateFornecedorData, UpdateFornecedorData, CreateProdutoFornecedorData, CreateNotaFiscalData } from '../../domain/entities/Fornecedor';

export class FornecedorController {
  private fornecedorService: FornecedorService;
  private logger = logger;

  constructor() {
    this.fornecedorService = new FornecedorService();
  }

  /**
   * GET /api/fornecedores
   * Lista fornecedores com paginação e filtros
   */
  async listarFornecedores(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        ativo
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // Validar parâmetros de paginação
      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          error: 'Parâmetros de paginação inválidos',
          message: 'Page deve ser >= 1 e limit entre 1 e 100'
        });
        return;
      }

      const options: FornecedorListOptions = {
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        search: search as string,
        ativo: ativo !== undefined ? ativo === 'true' : true // Por padrão, mostrar apenas ativos
      };

      const resultado = await this.fornecedorService.listarFornecedores(options);

      const totalPages = Math.ceil(resultado.total / limitNum);

      res.json({
        fornecedores: resultado.fornecedores,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: resultado.total,
          itemsPerPage: limitNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error) {
      this.logger.error('Erro ao listar fornecedores:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao listar fornecedores'
      });
    }
  }

  /**
   * GET /api/fornecedores/:id
   * Busca fornecedor por ID
   */
  async buscarFornecedorPorId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'ID obrigatório',
          message: 'O ID do fornecedor é obrigatório'
        });
        return;
      }

      const fornecedor = await this.fornecedorService.buscarFornecedorPorId(id);

      if (!fornecedor) {
        res.status(404).json({
          error: 'Fornecedor não encontrado',
          message: `Fornecedor com ID ${id} não foi encontrado`
        });
        return;
      }

      res.json(fornecedor);
    } catch (error) {
      this.logger.error(`Erro ao buscar fornecedor ${req.params.id}:`, error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar fornecedor'
      });
    }
  }

  /**
   * GET /api/fornecedores/cnpj/:cnpj
   * Busca fornecedor por CNPJ
   */
  async buscarFornecedorPorCNPJ(req: Request, res: Response): Promise<void> {
    try {
      const { cnpj } = req.params;

      if (!cnpj) {
        res.status(400).json({
          error: 'CNPJ obrigatório',
          message: 'O CNPJ é obrigatório'
        });
        return;
      }

      const fornecedor = await this.fornecedorService.buscarFornecedorPorCNPJ(cnpj);

      if (!fornecedor) {
        res.status(404).json({
          error: 'Fornecedor não encontrado',
          message: `Fornecedor com CNPJ ${cnpj} não foi encontrado`
        });
        return;
      }

      res.json(fornecedor);
    } catch (error) {
      this.logger.error(`Erro ao buscar fornecedor por CNPJ ${req.params.cnpj}:`, error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao buscar fornecedor'
      });
    }
  }

  /**
   * POST /api/fornecedores
   * Cria novo fornecedor
   */
  async criarFornecedor(req: Request, res: Response): Promise<void> {
    try {
      const { nome, cnpj, email, telefone, endereco, ativo }: CreateFornecedorData = req.body;

      // Validação básica
      if (!nome || !cnpj) {
        res.status(400).json({
          error: 'Dados obrigatórios',
          message: 'Nome e CNPJ são obrigatórios'
        });
        return;
      }

      const dadosFornecedor: CreateFornecedorData = {
        nome: nome.trim(),
        cnpj: cnpj.trim(),
        email: email?.trim(),
        telefone: telefone?.trim(),
        endereco: endereco?.trim(),
        ativo
      };

      const novoFornecedor = await this.fornecedorService.criarFornecedor(dadosFornecedor);

      res.status(201).json({
        success: true,
        data: novoFornecedor,
        message: 'Fornecedor criado com sucesso'
      });
    } catch (error) {
      this.logger.error('Erro ao criar fornecedor:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('já cadastrado') || error.message.includes('inválido')) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao criar fornecedor'
      });
    }
  }

  /**
   * PUT /api/fornecedores/:id
   * Atualiza fornecedor
   */
  async atualizarFornecedor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dadosAtualizacao: UpdateFornecedorData = req.body;

      if (!id) {
        res.status(400).json({
          error: 'ID obrigatório',
          message: 'O ID do fornecedor é obrigatório'
        });
        return;
      }

      // Limpar strings se fornecidas
      if (dadosAtualizacao.nome) dadosAtualizacao.nome = dadosAtualizacao.nome.trim();
      if (dadosAtualizacao.cnpj) dadosAtualizacao.cnpj = dadosAtualizacao.cnpj.trim();
      if (dadosAtualizacao.email) dadosAtualizacao.email = dadosAtualizacao.email.trim();
      if (dadosAtualizacao.telefone) dadosAtualizacao.telefone = dadosAtualizacao.telefone.trim();
      if (dadosAtualizacao.endereco) dadosAtualizacao.endereco = dadosAtualizacao.endereco.trim();

      const fornecedorAtualizado = await this.fornecedorService.atualizarFornecedor(id, dadosAtualizacao);

      res.json({
        success: true,
        data: fornecedorAtualizado,
        message: 'Fornecedor atualizado com sucesso'
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar fornecedor ${req.params.id}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('não encontrado')) {
          res.status(404).json({
            error: 'Fornecedor não encontrado',
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('já cadastrado') || error.message.includes('inválido')) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao atualizar fornecedor'
      });
    }
  }

  /**
   * DELETE /api/fornecedores/:id
   * Remove fornecedor (soft delete)
   */
  async removerFornecedor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'ID obrigatório',
          message: 'O ID do fornecedor é obrigatório'
        });
        return;
      }

      await this.fornecedorService.removerFornecedor(id);

      res.json({
        message: 'Fornecedor removido com sucesso'
      });
    } catch (error) {
      this.logger.error(`Erro ao remover fornecedor ${req.params.id}:`, error);
      
      if (error instanceof Error && error.message.includes('não encontrado')) {
        res.status(404).json({
          error: 'Fornecedor não encontrado',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao remover fornecedor'
      });
    }
  }

  /**
   * PUT /api/fornecedores/:id/reativar
   * Reativa fornecedor (desfaz soft delete)
   */
  async reativarFornecedor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          error: 'ID obrigatório',
          message: 'O ID do fornecedor é obrigatório'
        });
        return;
      }

      await this.fornecedorService.reativarFornecedor(id);
      
      res.json({
        message: 'Fornecedor reativado com sucesso'
      });
    } catch (error) {
      this.logger.error(`Erro ao reativar fornecedor ${req.params.id}:`, error);
      
      if (error instanceof Error && (error.message.includes('não encontrado') || error.message.includes('já está ativo'))) {
        res.status(400).json({
          error: 'Erro na reativação',
          message: error.message
        });
        return;
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao reativar fornecedor'
      });
    }
  }

  /**
   * GET /api/fornecedores/:id/produtos
   * Lista produtos de um fornecedor
   */
  async listarProdutosFornecedor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { ativo } = req.query;

      const options: ProdutoFornecedorListOptions = {
        fornecedorId: id,
        ativo: ativo !== undefined ? ativo === 'true' : undefined
      };

      const produtos = await this.fornecedorService.listarProdutosFornecedor(options);

      res.json({
        produtos,
        total: produtos.length
      });
    } catch (error) {
      this.logger.error(`Erro ao listar produtos do fornecedor ${req.params.id}:`, error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao listar produtos'
      });
    }
  }

  /**
   * POST /api/fornecedores/:id/produtos
   * Adiciona produto ao fornecedor
   */
  async adicionarProdutoFornecedor(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { produtoId, precoCusto, prazoEntrega, ativo }: Omit<CreateProdutoFornecedorData, 'fornecedorId'> = req.body;

      if (!produtoId || !precoCusto || prazoEntrega === undefined) {
        res.status(400).json({
          error: 'Dados obrigatórios',
          message: 'produtoId, precoCusto e prazoEntrega são obrigatórios'
        });
        return;
      }

      const dados: CreateProdutoFornecedorData = {
        produtoId,
        fornecedorId: id,
        precoCusto: Number(precoCusto),
        prazoEntrega: Number(prazoEntrega),
        ativo
      };

      const produtoFornecedor = await this.fornecedorService.adicionarProdutoFornecedor(dados);

      res.status(201).json({
        message: 'Produto adicionado ao fornecedor com sucesso',
        produtoFornecedor
      });
    } catch (error) {
      this.logger.error(`Erro ao adicionar produto ao fornecedor ${req.params.id}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('já cadastrado') || error.message.includes('inválido')) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao adicionar produto'
      });
    }
  }

  /**
   * POST /api/fornecedores/:id/notas-fiscais
   * Registra nota fiscal
   */
  async registrarNotaFiscal(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { numero, serie, chaveAcesso, valorTotal, dataEmissao }: Omit<CreateNotaFiscalData, 'fornecedorId'> = req.body;

      if (!numero || !serie || !valorTotal || !dataEmissao) {
        res.status(400).json({
          error: 'Dados obrigatórios',
          message: 'numero, serie, valorTotal e dataEmissao são obrigatórios'
        });
        return;
      }

      const dados: CreateNotaFiscalData = {
        fornecedorId: id,
        numero: numero.trim(),
        serie: serie.trim(),
        chaveAcesso: chaveAcesso?.trim(),
        valorTotal: Number(valorTotal),
        dataEmissao: new Date(dataEmissao)
      };

      const notaFiscal = await this.fornecedorService.registrarNotaFiscal(dados);

      res.status(201).json({
        message: 'Nota fiscal registrada com sucesso',
        notaFiscal
      });
    } catch (error) {
      this.logger.error(`Erro ao registrar nota fiscal do fornecedor ${req.params.id}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('já cadastrada') || error.message.includes('inválido')) {
          res.status(400).json({
            error: 'Dados inválidos',
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Erro ao registrar nota fiscal'
      });
    }
  }
}
