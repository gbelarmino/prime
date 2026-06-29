"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "primereact/button";
import { ProgressBar } from "primereact/progressbar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  getContratanteUrl, 
  getDocumentosContratanteUrl,
  getDocumentoContratanteUrl,
  getCepUrl,
  isApiConfigured 
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { getAuthToken } from "@/lib/auth-storage";
import {
  getContratanteFormSchema,
  contratanteToApiPayload,
  emptyContratanteFormValues,
  type ContratanteFormValues,
} from "@/lib/validations/contratante";
import { useCliente } from "@/hooks/use-cliente";
import { DadosPessoais } from "./cliente-form/DadosPessoais";
import { EnderecoContato } from "./cliente-form/EnderecoContato";
import { DadosConjuge } from "./cliente-form/DadosConjuge";
import { GestaoDocumentos } from "./cliente-form/GestaoDocumentos";
import type { TipoDocumento } from "./DocumentoUploadCard";

export type ClienteCadastroFormProps = {
  mode: "create" | "edit";
  clientId?: number;
};

export function ClienteCadastroForm({ mode, clientId }: ClienteCadastroFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { loading, data, documentos } = useCliente(mode === "edit" ? clientId : undefined);
  
  const [pendingDocs, setPendingDocs] = useState<{ tipo: TipoDocumento; file: File; tempId: string }[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<number[]>([]);
  const [hiddenDocIds, setHiddenDocIds] = useState<number[]>([]);

  useEffect(() => setMounted(true), []);

  const formSchema = useMemo(() => getContratanteFormSchema(), []);

  const form = useForm<ContratanteFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: emptyContratanteFormValues(),
    values: data ?? undefined,
    resetOptions: {
      keepDefaultValues: false,
    },
  });
  
  const [currentStep, setCurrentStep] = useState(0);
  const [validatingCep, setValidatingCep] = useState(false);
  const estadoCivil = form.watch("estadoCivil");

  useEffect(() => {
    if (data) {
      console.log("Formulário detectou novos dados:", data);
      form.reset(data);
    }
  }, [data, form]);

  const isCasadoOuUniaoEstavel = estadoCivil === "CASADO" || estadoCivil === "UNIAO_ESTAVEL";

  const allSteps = [
    { id: "pessoais", label: "Dados Pessoais", icon: "pi pi-user", fields: ["nome", "cpf", "rg", "orgaoEmissor", "sexo", "estadoCivil", "dataNascimento", "nacionalidade", "profissao"] },
    { id: "endereco", label: "Endereço & Contato", icon: "pi pi-map-marker", fields: ["email", "canaisPreferidos", "telefoneCelular1", "telefoneCelular2", "cep", "endereco", "numero", "complemento", "bairro", "cidade", "uf", "pontoReferencia", "rendaFamiliar"] },
    { id: "conjuge", label: "Cônjuge", icon: "pi pi-heart", fields: ["conjuge.nome", "conjuge.cpf", "conjuge.rg", "conjuge.orgaoEmissor", "conjuge.email"] },
    { id: "documentos", label: "Documentos", icon: "pi pi-file", fields: [] },
  ];

  const steps = allSteps.filter(s => s.id !== "conjuge" || isCasadoOuUniaoEstavel);
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = async () => {
    const fields = steps[currentStep].fields as any[];
    const isValid = await form.trigger(fields);
    if (!isValid) {
      toast.error("Por favor, preencha os campos obrigatórios corretamente.");
      return;
    }

    const stepId = steps[currentStep].id;

    // Validação obrigatória de CEP na etapa de endereço
    if (stepId === "endereco") {
      const cep = form.getValues("cep")?.replace(/\D/g, "");
      if (cep && cep.length === 8) {
        setValidatingCep(true);
        try {
          const token = getAuthToken();
          const response = await apiFetch(getCepUrl(cep), {
            headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });

          if (!response.ok) {
            toast.error("Erro ao validar CEP. Tente novamente.");
            return;
          }

          const data = await response.json();
          if (!data || data.erro) {
            toast.error("O CEP informado é inexistente ou inválido.");
            return;
          }
        } catch (error) {
          console.error("Erro na validação do CEP:", error);
          toast.error("Não foi possível validar o CEP agora.");
          return;
        } finally {
          setValidatingCep(false);
        }
      }
    }

    setCurrentStep((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = async (values: ContratanteFormValues) => {
    if (!isApiConfigured()) return;
    const isEdit = mode === "edit" && clientId != null;
    const url = isEdit ? `${getContratanteUrl()}/${clientId}` : getContratanteUrl();

    try {
      const res = await apiFetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contratanteToApiPayload(values)),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao salvar cliente.");
      }

      const savedCliente = await res.json();
      const finalClientId = (isEdit ? clientId : savedCliente.id) as number;

      // 1. Processar Exclusões
      if (pendingDeletes.length > 0) {
        await Promise.all(
          pendingDeletes.map((docId) =>
            apiFetch(getDocumentoContratanteUrl(finalClientId, docId), {
              method: "DELETE",
            })
          )
        );
      }

      // 2. Processar Novos Uploads
      if (pendingDocs.length > 0) {
        for (const doc of pendingDocs) {
          const formData = new FormData();
          formData.append("file", doc.file);
          formData.append("tipo", doc.tipo);
          formData.append("tipoDocumento", doc.tipo);

          await apiFetch(getDocumentosContratanteUrl(finalClientId), {
            method: "POST",
            body: formData,
          });
        }
      }
      
      toast.success(isEdit ? "Cliente atualizado com sucesso!" : "Cliente cadastrado com sucesso!");
      router.push("/dashboard/clientes");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar.");
    }
  };


  const stepId = steps[currentStep].id;

  return (
    <FormProvider {...form}>
      <form className="space-y-8 pb-20" onSubmit={(e) => e.preventDefault()}>
        {/* Modern Stepper */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center relative px-4">
            {/* Connection Line */}
            <div className="absolute top-[24px] left-[60px] right-[60px] h-0.5 bg-white/5 -translate-y-1/2 z-0">
              <motion.div 
                className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((s, idx) => (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => idx < currentStep && setCurrentStep(idx)}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                    idx === currentStep 
                      ? "bg-blue-600 border-blue-400 text-white scale-110 shadow-lg shadow-blue-600/40" 
                      : idx < currentStep
                        ? "bg-emerald-500 border-emerald-400 text-white"
                        : "bg-[#071C33] border-white/10 text-white/20"
                  )}
                >
                  <i className={cn(idx < currentStep ? "pi pi-check" : s.icon, "text-lg")}></i>
                </button>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  idx === currentStep ? "text-blue-400" : idx < currentStep ? "text-emerald-400" : "text-white/20"
                )}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content with AnimatePresence */}
        <div className="min-h-[450px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepId}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: "circOut" }}
            >
              {stepId === "pessoais" && (
                <DadosPessoais dataNascimentoObrigatoria={false} />
              )}
              {stepId === "endereco" && <EnderecoContato />}
              {stepId === "conjuge" && <DadosConjuge />}
              {stepId === "documentos" && (
                <GestaoDocumentos 
                  clientId={clientId || 0}
                  documentos={documentos}
                  pendingDocs={pendingDocs}
                  pendingDeletes={pendingDeletes}
                  hiddenDocIds={hiddenDocIds}
                  onFileSelected={(tipo, file) => {
                    setPendingDocs(prev => [...prev, { tipo, file, tempId: Math.random().toString(36) }]);
                  }}
                  onRemovePending={(tempId) => {
                    setPendingDocs(prev => prev.filter(d => d.tempId !== tempId));
                  }}
                  onMarkDelete={(docId) => {
                    setPendingDeletes(prev => [...prev, docId]);
                    setHiddenDocIds(prev => [...prev, docId]);
                  }}
                  onUndoDelete={(docId) => {
                    setPendingDeletes(prev => prev.filter(id => id !== docId));
                    setHiddenDocIds(prev => prev.filter(id => id !== docId));
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center pt-8 border-t border-white/10">
          <Button
            type="button"
            label={isFirstStep ? "Cancelar" : "Voltar"}
            icon={isFirstStep ? "pi pi-times" : "pi pi-arrow-left"}
            iconPos="right"
            className="p-button-text text-white/40 hover:text-white flex gap-4 items-center"
            onClick={isFirstStep ? () => router.push("/dashboard/clientes") : handleBack}
          />

          <div className="flex gap-4">
            {!isLastStep ? (
              <Button
                type="button"
                label="Próximo Passo"
                icon="pi pi-arrow-right"
                iconPos="right"
                className="bg-blue-600 border-none px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 flex gap-4 items-center"
                onClick={handleNext}
                loading={validatingCep}
                disabled={validatingCep}
              />
            ) : (
              <Button
                type="button"
                label={mode === "edit" ? "Salvar Alterações" : "Finalizar Cadastro"}
                icon="pi pi-check"
                iconPos="right"
                className="bg-emerald-600 border-none px-8 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-600/20 flex gap-4 items-center uppercase tracking-widest text-[11px]"
                onClick={form.handleSubmit(onSubmit)}
              />
            )}
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
