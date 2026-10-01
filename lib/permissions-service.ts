import { apiFetch } from "@/lib/api-fetch";
import {
  getPermissoesCatalogoUrl,
  getPermissoesMatrizRestaurarUrl,
  getPermissoesMatrizUrl,
  getPermissoesMinhasUrl,
} from "@/lib/api-config";

export type PermissionItem = {
  key: string;
  label: string;
  group: string;
  description?: string | null;
  apiCapableRoles: string[];
};

export type CatalogoPermissoes = {
  items: PermissionItem[];
  roles: string[];
};

export type MatrizPermissoes = {
  grants: Record<string, string[]>;
  usingDefaults: boolean;
};

export type MinhasPermissoes = {
  role: string;
  permissions: string[];
  usingDefaults: boolean;
};

/** Evita GlobalSpinner — a tela/botões têm loading local. */
const SKIP = { skipLoading: true } as const;

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) msg = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

function normalizeMatriz(data: {
  grants?: Record<string, string[]>;
  usingDefaults?: boolean;
}): MatrizPermissoes {
  return {
    grants: Object.fromEntries(
      Object.entries(data.grants ?? {}).map(([role, keys]) => [role, [...(keys ?? [])]]),
    ),
    usingDefaults: Boolean(data.usingDefaults),
  };
}

export const permissoesService = {
  async catalogo(): Promise<CatalogoPermissoes> {
    const res = await apiFetch(getPermissoesCatalogoUrl(), SKIP);
    return parseJson(res);
  },

  async matriz(): Promise<MatrizPermissoes> {
    const res = await apiFetch(getPermissoesMatrizUrl(), SKIP);
    return normalizeMatriz(await parseJson(res));
  },

  async salvarMatriz(grants: Record<string, string[]>): Promise<MatrizPermissoes> {
    const res = await apiFetch(getPermissoesMatrizUrl(), {
      ...SKIP,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grants }),
    });
    return normalizeMatriz(await parseJson(res));
  },

  async restaurarDefaults(): Promise<MatrizPermissoes> {
    const res = await apiFetch(getPermissoesMatrizRestaurarUrl(), {
      ...SKIP,
      method: "POST",
    });
    return normalizeMatriz(await parseJson(res));
  },

  async minhas(): Promise<MinhasPermissoes> {
    const res = await apiFetch(getPermissoesMinhasUrl(), SKIP);
    return parseJson(res);
  },
};
