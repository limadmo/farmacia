import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { TipoUsuario } from '@prisma/client';
import { randomBytes } from 'crypto';

import { DatabaseConnection } from '@/infrastructure/database/connection';
import { BusinessError, UnauthorizedError, ValidationError } from '@/presentation/middleware/errorHandler';
import { logger } from '@/shared/utils/logger';
import { temPermissaoModulo } from '@/constants/permissions';
import { 
  JwtPayload, 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest,
  AlterarSenhaRequest,
  UsuarioResponse 
} from '@/shared/types/auth';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtIssuer = process.env.JWT_ISSUER || 'FarmaciaAPI';
    this.jwtAudience = process.env.JWT_AUDIENCE || 'FarmaciaApp';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '60m';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET não configurado');
    }
  }

  async login(loginData: LoginRequest): Promise<LoginResponse> {
    const { login, senha } = loginData;

    // Validar dados de entrada
    if (!login || !senha) {
      throw new ValidationError('Login e senha são obrigatórios');
    }

    const prisma = DatabaseConnection.getClient();

    try {
      // Buscar usuário
      const usuario = await prisma.usuario.findUnique({
        where: { login },
      });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedError('Credenciais inválidas');
    }

    // Verificar senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaCorreta) {
      logger.warn(`❌ Tentativa de login inválida para usuário: ${login}`);
      throw new UnauthorizedError('Credenciais inválidas');
    }

    // Gerar tokens
    const { token, refreshToken } = await this.generateTokens(usuario.id, usuario.login, usuario.tipo);

    // Atualizar último login
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    });

    logger.info(`✅ Login realizado com sucesso para usuário: ${login}`);

    return {
      token,
      refreshToken,
      expiresAt: this.getTokenExpirationDate(),
      usuario: this.mapUsuarioToResponse(usuario),
    };
  } catch (error: any) {
      // Tratar erros específicos
      if (error.message && error.message.includes('Database connection failed')) {
        throw new Error('connection');
      }
      // Repassar outros erros
      throw error;
    }
  }

  async refresh(refreshData: RefreshTokenRequest): Promise<LoginResponse> {
    const { refreshToken } = refreshData;

    if (!refreshToken) {
      throw new ValidationError('Refresh token é obrigatório');
    }

    const prisma = DatabaseConnection.getClient();

    // Buscar refresh token no banco
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { usuario: true },
    });

    if (!tokenRecord || tokenRecord.expiresEm < new Date() || !tokenRecord.usuario.ativo) {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    // Remover refresh token usado
    await prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Gerar novos tokens
    const { token: newToken, refreshToken: newRefreshToken } = await this.generateTokens(
      tokenRecord.usuario.id,
      tokenRecord.usuario.login,
      tokenRecord.usuario.tipo
    );

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: this.getTokenExpirationDate(),
      usuario: this.mapUsuarioToResponse(tokenRecord.usuario),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) {
      return; // Logout silencioso se não há refresh token
    }

    const prisma = DatabaseConnection.getClient();

    try {
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
      logger.info('✅ Logout realizado com sucesso');
    } catch (error) {
      // Ignorar erro se token não existir
      logger.warn('⚠️ Refresh token não encontrado no logout');
    }
  }

  async alterarSenha(usuarioId: string, senhaData: AlterarSenhaRequest): Promise<void> {
    const { senhaAtual, novaSenha, confirmaNovaSenha } = senhaData;

    // Validações
    if (!senhaAtual || !novaSenha || !confirmaNovaSenha) {
      throw new ValidationError('Todos os campos de senha são obrigatórios');
    }

    if (novaSenha !== confirmaNovaSenha) {
      throw new ValidationError('Nova senha e confirmação não coincidem');
    }

    if (novaSenha.length < 6) {
      throw new ValidationError('Nova senha deve ter pelo menos 6 caracteres');
    }

    const prisma = DatabaseConnection.getClient();

    // Buscar usuário
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario) {
      throw new UnauthorizedError('Usuário não encontrado');
    }

    // Verificar senha atual
    const senhaAtualValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaAtualValida) {
      throw new UnauthorizedError('Senha atual incorreta');
    }

    // Hash da nova senha
    const novaSenhaHash = await bcrypt.hash(novaSenha, 12);

    // Atualizar senha
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: novaSenhaHash },
    });

    // Revogar todos os refresh tokens do usuário
    await prisma.refreshToken.deleteMany({
      where: { usuarioId },
    });

    logger.info(`✅ Senha alterada com sucesso para usuário ID: ${usuarioId}`);
  }

  async obterUsuarioLogado(usuarioId: string): Promise<UsuarioResponse> {
    const prisma = DatabaseConnection.getClient();

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
    });

    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedError('Usuário não encontrado ou inativo');
    }

    return this.mapUsuarioToResponse(usuario);
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      }) as JwtPayload;

      return decoded;
    } catch (error) {
      throw new UnauthorizedError('Token inválido');
    }
  }

  private async generateTokens(usuarioId: string, login: string, tipo: TipoUsuario) {
    const payload: JwtPayload = {
      usuarioId,
      login,
      tipo,
    };

    // Gerar JWT token
    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    } as jwt.SignOptions);

    // Gerar refresh token
    const refreshToken = randomBytes(64).toString('hex');
    const expiresEm = new Date();
    expiresEm.setTime(expiresEm.getTime() + this.parseExpirationTime(this.refreshTokenExpiresIn));

    const prisma = DatabaseConnection.getClient();

    // Remover refresh tokens antigos do usuário (manter apenas 1 ativo)
    await prisma.refreshToken.deleteMany({
      where: { usuarioId },
    });

    // Salvar novo refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        usuarioId,
        expiresEm,
      },
    });

    return { token, refreshToken };
  }

  private getTokenExpirationDate(): string {
    const expirationTime = this.parseExpirationTime(this.jwtExpiresIn);
    const expirationDate = new Date(Date.now() + expirationTime);
    return expirationDate.toISOString();
  }

  private parseExpirationTime(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Formato de tempo inválido: ${timeString}`);
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
    switch (tipo) {
      case TipoUsuario.ADMINISTRADOR:
        return ['usuarios', 'produtos', 'vendas', 'clientes', 'estoque', 'fornecedores', 'promocoes', 'relatorios'];
      case TipoUsuario.GERENTE:
        return ['usuarios', 'produtos', 'vendas', 'clientes', 'estoque', 'fornecedores', 'promocoes'];
      case TipoUsuario.FARMACEUTICO:
        return ['produtos', 'vendas', 'clientes', 'estoque'];
      case TipoUsuario.VENDEDOR:
        return ['vendas', 'clientes', 'estoque', 'produtos'];
      case TipoUsuario.PDV:
        return ['vendas', 'clientes'];
      default:
        return [];
    }
  }

  // Métodos para verificação de hierarquia
  isAdmin(tipo: TipoUsuario): boolean {
    return tipo === TipoUsuario.ADMINISTRADOR;
  }

  isManager(tipo: TipoUsuario): boolean {
    return tipo === TipoUsuario.GERENTE;
  }

  isPharmacist(tipo: TipoUsuario): boolean {
    return tipo === TipoUsuario.FARMACEUTICO;
  }

  isSeller(tipo: TipoUsuario): boolean {
    const sellerTypes: TipoUsuario[] = [TipoUsuario.VENDEDOR, TipoUsuario.PDV];
    return sellerTypes.includes(tipo);
  }

  hasModuleAccess(userType: TipoUsuario, module: string): boolean {
    if (!module) return false;
    
    // Usar função centralizada de permissions.ts
    return temPermissaoModulo(userType, module.toLowerCase() as any);
  }

  canManageUsers(userType: TipoUsuario): boolean {
    return this.hasModuleAccess(userType, 'usuarios');
  }

  canAccessReports(userType: TipoUsuario): boolean {
    return this.hasModuleAccess(userType, 'relatorios');
  }

  canManageStock(userType: TipoUsuario): boolean {
    return this.hasModuleAccess(userType, 'estoque');
  }

  getHierarchyLevel(tipo: TipoUsuario): number {
    switch (tipo) {
      case TipoUsuario.ADMINISTRADOR:
        return 5;
      case TipoUsuario.GERENTE:
        return 4;
      case TipoUsuario.FARMACEUTICO:
        return 3;
      case TipoUsuario.VENDEDOR:
        return 2;
      case TipoUsuario.PDV:
        return 1;
      default:
        return 0;
    }
  }

  canManageUserType(managerType: TipoUsuario, targetType: TipoUsuario): boolean {
    const managerLevel = this.getHierarchyLevel(managerType);
    const targetLevel = this.getHierarchyLevel(targetType);
    return managerLevel > targetLevel;
  }
}
