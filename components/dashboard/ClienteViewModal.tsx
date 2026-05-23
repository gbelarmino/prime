"use client";

import { useState } from "react";
import { 
  User, 
  MapPin, 
  Heart, 
  FileText, 
  Pencil,
  ArrowLeft,
  X
} from "lucide-react";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import { Button } from "primereact/button";
import { useCliente } from "@/hooks/use-cliente";
import { cn } from "@/lib/utils";
import { formatCpfDisplay } from "@/lib/format-cpf";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { toast } from "sonner";
import { getDocumentosContratanteUrl, getDocumentoContratanteUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-storage";
import Link from "next/link";
import { DocumentoPreviewModal } from "./DocumentoPreviewModal";

type Props = {
  clientId: number | null;
  onClose: () => void;
};

export function ClienteViewModal({ clientId, onClose }: Props) {
  const { loading, data, documentos, refresh } = useCliente(clientId || undefined);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!clientId) return null;

  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1 block";
  const valueClass = "text-white font-medium";
  const cardClass = "bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all";

  const headerElement = (
    <div className="flex items-center gap-4 py-2">
      <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/5">
        <User size={24} />
      </div>
      <div>
        <h3 className="text-xl font-bold text-white leading-tight">Detalhes do Cliente</h3>
        <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold mt-1">
          {data?.nome || `Cliente #${clientId}`}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <DashboardDialog
        visible={!!clientId}
        onHide={onClose}
        header={headerElement}
        className="w-full max-w-6xl mx-4"
        contentClassName="bg-[#020817] border-white/5 p-0 overflow-x-hidden overflow-y-auto"
        headerClassName="bg-[#020817] border-b border-white/5 p-6"
        pt={{
          root: { className: 'rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl' },
          mask: { className: 'backdrop-blur-md bg-black/60' },
          closeButton: { className: 'text-white/20 hover:text-white transition-colors mr-2' }
        }}
      >
        {loading && !data ? (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Carregando dados...</span>
          </div>
        ) : data ? (
          <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Header com Ações dentro do Modal */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
              <div className="flex items-center gap-3">
                <span className="bg-blue-500/20 text-blue-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-500/30">
                  Contratante
                </span>
              </div>
              <Link href={`/dashboard/clientes/edit?id=${clientId}`} className="no-underline">
                <Button 
                  label="Editar Cadastro" 
                  icon="pi pi-pencil" 
                  iconPos="right"
                  className="bg-blue-600 border-none shadow-lg shadow-blue-600/20 flex gap-4 px-6 rounded-xl items-center" 
                />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna Principal: Dados Pessoais e Endereço */}
              <div className="lg:col-span-2 space-y-6">
                {/* Dados Pessoais */}
                <div className={cardClass}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                      <User size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">Dados Pessoais</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    <div>
                      <span className={labelClass}>CPF</span>
                      <p className={valueClass}>{formatCpfDisplay(data.cpf)}</p>
                    </div>
                    <div>
                      <span className={labelClass}>RG</span>
                      <p className={valueClass}>{data.rg} {data.orgaoEmissor && `/ ${data.orgaoEmissor}`}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Nascimento</span>
                      <p className={valueClass}>{data.dataNascimento ? new Date(data.dataNascimento + 'T00:00:00').toLocaleDateString('pt-BR') : "—"}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Sexo</span>
                      <p className={valueClass}>{data.sexo === 'MASCULINO' ? 'Masculino' : data.sexo === 'FEMININO' ? 'Feminino' : 'Outro'}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Estado Civil</span>
                      <p className={valueClass}>{data.estadoCivil}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Nacionalidade</span>
                      <p className={valueClass}>{data.nacionalidade || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className={cardClass}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <MapPin size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">Endereço & Contato</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className={labelClass}>E-mail</span>
                        <p className={valueClass}>{data.email || "—"}</p>
                      </div>
                      <div>
                        <span className={labelClass}>Celular</span>
                        <p className={valueClass}>{formatPhoneDisplay(data.telefoneCelular1) || "—"}</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 h-[1px] bg-white/5 my-2" />
                    <div>
                      <span className={labelClass}>CEP</span>
                      <p className={valueClass}>{data.cep || "—"}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Endereço</span>
                      <p className={valueClass}>{data.endereco}{data.numero ? `, ${data.numero}` : ""}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Bairro / Cidade</span>
                      <p className={valueClass}>{data.bairro} — {data.cidade} / {data.uf}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Ponto de Referência</span>
                      <p className={valueClass}>{data.pontoReferencia || "—"}</p>
                    </div>
                    <div>
                      <span className={labelClass}>Complemento</span>
                      <p className={valueClass}>{data.complemento || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Cônjuge */}
                {(data.estadoCivil === 'CASADO' || data.estadoCivil === 'UNIAO_ESTAVEL') && data.conjuge && (
                  <div className={cardClass}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400">
                        <Heart size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">Dados do Cônjuge</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <span className={labelClass}>Nome Completo</span>
                        <p className={valueClass}>{data.conjuge.nome || "—"}</p>
                      </div>
                      <div>
                        <span className={labelClass}>CPF</span>
                        <p className={valueClass}>{data.conjuge.cpf ? formatCpfDisplay(data.conjuge.cpf) : "—"}</p>
                      </div>
                      <div>
                        <span className={labelClass}>E-mail</span>
                        <p className={valueClass}>{data.conjuge.email || "—"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna Lateral: Documentos */}
              <div className="space-y-6">
                <div className={cn(cardClass, "h-full")}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                        <FileText size={20} />
                      </div>
                      <h2 className="text-xl font-bold text-white font-[family-name:var(--font-playfair)]">Documentos</h2>
                    </div>
                    <Button 
                      icon="pi pi-plus" 
                      className="p-button-rounded p-button-text p-button-sm text-blue-400 hover:bg-blue-400/10"
                      onClick={() => document.getElementById('quick-upload-modal')?.click()}
                      tooltip="Adicionar Documento"
                      tooltipOptions={{ position: 'left' }}
                    />
                    <input 
                      type="file" 
                      id="quick-upload-modal" 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !clientId) return;
                        
                        const formData = new FormData();
                        formData.append("file", file);
                        formData.append("tipo", "OUTRO");
                        formData.append("tipoDocumento", "OUTRO");

                        try {
                          const res = await fetch(getDocumentosContratanteUrl(clientId), {
                            method: "POST",
                            headers: {
                              ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
                            },
                            body: formData,
                          });
                          if (res.ok) {
                            toast.success("Documento adicionado!");
                            refresh(); // Atualiza a lista de documentos sem recarregar a página
                          } else {
                            toast.error("Falha no upload.");
                          }
                        } catch {
                          toast.error("Erro ao enviar arquivo.");
                        }
                      }}
                    />
                  </div>
                  
                  {documentos.length > 0 ? (
                    <div className="space-y-4">
                      {documentos.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setShowPreview(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                              <i className="pi pi-file text-sm"></i>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
                                {((doc as any).tipo || (doc as any).tipoDocumento || (doc as any).tipo_documento || 'OUTRO').replace(/_/g, ' ')}
                              </p>
                              <p className="text-[10px] text-white/30 uppercase">
                                {((doc as any).nomeOriginal || (doc as any).nomeArquivo || (doc as any).nome_arquivo || 'documento').substring(0, 25)}...
                              </p>
                            </div>
                          </div>
                          <Button
                            icon="pi pi-download"
                            className="p-button-rounded p-button-text p-button-sm text-white/20 group-hover:text-blue-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!clientId) return;
                              const url = getDocumentoContratanteUrl(clientId, doc.id, true);
                              window.open(url, "_blank");
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 opacity-30">
                      <FileText size={48} className="mb-4" />
                      <p className="text-xs uppercase tracking-widest font-bold">Nenhum documento</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-20 text-center text-rose-400">
            Não foi possível carregar os detalhes do cliente.
          </div>
        )}
      </DashboardDialog>

      <DocumentoPreviewModal 
        clientId={clientId!}
        documento={selectedDoc}
        visible={showPreview}
        onHide={() => setShowPreview(false)}
      />
    </>
  );
}
