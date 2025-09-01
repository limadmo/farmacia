/**
 * Rotas de Compras - Sistema de Farmácia
 * 
 * Define endpoints REST para:
 * - Gestão de pedidos para fornecedores
 * - Recebimento de mercadorias
 * - Conferência manual dos produtos
 * - Aprovação e entrada automática no estoque
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { ComprasController } from '../controllers/ComprasController';
import { authMiddleware } from '../middleware/authMiddleware';
import { autorizar } from '../../shared/middlewares/autorizar';
import { TipoUsuario } from '@prisma/client';
import { StatusPedido, StatusRecebimento } from '../../domain/entities/Compras';

const router = Router();
const comprasController = new ComprasController();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

// ===== ROTAS DE PEDIDOS =====

/**
 * Lista pedidos com filtros
 * GET /api/compras/pedidos
 * Acesso: ADMINISTRADOR e VENDEDOR (consulta)
 */
router.get('/pedidos', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR]),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro maior que 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  query('fornecedorId')
    .optional()
    .isUUID()
    .withMessage('ID do fornecedor deve ser um UUID válido'),
  query('status')
    .optional()
    .isIn(Object.values(StatusPedido))
    .withMessage('Status inválido'),
  query('dataInicio')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar no formato ISO8601'),
  query('dataFim')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar no formato ISO8601'),
  query('numeroPedido')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Número do pedido deve ter entre 1 e 50 caracteres')
], comprasController.listarPedidos.bind(comprasController));

/**
 * Busca pedido por ID
 * GET /api/compras/pedidos/:id
 * Acesso: ADMINISTRADOR e VENDEDOR (consulta)
 */
router.get('/pedidos/:id', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR]),
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido')
], comprasController.buscarPedidoPorId.bind(comprasController));

/**
 * Cria novo pedido
 * POST /api/compras/pedidos
 * Acesso: Apenas ADMINISTRADOR
 */
router.post('/pedidos', [
  autorizar([TipoUsuario.ADMINISTRADOR]),
  body('fornecedorId')
    .isUUID()
    .withMessage('ID do fornecedor deve ser um UUID válido'),
  body('dataPrevisaoEntrega')
    .optional()
    .isISO8601()
    .withMessage('Data de previsão de entrega deve estar no formato ISO8601'),
  body('observacoes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres'),
  body('itens')
    .isArray({ min: 1 })
    .withMessage('Deve haver pelo menos um item no pedido'),
  body('itens.*.produtoId')
    .isUUID()
    .withMessage('ID do produto deve ser um UUID válido'),
  body('itens.*.quantidade')
    .isFloat({ min: 0.01 })
    .withMessage('Quantidade deve ser maior que 0'),
  body('itens.*.precoUnitario')
    .isFloat({ min: 0.01 })
    .withMessage('Preço unitário deve ser maior que 0')
], comprasController.criarPedido.bind(comprasController));

/**
 * Atualiza status do pedido
 * PATCH /api/compras/pedidos/:id/status
 * Acesso: Apenas ADMINISTRADOR
 */
router.patch('/pedidos/:id/status', [
  autorizar([TipoUsuario.ADMINISTRADOR]),
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  body('status')
    .isIn(Object.values(StatusPedido))
    .withMessage('Status inválido')
], comprasController.atualizarStatusPedido.bind(comprasController));

/**
 * Envia pedido para fornecedor
 * PATCH /api/compras/pedidos/:id/enviar
 * Acesso: Apenas ADMINISTRADOR
 */
router.patch('/pedidos/:id/enviar', [
  autorizar([TipoUsuario.ADMINISTRADOR]),
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido')
], comprasController.enviarPedido.bind(comprasController));

/**
 * Cancela pedido
 * PATCH /api/compras/pedidos/:id/cancelar
 * Acesso: Apenas ADMINISTRADOR
 */
router.patch('/pedidos/:id/cancelar', [
  autorizar([TipoUsuario.ADMINISTRADOR]),
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  body('motivoCancelamento')
    .notEmpty()
    .withMessage('Motivo do cancelamento é obrigatório')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Motivo deve ter entre 1 e 500 caracteres')
], comprasController.cancelarPedido.bind(comprasController));

// ===== ROTAS DE RECEBIMENTOS =====

/**
 * Lista recebimentos com filtros
 * GET /api/compras/recebimentos
 * Acesso: ADMINISTRADOR e VENDEDOR (consulta)
 */
router.get('/recebimentos', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR]),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro maior que 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100'),
  query('pedidoId')
    .optional()
    .isUUID()
    .withMessage('ID do pedido deve ser um UUID válido'),
  query('status')
    .optional()
    .isIn(Object.values(StatusRecebimento))
    .withMessage('Status inválido'),
  query('dataInicio')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar no formato ISO8601'),
  query('dataFim')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar no formato ISO8601'),
  query('numeroNotaFiscal')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Número da nota fiscal deve ter entre 1 e 50 caracteres')
], comprasController.listarRecebimentos.bind(comprasController));

/**
 * Busca recebimento por ID
 * GET /api/compras/recebimentos/:id
 * Acesso: ADMINISTRADOR e VENDEDOR (consulta)
 */
