/**
 * Rotas de Auditoria Inteligente - Sistema de Farmácia
 * 
 * Endpoints para auditoria de vendas de medicamentos controlados
 * com recursos inteligentes de densidade temporal e marcos importantes.
 * Acesso restrito a farmacêuticos, gerentes e administradores.
 */

import { Router } from 'express';
import { AuditoriaController } from '@/presentation/controllers/AuditoriaController';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';
import { requireControlledSalesAudit, requireAuditReports } from '@/presentation/middleware/authorizationMiddleware';

const router = Router();
const auditoriaController = new AuditoriaController();

// Middleware de autenticação obrigatório para todas as rotas
router.use(authMiddleware);

// Middleware de permissão para auditoria (FARMACEUTICO, GERENTE, ADMINISTRADOR)
router.use(requireControlledSalesAudit);

/**
 * @route GET /auditoria/vendas-controladas
 * @desc Lista vendas de medicamentos controlados com filtros
 * @access FARMACEUTICO, GERENTE, ADMINISTRADOR
 * @query dataInicio, dataFim, vendedorId, numeroReceita, tipoUsuario, apenasVendasAssistidas, comReceita
 */
router.get('/vendas-controladas', auditoriaController.listarVendasControladas.bind(auditoriaController));

/**
 * @route GET /auditoria/resumo
 * @desc Obtém resumo estatístico das vendas controladas
 * @access FARMACEUTICO, GERENTE, ADMINISTRADOR
 * @query dataInicio, dataFim
 */
router.get('/resumo', auditoriaController.obterResumoAuditoria.bind(auditoriaController));

/**
 * @route GET /auditoria/vendas-controladas/:id
 * @desc Obtém detalhes completos de uma venda controlada específica
 * @access FARMACEUTICO, GERENTE, ADMINISTRADOR
 */
router.get('/vendas-controladas/:id', auditoriaController.obterDetalhesVenda.bind(auditoriaController));

/**
 * @route GET /auditoria/vendedores
 * @desc Lista vendedores que realizaram vendas controladas no período
 * @access FARMACEUTICO, GERENTE, ADMINISTRADOR
 * @query dataInicio, dataFim
 */
router.get('/vendedores', auditoriaController.obterVendedoresComControlados.bind(auditoriaController));

/**
 * @route GET /auditoria/relatorio
 * @desc Exporta relatório completo de auditoria
 * @access GERENTE, ADMINISTRADOR (mais restritivo)
 * @query dataInicio, dataFim, formato
 */
router.get('/relatorio', 
  requireAuditReports,
  auditoriaController.exportarRelatorioAuditoria.bind(auditoriaController)
);

/**
 * @route GET /auditoria/densidade-temporal
 * @desc Obtém dados de densidade temporal para visualização de timeline
 * @access FARMACEUTICO, GERENTE, ADMINISTRADOR
 * @query dataInicio, dataFim
 */
router.get('/densidade-temporal', auditoriaController.obterDensidadeTemporal.bind(auditoriaController));

/**
 * @route GET /auditoria/marcos-importantes
 * @desc Obtém marcos importantes para timeline
 * @access FARMACEUTICO, GERENTE, ADMINISTRADOR
 * @query dataInicio, dataFim
 */
router.get('/marcos-importantes', auditoriaController.obterMarcosImportantes.bind(auditoriaController));

/**
 * @route GET /auditoria/sugestoes-filtros
 * @desc Obtém sugestões inteligentes para filtros
 * @access FARMACEUTICO, GERENTE, ADMINISTRADOR
 */
router.get('/sugestoes-filtros', auditoriaController.obterSugestoesFiltros.bind(auditoriaController));

export default router;