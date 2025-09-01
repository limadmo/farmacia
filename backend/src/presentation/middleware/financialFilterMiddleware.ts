/**
 * Middleware para filtrar dados financeiros sensíveis
 * 
 * Remove informações como preço de custo e margem para usuários não-administradores
 */

import { Request, Response, NextFunction } from 'express';
import { TipoUsuario } from '@prisma/client';
import { filtrarDadosSensiveis } from '@/constants/permissions';

// Estender a interface Request do Express para incluir usuario
declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: string;
        login: string;
        tipo: TipoUsuario;
      };
    }
  }
}

export const financialFilterMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log('🔧 FinancialFilter middleware called');
  // Interceptar a resposta JSON
  const originalJson = res.json;

  res.json = function(data: any) {
    console.log('🔍 FinancialFilter - User tipo:', req.usuario?.tipo, 'TipoUsuario.ADMINISTRADOR:', TipoUsuario.ADMINISTRADOR);
    if (req.usuario && req.usuario.tipo !== TipoUsuario.ADMINISTRADOR) {
      console.log('🚫 Filtering financial data for user type:', req.usuario.tipo);
      // Filtrar dados sensíveis baseado no tipo de resposta
      if (data.produto) {
        // Resposta com um único produto
        data.produto = filtrarDadosSensiveis(data.produto, req.usuario.tipo);
      } else if (data.produtos) {
        // Resposta com array de produtos
        data.produtos = data.produtos.map((produto: any) => 
          filtrarDadosSensiveis(produto, req.usuario!.tipo)
        );
      } else if (Array.isArray(data)) {
        // Resposta que é diretamente um array de produtos
        data = data.map((produto: any) => 
          filtrarDadosSensiveis(produto, req.usuario!.tipo)
        );
      } else if (data.id && data.nome && data.precoVenda) {
        // Resposta que é diretamente um produto
        data = filtrarDadosSensiveis(data, req.usuario.tipo);
      }
    }

    return originalJson.call(this, data);
  };

  next();
};