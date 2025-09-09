/**
 * Rotas de Fornecedores - Sistema de Farmácia
 * 
 * Define todas as rotas relacionadas a fornecedores, produtos
 * de fornecedores e notas fiscais.
 */

import { Router } from 'express';
import { FornecedorController } from '../controllers/FornecedorController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireModulePermission } from '../middleware/authorizationMiddleware';

const router = Router();
const fornecedorController = new FornecedorController();

// Middleware de autenticação e autorização para todas as rotas
router.use(authMiddleware);
router.use(requireModulePermission('fornecedores')); // Permite ADMINISTRADOR e GERENTE

/**
 * @route GET /api/fornecedores
 * @desc Lista fornecedores com paginação e filtros
 * @access Administrador e Gerente
 * @query page, limit, search, ativo
 */
router.get('/', (req, res) => {
  fornecedorController.listarFornecedores(req, res);
});

/**
 * @route GET /api/fornecedores/:id
 * @desc Busca fornecedor por ID
 * @access Administrador e Gerente
 * @param id - ID do fornecedor
 */
router.get('/:id', (req, res) => {
  fornecedorController.buscarFornecedorPorId(req, res);
});

/**
 * @route GET /api/fornecedores/cnpj/:cnpj
 * @desc Busca fornecedor por CNPJ
 * @access Administrador e Gerente
 * @param cnpj - CNPJ do fornecedor
 */
router.get('/cnpj/:cnpj', (req, res) => {
  fornecedorController.buscarFornecedorPorCNPJ(req, res);
});

/**
 * @route POST /api/fornecedores
 * @desc Cria novo fornecedor
 * @access Administrador e Gerente
 * @body { nome, cnpj, email?, telefone?, endereco?, ativo? }
 */
router.post('/', (req, res) => {
  fornecedorController.criarFornecedor(req, res);
});

/**
 * @route PUT /api/fornecedores/:id
 * @desc Atualiza fornecedor
 * @access Administrador e Gerente
 * @param id - ID do fornecedor
 * @body { nome?, cnpj?, email?, telefone?, endereco?, ativo? }
 */
router.put('/:id', (req, res) => {
  fornecedorController.atualizarFornecedor(req, res);
});

/**
 * @route DELETE /api/fornecedores/:id
 * @desc Remove fornecedor (soft delete)
 * @access Administrador e Gerente
 * @param id - ID do fornecedor
 */
router.delete('/:id', (req, res) => {
  fornecedorController.removerFornecedor(req, res);
});

/**
 * @route PUT /api/fornecedores/:id/reativar
 * @desc Reativa fornecedor (desfaz soft delete)
 * @access Administrador e Gerente
 * @param id - ID do fornecedor
 */
router.put('/:id/reativar', (req, res) => {
  fornecedorController.reativarFornecedor(req, res);
});

/**
 * @route GET /api/fornecedores/:id/produtos
 * @desc Lista produtos de um fornecedor
 * @access Administrador e Gerente
 * @param id - ID do fornecedor
 * @query ativo
 */
router.get('/:id/produtos', (req, res) => {
  fornecedorController.listarProdutosFornecedor(req, res);
});

/**
 * @route POST /api/fornecedores/:id/produtos
 * @desc Adiciona produto ao fornecedor
 * @access Administrador e Gerente
 * @param id - ID do fornecedor
 * @body { produtoId, precoCusto, prazoEntrega, ativo? }
 */
router.post('/:id/produtos', (req, res) => {
  fornecedorController.adicionarProdutoFornecedor(req, res);
});

/**
 * @route POST /api/fornecedores/:id/notas-fiscais
 * @desc Registra nota fiscal
 * @access Administrador e Gerente
 * @param id - ID do fornecedor
 * @body { numero, serie, chaveAcesso?, valorTotal, dataEmissao }
 */
router.post('/:id/notas-fiscais', (req, res) => {
  fornecedorController.registrarNotaFiscal(req, res);
});

export { router as fornecedorRoutes };
