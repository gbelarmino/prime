"use client";

import { useFormContext } from "react-hook-form";
import { InputText } from "primereact/inputtext";
import { FormSection } from "./FormSection";
import { cn } from "@/lib/utils";
import type { ContratanteFormValues } from "@/lib/validations/contratante";
import { maskCpf } from "@/lib/format-cpf";
import { 
  DocumentoUploadCard, 
  type DocumentoInfo, 
  type TipoDocumento 
} from "@/components/dashboard/DocumentoUploadCard";
import { Button } from "primereact/button";
import { useRef, useState } from "react";
import { DocumentoPreviewModal } from "@/components/dashboard/DocumentoPreviewModal";

interface GestaoDocumentosProps {
  clientId: number;
  documentos: DocumentoInfo[];
  pendingDocs: { tipo: TipoDocumento; file: File; tempId: string }[];
  pendingDeletes: number[];
  hiddenDocIds: number[];
  onFileSelected: (tipo: TipoDocumento, file: File) => void;
  onRemovePending: (tempId: string) => void;
  onMarkDelete: (docId: number) => void;
  onUndoDelete: (docId: number) => void;
}

export function GestaoDocumentos({
  clientId,
  documentos,
  pendingDocs,
  pendingDeletes,
  hiddenDocIds,
  onFileSelected,
  onRemovePending,
  onMarkDelete,
  onUndoDelete,
}: GestaoDocumentosProps) {
  const { register, formState: { errors }, watch } = useFormContext<ContratanteFormValues>();
  const extraDocInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedDoc, setSelectedDoc] = useState<DocumentoInfo | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePreview = (doc: DocumentoInfo) => {
    setSelectedDoc(doc);
    setShowPreview(true);
  };

  const getDocByTipo = (tipo: TipoDocumento) => {
    return documentos.find((d) => d.tipo === tipo && !hiddenDocIds.includes(d.id));
  };

  const getPendingByTipo = (tipo: TipoDocumento) => {
    return pendingDocs.find((d) => d.tipo === tipo);
  };

  const TIPOS_OBRIGATORIOS: TipoDocumento[] = [
    "IDENTIDADE_COMPRADOR",
    "IDENTIDADE_CONJUGE",
    "COMPROVANTE_RESIDENCIA",
  ];

  const labelClass = "block text-xs font-bold uppercase tracking-widest text-white/40 mb-2 ml-1";
  const inputClass = "w-full bg-white/5 border-white/10 text-white rounded-xl py-3 px-4 focus:border-blue-500 transition-all";
  const errorClass = "text-[10px] font-bold text-rose-400 mt-2 ml-1 uppercase tracking-tighter";

  return (
    <FormSection title="Documentos e CPF" description="Validação final e anexo de documentação obrigatória.">
      <div>
        <label className={labelClass}>CPF <span className="text-rose-400">*</span></label>
        <InputText
          placeholder="000.000.000-00"
          className={cn(inputClass, errors.cpf && "border-rose-400/50")}
          {...register("cpf", {
            onChange: (e) => {
              e.target.value = maskCpf(e.target.value);
            },
          })}
        />
        {errors.cpf && <p className={errorClass}>{errors.cpf.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>RG</label>
          <InputText className={inputClass} {...register("rg")} />
        </div>
        <div>
          <label className={labelClass}>Órgão Emissor</label>
          <InputText className={inputClass} {...register("orgaoEmissor")} />
        </div>
      </div>

      <div className="md:col-span-2 mt-4">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/20 mb-6 flex items-center gap-3">
          Arquivos Anexados
          <div className="h-px flex-1 bg-white/5" />
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TIPOS_OBRIGATORIOS.map((tipo) => {
            if (tipo === "IDENTIDADE_CONJUGE") {
              const ec = watch("estadoCivil");
              const isCasado = ec === "CASADO" || ec === "UNIAO_ESTAVEL";
              if (!isCasado) return null;
            }

            return (
              <DocumentoUploadCard
                key={tipo}
                contratanteId={clientId}
                tipo={tipo}
                obrigatorio
                documento={getDocByTipo(tipo)}
                pendingFile={getPendingByTipo(tipo)?.file}
                onFileSelected={(f) => onFileSelected(tipo, f)}
                onPendingRemoved={() => {
                  const p = getPendingByTipo(tipo);
                  if (p) onRemovePending(p.tempId);
                }}
                onDeleteQueued={onMarkDelete}
                onPreview={handlePreview}
              />
            );
          })}

          {/* Documentos Extras */}
          {documentos
            .filter((d) => d.tipo === "OUTRO" && !hiddenDocIds.includes(d.id))
            .map((d) => (
              <DocumentoUploadCard
                key={d.id}
                contratanteId={clientId}
                tipo="OUTRO"
                documento={d}
                onFileSelected={() => {}}
                onPendingRemoved={() => {}}
                onDeleteQueued={onMarkDelete}
                onPreview={handlePreview}
              />
            ))}

          {pendingDocs
            .filter((d) => d.tipo === "OUTRO")
            .map((d) => (
              <DocumentoUploadCard
                key={d.tempId}
                contratanteId={clientId}
                tipo="OUTRO"
                pendingFile={d.file}
                onFileSelected={() => {}}
                onPendingRemoved={() => onRemovePending(d.tempId)}
                onDeleteQueued={() => {}}
              />
            ))}

          <div 
            className="flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-white/10 bg-white/[0.02] p-8 transition-all hover:border-blue-500/30 hover:bg-blue-500/5 group cursor-pointer"
            onClick={() => extraDocInputRef.current?.click()}
          >
            <input
              type="file"
              ref={extraDocInputRef}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileSelected("OUTRO", f);
                e.target.value = "";
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all">
              <i className="pi pi-plus text-lg"></i>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 group-hover:text-blue-400">Adicionar Documento</span>
          </div>
        </div>
      </div>

      <DocumentoPreviewModal 
        clientId={clientId}
        documento={selectedDoc}
        visible={showPreview}
        onHide={() => setShowPreview(false)}
      />
    </FormSection>
  );
}
