"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "primereact/button";
import { AutoComplete, type AutoCompleteCompleteEvent } from "primereact/autocomplete";
import { DashboardDialog } from "@/components/dashboard/DashboardDialog";
import {
  fetchContratanteComTelefones,
  searchContratantes,
  type ContratanteOption,
} from "@/lib/contratante-service";
import type { WhatsAppTemplateAprovado } from "@/lib/atendimento-chat-service";

type Props = {
  visible: boolean;
  onHide: () => void;
  templates: WhatsAppTemplateAprovado[];
  onEnviar: (args: {
    contratanteId?: number;
    telefone: string;
    templateId: string;
  }) => Promise<void>;
};

function phonesFromCliente(c: {
  telefoneCelular1?: string | null;
  telefoneCelular2?: string | null;
}): string[] {
  const out: string[] = [];
  for (const p of [c.telefoneCelular1, c.telefoneCelular2]) {
    const t = p?.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function NovaConversaDialog({ visible, onHide, templates, onEnviar }: Props) {
  const [clientes, setClientes] = useState<ContratanteOption[]>([]);
  const [cliente, setCliente] = useState<ContratanteOption | undefined>(undefined);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [telefonesCliente, setTelefonesCliente] = useState<string[]>([]);
  const [telefone, setTelefone] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setCliente(undefined);
    setClientes([]);
    setTelefonesCliente([]);
    setTelefone("");
    setErro(null);
    const boas = templates.find((t) => t.nome === "mensagem_de_boas_vindas");
    setTemplateId(boas?.templateId ?? templates[0]?.templateId ?? "");
  }, [visible, templates]);

  const buscarClientes = useCallback(async (e: AutoCompleteCompleteEvent) => {
    const term = (e.query ?? "").trim();
    if (term.length < 2) {
      setClientes([]);
      return;
    }
    const seq = ++searchSeqRef.current;
    setClientesLoading(true);
    try {
      const found = await searchContratantes(term);
      if (seq === searchSeqRef.current) setClientes(found);
    } catch {
      if (seq === searchSeqRef.current) setClientes([]);
    } finally {
      if (seq === searchSeqRef.current) setClientesLoading(false);
    }
  }, []);

  async function onSelectCliente(opt: ContratanteOption | undefined) {
    setCliente(opt);
    setTelefonesCliente([]);
    setTelefone("");
    setErro(null);
    if (!opt?.id) return;
    const id = Number(opt.id);
    if (!Number.isFinite(id)) return;
    const full = await fetchContratanteComTelefones(id);
    if (!full) {
      setErro("Não foi possível carregar o cliente");
      return;
    }
    const phones = phonesFromCliente(full);
    setTelefonesCliente(phones);
    if (phones.length === 1) setTelefone(phones[0]);
    else if (phones.length === 0) {
      setErro("Cliente sem celular — digite o telefone WhatsApp abaixo");
    }
  }

  async function handleEnviar() {
    const tel = telefone.trim();
    if (!tel) {
      setErro("Informe o telefone WhatsApp");
      return;
    }
    if (!templateId) {
      setErro("Selecione um template");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const contratanteId = cliente?.id ? Number(cliente.id) : undefined;
      await onEnviar({
        contratanteId: Number.isFinite(contratanteId) ? contratanteId : undefined,
        telefone: tel,
        templateId,
      });
      onHide();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao iniciar conversa");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <DashboardDialog
      header="Nova conversa"
      visible={visible}
      onHide={onHide}
      className="w-full max-w-lg border border-white/10 bg-[#071C33] shadow-2xl"
      pt={{
        header: {
          className:
            "border-b border-white/[0.06] bg-transparent px-5 py-4 font-semibold text-white",
        },
        content: { className: "bg-transparent px-5 py-4" },
        footer: { className: "border-t border-white/[0.06] bg-transparent px-5 py-4" },
      }}
      footer={
        <div className="flex justify-end gap-2">
          <Button label="Cancelar" text size="small" onClick={onHide} disabled={enviando} />
          <Button
            label="Enviar template"
            icon="pi pi-send"
            size="small"
            onClick={() => void handleEnviar()}
            loading={enviando}
            disabled={enviando || !templateId}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-3 text-sm text-white/85">
        <p className="text-[12px] text-white/45">
          Escolha um cliente cadastrado ou digite o telefone e envie um template aprovado
          para iniciar a conversa.
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-white/40">Cliente</span>
          <AutoComplete
            value={cliente}
            suggestions={clientes}
            completeMethod={buscarClientes}
            field="nome"
            dropdown
            forceSelection={false}
            placeholder="Buscar por nome, CPF ou e-mail…"
            className="w-full"
            inputClassName="w-full !bg-black/30 !border-white/10 !text-white"
            panelClassName="!bg-[#0b1220] !border-white/10"
            onChange={(e) => {
              const v = e.value;
              if (v && typeof v === "object" && "id" in v) {
                void onSelectCliente(v as ContratanteOption);
              } else {
                setCliente(undefined);
                setTelefonesCliente([]);
              }
            }}
            itemTemplate={(c: ContratanteOption) => (
              <div className="flex flex-col py-0.5">
                <span className="text-sm text-white/90">{c.nome}</span>
                {c.cpf ? (
                  <span className="font-mono text-[10px] text-white/40">{c.cpf}</span>
                ) : null}
              </div>
            )}
          />
          {clientesLoading ? (
            <span className="text-[10px] text-white/35">A procurar…</span>
          ) : null}
        </label>

        {telefonesCliente.length > 1 ? (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wider text-white/40">
              Celular do cadastro
            </span>
            <select
              className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            >
              <option value="">Selecione…</option>
              {telefonesCliente.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-white/40">
            Telefone WhatsApp
          </span>
          <input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="Ex.: 85999999999 ou 5585999999999"
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 font-mono text-sm text-white placeholder:text-white/30 focus:border-blue-400/40 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wider text-white/40">Template</span>
          <select
            className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-sm text-white"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            disabled={templates.length === 0}
          >
            {templates.length === 0 ? (
              <option value="">Nenhum template aprovado</option>
            ) : (
              templates.map((t) => (
                <option key={t.templateId} value={t.templateId}>
                  {t.nome}
                </option>
              ))
            )}
          </select>
        </label>

        {erro ? (
          <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200 whitespace-pre-wrap">
            {erro}
          </div>
        ) : null}
      </div>
    </DashboardDialog>
  );
}
