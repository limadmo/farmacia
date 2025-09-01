import { AuthService } from '@/application/services/AuthService';
import { TipoUsuario } from '@prisma/client';
import { DatabaseConnection } from '@/infrastructure/database/connection';

// Mock das dependências
jest.mock('@/infrastructure/database/connection');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('uuid');
jest.mock('crypto');

describe('UserHierarchy', () => {
  let authService: AuthService;
  let mockPrisma: any;

  beforeEach(() => {
    // Setup do mock do Prisma
    mockPrisma = {
      usuario: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    (DatabaseConnection.getClient as jest.Mock).mockReturnValue(mockPrisma);

    // Setup das variáveis de ambiente
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'test-issuer';
    process.env.JWT_AUDIENCE = 'test-audience';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

    authService = new AuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Type Verification', () => {
    it('should correctly identify admin users', () => {
      expect(authService.isAdmin(TipoUsuario.ADMINISTRADOR)).toBe(true);
      expect(authService.isAdmin(TipoUsuario.GERENTE)).toBe(false);
      expect(authService.isAdmin(TipoUsuario.VENDEDOR)).toBe(false);
    });

    it('should correctly identify manager users', () => {
      expect(authService.isManager(TipoUsuario.GERENTE)).toBe(true);
      expect(authService.isManager(TipoUsuario.ADMINISTRADOR)).toBe(false);
      expect(authService.isManager(TipoUsuario.VENDEDOR)).toBe(false);
    });

    it('should correctly identify pharmacist users', () => {
      expect(authService.isPharmacist(TipoUsuario.FARMACEUTICO)).toBe(true);
      expect(authService.isPharmacist(TipoUsuario.ADMINISTRADOR)).toBe(false);
      expect(authService.isPharmacist(TipoUsuario.VENDEDOR)).toBe(false);
    });

    it('should correctly identify seller users', () => {
      expect(authService.isSeller(TipoUsuario.VENDEDOR)).toBe(true);
      expect(authService.isSeller(TipoUsuario.PDV)).toBe(true);
      expect(authService.isSeller(TipoUsuario.ADMINISTRADOR)).toBe(false);
      expect(authService.isSeller(TipoUsuario.GERENTE)).toBe(false);
    });
  });

  describe('Module Access Control', () => {
    it('should correctly verify module access for different user types', () => {
      expect(authService.hasModuleAccess(TipoUsuario.ADMINISTRADOR, 'usuarios')).toBe(true);
      expect(authService.hasModuleAccess(TipoUsuario.ADMINISTRADOR, 'relatorios')).toBe(true);
      expect(authService.hasModuleAccess(TipoUsuario.GERENTE, 'usuarios')).toBe(true);
      expect(authService.hasModuleAccess(TipoUsuario.GERENTE, 'relatorios')).toBe(false);
      expect(authService.hasModuleAccess(TipoUsuario.VENDEDOR, 'vendas')).toBe(true);
      expect(authService.hasModuleAccess(TipoUsuario.VENDEDOR, 'usuarios')).toBe(false);
    });

    it('should verify user management permissions', () => {
      expect(authService.canManageUsers(TipoUsuario.ADMINISTRADOR)).toBe(true);
      expect(authService.canManageUsers(TipoUsuario.GERENTE)).toBe(true); // GERENTE pode gerenciar usuários
      expect(authService.canManageUsers(TipoUsuario.VENDEDOR)).toBe(false);
    });

    it('should verify report access permissions', () => {
      expect(authService.canAccessReports(TipoUsuario.ADMINISTRADOR)).toBe(true);
      expect(authService.canAccessReports(TipoUsuario.GERENTE)).toBe(false); // Apenas ADMIN tem acesso aos relatórios
      expect(authService.canAccessReports(TipoUsuario.FARMACEUTICO)).toBe(false);
      expect(authService.canAccessReports(TipoUsuario.VENDEDOR)).toBe(false);
    });

    it('should verify stock management permissions', () => {
      expect(authService.canManageStock(TipoUsuario.ADMINISTRADOR)).toBe(true);
      expect(authService.canManageStock(TipoUsuario.GERENTE)).toBe(true);
      expect(authService.canManageStock(TipoUsuario.FARMACEUTICO)).toBe(true);
      expect(authService.canManageStock(TipoUsuario.VENDEDOR)).toBe(true); // VENDEDOR pode acessar estoque
      expect(authService.canManageStock(TipoUsuario.PDV)).toBe(false);
    });
  });

  describe('Hierarchy Level Management', () => {
    it('should return correct hierarchy levels', () => {
      expect(authService.getHierarchyLevel(TipoUsuario.ADMINISTRADOR)).toBe(5);
      expect(authService.getHierarchyLevel(TipoUsuario.GERENTE)).toBe(4);
      expect(authService.getHierarchyLevel(TipoUsuario.FARMACEUTICO)).toBe(3);
      expect(authService.getHierarchyLevel(TipoUsuario.VENDEDOR)).toBe(2);
      expect(authService.getHierarchyLevel(TipoUsuario.PDV)).toBe(1);
    });

    it('should correctly determine user management capabilities', () => {
      // Admin can manage all other types
      expect(authService.canManageUserType(TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE)).toBe(true);
      expect(authService.canManageUserType(TipoUsuario.ADMINISTRADOR, TipoUsuario.VENDEDOR)).toBe(true);
      
      // Manager can manage lower levels
      expect(authService.canManageUserType(TipoUsuario.GERENTE, TipoUsuario.VENDEDOR)).toBe(true);
      expect(authService.canManageUserType(TipoUsuario.GERENTE, TipoUsuario.PDV)).toBe(true);
      
      // Same level cannot manage each other
      expect(authService.canManageUserType(TipoUsuario.VENDEDOR, TipoUsuario.VENDEDOR)).toBe(false);
      expect(authService.canManageUserType(TipoUsuario.PDV, TipoUsuario.PDV)).toBe(false);
      
      // Lower level cannot manage higher level
      expect(authService.canManageUserType(TipoUsuario.VENDEDOR, TipoUsuario.GERENTE)).toBe(false);
      expect(authService.canManageUserType(TipoUsuario.FARMACEUTICO, TipoUsuario.ADMINISTRADOR)).toBe(false);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle invalid user types gracefully', () => {
      // @ts-ignore - Testing invalid enum value
      expect(authService.getHierarchyLevel('INVALID_TYPE' as TipoUsuario)).toBe(0);
      // @ts-ignore - Testing invalid enum value
      expect(authService.hasModuleAccess('INVALID_TYPE' as TipoUsuario, 'Vendas')).toBe(false);
    });

    it('should handle empty or invalid module names', () => {
      expect(authService.hasModuleAccess(TipoUsuario.ADMINISTRADOR, '')).toBe(false);
      expect(authService.hasModuleAccess(TipoUsuario.ADMINISTRADOR, 'ModuloInexistente')).toBe(false);
    });

    it('should ensure case sensitivity in module names', () => {
      expect(authService.hasModuleAccess(TipoUsuario.VENDEDOR, 'vendas')).toBe(true);
      expect(authService.hasModuleAccess(TipoUsuario.VENDEDOR, 'Vendas')).toBe(true); // Convertido para minúscula
      expect(authService.hasModuleAccess(TipoUsuario.VENDEDOR, 'VENDAS')).toBe(true); // Convertido para minúscula
    });
  });
});