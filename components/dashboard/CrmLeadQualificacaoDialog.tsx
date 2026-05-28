"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { ProgressBar } from "primereact/progressbar";
import { toast } from "sonner";
import { ClipboardList, Loader2 } from "lucide-react";
import {
  atualizarLeadQualificacao,
  type LeadDto,
} from "@/lib/crm-service";
import { finService } from "@/lib/fin-service";
import { cn } from "@/lib/utils";
import { maskCpf } from "@/lib/format-cpf";
import { maskPhone } from "@/lib/format-phone";
import { fetchCepLookup, maskCepInput } from "@/lib/crm-cep-lookup";
import {
  CRM_QUAL_CALENDAR_PT,
  CRM_QUAL_DROPDOWN_PT,
  CRM_QUAL_ERROR_CLASS,
  CRM_QUAL_INPUT_CLASS,
  CRM_QUAL_LABEL_CLASS,
} from "@/lib/crm-qualificacao-form-styles";
import {
  crmLeadQualificacaoSchema,
  emptyCrmLeadQualificacaoFormValues,
  leadDtoToQualificacaoFormValues,
  qualificacaoFormValuesToPayload,
  type CrmLeadQualificacaoFormValues,
} from "@/lib/validations/crm-lead-qualificacao";

const CRM_DIALOG_PT = {
  root: { className: "border border-white/10 bg-[#071C33] shadow-2xl rounded-2xl overflow-hidden" },
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "px-6 py-5 text-white/80 max-h-[min(80vh,720px)] overflow-y-auto" },
  closeButton: { className: "text-white/40 hover:text-white" },
};

const SEXO_OPTIONS = [
  { label: "Masculino", value: "MASCULINO" },
  { label: "Feminino", value: "FEMININO" },
];

const ESTADO_CIVIL_OPTIONS = [
  { label: "Solteiro(a)", value: "SOLTEIRO" },
  { label: "Casado(a)", value: "CASADO" },
  { label: "Divorciado(a)", value: "DIVORCIADO" },
  { label: "Viúvo(a)", value: "VIUVO" },
  { label: "União estável", value: "UNIAO_ESTAVEL" },
];

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
].map((uf) => ({ label: uf, value: uf }));

const dropdownClass = (hasError: boolean) =>
  cn("w-full bg-white/5 border-white/10 rounded-xl", hasError && "border-rose-400/50");

