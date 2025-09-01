import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { logger } from '@/shared/utils/logger';
import { errorHandler } from '@/presentation/middleware/errorHandler';
import { requestLogger } from '@/presentation/middleware/requestLogger';
import { setupRoutes } from '@/presentation/routes';
import { DatabaseConnection } from '@/infrastructure/database/connection';

class App {
  public express: express.Application;
  private readonly port: number;

  constructor() {
    this.express = express();
    this.port = Number(process.env.PORT) || 3001;
    
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    // Segurança
    this.express.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.express.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Compressão
    this.express.use(compression());

    // Rate limiting - configuração mais permissiva para desenvolvimento
    const limiter = rateLimit({
      windowMs: (Number(process.env.RATE_LIMIT_WINDOW) || 5) * 60 * 1000, // 5 minutos
      max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Muito mais permissivo
      message: {
        error: 'Muitas requisições deste IP, tente novamente em alguns minutos.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Desabilitar rate limiting em desenvolvimento
      skip: (req) => process.env.NODE_ENV === 'development',
    });
    this.express.use('/api/', limiter);

    // Body parsing
    this.express.use(express.json({ limit: '10mb' }));
    this.express.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Desabilitar cache em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      this.express.use((req, res, next) => {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'ETag': false
        });
        next();
      });
    }

    // Logging das requisições
    this.express.use(requestLogger);

    // Health check
    this.express.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
      });
    });
  }

  private setupRoutes(): void {
    // Configurar rotas da API
    setupRoutes(this.express);
  }

  private setupErrorHandling(): void {
    // 404 handler apenas para rotas /api
    this.express.use('/api/*', (req, res) => {
      res.status(404).json({
        error: 'API endpoint não encontrado',
        path: req.originalUrl,
        method: req.method,
      });
    });

    // Error handler global
    this.express.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Conectar ao banco de dados
      await DatabaseConnection.connect();
      logger.info('✅ Conexão com banco de dados estabelecida');

      // Iniciar servidor
      this.express.listen(this.port, () => {
        logger.info(`🚀 Servidor rodando na porta ${this.port}`);
        logger.info(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
        logger.info(`🔧 Environment: ${process.env.NODE_ENV}`);
        logger.info(`📊 Health check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      logger.error('❌ Erro ao iniciar servidor:', error);
      process.exit(1);
    }
  }
}

// Inicializar aplicação
const app = new App();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('🛑 SIGTERM recebido, encerrando servidor...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 SIGINT recebido, encerrando servidor...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

// Tratar erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Iniciar servidor
app.start().catch((error) => {
  logger.error('❌ Falha ao iniciar aplicação:', error);
  process.exit(1);
});

export default app;
