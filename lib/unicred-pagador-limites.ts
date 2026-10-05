/**
 * Tamanhos do pagador na emissão Unicred (API v2 / endereço do registro tipo 6).
 * CEP no cadastro guarda a máscara 00000-000 (9); a emissão envia só os 8 dígitos.
 */
export const UNICRED_PAGADOR = {
  nome: 40,
  email: 60,
  logradouro: 60,
  numero: 5,
  complemento: 30,
  bairro: 40,
  cidade: 50,
  uf: 2,
} as const;

export function msgLimiteUnicred(max: number): string {
  return `Máximo de ${max} caracteres (limite da Unicred).`;
}

export function cortarLimiteUnicred(valor: string | null | undefined, max: number): string {
  const texto = valor ?? "";
  return texto.length <= max ? texto : texto.slice(0, max);
}
