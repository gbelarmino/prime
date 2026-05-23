import { z } from "zod";

export const usuarioFormSchema = z.object({
  nome: z.string().min(2, "Nome é obrigatório.").max(150),
  email: z.string().email("E-mail inválido.").max(150),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres.").max(50).optional().or(z.literal("")),
  perfil: z.union([
    z.literal("ADMIN"),
    z.literal("ADMINISTRATIVO"),
    z.literal("CORRETOR"),
    z.literal("IMOBILIARIA"),
    z.literal("ATENDIMENTO"),
  ]),
  situacao: z.union([z.literal("ATIVO"), z.literal("INATIVO"), z.literal("BLOQUEADO")]).default("ATIVO"),
});

export type UsuarioFormValues = z.input<typeof usuarioFormSchema>;
export type UsuarioFormOutput = z.output<typeof usuarioFormSchema>;

export type UsuarioApiResponse = {
  id: number;
  nome: string;
  email: string;
  role: "ADMIN" | "ADMINISTRATIVO" | "CORRETOR" | "IMOBILIARIA" | "ATENDIMENTO"; // Backend usa 'role'
  situacao: number; // Backend usa 1, 2, 3
  dataCriacao?: string;
};

export function emptyUsuarioFormValues(): UsuarioFormValues {
  return { 
    nome: "", 
    email: "", 
    senha: "", 
    perfil: "CORRETOR", 
    situacao: "ATIVO" 
  };
}

export function usuarioResponseToFormValues(r: any): UsuarioFormValues {
  // Tenta pegar de 'role' (atual) ou 'perfil' (antigo)
  const rawRole = String(r.role || r.perfil || "").toUpperCase();
  const perfil: "ADMIN" | "ADMINISTRATIVO" | "CORRETOR" | "IMOBILIARIA" | "ATENDIMENTO" =
    rawRole === "ADMIN" || rawRole === "1"
      ? "ADMIN"
      : rawRole === "ADMINISTRATIVO"
        ? "ADMINISTRATIVO"
        : rawRole === "IMOBILIARIA" || rawRole === "3"
          ? "IMOBILIARIA"
          : rawRole === "ATENDIMENTO"
            ? "ATENDIMENTO"
            : "CORRETOR";

  const rawSituacao = String(r.situacao || "").toUpperCase();
  const situacao: "ATIVO" | "INATIVO" | "BLOQUEADO" = 
    (rawSituacao === "1" || rawSituacao === "ATIVO") ? "ATIVO" : 
    (rawSituacao === "3" || rawSituacao === "BLOQUEADO") ? "BLOQUEADO" : "INATIVO";

  return {
    nome: r.nome ?? "",
    email: r.email ?? "",
    senha: "", 
    perfil,
    situacao,
  };
}

export function usuarioToApiPayload(v: UsuarioFormOutput, mode: "create" | "edit") {
  const situacaoMap: Record<string, number> = {
    "ATIVO": 1,
    "INATIVO": 2,
    "BLOQUEADO": 3
  };

  const payload: any = {
    nome: v.nome.trim(),
    email: v.email.trim(),
    role: v.perfil, // O backend espera 'role'
    situacao: situacaoMap[v.situacao] || 1, // O backend espera número (1, 2, 3)
  };

  if (mode === "create" || (v.senha && v.senha.trim().length > 0)) {
    payload.senha = v.senha;
  }

  return payload;
}