router.get('/recebimentos/:id', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR]),
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido')
], comprasController.buscarRecebimentoPorId.bind(comprasController));

/**
 * Cria recebimento de mercadoria
 * POST /api/compras/recebimentos
 * Acesso: Apenas ADMINISTRADOR
 */
router.post('/recebimentos', [
  autorizar([TipoUsuario.ADMINISTRADOR]),
  body('pedidoId')
    .isUUID()
    .withMessage('ID do pedido deve ser um UUID válido'),
  body('numeroNotaFiscal')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Número da nota fiscal deve ter entre 1 e 50 caracteres'),
  body('dataEmissaoNF')
    .isISO8601()
    .withMessage('Data de emissão da NF deve estar no formato ISO8601'),
  body('valorTotalNF')
    .isFloat({ min: 0.01 })
    .withMessage('Valor total da NF deve ser maior que 0'),
  body('observacoes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres'),
  body('itensRecebidos')
    .isArray({ min: 1 })
    .withMessage('Deve haver pelo menos um item recebido'),
  body('itensRecebidos.*.itemPedidoId')
    .isUUID()
    .withMessage('ID do item do pedido deve ser um UUID válido'),
  body('itensRecebidos.*.quantidadeRecebida')
    .isFloat({ min: 0.01 })
    .withMessage('Quantidade recebida deve ser maior que 0'),
  body('itensRecebidos.*.precoUnitario')
    .isFloat({ min: 0.01 })
    .withMessage('Preço unitário deve ser maior que 0'),
  body('itensRecebidos.*.lote')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Lote deve ter entre 1 e 50 caracteres'),
  body('itensRecebidos.*.dataVencimento')
    .optional()
    .isISO8601()
    .withMessage('Data de vencimento deve estar no formato ISO8601')
], comprasController.criarRecebimento.bind(comprasController));

// ===== ROTAS DE CONFERÊNCIAS =====

/**
 * Lista conferências pendentes
 * GET /api/compras/conferencias/pendentes
 * Acesso: ADMINISTRADOR e VENDEDOR (consulta)
 */
router.get('/conferencias/pendentes', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR]),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro maior que 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número entre 1 e 100')
], comprasController.listarConferenciasPendentes.bind(comprasController));

/**
 * Busca conferência por ID
 * GET /api/compras/conferencias/:id
 * Acesso: ADMINISTRADOR e VENDEDOR (consulta)
 */
router.get('/conferencias/:id', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR]),
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido')
], comprasController.buscarConferenciaPorId.bind(comprasController));

/**
 * Inicia conferência de mercadoria
 * POST /api/compras/conferencias
 * Acesso: ADMINISTRADOR e VENDEDOR (operação)
 */
router.post('/conferencias', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR]),
  body('recebimentoId')
    .isUUID()
    .withMessage('ID do recebimento deve ser um UUID válido'),
  body('observacoes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Observações devem ter no máximo 500 caracteres'),
  body('itensConferidos')
    .isArray({ min: 1 })
    .withMessage('Deve haver pelo menos um item conferido'),
  body('itensConferidos.*.itemRecebimentoId')
    .isUUID()
    .withMessage('ID do item do recebimento deve ser um UUID válido'),
  body('itensConferidos.*.quantidadeConferida')
    .isFloat({ min: 0 })
    .withMessage('Quantidade conferida deve ser maior ou igual a 0')
], comprasController.iniciarConferencia.bind(comprasController));

/**
 * Aprova ou rejeita conferência
 * PATCH /api/compras/conferencias/:id/aprovar
 * Acesso: Apenas ADMINISTRADOR
 */
router.patch('/conferencias/:id/aprovar', [
  autorizar([TipoUsuario.ADMINISTRADOR]),
  param('id')
    .isUUID()
    .withMessage('ID deve ser um UUID válido'),
  body('aprovado')
    .isBoolean()
    .withMessage('Campo aprovado deve ser um boolean'),
  body('motivoRejeicao')
    .if(body('aprovado').equals('false'))
    .notEmpty()
    .withMessage('Motivo da rejeição é obrigatório quando não aprovado')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Motivo da rejeição deve ter entre 1 e 500 caracteres'),
  body('ajustesItens')
    .optional()
    .isArray()
    .withMessage('Ajustes de itens deve ser um array'),
  body('ajustesItens.*.itemRecebimentoId')
    .if(body('ajustesItens').exists())
    .isUUID()
    .withMessage('ID do item do recebimento deve ser um UUID válido'),
  body('ajustesItens.*.quantidadeAprovada')
    .if(body('ajustesItens').exists())
    .isFloat({ min: 0 })
    .withMessage('Quantidade aprovada deve ser maior ou igual a 0')
], comprasController.aprovarConferencia.bind(comprasController));

// ===== ROTAS DE DASHBOARD =====

/**
 * Dashboard de compras
 * GET /api/compras/dashboard
 * Acesso: ADMINISTRADOR e VENDEDOR (consulta)
 */
router.get('/dashboard', [
  autorizar([TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR])
], comprasController.obterDashboardCompras.bind(comprasController));

export { router as comprasRoutes };