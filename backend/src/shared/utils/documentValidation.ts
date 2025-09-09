/**
 * Utilitários para validação de documentos brasileiros (CPF e CNPJ)
 */

/**
 * Remove formatação de um documento (pontos, traços, barras)
 * Para passaportes, preserva letras e números, removendo apenas caracteres especiais
 */
export function limparDocumento(documento: string): string {
  // Verifica se o documento contém letras e números (possível passaporte)
  if (/[a-zA-Z]/.test(documento) && /[0-9]/.test(documento)) {
    // Para passaportes, preserva letras e números, remove caracteres especiais
    return documento.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }
  // Para CPF/CNPJ, mantém apenas os dígitos
  return documento.replace(/[^\d]/g, '');
}

/**
 * Formata um CPF para exibição (xxx.xxx.xxx-xx)
 */
export function formatarCPF(cpf: string): string {
  const cleaned = limparDocumento(cpf);
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata um CNPJ para exibição (xx.xxx.xxx/xxxx-xx)
 */
export function formatarCNPJ(cnpj: string): string {
  const cleaned = limparDocumento(cnpj);
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Verifica se uma string contém letras e números (alfanumérico)
 */
export function contemLetrasENumeros(texto: string): boolean {
  return /[a-zA-Z]/.test(texto) && /[0-9]/.test(texto);
}

/**
 * Detecta o tipo de documento baseado no formato
 */
export function detectarTipoDocumento(documento: string): 'CPF' | 'CNPJ' | 'PASSAPORTE' | null {
  // Verifica se é um passaporte (deve conter letras e números)
  if (contemLetrasENumeros(documento)) {
    return 'PASSAPORTE';
  }
  
  const cleaned = limparDocumento(documento);
  
  if (cleaned.length === 11) {
    return 'CPF';
  } else if (cleaned.length === 14) {
    return 'CNPJ';
  }
  
  return null;
}

/**
 * Valida um CPF brasileiro
 */
export function validarCPF(cpf: string): boolean {
  const cleaned = limparDocumento(cpf);
  
  // Verifica se tem 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }
  
  // Valida primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  const digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (digitoVerificador1 !== parseInt(cleaned.charAt(9))) {
    return false;
  }
  
  // Valida segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  const digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  return digitoVerificador2 === parseInt(cleaned.charAt(10));
}

/**
 * Valida um CNPJ brasileiro
 */
export function validarCNPJ(cnpj: string): boolean {
  const cleaned = limparDocumento(cnpj);
  
  // Verifica se tem 14 dígitos
  if (cleaned.length !== 14) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return false;
  }
  
  // Valida primeiro dígito verificador
  const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cleaned.charAt(i)) * pesos1[i];
  }
  let resto = soma % 11;
  const digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  
  if (digitoVerificador1 !== parseInt(cleaned.charAt(12))) {
    return false;
  }
  
  // Valida segundo dígito verificador
  const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  soma = 0;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cleaned.charAt(i)) * pesos2[i];
  }
  resto = soma % 11;
  const digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  
  return digitoVerificador2 === parseInt(cleaned.charAt(13));
}

/**
 * Valida um passaporte
 * Um passaporte válido deve conter letras e números e ter entre 6 e 20 caracteres
 */
export function validarPassaporte(passaporte: string): boolean {
  // Passaporte deve conter letras e números
  if (!contemLetrasENumeros(passaporte)) {
    return false;
  }
  
  // Passaporte deve ter entre 6 e 20 caracteres
  if (passaporte.length < 6 || passaporte.length > 20) {
    return false;
  }
  
  return true;
}

/**
 * Valida um documento (CPF, CNPJ ou Passaporte) automaticamente
 */
export function validarDocumento(documento: string): boolean {
  if (!documento) {
    return true; // Documento é opcional
  }
  
  const tipo = detectarTipoDocumento(documento);
  
  switch (tipo) {
    case 'CPF':
      return validarCPF(documento);
    case 'CNPJ':
      return validarCNPJ(documento);
    case 'PASSAPORTE':
      return validarPassaporte(documento);
    default:
      return false;
  }
}

/**
 * Formata um passaporte para exibição (converte para maiúsculas)
 */
export function formatarPassaporte(passaporte: string): string {
  // Passaportes são sempre em maiúsculas com letras e números
  return passaporte.toUpperCase();
}

/**
 * Formata um documento automaticamente baseado no tipo
 */
export function formatarDocumento(documento: string): string {
  if (!documento) {
    return '';
  }
  
  const tipo = detectarTipoDocumento(documento);
  
  switch (tipo) {
    case 'CPF':
      return formatarCPF(documento);
    case 'CNPJ':
      return formatarCNPJ(documento);
    case 'PASSAPORTE':
      return formatarPassaporte(documento);
    default:
      return documento;
  }
}

/**
 * Máscara para input de documento baseado no tipo
 */
export function obterMascaraDocumento(tipo: 'CPF' | 'CNPJ' | 'PASSAPORTE'): string {
  switch (tipo) {
    case 'CPF':
      return '999.999.999-99';
    case 'CNPJ':
      return '99.999.999/9999-99';
    case 'PASSAPORTE':
      return ''; // Passaportes não têm máscara específica
    default:
      return '';
  }
}
