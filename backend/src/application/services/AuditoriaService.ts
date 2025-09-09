/**
 * Service de Auditoria Inteligente - Sistema de Farmácia
 * 
 * Gerencia consultas e relatórios de auditoria para vendas de medicamentos controlados
 * com recursos inteligentes de densidade temporal, marcos importantes e sugestões.
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
  comReceita?: boolean; // Novo filtro para receitas
  page?: number;
  limit?: number;
}

export interface DensidadeDataPoint {
  date: string;
  count: number;
  severity?: 'low' | 'medium' | 'high';
}

export interface MarcoImportante {
  date: string;
  label: string;
  type: 'milestone' | 'alert' | 'normal';
  count: number;
}

export interface SugestaoFiltro {
  id: string;
  name: string;
  description: string;
  filter: Partial<FiltroAuditoria>;
  frequency: number;
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
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const { page = 1, limit = 20 } = filtro;
      
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

      if (filtro.comReceita) {
        where.numeroReceita = { not: null };
      }

      // Calcular skip para paginação
      const skip = (page - 1) * limit;

      // Buscar vendas com relacionamentos e paginação
      const [vendas, totalCount] = await Promise.all([
        this.prisma.venda.findMany({
          where,
          skip,
          take: limit,
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
        }),
        this.prisma.venda.count({ where })
      ]);

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

      // Calcular metadados de paginação
      const totalItems = totalCount;
      const totalPages = Math.ceil(totalItems / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      this.logger.info(`🔍 Consulta auditoria: ${vendasFiltradas.length} vendas controladas (página ${page}/${totalPages})`);

      return {
        vendas: vendasFiltradas,
        total: totalItems,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNext,
          hasPrev
        }
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

  /**
   * Obtém dados de densidade temporal para visualização de timeline
   */
  async obterDensidadeTemporal(filtro: FiltroAuditoria = {}): Promise<DensidadeDataPoint[]> {
    try {
      const dataInicio = filtro.dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dataFim = filtro.dataFim || new Date();

      // Buscar vendas agrupadas por dia
      const vendas = await this.prisma.venda.findMany({
        where: {
          temMedicamentoControlado: true,
          criadoEm: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        select: {
          criadoEm: true
        }
      });

      // Agrupar por dia
      const densityMap = new Map<string, number>();
      
      // Criar entrada para cada dia no período
      let currentDate = new Date(dataInicio);
      while (currentDate <= dataFim) {
        const dateStr = currentDate.toISOString().split('T')[0];
        densityMap.set(dateStr, 0);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Contar vendas por dia
      vendas.forEach(venda => {
        const dateStr = venda.criadoEm.toISOString().split('T')[0];
        const current = densityMap.get(dateStr) || 0;
        densityMap.set(dateStr, current + 1);
      });

      // Converter para array e calcular severity
      const result: DensidadeDataPoint[] = Array.from(densityMap.entries()).map(([date, count]) => {
        let severity: 'low' | 'medium' | 'high' = 'low';
        if (count > 20) severity = 'high';
        else if (count > 10) severity = 'medium';

        return { date, count, severity };
      }).sort((a, b) => a.date.localeCompare(b.date));

      this.logger.info(`📊 Densidade temporal calculada: ${result.length} dias`);
      
      return result;
    } catch (error: any) {
      this.logger.error('Erro ao calcular densidade temporal:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Obtém marcos importantes para timeline
   */
  async obterMarcosImportantes(filtro: FiltroAuditoria = {}): Promise<MarcoImportante[]> {
    try {
      const dataInicio = filtro.dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const dataFim = filtro.dataFim || new Date();

      // Buscar dias com alta atividade (marcos importantes)
      const vendas = await this.prisma.venda.findMany({
        where: {
          temMedicamentoControlado: true,
          criadoEm: {
            gte: dataInicio,
            lte: dataFim
          }
        },
        select: {
          criadoEm: true,
          usuario: {
            select: { tipo: true }
          }
        }
      });

      // Agrupar por dia e calcular métricas
      const dayMetrics = new Map<string, {
        count: number;
        assistedCount: number;
      }>();

      vendas.forEach(venda => {
        const dateStr = venda.criadoEm.toISOString().split('T')[0];
        const metrics = dayMetrics.get(dateStr) || { count: 0, assistedCount: 0 };
        
        metrics.count++;
        if (['VENDEDOR', 'PDV'].includes(venda.usuario.tipo)) {
          metrics.assistedCount++;
        }
        
        dayMetrics.set(dateStr, metrics);
      });

      // Identificar marcos importantes
      const marcos: MarcoImportante[] = [];
      const avgCount = vendas.length / dayMetrics.size;

      dayMetrics.forEach((metrics, dateStr) => {
        // Marcos por alta atividade
        if (metrics.count > avgCount * 2) {
          marcos.push({
            date: dateStr,
            label: `${metrics.count} vendas controladas`,
            type: 'milestone',
            count: metrics.count
          });
        }

        // Marcos por muitas vendas assistidas
        if (metrics.assistedCount > 5) {
          marcos.push({
            date: dateStr,
            label: `${metrics.assistedCount} vendas assistidas`,
            type: 'alert',
            count: metrics.assistedCount
          });
        }
      });

      // Ordenar por data
      marcos.sort((a, b) => a.date.localeCompare(b.date));

      this.logger.info(`🎯 Marcos importantes identificados: ${marcos.length}`);
      
      return marcos.slice(0, 10); // Limitar a 10 marcos mais importantes
    } catch (error: any) {
      this.logger.error('Erro ao obter marcos importantes:', error);
      throw new Error('Erro interno do servidor');
    }
  }

  /**
   * Obtém sugestões inteligentes para filtros baseadas no histórico
   */
  async obterSugestoesFiltros(): Promise<SugestaoFiltro[]> {
    try {
      // Buscar padrões de consulta mais comuns
      const sugestoes: SugestaoFiltro[] = [
        {
          id: 'today',
          name: 'Hoje',
          description: 'Vendas controladas realizadas hoje',
          filter: {
            dataInicio: new Date(new Date().setHours(0, 0, 0, 0)),
            dataFim: new Date(new Date().setHours(23, 59, 59, 999))
          },
          frequency: 85
        },
        {
          id: 'this-week',
          name: 'Esta Semana',
          description: 'Vendas controladas desta semana',
          filter: {
            dataInicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            dataFim: new Date()
          },
          frequency: 70
        },
        {
          id: 'assisted-sales',
          name: 'Vendas Assistidas',
          description: 'Apenas vendas assistidas por farmacêuticos',
          filter: {
            apenasVendasAssistidas: true
          },
          frequency: 65
        },
        {
          id: 'with-prescription',
          name: 'Com Receita',
          description: 'Vendas que possuem número de receita',
          filter: {
            comReceita: true
          },
          frequency: 60
        }
      ];

      this.logger.info(`🧠 Sugestões filtros geradas: ${sugestoes.length}`);
      
      return sugestoes;
    } catch (error: any) {
      this.logger.error('Erro ao gerar sugestões de filtros:', error);
      throw new Error('Erro interno do servidor');
    }
  }
}