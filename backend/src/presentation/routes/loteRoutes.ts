/**
 * Rotas de Lotes - Sistema de Farmácia
 * 
 * Define as rotas HTTP para operações com lotes de medicamentos
 */

import { Router } from 'express';
import { LoteController } from '../controllers/LoteController';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const loteController = new LoteController();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas de consulta
router.get('/', loteController.listarLotes.bind(loteController));
router.get('/vencimento', loteController.listarLotesVencimento.bind(loteController));
router.get('/:id', loteController.buscarLotePorId.bind(loteController));
router.get('/codigo-barras/:codigoBarras', loteController.buscarLotePorCodigoBarras.bind(loteController));
router.get('/produto/:produtoId', loteController.buscarLotesPorProduto.bind(loteController));
router.get('/:loteId/movimentacoes', loteController.buscarMovimentacoes.bind(loteController));

// Rotas de manipulação
router.post('/', loteController.criarLote.bind(loteController));
router.put('/:id', loteController.atualizarLote.bind(loteController));
router.delete('/:id', loteController.removerLote.bind(loteController));

// Rotas de estoque
router.patch('/:id/estoque', loteController.atualizarEstoque.bind(loteController));
router.post('/reservar', loteController.reservarQuantidade.bind(loteController));
router.post('/liberar-reserva', loteController.liberarReserva.bind(loteController));

export { router as loteRoutes };