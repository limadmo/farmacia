import bcrypt from 'bcryptjs';
import { TipoUsuario } from '@prisma/client';
import { DatabaseConnection } from '@/infrastructure/database/connection';
import { BusinessError, ValidationError, NotFoundError } from '@/presentation/middleware/errorHandler';
import { UsuarioResponse } from '@/shared/types/auth';
import { logger } from '@/shared/utils/logger';
import { 
  podecriarUsuario, 
  ehSuperior, 
  temPermissaoSuperiorOuIgual,
  getTiposUsuarioGerenciaveis,
  PERMISSOES_MODULOS 
} from '@/constants/permissions';

interface CriarUsuarioData {
  nome: string;
  login: string;
  senha: string;
  tipo: TipoUsuario;
}

interface AtualizarUsuarioData {
  nome?: string;
  tipo?: TipoUsuario;
  ativo?: boolean;
  senha?: string;
}

interface FiltroUsuario {
  tipo?: TipoUsuario;
  ativo?: boolean;
  nome?: string;
  login?: string;
}

export class UsuarioService {
  async listarTodos(filtros?: FiltroUsuario): Promise<UsuarioResponse[]> {
    const prisma = DatabaseConnection.getClient();

    try {
      const where: any = {};
      
      if (filtros) {
        if (filtros.tipo) where.tipo = filtros.tipo;
        if (filtros.ativo !== undefined) where.ativo = filtros.ativo;
        if (filtros.nome) {
          where.nome = {
            contains: filtros.nome,
            mode: 'insensitive'
          };
        }
        if (filtros.login) {
          where.login = {
            contains: filtros.login,
            mode: 'insensitive'
          };
        }
      }

      const usuarios = await prisma.usuario.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
      });

