"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, MapPin, Heart, FileText, Pencil } from "lucide-react";
import { useCliente } from "@/hooks/use-cliente";
import { Button } from "primereact/button";
import { useState, Suspense } from "react";
import { cn } from "@/lib/utils";
import { formatCpfDisplay } from "@/lib/format-cpf";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { toast } from "sonner";
import { getDocumentosContratanteUrl, getDocumentoContratanteUrl } from "@/lib/api-config";
import { getAuthToken } from "@/lib/auth-storage";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import type { DocumentoInfo } from "@/components/dashboard/DocumentoUploadCard";

function ClienteViewContent() {
  const searchParams = useSearchParams();
  const idStr = searchParams.get("id");
  const clientId = idStr ? parseInt(idStr, 10) : undefined;
  
  const { loading, data, documentos } = useCliente(clientId);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (loading && !data) return null;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 animate-in zoom-in-95 duration-300">
        <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[2rem] text-center max-w-sm">
          <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 mx-auto mb-4">
            <User size={32} />
          </div>
          <p className="text-rose-200 font-bold text-xl mb-2 font-[family-name:var(--font-playfair)]">Cliente não encontrado</p>
          <p className="text-white/40 text-sm mb-6">O registro solicitado não existe ou você não tem permissão para acessá-lo.</p>
          <Link 
            href="/dashboard/clientes" 
            className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest no-underline transition-all block"
          >
            Voltar para a lista
          </Link>
        </div>
      </div>
    );
  }

  const labelClass = "text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1 block";
  const valueClass = "text-white font-medium";
  const cardClass = "bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all";

  return (
    <div className="mx-auto max-w-6xl pb-20">
      {/* Header com Ações */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <Link
            href="/dashboard/clientes"
            className="mb-4 inline-flex items-center gap-2 text-sm text-blue-400 transition hover:text-blue-300 no-underline font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar à lista
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-white">{data.nome}</h1>
            <span className="bg-blue-500/20 text-blue-400 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-blue-500/30">
              Contratante
            </span>
          </div>
        </div>
        <Link href={`/dashboard/clientes/edit?id=${clientId}`} className="no-underline">
          <Button 
            label="Editar Cadastro" 
            icon="pi pi-pencil" 
            iconPos="right"
            className="bg-blue-600 border-none shadow-lg shadow-blue-600/20 flex gap-3 px-6" 
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna Principal: Dados Pessoais e Endereço */}
        <div className="md:col-span-2 space-y-6">
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
                onClick={() => document.getElementById('quick-upload')?.click()}
                tooltip="Adicionar Documento"
                tooltipOptions={{ position: 'left' }}
              />
              <input 
                type="file" 
                id="quick-upload" 
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
                      window.location.reload(); // Recarrega para mostrar o novo doc
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
                {/* Lista de Documentos */}
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

      <DashboardDialog
        header={selectedDoc ? ((selectedDoc.tipo || selectedDoc.tipoDocumento || 'Documento').replace(/_/g, ' ')) : 'Visualizar'}
        visible={showPreview}
        onHide={() => setShowPreview(false)}
        maximizable
        className="w-full max-w-4xl"
        contentClassName="p-0 bg-[#071C33]"
        headerClassName="bg-[#071C33] text-white border-b border-white/5 p-8"
      >
        {selectedDoc && clientId && (
          <div className="flex flex-col h-[70vh]">
            {selectedDoc.contentType?.startsWith('image/') || selectedDoc.mimetype?.startsWith('image/') ? (
              <div className="flex-1 flex items-center justify-center p-4 bg-black/20">
                <img 
                  src={getDocumentoContratanteUrl(clientId, selectedDoc.id)} 
                  alt="Documento" 
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                />
              </div>
            ) : (
              <iframe
                src={getDocumentoContratanteUrl(clientId, selectedDoc.id)}
                className="flex-1 w-full border-none"
                title="Documento PDF"
              />
            )}
            <div className="p-8 bg-white/5 border-t border-white/5 flex justify-end gap-3">
              <Button 
                label="Fechar" 
                className="p-button-text text-white/60" 
                onClick={() => setShowPreview(false)} 
              />
              <Button 
                label="Download" 
                icon="pi pi-download" 
                className="bg-blue-600 border-none"
                onClick={() => {
                  const url = getDocumentoContratanteUrl(clientId, selectedDoc.id, true);
                  window.open(url, "_blank");
                }}
              />
            </div>
          </div>
        )}
      </DashboardDialog>
    </div>
  );
}

export default function VisualizarClientePage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <ClienteViewContent />
    </Suspense>
  );
}
