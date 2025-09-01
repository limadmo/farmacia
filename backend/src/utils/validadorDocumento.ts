/**
 * Utilitário para validação de CPF e CNPJ
 */

/**
 * Valida um CPF
 * @param cpf CPF a ser validado
 * @returns true se o CPF for válido, false caso contrário
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = soma % 11;
  const digitoVerificador1 = resto < 2 ? 0 : 11 - resto;
  if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = soma % 11;
  const digitoVerificador2 = resto < 2 ? 0 : 11 - resto;
  if (digitoVerificador2 !== parseInt(cpf.charAt(10))) return false;

  return true;
}

/**
 * Valida um CNPJ
 * @param cnpj CNPJ a ser validado
 * @returns true se o CNPJ for válido, false caso contrário
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, '');

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Validação do primeiro dígito verificador
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

/**
 * Gera um CPF válido
 * @returns CPF válido
 */
export function gerarCPFValido(): string {
  const num1 = aleatorio();
  const num2 = aleatorio();
  const num3 = aleatorio();
  const num4 = aleatorio();
  const num5 = aleatorio();
  const num6 = aleatorio();
  const num7 = aleatorio();
  const num8 = aleatorio();
  const num9 = aleatorio();

  let soma = num1 * 10 + num2 * 9 + num3 * 8 + num4 * 7 + num5 * 6 + num6 * 5 + num7 * 4 + num8 * 3 + num9 * 2;
  let resto = (soma * 10) % 11;
  const digitoVerificador1 = resto === 10 ? 0 : resto;

  soma = num1 * 11 + num2 * 10 + num3 * 9 + num4 * 8 + num5 * 7 + num6 * 6 + num7 * 5 + num8 * 4 + num9 * 3 + digitoVerificador1 * 2;
  resto = (soma * 10) % 11;
  const digitoVerificador2 = resto === 10 ? 0 : resto;

  return `${num1}${num2}${num3}${num4}${num5}${num6}${num7}${num8}${num9}${digitoVerificador1}${digitoVerificador2}`;
}

/**
 * Gera um CNPJ válido
 * @returns CNPJ válido
 */
export function gerarCNPJValido(): string {
  const num1 = aleatorio();
  const num2 = aleatorio();
  const num3 = aleatorio();
  const num4 = aleatorio();
  const num5 = aleatorio();
  const num6 = aleatorio();
  const num7 = aleatorio();
  const num8 = aleatorio();
  const num9 = 0;
  const num10 = 0;
  const num11 = 0;
  const num12 = 1;

  let soma = num1 * 5 + num2 * 4 + num3 * 3 + num4 * 2 + num5 * 9 + num6 * 8 + num7 * 7 + num8 * 6 + num9 * 5 + num10 * 4 + num11 * 3 + num12 * 2;
  let resto = soma % 11;
  const digitoVerificador1 = resto < 2 ? 0 : 11 - resto;

  soma = num1 * 6 + num2 * 5 + num3 * 4 + num4 * 3 + num5 * 2 + num6 * 9 + num7 * 8 + num8 * 7 + num9 * 6 + num10 * 5 + num11 * 4 + num12 * 3 + digitoVerificador1 * 2;
  resto = soma % 11;
  const digitoVerificador2 = resto < 2 ? 0 : 11 - resto;

  return `${num1}${num2}${num3}${num4}${num5}${num6}${num7}${num8}${num9}${num10}${num11}${num12}${digitoVerificador1}${digitoVerificador2}`;
}

/**
 * Gera um número aleatório entre 0 e 9
 * @returns Número aleatório entre 0 e 9
 */
function aleatorio(): number {
  return Math.floor(Math.random() * 10);
}