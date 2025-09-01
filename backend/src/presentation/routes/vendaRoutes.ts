/**
 * Rotas de Vendas - Sistema de Farmácia
 * 
 * Define endpoints REST para operações de vendas.
 */

import { Router } from 'express';
import { VendaController } from '@/presentation/controllers/VendaController';
import { authMiddleware } from '@/presentation/middleware/authMiddleware';
import { requirePermission } from '@/presentation/middleware/authorizationMiddleware';
import { TipoUsuario } from '@prisma/client';

const vendaRoutes = Router();
const vendaController = new VendaController();

// Middleware de autenticação para todas as rotas
vendaRoutes.use(authMiddleware);

// Criar nova venda
vendaRoutes.post(
  '/',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV] }),
  VendaController.validarCriarVenda(),
  vendaController.criarVenda.bind(vendaController)
);

// Listar vendas com filtros e paginação
vendaRoutes.get(
  '/',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV] }),
  vendaController.listarVendas.bind(vendaController)
);

// Buscar venda por ID
vendaRoutes.get(
  '/:id',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV] }),
  vendaController.buscarVendaPorId.bind(vendaController)
);

// Atualizar venda
vendaRoutes.patch(
  '/:id',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR] }),
  VendaController.validarAtualizarVenda(),
  vendaController.atualizarVenda.bind(vendaController)
);

// Cancelar venda
vendaRoutes.post(
  '/:id/cancelar',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE] }),
  vendaController.cancelarVenda.bind(vendaController)
);

// Finalizar pagamento
vendaRoutes.post(
  '/:id/finalizar-pagamento',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV] }),
  vendaController.finalizarPagamento.bind(vendaController)
);

// Registrar arquivamento de receita
vendaRoutes.post(
  '/:id/arquivar-receita',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV] }),
  vendaController.registrarArquivamentoReceita.bind(vendaController)
);

// Relatório de vendas
vendaRoutes.get(
  '/relatorios/vendas',
  requirePermission({ tiposPermitidos: [TipoUsuario.ADMINISTRADOR] }),
  vendaController.gerarRelatorioVendas.bind(vendaController)
);

export { vendaRoutes };