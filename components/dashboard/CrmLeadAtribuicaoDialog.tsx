"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { toast } from "sonner";
import { UserCog } from "lucide-react";
import {
  filterCorretoresByImobiliaria,
  loadCampanhasAtivas,
  loadCorretoresOptions,
  loadImobiliariasOptions,
  type CampanhaOption,
  type CorretorOption,
  type ImobiliariaOption,
} from "@/lib/crm-assignments";
import { atualizarLeadAtribuicao, type LeadDto } from "@/lib/crm-service";
import {
  CRM_QUAL_DROPDOWN_PT,
  CRM_QUAL_LABEL_CLASS,
} from "@/lib/crm-qualificacao-form-styles";
import { cn } from "@/lib/utils";

const CRM_DIALOG_PT = {
  root: { className: "border border-white/10 bg-[#071C33] shadow-2xl rounded-2xl overflow-hidden" },
  header: {
    className:
      "border-b border-white/[0.06] bg-transparent px-6 py-5 font-[family-name:var(--font-playfair)] text-xl font-semibold text-white",
  },
  content: { className: "px-6 py-5 text-white/80" },
  closeButton: { className: "text-white/40 hover:text-white" },
};

const dropdownClass = "w-full bg-white/5 border-white/10 rounded-xl";

export function CrmLeadAtribuicaoDialog({
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
  const [campanhas, setCampanhas] = useState<CampanhaOption[]>([]);
  const [imobiliarias, setImobiliarias] = useState<ImobiliariaOption[]>([]);
  const [corretores, setCorretores] = useState<CorretorOption[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [campanhaId, setCampanhaId] = useState<number | null>(null);
  const [imobiliariaId, setImobiliariaId] = useState<number | null>(null);
  const [corretorId, setCorretorId] = useState<number | null>(null);

  useEffect(() => {
    if (!lead || !open) return;
    setCampanhaId(lead.campanhaId);
    setImobiliariaId(lead.imobiliariaId);
    setCorretorId(lead.corretorId);
    setLoadingOpts(true);
    void Promise.all([loadCampanhasAtivas(), loadImobiliariasOptions(), loadCorretoresOptions()])
      .then(([c, i, r]) => {
        setCampanhas(c);
        setImobiliarias(i);
        setCorretores(r);
      })
      .catch(() => toast.error("Erro ao carregar opções de atribuição."))
      .finally(() => setLoadingOpts(false));
  }, [lead, open]);

  const corretoresFiltrados = useMemo(
    () => filterCorretoresByImobiliaria(corretores, imobiliariaId),
    [corretores, imobiliariaId],
  );

  useEffect(() => {
    if (corretorId == null) return;
    if (!corretoresFiltrados.some((c) => c.id === corretorId)) {
      setCorretorId(null);
    }
  }, [corretorId, corretoresFiltrados]);

  async function salvar() {
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await atualizarLeadAtribuicao(lead.id, {
        campanhaId,
        corretorId,
        imobiliariaId,
      });
      toast.success("Atribuição atualizada.");
      onSaved(updated);
      onHide();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar atribuição.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      header={lead ? `Atribuir · ${lead.nome}` : "Atribuir lead"}
      visible={open}
      onHide={() => !saving && onHide()}
      className="w-full max-w-md"
      pt={CRM_DIALOG_PT}
      modal
      dismissableMask={!saving}
    >
      {lead ? (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-white/50">
            Defina campanha de origem, imobiliária e corretor responsável pelo lead.
          </p>

          <div>
            <label className={CRM_QUAL_LABEL_CLASS}>Campanha</label>
            <Dropdown
              className={dropdownClass}
              value={campanhaId}
              options={campanhas.map((c) => ({ label: c.nome, value: c.id }))}
              onChange={(e) => setCampanhaId((e.value as number) ?? null)}
              placeholder={loadingOpts ? "Carregando…" : "Nenhuma"}
              showClear
              filter
              disabled={loadingOpts || saving}
              pt={CRM_QUAL_DROPDOWN_PT}
            />
          </div>

          <div>
            <label className={CRM_QUAL_LABEL_CLASS}>Imobiliária</label>
            <Dropdown
              className={dropdownClass}
              value={imobiliariaId}
              options={imobiliarias.map((i) => ({ label: i.label, value: i.id }))}
              onChange={(e) => setImobiliariaId((e.value as number) ?? null)}
              placeholder={loadingOpts ? "Carregando…" : "Nenhuma"}
              showClear
              filter
              disabled={loadingOpts || saving}
              pt={CRM_QUAL_DROPDOWN_PT}
            />
          </div>

          <div>
            <label className={CRM_QUAL_LABEL_CLASS}>Corretor</label>
            <Dropdown
              className={dropdownClass}
              value={corretorId}
              options={corretoresFiltrados.map((c) => ({
                label: c.imobiliariaRazaoSocial
                  ? `${c.nome} · ${c.imobiliariaRazaoSocial}`
                  : c.nome,
                value: c.id,
              }))}
              onChange={(e) => setCorretorId((e.value as number) ?? null)}
              placeholder={loadingOpts ? "Carregando…" : "Nenhum"}
              showClear
              filter
              disabled={loadingOpts || saving}
              pt={CRM_QUAL_DROPDOWN_PT}
            />
          </div>

          <Button
            label="Salvar atribuição"
            icon={<UserCog size={16} />}
            loading={saving}
            className="w-full"
            onClick={() => void salvar()}
          />
        </div>
      ) : null}
    </Dialog>
  );
}
