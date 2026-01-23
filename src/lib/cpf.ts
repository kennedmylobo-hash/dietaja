/**
 * Valida CPF usando o algoritmo oficial de dígito verificador
 * @param cpf - CPF com ou sem formatação
 * @returns true se o CPF é válido
 */
export const validateCPF = (cpf: string): boolean => {
  // Remove caracteres não numéricos
  const digits = cpf.replace(/\D/g, '');
  
  // CPF deve ter 11 dígitos
  if (digits.length !== 11) return false;
  
  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1+$/.test(digits)) return false;
  
  // Calcula primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  
  // Calcula segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;
  
  return true;
};

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX)
 * @param value - Valor digitado
 * @returns CPF formatado
 */
export const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