export function CrmLeadQualificacaoDialog({
  lead,
  open,
  onHide,
  onSaved,
}: {
  lead: LeadDto | null;
  open: boolean;
  onHide: () => void;
  onSaved: (updated: LeadDto) => void;
}) {
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [validatingCep, setValidatingCep] = useState(false);

  const scoreAntes = lead?.score ?? 0;
  const jaCompleto = lead?.cadastroClienteCompleto ?? false;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CrmLeadQualificacaoFormValues>({
    resolver: zodResolver(crmLeadQualificacaoSchema),
    defaultValues: emptyCrmLeadQualificacaoFormValues(),
    mode: "onBlur",
  });

  useEffect(() => {
    if (!lead || !open) return;
    const raw = leadDtoToQualificacaoFormValues(lead);
    reset({
      ...raw,
      cpf: raw.cpf ? maskCpf(raw.cpf) : "",
      cep: raw.cep ? maskCepInput(raw.cep) : "",
    });
    void finService
      .listEmpreendimentos({ skipLoading: true })
      .then(setEmpreendimentos)
      .catch(() => setEmpreendimentos([]));
  }, [lead, open, reset]);

  const percentual = useMemo(() => lead?.percentualCadastroCliente ?? 0, [lead]);

  async function handleCepBlur(e: React.FocusEvent<HTMLInputElement>) {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setValidatingCep(true);
    try {
      const data = await fetchCepLookup(cep);
      if (!data) {
        toast.error("CEP não encontrado.");
        return;
      }
      if (data.logradouro) setValue("endereco", data.logradouro, { shouldValidate: true });
      if (data.bairro) setValue("bairro", data.bairro, { shouldValidate: true });
      if (data.localidade) setValue("cidade", data.localidade, { shouldValidate: true });
      if (data.uf) setValue("uf", data.uf, { shouldValidate: true });
      toast.success("Endereço preenchido!");
    } catch {
      toast.error("Não foi possível consultar o CEP.");
    } finally {
      setValidatingCep(false);
    }
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await atualizarLeadQualificacao(
        lead.id,
        qualificacaoFormValuesToPayload(values),
      );
      const ganhouPontos = !jaCompleto && updated.cadastroClienteCompleto;
      if (ganhouPontos) {
        toast.success(
          `Cadastro completo! +${updated.score - scoreAntes} pts (total ${updated.score} pts).`,
        );
      } else {
        toast.success(
          updated.cadastroClienteCompleto
            ? "Dados atualizados."
            : `Dados salvos · ${updated.percentualCadastroCliente}% do cadastro de cliente.`,
        );
      }
      onSaved(updated);
      onHide();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar dados do lead.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Dialog
      header="Dados para virar cliente"
      visible={open}
      onHide={() => !saving && onHide()}
      className="w-full max-w-2xl"
      pt={CRM_DIALOG_PT}
      modal
      dismissableMask={!saving}
    >
      {lead ? (
        <form className="flex flex-col gap-5" onSubmit={(e) => void onSubmit(e)} noValidate>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
                Progresso do cadastro
              </span>
              <span className="text-sm font-bold tabular-nums text-white">{percentual}%</span>
            </div>
            <ProgressBar
              value={percentual}
              showValue={false}
              className="!h-2 !rounded-full !bg-white/10"
              pt={{
                value: {
                  className: cn(
                    "!rounded-full",
                    percentual >= 100 ? "!bg-emerald-500" : "!bg-blue-500",
                  ),
                },
              }}
            />
            {lead.camposPendentesCadastro?.length > 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-white/45">
                Falta preencher:{" "}
                <span className="text-white/70">{lead.camposPendentesCadastro.join(", ")}</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-emerald-300/90">
                Todos os campos obrigatórios estão preenchidos.
                {!jaCompleto ? " Salve para ganhar +50 pts." : " Bônus de pontos já concedido."}
              </p>
            )}
          </div>

          <section className="grid gap-3 sm:grid-cols-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 sm:col-span-2">
              Contato
            </p>
            <FormField label="Nome completo" required error={errors.nome?.message} className="sm:col-span-2">
              <InputText
                className={cn(CRM_QUAL_INPUT_CLASS, "uppercase w-full", errors.nome && "border-rose-400/50")}
                {...register("nome", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
            </FormField>
            <FormField label="E-mail" required error={errors.email?.message}>
              <InputText
                className={cn(CRM_QUAL_INPUT_CLASS, "w-full", errors.email && "border-rose-400/50")}
                {...register("email")}
              />
            </FormField>
            <FormField
              label="Telefone"
              required
              error={errors.telefone?.message ?? errors.ddi?.message}
            >
              <div className="flex gap-2">
                <InputText
                  placeholder="+55"
                  className={cn(
                    CRM_QUAL_INPUT_CLASS,
                    "w-20 min-w-[5rem]",
                    errors.ddi && "border-rose-400/50",
                  )}
                  {...register("ddi")}
                />
                <InputText
                  placeholder="(00) 00000-0000"
                  className={cn(
                    CRM_QUAL_INPUT_CLASS,
                    "flex-1",
                    errors.telefone && "border-rose-400/50",
                  )}
                  {...register("telefone", {
                    onChange: (e) => {
                      e.target.value = maskPhone(e.target.value);
                    },
                  })}
                />
              </div>
            </FormField>
            <FormField label="CPF" required error={errors.cpf?.message}>
              <InputText
                placeholder="000.000.000-00"
                inputMode="numeric"
                className={cn(CRM_QUAL_INPUT_CLASS, "w-full", errors.cpf && "border-rose-400/50")}
                {...register("cpf", {
                  onChange: (e) => {
                    e.target.value = maskCpf(e.target.value);
                  },
                })}
              />
            </FormField>
            <FormField
              label="Empreendimento"
              required
              error={errors.empreendimentoInteresse?.message}
              className="sm:col-span-2"
            >
              <Controller
                name="empreendimentoInteresse"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    className={dropdownClass(!!errors.empreendimentoInteresse)}
                    value={field.value}
                    options={empreendimentos.map((e) => ({ label: e, value: e }))}
                    onChange={(e) => field.onChange((e.value as string) ?? "")}
                    onBlur={field.onBlur}
                    placeholder="Selecione"
                    filter
                    showClear
                    pt={CRM_QUAL_DROPDOWN_PT}
                  />
                )}
              />
            </FormField>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 sm:col-span-2">
              Dados pessoais
            </p>
            <FormField label="Sexo" required error={errors.sexo?.message}>
              <Controller
                name="sexo"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    className={dropdownClass(!!errors.sexo)}
                    value={field.value}
                    options={SEXO_OPTIONS}
                    onChange={(e) => field.onChange(e.value)}
                    onBlur={field.onBlur}
                    placeholder="Selecione"
                    pt={CRM_QUAL_DROPDOWN_PT}
                  />
                )}
              />
            </FormField>
            <FormField label="Estado civil" required error={errors.estadoCivil?.message}>
              <Controller
                name="estadoCivil"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    className={dropdownClass(!!errors.estadoCivil)}
                    value={field.value}
                    options={ESTADO_CIVIL_OPTIONS}
                    onChange={(e) => field.onChange(e.value)}
                    onBlur={field.onBlur}
                    placeholder="Selecione"
                    pt={CRM_QUAL_DROPDOWN_PT}
                  />
                )}
              />
            </FormField>
            <FormField label="RG" required error={errors.rg?.message}>
              <InputText
                className={cn(CRM_QUAL_INPUT_CLASS, "uppercase w-full", errors.rg && "border-rose-400/50")}
                {...register("rg", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
            </FormField>
            <FormField label="Órgão emissor" required error={errors.orgaoEmissor?.message}>
              <InputText
                className={cn(
                  CRM_QUAL_INPUT_CLASS,
                  "uppercase w-full",
                  errors.orgaoEmissor && "border-rose-400/50",
                )}
                {...register("orgaoEmissor", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
            </FormField>
            <FormField label="Data de nascimento" required error={errors.dataNascimento?.message}>
              <Controller
                name="dataNascimento"
                control={control}
                render={({ field }) => (
                  <Calendar
                    value={field.value ? new Date(`${field.value}T00:00:00`) : null}
                    onChange={(e) => {
                      if (e.value) {
                        const d = e.value as Date;
                        field.onChange(d.toISOString().split("T")[0]);
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
                    maxDate={new Date()}
                    className="w-full"
                    inputClassName={cn(
                      CRM_QUAL_INPUT_CLASS,
                      "rounded-r-none",
                      errors.dataNascimento && "border-rose-400/50",
                    )}
                    icon="pi pi-calendar"
                    pt={CRM_QUAL_CALENDAR_PT}
                  />
                )}
              />
            </FormField>
            <FormField label="Nacionalidade" required error={errors.nacionalidade?.message}>
              <InputText
                className={cn(
                  CRM_QUAL_INPUT_CLASS,
                  "uppercase w-full",
                  errors.nacionalidade && "border-rose-400/50",
                )}
                {...register("nacionalidade", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
            </FormField>
            <FormField
              label="Profissão"
              required
              error={errors.profissao?.message}
              className="sm:col-span-2"
            >
              <InputText
                className={cn(
                  CRM_QUAL_INPUT_CLASS,
                  "uppercase w-full",
                  errors.profissao && "border-rose-400/50",
                )}
                {...register("profissao", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  },
                })}
              />
            </FormField>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/35 sm:col-span-2">
              Endereço
            </p>
            <FormField label="CEP" required error={errors.cep?.message}>
              <div className="relative">
                <CepInput
                  validating={validatingCep}
                  hasError={!!errors.cep}
                  register={register}
                  setValue={setValue}
                  onCepBlur={handleCepBlur}
                />
              </div>
            </FormField>
            <FormField label="UF" required error={errors.uf?.message}>
              <Controller
                name="uf"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    className={dropdownClass(!!errors.uf)}
                    value={field.value}
                    options={UF_OPTIONS}
                    onChange={(e) => field.onChange(e.value)}
                    onBlur={field.onBlur}
                    placeholder="UF"
                    pt={CRM_QUAL_DROPDOWN_PT}
                  />
                )}
              />
            </FormField>
            <FormField
              label="Logradouro"
              required
              error={errors.endereco?.message}
              className="sm:col-span-2"
            >
              <InputText
                className={cn(CRM_QUAL_INPUT_CLASS, "w-full", errors.endereco && "border-rose-400/50")}
                {...register("endereco")}
              />
            </FormField>
            <FormField label="Número" required error={errors.numero?.message}>
              <Controller
                name="numero"
                control={control}
                render={({ field }) => (
                  <InputText
                    {...field}
                    className={cn(CRM_QUAL_INPUT_CLASS, "w-full", errors.numero && "border-rose-400/50")}
                  />
                )}
              />
            </FormField>
            <FormField label="Complemento" error={errors.complemento?.message}>
              <InputText className={cn(CRM_QUAL_INPUT_CLASS, "w-full")} {...register("complemento")} />
            </FormField>
            <FormField label="Bairro" required error={errors.bairro?.message}>
              <InputText
                className={cn(CRM_QUAL_INPUT_CLASS, "w-full", errors.bairro && "border-rose-400/50")}
                {...register("bairro")}
              />
            </FormField>
            <FormField label="Cidade" required error={errors.cidade?.message}>
              <InputText
                className={cn(CRM_QUAL_INPUT_CLASS, "w-full", errors.cidade && "border-rose-400/50")}
                {...register("cidade")}
              />
            </FormField>
          </section>

          <Button
            type="submit"
            label="Salvar dados"
            icon={<ClipboardList size={16} />}
            loading={saving}
            className="w-full"
          />
        </form>
      ) : null}
    </Dialog>
  );
}

function CepInput({
  validating,
  hasError,
  register,
  setValue,
  onCepBlur,
}: {
  validating: boolean;
  hasError: boolean;
  register: UseFormRegister<CrmLeadQualificacaoFormValues>;
  setValue: UseFormSetValue<CrmLeadQualificacaoFormValues>;
  onCepBlur: (e: React.FocusEvent<HTMLInputElement>) => Promise<void>;
}) {
  const cepField = register("cep", {
    onChange: (e) => {
      setValue("cep", maskCepInput(e.target.value), { shouldValidate: true });
    },
  });
  return (
    <>
      <InputText
        placeholder="00000-000"
        disabled={validating}
        className={cn(CRM_QUAL_INPUT_CLASS, "w-full", hasError && "border-rose-400/50")}
        {...cepField}
        onBlur={(e) => {
          cepField.onBlur(e);
          void onCepBlur(e);
        }}
      />
      {validating ? (
        <Loader2
          className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-white/40"
          aria-hidden
        />
      ) : null}
    </>
  );
}

function FormField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={CRM_QUAL_LABEL_CLASS}>
        {label}
        {required ? <span className="text-rose-400"> *</span> : null}
      </label>
      {children}
      {error ? <p className={CRM_QUAL_ERROR_CLASS}>{error}</p> : null}
    </div>
  );
}
