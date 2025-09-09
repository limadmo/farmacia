/**
 * Rotas de Produtos - Sistema de Farmácia
 * 
 * Define endpoints REST para gestão de produtos farmacêuticos.
 * Inclui autenticação, autorização e validações.
 */

import { Router } from 'express';
import { ProdutoController } from '@/presentation/controllers/ProdutoController';
import { LoteController } from '@/presentation/controllers/LoteController';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';
import { requirePermission } from '@/presentation/middleware/authorizationMiddleware';
import { financialFilterMiddleware } from '@/presentation/middleware/financialFilterMiddleware';

const router = Router();
const produtoController = new ProdutoController();
const loteController = new LoteController();

// Middleware de autenticação e autorização para todas as rotas
router.use(authMiddleware);
router.use(requirePermission({ modulo: 'produtos' })); // Verificar acesso ao módulo produtos
router.use(financialFilterMiddleware); // Filtrar dados financeiros sensíveis

/**
 * @route   GET /api/produtos/categorias
 * @desc    Lista todas as categorias ativas
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/categorias',
  produtoController.listarCategorias.bind(produtoController)
);

/**
 * @route   GET /api/produtos/estoque-baixo
 * @desc    Lista produtos com estoque baixo
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/estoque-baixo',
  produtoController.listarProdutosEstoqueBaixo.bind(produtoController)
);

/**
 * @route   GET /api/produtos
 * @desc    Lista produtos com filtros e paginação
 * @access  Private (Vendedor, Administrador)
 * @query   page, limit, search, categoriaId, classificacaoAnvisa, exigeReceita, ativo, estoqueMinimo
 */
router.get(
  '/',
  produtoController.listarProdutos.bind(produtoController)
);

router.get(
  '/codigo-barras/:codigoBarras',
  produtoController.buscarProdutoPorCodigoBarras.bind(produtoController)
);

/**
 * @route   GET /api/produtos/buscar/:termo
 * @desc    Busca produto por código de barras, nome ou princípio ativo
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/buscar/:termo',
  produtoController.buscarProdutoPorTermo.bind(produtoController)
);

/**
 * @route   GET /api/produtos/:id/lotes
 * @desc    Lista lotes disponíveis de um produto específico
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/:id/lotes',
  loteController.buscarLotesPorProduto.bind(loteController)
);

router.get(
  '/:id',
  produtoController.buscarProdutoPorId.bind(produtoController)
);

router.post(
  '/',
  produtoController.criarProduto.bind(produtoController)
);

router.put(
  '/:id',
  produtoController.atualizarProduto.bind(produtoController)
);

router.delete(
  '/:id',
  produtoController.removerProduto.bind(produtoController)
);

router.patch(
  '/:id/estoque',
  produtoController.atualizarEstoque.bind(produtoController)
);

export { router as produtoRoutes };
