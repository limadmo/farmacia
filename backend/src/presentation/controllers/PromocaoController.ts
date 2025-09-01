/**
 * Controller de Promoções - Sistema de Farmácia
 * 
 * Gerencia endpoints REST para promoções de produtos farmacêuticos.
 * Inclui validações, tratamento de erros e logs.
 */

import { Request, Response, NextFunction } from 'express';
import { PromocaoService, ListPromocoesParams } from '@/application/services/PromocaoService';
import { ValidationError } from '@/presentation/middleware/errorHandler';
import { logger } from '@/shared/utils/logger';
import { TipoPromocao, CondicaoTermino } from '@/domain/entities/Promocao';
import { AuthenticatedRequest } from '@/presentation/middleware/auth';

export class PromocaoController {
  private promocaoService: PromocaoService;
  private logger = logger;

  constructor() {
    this.promocaoService = new PromocaoService();
  }

  async listarPromocoes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        search,
        produtoId,
        tipo,
        ativo = 'true',
        vigentes = 'false'
      } = req.query;

      const params: ListPromocoesParams = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        search: search as string,
        produtoId: produtoId as string,
        tipo: tipo as TipoPromocao,
        ativo: ativo === 'true',
        vigentes: vigentes === 'true'
      };

      // Remover parâmetros undefined
      Object.keys(params).forEach(key => {
        if (params[key as keyof ListPromocoesParams] === undefined) {
          delete params[key as keyof ListPromocoesParams];
        }
      });

      const resultado = await this.promocaoService.listarPromocoes(params);

      this.logger.info(`📋 Promoções listadas: ${resultado.promocoes.length} promoções (página ${params.page})`);

      res.json(resultado);
    } catch (error) {
      this.logger.error('Erro ao listar promoções:', error);
      next(error);
    }
  }

  async buscarPromocaoPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID da promoção é obrigatório');
      }

      const promocao = await this.promocaoService.buscarPromocaoPorId(id);

      if (!promocao) {
        res.status(404).json({
          error: 'Promoção não encontrada',
          message: 'A promoção solicitada não foi encontrada',
          statusCode: 404
        });
        return;
      }

      this.logger.info(`🔍 Promoção encontrada: ${promocao.nome} (${id})`);

      res.json(promocao);
    } catch (error) {
      this.logger.error(`Erro ao buscar promoção ${req.params.id}:`, error);
      next(error);
    }
  }

  async buscarPromocoesPorProduto(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { produtoId } = req.params;

      if (!produtoId || typeof produtoId !== 'string') {
        throw new ValidationError('ID do produto é obrigatório');
      }

      const promocoes = await this.promocaoService.buscarPromocoesPorProduto(produtoId);

      this.logger.info(`🔍 Promoções encontradas para produto ${produtoId}: ${promocoes.length} promoções`);

      res.json(promocoes);
    } catch (error) {
      this.logger.error(`Erro ao buscar promoções do produto ${req.params.produtoId}:`, error);
      next(error);
    }
  }

  async listarPromocoesVigentes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const promocoes = await this.promocaoService.listarPromocoesVigentes();

      this.logger.info(`📋 Promoções vigentes listadas: ${promocoes.length} promoções`);

      res.json(promocoes);
    } catch (error) {
      this.logger.error('Erro ao listar promoções vigentes:', error);
      next(error);
    }
  }

  async criarPromocao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        nome,
        descricao,
        produtoId,
        tipo,
        valorDesconto,
        porcentagemDesconto,
        condicaoTermino,
        quantidadeMaxima,
        dataInicio,
        dataFim,
        ativo
      } = req.body;

      // Validações básicas
      if (!nome || typeof nome !== 'string') {
        throw new ValidationError('Nome da promoção é obrigatório');
      }

      if (!produtoId || typeof produtoId !== 'string') {
        throw new ValidationError('Produto é obrigatório');
      }

      if (!tipo || !Object.values(TipoPromocao).includes(tipo)) {
        throw new ValidationError('Tipo de promoção é obrigatório e deve ser FIXO ou PORCENTAGEM');
      }

      if (!condicaoTermino || !Object.values(CondicaoTermino).includes(condicaoTermino)) {
        throw new ValidationError('Condição de término é obrigatória');
      }

      if (!dataInicio) {
        throw new ValidationError('Data de início é obrigatória');
      }

      if (!dataFim) {
        throw new ValidationError('Data de fim é obrigatória');
      }

      // Validações específicas por tipo
      if (tipo === TipoPromocao.FIXO) {
        if (valorDesconto === undefined || valorDesconto === null || isNaN(Number(valorDesconto))) {
          throw new ValidationError('Valor de desconto é obrigatório para promoções do tipo FIXO');
        }
        if (Number(valorDesconto) <= 0) {
          throw new ValidationError('Valor de desconto deve ser maior que zero');
        }
      }

      if (tipo === TipoPromocao.PORCENTAGEM) {
        if (porcentagemDesconto === undefined || porcentagemDesconto === null || isNaN(Number(porcentagemDesconto))) {
          throw new ValidationError('Porcentagem de desconto é obrigatória para promoções do tipo PORCENTAGEM');
        }
        if (Number(porcentagemDesconto) <= 0 || Number(porcentagemDesconto) > 100) {
          throw new ValidationError('Porcentagem de desconto deve estar entre 0 e 100');
        }
      }

      // Validação de quantidade máxima para condição específica
      if (condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA) {
        if (quantidadeMaxima === undefined || quantidadeMaxima === null || isNaN(Number(quantidadeMaxima))) {
          throw new ValidationError('Quantidade máxima é obrigatória para condição QUANTIDADE_LIMITADA');
        }
        if (Number(quantidadeMaxima) <= 0) {
          throw new ValidationError('Quantidade máxima deve ser maior que zero');
        }
      }

      const dadosPromocao = {
        nome: nome.trim(),
        descricao: descricao?.trim(),
        produtoId: produtoId.trim(),
        tipo,
        valorDesconto: tipo === TipoPromocao.FIXO ? Number(valorDesconto) : undefined,
        porcentagemDesconto: tipo === TipoPromocao.PORCENTAGEM ? Number(porcentagemDesconto) : undefined,
        condicaoTermino,
        quantidadeMaxima: condicaoTermino === CondicaoTermino.QUANTIDADE_LIMITADA ? Number(quantidadeMaxima) : undefined,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        ativo: ativo !== undefined ? Boolean(ativo) : true
      };

      const novaPromocao = await this.promocaoService.criarPromocao(dadosPromocao);

      this.logger.info(`✅ Promoção criada: ${novaPromocao.nome} (${novaPromocao.id})`);

      res.status(201).json({
        message: 'Promoção criada com sucesso',
        promocao: novaPromocao
      });
    } catch (error) {
      this.logger.error('Erro ao criar promoção:', error);
      next(error);
    }
  }

  async atualizarPromocao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const {
        nome,
        descricao,
        tipo,
        valorDesconto,
        porcentagemDesconto,
        condicaoTermino,
        quantidadeMaxima,
        dataInicio,
        dataFim,
        ativo
      } = req.body;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID da promoção é obrigatório');
      }

      // Construir dados de atualização apenas com campos fornecidos
      const dadosAtualizacao: any = {};

      if (nome !== undefined) dadosAtualizacao.nome = nome.trim();
      if (descricao !== undefined) dadosAtualizacao.descricao = descricao?.trim();
      if (tipo !== undefined) {
        if (!Object.values(TipoPromocao).includes(tipo)) {
          throw new ValidationError('Tipo de promoção deve ser FIXO ou PORCENTAGEM');
        }
        dadosAtualizacao.tipo = tipo;
      }
      if (valorDesconto !== undefined) dadosAtualizacao.valorDesconto = valorDesconto ? Number(valorDesconto) : undefined;
      if (porcentagemDesconto !== undefined) dadosAtualizacao.porcentagemDesconto = porcentagemDesconto ? Number(porcentagemDesconto) : undefined;
      if (condicaoTermino !== undefined) {
        if (!Object.values(CondicaoTermino).includes(condicaoTermino)) {
          throw new ValidationError('Condição de término inválida');
        }
        dadosAtualizacao.condicaoTermino = condicaoTermino;
      }
      if (quantidadeMaxima !== undefined) dadosAtualizacao.quantidadeMaxima = quantidadeMaxima ? Number(quantidadeMaxima) : undefined;
      if (dataInicio !== undefined) dadosAtualizacao.dataInicio = dataInicio ? new Date(dataInicio) : undefined;
      if (dataFim !== undefined) dadosAtualizacao.dataFim = dataFim ? new Date(dataFim) : undefined;
      if (ativo !== undefined) dadosAtualizacao.ativo = Boolean(ativo);

      const promocaoAtualizada = await this.promocaoService.atualizarPromocao(id, dadosAtualizacao);

      this.logger.info(`📝 Promoção atualizada: ${promocaoAtualizada.nome} (${id})`);

      res.json({
        message: 'Promoção atualizada com sucesso',
        promocao: promocaoAtualizada
      });
    } catch (error) {
      this.logger.error(`Erro ao atualizar promoção ${req.params.id}:`, error);
      next(error);
    }
  }

  async removerPromocao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID da promoção é obrigatório');
      }

      await this.promocaoService.removerPromocao(id);

      this.logger.info(`🗑️ Promoção removida: ${id}`);

      res.json({
        message: 'Promoção removida com sucesso'
      });
    } catch (error) {
      this.logger.error(`Erro ao remover promoção ${req.params.id}:`, error);
      next(error);
    }
  }

  async incrementarQuantidadeVendida(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { quantidade = 1 } = req.body;

      if (!id || typeof id !== 'string') {
        throw new ValidationError('ID da promoção é obrigatório');
      }

      if (isNaN(Number(quantidade)) || Number(quantidade) <= 0) {
        throw new ValidationError('Quantidade deve ser um número maior que zero');
      }

      const promocaoAtualizada = await this.promocaoService.incrementarQuantidadeVendida(
        id,
        Number(quantidade)
      );

      this.logger.info(`📈 Quantidade vendida incrementada para promoção ${id}: +${quantidade}`);

      res.json({
        message: 'Quantidade vendida atualizada com sucesso',
        promocao: promocaoAtualizada
      });
    } catch (error) {
      this.logger.error(`Erro ao incrementar quantidade vendida da promoção ${req.params.id}:`, error);
      next(error);
    }
  }
}