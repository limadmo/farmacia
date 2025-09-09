// Versão simplificada dos métodos de estoque sem erros
// Para testar se os endpoints funcionam

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class RelatoriosServiceSimple {

  // Dashboard básico de estoque
  async obterDashboardEstoque(): Promise<any> {
    try {
      // Buscar totais básicos do estoque
      const produtos = await prisma.produto.findMany({
        where: { ativo: true },
        select: {
          id: true,
          nome: true,
          estoque: true,
          estoqueMinimo: true,
          precoVenda: true,
          precoCusto: true,
          categoriaAnvisa: true
        }
      });

      // Calcular métricas básicas
      const totalItens = produtos.reduce((sum, p) => sum + p.estoque, 0);
      const valorTotal = produtos.reduce((sum, p) => sum + (p.estoque * Number(p.precoVenda || 0)), 0);
      const valorCusto = produtos.reduce((sum, p) => sum + (p.estoque * Number(p.precoCusto || 0)), 0);
      const estoqueBaixo = produtos.filter(p => p.estoque <= p.estoqueMinimo).length;

      // Agrupar por categoria
      const categoriaMap = new Map<string, any>();
      produtos.forEach(produto => {
        const categoria = produto.categoriaAnvisa || 'Sem categoria';
        if (!categoriaMap.has(categoria)) {
          categoriaMap.set(categoria, {
            categoria,
            quantidade: 0,
            valorEstoque: 0,
            percentual: 0
          });
        }
        const cat = categoriaMap.get(categoria)!;
        cat.quantidade += produto.estoque;
        cat.valorEstoque += produto.estoque * Number(produto.precoVenda || 0);
      });

      const categorias = Array.from(categoriaMap.values()).map(cat => ({
        ...cat,
        percentual: valorTotal > 0 ? (cat.valorEstoque / valorTotal) * 100 : 0
      }));

      return {
        valorTotal,
        valorCusto,
        itensTotal: totalItens,
        alertas: {
          estoqueBaixo,
          vencendo: 0,
          vencidos: 0
        },
        resumo: {
          margemEstimada: valorTotal > 0 ? ((valorTotal - valorCusto) / valorTotal) * 100 : 0,
          valorMedio: produtos.length > 0 ? valorTotal / produtos.length : 0
        },
        categorias: categorias.sort((a, b) => b.valorEstoque - a.valorEstoque),
        movimentacoesRecentes: [] // Vazio por enquanto
      };

    } catch (error) {
      logger.error('Erro ao gerar dashboard de estoque:', error);
      throw error;
    }
  }

  // Análise ABC simplificada
  async obterAnaliseABC(): Promise<any> {
    try {
      const produtos = await prisma.produto.findMany({
        where: { ativo: true },
        select: {
          id: true,
          nome: true,
          estoque: true,
          precoVenda: true,
          categoriaAnvisa: true
        }
      });

      const produtosComValor = produtos.map(produto => ({
        id: produto.id,
        nome: produto.nome,
        categoria: produto.categoriaAnvisa,
        estoque: produto.estoque,
        valorEstoque: produto.estoque * Number(produto.precoVenda || 0),
        faturamento: 0 // Simplificado
      })).sort((a, b) => b.valorEstoque - a.valorEstoque);

      const valorTotalEstoque = produtosComValor.reduce((sum, p) => sum + p.valorEstoque, 0);
      let acumulado = 0;

      const produtosClassificados = produtosComValor.map(produto => {
        acumulado += produto.valorEstoque;
        const percentualAcumulado = valorTotalEstoque > 0 ? (acumulado / valorTotalEstoque) * 100 : 0;
        
        let classificacao = 'C';
        if (percentualAcumulado <= 80) classificacao = 'A';
        else if (percentualAcumulado <= 95) classificacao = 'B';

        return {
          ...produto,
          classificacao,
          percentualAcumulado: Number(percentualAcumulado.toFixed(2))
        };
      });

      const curvaABC = {
        A: produtosClassificados.filter(p => p.classificacao === 'A'),
        B: produtosClassificados.filter(p => p.classificacao === 'B'),
        C: produtosClassificados.filter(p => p.classificacao === 'C')
      };

      return {
        curvaABC,
        resumo: {
          totalProdutos: produtos.length,
          valorTotalEstoque,
          produtosA: curvaABC.A.length,
          produtosB: curvaABC.B.length,
          produtosC: curvaABC.C.length
        }
      };

    } catch (error) {
      logger.error('Erro ao gerar análise ABC:', error);
      throw error;
    }
  }

  // Placeholder para outros métodos
  async obterControleValidade(): Promise<any> {
    return {
      alertas: { vencendo: 0, vencidos: 0 },
      produtos: []
    };
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

export default new RelatoriosServiceSimple();