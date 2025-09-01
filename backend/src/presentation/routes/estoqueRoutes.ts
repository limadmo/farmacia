/**
 * Rotas de Estoque - Sistema de Farmácia
 * 
 * Define endpoints REST para gestão de estoque e sincronização offline.
 * Inclui funcionalidades para vendas sem internet.
 */

import { Router } from 'express';
import { EstoqueController } from '../controllers/EstoqueController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requirePermission } from '../middleware/authorizationMiddleware';
import { temPermissaoEstoque } from '@/constants/permissions';
import { TipoUsuario } from '@prisma/client';

const router = Router();
const estoqueController = new EstoqueController();

// Middleware de autenticação e autorização básica para todas as rotas
router.use(authMiddleware);
router.use(requirePermission({ modulo: 'estoque' }));

// Middleware específico para verificar permissões de estoque
const requireEstoquePermission = (operacao: keyof typeof import('@/constants/permissions').PERMISSOES_ESTOQUE) => {
  return (req: any, res: any, next: any) => {
    if (!req.usuario || !temPermissaoEstoque(req.usuario.tipo as TipoUsuario, operacao)) {
      return res.status(403).json({ 
        error: `Acesso negado para operação: ${operacao}`,
        statusCode: 403 
      });
    }
    next();
  };
};

/**
 * @route   POST /api/estoque/movimentacoes
 * @desc    Registra nova movimentação de estoque
 * @access  Private (Farmaceutico, Gerente, Administrador)
 */
router.post(
  '/movimentacoes',
  requireEstoquePermission('movimentacao'),
  estoqueController.registrarMovimentacao.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/movimentacoes
 * @desc    Lista movimentações com filtros
 * @access  Private (Vendedor+)
 * @query   page, limit, produtoId, tipo, usuarioId, dataInicio, dataFim
 */
router.get(
  '/movimentacoes',
  requireEstoquePermission('visualizacao'),
  estoqueController.listarMovimentacoes.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/resumo
 * @desc    Obtém resumo completo do estoque
 * @access  Private (Vendedor+)
 */
router.get(
  '/resumo',
  requireEstoquePermission('visualizacao'),
  estoqueController.obterResumoEstoque.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/baixo
 * @desc    Lista produtos com estoque baixo
 * @access  Private (Vendedor+)
 */
router.get(
  '/baixo',
  requireEstoquePermission('alertas'),
  estoqueController.listarProdutosEstoqueBaixo.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/alertas
 * @desc    Obtém alertas de estoque (baixo, crítico, vencimento)
 * @access  Private (Vendedor+)
 */
router.get(
  '/alertas',
  requireEstoquePermission('alertas'),
  estoqueController.obterAlertasEstoque.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/dashboard
 * @desc    Obtém dados para dashboard de estoque
 * @access  Private (Administrador)
 */
router.get(
  '/dashboard',
  requireEstoquePermission('dashboard'),
  estoqueController.obterDashboardEstoque.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/relatorio
 * @desc    Gera relatório de movimentações por período
 * @access  Private (Gerente, Administrador)
 * @query   dataInicio, dataFim, tipo, produtoId
 */
router.get(
  '/relatorio',
  requireEstoquePermission('relatorios'),
  estoqueController.gerarRelatorioMovimentacoes.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/produtos/vencimento
 * @desc    Lista produtos próximos do vencimento
 * @access  Private (Vendedor+)
 * @query   dias (padrão: 30)
 */
router.get(
  '/produtos/vencimento',
  requireEstoquePermission('alertas'),
  estoqueController.listarProdutosVencimento.bind(estoqueController)
);

/**
 * @route   POST /api/estoque/sincronizar-vendas
 * @desc    Sincroniza vendas realizadas offline
 * @access  Private (Vendedor, Administrador)
 */
router.post(
  '/sincronizar-vendas',
  estoqueController.sincronizarVendasOffline.bind(estoqueController)
);

/**
 * @route   GET /api/estoque/movimentacoes/pendentes
 * @desc    Busca movimentações pendentes de sincronização
 * @access  Private (Administrador)
 */
router.get(
  '/movimentacoes/pendentes',
  estoqueController.buscarMovimentacoesPendentes.bind(estoqueController)
);

/**
 * @route   PATCH /api/estoque/movimentacoes/:id/sincronizar
 * @desc    Marca movimentação como sincronizada
 * @access  Private (Administrador)
 */
router.patch(
  '/movimentacoes/:id/sincronizar',
  estoqueController.marcarComoSincronizada.bind(estoqueController)
);

/**
 * @route   POST /api/estoque/demo/venda-offline
 * @desc    Gera venda offline para demonstração (apenas desenvolvimento)
 * @access  Private (Administrador)
 */
router.post(
  '/demo/venda-offline',
  estoqueController.gerarVendaOfflineDemo.bind(estoqueController)
);

export { router as estoqueRoutes };
