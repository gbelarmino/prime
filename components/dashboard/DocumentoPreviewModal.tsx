"use client";

import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Button } from "primereact/button";
import { getDocumentoContratanteUrl } from "@/lib/api-config";
import type { DocumentoInfo } from "./DocumentoUploadCard";

type Props = {
  clientId: number;
  documento: DocumentoInfo | null;
  visible: boolean;
  onHide: () => void;
};

export function DocumentoPreviewModal({ clientId, documento, visible, onHide }: Props) {
  if (!documento) return null;

  const isImage = documento.contentType?.startsWith("image/");
  const title = (documento.tipo || "Documento").replace(/_/g, " ");

  return (
    <DashboardDialog
      header={title}
      visible={visible}
      onHide={onHide}
      maximizable
      className="w-full max-w-5xl mx-4"
      contentClassName="p-0 bg-[#071C33] overflow-hidden rounded-b-3xl"
      headerClassName="bg-[#071C33] text-white border-b border-white/5 p-8 rounded-t-3xl"
      pt={{
        mask: { className: "backdrop-blur-xl bg-black/80" },
        root: { className: "rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl" },
      }}
    >
      <div className="flex flex-col h-[80vh]">
        {isImage ? (
          <div className="flex-1 flex items-center justify-center p-8 bg-black/20 overflow-auto">
            <img
              src={getDocumentoContratanteUrl(clientId, documento.id)}
              alt="Documento"
              className="max-w-full h-auto object-contain shadow-2xl rounded-lg"
            />
          </div>
        ) : (
          <iframe
            src={getDocumentoContratanteUrl(clientId, documento.id)}
            className="flex-1 w-full border-none bg-white"
            title="Documento PDF"
          />
        )}
        <div className="p-8 bg-white/5 border-t border-white/5 flex justify-end gap-4">
          <Button
            label="Fechar"
            icon="pi pi-times"
            iconPos="right"
            className="p-button-text text-white/60 hover:text-white"
            onClick={onHide}
            pt={{
              icon: { className: "ml-3" }
            }}
          />
          <Button
            label="Baixar Arquivo"
            icon="pi pi-download"
            iconPos="right"
            className="bg-blue-600 border-none px-8 rounded-xl font-bold uppercase tracking-widest text-xs"
            onClick={() => {
              const url = getDocumentoContratanteUrl(clientId, documento.id, true);
              window.open(url, "_blank");
            }}
            pt={{
              icon: { className: "ml-4" }
            }}
          />
        </div>
      </div>
    </DashboardDialog>
  );
}
