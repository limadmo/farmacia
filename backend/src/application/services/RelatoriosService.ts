// Serviço de Relatórios - Consultas diretas do banco corrigido com schema real
// Baseado nos dados reais do seed respeitando estrutura do Prisma

import { PrismaClient } from '@prisma/client';
import { addDays, subDays, format, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

// Interface compatível com o frontend baseada no schema real
export interface DashboardRelatorios {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  resumo: {
    vendas: {
      total: number;
      valor: number;
      crescimento: number;
      ticketMedio: number;
    };
    produtos: {
      maisVendidos: Array<{
        id: string;
        nome: string;
        quantidadeVendida: number;
        valorTotal: number;
      }>;
      estoqueBaixo: number;
      vencendo: number;
    };
    clientes: {
      novos: number;
      recorrentes: number;
      topCompradores: Array<{
        id: string;
        nome: string;
        totalCompras: number;
        valorTotal: number;
      }>;
    };
    financeiro: {
      receitaTotal: number;
      custoTotal: number;
      lucroOperacional: number;
      margemLucro: number;
    };
  };
  graficos: {
    vendasPorDia: Array<{
      data: string;
      vendas: number;
      valor: number;
    }>;
    produtosMaisVendidos: Array<{
      produto: string;
      quantidade: number;
    }>;
    categoriasMaisVendidas: Array<{
      categoria: string;
      valor: number;
    }>;
  };
  destaques: {
    melhorDia: {
      data: string;
      vendas: number;
      valor: number;
    };
    produtoDestaque: {
      nome: string;
      quantidade: number;
      crescimento: number;
    };
  };
  alertas: Array<{
    tipo: 'warning' | 'error' | 'info';
    titulo: string;
    mensagem: string;
  }>;
}

// Dashboard específico de clientes com métricas detalhadas
export interface DashboardCliente {
  periodo: {
    dataInicio: string;
    dataFim: string;
  };
  metricas: {
    totalClientes: number;
    novosClientes: number;
    clientesRecorrentes: number;
    clientesAtivos: number;
    crescimentoBase: number;
    ticketMedio: number;
    frequenciaCompra: number;
    taxaRetencao: number;
  };
  segmentacao: {
    A: {
      quantidade: number;
      percentual: number;
      valorMedio: number;
      contribuicaoReceita: number;
    };
    B: {
      quantidade: number;
      percentual: number;
      valorMedio: number;
      contribuicaoReceita: number;
    };
    C: {
      quantidade: number;
      percentual: number;
      valorMedio: number;
      contribuicaoReceita: number;
    };
  };
  topClientes: Array<{
    id: string;
    nome: string;
    valorTotal: number;
    totalCompras: number;
    ultimaCompra: string;
    ticketMedio: number;
  }>;
  tendencias: Array<{
    mes: string;
    novosClientes: number;
    clientesAtivos: number;
    vendas: number;
    receita: number;
    ticketMedio: number;
  }>;
  alertas: Array<{
    tipo: 'critico' | 'atencao' | 'info';
    titulo: string;
    descricao: string;
    impacto: 'alto' | 'medio' | 'baixo';
  }>;
  ultimaAtualizacao: string;
}

// Dashboard específico de estoque com análises avançadas
export interface DashboardEstoque {
  valorTotal: number;
  valorCusto: number;
  itensTotal: number;
  alertas: {
    estoqueBaixo: number;
    vencendo: number;
    vencidos: number;
  };
  resumo: {
    margemEstimada: number;
    valorMedio: number;
  };
  categorias: Array<{
    categoria: string;
    quantidade: number;
    percentual: number;
    valorEstoque: number;
  }>;
  movimentacoesRecentes: Array<{
    id: string;
    produto: string;
    tipo: string;
    quantidade: number;
    motivo: string;
    data: string;
  }>;
}

class RelatoriosService {
  
  // Dashboard principal com métricas do banco real
  async obterDashboard(): Promise<DashboardRelatorios> {
    try {
      const agora = new Date();
      const dataInicio = subDays(agora, 30);
      const dataFim = agora;

      // Consultas diretas ao banco usando schema correto
      const [
        vendas,
        vendasAnterior,
        produtosMaisVendidos,
        estoqueBaixo,
        clientesNovos,
        topCompradores,
        vendasPorDia
      ] = await Promise.all([
        // Total de vendas do período (usando statusPagamento)
        prisma.venda.aggregate({
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            },
            statusPagamento: 'PAGO'
          },
          _count: true,
          _sum: { valorFinal: true }
        }),

        // Vendas do período anterior (para crescimento)
        prisma.venda.aggregate({
          where: {
            criadoEm: {
              gte: startOfDay(subDays(dataInicio, 30)),
              lte: endOfDay(subDays(dataFim, 30))
            },
            statusPagamento: 'PAGO'
          },
          _sum: { valorFinal: true }
        }),

        // Produtos mais vendidos (usando precoUnitario)
        prisma.itemVenda.groupBy({
          by: ['produtoId'],
          where: {
            venda: {
              criadoEm: {
                gte: startOfDay(dataInicio),
                lte: endOfDay(dataFim)
              },
              statusPagamento: 'PAGO'
            }
          },
          _sum: {
            quantidade: true,
            total: true
          },
          orderBy: {
            _sum: {
              quantidade: 'desc'
            }
          },
          take: 5
        }),

        // Produtos com estoque baixo
        prisma.produto.count({
          where: {
            estoque: {
              lt: 10,
              gt: 0
            },
            ativo: true
          }
        }),

        // Clientes novos no período
        prisma.cliente.count({
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            }
          }
        }),

        // Top compradores
        prisma.venda.groupBy({
          by: ['clienteId'],
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            },
            statusPagamento: 'PAGO',
            clienteId: {
              not: null
            }
          },
          _count: true,
          _sum: { valorFinal: true },
          orderBy: {
            _sum: {
              valorFinal: 'desc'
            }
          },
          take: 3
        }),

        // Vendas por dia
        prisma.venda.groupBy({
          by: ['criadoEm'],
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            },
            statusPagamento: 'PAGO'
          },
          _count: true,
          _sum: { valorFinal: true },
          orderBy: {
            criadoEm: 'asc'
          }
        })
      ]);

      // Buscar detalhes dos produtos mais vendidos
      const produtoIds = produtosMaisVendidos.map(p => p.produtoId);
      const produtos = await prisma.produto.findMany({
        where: { id: { in: produtoIds } },
        select: { id: true, nome: true }
      });

      // Buscar detalhes dos top compradores
      const clienteIds = topCompradores
        .map(c => c.clienteId)
        .filter((id): id is string => id !== null);
      
      const clientes = await prisma.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, nome: true }
      });

      // Calcular métricas
      const totalVendas = vendas._count || 0;
      const valorTotal = Number(vendas._sum.valorFinal || 0);
      const valorAnterior = Number(vendasAnterior._sum.valorFinal || 0);
      
      const crescimento = valorAnterior > 0 
        ? ((valorTotal - valorAnterior) / valorAnterior) * 100 
        : 0;
      
      const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

      // Preparar dados dos produtos mais vendidos
      const produtosMaisVendidosFormatados = produtosMaisVendidos.map(item => {
        const produto = produtos.find(p => p.id === item.produtoId);
        return {
          id: item.produtoId,
          nome: produto?.nome || 'Produto não encontrado',
          quantidadeVendida: item._sum.quantidade || 0,
          valorTotal: Number(item._sum.total || 0)
        };
      });

      // Preparar dados dos top compradores
      const topCompradoresFormatados = topCompradores.map(item => {
        const cliente = clientes.find(c => c.id === item.clienteId);
        return {
          id: item.clienteId || '',
          nome: cliente?.nome || 'Cliente não encontrado',
          totalCompras: item._count,
          valorTotal: Number(item._sum.valorFinal || 0)
        };
      });

      // Agrupar vendas por dia
      const vendasPorDiaFormatadas = vendasPorDia.map(item => ({
        data: format(item.criadoEm, 'yyyy-MM-dd'),
        vendas: item._count,
        valor: Number(item._sum.valorFinal || 0)
      }));

      // Encontrar melhor dia
      const melhorDia = vendasPorDiaFormatadas.reduce((melhor, atual) => 
        atual.valor > melhor.valor ? atual : melhor,
        { data: format(agora, 'yyyy-MM-dd'), vendas: 0, valor: 0 }
      );

      // Produto destaque (mais vendido)
      const produtoDestaque = produtosMaisVendidosFormatados[0] || {
        nome: 'Nenhum produto',
        quantidadeVendida: 0,
        crescimento: 0
      };

      // Alertas baseados nos dados reais
      const alertas = [];
      if (estoqueBaixo > 0) {
        alertas.push({
          tipo: 'warning' as const,
          titulo: 'Estoque Baixo',
          mensagem: `${estoqueBaixo} produtos com estoque baixo (menos de 10 unidades)`
        });
      }

      const dashboard: DashboardRelatorios = {
        periodo: {
          dataInicio: format(dataInicio, 'yyyy-MM-dd'),
          dataFim: format(dataFim, 'yyyy-MM-dd')
        },
        resumo: {
          vendas: {
            total: totalVendas,
            valor: valorTotal,
            crescimento: Number(crescimento.toFixed(2)),
            ticketMedio: Number(ticketMedio.toFixed(2))
          },
          produtos: {
            maisVendidos: produtosMaisVendidosFormatados,
            estoqueBaixo,
            vencendo: 0 // Campo não implementado no schema atual
          },
          clientes: {
            novos: clientesNovos,
            recorrentes: Math.max(0, totalVendas - clientesNovos),
            topCompradores: topCompradoresFormatados
          },
          financeiro: {
            receitaTotal: valorTotal,
            custoTotal: valorTotal * 0.7, // Estimativa de 70% do valor
            lucroOperacional: valorTotal * 0.3, // Estimativa de 30% lucro
            margemLucro: 30 // 30% estimado
          }
        },
        graficos: {
          vendasPorDia: vendasPorDiaFormatadas,
          produtosMaisVendidos: produtosMaisVendidosFormatados.map(p => ({
            produto: p.nome,
            quantidade: p.quantidadeVendida
          })),
          categoriasMaisVendidas: [] // Será implementado se necessário
        },
        destaques: {
          melhorDia,
          produtoDestaque: {
            nome: produtoDestaque.nome,
            quantidade: produtoDestaque.quantidadeVendida,
            crescimento: 0 // Campo não calculado ainda
          }
        },
        alertas
      };

      return dashboard;

    } catch (error) {
      logger.error('Erro ao gerar dashboard de relatórios:', error);
      throw error;
    }
  }

  // Análise detalhada de vendas com dados reais do banco
  async obterAnaliseVendas(): Promise<any> {
    try {
      const agora = new Date();
      const dataInicio = subDays(agora, 30);
      const dataFim = agora;

      // Consultas paralelas para otimizar performance
      const [
        vendasPorPeriodo,
        vendasPorVendedor,
        vendasPorFormaPagamento,
        produtosVendidos
      ] = await Promise.all([
        // Vendas agrupadas por dia
        prisma.venda.groupBy({
          by: ['criadoEm'],
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            },
            statusPagamento: 'PAGO'
          },
          _count: true,
          _sum: { valorFinal: true },
          orderBy: {
            criadoEm: 'asc'
          }
        }),

        // Vendas por vendedor/usuário
        prisma.venda.groupBy({
          by: ['usuarioId'],
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            },
            statusPagamento: 'PAGO'
          },
          _count: true,
          _sum: { valorFinal: true },
          orderBy: {
            _sum: {
              valorFinal: 'desc'
            }
          },
          take: 10
        }),

        // Vendas por forma de pagamento
        prisma.venda.groupBy({
          by: ['formaPagamento'],
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            },
            statusPagamento: 'PAGO'
          },
          _count: true,
          _sum: { valorFinal: true },
          orderBy: {
            _sum: {
              valorFinal: 'desc'
            }
          }
        }),

        // Produtos mais vendidos para análise de categoria
        prisma.itemVenda.groupBy({
          by: ['produtoId'],
          where: {
            venda: {
              criadoEm: {
                gte: startOfDay(dataInicio),
                lte: endOfDay(dataFim)
              },
              statusPagamento: 'PAGO'
            }
          },
          _sum: {
            total: true,
            quantidade: true
          },
          orderBy: {
            _sum: {
              total: 'desc'
            }
          },
          take: 20
        })
      ]);

      // Buscar detalhes dos vendedores
      const usuarioIds = vendasPorVendedor.map(v => v.usuarioId);
      const usuarios = await prisma.usuario.findMany({
        where: { id: { in: usuarioIds } },
        select: { id: true, nome: true }
      });

      // Calcular total geral para percentuais
      const totalVendas = await prisma.venda.aggregate({
        where: {
          criadoEm: {
            gte: startOfDay(dataInicio),
            lte: endOfDay(dataFim)
          },
          statusPagamento: 'PAGO'
        },
        _sum: { valorFinal: true },
        _count: true
      });

      const valorTotalGeral = Number(totalVendas._sum.valorFinal || 0);

      // Formatar dados para o frontend
      const analiseVendas = {
        porPeriodo: vendasPorPeriodo.map(item => ({
          data: format(item.criadoEm, 'yyyy-MM-dd'),
          vendas: item._count,
          valor: Number(item._sum.valorFinal || 0)
        })),

        porCategoria: await this.processarCategorias(produtosVendidos, valorTotalGeral),

        porVendedor: vendasPorVendedor.map(item => {
          const usuario = usuarios.find(u => u.id === item.usuarioId);
          const valor = Number(item._sum.valorFinal || 0);
          const vendas = item._count;
          
          return {
            vendedor: usuario?.nome || 'Vendedor não encontrado',
            vendas,
            valor,
            ticketMedio: vendas > 0 ? Number((valor / vendas).toFixed(2)) : 0
          };
        }),

        porFormaPagamento: vendasPorFormaPagamento.map(item => {
          const valor = Number(item._sum.valorFinal || 0);
          const percentual = valorTotalGeral > 0 
            ? Number(((valor / valorTotalGeral) * 100).toFixed(2))
            : 0;

          return {
            formaPagamento: item.formaPagamento,
            vendas: item._count,
            valor,
            percentual
          };
        })
      };

      return analiseVendas;

    } catch (error) {
      logger.error('Erro ao gerar análise de vendas:', error);
      throw error;
    }
  }

  // Método auxiliar para processar categorias de produtos vendidos
  private async processarCategorias(produtosVendidos: any[], valorTotalGeral: number): Promise<any[]> {
    try {
      // Buscar detalhes dos produtos para obter suas categorias
      const produtoIds = produtosVendidos.map(item => item.produtoId);
      const produtos = await prisma.produto.findMany({
        where: { id: { in: produtoIds } },
        select: { 
          id: true, 
          categoriaAnvisa: true 
        }
      });

      // Agrupar por categoria
      const categoriaMap = new Map<string, { vendas: number; valor: number }>();
      
      produtosVendidos.forEach(item => {
        const produto = produtos.find(p => p.id === item.produtoId);
        const categoria = produto?.categoriaAnvisa || 'Sem categoria';
        const valor = Number(item._sum.total || 0);
        const quantidade = Number(item._sum.quantidade || 0);
        
        if (categoriaMap.has(categoria)) {
          const existing = categoriaMap.get(categoria)!;
          existing.vendas += quantidade;
          existing.valor += valor;
        } else {
          categoriaMap.set(categoria, { vendas: quantidade, valor });
        }
      });

      // Converter para array e ordenar por valor
      const categorias = Array.from(categoriaMap.entries()).map(([categoria, data]) => ({
        categoria,
        vendas: data.vendas,
        valor: data.valor,
        percentual: valorTotalGeral > 0 
          ? Number(((data.valor / valorTotalGeral) * 100).toFixed(2))
          : 0
      }));

      return categorias
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);
        
    } catch (error) {
      logger.error('Erro ao processar categorias:', error);
      return [];
    }
  }

  // Análise financeira detalhada com dados reais do banco
  async obterAnaliseFinanceira(): Promise<any> {
    try {
      const agora = new Date();
      const dataInicio = subDays(agora, 30);
      const dataFim = agora;

      // Consultas paralelas para métricas financeiras
      const [
        fluxoCaixaDiario,
        vendaComCusto,
        contasReceber,
        historicoCredito,
        custosPorCategoria
      ] = await Promise.all([
        // Fluxo de caixa diário - vendas pagas por dia
        prisma.venda.groupBy({
          by: ['criadoEm'],
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            },
            statusPagamento: 'PAGO'
          },
          _count: true,
          _sum: { valorFinal: true },
          orderBy: {
            criadoEm: 'asc'
          }
        }),

        // Vendas com custos reais - baseado no precoCusto dos produtos
        prisma.itemVenda.findMany({
          where: {
            venda: {
              criadoEm: {
                gte: startOfDay(dataInicio),
                lte: endOfDay(dataFim)
              },
              statusPagamento: 'PAGO'
            }
          },
          include: {
            produto: {
              select: {
                precoCusto: true,
                precoVenda: true,
                nome: true,
                categoriaAnvisa: true
              }
            },
            venda: {
              select: {
                valorFinal: true,
                criadoEm: true
              }
            }
          }
        }),

        // Contas a receber - vendas pendentes e com crédito
        prisma.venda.findMany({
          where: {
            statusPagamento: {
              in: ['PENDENTE', 'PARCIAL']
            },
            criadoEm: {
              gte: startOfDay(subDays(agora, 90)) // Últimos 90 dias
            }
          },
          select: {
            id: true,
            valorFinal: true,
            statusPagamento: true,
            criadoEm: true,
            cliente: {
              select: {
                nome: true
              }
            }
          },
          orderBy: {
            criadoEm: 'desc'
          }
        }),

        // Histórico de crédito para análise de fluxo
        prisma.historicoCredito.groupBy({
          by: ['tipo', 'criadoEm'],
          where: {
            criadoEm: {
              gte: startOfDay(dataInicio),
              lte: endOfDay(dataFim)
            }
          },
          _sum: { valor: true },
          _count: true
        }),

        // Custos por categoria para análise detalhada
        prisma.itemVenda.groupBy({
          by: ['produtoId'],
          where: {
            venda: {
              criadoEm: {
                gte: startOfDay(dataInicio),
                lte: endOfDay(dataFim)
              },
              statusPagamento: 'PAGO'
            }
          },
          _sum: {
            quantidade: true,
            total: true
          }
        })
      ]);

      // Processar fluxo de caixa diário
      const fluxoCaixa = fluxoCaixaDiario.map(item => {
        const data = format(item.criadoEm, 'yyyy-MM-dd');
        const entradas = Number(item._sum.valorFinal || 0);
        const saidas = 0; // Para farmácia, saídas seriam compras/despesas (não implementado ainda)
        
        return {
          data,
          entradas,
          saidas,
          saldo: entradas - saidas
        };
      });

      // Calcular métricas de DRE com custos reais
      let receitaTotal = 0;
      let custoTotalReal = 0;
      let margemBruta = 0;
      let margemLiquida = 0;

      vendaComCusto.forEach(item => {
        const receita = Number(item.total);
        const custoProduto = Number(item.produto.precoCusto || 0);
        const custoItem = custoProduto * item.quantidade;

        receitaTotal += receita;
        custoTotalReal += custoItem;
      });

      const lucroOperacional = receitaTotal - custoTotalReal;
      margemBruta = receitaTotal > 0 ? ((receitaTotal - custoTotalReal) / receitaTotal) * 100 : 0;
      margemLiquida = margemBruta; // Assumindo que não há despesas operacionais cadastradas

      // Processar contas a receber
      const contasReceberTotal = contasReceber.reduce((total, conta) => 
        total + Number(conta.valorFinal), 0
      );
      
      const contasReceberVencidas = contasReceber.filter(conta => 
        new Date(conta.criadoEm) < subDays(agora, 30)
      ).reduce((total, conta) => total + Number(conta.valorFinal), 0);

      const contasReceberAVencer = contasReceberTotal - contasReceberVencidas;

      // Análise financeira consolidada
      const analiseFinanceira = {
        fluxoCaixa,
        dre: {
          receita: receitaTotal,
          custos: custoTotalReal,
          despesas: 0, // Não implementado ainda
          lucroOperacional,
          margemBruta: Number(margemBruta.toFixed(2)),
          margemLiquida: Number(margemLiquida.toFixed(2))
        },
        contasReceber: {
          total: contasReceberTotal,
          vencidas: contasReceberVencidas,
          aVencer: contasReceberAVencer
        },
        contasPagar: {
          total: 0, // Não implementado ainda - seria baseado em compras de fornecedores
          vencidas: 0,
          aVencer: 0
        },
        periodo: {
          dataInicio: format(dataInicio, 'yyyy-MM-dd'),
          dataFim: format(dataFim, 'yyyy-MM-dd')
        }
      };

      return analiseFinanceira;

    } catch (error) {
      logger.error('Erro ao gerar análise financeira:', error);
      throw error;
    }
  }

  // ============================================================
  // DASHBOARD DE CLIENTE  
  // ============================================================
  
  /**
   * Obtém dashboard detalhado de clientes com métricas avançadas
   * @returns Dashboard completo de clientes com análises de retenção e segmentação
   */
  async obterDashboardCliente(): Promise<DashboardCliente> {
    try {
      const agora = new Date();
      const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
      const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);
      const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
      const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0);
      const inicio30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const inicio90Dias = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Buscar dados básicos dos clientes
      const [
        totalClientes,
        novosClientesMes,
        clientesAtivos,
        vendasComCliente,
        vendasMesAnterior,
        clientesComVenda
      ] = await Promise.all([
        // Total de clientes cadastrados
        prisma.cliente.count(),
        
        // Novos clientes este mês
        prisma.cliente.count({
          where: {
            criadoEm: {
              gte: inicioMes,
              lte: fimMes
            }
          }
        }),

        // Clientes ativos (compraram nos últimos 90 dias)
        prisma.cliente.count({
          where: {
            vendas: {
              some: {
                criadoEm: {
                  gte: inicio90Dias
                },
                statusPagamento: 'PAGO'
              }
            }
          }
        }),

        // Vendas do mês atual com cliente
        prisma.venda.findMany({
          where: {
            criadoEm: {
              gte: inicioMes,
              lte: fimMes
            },
            clienteId: {
              not: null
            },
            statusPagamento: 'PAGO'
          },
          include: {
            cliente: true,
            itens: true
          }
        }),

        // Vendas do mês anterior para comparação
        prisma.venda.findMany({
          where: {
            criadoEm: {
              gte: inicioMesAnterior,
              lte: fimMesAnterior
            },
            clienteId: {
              not: null
            },
            statusPagamento: 'PAGO'
          }
        }),

        // Clientes únicos que compraram nos últimos 30 dias
        prisma.cliente.findMany({
          where: {
            vendas: {
              some: {
                criadoEm: {
                  gte: inicio90Dias
                },
                statusPagamento: 'PAGO'
              }
            }
          },
          include: {
            vendas: {
              where: {
                criadoEm: {
                  gte: inicio90Dias
                },
                statusPagamento: 'PAGO'
              },
              include: {
                itens: true
              }
            }
          }
        })
      ]);

      // Calcular métricas básicas
      const valorTotalVendas = vendasComCliente.reduce((sum, venda) => 
        sum + Number(venda.valorFinal || 0), 0
      );

      const valorVendasMesAnterior = vendasMesAnterior.reduce((sum, venda) => 
        sum + Number(venda.valorFinal || 0), 0
      );

      const clientesRecorrentes = clientesComVenda.filter(cliente => 
        cliente.vendas.length > 1
      ).length;

      const ticketMedio = vendasComCliente.length > 0 ? 
        valorTotalVendas / vendasComCliente.length : 0;

      const crescimentoBase = valorVendasMesAnterior > 0 ? 
        ((valorTotalVendas - valorVendasMesAnterior) / valorVendasMesAnterior) * 100 : 0;

      // Calcular frequência média de compra
      const frequenciaMedia = clientesAtivos > 0 ? 
        vendasComCliente.length / clientesAtivos : 0;

      // Taxa de retenção (clientes que compraram novamente nos últimos 90 dias)
      const taxaRetencao = totalClientes > 0 ? 
        (clientesRecorrentes / totalClientes) * 100 : 0;

      // Segmentação por valor (ABC de clientes)
      const clientesComValor = clientesComVenda.map(cliente => {
        const valorTotal = cliente.vendas.reduce((sum, venda) => 
          sum + Number(venda.valorFinal || 0), 0
        );
        return { ...cliente, valorTotal };
      }).sort((a, b) => b.valorTotal - a.valorTotal);

      const totalA = Math.ceil(clientesComValor.length * 0.2);
      const totalB = Math.ceil(clientesComValor.length * 0.3);

      const segmentacao = {
        A: {
          quantidade: totalA,
          percentual: clientesComValor.length > 0 ? (totalA / clientesComValor.length) * 100 : 0,
          valorMedio: totalA > 0 ? 
            clientesComValor.slice(0, totalA).reduce((sum, c) => sum + c.valorTotal, 0) / totalA : 0,
          contribuicaoReceita: valorTotalVendas > 0 ?
            (clientesComValor.slice(0, totalA).reduce((sum, c) => sum + c.valorTotal, 0) / valorTotalVendas) * 100 : 0
        },
        B: {
          quantidade: totalB,
          percentual: clientesComValor.length > 0 ? (totalB / clientesComValor.length) * 100 : 0,
          valorMedio: totalB > 0 ? 
            clientesComValor.slice(totalA, totalA + totalB).reduce((sum, c) => sum + c.valorTotal, 0) / totalB : 0,
          contribuicaoReceita: valorTotalVendas > 0 ?
            (clientesComValor.slice(totalA, totalA + totalB).reduce((sum, c) => sum + c.valorTotal, 0) / valorTotalVendas) * 100 : 0
        },
        C: {
          quantidade: clientesComValor.length - totalA - totalB,
          percentual: clientesComValor.length > 0 ? 
            ((clientesComValor.length - totalA - totalB) / clientesComValor.length) * 100 : 0,
          valorMedio: (clientesComValor.length - totalA - totalB) > 0 ? 
            clientesComValor.slice(totalA + totalB).reduce((sum, c) => sum + c.valorTotal, 0) / (clientesComValor.length - totalA - totalB) : 0,
          contribuicaoReceita: valorTotalVendas > 0 ?
            (clientesComValor.slice(totalA + totalB).reduce((sum, c) => sum + c.valorTotal, 0) / valorTotalVendas) * 100 : 0
        }
      };

      // Top 10 clientes
      const topClientes = clientesComValor.slice(0, 10).map(cliente => ({
        id: cliente.id,
        nome: cliente.nome,
        valorTotal: cliente.valorTotal,
        totalCompras: cliente.vendas.length,
        ultimaCompra: cliente.vendas.length > 0 ? 
          new Date(Math.max(...cliente.vendas.map(v => v.criadoEm.getTime()))).toLocaleDateString('pt-BR') : 'Nunca',
        ticketMedio: cliente.vendas.length > 0 ? cliente.valorTotal / cliente.vendas.length : 0
      }));

      // Tendências mensais (últimos 6 meses)
      const tendencias = [];
      for (let i = 5; i >= 0; i--) {
        const mesInicio = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        const mesFim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0);

        const [novosClientes, vendasMes, clientesAtivosMes] = await Promise.all([
          prisma.cliente.count({
            where: {
              criadoEm: {
                gte: mesInicio,
                lte: mesFim
              }
            }
          }),

          prisma.venda.findMany({
            where: {
              criadoEm: {
                gte: mesInicio,
                lte: mesFim
              },
              clienteId: {
                not: null
              },
              statusPagamento: 'PAGO'
            }
          }),

          prisma.cliente.count({
            where: {
              vendas: {
                some: {
                  criadoEm: {
                    gte: mesInicio,
                    lte: mesFim
                  },
                  statusPagamento: 'PAGO'
                }
              }
            }
          })
        ]);

        const valorMes = vendasMes.reduce((sum, venda) => 
          sum + Number(venda.valorFinal || 0), 0
        );

        const ticketMedioMes = vendasMes.length > 0 ? valorMes / vendasMes.length : 0;

        tendencias.push({
          mes: mesInicio.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          novosClientes,
          clientesAtivos: clientesAtivosMes,
          vendas: vendasMes.length,
          receita: valorMes,
          ticketMedio: ticketMedioMes
        });
      }

      // Alertas e insights
      const alertas = [];
      
      if (crescimentoBase < -10) {
        alertas.push({
          tipo: 'critico' as const,
          titulo: 'Queda na Base de Clientes',
          descricao: `Receita de clientes caiu ${Math.abs(crescimentoBase).toFixed(1)}% comparado ao mês anterior`,
          impacto: 'alto' as const
        });
      }

      if (taxaRetencao < 30) {
        alertas.push({
          tipo: 'atencao' as const,
          titulo: 'Taxa de Retenção Baixa',
          descricao: `Apenas ${taxaRetencao.toFixed(1)}% dos clientes são recorrentes`,
          impacto: 'medio' as const
        });
      }

      if (novosClientesMes === 0) {
        alertas.push({
          tipo: 'atencao' as const,
          titulo: 'Sem Novos Clientes',
          descricao: 'Nenhum cliente novo foi cadastrado este mês',
          impacto: 'medio' as const
        });
      }

      const clientesInativos = totalClientes - clientesAtivos;
      if (clientesInativos > totalClientes * 0.7) {
        alertas.push({
          tipo: 'atencao' as const,
          titulo: 'Muitos Clientes Inativos',
          descricao: `${clientesInativos} clientes (${((clientesInativos / totalClientes) * 100).toFixed(1)}%) não compraram nos últimos 90 dias`,
          impacto: 'medio' as const
        });
      }

      return {
        periodo: {
          dataInicio: inicioMes.toISOString(),
          dataFim: fimMes.toISOString()
        },
        metricas: {
          totalClientes,
          novosClientes: novosClientesMes,
          clientesRecorrentes,
          clientesAtivos,
          crescimentoBase,
          ticketMedio,
          frequenciaCompra: frequenciaMedia,
          taxaRetencao
        },
        segmentacao,
        topClientes,
        tendencias,
        alertas,
        ultimaAtualizacao: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Erro ao gerar dashboard de cliente:', error);
      throw new Error('Falha ao processar dados de clientes');
    }
  }

  // ============================================================
  // DASHBOARD DE ESTOQUE
  // ============================================================
  
  /**
   * Obtém dashboard detalhado do estoque com métricas em tempo real
   * @returns Dashboard completo de estoque com análises avançadas
   */
  async obterDashboardEstoque(): Promise<DashboardEstoque> {
    try {
      const agora = new Date();
      const dataInicio30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Consultas paralelas para otimizar performance
      const [
        produtosAtivos,
        movimentacoesRecentes,
        alertasEstoque
      ] = await Promise.all([
        // Produtos com estoque e seus valores
        prisma.produto.findMany({
          where: {
            ativo: true,
            estoque: {
              gte: 0
            }
          },
          select: {
            id: true,
            nome: true,
            categoriaAnvisa: true,
            estoque: true,
            precoVenda: true,
            precoCusto: true,
            estoqueMinimo: true
          }
        }),

        // Movimentações recentes do estoque (últimos 30 dias)
        prisma.movimentacaoEstoque.findMany({
          where: {
            criadoEm: {
              gte: dataInicio30Dias
            }
          },
          include: {
            produto: {
              select: {
                nome: true
              }
            },
            usuario: {
              select: {
                nome: true
              }
            }
          },
          orderBy: {
            criadoEm: 'desc'
          },
          take: 10
        }),

        // Produtos com estoque baixo
        prisma.produto.count({
          where: {
            ativo: true,
            estoque: {
              lt: prisma.produto.fields.estoqueMinimo
            }
          }
        })
      ]);

      // Calcular métricas do estoque
      let valorTotal = 0;
      let valorCusto = 0;
      let itensTotal = 0;
      const categoriaMap = new Map<string, { quantidade: number; valor: number }>();

      produtosAtivos.forEach(produto => {
        const estoqueItem = produto.estoque || 0;
        const precoVenda = Number(produto.precoVenda || 0);
        const precoCusto = Number(produto.precoCusto || 0);
        const categoria = produto.categoriaAnvisa || 'Sem categoria';

        // Somar valores totais
        valorTotal += estoqueItem * precoVenda;
        valorCusto += estoqueItem * precoCusto;
        itensTotal += estoqueItem;

        // Agrupar por categoria
        if (categoriaMap.has(categoria)) {
          const existing = categoriaMap.get(categoria)!;
          existing.quantidade += estoqueItem;
          existing.valor += estoqueItem * precoVenda;
        } else {
          categoriaMap.set(categoria, { 
            quantidade: estoqueItem, 
            valor: estoqueItem * precoVenda 
          });
        }
      });

      // Processar categorias
      const categorias = Array.from(categoriaMap.entries()).map(([categoria, data]) => ({
        categoria,
        quantidade: data.quantidade,
        percentual: valorTotal > 0 ? (data.valor / valorTotal) * 100 : 0,
        valorEstoque: data.valor
      })).sort((a, b) => b.valorEstoque - a.valorEstoque);

      // Processar movimentações recentes
      const movimentacoesFormatadas = movimentacoesRecentes.map(mov => ({
        id: mov.id,
        produto: mov.produto?.nome || 'Produto não encontrado',
        tipo: mov.tipo,
        quantidade: mov.quantidade,
        motivo: mov.motivo || 'Sem motivo informado',
        data: mov.criadoEm.toLocaleDateString('pt-BR')
      }));

      // Calcular alertas
      const produtosVencendo = 0; // TODO: implementar com data de validade dos lotes
      const produtosVencidos = 0; // TODO: implementar com data de validade dos lotes

      // Calcular métricas derivadas
      const margemEstimada = valorTotal > 0 ? ((valorTotal - valorCusto) / valorTotal) * 100 : 0;
      const valorMedio = produtosAtivos.length > 0 ? valorTotal / produtosAtivos.length : 0;

      return {
        valorTotal,
        valorCusto,
        itensTotal,
        alertas: {
          estoqueBaixo: alertasEstoque,
          vencendo: produtosVencendo,
          vencidos: produtosVencidos
        },
        resumo: {
          margemEstimada,
          valorMedio
        },
        categorias,
        movimentacoesRecentes: movimentacoesFormatadas
      };

    } catch (error) {
      logger.error('Erro ao gerar dashboard de estoque:', error);
      throw new Error('Falha ao processar dados de estoque');
    }
  }

  async obterAnaliseABC(): Promise<any> {
    return {
      curvaABC: { A: [], B: [], C: [] },
      resumo: { totalProdutos: 0, valorTotalEstoque: 0, produtosA: 0, produtosB: 0, produtosC: 0 }
    };
  }

  async obterControleValidade(): Promise<any> {
    return { alertas: { vencendo: 0, vencidos: 0 }, produtos: [] };
  }

  async obterMovimentacaoEstoque(): Promise<any> {
    return {
      movimentacao: [],
      resumo: { porTipo: [], porProduto: [] },
      estatisticas: { totalMovimentacoes: 0, entradas: 0, saidas: 0 }
    };
  }

  async obterAnaliseGiro(): Promise<any> {
    return {
      giroMedio: [],
      estatisticas: { giroAlto: 0, giroMedioCount: 0, giroBaixo: 0 }
    };
  }
}

export default new RelatoriosService();
