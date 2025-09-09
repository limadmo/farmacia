/**
 * Utilitários para validação e formatação de documentos (CPF/CNPJ)
 */

/**
 * Valida CPF
 * @param cpf - CPF para validar (apenas números)
 * @returns true se válido, false caso contrário
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (parseInt(cpfLimpo.charAt(9)) !== digitoVerificador1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  return parseInt(cpfLimpo.charAt(10)) === digitoVerificador2;
}

/**
 * Valida CNPJ
 * @param cnpj - CNPJ para validar (apenas números)
 * @returns true se válido, false caso contrário
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpjLimpo.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpjLimpo.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  let digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (parseInt(cnpjLimpo.charAt(12)) !== digitoVerificador1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpjLimpo.charAt(i)) * pesos2[i];
  }
  resto = soma % 11;
  let digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  return parseInt(cnpjLimpo.charAt(13)) === digitoVerificador2;
}

/**
 * Formata CPF
 * @param cpf - CPF para formatar (apenas números)
 * @returns CPF formatado (xxx.xxx.xxx-xx)
 */
export function formatarCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

/**
 * Formata CNPJ
 * @param cnpj - CNPJ para formatar (apenas números)
 * @returns CNPJ formatado (xx.xxx.xxx/xxxx-xx)
 */
export function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  return cnpjLimpo
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
}

/**
 * Formata telefone
 * @param telefone - Telefone para formatar (apenas números)
 * @returns Telefone formatado
 */
export function formatarTelefone(telefone: string): string {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  
  if (telefoneLimpo.length <= 10) {
    // Telefone fixo: (xx) xxxx-xxxx
    return telefoneLimpo
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  } else {
    // Celular: (xx) xxxxx-xxxx
    return telefoneLimpo
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  }
}

/**
 * Valida email
 * @param email - Email para validar
 * @returns true se válido, false caso contrário
 */
export function validarEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valida telefone
 * @param telefone - Telefone para validar (apenas números)
 * @returns true se válido, false caso contrário
 */
export function validarTelefone(telefone: string): boolean {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  return telefoneLimpo.length >= 10 && telefoneLimpo.length <= 11;
}

/**
 * Remove formatação de documento
 * @param documento - Documento formatado
 * @returns Documento apenas com números
 */
export function limparDocumento(documento: string): string {
  return documento.replace(/\D/g, '');
}

/**
 * Detecta tipo de documento baseado no comprimento
 * @param documento - Documento (apenas números)
 * @returns 'CPF' | 'CNPJ' | null
 */
export function detectarTipoDocumento(documento: string): 'CPF' | 'CNPJ' | null {
  const documentoLimpo = documento.replace(/\D/g, '');
  
  if (documentoLimpo.length === 11) {
    return 'CPF';
  } else if (documentoLimpo.length === 14) {
    return 'CNPJ';
  }
  
  return null;
}

/**
 * Formata documento baseado no tipo
 * @param documento - Documento para formatar
 * @param tipo - Tipo do documento (CPF ou CNPJ)
 * @returns Documento formatado
 */
export function formatarDocumento(documento: string, tipo: 'CPF' | 'CNPJ'): string {
  if (tipo === 'CPF') {
    return formatarCPF(documento);
  } else if (tipo === 'CNPJ') {
    return formatarCNPJ(documento);
  }
  return documento;
}