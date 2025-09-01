import bcrypt from 'bcryptjs';
import { UsuarioService } from '@/application/services/UsuarioService';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { BusinessError, NotFoundError, ValidationError } from '@/presentation/middleware/errorHandler';
import { TipoUsuario } from '@prisma/client';

// Mock do bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
import {
  testUsers,
  mockPrismaClient,
  resetAllMocks,
  expectUserStructure,
} from '../../helpers/testHelpers.helper';

// Mock do DatabaseConnection
jest.mock('@/infrastructure/database/connection');
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<typeof DatabaseConnection>;

describe('UsuarioService', () => {
  let usuarioService: UsuarioService;

  beforeEach(() => {
    resetAllMocks();
    (mockBcrypt.hash as jest.Mock).mockResolvedValue('$2b$12$hashedPassword');
    (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);
    usuarioService = new UsuarioService();
    mockDatabaseConnection.getClient.mockReturnValue(mockPrismaClient as any);
  });

  describe('listarTodos', () => {
    it('deve listar todos os usuários', async () => {
      // Arrange
      const mockUsers = [testUsers.admin, testUsers.vendedor];
      mockPrismaClient.usuario.findMany.mockResolvedValue(mockUsers);

      // Act
      const result = await usuarioService.listarTodos();

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaClient.usuario.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { criadoEm: 'desc' },
      });
      
      result.forEach(user => {
        expectUserStructure(user);
      });
    });

    it('deve retornar lista vazia quando não há usuários', async () => {
      // Arrange
      mockPrismaClient.usuario.findMany.mockResolvedValue([]);

      // Act
      const result = await usuarioService.listarTodos();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('obterPorId', () => {
    it('deve retornar usuário existente', async () => {
      // Arrange
      const usuarioId = testUsers.admin.id;
      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.admin);

      // Act
      const result = await usuarioService.obterPorId(usuarioId);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.id).toBe(usuarioId);
      expectUserStructure(result!);
      expect(mockPrismaClient.usuario.findUnique).toHaveBeenCalledWith({
        where: { id: usuarioId },
      });
    });

    it('deve retornar null para usuário inexistente', async () => {
      // Arrange
      const usuarioId = 'usuario-inexistente';
      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);

      // Act
      const result = await usuarioService.obterPorId(usuarioId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('criar', () => {
    it('deve criar usuário com dados válidos', async () => {
      // Arrange
      const dadosUsuario = {
        nome: 'Novo Usuario',
        login: 'novousuario',
        senha: 'senha123',
        tipo: TipoUsuario.VENDEDOR,
      };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(null); // Login disponível
      mockPrismaClient.usuario.create.mockResolvedValue({
        ...testUsers.vendedor,
        nome: dadosUsuario.nome,
        login: dadosUsuario.login,
      });

      // Act
      const result = await usuarioService.criar(dadosUsuario);

      // Assert
      expect(result.nome).toBe(dadosUsuario.nome);
      expect(result.login).toBe(dadosUsuario.login);
      expectUserStructure(result);
      
      expect(mockPrismaClient.usuario.create).toHaveBeenCalledWith({
        data: {
          nome: dadosUsuario.nome,
          login: dadosUsuario.login,
          senhaHash: expect.any(String),
          tipo: dadosUsuario.tipo,
        },
      });
    });

    it('deve rejeitar senha muito curta', async () => {
      // Arrange
      const dadosUsuario = {
        nome: 'Usuario Teste',
        login: 'teste',
        senha: '123',
        tipo: TipoUsuario.VENDEDOR,
      };

      // Act & Assert
      await expect(usuarioService.criar(dadosUsuario)).rejects.toThrow(ValidationError);
      expect(mockPrismaClient.usuario.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar login muito curto', async () => {
      // Arrange
      const dadosUsuario = {
        nome: 'Usuario Teste',
        login: 'ab',
        senha: 'senha123',
        tipo: TipoUsuario.VENDEDOR,
      };

      // Act & Assert
      await expect(usuarioService.criar(dadosUsuario)).rejects.toThrow(ValidationError);
      expect(mockPrismaClient.usuario.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar login já existente', async () => {
      // Arrange
      const dadosUsuario = {
        nome: 'Usuario Teste',
        login: 'admin',
        senha: 'senha123',
        tipo: TipoUsuario.VENDEDOR,
      };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.admin);

      // Act & Assert
      await expect(usuarioService.criar(dadosUsuario)).rejects.toThrow(BusinessError);
      expect(mockPrismaClient.usuario.create).not.toHaveBeenCalled();
    });

    it('deve criptografar a senha do usuário', async () => {
      // Arrange
      const dadosUsuario = {
        nome: 'Usuario Teste',
        login: 'novousuario',
        senha: 'senha123',
        tipo: TipoUsuario.VENDEDOR,
      };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);
      mockPrismaClient.usuario.create.mockResolvedValue(testUsers.vendedor);

      // Act
      await usuarioService.criar(dadosUsuario);

      // Assert
      const createCall = mockPrismaClient.usuario.create.mock.calls[0][0];
      expect(createCall.data.senhaHash).not.toBe(dadosUsuario.senha);
      expect(createCall.data.senhaHash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });
  });

  describe('atualizar', () => {
    it('deve atualizar usuário existente', async () => {
      // Arrange
      const usuarioId = testUsers.vendedor.id;
      const dadosAtualizacao = {
        nome: 'Nome Atualizado',
        tipo: TipoUsuario.ADMINISTRADOR,
        ativo: false,
      };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.vendedor);
      mockPrismaClient.usuario.update.mockResolvedValue({
        ...testUsers.vendedor,
        ...dadosAtualizacao,
      });

      // Act
      const result = await usuarioService.atualizar(usuarioId, dadosAtualizacao);

      // Assert
      expect(result.nome).toBe(dadosAtualizacao.nome);
      expect(result.tipo).toBe(dadosAtualizacao.tipo);
      expect(result.ativo).toBe(dadosAtualizacao.ativo);
      
      expect(mockPrismaClient.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioId },
        data: dadosAtualizacao,
      });
    });

    it('deve rejeitar atualização de usuário inexistente', async () => {
      // Arrange
      const usuarioId = 'usuario-inexistente';
      const dadosAtualizacao = { nome: 'Nome Novo' };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usuarioService.atualizar(usuarioId, dadosAtualizacao)).rejects.toThrow(NotFoundError);
      expect(mockPrismaClient.usuario.update).not.toHaveBeenCalled();
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      // Arrange
      const usuarioId = testUsers.vendedor.id;
      const dadosAtualizacao = { nome: 'Apenas Nome' };

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.vendedor);
      mockPrismaClient.usuario.update.mockResolvedValue({
        ...testUsers.vendedor,
        nome: dadosAtualizacao.nome,
      });

      // Act
      await usuarioService.atualizar(usuarioId, dadosAtualizacao);

      // Assert
      expect(mockPrismaClient.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioId },
        data: { nome: 'Apenas Nome' },
      });
    });
  });

  describe('excluir', () => {
    it('deve desativar usuário existente', async () => {
      // Arrange
      const usuarioId = testUsers.vendedor.id;

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.vendedor);
      mockPrismaClient.usuario.count.mockResolvedValue(2); // Mais de um admin
      mockPrismaClient.usuario.update.mockResolvedValue({
        ...testUsers.vendedor,
        ativo: false,
      });
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await usuarioService.excluir(usuarioId);

      // Assert
      expect(mockPrismaClient.usuario.update).toHaveBeenCalledWith({
        where: { id: usuarioId },
        data: { ativo: false },
      });
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId },
      });
    });

    it('deve rejeitar exclusão de usuário inexistente', async () => {
      // Arrange
      const usuarioId = 'usuario-inexistente';

      mockPrismaClient.usuario.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(usuarioService.excluir(usuarioId)).rejects.toThrow(NotFoundError);
    });

    it('deve rejeitar exclusão do último administrador', async () => {
      // Arrange
      const usuarioId = testUsers.admin.id;

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.admin);
      mockPrismaClient.usuario.count.mockResolvedValue(1); // Apenas um admin

      // Act & Assert
      await expect(usuarioService.excluir(usuarioId)).rejects.toThrow(BusinessError);
      expect(mockPrismaClient.usuario.update).not.toHaveBeenCalled();
    });

    it('deve permitir exclusão de vendedor', async () => {
      // Arrange
      const usuarioId = testUsers.vendedor.id;

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.vendedor);
      mockPrismaClient.usuario.update.mockResolvedValue({
        ...testUsers.vendedor,
        ativo: false,
      });
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(usuarioService.excluir(usuarioId)).resolves.not.toThrow();
    });

    it('deve revogar refresh tokens ao excluir usuário', async () => {
      // Arrange
      const usuarioId = testUsers.vendedor.id;

      mockPrismaClient.usuario.findUnique.mockResolvedValue(testUsers.vendedor);
      mockPrismaClient.usuario.update.mockResolvedValue({
        ...testUsers.vendedor,
        ativo: false,
      });
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      // Act
      await usuarioService.excluir(usuarioId);

      // Assert
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { usuarioId },
      });
    });
  });
});
