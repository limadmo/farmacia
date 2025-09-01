import { Application } from 'express';
import authRoutes from './authRoutes';
import usuarioRoutes from './usuarioRoutes';
import { fornecedorRoutes } from './fornecedorRoutes';
import { produtoRoutes } from './produtoRoutes';
import { estoqueRoutes } from './estoqueRoutes';
import { vendaRoutes } from './vendaRoutes';
import duplaLeituraRoutes from './duplaLeituraRoutes';
import { loteRoutes } from './loteRoutes';
import { comprasRoutes } from './comprasRoutes';
import { clienteRoutes } from './clienteRoutes';
import { promocaoRoutes } from './promocaoRoutes';
import auditoriaRoutes from './auditoriaRoutes';


export const setupRoutes = (app: Application): void => {
  // Prefixo para todas as rotas da API
  const apiPrefix = '/api';

  // Health check já está definido no server.ts

  // Rotas de autenticação
  app.use(`${apiPrefix}/auth`, authRoutes);

  // Rotas de usuários
  app.use(`${apiPrefix}/usuarios`, usuarioRoutes);

  // Rotas de fornecedores
  app.use(`${apiPrefix}/fornecedores`, fornecedorRoutes);

  // Rotas de produtos
  app.use(`${apiPrefix}/produtos`, produtoRoutes);

  // Rotas de estoque
  app.use(`${apiPrefix}/estoque`, estoqueRoutes);

  // Rotas de vendas
  app.use(`${apiPrefix}/vendas`, vendaRoutes);

  // Rotas de dupla leitura
  app.use(`${apiPrefix}/dupla-leitura`, duplaLeituraRoutes);

  // Rotas de lotes
  app.use(`${apiPrefix}/lotes`, loteRoutes);

  // Rotas de compras
  app.use(`${apiPrefix}/compras`, comprasRoutes);

  // Rotas de clientes
  app.use(`${apiPrefix}/clientes`, clienteRoutes);

  // Rotas de promoções
  app.use(`${apiPrefix}/promocoes`, promocaoRoutes);

  // Rotas de auditoria
  app.use(`${apiPrefix}/auditoria`, auditoriaRoutes);

  // TODO: Adicionar outras rotas dos módulos
  // app.use(`${apiPrefix}/relatorios`, relatorioRoutes);

  // Middleware para capturar rotas não encontradas (404)
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint não encontrado',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
    });
  });
};