      return usuarios.map(usuario => this.mapUsuarioToResponse(usuario));
    } catch (error: any) {
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  async obterPorId(id: string): Promise<UsuarioResponse | null> {
    const prisma = DatabaseConnection.getClient();

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id },
      });

      if (!usuario) {
        return null;
      }

      return this.mapUsuarioToResponse(usuario);
    } catch (error: any) {
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  async criar(dados: CriarUsuarioData, usuarioCriadorTipo?: TipoUsuario): Promise<UsuarioResponse> {
    const { nome, login, senha, tipo } = dados;

    // Validações básicas
    if (senha.length < 6) {
      throw new ValidationError('Senha deve ter pelo menos 6 caracteres');
    }

    if (login.length < 3) {
      throw new ValidationError('Login deve ter pelo menos 3 caracteres');
    }

    // Verificar permissão hierárquica se usuário criador foi informado
    if (usuarioCriadorTipo && !podecriarUsuario(usuarioCriadorTipo, tipo)) {
      throw new BusinessError(`Usuário do tipo ${usuarioCriadorTipo} não pode criar usuário do tipo ${tipo}`);
    }

    const prisma = DatabaseConnection.getClient();

    try {
      // Verificar se login já existe
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { login },
      });

      if (usuarioExistente) {
        throw new BusinessError('Login já está em uso', 409);
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(senha, 12);

      // Criar usuário
      const usuario = await prisma.usuario.create({
        data: {
          nome,
          login,
          senhaHash,
          tipo,
        },
      });

      logger.info(`✅ Usuário criado: ${login} (${tipo})`);

      return this.mapUsuarioToResponse(usuario);
    } catch (error: any) {
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  async atualizar(id: string, dados: AtualizarUsuarioData, usuarioAtualizadorTipo?: TipoUsuario): Promise<UsuarioResponse> {
    const prisma = DatabaseConnection.getClient();

    try {
      // Verificar se usuário existe
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { id },
      });

      if (!usuarioExistente) {
        throw new NotFoundError('Usuário não encontrado');
      }

      // Verificar permissão hierárquica se usuário atualizador foi informado
      if (usuarioAtualizadorTipo && !temPermissaoSuperiorOuIgual(usuarioAtualizadorTipo, usuarioExistente.tipo)) {
        throw new BusinessError('Não é possível atualizar usuário de nível hierárquico superior ou igual');
      }

      // Se está alterando o tipo, verificar se pode criar o novo tipo
      if (dados.tipo && usuarioAtualizadorTipo && !podecriarUsuario(usuarioAtualizadorTipo, dados.tipo)) {
        throw new BusinessError(`Usuário do tipo ${usuarioAtualizadorTipo} não pode alterar para o tipo ${dados.tipo}`);
      }

      // Preparar dados para atualização
      const dadosAtualizacao: any = {
        ...(dados.nome && { nome: dados.nome }),
        ...(dados.tipo && { tipo: dados.tipo }),
        ...(dados.ativo !== undefined && { ativo: dados.ativo }),
      };

      // Se está alterando a senha
      if (dados.senha) {
        if (dados.senha.length < 6) {
          throw new ValidationError('Senha deve ter pelo menos 6 caracteres');
        }
        dadosAtualizacao.senhaHash = await bcrypt.hash(dados.senha, 12);
      }

      // Atualizar usuário
      const usuario = await prisma.usuario.update({
        where: { id },
        data: dadosAtualizacao,
      });

      logger.info(`✅ Usuário atualizado: ${usuario.login}`);

      return this.mapUsuarioToResponse(usuario);
    } catch (error: any) {
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  async excluir(id: string, usuarioExcluidorTipo?: TipoUsuario): Promise<void> {
    const prisma = DatabaseConnection.getClient();

    try {
      // Verificar se usuário existe
      const usuario = await prisma.usuario.findUnique({
        where: { id },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário não encontrado');
      }

      // Verificar permissão hierárquica se usuário excluidor foi informado
      if (usuarioExcluidorTipo && !temPermissaoSuperiorOuIgual(usuarioExcluidorTipo, usuario.tipo)) {
        throw new BusinessError('Não é possível excluir usuário de nível hierárquico superior ou igual');
      }

      // Verificar se é o último administrador
      if (usuario.tipo === TipoUsuario.ADMINISTRADOR) {
        const totalAdmins = await prisma.usuario.count({
          where: { 
            tipo: TipoUsuario.ADMINISTRADOR,
            ativo: true,
          },
        });

        if (totalAdmins <= 1) {
          throw new BusinessError('Não é possível excluir o último administrador do sistema');
        }
      }

      // Excluir usuário (soft delete - desativar)
      await prisma.usuario.update({
        where: { id },
        data: { ativo: false },
      });

      // Revogar todos os refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { usuarioId: id },
      });

      logger.info(`✅ Usuário desativado: ${usuario.login}`);
    } catch (error: any) {
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  /**
   * Obtém os tipos de usuário que um usuário pode gerenciar
   */
  async getTiposGerenciaveis(tipoUsuario: TipoUsuario): Promise<TipoUsuario[]> {
    return getTiposUsuarioGerenciaveis(tipoUsuario);
  }

  /**
   * Verifica se um usuário pode realizar uma operação em outro usuário
   */
  async podeGerenciarUsuario(tipoGerenciador: TipoUsuario, tipoGerenciado: TipoUsuario): Promise<boolean> {
    return temPermissaoSuperiorOuIgual(tipoGerenciador, tipoGerenciado);
  }

  /**
   * Lista usuários que um determinado tipo pode gerenciar
   */
  async listarUsuariosGerenciaveis(tipoUsuario: TipoUsuario): Promise<UsuarioResponse[]> {
    const tiposGerenciaveis = getTiposUsuarioGerenciaveis(tipoUsuario);
    
    if (tiposGerenciaveis.length === 0) {
      return [];
    }

    const prisma = DatabaseConnection.getClient();

    try {
      const usuarios = await prisma.usuario.findMany({
        where: {
          tipo: {
            in: tiposGerenciaveis
          },
          ativo: true
        },
        orderBy: { criadoEm: 'desc' },
      });

      return usuarios.map(usuario => this.mapUsuarioToResponse(usuario));
    } catch (error: any) {
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  /**
   * Altera senha de um usuário
   */
  async alterarSenha(id: string, novaSenha: string, usuarioAlteradorTipo?: TipoUsuario): Promise<void> {
    if (novaSenha.length < 6) {
      throw new ValidationError('Senha deve ter pelo menos 6 caracteres');
    }

    const prisma = DatabaseConnection.getClient();

    try {
      // Verificar se usuário existe
      const usuario = await prisma.usuario.findUnique({
        where: { id },
      });

      if (!usuario) {
        throw new NotFoundError('Usuário não encontrado');
      }

      // Verificar permissão hierárquica se usuário alterador foi informado
      if (usuarioAlteradorTipo && !temPermissaoSuperiorOuIgual(usuarioAlteradorTipo, usuario.tipo)) {
        throw new BusinessError('Não é possível alterar senha de usuário de nível hierárquico superior ou igual');
      }

      // Hash da nova senha
      const senhaHash = await bcrypt.hash(novaSenha, 12);

      // Atualizar senha
      await prisma.usuario.update({
        where: { id },
        data: { senhaHash },
      });

      // Revogar todos os refresh tokens para forçar novo login
      await prisma.refreshToken.deleteMany({
        where: { usuarioId: id },
      });

      logger.info(`✅ Senha alterada para usuário: ${usuario.login}`);
    } catch (error: any) {
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      throw error;
    }
  }

  private mapUsuarioToResponse(usuario: any): UsuarioResponse {
    return {
      id: usuario.id,
      nome: usuario.nome,
      login: usuario.login,
      tipo: usuario.tipo,
      tipoDescricao: this.getTipoDescricao(usuario.tipo),
      ativo: usuario.ativo,
      ultimoLogin: usuario.ultimoLogin?.toISOString(),
      criadoEm: usuario.criadoEm.toISOString(),
      modulosPermitidos: this.getModulosPermitidos(usuario.tipo),
    };
  }

  private getTipoDescricao(tipo: TipoUsuario): string {
    switch (tipo) {
      case TipoUsuario.ADMINISTRADOR:
        return 'Administrador';
      case TipoUsuario.GERENTE:
        return 'Gerente';
      case TipoUsuario.FARMACEUTICO:
        return 'Farmacêutico';
      case TipoUsuario.VENDEDOR:
        return 'Vendedor';
      case TipoUsuario.PDV:
        return 'PDV';
      default:
        return 'Desconhecido';
    }
  }

  private getModulosPermitidos(tipo: TipoUsuario): string[] {
    const modulos: string[] = [];
    
    // Verificar cada módulo usando as permissões definidas
    Object.entries(PERMISSOES_MODULOS).forEach(([modulo, tiposPermitidos]) => {
      if ((tiposPermitidos as TipoUsuario[]).includes(tipo)) {
        modulos.push(this.formatarNomeModulo(modulo));
      }
    });
    
    return modulos;
  }

  private formatarNomeModulo(modulo: string): string {
    switch (modulo) {
      case 'usuarios':
        return 'Usuários';
      case 'produtos':
        return 'Produtos';
      case 'vendas':
        return 'Vendas';
      case 'estoque':
        return 'Estoque';
      case 'fornecedores':
        return 'Fornecedores';
      case 'promocoes':
        return 'Promoções';
      case 'relatorios':
        return 'Relatórios';
      default:
        return modulo.charAt(0).toUpperCase() + modulo.slice(1);
    }
  }
}
