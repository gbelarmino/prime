"use client";

import { useFormContext, Controller } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { FormSection } from "./FormSection";
import { cn } from "@/lib/utils";
import { maskCpf } from "@/lib/format-cpf";
import type { ContratanteFormValues } from "@/lib/validations/contratante";

const sexoOptions = [
  { label: "Masculino", value: "MASCULINO" },
  { label: "Feminino", value: "FEMININO" }
];

const ecOptions = [
  { label: "Solteiro(a)", value: "SOLTEIRO" },
  { label: "Casado(a)", value: "CASADO" },
  { label: "Divorciado(a)", value: "DIVORCIADO" },
  { label: "Viúvo(a)", value: "VIUVO" },
  { label: "União Estável", value: "UNIAO_ESTAVEL" }
];

type DadosPessoaisProps = {
  dataNascimentoObrigatoria?: boolean;
};

export function DadosPessoais({ dataNascimentoObrigatoria = false }: DadosPessoaisProps) {
  const { register, control, formState: { errors }, setValue } = useFormContext<ContratanteFormValues>();

  const inputClass = "w-full bg-white/5 border-white/10 text-white rounded-xl py-3 px-4 focus:border-blue-500 transition-all";
  const labelClass = "block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 ml-1";
  const errorClass = "text-[10px] font-bold text-rose-400 mt-2 ml-1 uppercase tracking-tighter";

  return (
    <FormSection title="Dados Pessoais" description="Informações básicas de identificação do contratante.">
      <div className="md:col-span-2">
        <label className={labelClass}>Nome Completo <span className="text-rose-400">*</span></label>
        <InputText 
          className={cn(inputClass, "uppercase", errors.nome && "border-rose-400/50")}
          {...register("nome", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
        />
        {errors.nome && <p className={errorClass}>{errors.nome.message}</p>}
      </div>

      <div>
        <label className={labelClass}>CPF <span className="text-rose-400">*</span></label>
        <InputText 
          placeholder="000.000.000-00"
          className={cn(inputClass, errors.cpf && "border-rose-400/50")}
          {...register("cpf", {
            onChange: (e) => {
              e.target.value = maskCpf(e.target.value);
            }
          })}
        />
        {errors.cpf && <p className={errorClass}>{errors.cpf.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>RG <span className="text-rose-400">*</span></label>
          <InputText 
            className={cn(inputClass, "uppercase", errors.rg && "border-rose-400/50")}
            {...register("rg", {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              }
            })}
          />
          {errors.rg && <p className={errorClass}>{errors.rg.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Órgão Emissor <span className="text-rose-400">*</span></label>
          <InputText 
            className={cn(inputClass, "uppercase", errors.orgaoEmissor && "border-rose-400/50")}
            {...register("orgaoEmissor", {
              onChange: (e) => {
                e.target.value = e.target.value.toUpperCase();
              }
            })}
          />
          {errors.orgaoEmissor && <p className={errorClass}>{errors.orgaoEmissor.message}</p>}
        </div>
      </div>

      <div>
        <label className={labelClass}>Sexo <span className="text-rose-400">*</span></label>
        <Controller
          name="sexo"
          control={control}
          render={({ field }) => (
            <Dropdown
              id={field.name}
              value={field.value}
              onChange={(e) => field.onChange(e.value)}
              onBlur={field.onBlur}
              options={sexoOptions}
              placeholder="Selecione..."
              className={cn("w-full bg-white/5 border-white/10 rounded-xl", errors.sexo && "border-rose-400/50")}
              pt={{
                input: { className: 'text-white p-3' },
                trigger: { className: 'text-white/40' },
                panel: { className: 'bg-[#071C33] border-white/10' },
                item: { className: 'text-white hover:bg-white/5' }
              }}
            />
          )}
        />
        {errors.sexo && <p className={errorClass}>{errors.sexo.message}</p>}
      </div>

      <div>
        <label className={labelClass}>Estado Civil <span className="text-rose-400">*</span></label>
        <Controller
          name="estadoCivil"
          control={control}
          render={({ field }) => (
            <Dropdown
              id={field.name}
              value={field.value}
              onChange={(e) => field.onChange(e.value)}
              onBlur={field.onBlur}
              options={ecOptions}
              placeholder="Selecione..."
              className={cn("w-full bg-white/5 border-white/10 rounded-xl", errors.estadoCivil && "border-rose-400/50")}
              pt={{
                input: { className: 'text-white p-3' },
                trigger: { className: 'text-white/40' },
                panel: { className: 'bg-[#071C33] border-white/10' },
                item: { className: 'text-white hover:bg-white/5' }
              }}
            />
          )}
        />
        {errors.estadoCivil && <p className={errorClass}>{errors.estadoCivil.message}</p>}
      </div>

      <div>
        <label className={labelClass}>
          Data de Nascimento
          {dataNascimentoObrigatoria && <span className="text-rose-400"> *</span>}
        </label>
        <Controller
          name="dataNascimento"
          control={control}
          render={({ field }) => (
            <Calendar
              value={field.value ? new Date(field.value + 'T00:00:00') : null}
              onChange={(e) => {
                if (e.value) {
                  const d = e.value as Date;
                  const iso = d.toISOString().split('T')[0];
                  field.onChange(iso);
                } else {
                  field.onChange("");
                }
              }}
              onBlur={field.onBlur}
              dateFormat="dd/mm/yy"
              placeholder="00/00/0000"
              mask="99/99/9999"
              showIcon
              locale="pt-BR"
              className="w-full"
              inputClassName={cn(inputClass, "rounded-r-none", errors.dataNascimento && "border-rose-400/50")}
              icon="pi pi-calendar"
              pt={{
                panel: { className: 'bg-[#071C33] border-white/10 shadow-2xl' },
                header: { className: 'bg-transparent border-white/5 p-2' },
                title: { className: 'text-white font-bold flex gap-2 justify-center' },
                dropdownButton: { 
                  root: { className: 'bg-blue-600 border-none rounded-r-xl w-12 flex items-center justify-center' },
                  icon: { className: 'text-white text-lg' }
                }
              }}
            />
          )}
        />
        {errors.dataNascimento && <p className={errorClass}>{errors.dataNascimento.message}</p>}
      </div>

      <div>
        <label className={labelClass}>Nacionalidade <span className="text-rose-400">*</span></label>
        <InputText 
          className={cn(inputClass, "uppercase", errors.nacionalidade && "border-rose-400/50")}
          {...register("nacionalidade", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
        />
        {errors.nacionalidade && <p className={errorClass}>{errors.nacionalidade.message}</p>}
      </div>

      <div className="md:col-span-2">
        <label className={labelClass}>Profissão <span className="text-rose-400">*</span></label>
        <InputText 
          className={cn(inputClass, "uppercase", errors.profissao && "border-rose-400/50")}
          {...register("profissao", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            }
          })}
        />
        {errors.profissao && <p className={errorClass}>{errors.profissao.message}</p>}
      </div>
    </FormSection>
  );
}
