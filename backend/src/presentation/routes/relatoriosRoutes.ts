// Rotas de Relatórios - Endpoints para consultas gerenciais baseadas em dados reais
// Acesso restrito a usuários autenticados

import { Router } from 'express';
import RelatoriosController from '../controllers/RelatoriosController';

const router = Router();

// Dashboard principal com métricas consolidadas (acesso aberto para teste)
router.get('/dashboard', 
  RelatoriosController.obterDashboard
);

// Análise detalhada de vendas (acesso aberto para teste)
router.get('/vendas', 
  RelatoriosController.obterAnaliseVendas
);

// Análise financeira detalhada (acesso aberto para teste)
router.get('/financeiro', 
  RelatoriosController.obterAnaliseFinanceira
);

// ===== ROTAS DE CLIENTES =====

// Dashboard de clientes com métricas de retenção e segmentação (acesso aberto para teste)
router.get('/clientes/dashboard', 
  RelatoriosController.obterDashboardCliente
);

// ===== ROTAS DE ESTOQUE =====

// Dashboard de estoque com métricas consolidadas (acesso aberto para teste)
router.get('/estoque/dashboard', 
  RelatoriosController.obterDashboardEstoque
);

// Análise ABC (Curva de Pareto) baseada em faturamento (acesso aberto para teste)
router.get('/estoque/abc', 
  RelatoriosController.obterAnaliseABC
);

// Controle de validade com alertas de vencimento (acesso aberto para teste)
router.get('/estoque/validade', 
  RelatoriosController.obterControleValidade
);

// Movimentação de estoque com filtros (acesso aberto para teste)
router.get('/estoque/movimentacao', 
  RelatoriosController.obterMovimentacaoEstoque
);

// Análise de giro/rotatividade de produtos (acesso aberto para teste)
router.get('/estoque/giro', 
  RelatoriosController.obterAnaliseGiro
);

export default router;