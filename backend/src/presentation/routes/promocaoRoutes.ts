/**
 * Rotas de Promoções - Sistema de Farmácia
 * 
 * Define endpoints REST para gestão de promoções de produtos.
 * Inclui autenticação, autorização e validações.
 */

import { Router } from 'express';
import { PromocaoController } from '@/presentation/controllers/PromocaoController';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';

const router = Router();
const promocaoController = new PromocaoController();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

/**
 * @route   GET /api/promocoes
 * @desc    Lista promoções com filtros e paginação
 * @access  Private (Vendedor, Administrador)
 * @query   page, limit, search, produtoId, tipo, ativo, vigentes, disponiveis
 */
router.get(
  '/',
  promocaoController.listarPromocoes.bind(promocaoController)
);

/**
 * @route   GET /api/promocoes/vigentes
 * @desc    Lista promoções vigentes (ativas e dentro do período)
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/vigentes',
  promocaoController.listarPromocoesVigentes.bind(promocaoController)
);

/**
 * @route   GET /api/promocoes/aplicaveis
 * @desc    Busca todas as promoções aplicáveis (produto, laboratório, lote)
 * @access  Private (Vendedor, Administrador)
 * @query   produtoId, laboratorio, loteId
 */
router.get(
  '/aplicaveis',
  promocaoController.buscarPromocoesAplicaveis.bind(promocaoController)
);

/**
 * @route   GET /api/promocoes/produto/:produtoId
 * @desc    Busca promoções ativas para um produto específico
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/produto/:produtoId',
  promocaoController.buscarPromocoesPorProduto.bind(promocaoController)
);

/**
 * @route   GET /api/promocoes/lotes/:produtoId
 * @desc    Lista lotes disponíveis para aplicação de promoção em um produto
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/lotes/:produtoId',
  promocaoController.listarLotesDisponiveis.bind(promocaoController)
);

/**
 * @route   GET /api/promocoes/:id
 * @desc    Busca promoção por ID
 * @access  Private (Vendedor, Administrador)
 */
router.get(
  '/:id',
  promocaoController.buscarPromocaoPorId.bind(promocaoController)
);

/**
 * @route   POST /api/promocoes
 * @desc    Cria nova promoção
 * @access  Private (Administrador)
 */
router.post(
  '/',
  promocaoController.criarPromocao.bind(promocaoController)
);

/**
 * @route   PUT /api/promocoes/:id
 * @desc    Atualiza promoção existente
 * @access  Private (Administrador)
 */
router.put(
  '/:id',
  promocaoController.atualizarPromocao.bind(promocaoController)
);

/**
 * @route   DELETE /api/promocoes/:id
 * @desc    Remove promoção (soft delete)
 * @access  Private (Administrador)
 */
router.delete(
  '/:id',
  promocaoController.removerPromocao.bind(promocaoController)
);

/**
 * @route   PATCH /api/promocoes/:id/incrementar-vendida
 * @desc    Incrementa quantidade vendida da promoção
 * @access  Private (Vendedor, Administrador)
 */
router.patch(
  '/:id/incrementar-vendida',
  promocaoController.incrementarQuantidadeVendida.bind(promocaoController)
);

export { router as promocaoRoutes };