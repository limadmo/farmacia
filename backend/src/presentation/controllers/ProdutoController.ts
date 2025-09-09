/**
 * Controller de Produtos - Sistema de Farmácia
 * 
 * Gerencia endpoints REST para produtos farmacêuticos.
 * Inclui validações, tratamento de erros e logs.
 */

import { Request, Response, NextFunction } from 'express';
import { ProdutoService, ListProdutosParams } from '@/application/services/ProdutoService';
import { ValidationError } from '@/presentation/middleware/errorHandler';
import { logger } from '@/shared/utils/logger';
import { ClassificacaoAnvisa } from '@/domain/entities/Produto';
import { AuthenticatedRequest } from '@/presentation/middleware/auth';
import { DatabaseConnection } from '@/infrastructure/database/connection';

export class ProdutoController {
  private produtoService: ProdutoService;
  private logger = logger;

  constructor() {
    this.produtoService = new ProdutoService();
  }

  async listarProdutos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        categoriaId,
        classificacaoAnvisa,
        exigeReceita,
        ativo = 'true',
        estoqueMinimo = 'false'
      } = req.query;

      const params: ListProdutosParams = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        search: search as string,
        categoriaId: categoriaId as string,
        classificacaoAnvisa: classificacaoAnvisa as ClassificacaoAnvisa,
        exigeReceita: exigeReceita === 'true' ? true : exigeReceita === 'false' ? false : undefined,
        ativo: ativo === 'true',
        estoqueMinimo: estoqueMinimo === 'true'
      };

      // Remover parâmetros undefined
      Object.keys(params).forEach(key => {
        if (params[key as keyof ListProdutosParams] === undefined) {
          delete params[key as keyof ListProdutosParams];
        }
      });

      const resultado = await this.produtoService.listarProdutos(params);

      this.logger.info(`📋 Produtos listados: ${resultado.produtos.length} produtos (página ${params.page})`);

      res.json(resultado);
    } catch (error) {
      this.logger.error('Erro ao listar produtos:', error);
      next(error);
    }
  }

  async buscarProdutoPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID do produto é obrigatório');
      }

      const produto = await this.produtoService.buscarProdutoPorId(id);

      if (!produto) {
        res.status(404).json({
          error: 'Produto não encontrado',
          message: 'O produto solicitado não foi encontrado',
          statusCode: 404
        });
        return;
      }

      this.logger.info(`🔍 Produto encontrado: ${produto.nome} (${id})`);

      res.json(produto);
    } catch (error) {
      this.logger.error(`Erro ao buscar produto ${req.params.id}:`, error);
      next(error);
    }
  }

  async buscarProdutoPorCodigoBarras(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { codigoBarras } = req.params;

      if (!codigoBarras || typeof codigoBarras !== 'string') {
        throw new ValidationError('Código de barras é obrigatório');
      }

      const produto = await this.produtoService.buscarProdutoPorCodigoBarras(codigoBarras);

      if (!produto) {
        res.status(404).json({
          error: 'Produto não encontrado',
          message: 'Produto não encontrado com este código de barras',
          statusCode: 404
        });
        return;
      }

      this.logger.info(`📊 Produto encontrado por código: ${produto.nome} (${codigoBarras})`);

      res.json(produto);
    } catch (error) {
      this.logger.error(`Erro ao buscar produto por código ${req.params.codigoBarras}:`, error);
      next(error);
    }
  }

  async buscarProdutoPorTermo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { termo } = req.params;

      if (!termo || typeof termo !== 'string') {
        throw new ValidationError('Termo de busca é obrigatório');
      }

      const produto = await this.produtoService.buscarProdutoPorTermo(termo);

      if (!produto) {
        res.status(404).json({
          error: 'Produto não encontrado',
          message: 'Produto não encontrado com este termo de busca',
          statusCode: 404
        });
        return;
      }

      this.logger.info(`🔍 Produto encontrado por termo: ${produto.nome} (${termo})`);

      res.json(produto);
    } catch (error) {
      this.logger.error(`Erro ao buscar produto por termo ${req.params.termo}:`, error);
      next(error);
    }
  }

  async criarProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        nome,
        descricao,
        codigoBarras,
        classificacaoAnvisa,
        categoriaAnvisa,
        registroAnvisa,
        exigeReceita,
        tipoReceita,
        classeControlada,
        loteObrigatorio,
        principioAtivo,
        laboratorio,
        peso,
        volume,
        dosagem,
        formaFarmaceutica,
        dataVencimento,
        lote,
        precoVenda,
        precoCusto,
        estoque,
        estoqueMinimo,
        estoqueMaximo,
        ativo,
        categoriaId
      } = req.body;

      // Validações básicas
      if (!nome || typeof nome !== 'string') {
        throw new ValidationError('Nome do produto é obrigatório');
      }

      if (!classificacaoAnvisa) {
        throw new ValidationError('Classificação ANVISA é obrigatória');
      }

      if (precoVenda === undefined || precoVenda === null || isNaN(Number(precoVenda))) {
        throw new ValidationError('Preço de venda é obrigatório e deve ser um número');
      }

      if (estoque === undefined || estoque === null || isNaN(Number(estoque))) {
        throw new ValidationError('Quantidade em estoque é obrigatória e deve ser um número');
      }

      if (estoqueMinimo === undefined || estoqueMinimo === null || isNaN(Number(estoqueMinimo))) {
        throw new ValidationError('Estoque mínimo é obrigatório e deve ser um número');
      }

      if (!categoriaId || typeof categoriaId !== 'string') {
        throw new ValidationError('Categoria é obrigatória');
      }

      const dadosProduto = {
        nome: nome.trim(),
        descricao: descricao?.trim(),
        codigoBarras: codigoBarras?.trim(),
        classificacaoAnvisa,
        categoriaAnvisa: categoriaAnvisa?.trim(),
        registroAnvisa: registroAnvisa?.trim(),
        exigeReceita: Boolean(exigeReceita),
        tipoReceita,
        classeControlada,
        loteObrigatorio: Boolean(loteObrigatorio),
        principioAtivo: principioAtivo?.trim(),
        laboratorio: laboratorio?.trim(),
        peso: peso ? Number(peso) : undefined,
        volume: volume ? Number(volume) : undefined,
        dosagem: dosagem?.trim(),
        formaFarmaceutica: formaFarmaceutica?.trim(),
        dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined,
        lote: lote?.trim(),
        precoVenda: Number(precoVenda),
        precoCusto: precoCusto ? Number(precoCusto) : undefined,
        estoque: Number(estoque),
        estoqueMinimo: Number(estoqueMinimo),
        estoqueMaximo: estoqueMaximo ? Number(estoqueMaximo) : undefined,
        ativo: ativo !== undefined ? Boolean(ativo) : true,
        categoriaId: categoriaId.trim()
      };

      const novoProduto = await this.produtoService.criarProduto(dadosProduto);

      this.logger.info(`✅ Produto criado: ${novoProduto.nome} (${novoProduto.id})`);

      res.status(201).json({
        message: 'Produto criado com sucesso',
        produto: novoProduto
      });
    } catch (error) {
      this.logger.error('Erro ao criar produto:', error);
      next(error);
    }
  }

  async atualizarProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const {
        nome,
        descricao,
        codigoBarras,
        classificacaoAnvisa,
        categoriaAnvisa,
        registroAnvisa,
        exigeReceita,
        tipoReceita,
        classeControlada,
        loteObrigatorio,
        principioAtivo,
        laboratorio,
        peso,
        volume,
        dosagem,
        formaFarmaceutica,
        dataVencimento,
        lote,
        precoVenda,
        precoCusto,
        estoque,
        estoqueMinimo,
        estoqueMaximo,
        ativo,
        categoriaId
      } = req.body;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID do produto é obrigatório');
      }

      // Debug: log do que foi recebido
      this.logger.info(`📝 Dados recebidos para atualização:`, req.body);
      this.logger.info(`📝 loteObrigatorio recebido: ${req.body.loteObrigatorio} (tipo: ${typeof req.body.loteObrigatorio})`);

      // Construir dados de atualização apenas com campos fornecidos
      const dadosAtualizacao: any = {};

      if (nome !== undefined) dadosAtualizacao.nome = nome.trim();
      if (descricao !== undefined) dadosAtualizacao.descricao = descricao?.trim();
      if (codigoBarras !== undefined) dadosAtualizacao.codigoBarras = codigoBarras?.trim();
      if (classificacaoAnvisa !== undefined) dadosAtualizacao.classificacaoAnvisa = classificacaoAnvisa;
      if (categoriaAnvisa !== undefined) dadosAtualizacao.categoriaAnvisa = categoriaAnvisa?.trim();
      if (registroAnvisa !== undefined) dadosAtualizacao.registroAnvisa = registroAnvisa?.trim();
      if (exigeReceita !== undefined) dadosAtualizacao.exigeReceita = Boolean(exigeReceita);
      if (tipoReceita !== undefined) dadosAtualizacao.tipoReceita = tipoReceita;
      if (classeControlada !== undefined) dadosAtualizacao.classeControlada = classeControlada;
      if (loteObrigatorio !== undefined) dadosAtualizacao.loteObrigatorio = Boolean(loteObrigatorio);
      if (principioAtivo !== undefined) dadosAtualizacao.principioAtivo = principioAtivo?.trim();
      if (laboratorio !== undefined) dadosAtualizacao.laboratorio = laboratorio?.trim();
      if (peso !== undefined) dadosAtualizacao.peso = peso ? Number(peso) : undefined;
      if (volume !== undefined) dadosAtualizacao.volume = volume ? Number(volume) : undefined;
      if (dosagem !== undefined) dadosAtualizacao.dosagem = dosagem?.trim();
      if (formaFarmaceutica !== undefined) dadosAtualizacao.formaFarmaceutica = formaFarmaceutica?.trim();
      if (dataVencimento !== undefined) dadosAtualizacao.dataVencimento = dataVencimento ? new Date(dataVencimento) : undefined;
      if (lote !== undefined) dadosAtualizacao.lote = lote?.trim();
      if (precoVenda !== undefined) dadosAtualizacao.precoVenda = Number(precoVenda);
      if (precoCusto !== undefined) dadosAtualizacao.precoCusto = precoCusto ? Number(precoCusto) : undefined;
      if (estoque !== undefined) dadosAtualizacao.estoque = Number(estoque);
      if (estoqueMinimo !== undefined) dadosAtualizacao.estoqueMinimo = Number(estoqueMinimo);
      if (estoqueMaximo !== undefined) dadosAtualizacao.estoqueMaximo = estoqueMaximo ? Number(estoqueMaximo) : undefined;
      if (ativo !== undefined) dadosAtualizacao.ativo = Boolean(ativo);
      if (categoriaId !== undefined) dadosAtualizacao.categoriaId = categoriaId.trim();

      // Debug: log dos dados processados
      this.logger.info(`📦 Dados processados para atualização:`, dadosAtualizacao);
      this.logger.info(`📦 loteObrigatorio processado: ${dadosAtualizacao.loteObrigatorio} (será enviado: ${dadosAtualizacao.loteObrigatorio !== undefined})`);

      const produtoAtualizado = await this.produtoService.atualizarProduto(id, dadosAtualizacao);

      this.logger.info(`📝 Produto atualizado: ${produtoAtualizado.nome} (${id})`);

      res.json({
        message: 'Produto atualizado com sucesso',
        produto: produtoAtualizado
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar produto ${req.params.id}:`, error);
      next(error);
    }
  }

  async removerProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID do produto é obrigatório');
      }

      await this.produtoService.removerProduto(id);

      this.logger.info(`🗑️ Produto removido: (${id})`);

      res.json({
        message: 'Produto removido com sucesso'
      });
    } catch (error) {
      this.logger.error(`Erro ao remover produto ${req.params.id}:`, error);
      next(error);
    }
  }

  async atualizarEstoque(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidade, operacao } = req.body;
      const usuarioId = req.user?.id;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID do produto é obrigatório');
      }

      if (!usuarioId) {
        throw new ValidationError('Usuário não autenticado');
      }

      if (quantidade === undefined || quantidade === null || isNaN(Number(quantidade))) {
        throw new ValidationError('Quantidade é obrigatória e deve ser um número');
      }

      if (!operacao || !['ENTRADA', 'SAIDA'].includes(operacao)) {
        throw new ValidationError('Operação deve ser ENTRADA ou SAIDA');
      }

      const produtoAtualizado = await this.produtoService.atualizarEstoque(
        id, 
        Number(quantidade), 
        operacao as 'ENTRADA' | 'SAIDA',
        usuarioId
      );

      this.logger.info(`📦 Estoque atualizado: ${produtoAtualizado.nome} - ${operacao} ${quantidade}`);

      res.json({
        message: 'Estoque atualizado com sucesso',
        produto: produtoAtualizado
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar estoque do produto ${req.params.id}:`, error);
      next(error);
    }
  }

  async listarProdutosEstoqueBaixo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const produtos = await this.produtoService.listarProdutosEstoqueBaixo();

      this.logger.info(`⚠️ Produtos com estoque baixo: ${produtos.length} produtos`);

      res.json({
        produtos,
        total: produtos.length,
        message: produtos.length === 0 ? 'Nenhum produto com estoque baixo' : `${produtos.length} produtos com estoque baixo`
      });
    } catch (error) {
      this.logger.error('Erro ao listar produtos com estoque baixo:', error);
      next(error);
    }
  }

  async listarCategorias(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const prisma = DatabaseConnection.getClient();
      
      const categorias = await prisma.categoria.findMany({
        where: { ativo: true },
        select: {
          id: true,
          nome: true,
          descricao: true
        },
        orderBy: { nome: 'asc' }
      });

      this.logger.info(`📂 Categorias listadas: ${categorias.length} categorias`);

      res.json({
        categorias,
        total: categorias.length
      });
    } catch (error) {
      this.logger.error('Erro ao listar categorias:', error);
      next(error);
    }
  }
}
