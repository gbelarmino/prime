/** Resposta paginada do Spring Data (`Page`). */
export type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

/** Intervalo 1-based “mostrando X–Y” para exibição (Spring usa página e tamanho). */
export function springPageDisplayRange(page: SpringPage<unknown>): { from: number; to: number } {
  const total = page.totalElements ?? 0;
  if (total === 0) return { from: 0, to: 0 };
  const size = page.size ?? 0;
  const n = page.number ?? 0;
  const from = n * size + 1;
  const to = Math.min((n + 1) * size, total);
  return { from, to };
}
