"use client";

import { useFormContext } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { FormSection } from "./FormSection";
import { cn } from "@/lib/utils";
import type { ContratanteFormValues } from "@/lib/validations/contratante";
import { maskCpf } from "@/lib/format-cpf";

export function DadosConjuge() {
  const { register, formState: { errors } } = useFormContext<ContratanteFormValues>();

  const inputClass = "w-full bg-white/5 border-white/10 text-white rounded-xl py-3 px-4 focus:border-blue-500 transition-all";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 ml-1";
  const errorClass = "text-[10px] font-bold text-rose-400 mt-2 ml-1 uppercase tracking-tighter";

  return (
    <FormSection 
      title="Cônjuge" 
      description="Informações do parceiro(a). Preencha tudo ou deixe em branco."
    >
      <div className="md:col-span-2">
        <label className={labelClass}>Nome do Cônjuge <span className="text-rose-400">*</span></label>
        <InputText
          className={cn(inputClass, "uppercase", errors.conjuge?.nome && "border-rose-400/50")}
          {...register("conjuge.nome", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
        />
        {errors.conjuge?.nome && <p className={errorClass}>{errors.conjuge.nome.message}</p>}
      </div>

      <div>
        <label className={labelClass}>CPF do Cônjuge <span className="text-rose-400">*</span></label>
        <InputText
          placeholder="000.000.000-00"
          className={cn(inputClass, errors.conjuge?.cpf && "border-rose-400/50")}
          {...register("conjuge.cpf", {
            onChange: (e) => {
              e.target.value = maskCpf(e.target.value);
            },
          })}
        />
        {errors.conjuge?.cpf && <p className={errorClass}>{errors.conjuge.cpf.message}</p>}
      </div>

      <div>
        <label className={labelClass}>RG do Cônjuge <span className="text-rose-400">*</span></label>
        <InputText
          className={cn(inputClass, "uppercase", errors.conjuge?.rg && "border-rose-400/50")}
          {...register("conjuge.rg", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
        />
        {errors.conjuge?.rg && <p className={errorClass}>{errors.conjuge.rg.message}</p>}
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>E-mail do Cônjuge <span className="text-rose-400">*</span></label>
        <InputText
          placeholder="email@exemplo.com"
          className={cn(inputClass, errors.conjuge?.email && "border-rose-400/50")}
          {...register("conjuge.email")}
        />
        {errors.conjuge?.email && <p className={errorClass}>{errors.conjuge.email.message}</p>}
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Órgão Emissor (Cônjuge) <span className="text-rose-400">*</span></label>
        <InputText
          className={cn(inputClass, "uppercase", errors.conjuge?.orgaoEmissor && "border-rose-400/50")}
          {...register("conjuge.orgaoEmissor", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
        />
        {errors.conjuge?.orgaoEmissor && <p className={errorClass}>{errors.conjuge.orgaoEmissor.message}</p>}
      </div>
    </FormSection>
  );
}
