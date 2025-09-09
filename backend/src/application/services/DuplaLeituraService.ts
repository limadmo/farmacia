/**
 * Serviço de Dupla Leitura - Sistema de Farmácia
 * 
 * Gerencia o processo de dupla leitura de código de barras para medicamentos
 * 1ª leitura: Identifica o produto
 * 2ª leitura: Identifica o lote específico
 */

import { PrismaClient } from '@prisma/client';
import { ProdutoService } from './ProdutoService';
import { LoteService } from './LoteService';

export interface DuplaLeituraSession {
  id: string;
  produtoId?: string;
  produto?: any;
  loteId?: string;
  lote?: any;
  etapa: 'PRODUTO' | 'LOTE' | 'COMPLETA';
  criadoEm: Date;
  expiresAt: Date;
}

export interface DuplaLeituraResult {
  success: boolean;
  session: DuplaLeituraSession;
  message: string;
  nextStep?: 'PRODUTO' | 'LOTE' | 'FINALIZAR';
}

export class DuplaLeituraService {
  private sessions: Map<string, DuplaLeituraSession> = new Map();
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutos

  private intervalId: any | null = null;

  constructor(
    private prisma: PrismaClient,
    private produtoService: ProdutoService,
    private loteService: LoteService
  ) {
    // Limpar sessões expiradas a cada minuto, mas não durante testes
    if (process.env.NODE_ENV !== 'test') {
      this.intervalId = setInterval(() => this.limparSessoesExpiradas(), 60000);
    }
  }
  
