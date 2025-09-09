/**
 * Rotas de Dupla Leitura - Sistema de Farmácia
 * 
 * Define as rotas HTTP para o sistema de dupla leitura de código de barras
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { DuplaLeituraController } from '../controllers/DuplaLeituraController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();
const duplaLeituraController = new DuplaLeituraController(prisma);

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

/**
 * POST /api/dupla-leitura/iniciar
 * Inicia uma nova sessão de dupla leitura
 */
router.post('/iniciar', duplaLeituraController.iniciarSessao);

/**
 * POST /api/dupla-leitura/:sessionId/ler
 * Processa a leitura de um código de barras
 */
router.post('/:sessionId/ler', duplaLeituraController.processarLeitura);

/**
 * GET /api/dupla-leitura/:sessionId
 * Obtém informações de uma sessão
 */
router.get('/:sessionId', duplaLeituraController.obterSessao);

/**
 * POST /api/dupla-leitura/:sessionId/finalizar
 * Finaliza uma sessão
 */
router.post('/:sessionId/finalizar', duplaLeituraController.finalizarSessao);

/**
 * POST /api/dupla-leitura/:sessionId/cancelar
 * Cancela uma sessão
 */
router.post('/:sessionId/cancelar', duplaLeituraController.cancelarSessao);

/**
 * POST /api/dupla-leitura/:sessionId/validar
 * Valida se uma sessão está completa
 */
router.post('/:sessionId/validar', duplaLeituraController.validarSessao);

/**
 * GET /api/dupla-leitura/sessoes
 * Lista todas as sessões ativas (para admin/debug)
 * Requer permissão de administrador
 */
router.get('/sessoes', duplaLeituraController.listarSessoesAtivas);

export default router;