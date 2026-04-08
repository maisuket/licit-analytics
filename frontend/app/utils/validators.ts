/**
 * Validação completa de CNPJ — algoritmo MOD 11 oficial da Receita Federal.
 *
 * Verifica não apenas o comprimento, mas também os dois dígitos verificadores,
 * rejeitando sequências inválidas como "11111111111111".
 *
 * @param cnpj — pode conter pontos, traços e barras (são removidos antes da validação)
 * @returns true se o CNPJ é matematicamente válido
 *
 * @example
 * isValidCnpj('23.008.295/0001-48') // true
 * isValidCnpj('11111111111111')      // false
 * isValidCnpj('23008295000148')      // true
 */
export function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');

  if (digits.length !== 14) return false;

  // Rejeita sequências óbviamente inválidas (todos os dígitos iguais)
  if (/^(\d)\1+$/.test(digits)) return false;

  const calc = (size: number): number => {
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += Number(digits[size - i]) * pos--;
      if (pos < 2) pos = 9;
    }

    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const firstDigit = calc(12);
  const secondDigit = calc(13);

  return (
    firstDigit === Number(digits[12]) &&
    secondDigit === Number(digits[13])
  );
}

/**
 * Formata 14 dígitos numéricos para o padrão XX.XXX.XXX/XXXX-XX.
 * Não valida — use isValidCnpj() antes.
 */
export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '');
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Aplica máscara progressiva ao CNPJ enquanto o usuário digita.
 * Retorna string formatada com no máximo 18 caracteres.
 */
export function maskCnpj(value: string): string {
  let d = value.replace(/\D/g, '');
  if (d.length > 14) d = d.slice(0, 14);

  if (d.length > 12) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length > 8) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4');
  if (d.length > 5) return d.replace(/^(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3');
  if (d.length > 2) return d.replace(/^(\d{2})(\d{1,3})/, '$1.$2');

  return d;
}
