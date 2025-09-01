import { PrismaClient } from '@prisma/client';
import { logger } from '@/shared/utils/logger';

export class DatabaseConnection {
  private static instance: PrismaClient;

  public static async connect(): Promise<PrismaClient> {
    if (!this.instance) {
      this.instance = new PrismaClient({
              log: [
        { level: 'error', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
      });

      // Log das queries removido por conflito de tipos

      try {
        await this.instance.$connect();
        logger.info('🗄️ Prisma conectado ao PostgreSQL');
      } catch (error) {
        logger.error('❌ Erro ao conectar com o banco de dados:', error);
        throw error;
      }
    }

    return this.instance;
  }

  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
      logger.info('🗄️ Prisma desconectado do PostgreSQL');
    }
  }

  public static getClient(): PrismaClient {
    if (!this.instance) {
      throw new Error('Database não inicializado. Chame connect() primeiro.');
    }
    return this.instance;
  }

  public static async healthCheck(): Promise<boolean> {
    try {
      await this.instance.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('❌ Health check do banco falhou:', error);
      return false;
    }
  }
}
