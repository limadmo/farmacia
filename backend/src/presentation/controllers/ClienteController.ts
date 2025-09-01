import { Request, Response, NextFunction } from 'express';
import { ClienteService } from '@/application/services/ClienteService';
import { ValidationError, NotFoundError } from '@/presentation/middleware/errorHandler';
import { TipoDocumento, TipoMovimentacaoCredito } from '@/domain/entities/Cliente';

export class ClienteController {
  private clienteService: ClienteService;

  constructor() {
    this.clienteService = new ClienteService();
  }

  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search } = req.query;
      
      if (search) {
        // Buscar clientes por termo
        const clientes = await this.clienteService.buscarPorTermo(search as string);
        res.json(clientes);
      } else {
        // Listar todos os clientes
        const clientes = await this.clienteService.listarTodos();
        res.json(clientes);
      }
    } catch (error) {
      next(error);
    }
  }

  async obterPorId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ValidationError('ID do cliente é obrigatório');
      }

      const cliente = await this.clienteService.obterPorId(id);
      
      if (!cliente) {
        throw new NotFoundError('Cliente não encontrado');
      }

      res.json(cliente);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorDocumento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { documento } = req.params;
      
      if (!documento) {
        throw new ValidationError('Documento é obrigatório');
      }

      const cliente = await this.clienteService.buscarPorDocumento(documento);
      
      if (!cliente) {
        throw new NotFoundError('Cliente não encontrado');
      }

      res.json(cliente);
    } catch (error) {
      next(error);
    }
  }

  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        nome,
        documento,
        tipoDocumento,
        email,
        telefone,
        endereco,
        limiteCredito,
        creditoHabilitado,
      } = req.body;

      // Validações básicas
      if (!nome || nome.trim().length === 0) {
        throw new ValidationError('Nome é obrigatório');
      }

      // Validar tipo de documento se fornecido
      if (tipoDocumento && !Object.values(TipoDocumento).includes(tipoDocumento)) {
        throw new ValidationError('Tipo de documento inválido');
      }

      const cliente = await this.clienteService.criar({
        nome: nome.trim(),
        documento: documento?.trim(),
        tipoDocumento,
        email: email?.trim(),
        telefone: telefone?.trim(),
        endereco: endereco?.trim(),
        limiteCredito: parseFloat(limiteCredito) || 0,
        creditoHabilitado: Boolean(creditoHabilitado),
      });

      res.status(201).json(cliente);
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const {
        nome,
        documento,
        tipoDocumento,
        email,
        telefone,
        endereco,
        limiteCredito,
        creditoHabilitado,
        ativo,
      } = req.body;

      if (!id) {
        throw new ValidationError('ID do cliente é obrigatório');
      }

      // Validar tipo de documento se fornecido
      if (tipoDocumento && !Object.values(TipoDocumento).includes(tipoDocumento)) {
        throw new ValidationError('Tipo de documento inválido');
      }

      const dadosAtualizacao: any = {};

      if (nome !== undefined) dadosAtualizacao.nome = nome.trim();
      if (documento !== undefined) dadosAtualizacao.documento = documento?.trim() || null;
      if (tipoDocumento !== undefined) dadosAtualizacao.tipoDocumento = tipoDocumento;
      if (email !== undefined) dadosAtualizacao.email = email?.trim() || null;
      if (telefone !== undefined) dadosAtualizacao.telefone = telefone?.trim() || null;
      if (endereco !== undefined) dadosAtualizacao.endereco = endereco?.trim() || null;
      if (limiteCredito !== undefined) dadosAtualizacao.limiteCredito = parseFloat(limiteCredito) || 0;
      if (creditoHabilitado !== undefined) dadosAtualizacao.creditoHabilitado = Boolean(creditoHabilitado);
      if (ativo !== undefined) dadosAtualizacao.ativo = Boolean(ativo);

      const cliente = await this.clienteService.atualizar(id, dadosAtualizacao);

      res.json(cliente);
    } catch (error) {
      next(error);
    }
  }

  async excluir(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ValidationError('ID do cliente é obrigatório');
      }

      await this.clienteService.excluir(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async movimentarCredito(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { tipo, valor, descricao } = req.body;

      if (!id) {
        throw new ValidationError('ID do cliente é obrigatório');
      }

      if (!tipo || !Object.values(TipoMovimentacaoCredito).includes(tipo)) {
        throw new ValidationError('Tipo de movimentação é obrigatório e deve ser CREDITO, DEBITO ou PAGAMENTO');
      }

      if (!valor || isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        throw new ValidationError('Valor deve ser um número positivo');
      }

      const historico = await this.clienteService.movimentarCredito({
        clienteId: id,
        tipo,
        valor: parseFloat(valor),
        descricao: descricao?.trim(),
        usuarioId: req.usuario!.id,
      });

      res.status(201).json(historico);
    } catch (error) {
      next(error);
    }
  }

  async obterHistoricoCredito(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      if (!id) {
        throw new ValidationError('ID do cliente é obrigatório');
      }

      const limitNum = limit ? parseInt(limit as string) : 50;
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
        throw new ValidationError('Limit deve ser um número entre 1 e 500');
      }

      const historico = await this.clienteService.obterHistoricoCredito(id, limitNum);

      res.json(historico);
    } catch (error) {
      next(error);
    }
  }

  async obterTiposDocumento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tipos = [
        { codigo: TipoDocumento.CPF, descricao: 'CPF - Pessoa Física' },
        { codigo: TipoDocumento.CNPJ, descricao: 'CNPJ - Pessoa Jurídica' },
      ];

      res.json(tipos);
    } catch (error) {
      next(error);
    }
  }

  async obterTiposMovimentacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tipos = [
        { codigo: TipoMovimentacaoCredito.CREDITO, descricao: 'Concessão de Crédito' },
        { codigo: TipoMovimentacaoCredito.DEBITO, descricao: 'Utilização de Crédito' },
        { codigo: TipoMovimentacaoCredito.PAGAMENTO, descricao: 'Pagamento de Dívida' },
      ];

      res.json(tipos);
    } catch (error) {
      next(error);
    }
  }
}
