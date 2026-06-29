"use client";

import { useFormContext, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { MultiSelect } from "primereact/multiselect";
import { FormSection } from "./FormSection";
import { cn } from "@/lib/utils";
import { getCepUrl } from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { getAuthToken } from "@/lib/auth-storage";
import type { ContratanteCanalPreferido, ContratanteFormValues } from "@/lib/validations/contratante";
import { dashboardMultiSelectPt } from "@/lib/dashboard-multiselect";
import { maskPhone } from "@/lib/format-phone";
import { maskCurrency } from "@/lib/format-currency";
import { toast } from "sonner";

const UFs = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const CANAIS_PREFERIDOS_OPTIONS: { label: string; value: ContratanteCanalPreferido }[] = [
  { label: "WhatsApp", value: "WHATSAPP" },
  { label: "E-mail", value: "EMAIL" },
  { label: "SMS", value: "SMS" },
];

export function EnderecoContato() {
  const { register, control, setValue, formState: { errors } } = useFormContext<ContratanteFormValues>();

  const inputClass = "bg-white/5 border-white/10 text-white rounded-xl py-3 px-4 focus:border-blue-500 transition-all";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 ml-1";
  const errorClass = "text-[10px] font-bold text-rose-400 mt-2 ml-1 uppercase tracking-tighter";

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    try {
      const token = getAuthToken();
      const url = getCepUrl(cep);
      const response = await apiFetch(url, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      if (!response.ok) return;

      const data = await response.json();
      if (!data || data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      if (data.logradouro) setValue("endereco", data.logradouro);
      if (data.bairro) setValue("bairro", data.bairro);
      if (data.localidade) setValue("cidade", data.localidade);
      if (data.uf) setValue("uf", data.uf);
      
      toast.success("Endereço preenchido!");
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
    }
  };

  return (
    <FormSection title="Endereço e Contato" description="Onde o cliente reside e como contatá-lo.">
      <div>
        <label className={labelClass}>CEP <span className="text-rose-400">*</span></label>
        <InputText
          placeholder="00000-000"
          className={cn(inputClass, "w-full", errors.cep && "border-rose-400/50")}
          {...register("cep", {
            onChange: (e) => {
              const value = e.target.value.replace(/\D/g, "");
              const maskedValue = value.replace(/^(\d{5})(\d)/, "$1-$2").slice(0, 9);
              setValue("cep", maskedValue);
            },
          })}
          onBlur={handleCepBlur}
        />
        {errors.cep && <p className={errorClass}>{errors.cep.message}</p>}
      </div>

      <div className="hidden md:block"></div>

      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          <label className={labelClass}>Logradouro <span className="text-rose-400">*</span></label>
          <InputText 
            className={cn(inputClass, "w-full", errors.endereco && "border-rose-400/50")} 
            {...register("endereco")} 
          />
          {errors.endereco && <p className={errorClass}>{errors.endereco.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Número <span className="text-rose-400">*</span></label>
          <Controller
            name="numero"
            control={control}
            render={({ field }) => (
              <InputText 
                {...field}
                className={cn(inputClass, "w-full", errors.numero && "border-rose-400/50")} 
              />
            )}
          />
          {errors.numero && <p className={errorClass}>{errors.numero.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Complemento</label>
        <InputText className={cn(inputClass, "w-full")} {...register("complemento")} />
      </div>

      <div>
        <label className={labelClass}>Bairro <span className="text-rose-400">*</span></label>
        <InputText 
          className={cn(inputClass, "w-full", errors.bairro && "border-rose-400/50")} 
          {...register("bairro")} 
        />
        {errors.bairro && <p className={errorClass}>{errors.bairro.message}</p>}
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Ponto de referência</label>
        <Controller
          name="pontoReferencia"
          control={control}
          render={({ field }) => (
            <InputText 
              {...field}
              className={cn(inputClass, "w-full")} 
            />
          )}
        />
      </div>

      <div>
        <label className={labelClass}>Cidade <span className="text-rose-400">*</span></label>
        <InputText 
          className={cn(inputClass, "w-full", errors.cidade && "border-rose-400/50")} 
          {...register("cidade")} 
        />
        {errors.cidade && <p className={errorClass}>{errors.cidade.message}</p>}
      </div>

      <div>
        <label className={labelClass}>UF <span className="text-rose-400">*</span></label>
        <Controller
          name="uf"
          control={control}
          render={({ field }) => (
            <Dropdown
              id={field.name}
              value={field.value}
              onChange={(e) => field.onChange(e.value)}
              options={UFs}
              placeholder="UF"
              className={cn("w-full bg-white/5 border-white/10 rounded-xl", errors.uf && "border-rose-400/50")}
              pt={{
                input: { className: 'text-white p-3' },
                panel: { className: 'bg-[#071C33] border-white/10' },
                item: { className: 'text-white hover:bg-white/5' }
              }}
            />
          )}
        />
        {errors.uf && <p className={errorClass}>{errors.uf.message}</p>}
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Celular 1 <span className="text-rose-400">*</span></label>
        <div className="flex gap-2">
          <InputText 
            placeholder="+55"
            className={cn(inputClass, "w-20 min-w-[5rem]", errors.ddi1 && "border-rose-400/50")}
            {...register("ddi1")}
          />
          <InputText 
            placeholder="(00) 00000-0000"
            className={cn(inputClass, "flex-1", errors.telefoneCelular1 && "border-rose-400/50")} 
            {...register("telefoneCelular1", {
              onChange: (e) => {
                e.target.value = maskPhone(e.target.value);
              }
            })} 
          />
        </div>
        {(errors.telefoneCelular1 || errors.ddi1) && (
          <p className={errorClass}>{errors.telefoneCelular1?.message || errors.ddi1?.message}</p>
        )}
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Celular 2</label>
        <div className="flex gap-2">
          <InputText 
            placeholder="+55"
            className={cn(inputClass, "w-20 min-w-[5rem]", errors.ddi2 && "border-rose-400/50")}
            {...register("ddi2")}
          />
          <InputText 
            placeholder="(00) 00000-0000"
            className={cn(inputClass, "flex-1", errors.telefoneCelular2 && "border-rose-400/50")} 
            {...register("telefoneCelular2", {
              onChange: (e) => {
                e.target.value = maskPhone(e.target.value);
              }
            })} 
          />
        </div>
        {(errors.telefoneCelular2 || errors.ddi2) && (
          <p className={errorClass}>{errors.telefoneCelular2?.message || errors.ddi2?.message}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>Renda familiar</label>
        <InputText 
          placeholder="R$ 0,00"
          className={cn(inputClass, "w-full", errors.rendaFamiliar && "border-rose-400/50")} 
          {...register("rendaFamiliar", {
            onChange: (e) => {
              e.target.value = maskCurrency(e.target.value);
            }
          })} 
        />
        {errors.rendaFamiliar && <p className={errorClass}>{errors.rendaFamiliar.message}</p>}
      </div>

      <div>
        <label className={labelClass}>E-mail <span className="text-rose-400">*</span></label>
        <InputText 
          type="email"
          placeholder="exemplo@email.com"
          className={cn(inputClass, "w-full", errors.email && "border-rose-400/50")} 
          {...register("email")} 
        />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Canais preferidos de comunicação</label>
        <Controller
          name="canaisPreferidos"
          control={control}
          render={({ field }) => (
            <MultiSelect
              value={field.value ?? []}
              options={CANAIS_PREFERIDOS_OPTIONS}
              optionLabel="label"
              optionValue="value"
              onChange={(e) => field.onChange((e.value as ContratanteCanalPreferido[]) ?? [])}
              display="chip"
              placeholder="Seleccione os canais"
              className="w-full"
              pt={dashboardMultiSelectPt()}
            />
          )}
        />
        {errors.canaisPreferidos ? (
          <p className={errorClass}>{errors.canaisPreferidos.message}</p>
        ) : (
          <p className="mt-2 text-[10px] text-white/35">
            Usado pela régua de cobrança e notificações automáticas.
          </p>
        )}
      </div>
    </FormSection>
  );
}
