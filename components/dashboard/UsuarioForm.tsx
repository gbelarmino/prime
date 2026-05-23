"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  Shield, 
  Lock, 
  Activity,
  Check, 
  X, 
  ArrowLeft,
  Eye,
  EyeOff
} from "lucide-react";

// PrimeReact Components
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { SelectButton } from "primereact/selectbutton";

import { 
  getUsuarioByIdUrl, 
  getUsuarioUrl, 
  isApiConfigured 
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import {
  emptyUsuarioFormValues,
  usuarioFormSchema,
  usuarioResponseToFormValues,
  usuarioToApiPayload,
  type UsuarioApiResponse,
  type UsuarioFormValues,
} from "@/lib/validations/usuario";

export type UsuarioFormProps = {
  mode: "create" | "edit";
  entityId?: number;
};

export function UsuarioForm({ mode, entityId }: UsuarioFormProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    mode === "edit" ? "loading" : "idle",
  );
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioFormValues>({
    resolver: zodResolver(usuarioFormSchema),
    mode: "onBlur",
    defaultValues: emptyUsuarioFormValues(),
  });

  const perfis = [
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Administrativo', value: 'ADMINISTRATIVO' },
    { label: 'Corretor', value: 'CORRETOR' },
    { label: 'Imobiliária', value: 'IMOBILIARIA' },
    { label: 'Atendimento', value: 'ATENDIMENTO' },
  ];

  const situacoes = [
    { label: 'Ativo', value: 'ATIVO' },
    { label: 'Bloqueado', value: 'BLOQUEADO' },
    { label: 'Inativo', value: 'INATIVO' }
  ];

  useEffect(() => {
    if (mode !== "edit" || entityId == null) {
      setLoadState("idle");
      return;
    }
    
    const url = getUsuarioByIdUrl(entityId);
    setLoadState("loading");

    void (async () => {
      try {
        const res = await apiFetch(url);
        if (!res.ok) {
          toast.error("Não foi possível carregar o usuário.");
          setLoadState("error");
          return;
        }
        const data = (await res.json()) as UsuarioApiResponse;
        reset(usuarioResponseToFormValues(data));
        setLoadState("idle");
      } catch {
        toast.error("Erro de rede.");
        setLoadState("error");
      }
    })();
  }, [mode, entityId, reset]);

  async function onSubmit(values: UsuarioFormValues) {
    const url = mode === "create" ? getUsuarioUrl() : getUsuarioByIdUrl(entityId!);
    
    try {
      const res = await apiFetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usuarioToApiPayload(values as any, mode)),
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

      toast.success(mode === "create" ? "Usuário cadastrado com sucesso!" : "Usuário atualizado!");
      router.push("/dashboard/usuarios");
      router.refresh();
    } catch {
      toast.error("Erro de rede.");
    }
  }


  return (
    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl backdrop-blur-sm relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-amber-600/10 blur-[100px] -z-10 rounded-full" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -z-10 rounded-full" />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Nome */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <User size={14} className="text-amber-400" />
              Nome de Exibição
            </label>
            <Controller
              name="nome"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative">
                  <InputText
                    {...field}
                    placeholder="Nome completo ou apelido"
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl py-4 px-5 transition-all focus:border-amber-500/50 hover:border-white/20",
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
              <Mail size={14} className="text-amber-400" />
              E-mail de Acesso
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative">
                  <InputText
                    {...field}
                    type="email"
                    readOnly={mode === "edit"}
                    placeholder="exemplo@aires.com"
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl py-4 px-5 transition-all focus:border-amber-500/50 hover:border-white/20",
                      { "border-rose-500/50 focus:border-rose-500/50": fieldState.error },
                      { "opacity-50 cursor-not-allowed bg-white/5": mode === "edit" }
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

          {/* Perfil */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <Shield size={14} className="text-amber-400" />
              Perfil de Permissão
            </label>
            <Controller
              name="perfil"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative">
                  <Dropdown
                    {...field}
                    options={perfis}
                    placeholder="Selecione o nível de acesso"
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl h-[58px] transition-all focus:border-amber-500/50",
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

          {/* Senha */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1">
              <Lock size={14} className="text-amber-400" />
              {mode === "edit" ? "Nova Senha (opcional)" : "Senha de Acesso"}
            </label>
            <Controller
              name="senha"
              control={control}
              render={({ field, fieldState }) => (
                <div className="relative">
                  <InputText
                    {...field}
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "edit" ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                    className={cn(
                      "w-full bg-white/5 border-white/10 text-white rounded-2xl py-4 px-5 transition-all focus:border-amber-500/50 pr-12",
                      { "border-rose-500/50 focus:border-rose-500/50": fieldState.error }
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {fieldState.error && (
                    <span className="absolute -bottom-6 left-1 text-[10px] text-rose-400 font-bold uppercase">
                      {fieldState.error.message}
                    </span>
                  )}
                </div>
              )}
            />
          </div>

          {/* Situação */}
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2 px-1 mb-1">
              <Activity size={14} className="text-amber-400" />
              Status da Conta
            </label>
            <Controller
              name="situacao"
              control={control}
              render={({ field }) => (
                <SelectButton
                  {...field}
                  options={situacoes}
                  className="flex gap-2"
                  pt={{
                    button: ({ context }: any) => ({
                      className: cn(
                        "flex-1 py-4 rounded-2xl border-white/10 transition-all font-bold uppercase tracking-widest text-[10px]",
                        context.selected 
                          ? (field.value === 'ATIVO' 
                              ? "bg-emerald-600 text-white border-emerald-500/50 shadow-lg shadow-emerald-600/20" 
                              : field.value === 'BLOQUEADO'
                                ? "bg-amber-600 text-white border-amber-500/50 shadow-lg shadow-amber-600/20"
                                : "bg-rose-600 text-white border-rose-500/50 shadow-lg shadow-rose-600/20")
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                      )
                    })
                  }}
                />
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-white/5 mt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 border-none rounded-2xl px-12 py-4 flex items-center justify-center gap-4 transition-all active:scale-95 shadow-xl shadow-amber-600/20"
          >
            <span className="font-bold uppercase tracking-widest text-xs">
              {mode === "create" ? "Criar Usuário" : "Atualizar Cadastro"}
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
