import { Router } from 'express';
import { ClienteController } from '@/presentation/controllers/ClienteController';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';

const router = Router();
const clienteController = new ClienteController();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// GET /api/clientes - Listar todos os clientes ou buscar por termo
router.get('/', clienteController.listar.bind(clienteController));

// GET /api/clientes/tipos-documento - Obter tipos de documento
router.get('/tipos-documento', clienteController.obterTiposDocumento.bind(clienteController));

// GET /api/clientes/tipos-movimentacao - Obter tipos de movimentação
router.get('/tipos-movimentacao', clienteController.obterTiposMovimentacao.bind(clienteController));

// GET /api/clientes/documento/:documento - Buscar cliente por documento
router.get('/documento/:documento', clienteController.buscarPorDocumento.bind(clienteController));

// GET /api/clientes/:id - Obter cliente por ID
router.get('/:id', clienteController.obterPorId.bind(clienteController));

// POST /api/clientes - Criar novo cliente
router.post('/', clienteController.criar.bind(clienteController));

// PUT /api/clientes/:id - Atualizar cliente
router.put('/:id', clienteController.atualizar.bind(clienteController));

// DELETE /api/clientes/:id - Excluir cliente
router.delete('/:id', clienteController.excluir.bind(clienteController));

// POST /api/clientes/:id/credito - Movimentar crédito do cliente
router.post('/:id/credito', clienteController.movimentarCredito.bind(clienteController));

// GET /api/clientes/:id/historico-credito - Obter histórico de crédito
router.get('/:id/historico-credito', clienteController.obterHistoricoCredito.bind(clienteController));

export { router as clienteRoutes };