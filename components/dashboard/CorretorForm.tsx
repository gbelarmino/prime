"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  User, 
  BadgeCheck, 
  Mail, 
  Building2, 
  Check, 
  X, 
  ArrowLeft,
} from "lucide-react";

// PrimeReact Components
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

import { 
  getCorretorByIdUrl, 
  getCorretorUrl, 
  getImobiliariasListUrl, 
  isApiConfigured 
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { getAuthToken } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import {
  emptyCorretorFormValues,
  corretorFormSchema,
  corretorResponseToFormValues,
  corretorToApiPayload,
  type CorretorApiResponse,
  type CorretorFormValues,
  type CorretorFormOutput
} from "@/lib/validations/corretor";
import type { ImobiliariaApiResponse } from "@/lib/validations/imobiliaria";

export type CorretorFormProps = {
  mode: "create" | "edit";
  entityId?: number;
};

export function CorretorForm({ mode, entityId }: CorretorFormProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    mode === "edit" ? "loading" : "idle",
  );
  const [imobiliarias, setImobiliarias] = useState<{label: string, value: string}[]>([]);
  const [loadingImobiliarias, setLoadingImobiliarias] = useState(true);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CorretorFormValues>({
    resolver: zodResolver(corretorFormSchema),
    mode: "onBlur",
    defaultValues: emptyCorretorFormValues(),
  });

  // Carregar Imobiliárias para o Dropdown
  useEffect(() => {
    const fetchImobiliarias = async () => {
      try {
        const token = getAuthToken();
        const res = await apiFetch(getImobiliariasListUrl(0, 500), {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const data = await res.json();
          const options = (data.content || []).map((imob: ImobiliariaApiResponse) => ({
            label: imob.razaoSocial,
            value: String(imob.id)
          }));
          setImobiliarias(options);
        }
      } catch (err) {
        console.error("Erro ao carregar imobiliárias", err);
      } finally {
        setLoadingImobiliarias(false);
      }
    };
    fetchImobiliarias();
  }, []);

  // Carregar dados do Corretor se for edição
  useEffect(() => {
    if (mode !== "edit" || entityId == null) {
      setLoadState("idle");
      return;
    }
    
    const url = getCorretorByIdUrl(entityId);
    const token = getAuthToken();
    setLoadState("loading");

    void (async () => {
      try {
        const res = await apiFetch(url, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          toast.error("Não foi possível carregar o corretor.");
          setLoadState("error");
          return;
        }
        const data = (await res.json()) as CorretorApiResponse;
        reset(corretorResponseToFormValues(data));
        setLoadState("idle");
      } catch {
        toast.error("Erro de rede.");
        setLoadState("error");
      }
    })();
  }, [mode, entityId, reset]);

  async function onSubmit(values: CorretorFormValues) {
    // Re-validar e transformar via schema para obter o payload correto
    const result = corretorFormSchema.safeParse(values);
    if (!result.success) {
      toast.error("Verifique os campos do formulário.");
      return;
    }

    const url = mode === "create" ? getCorretorUrl() : getCorretorByIdUrl(entityId!);
    const token = getAuthToken();
    
    try {
      const res = await apiFetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(corretorToApiPayload(result.data)),
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

      toast.success(mode === "create" ? "Corretor cadastrado." : "Corretor atualizado.");
      router.push("/dashboard/corretores");
      router.refresh();
    } catch {
      toast.error("Erro de rede.");
    }
  }


  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/10 blur-[100px] -z-10 rounded-full" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-600/10 blur-[100px] -z-10 rounded-full" />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Nome */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <User size={14} className="text-blue-400" />
              Nome Completo
            </label>
            <Controller
              name="nome"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative group">
                  <InputText
                    {...field}
                    placeholder="Nome do corretor"
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

          {/* CRECI */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <BadgeCheck size={14} className="text-blue-400" />
              Inscrição CRECI
            </label>
            <Controller
              name="creci"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative group">
                  <InputText
                    {...field}
                    placeholder="Número do CRECI"
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

          {/* E-mail */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <Mail size={14} className="text-blue-400" />
              E-mail Profissional
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative group">
                  <InputText
                    {...field}
                    type="email"
                    placeholder="exemplo@corretor.com"
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

          {/* Imobiliária Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <Building2 size={14} className="text-blue-400" />
              Imobiliária Vinculada
            </label>
            <Controller
              name="imobiliariaId"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative group">
                  <Dropdown
                    {...field}
                    options={imobiliarias}
                    placeholder="Selecione a imobiliária"
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl h-[58px] transition-all focus:border-blue-500/50 hover:border-white/20",
                      { "border-rose-500/50": fieldState.error }
                    )}
                    pt={{
                      input: { className: 'text-white px-5 flex items-center' },
                      trigger: { className: 'text-white/40 pr-4' },
                      panel: { className: 'bg-[#071C33] border-white/10 shadow-2xl rounded-xl mt-2 overflow-hidden' },
                      item: { className: 'text-white/60 hover:bg-white/5 hover:text-white px-5 py-3 transition-colors' }
                    }}
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
              {mode === "create" ? "Cadastrar Corretor" : "Salvar Alterações"}
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
