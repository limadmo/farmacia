// Utilitários para máscaras de documentos

/**
 * Remove todos os caracteres não numéricos de uma string
 */
export const removeNonNumeric = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Aplica máscara de CPF (000.000.000-00)
 */
export const applyCPFMask = (value: string): string => {
  const numericValue = removeNonNumeric(value);
  
  if (numericValue.length <= 3) {
    return numericValue;
  } else if (numericValue.length <= 6) {
    return `${numericValue.slice(0, 3)}.${numericValue.slice(3)}`;
  } else if (numericValue.length <= 9) {
    return `${numericValue.slice(0, 3)}.${numericValue.slice(3, 6)}.${numericValue.slice(6)}`;
  } else {
    return `${numericValue.slice(0, 3)}.${numericValue.slice(3, 6)}.${numericValue.slice(6, 9)}-${numericValue.slice(9, 11)}`;
  }
};

/**
 * Aplica máscara de CNPJ (00.000.000/0000-00)
 */
export const applyCNPJMask = (value: string): string => {
  const numericValue = removeNonNumeric(value);
  
  if (numericValue.length <= 2) {
    return numericValue;
  } else if (numericValue.length <= 5) {
    return `${numericValue.slice(0, 2)}.${numericValue.slice(2)}`;
  } else if (numericValue.length <= 8) {
    return `${numericValue.slice(0, 2)}.${numericValue.slice(2, 5)}.${numericValue.slice(5)}`;
  } else if (numericValue.length <= 12) {
    return `${numericValue.slice(0, 2)}.${numericValue.slice(2, 5)}.${numericValue.slice(5, 8)}/${numericValue.slice(8)}`;
  } else {
    return `${numericValue.slice(0, 2)}.${numericValue.slice(2, 5)}.${numericValue.slice(5, 8)}/${numericValue.slice(8, 12)}-${numericValue.slice(12, 14)}`;
  }
};

/**
 * Aplica a máscara apropriada baseada no tipo de documento
 */
export const applyDocumentMask = (value: string, type: string): string => {
  switch (type) {
    case 'CPF':
      return applyCPFMask(value);
    case 'CNPJ':
      return applyCNPJMask(value);
    default:
      return value;
  }
};

/**
 * Detecta automaticamente o tipo de documento baseado no padrão
 */
export const detectDocumentType = (value: string): string => {
  const numericValue = removeNonNumeric(value);
  
  if (numericValue.length <= 11) {
    return 'CPF';
  } else if (numericValue.length <= 14) {
    return 'CNPJ';
  } else {
    return 'PASSAPORTE';
  }
};

/**
 * Aplica máscara automaticamente baseada no padrão do documento
 */
export const applySmartDocumentMask = (value: string): string => {
  const type = detectDocumentType(value);
  return applyDocumentMask(value, type);
};

/**
 * Verifica se o valor pode ser um nome (contém letras)
 */
export const isName = (value: string): boolean => {
  return /[a-zA-ZÀ-ÿ]/.test(value);
};

/**
 * Remove máscara do documento para envio à API
 */
export const cleanDocumentForAPI = (value: string): string => {
  return removeNonNumeric(value);
};