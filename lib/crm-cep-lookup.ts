import { getCepUrl } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { getAuthToken } from "@/lib/auth-storage";

export type CepLookupResult = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function fetchCepLookup(cepDigits: string): Promise<CepLookupResult | null> {
  if (cepDigits.length !== 8) {
    return null;
  }
  const token = getAuthToken();
  const response = await apiFetch(getCepUrl(cepDigits), {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    skipLoading: true,
  });
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as CepLookupResult & { erro?: boolean };
  if (!data || data.erro) {
    return null;
  }
  return data;
}

export function maskCepInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
}
