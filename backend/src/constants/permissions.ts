import { TipoUsuario } from '@prisma/client';

// Hierarquia de usuários (do maior para o menor nível)
export const HIERARQUIA_USUARIOS: TipoUsuario[] = [
  TipoUsuario.ADMINISTRADOR,
  TipoUsuario.GERENTE,
  TipoUsuario.FARMACEUTICO,
  TipoUsuario.VENDEDOR,
  TipoUsuario.PDV
];

// Permissões por módulo (baseadas em regras farmacêuticas reais)
export const PERMISSOES_MODULOS = {
  usuarios: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE],
  produtos: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO], // Apenas farmacêuticos podem cadastrar produtos
  vendas: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV],
  clientes: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV],
  estoque: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR],
  fornecedores: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE],
  promocoes: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE],
  relatorios: [TipoUsuario.ADMINISTRADOR] // Apenas admin tem acesso a todos os relatórios
};

// Permissões específicas para vendas
export const PERMISSOES_VENDAS = {
  comReceita: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO],
  semReceita: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR],
  vendaAssistida: [TipoUsuario.VENDEDOR, TipoUsuario.PDV], // Venda simplificada para farmácias menores
  finalizacao: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV],
  visualizacao: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV]
};

// Permissões para dados financeiros sensíveis
export const PERMISSOES_FINANCEIRAS = {
  custos: [TipoUsuario.ADMINISTRADOR],
  margens: [TipoUsuario.ADMINISTRADOR],
  relatoriosFinanceiros: [TipoUsuario.ADMINISTRADOR]
};

// Permissões específicas para operações de estoque
export const PERMISSOES_ESTOQUE = {
  visualizacao: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR],
  movimentacao: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO],
  relatorios: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE],
  alertas: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR],
  dashboard: [TipoUsuario.ADMINISTRADOR]
};

// Permissões para auditoria de vendas controladas
export const PERMISSOES_AUDITORIA = {
  vendasControladas: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO],
  relatoriosAuditoria: [TipoUsuario.ADMINISTRADOR, TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO]
};

// Permissões para criação de usuários
export const PERMISSOES_CRIAR_USUARIOS = {
  [TipoUsuario.ADMINISTRADOR]: [TipoUsuario.GERENTE, TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV],
  [TipoUsuario.GERENTE]: [TipoUsuario.FARMACEUTICO, TipoUsuario.VENDEDOR, TipoUsuario.PDV],
  [TipoUsuario.FARMACEUTICO]: [],
  [TipoUsuario.VENDEDOR]: [],
  [TipoUsuario.PDV]: []
};

// Função para verificar se um usuário tem permissão em um módulo
export function temPermissaoModulo(tipoUsuario: TipoUsuario, modulo: keyof typeof PERMISSOES_MODULOS): boolean {
  const permissoes = PERMISSOES_MODULOS[modulo];
  if (!permissoes) return false;
  return (permissoes as TipoUsuario[]).includes(tipoUsuario);
}

// Função para verificar se um usuário tem permissão para um tipo de venda
export function temPermissaoVenda(tipoUsuario: TipoUsuario, tipoVenda: keyof typeof PERMISSOES_VENDAS): boolean {
  return (PERMISSOES_VENDAS[tipoVenda] as TipoUsuario[]).includes(tipoUsuario);
}

// Função para verificar se um usuário pode criar outro tipo de usuário
export function podecriarUsuario(tipoUsuarioCriador: TipoUsuario, tipoUsuarioACriar: TipoUsuario): boolean {
  return (PERMISSOES_CRIAR_USUARIOS[tipoUsuarioCriador] as TipoUsuario[]).includes(tipoUsuarioACriar);
}

// Função para verificar hierarquia (se usuário A é superior ao usuário B)
export function ehSuperior(tipoUsuarioA: TipoUsuario, tipoUsuarioB: TipoUsuario): boolean {
  const nivelA = HIERARQUIA_USUARIOS.indexOf(tipoUsuarioA);
  const nivelB = HIERARQUIA_USUARIOS.indexOf(tipoUsuarioB);
  return nivelA < nivelB; // Menor índice = maior hierarquia
}

// Função para obter todos os tipos de usuário que um usuário pode gerenciar
export function getTiposUsuarioGerenciaveis(tipoUsuario: TipoUsuario): TipoUsuario[] {
  const nivel = HIERARQUIA_USUARIOS.indexOf(tipoUsuario);
  return HIERARQUIA_USUARIOS.slice(nivel + 1);
}

// Função para verificar se usuário tem permissão superior ou igual
export function temPermissaoSuperiorOuIgual(tipoUsuarioVerificador: TipoUsuario, tipoUsuarioAlvo: TipoUsuario): boolean {
  const nivelVerificador = HIERARQUIA_USUARIOS.indexOf(tipoUsuarioVerificador);
  const nivelAlvo = HIERARQUIA_USUARIOS.indexOf(tipoUsuarioAlvo);
  return nivelVerificador <= nivelAlvo;
}

// Função para verificar se usuário tem permissão para dados financeiros
export function temPermissaoFinanceira(tipoUsuario: TipoUsuario, tipoPermissao: keyof typeof PERMISSOES_FINANCEIRAS): boolean {
  return (PERMISSOES_FINANCEIRAS[tipoPermissao] as TipoUsuario[]).includes(tipoUsuario);
}

// Função para verificar se usuário tem permissão para operações de estoque
export function temPermissaoEstoque(tipoUsuario: TipoUsuario, tipoOperacao: keyof typeof PERMISSOES_ESTOQUE): boolean {
  return (PERMISSOES_ESTOQUE[tipoOperacao] as TipoUsuario[]).includes(tipoUsuario);
}

// Função para verificar se usuário pode fazer venda assistida de controlados
export function podeVendaAssistida(tipoUsuario: TipoUsuario): boolean {
  return (PERMISSOES_VENDAS.vendaAssistida as TipoUsuario[]).includes(tipoUsuario);
}

// Função para verificar acesso à auditoria de vendas controladas
export function temPermissaoAuditoria(tipoUsuario: TipoUsuario, tipoPermissao: keyof typeof PERMISSOES_AUDITORIA): boolean {
  return (PERMISSOES_AUDITORIA[tipoPermissao] as TipoUsuario[]).includes(tipoUsuario);
}

// Função para filtrar dados sensíveis de um produto baseado no perfil do usuário
export function filtrarDadosSensiveis(produto: any, tipoUsuario: TipoUsuario): any {
  if (tipoUsuario === TipoUsuario.ADMINISTRADOR) {
    return produto; // Admin tem acesso completo
  }

  // Para todos os outros usuários, remover dados financeiros sensíveis
  const { precoCusto, margem, ...produtoFiltrado } = produto;
  return produtoFiltrado;
}