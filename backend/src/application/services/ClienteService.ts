import { DatabaseConnection } from '@/infrastructure/database/connection';
import { BusinessError, ValidationError, NotFoundError } from '@/presentation/middleware/errorHandler';
import { logger } from '@/shared/utils/logger';
import { 
  validarDocumento, 
  limparDocumento, 
  detectarTipoDocumento,
  formatarDocumento 
} from '@/shared/utils/documentValidation';
import {
  Cliente,
  CriarClienteData,
  AtualizarClienteData,
  MovimentarCreditoData,
  TipoDocumento,
  TipoMovimentacaoCredito,
  HistoricoCredito,
} from '@/domain/entities/Cliente';

export interface ListClientesParams {
  page?: number;
  limit?: number;
  search?: string;
  ativo?: boolean;
  creditoHabilitado?: boolean;
  tipoDocumento?: TipoDocumento;
}

export interface ClienteListResponse {
  clientes: ClienteResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ClienteResponse {
  id: string;
  nome: string;
  documento?: string;
  tipoDocumento?: string;
  documentoFormatado?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  limiteCredito: number;
  creditoDisponivel: number;
  creditoHabilitado: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface HistoricoCreditoResponse {
  id: string;
  tipo: string;
  valor: number;
  descricao?: string;
  criadoEm: string;
  saldoAnterior: number;
  saldoPosterior: number;
}

export class ClienteService {
  /**
   * Lista clientes com filtros e paginação
   */
  async listarClientes(params: ListClientesParams = {}): Promise<ClienteListResponse> {
    const prisma = DatabaseConnection.getClient();

    try {
      const {
        page = 1,
        limit = 20,
        search,
        ativo,
        creditoHabilitado,
        tipoDocumento
      } = params;

      const skip = (page - 1) * limit;
      const where: any = {};

      // Filtro de busca por nome, documento ou email
      if (search) {
        where.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { documento: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { telefone: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Filtros específicos
      if (ativo !== undefined) {
        where.ativo = ativo;
      }

      if (creditoHabilitado !== undefined) {
        where.creditoHabilitado = creditoHabilitado;
      }

      if (tipoDocumento) {
        where.tipoDocumento = tipoDocumento;
      }

      const [clientes, total] = await Promise.all([
        prisma.cliente.findMany({
          where,
          skip,
          take: limit,
          orderBy: { nome: 'asc' }
        }),
        prisma.cliente.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        clientes: clientes.map(cliente => this.mapClienteToResponse(cliente)),
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      logger.error('Erro ao listar clientes com paginação:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  async listarTodos(): Promise<ClienteResponse[]> {
    const prisma = DatabaseConnection.getClient();

    try {
      const clientes = await prisma.cliente.findMany({
        orderBy: { nome: 'asc' },
      });

      return clientes.map(cliente => this.mapClienteToResponse(cliente));
    } catch (error: any) {
      logger.error('Erro ao listar clientes:', error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  async obterPorId(id: string): Promise<ClienteResponse | null> {
    const prisma = DatabaseConnection.getClient();

    try {
      const cliente = await prisma.cliente.findUnique({
        where: { id },
        include: {
          historicoCredito: {
            orderBy: { criadoEm: 'desc' },
            take: 10, // Últimas 10 movimentações
          },
        },
      });

      if (!cliente) {
        return null;
      }

      return this.mapClienteToResponse(cliente);
    } catch (error: any) {
      logger.error(`Erro ao obter cliente ${id}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  async buscarPorDocumento(documento: string): Promise<ClienteResponse | null> {
    if (!documento) {
      throw new ValidationError('Documento é obrigatório para busca');
    }

    const documentoLimpo = limparDocumento(documento);
    const prisma = DatabaseConnection.getClient();

    try {
      const cliente = await prisma.cliente.findFirst({
        where: { documento: documentoLimpo },
      });

      if (!cliente) {
        return null;
      }

      return this.mapClienteToResponse(cliente);
    } catch (error: any) {
      logger.error(`Erro ao buscar cliente por documento ${documento}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  async buscarPorTermo(termo: string): Promise<ClienteResponse[]> {
    if (!termo || termo.trim().length < 2) {
      throw new ValidationError('Termo de busca deve ter pelo menos 2 caracteres');
    }

    const termoLimpo = termo.trim();
    const prisma = DatabaseConnection.getClient();

    // Limpar documento removendo caracteres especiais
    const documentoLimpo = limparDocumento(termoLimpo);
    
    // Verificar se o termo contém letras e números (possível passaporte)
    const contemLetrasENumeros = /[a-zA-Z]/.test(termoLimpo) && /[0-9]/.test(termoLimpo);
    const hasLetters = /[a-zA-Z]/.test(termoLimpo);
    
    let whereCondition: any;
    
    if (contemLetrasENumeros && termoLimpo.length >= 3) {
      // Buscar por passaporte (contém letras E números)
      whereCondition = {
        ativo: true,
        documento: {
          contains: termoLimpo,
          mode: 'insensitive' as const,
        },
        tipoDocumento: 'PASSAPORTE',
      };
    } else if (!hasLetters && documentoLimpo.length >= 3) {
      // Buscar estritamente por documento (CPF/CNPJ)
      // Suporte a documentos armazenados com ou sem formatação
      const buildCpfPrefix = (digits: string) => {
        const s = digits.slice(0, Math.min(11, digits.length));
        let out = '';
        for (let i = 0; i < s.length; i++) {
          out += s[i];
          if (i === 2 || i === 5) out += '.';
          if (i === 8) out += '-';
        }
        return out;
      };

      const buildCnpjPrefix = (digits: string) => {
        const s = digits.slice(0, Math.min(14, digits.length));
        let out = '';
        for (let i = 0; i < s.length; i++) {
          out += s[i];
          if (i === 1 || i === 4) out += '.';
          if (i === 7) out += '/';
          if (i === 11) out += '-';
        }
        return out;
      };

      const orConds: any[] = [
        { documento: { contains: documentoLimpo } },
      ];

      // Incluir termo digitado se contiver pontuação
      if (termoLimpo !== documentoLimpo) {
        orConds.push({ documento: { contains: termoLimpo } });
      }

      // Incluir padrões parcialmente formatados para corresponder a documentos com máscara
      const cpfPrefix = buildCpfPrefix(documentoLimpo);
      const cnpjPrefix = buildCnpjPrefix(documentoLimpo);
      orConds.push({ documento: { contains: cpfPrefix } });
      orConds.push({ documento: { contains: cnpjPrefix } });

      whereCondition = {
        ativo: true,
        OR: orConds,
        tipoDocumento: { in: ['CPF', 'CNPJ'] },
      };
    } else {
      // Buscar apenas por nome (sem mistura com documento)
      whereCondition = {
        ativo: true,
        nome: {
          contains: termoLimpo,
          mode: 'insensitive' as const,
        },
      };
    }
    
    try {
      const clientes = await prisma.cliente.findMany({
        where: whereCondition,
        orderBy: [
          { nome: 'asc' },
        ],
        take: 20, // Limitar a 20 resultados
      });

      return clientes.map(cliente => this.mapClienteToResponse(cliente));
    } catch (error: any) {
      logger.error(`Erro ao buscar cliente por termo ${termo}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  async criar(dados: CriarClienteData): Promise<ClienteResponse> {
    // Validações
    this.validarDadosCliente(dados);

    const prisma = DatabaseConnection.getClient();

    try {
      // Verificar se documento já existe (se fornecido)
      if (dados.documento) {
        const documentoLimpo = limparDocumento(dados.documento);
        const clienteExistente = await prisma.cliente.findFirst({
          where: { documento: documentoLimpo },
        });

        if (clienteExistente) {
          throw new BusinessError('Cliente com este documento já existe', 409);
        }
      }

      // Preparar dados para criação
      const dadosCliente: any = {
        nome: dados.nome.trim(),
        email: dados.email?.trim() || null,
        telefone: dados.telefone?.trim() || null,
        endereco: dados.endereco?.trim() || null,
        limiteCredito: dados.limiteCredito || 0,
        creditoDisponivel: dados.limiteCredito || 0,
        creditoHabilitado: dados.creditoHabilitado || false,
        ativo: true,
      };

      // Adicionar documento se fornecido
      if (dados.documento) {
        dadosCliente.documento = limparDocumento(dados.documento);
        dadosCliente.tipoDocumento = dados.tipoDocumento || detectarTipoDocumento(dados.documento);
      }

      const cliente = await prisma.cliente.create({
        data: dadosCliente,
      });

      logger.info(`✅ Cliente criado: ${cliente.nome} (ID: ${cliente.id})`);

      return this.mapClienteToResponse(cliente);
    } catch (error: any) {
      logger.error(`Erro ao criar cliente:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error instanceof BusinessError) {
        throw error;
      }
      // Repassar outros erros
      throw error;
    }
  }

  async criarClienteAutomatico(dados: {
    nome: string;
    documento: string;
    telefone?: string;
    endereco?: string;
  }): Promise<ClienteResponse | null> {
    const prisma = DatabaseConnection.getClient();

    try {
      const documentoLimpo = limparDocumento(dados.documento);
      
      // Verificar se já existe cliente com este documento
      const clienteExistente = await prisma.cliente.findFirst({
        where: { documento: documentoLimpo },
      });

      if (clienteExistente) {
        logger.info(`📋 Cliente já existe com CPF: ${documentoLimpo} (ID: ${clienteExistente.id})`);
        
        // Atualizar dados se necessário (telefone ou endereço não cadastrados)
        const dadosAtualizacao: any = {};
        let precisaAtualizar = false;

        if (!clienteExistente.telefone && dados.telefone) {
          dadosAtualizacao.telefone = dados.telefone.trim();
          precisaAtualizar = true;
        }
        
        if (!clienteExistente.endereco && dados.endereco) {
          dadosAtualizacao.endereco = dados.endereco.trim();
          precisaAtualizar = true;
        }

        if (precisaAtualizar) {
          await prisma.cliente.update({
            where: { id: clienteExistente.id },
            data: dadosAtualizacao,
          });
          logger.info(`✅ Cliente atualizado automaticamente: ${clienteExistente.nome} (ID: ${clienteExistente.id})`);
        }

        return this.mapClienteToResponse({
          ...clienteExistente,
          ...dadosAtualizacao
        });
      }

      // Criar novo cliente
      const novoClienteDados = {
        nome: dados.nome.trim(),
        documento: documentoLimpo,
        tipoDocumento: detectarTipoDocumento(dados.documento),
        telefone: dados.telefone?.trim() || null,
        endereco: dados.endereco?.trim() || null,
        limiteCredito: 0,
        creditoDisponivel: 0,
        creditoHabilitado: false,
        ativo: true,
      };

      const novoCliente = await prisma.cliente.create({
        data: novoClienteDados,
      });

      logger.info(`✅ Cliente criado automaticamente: ${novoCliente.nome} (ID: ${novoCliente.id})`);

      return this.mapClienteToResponse(novoCliente);
    } catch (error: any) {
      logger.error(`Erro ao criar cliente automaticamente:`, error);
      // Não propagar erro para não quebrar o fluxo de venda
      return null;
    }
  }

  async atualizar(id: string, dados: AtualizarClienteData): Promise<ClienteResponse> {
    const prisma = DatabaseConnection.getClient();

    try {
      // Verificar se cliente existe
      const clienteExistente = await prisma.cliente.findUnique({
        where: { id },
      });

      if (!clienteExistente) {
        throw new NotFoundError('Cliente não encontrado');
      }

      // Validar novos dados
      if (dados.documento !== undefined || dados.tipoDocumento !== undefined) {
        this.validarDocumentoCliente(dados.documento, dados.tipoDocumento);
      }

      // Verificar se novo documento já existe (se fornecido)
      if (dados.documento && dados.documento !== clienteExistente.documento) {
        const documentoLimpo = limparDocumento(dados.documento);
        const outroCliente = await prisma.cliente.findFirst({
          where: { 
            documento: documentoLimpo,
            id: { not: id },
          },
        });

        if (outroCliente) {
          throw new BusinessError('Outro cliente já possui este documento', 409);
        }
      }

      // Preparar dados para atualização
      const dadosAtualizacao: any = {};

      if (dados.nome !== undefined) dadosAtualizacao.nome = dados.nome.trim();
      if (dados.email !== undefined) dadosAtualizacao.email = dados.email?.trim() || null;
      if (dados.telefone !== undefined) dadosAtualizacao.telefone = dados.telefone?.trim() || null;
      if (dados.endereco !== undefined) dadosAtualizacao.endereco = dados.endereco?.trim() || null;
      if (dados.ativo !== undefined) dadosAtualizacao.ativo = dados.ativo;

      // Atualizar documento se fornecido
      if (dados.documento !== undefined) {
        if (dados.documento) {
          dadosAtualizacao.documento = limparDocumento(dados.documento);
          dadosAtualizacao.tipoDocumento = dados.tipoDocumento || detectarTipoDocumento(dados.documento);
        } else {
          dadosAtualizacao.documento = null;
          dadosAtualizacao.tipoDocumento = null;
        }
      }

      // Atualizar crédito se fornecido
      if (dados.limiteCredito !== undefined) {
        const diferenca = dados.limiteCredito - Number(clienteExistente.limiteCredito);
        dadosAtualizacao.limiteCredito = dados.limiteCredito;
        dadosAtualizacao.creditoDisponivel = Number(clienteExistente.creditoDisponivel) + diferenca;
      }

      if (dados.creditoHabilitado !== undefined) {
        dadosAtualizacao.creditoHabilitado = dados.creditoHabilitado;
      }

      const cliente = await prisma.cliente.update({
        where: { id },
        data: dadosAtualizacao,
      });

      logger.info(`✅ Cliente atualizado: ${cliente.nome} (ID: ${cliente.id})`);

      return this.mapClienteToResponse(cliente);
    } catch (error: any) {
      logger.error(`Erro ao atualizar cliente ${id}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error;
      }
      // Repassar outros erros
      throw error;
    }
  }

  async excluir(id: string): Promise<void> {
    const prisma = DatabaseConnection.getClient();

    try {
      // Verificar se cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { id },
        include: {
          vendas: { take: 1 },
        },
      });

      if (!cliente) {
        throw new NotFoundError('Cliente não encontrado');
      }

      // Verificar se cliente tem vendas (soft delete apenas)
      if (cliente.vendas.length > 0) {
        await prisma.cliente.update({
          where: { id },
          data: { ativo: false },
        });

        logger.info(`✅ Cliente desativado: ${cliente.nome} (ID: ${cliente.id})`);
      } else {
        // Excluir completamente se não tem vendas
        await prisma.cliente.delete({
          where: { id },
        });

        logger.info(`✅ Cliente excluído: ${cliente.nome} (ID: ${cliente.id})`);
      }
    } catch (error: any) {
      logger.error(`Erro ao excluir cliente ${id}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error instanceof NotFoundError) {
        throw error;
      }
      // Repassar outros erros
      throw error;
    }
  }

  async movimentarCredito(dados: MovimentarCreditoData): Promise<HistoricoCreditoResponse> {
    const { clienteId, tipo, valor, descricao, usuarioId } = dados;

    if (valor <= 0) {
      throw new ValidationError('Valor deve ser maior que zero');
    }

    const prisma = DatabaseConnection.getClient();

    try {
      // Usar transação para garantir consistência
      const resultado = await prisma.$transaction(async (tx) => {
        // Buscar cliente
        const cliente = await tx.cliente.findUnique({
          where: { id: clienteId },
        });

        if (!cliente) {
          throw new NotFoundError('Cliente não encontrado');
        }

        if (!cliente.creditoHabilitado) {
          throw new BusinessError('Crédito não habilitado para este cliente');
        }

        const saldoAnterior = Number(cliente.creditoDisponivel);
        let novoSaldo = saldoAnterior;

        // Calcular novo saldo baseado no tipo de movimentação
        switch (tipo) {
          case TipoMovimentacaoCredito.CREDITO:
            novoSaldo = saldoAnterior + valor;
            if (novoSaldo > Number(cliente.limiteCredito)) {
              throw new BusinessError('Valor excede o limite de crédito do cliente');
            }
            break;

          case TipoMovimentacaoCredito.DEBITO:
            novoSaldo = saldoAnterior - valor;
            if (novoSaldo < 0) {
              throw new BusinessError('Saldo insuficiente');
            }
            break;

          case TipoMovimentacaoCredito.PAGAMENTO:
            novoSaldo = saldoAnterior + valor;
            if (novoSaldo > Number(cliente.limiteCredito)) {
              novoSaldo = Number(cliente.limiteCredito); // Limitar ao máximo
            }
            break;

          default:
            throw new ValidationError('Tipo de movimentação inválido');
        }

        // Atualizar saldo do cliente
        await tx.cliente.update({
          where: { id: clienteId },
          data: { creditoDisponivel: novoSaldo },
        });

        // Registrar movimentação no histórico
        const historico = await tx.historicoCredito.create({
          data: {
            clienteId,
            tipo,
            valor,
            descricao,
            usuarioId,
          },
        });

        return {
          historico,
          saldoAnterior,
          saldoPosterior: novoSaldo,
        };
      });

      logger.info(`✅ Crédito movimentado: Cliente ${clienteId}, ${tipo} R$ ${valor}`);

      return {
        id: resultado.historico.id,
        tipo: resultado.historico.tipo,
        valor: Number(resultado.historico.valor),
        descricao: resultado.historico.descricao || undefined,
        criadoEm: resultado.historico.criadoEm.toISOString(),
        saldoAnterior: resultado.saldoAnterior,
        saldoPosterior: resultado.saldoPosterior,
      };
    } catch (error: any) {
      logger.error(`Erro ao movimentar crédito do cliente ${clienteId}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      } else if (error.message && error.message.includes('Falha na transação')) {
        throw new Error('transaction');
      } else if (error instanceof BusinessError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      // Repassar outros erros
      throw error;
    }
  }

  async obterHistoricoCredito(clienteId: string, limit = 50): Promise<HistoricoCreditoResponse[]> {
    const prisma = DatabaseConnection.getClient();

    try {
      const historico = await prisma.historicoCredito.findMany({
        where: { clienteId },
        orderBy: { criadoEm: 'desc' },
        take: limit,
      });

      return historico.map(item => ({
        id: item.id,
        tipo: item.tipo,
        valor: Number(item.valor),
        descricao: item.descricao || undefined,
        criadoEm: item.criadoEm.toISOString(),
        saldoAnterior: 0, // TODO: Calcular baseado no histórico
        saldoPosterior: 0, // TODO: Calcular baseado no histórico
      }));
    } catch (error: any) {
      logger.error(`Erro ao obter histórico de crédito do cliente ${clienteId}:`, error);
      if (error.message && error.message.includes('Conexão perdida')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  private validarDadosCliente(dados: CriarClienteData | AtualizarClienteData): void {
    if ('nome' in dados && (!dados.nome || dados.nome.trim().length < 2)) {
      throw new ValidationError('Nome deve ter pelo menos 2 caracteres');
    }

    this.validarDocumentoCliente(dados.documento, dados.tipoDocumento);

    if (dados.email && !this.validarEmail(dados.email)) {
      throw new ValidationError('Email inválido');
    }

    if ('limiteCredito' in dados && dados.limiteCredito !== undefined && dados.limiteCredito < 0) {
      throw new ValidationError('Limite de crédito não pode ser negativo');
    }
  }

  private validarDocumentoCliente(documento?: string, tipoDocumento?: TipoDocumento): void {
    if (documento) {
      logger.info(`🔍 Validando documento: "${documento}" (tipo: ${tipoDocumento})`);
      
      const documentoLimpo = limparDocumento(documento);
      logger.info(`🧹 Documento limpo: "${documentoLimpo}"`);
      
      const tipoDetectado = detectarTipoDocumento(documento);
      logger.info(`🔍 Tipo detectado: ${tipoDetectado}`);
      
      const isValid = validarDocumento(documento);
      logger.info(`✅ Documento válido: ${isValid}`);
      
      if (!isValid) {
        throw new ValidationError('Documento inválido');
      }

      if (tipoDocumento && tipoDocumento !== tipoDetectado) {
        throw new ValidationError('Tipo de documento não confere com o documento fornecido');
      }
    }
  }

  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private mapClienteToResponse(cliente: any): ClienteResponse {
    return {
      id: cliente.id,
      nome: cliente.nome,
      documento: cliente.documento,
      tipoDocumento: cliente.tipoDocumento,
      documentoFormatado: cliente.documento ? formatarDocumento(cliente.documento) : undefined,
      email: cliente.email,
      telefone: cliente.telefone,
      endereco: cliente.endereco,
      limiteCredito: Number(cliente.limiteCredito),
      creditoDisponivel: Number(cliente.creditoDisponivel),
      creditoHabilitado: cliente.creditoHabilitado,
      ativo: cliente.ativo,
      criadoEm: cliente.criadoEm.toISOString(),
      atualizadoEm: cliente.atualizadoEm.toISOString(),
    };
  }
}
