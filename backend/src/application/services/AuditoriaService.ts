/**
 * Service de Auditoria - Sistema de Farmácia
 * 
 * Gerencia consultas e relatórios de auditoria para vendas de medicamentos controlados.
 * Focado na transparência e rastreabilidade para supervisão farmacêutica.
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { logger } from '@/shared/utils/logger';

export interface VendaControlada {
  id: string;
  dataVenda: string;
  numeroReceita: string;
  dataReceita: string;
  vendedor: {
    nome: string;
    login: string;
    tipo: string;
  };
  cliente: {
    nome: string;
    documento?: string;
  };
  produtos: Array<{
    nome: string;
    quantidade: number;
    precoUnitario: number;
    classificacao: string;
  }>;
  valorTotal: number;
  vendaAssistida: boolean;
  justificativa?: string;
}

export interface FiltroAuditoria {
  dataInicio?: Date;
  dataFim?: Date;
  vendedorId?: string;
  numeroReceita?: string;
  tipoUsuario?: string;
  apenasVendasAssistidas?: boolean;
}

export interface ResumoAuditoria {
  totalVendasControladas: number;
  totalVendasAssistidas: number;
  totalVendedores: number;
  valorTotalPeriodo: number;
  principaisControlados: Array<{
    nome: string;
    quantidade: number;
    classificacao: string;
  }>;
}

export class AuditoriaService {
  private logger = logger;

  private get prisma(): PrismaClient {
    return DatabaseConnection.getClient();
  }

  async listarVendasControladas(filtro: FiltroAuditoria = {}): Promise<{
    vendas: VendaControlada[];
    total: number;
  }> {
    try {
      const where: any = {
        temMedicamentoControlado: true
      };

      // Filtros de data
      if (filtro.dataInicio || filtro.dataFim) {
        where.criadoEm = {};
        if (filtro.dataInicio) where.criadoEm.gte = filtro.dataInicio;
        if (filtro.dataFim) where.criadoEm.lte = filtro.dataFim;
      }

      if (filtro.vendedorId) {
        where.usuarioId = filtro.vendedorId;
      }

      if (filtro.numeroReceita) {
        where.numeroReceita = { contains: filtro.numeroReceita, mode: 'insensitive' };
      }

      // Buscar vendas com relacionamentos
      const vendas = await this.prisma.venda.findMany({
        where,
        include: {
          usuario: {
            select: {
              nome: true,
              login: true,
              tipo: true
            }
          },
          itens: {
            include: {
              produto: {
                select: {
                  nome: true,
                  classificacaoAnvisa: true,
                  exigeReceita: true
                }
              }
            }
          }
        },
        orderBy: { criadoEm: 'desc' }
      });

      // Filtrar apenas produtos controlados e formatar resposta
      const vendasFormatadas: VendaControlada[] = vendas.map(venda => {
        const produtosControlados = venda.itens
          .filter(item => item.produto.exigeReceita)
          .map(item => ({
            nome: item.produto.nome,
            quantidade: item.quantidade,
            precoUnitario: Number(item.precoUnitario),
            classificacao: item.produto.classificacaoAnvisa
          }));

        // Determinar se foi venda assistida (vendedor/PDV vendendo controlado)
        const tipoUsuario = venda.usuario.tipo;
        const vendaAssistida = ['VENDEDOR', 'PDV'].includes(tipoUsuario);

        return {
          id: venda.id,
          dataVenda: venda.criadoEm.toISOString(),
          numeroReceita: venda.numeroReceita || '',
          dataReceita: venda.dataReceita || '',
          vendedor: {
            nome: venda.usuario.nome,
            login: venda.usuario.login,
            tipo: venda.usuario.tipo
          },
          cliente: {
            nome: venda.clienteNome || 'Cliente cadastrado',
            documento: venda.clienteDocumento || undefined
          },
          produtos: produtosControlados,
          valorTotal: Number(venda.valorFinal),
          vendaAssistida,
          justificativa: venda.observacoes || undefined
        };
      });

      // Aplicar filtro de vendas assistidas se solicitado
      const vendasFiltradas = filtro.apenasVendasAssistidas 
        ? vendasFormatadas.filter(v => v.vendaAssistida)
        : vendasFormatadas;

      const total = vendasFiltradas.length;

      this.logger.info(`🔍 Consulta auditoria: ${total} vendas controladas encontradas`);

      return {
        vendas: vendasFiltradas,
        total
      };

    } catch (error: any) {
      this.logger.error('Erro ao consultar vendas controladas para auditoria:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  async obterResumoAuditoria(filtro: FiltroAuditoria = {}): Promise<ResumoAuditoria> {
    try {
      const where: any = {
        temMedicamentoControlado: true
      };

      // Filtros de data
      if (filtro.dataInicio || filtro.dataFim) {
        where.criadoEm = {};
        if (filtro.dataInicio) where.criadoEm.gte = filtro.dataInicio;
        if (filtro.dataFim) where.criadoEm.lte = filtro.dataFim;
      }

      // Buscar dados para resumo
      const [vendas, vendedoresUnicos] = await Promise.all([
        this.prisma.venda.findMany({
          where,
          include: {
            usuario: { select: { tipo: true } },
            itens: {
              include: {
                produto: {
                  select: {
                    nome: true,
                    classificacaoAnvisa: true,
                    exigeReceita: true
                  }
                }
              }
            }
          }
        }),
        this.prisma.venda.groupBy({
          by: ['usuarioId'],
          where,
          _count: { usuarioId: true }
        })
      ]);

      // Calcular estatísticas
      const totalVendasControladas = vendas.length;
      const totalVendasAssistidas = vendas.filter(v => 
        ['VENDEDOR', 'PDV'].includes(v.usuario.tipo)
      ).length;
      const totalVendedores = vendedoresUnicos.length;
      const valorTotalPeriodo = vendas.reduce((sum, venda) => 
        sum + Number(venda.valorFinal), 0
      );

      // Principais produtos controlados
      const contadorProdutos: { [key: string]: { quantidade: number; classificacao: string } } = {};
      
      vendas.forEach(venda => {
        venda.itens
          .filter(item => item.produto.exigeReceita)
          .forEach(item => {
            const nome = item.produto.nome;
            if (!contadorProdutos[nome]) {
              contadorProdutos[nome] = { 
                quantidade: 0, 
                classificacao: item.produto.classificacaoAnvisa 
              };
            }
            contadorProdutos[nome].quantidade += item.quantidade;
          });
      });

      const principaisControlados = Object.entries(contadorProdutos)
        .sort(([,a], [,b]) => b.quantidade - a.quantidade)
        .slice(0, 10)
        .map(([nome, dados]) => ({
          nome,
          quantidade: dados.quantidade,
          classificacao: dados.classificacao
        }));

      return {
        totalVendasControladas,
        totalVendasAssistidas,
        totalVendedores,
        valorTotalPeriodo,
        principaisControlados
      };

    } catch (error: any) {
      this.logger.error('Erro ao gerar resumo de auditoria:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  async obterDetalhesVendaControlada(vendaId: string): Promise<VendaControlada | null> {
    try {
      const venda = await this.prisma.venda.findUnique({
        where: { 
          id: vendaId,
          temMedicamentoControlado: true
        },
        include: {
          usuario: {
            select: {
              nome: true,
              login: true,
              tipo: true
            }
          },
          itens: {
            include: {
              produto: {
                select: {
                  nome: true,
                  classificacaoAnvisa: true,
                  exigeReceita: true,
                  principioAtivo: true,
                  laboratorio: true
                }
              }
            }
          }
        }
      });

      if (!venda) return null;

      const produtosControlados = venda.itens
        .filter(item => item.produto.exigeReceita)
        .map(item => ({
          nome: item.produto.nome,
          quantidade: item.quantidade,
          precoUnitario: Number(item.precoUnitario),
          classificacao: item.produto.classificacaoAnvisa
        }));

      const vendaAssistida = ['VENDEDOR', 'PDV'].includes(venda.usuario.tipo);

      return {
        id: venda.id,
        dataVenda: venda.criadoEm.toISOString(),
        numeroReceita: venda.numeroReceita || '',
        dataReceita: venda.dataReceita || '',
        vendedor: {
          nome: venda.usuario.nome,
          login: venda.usuario.login,
          tipo: venda.usuario.tipo
        },
        cliente: {
          nome: venda.clienteNome || 'Cliente cadastrado',
          documento: venda.clienteDocumento || undefined
        },
        produtos: produtosControlados,
        valorTotal: Number(venda.valorFinal),
        vendaAssistida,
        justificativa: venda.observacoes || undefined
      };

    } catch (error: any) {
      this.logger.error(`Erro ao buscar detalhes da venda controlada ${vendaId}:`, error);
      throw new Error('Erro interno do servidor');
    }
  }
}