  /**
   * Limpa o intervalo de limpeza de sessões expiradas
   * Útil para testes e para encerrar o serviço
   */
  limparIntervalo(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Inicia uma nova sessão de dupla leitura
   */
  iniciarSessao(): DuplaLeituraResult {
    const sessionId = this.gerarSessionId();
    const agora = new Date();
    
    const session: DuplaLeituraSession = {
      id: sessionId,
      etapa: 'PRODUTO',
      criadoEm: agora,
      expiresAt: new Date(agora.getTime() + this.SESSION_TIMEOUT)
    };

    this.sessions.set(sessionId, session);

    return {
      success: true,
      session,
      message: 'Sessão iniciada. Escaneie o código de barras do produto.',
      nextStep: 'PRODUTO'
    };
  }

  /**
   * Processa a leitura de um código de barras
   */
  async processarLeitura(sessionId: string, codigoBarras: string): Promise<DuplaLeituraResult> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return {
        success: false,
        session: {} as DuplaLeituraSession,
        message: 'Sessão não encontrada ou expirada. Inicie uma nova sessão.'
      };
    }

    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return {
        success: false,
        session: {} as DuplaLeituraSession,
        message: 'Sessão expirada. Inicie uma nova sessão.'
      };
    }

    try {
      switch (session.etapa) {
        case 'PRODUTO':
          return await this.processarLeituraProduto(session, codigoBarras);
        
        case 'LOTE':
          return await this.processarLeituraLote(session, codigoBarras);
        
        default:
          return {
            success: false,
            session,
            message: 'Etapa inválida da sessão.'
          };
      }
    } catch (error) {
      return {
        success: false,
        session,
        message: `Erro ao processar leitura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Processa a primeira leitura (produto)
   */
  private async processarLeituraProduto(session: DuplaLeituraSession, codigoBarras: string): Promise<DuplaLeituraResult> {
    // Buscar produto pelo código de barras
    const produto = await this.produtoService.buscarProdutoPorCodigoBarras(codigoBarras);
    
    if (!produto) {
      return {
        success: false,
        session,
        message: 'Produto não encontrado. Verifique o código de barras e tente novamente.'
      };
    }

    if (!produto.ativo) {
      return {
        success: false,
        session,
        message: 'Produto inativo. Não é possível prosseguir.'
      };
    }

    // Atualizar sessão
    session.produtoId = produto.id;
    session.produto = produto;
    session.etapa = 'LOTE';
    session.expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT); // Renovar timeout

    this.sessions.set(session.id, session);

    return {
      success: true,
      session,
      message: `Produto identificado: ${produto.nome}. Agora escaneie o código de barras do lote.`,
      nextStep: 'LOTE'
    };
  }

  /**
   * Processa a segunda leitura (lote)
   */
  private async processarLeituraLote(session: DuplaLeituraSession, codigoBarras: string): Promise<DuplaLeituraResult> {
    if (!session.produtoId) {
      return {
        success: false,
        session,
        message: 'Erro interno: produto não identificado na sessão.'
      };
    }

    // Buscar lote pelo código de barras
    const lote = await this.loteService.buscarLotePorCodigoBarras(codigoBarras);
    
    if (!lote) {
      return {
        success: false,
        session,
        message: 'Lote não encontrado. Verifique o código de barras do lote e tente novamente.'
      };
    }

    if (!lote.ativo) {
      return {
        success: false,
        session,
        message: 'Lote inativo. Não é possível prosseguir.'
      };
    }

    // Verificar se o lote pertence ao produto
    if (lote.produtoId !== session.produtoId) {
      return {
        success: false,
        session,
        message: 'O lote escaneado não pertence ao produto selecionado. Verifique e tente novamente.'
      };
    }

    // Verificar se o lote tem estoque disponível
    const quantidadeDisponivel = lote.quantidadeAtual - lote.quantidadeReservada;
    if (quantidadeDisponivel <= 0) {
      return {
        success: false,
        session,
        message: 'Lote sem estoque disponível.'
      };
    }

    // Verificar validade do lote
    const hoje = new Date();
    if (lote.dataValidade < hoje) {
      return {
        success: false,
        session,
        message: 'Lote vencido. Não é possível utilizar.'
      };
    }

    // Atualizar sessão
    session.loteId = lote.id;
    session.lote = lote;
    session.etapa = 'COMPLETA';

    this.sessions.set(session.id, session);

    return {
      success: true,
      session,
      message: `Lote identificado: ${lote.numeroLote}. Dupla leitura concluída com sucesso.`,
      nextStep: 'FINALIZAR'
    };
  }

  /**
   * Obtém informações de uma sessão
   */
  obterSessao(sessionId: string): DuplaLeituraSession | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Finaliza uma sessão
   */
  finalizarSessao(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Cancela uma sessão
   */
  cancelarSessao(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Lista todas as sessões ativas (para debug/admin)
   */
  listarSessoesAtivas(): DuplaLeituraSession[] {
    const agora = new Date();
    const sessoesAtivas: DuplaLeituraSession[] = [];

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt > agora) {
        sessoesAtivas.push(session);
      } else {
        this.sessions.delete(id);
      }
    }

    return sessoesAtivas;
  }

  /**
   * Gera um ID único para a sessão
   */
  private gerarSessionId(): string {
    return `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Remove sessões expiradas
   */
  private limparSessoesExpiradas(): void {
    const agora = new Date();
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt <= agora) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Valida se uma sessão está completa e pronta para uso
   */
  validarSessaoCompleta(sessionId: string): {
    valida: boolean;
    produto?: any;
    lote?: any;
    message: string;
  } {
    const session = this.obterSessao(sessionId);
    
    if (!session) {
      return {
        valida: false,
        message: 'Sessão não encontrada ou expirada.'
      };
    }

    if (session.etapa !== 'COMPLETA') {
      return {
        valida: false,
        message: 'Dupla leitura não foi concluída.'
      };
    }

    if (!session.produto || !session.lote) {
      return {
        valida: false,
        message: 'Dados incompletos na sessão.'
      };
    }

    return {
      valida: true,
      produto: session.produto,
      lote: session.lote,
      message: 'Sessão válida e completa.'
    };
  }
}