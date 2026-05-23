"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// PrimeReact Components
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Message } from "primereact/message";

import { getImovelByIdUrl, getImovelUrl, isApiConfigured } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { UFS_BRASIL } from "@/lib/ufs-brasil";
import { getAuthToken } from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import {
  emptyImovelFormValues,
  imovelFormSchema,
  imovelResponseToFormValues,
  imovelToApiPayload,
  type ImovelApiResponse,
  type ImovelFormValues,
} from "@/lib/validations/imovel";

export type ImovelCadastroFormProps = {
  mode: "create" | "edit";
  entityId?: number;
};

export function ImovelCadastroForm({ mode, entityId }: ImovelCadastroFormProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    mode === "edit" ? "loading" : "idle",
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ImovelFormValues>({
    resolver: zodResolver(imovelFormSchema),
    mode: "onBlur",
    defaultValues: emptyImovelFormValues(),
  });

  useEffect(() => {
    if (mode !== "edit" || entityId == null) {
      setLoadState("idle");
      return;
    }
    if (!isApiConfigured()) {
      toast.error("Configure NEXT_PUBLIC_API_BASE_URL.");
      setLoadState("error");
      return;
    }
    const url = getImovelByIdUrl(entityId);
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
          let msg = "Não foi possível carregar o imóvel.";
          try {
            const j = (await res.json()) as { message?: string };
            msg = j.message ?? msg;
          } catch { /* ignore */ }
          toast.error(msg);
          setLoadState("error");
          return;
        }
        const data = (await res.json()) as ImovelApiResponse;
        reset(imovelResponseToFormValues(data));
        setLoadState("idle");
      } catch {
        toast.error("Erro de rede.");
        setLoadState("error");
      }
    })();
  }, [mode, entityId, reset]);

  async function onSubmit(values: ImovelFormValues) {
    if (!isApiConfigured()) {
      toast.error("Configure a API.");
      return;
    }
    if (mode === "edit" && entityId == null) {
      toast.error("ID inválido.");
      return;
    }
    const url = mode === "create" ? getImovelUrl() : getImovelByIdUrl(entityId!);
    const token = getAuthToken();
    try {
      const res = await apiFetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(imovelToApiPayload(values)),
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
      toast.success(mode === "create" ? "Imóvel cadastrado." : "Imóvel atualizado.");
      router.push("/dashboard/imoveis");
    } catch {
      toast.error("Erro de rede.");
    }
  }


  if (mode === "edit" && loadState === "error") {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center">
        <Message severity="error" text="Não foi possível carregar o imóvel. Por favor, tente novamente." />
        <Button 
          label="Voltar" 
          icon="pi pi-arrow-left" 
          iconPos="right"
          className="p-button-text mt-4 flex gap-4 items-center" 
          onClick={() => router.back()} 
          pt={{ icon: { className: "ml-3" } }}
        />
      </div>
    );
  }

  const situacaoOptions = [
    { label: "Disponível", value: 1 },
    { label: "Indisponível", value: 2 },
    { label: "Vendido", value: 3 },
    { label: "Em Negociação", value: 4 },
  ];

  const ufOptions = UFS_BRASIL.map(uf => ({ label: uf, value: uf }));

  return (
    <div className="card">
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl flex flex-col gap-6" noValidate>
        {/* Empreendimento */}
        <div className="flex flex-col gap-2">
          <label htmlFor="empreendimento" className="text-white/90 font-medium">
            Empreendimento <span className="text-rose-400">*</span>
          </label>
          <Controller
            name="empreendimento"
            control={control}
            render={({ field, fieldState }) => (
              <InputText
                id={field.name}
                {...field}
                className={cn("w-full p-inputtext-lg", { "p-invalid": fieldState.error })}
                placeholder="Ex: Jardins de Beberibe"
              />
            )}
          />
          {errors.empreendimento && (
            <small className="p-error">{errors.empreendimento.message}</small>
          )}
        </div>

        {/* Quadra e Lote */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="quadra" className="text-white/90">Quadra</label>
            <Controller
              name="quadra"
              control={control}
              render={({ field }) => (
                <InputText id={field.name} {...field} className="w-full" />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="lote" className="text-white/90">Lote</label>
            <Controller
              name="lote"
              control={control}
              render={({ field }) => (
                <InputText 
                  id={field.name} 
                  {...field} 
                  value={field.value != null ? String(field.value) : ""} 
                  className="w-full" 
                />
              )}
            />
          </div>
        </div>

        {/* Cidade e UF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="cidade" className="text-white/90">Cidade</label>
            <Controller
              name="cidade"
              control={control}
              render={({ field }) => (
                <InputText id={field.name} {...field} className="w-full" />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="uf" className="text-white/90">UF</label>
            <Controller
              name="uf"
              control={control}
              render={({ field }) => (
                <Dropdown
                  id={field.name}
                  value={field.value}
                  options={ufOptions}
                  onChange={(e) => field.onChange(e.value)}
                  placeholder="Selecione"
                  className="w-full"
                />
              )}
            />
          </div>
        </div>

        {/* Situação */}
        <div className="flex flex-col gap-2">
          <label htmlFor="situacao" className="text-white/90">Situação</label>
          <Controller
            name="situacao"
            control={control}
            render={({ field }) => (
              <Dropdown
                id={field.name}
                value={field.value}
                options={situacaoOptions}
                onChange={(e) => field.onChange(e.value)}
                className="w-full"
              />
            )}
          />
        </div>

        {/* Ações */}
        <div className="flex gap-4 pt-6">
          <Button
            type="submit"
            label={mode === "create" ? "Cadastrar Imóvel" : "Salvar Alterações"}
            icon="pi pi-check"
            iconPos="right"
            className="p-button-primary px-8 py-4 rounded-xl font-bold flex gap-4 items-center"
            pt={{ icon: { className: "ml-4" } }}
          />
          <Button
            type="button"
            label="Cancelar"
            icon="pi pi-times"
            iconPos="right"
            className="p-button-outlined p-button-secondary px-8 py-4 rounded-xl font-bold flex gap-4 items-center"
            onClick={() => router.back()}
            pt={{ icon: { className: "ml-4" } }}
          />
        </div>
      </form>
    </div>
  );
}
