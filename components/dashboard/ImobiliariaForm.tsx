"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Building2, 
  Hash, 
  BadgeCheck, 
  Mail, 
  Check, 
  X, 
  ArrowLeft,
} from "lucide-react";

// PrimeReact Components
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";

import { getImobiliariaByIdUrl, getImobiliariaUrl, isApiConfigured } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { getAuthToken } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import {
  emptyImobiliariaFormValues,
  imobiliariaFormSchema,
  imobiliariaResponseToFormValues,
  imobiliariaToApiPayload,
  type ImobiliariaApiResponse,
  type ImobiliariaFormValues,
} from "@/lib/validations/imobiliaria";

export type ImobiliariaFormProps = {
  mode: "create" | "edit";
  entityId?: number;
};

export function ImobiliariaForm({ mode, entityId }: ImobiliariaFormProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    mode === "edit" ? "loading" : "idle",
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ImobiliariaFormValues>({
    resolver: zodResolver(imobiliariaFormSchema),
    mode: "onBlur",
    defaultValues: emptyImobiliariaFormValues(),
  });

  useEffect(() => {
    if (mode !== "edit" || entityId == null) {
      setLoadState("idle");
      return;
    }
    if (!isApiConfigured()) {
      toast.error("API não configurada.");
      setLoadState("error");
      return;
    }
    
    const url = getImobiliariaByIdUrl(entityId);
    const token = getAuthToken();
    setLoadState("loading");

    void (async () => {
      try {
        const res = await apiFetch(url, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "omit",
        });
        if (!res.ok) {
          toast.error("Não foi possível carregar a imobiliária.");
          setLoadState("error");
          return;
        }
        const data = (await res.json()) as ImobiliariaApiResponse;
        reset(imobiliariaResponseToFormValues(data));
        setLoadState("idle");
      } catch {
        toast.error("Erro de rede.");
        setLoadState("error");
      }
    })();
  }, [mode, entityId, reset]);

  async function onSubmit(values: ImobiliariaFormValues) {
    if (!isApiConfigured()) {
      toast.error("Configure a API.");
      return;
    }
    const url = mode === "create" ? getImobiliariaUrl() : getImobiliariaByIdUrl(entityId!);
    const token = getAuthToken();
    
    try {
      const res = await apiFetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(imobiliariaToApiPayload(values)),
        credentials: "omit",
      });

      if (!res.ok) {
        let msg = "Não foi possível salvar.";
        try {
          const j = (await res.json()) as { message?: string };
          msg = j.message ?? msg;
        } catch { /* ignore */ }
        toast.error(msg);
        return;
      }

      toast.success(mode === "create" ? "Imobiliária cadastrada." : "Imobiliária atualizada.");
      router.push("/dashboard/imobiliarias");
      router.refresh();
    } catch {
      toast.error("Erro de rede.");
    }
  }


  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden">
      {/* Decorative Gradient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/10 blur-[100px] -z-10 rounded-full" />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Razão Social */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <Building2 size={14} className="text-blue-400" />
              Razão Social
            </label>
            <Controller
              name="razaoSocial"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative group">
                  <InputText
                    {...field}
                    placeholder="Nome oficial da empresa"
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl py-4 px-5 transition-all focus:border-blue-500/50 hover:border-white/20",
                      { "border-rose-500/50 focus:border-rose-500/50": fieldState.error }
                    )}
                  />
                  {fieldState.error && (
                    <span className="absolute -bottom-6 left-1 text-[10px] text-rose-400 font-bold uppercase">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>

          {/* CNPJ */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <Hash size={14} className="text-blue-400" />
              CNPJ
            </label>
            <Controller
              name="cnpj"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative group">
                  <InputText
                    {...field}
                    placeholder="00.000.000/0000-00"
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl py-4 px-5 transition-all focus:border-blue-500/50 hover:border-white/20",
                      { "border-rose-500/50 focus:border-rose-500/50": fieldState.error }
                    )}
                  />
                  {fieldState.error && (
                    <span className="absolute -bottom-6 left-1 text-[10px] text-rose-400 font-bold uppercase">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>

          {/* CRECI-J */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <BadgeCheck size={14} className="text-blue-400" />
              CRECI Jurídico
            </label>
            <Controller
              name="creciJ"
              control={control}
              render={({ field }) => (
                <InputText
                  {...field}
                  placeholder="Inscrição no CRECI"
                  className="w-full bg-white/5 border-white/10 text-white rounded-2xl py-4 px-5 transition-all focus:border-blue-500/50 hover:border-white/20"
                />
              )}
            />
          </div>

          {/* E-mail */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <Mail size={14} className="text-blue-400" />
              E-mail de Contato
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative group">
                  <InputText
                    {...field}
                    type="email"
                    placeholder="exemplo@imobiliaria.com"
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl py-4 px-5 transition-all focus:border-blue-500/50 hover:border-white/20",
                      { "border-rose-500/50 focus:border-rose-500/50": fieldState.error }
                    )}
                  />
                  {fieldState.error && (
                    <span className="absolute -bottom-6 left-1 text-[10px] text-rose-400 font-bold uppercase">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-white/5 mt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 border-none rounded-2xl px-12 py-4 flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl shadow-blue-600/20"
          >
            <span className="font-bold uppercase tracking-widest text-xs">
              {mode === "create" ? "Cadastrar Imobiliária" : "Salvar Alterações"}
            </span>
            <Check size={20} />
          </Button>

          <Button
            type="button"
            onClick={() => router.back()}
            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white/60 border-none rounded-2xl px-12 py-4 flex items-center justify-center gap-4 transition-all active:scale-95"
          >
            <span className="font-bold uppercase tracking-widest text-xs">Voltar</span>
            <ArrowLeft size={18} />
          </Button>
        </div>
      </form>
    </div>
  );
}
