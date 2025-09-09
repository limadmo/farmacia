/**
 * Entidade Fornecedor - Sistema de Farmácia
 * 
 * Representa um fornecedor de produtos farmacêuticos.
 * Implementa validações de negócio conforme regulamentação brasileira.
 */

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  representanteNome?: string;
  representanteTelefone?: string;
  representanteEmail?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CreateFornecedorData {
  nome: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  representanteNome?: string;
  representanteTelefone?: string;
  representanteEmail?: string;
  ativo?: boolean;
}

export interface UpdateFornecedorData {
  nome?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  representanteNome?: string;
  representanteTelefone?: string;
  representanteEmail?: string;
  ativo?: boolean;
}

export interface ProdutoFornecedor {
  id: string;
  produtoId: string;
  fornecedorId: string;
  precoCusto: number;
  prazoEntrega: number; // em dias
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface CreateProdutoFornecedorData {
  produtoId: string;
  fornecedorId: string;
  precoCusto: number;
  prazoEntrega: number;
  ativo?: boolean;
}

export interface NotaFiscal {
  id: string;
  fornecedorId: string;
  numero: string;
  serie: string;
  chaveAcesso?: string;
  valorTotal: number;
  dataEmissao: Date;
  processada: boolean;
  criadoEm: Date;
}

export interface CreateNotaFiscalData {
  fornecedorId: string;
  numero: string;
  serie: string;
  chaveAcesso?: string;
  valorTotal: number;
  dataEmissao: Date;
}

/**
 * Regras de negócio para fornecedores
 */
export class FornecedorBusinessRules {
  /**
   * Valida dados básicos do fornecedor
   */
  static validateFornecedor(data: CreateFornecedorData): string[] {
    const errors: string[] = [];

    // Validar nome
    if (!data.nome || data.nome.trim().length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }
    if (data.nome && data.nome.length > 100) {
      errors.push('Nome não pode ter mais de 100 caracteres');
    }

    // Validar CNPJ
    if (!data.cnpj || !this.isValidCNPJ(data.cnpj)) {
      errors.push('CNPJ inválido');
    }

    // Validar email se fornecido
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Email inválido');
    }

    // Validar telefone se fornecido
    if (data.telefone && !this.isValidPhone(data.telefone)) {
      errors.push('Telefone inválido');
    }

    return errors;
  }

  /**
   * Valida relação produto-fornecedor
   */
  static validateProdutoFornecedor(data: CreateProdutoFornecedorData): string[] {
    const errors: string[] = [];

    if (!data.produtoId || data.produtoId.trim() === '') {
      errors.push('ID do produto é obrigatório');
    }

    if (!data.fornecedorId || data.fornecedorId.trim() === '') {
      errors.push('ID do fornecedor é obrigatório');
    }

    if (!data.precoCusto || data.precoCusto <= 0) {
      errors.push('Preço de custo deve ser maior que zero');
    }

    if (!data.prazoEntrega || data.prazoEntrega < 0) {
      errors.push('Prazo de entrega deve ser maior ou igual a zero');
    }

    if (data.prazoEntrega > 365) {
      errors.push('Prazo de entrega não pode ser maior que 365 dias');
    }

    return errors;
  }

  /**
   * Valida nota fiscal
   */
  static validateNotaFiscal(data: CreateNotaFiscalData): string[] {
    const errors: string[] = [];

    if (!data.fornecedorId || data.fornecedorId.trim() === '') {
      errors.push('ID do fornecedor é obrigatório');
    }

    if (!data.numero || data.numero.trim() === '') {
      errors.push('Número da nota fiscal é obrigatório');
    }

    if (!data.serie || data.serie.trim() === '') {
      errors.push('Série da nota fiscal é obrigatória');
    }

    if (!data.valorTotal || data.valorTotal <= 0) {
      errors.push('Valor total deve ser maior que zero');
    }

    if (!data.dataEmissao) {
      errors.push('Data de emissão é obrigatória');
    }

    // Validar se a data não é futura
    if (data.dataEmissao && data.dataEmissao > new Date()) {
      errors.push('Data de emissão não pode ser futura');
    }

    // Validar chave de acesso se fornecida (44 dígitos)
    if (data.chaveAcesso && !/^\d{44}$/.test(data.chaveAcesso)) {
      errors.push('Chave de acesso deve ter exatamente 44 dígitos');
    }

    return errors;
  }

  /**
   * Validação de CNPJ brasileiro
   */
  private static isValidCNPJ(cnpj: string): boolean {
    // Remove caracteres não numéricos
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    // Verifica se tem 14 dígitos
    if (cleanCNPJ.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
    
    // Algoritmo de validação do CNPJ
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    // Primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ[i]) * weights1[i];
    }
    const digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    if (digit1 !== parseInt(cleanCNPJ[12])) return false;
    
    // Segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ[i]) * weights2[i];
    }
    const digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    
    return digit2 === parseInt(cleanCNPJ[13]);
  }

  /**
   * Validação de email
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 150;
  }

  /**
   * Validação de telefone brasileiro
   */
  private static isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/\D/g, '');
    // Aceita formatos: (XX) XXXXX-XXXX, (XX) XXXX-XXXX
    return /^(\d{10,11})$/.test(cleanPhone);
  }
}
