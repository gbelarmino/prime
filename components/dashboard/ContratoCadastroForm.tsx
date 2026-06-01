"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// PrimeReact Components
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Message } from "primereact/message";
import { Divider } from "primereact/divider";

import {
  getContratoHonorariosByIdUrl,
  getContratoHonorariosUrl,
  getContratoProximoNumeroUrl,
  getContratoHonorariosPdfAssinadoUrl,
  getContratoHonorariosPdfAssinadoUploadUrl,
  getContratoRegistrarLegadoUrl,
  getCorretoresListUrl,
  getImobiliariaMeUrl,
  getImobiliariasListUrl,
  getImoveisListUrl,
  getImovelByIdUrl,
  getImovelPrecoUrl,
  getImovelPrecoByLotUrl,
  getImoveisQuadrasUrl,
  getParametroByNomeUrl,
  isApiConfigured,
} from "@/lib/api-config";
import { apiFetch } from "@/lib/api-fetch";
import { UFS_BRASIL } from "@/lib/ufs-brasil";
import {
  canRegistrarContratoLegado,
  getAuthToken,
  getUserEmail,
  isAdmin as isAuthAdmin,
  isCorretor as isAuthCorretor,
  isImobiliaria as isAuthImobiliaria,
} from "@/lib/auth-storage";
import { cn } from "@/lib/utils";
import {
  contratoHonorariosFormSchema,
  contratoResponseToFormValues,
  contratoToApiPayload,
  emptyContratoHonorariosFormValues,
  type ContratoHonorariosApiResponse,
  type ContratoHonorariosFormValues,
  type PrecoLoteResponse,
} from "@/lib/validations/contrato-honorarios";
import { numberToBrlInputValue } from "@/lib/currency-brl";
import { formatCpfDisplay } from "@/lib/format-cpf";
import {
  fetchContratanteOption,
  mergeContratanteOptions,
  searchContratantes,
  type ContratanteOption,
} from "@/lib/contratante-service";

type SpringPage<T> = { content: T[] };

const CLIENTES_SEARCH_MIN_CHARS = 2;
const CLIENTES_SEARCH_DEBOUNCE_MS = 350;

type ClienteOpt = ContratanteOption;
type ImobOpt = { id: string; razaoSocial: string; email?: string };
type CorretorOpt = { id: string; nome: string; imobiliariaId: string; email?: string };
type ImovelOption = {
  id: string;
  empreendimento: string;
  quadra: string | null;
  lote: number | null;
  cidade?: string | null;
  uf?: string | null;
};

export type ContratoCadastroFormProps = {
  mode: "create" | "edit" | "legado";
  entityId?: number;
};

export function ContratoCadastroForm({ mode, entityId }: ContratoCadastroFormProps) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error">(
    mode === "edit" ? "loading" : "idle",
  );
  const [optsLoading, setOptsLoading] = useState(true);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const clientesSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientesSearchSeqRef = useRef(0);
  const [imobiliarias, setImobiliarias] = useState<ImobOpt[]>([]);
  const [corretores, setCorretores] = useState<CorretorOpt[]>([]);
  const [imoveis, setImoveis] = useState<ImovelOption[]>([]);
  const [quadras, setQuadras] = useState<string[]>([]);
  const [selectedQuadra, setSelectedQuadra] = useState<string>("");
  const [filteredLotes, setFilteredLotes] = useState<ImovelOption[]>([]);
  const [isAutomatico, setIsAutomatico] = useState(false);
  const [pdfLegado, setPdfLegado] = useState<File | null>(null);
  const [origemAssinatura, setOrigemAssinatura] = useState<string | null>(null);
  const [linkPdfAssinado, setLinkPdfAssinado] = useState<string | null>(null);
  const [contratoStatusOriginal, setContratoStatusOriginal] = useState<number | null>(null);
  const [minhaImobiliariaOpt, setMinhaImobiliariaOpt] = useState<ImobOpt | null>(null);
  const skipNextFetchRef = useRef(false);

  const isLegado = mode === "legado";
  const isContratoLegado = isLegado || origemAssinatura === "LEGADO_MANUAL";
  const canGerirPdfLegado =
    isLegado || (mode === "edit" && canRegistrarContratoLegado());

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<ContratoHonorariosFormValues>({
    resolver: zodResolver(contratoHonorariosFormSchema),
    mode: "onBlur",
    defaultValues: emptyContratoHonorariosFormValues(),
  });

  // Debug: mostrar erro de validação se existir
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("Validation Errors:", errors);
      const firstError = Object.values(errors)[0];
      if (firstError?.message) {
        toast.error(`Erro no formulário: ${firstError.message}`);
      }
    }
  }, [errors]);

  const contratanteId = watch("contratanteId");
  const imobiliariaId = watch("imobiliariaId");
  const imovelId = watch("imovelId");
  const dataAssinatura = watch("dataAssinatura");

  const ensureClienteSelectedInOptions = useCallback(async (id: string) => {
    if (!id) return;
    const opt = await fetchContratanteOption(Number(id));
    if (!opt) return;
    setClientes((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      return mergeContratanteOptions(prev, opt);
    });
  }, []);

  const runClientesSearch = useCallback(
    async (rawFilter: string) => {
      const term = rawFilter.trim();
      if (term.length > 0 && term.length < CLIENTES_SEARCH_MIN_CHARS) {
        setClientes((prev) => {
          const selected =
            contratanteId && contratanteId !== ""
              ? prev.find((c) => c.id === contratanteId) ?? null
              : null;
          return selected ? [selected] : [];
        });
        return;
      }

      const seq = ++clientesSearchSeqRef.current;
      setClientesLoading(true);
      try {
        const found = await searchContratantes(term);
        if (seq !== clientesSearchSeqRef.current) return;
        setClientes((prev) => {
          const selected =
            contratanteId && contratanteId !== ""
              ? prev.find((c) => c.id === contratanteId) ?? null
              : null;
          return mergeContratanteOptions(found, selected);
        });
      } catch {
        if (seq === clientesSearchSeqRef.current) {
          toast.error("Não foi possível buscar clientes.");
        }
      } finally {
        if (seq === clientesSearchSeqRef.current) {
          setClientesLoading(false);
        }
      }
    },
    [contratanteId],
  );

  const scheduleClientesSearch = useCallback(
    (filter: string) => {
      if (clientesSearchTimerRef.current) {
        clearTimeout(clientesSearchTimerRef.current);
      }
      clientesSearchTimerRef.current = setTimeout(() => {
        void runClientesSearch(filter);
      }, CLIENTES_SEARCH_DEBOUNCE_MS);
    },
    [runClientesSearch],
  );

  useEffect(() => {
    return () => {
      if (clientesSearchTimerRef.current) {
        clearTimeout(clientesSearchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!contratanteId) return;
    void ensureClienteSelectedInOptions(contratanteId);
  }, [contratanteId, ensureClienteSelectedInOptions]);

  const isImobiliaria = isAuthImobiliaria();
  const isCorretor = isAuthCorretor();
  const canEditValoresFinanceiros = isAuthAdmin();
  const canEditAgendamentoParcelas = isAuthAdmin() || isCorretor || isImobiliaria;

  useEffect(() => {
    if (isLegado && !canRegistrarContratoLegado()) {
      toast.error("Sem permissão para registar contratos legados.");
      router.replace("/dashboard/contratos");
    }
  }, [isLegado, router]);

  // Load Lists (Clientes, Imobiliarias, etc.)
  useEffect(() => {
    if (!isApiConfigured()) {
      setOptsLoading(false);
      return;
    }
    const token = getAuthToken();
    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    setOptsLoading(true);
    void (async () => {
      try {
        const situacaoFiltro = mode === "create" ? 1 : undefined;

        const imobListPromise = isImobiliaria
          ? apiFetch(getImobiliariaMeUrl(), { headers, credentials: "omit" })
          : isCorretor
            ? Promise.resolve(null)
            : apiFetch(getImobiliariasListUrl(0, 500), { headers, credentials: "omit" });

        const [rImob, r3, r4] = await Promise.all([
          imobListPromise,
          apiFetch(getCorretoresListUrl(0, 500), { headers, credentials: "omit" }),
          apiFetch(getImoveisQuadrasUrl(situacaoFiltro), { headers, credentials: "omit" }),
        ]);

        if (rImob?.ok) {
          if (isImobiliaria) {
            const i = (await rImob.json()) as { id: number; razaoSocial: string; email?: string };
            const opt: ImobOpt = { id: String(i.id), razaoSocial: i.razaoSocial, email: i.email };
            setImobiliarias([opt]);
            setMinhaImobiliariaOpt(opt);
          } else {
            const p = (await rImob.json()) as SpringPage<{ id: number; razaoSocial: string; email?: string }>;
            setImobiliarias((p.content ?? []).map(i => ({ ...i, id: String(i.id) })));
          }
        }
        if (r3.ok) {
          const p = (await r3.json()) as SpringPage<{ id: number; nome: string; imobiliariaId: number; email?: string }>;
          setCorretores((p.content ?? []).map(c => ({ ...c, id: String(c.id), imobiliariaId: String(c.imobiliariaId) })));
        }
        if (r4.ok) {
          const qds = (await r4.json()) as string[];
          setQuadras(qds);
        }

        // Busca parâmetro de numeração automática
        const r5 = await apiFetch(getParametroByNomeUrl("NUMERACAO_AUTOMATICA"), { headers, credentials: "omit" });
        if (r5.ok) {
          const data = (await r5.json()) as { valor: string };
          setIsAutomatico(data.valor === "S");
        } else {
          setIsAutomatico(false);
        }
      } catch {
        toast.error("Erro ao carregar listas para o formulário.");
      } finally {
        setOptsLoading(false);
      }
    })();
  }, [mode, isImobiliaria, isCorretor]);

  // Perfil imobiliária: imobiliária fixa (create, edit e legado); corretor livre na lista filtrada
  useEffect(() => {
    if (!isImobiliaria || !minhaImobiliariaOpt) return;
    if (mode === "edit" && loadState !== "idle") return;
    setValue("imobiliariaId", minhaImobiliariaOpt.id, { shouldValidate: true });
  }, [isImobiliaria, minhaImobiliariaOpt, mode, loadState, setValue]);

  // Filter Corretores by Imobiliaria
  useEffect(() => {
    if (!imobiliariaId) return;
    const allowed = corretores.filter((c) => String(c.imobiliariaId) === String(imobiliariaId));
    const cur = getValues("corretorId");
    if (cur && !allowed.some((c) => String(c.id) === cur)) {
      setValue("corretorId", "");
    }
  }, [imobiliariaId, corretores, getValues, setValue]);

  // Numeração automática: pré-visualizar seq/quadra+lote ao selecionar o lote
  useEffect(() => {
    if (!isAutomatico || mode !== "create" || !imovelId) {
      if (isAutomatico && mode === "create" && !imovelId) {
        setValue("numeroContrato", "");
      }
      return;
    }

    const fetchPreview = async () => {
      const token = getAuthToken();
      try {
        const res = await apiFetch(getContratoProximoNumeroUrl(Number(imovelId)), {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "omit",
          skipLoading: true,
        });
        if (res.ok) {
          const data = (await res.json()) as { numeroContrato?: string };
          setValue("numeroContrato", data.numeroContrato ?? "");
        }
      } catch {
        // preview opcional — gravação continua gerando no backend
      }
    };

    void fetchPreview();
  }, [isAutomatico, mode, imovelId, setValue]);

  // Fetch Preço do Lote when Imovel is selected
  useEffect(() => {
    if (!imovelId) return;
    if (mode === "edit" && !canEditValoresFinanceiros) return;
    if (mode === "edit" && skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const fetchPreco = async () => {
      const selectedImovel = imoveis.find((o) => String(o.id) === String(imovelId));
      const url = (selectedImovel?.quadra && selectedImovel?.lote)
        ? getImovelPrecoByLotUrl(selectedImovel.quadra, selectedImovel.lote)
        : getImovelPrecoUrl(Number(imovelId));
      const token = getAuthToken();
      try {
        const res = await apiFetch(url, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "omit",
        });
        if (res.ok) {
          const data = (await res.json()) as PrecoLoteResponse;
          if (data.valorNegociacao != null) setValue("valorNegociacao", numberToBrlInputValue(data.valorNegociacao));
          if (data.valorLote != null) setValue("valorLote", numberToBrlInputValue(data.valorLote));
          if (data.valorComissaoCorretagem != null) setValue("valorComissaoCorretagem", numberToBrlInputValue(data.valorComissaoCorretagem));
          if (data.valorSinal != null) setValue("valorHonorarioEntrada", numberToBrlInputValue(data.valorSinal));
          if (data.valorBoletoImobiliaria != null) setValue("valorParcelaHonorarioEntrada", numberToBrlInputValue(data.valorBoletoImobiliaria));
          if (data.numParcelasFracionamento != null) setValue("numParcelasMensaisEntrada", String(data.numParcelasFracionamento));
          if (data.valorBoletoVendedora != null) setValue("parcelaSubsequente", numberToBrlInputValue(data.valorBoletoVendedora));
          if (data.valorParcela != null) setValue("valorParcela", numberToBrlInputValue(data.valorParcela));
          if (data.numParcelas != null) setValue("numParcelasMensais", String(data.numParcelas));
          if (data.tipoCorrecaoAnual != null) setValue("tipoCorrecaoAnual", data.tipoCorrecaoAnual);
          if (data.percentualCorrecao != null) setValue("percentualCorrecao", String(data.percentualCorrecao));
          if (data.periodicidadeCorrecao != null) setValue("periodicidadeCorrecao", data.periodicidadeCorrecao);
          if (data.taxaJurosRemuneratorios != null) setValue("taxaJurosRemuneratorios", String(data.taxaJurosRemuneratorios));
          if (data.periodicidadeJuros != null) setValue("periodicidadeJuros", data.periodicidadeJuros);
          if (data.limiteReajusteAnual != null) setValue("limiteReajusteAnual", String(data.limiteReajusteAnual));
          if (data.valorBaseLeilao != null) setValue("valorBaseLeilao", numberToBrlInputValue(data.valorBaseLeilao));
          if (data.numParcelasFracionamento != null) setValue("quantidadeParcelasFracionadas", String(data.numParcelasFracionamento));
          if (data.valorBoletoVendedora != null) setValue("valorFracionadoVendedora", numberToBrlInputValue(data.valorBoletoVendedora));
          if (data.valorBoletoImobiliaria != null) setValue("valorFracionadoIntermediaria", numberToBrlInputValue(data.valorBoletoImobiliaria));

          toast.info("Valores sugeridos carregados para este lote.");
        }
      } catch (error) {
        console.error("Erro ao buscar preço do lote:", error);
      }
    };

    fetchPreco();
  }, [imovelId, mode, setValue, imoveis, canEditValoresFinanceiros]);

  // Sync selectedQuadra when imovelId changes (important for edit mode)
  useEffect(() => {
    if (!imovelId) return;

    // Se já temos a quadra selecionada e o imovelId pertence a ela, não fazemos nada
    if (selectedQuadra && filteredLotes.some(i => String(i.id) === String(imovelId))) {
      return;
    }

    const fetchImovelDetail = async () => {
      const url = getImovelByIdUrl(Number(imovelId));
      const token = getAuthToken();
      const headers = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      try {
        const res = await apiFetch(url, { headers, credentials: "omit" });
        if (res.ok) {
          const data = (await res.json()) as ImovelOption;
          if (data.quadra) {
            setSelectedQuadra(data.quadra);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar detalhe do imóvel para sincronizar quadra:", err);
      }
    };

    fetchImovelDetail();
  }, [imovelId]);

  // Update filteredLotes when selectedQuadra changes
  useEffect(() => {
    if (!selectedQuadra) {
      setFilteredLotes([]);
      return;
    }

    const fetchLotes = async () => {
      const situacaoFiltro = mode === "create" ? 1 : undefined;
      const url = getImoveisListUrl(0, 500, undefined, selectedQuadra, situacaoFiltro);
      const token = getAuthToken();
      const headers = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      try {
        const res = await apiFetch(url, { headers, credentials: "omit" });
        if (res.ok) {
          const p = (await res.json()) as SpringPage<ImovelOption>;
          const list = (p.content ?? []).map(i => ({ ...i, id: String(i.id) }));
          list.sort((a, b) => (a.lote ?? 0) - (b.lote ?? 0));
          setFilteredLotes(list);
        }
      } catch (err) {
        console.error("Erro ao carregar lotes da quadra:", err);
      }
    };

    fetchLotes();
  }, [selectedQuadra, mode]);

  // Load Entity if Edit Mode
  useEffect(() => {
    if (mode !== "edit" || entityId == null) {
      setLoadState("idle");
      return;
    }
    const url = getContratoHonorariosByIdUrl(entityId);
    const token = getAuthToken();
    setLoadState("loading");
    void (async () => {
      try {
        const res = await apiFetch(url, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "omit",
        });
        if (!res.ok) {
          toast.error("Não foi possível carregar o contrato.");
          setLoadState("error");
          return;
        }
        const data = (await res.json()) as ContratoHonorariosApiResponse;
        skipNextFetchRef.current = true;
        reset(contratoResponseToFormValues(data));
        if (data.contratante) {
          setClientes([
            {
              id: String(data.contratante.id),
              nome: data.contratante.label,
            },
          ]);
        }
        setOrigemAssinatura(data.origemAssinatura ?? null);
        setLinkPdfAssinado(data.linkPdfAssinado ?? null);
        const st = data.status != null ? Number(data.status) : null;
        setContratoStatusOriginal(Number.isFinite(st) ? st : null);
        setLoadState("idle");
      } catch {
        toast.error("Erro de rede.");
        setLoadState("error");
      }
    })();
  }, [mode, entityId, reset]);

  // Auto-fill suggested dates
  useEffect(() => {
    if (mode === "create" && dataAssinatura) {
      const date = new Date(dataAssinatura + "T00:00:00");
      if (!isNaN(date.getTime())) {
        let nextMonth = date.getMonth() + 1;
        let year = date.getFullYear();
        if (nextMonth > 11) {
          nextMonth = 0;
          year++;
        }
        const mm = String(nextMonth + 1).padStart(2, "0");
        const suggestedDateStr = `${year}-${mm}-05`;
        setValue("dataPrimeiraParcela", suggestedDateStr);
        setValue("diaVencimento", "5");
      }
    }
  }, [dataAssinatura, mode, setValue]);

  // Auth-based auto-fill: corretor pré-seleciona a si mesmo (somente criação)
  useEffect(() => {
    if (mode !== "create" || optsLoading || !isCorretor) return;

    const email = getUserEmail();
    if (!email) return;

    const token = getAuthToken();
    const headers = {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    void (async () => {
      const url = getCorretoresListUrl(0, 200, email);
      try {
        const res = await apiFetch(url, { headers, credentials: "omit" });
        if (res.ok) {
          const page = (await res.json()) as {
            content: {
              id: number;
              nome: string;
              imobiliariaId: number;
              imobiliariaRazaoSocial?: string;
              email?: string;
            }[];
          };
          const found = page.content.find((c) => c.email?.toLowerCase() === email.toLowerCase())
            ?? page.content[0];
          if (found) {
            setValue("imobiliariaId", String(found.imobiliariaId), { shouldValidate: true });
            setValue("corretorId", String(found.id), { shouldValidate: true });
            if (found.imobiliariaRazaoSocial) {
              setImobiliarias([{
                id: String(found.imobiliariaId),
                razaoSocial: found.imobiliariaRazaoSocial,
              }]);
            }
          }
        }
      } catch { /* silencia */ }
    })();
  }, [mode, optsLoading, setValue, isCorretor]);


  async function openPdfAssinado() {
    if (entityId == null) return;
    const url = getContratoHonorariosPdfAssinadoUrl(entityId);
    if (!url) return;
    const token = getAuthToken();
    const loadingId = toast.loading("Abrindo PDF…");
    try {
      const res = await apiFetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "omit",
      });
      if (!res.ok) {
        toast.error("PDF assinado não disponível.", { id: loadingId });
        return;
      }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank", "noopener,noreferrer");
      toast.dismiss(loadingId);
    } catch {
      toast.error("Erro ao abrir o PDF.", { id: loadingId });
    }
  }

  async function onSubmit(values: ContratoHonorariosFormValues) {
    if (!isApiConfigured()) {
      toast.error("Configure a API.");
      return;
    }
    if (isLegado && !pdfLegado) {
      toast.error("Envie o PDF do contrato já assinado.");
      return;
    }
    if (
      mode === "edit" &&
      isContratoLegado &&
      canGerirPdfLegado &&
      !linkPdfAssinado &&
      !pdfLegado
    ) {
      toast.error("Anexe o PDF do contrato já assinado antes de salvar.");
      return;
    }

    const token = getAuthToken();
    const payload = contratoToApiPayload(values);
    if (mode === "edit" && isContratoLegado && contratoStatusOriginal != null) {
      payload.status = contratoStatusOriginal;
    }

    try {
      if (isLegado) {
        const url = getContratoRegistrarLegadoUrl();
        const formData = new FormData();
        formData.append(
          "dados",
          new Blob([JSON.stringify(payload)], { type: "application/json" }),
        );
        formData.append("file", pdfLegado!);
        const res = await apiFetch(url, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          credentials: "omit",
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          toast.error(errorData.message || "Erro ao registar contrato legado.");
          return;
        }
        toast.success("Contrato legado registado como assinado.");
        router.push("/dashboard/contratos");
        return;
      }

      const url = mode === "create" ? getContratoHonorariosUrl() : getContratoHonorariosByIdUrl(entityId!);
      const res = await apiFetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        credentials: "omit",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.message || "Erro ao salvar contrato.";
        toast.error(message);
        return;
      }

      if (mode === "edit" && isContratoLegado && pdfLegado && entityId != null) {
        const pdfUrl = getContratoHonorariosPdfAssinadoUploadUrl(entityId);
        const formData = new FormData();
        formData.append("file", pdfLegado);
        const pdfRes = await apiFetch(pdfUrl, {
          method: "PUT",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
          credentials: "omit",
        });
        if (!pdfRes.ok) {
          const errorData = await pdfRes.json().catch(() => ({}));
          toast.error(
            (errorData as { message?: string }).message ||
              "Contrato salvo, mas não foi possível enviar o PDF.",
          );
          return;
        }
        setLinkPdfAssinado((await pdfRes.json() as ContratoHonorariosApiResponse).linkPdfAssinado ?? null);
        setPdfLegado(null);
      }

      toast.success(mode === "create" ? "Contrato cadastrado." : "Contrato atualizado.");
      router.push("/dashboard/contratos");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro de rede ou no processamento.");
    }
  }


  if (loadState === "error") {
    return (
      <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center">
        <Message severity="error" text="Não foi possível carregar o contrato." />
        <Button label="Voltar" icon="pi pi-arrow-left" className="p-button-text mt-4" onClick={() => router.back()} />
      </div>
    );
  }

  const formatImovelLabel = (i: ImovelOption) => {
    let s = i.empreendimento;
    if (i.quadra) s += ` Q.${i.quadra}`;
    if (i.lote != null) s += ` Lt.${i.lote}`;
    return s;
  };

  const statusOptions = mode === "create" || isContratoLegado
    ? [{ label: "Proposta", value: "1" }]
    : [
      { label: "Proposta", value: "1" },
      { label: "Revisão", value: "2" },
      { label: "Aprovado", value: "3" },
      { label: "Reprovado", value: "4" },
      { label: "Proposta Enviada", value: "5" },
    ];

  const vencimentoOptions = [
    { label: "Dia 5", value: "5" },
    { label: "Dia 10", value: "10" },
    { label: "Dia 15", value: "15" },
    { label: "Dia 20", value: "20" },
    { label: "Dia 25", value: "25" },
    { label: "Dia 30", value: "30" },
  ];

  const tipoCorrecaoOptions = [
    { label: "IGPM", value: "IGPM" },
    { label: "IPCA", value: "IPCA" },
    { label: "INPC", value: "INPC" },
    { label: "Nenhum", value: "NENHUM" },
  ];

  const periodicidadeOptions = [
    { label: "Cada 6 meses", value: "CADA_6_MESES" },
    { label: "Cada 12 meses", value: "CADA_12_MESES" },
  ];

  const periodicidadeJurosOptions = [
    { label: "Mensal", value: "MENSAL" },
    { label: "Anual", value: "ANUAL" },
  ];

  return (
    <div className="card">
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl flex flex-col gap-8" noValidate>

        {isContratoLegado && (
          <div
            role="status"
            className="flex items-start gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-5"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400"
              aria-hidden
            >
              <i className="pi pi-info-circle text-[1.35rem] leading-none" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
              <p className="text-sm font-semibold text-emerald-300">Contrato atípico / legado</p>
              <p className="text-sm leading-relaxed text-white/65">
                {isLegado ? (
                  <>
                    Será registado diretamente como{" "}
                    <span className="font-medium text-white/85">Assinado</span>, sem proposta nem Clicksign.
                    Anexe o PDF já assinado no final do formulário.
                  </>
                ) : (
                  <>
                    Contrato importado do legado, sem fluxo Clicksign.{" "}
                    {canGerirPdfLegado
                      ? "Anexe ou substitua o PDF assinado na secção abaixo."
                      : "O PDF assinado é gerido pelo administrador."}
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Partes do Contrato */}
        <section className="flex flex-col gap-4 border-l-4 border-blue-500 pl-6 py-2">
          <h2 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
            <i className="pi pi-users"></i> Partes do Contrato
          </h2>
          <Divider className="mt-0 opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-white/90 font-medium">Cliente (Contratante) <span className="text-rose-400">*</span></label>
              <Controller
                name="contratanteId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={clientes}
                    optionLabel="nome"
                    optionValue="id"
                    filter
                    filterBy="nome,cpf,email"
                    onFilter={(e) => scheduleClientesSearch(e.filter)}
                    onShow={() => {
                      if (clientes.length === 0 && field.value) {
                        void ensureClienteSelectedInOptions(String(field.value));
                      }
                    }}
                    loading={clientesLoading}
                    placeholder="Digite nome, CPF ou e-mail para buscar"
                    emptyFilterMessage={`Digite ao menos ${CLIENTES_SEARCH_MIN_CHARS} caracteres`}
                    emptyMessage="Nenhum cliente encontrado"
                    className={cn("w-full", { "p-invalid": errors.contratanteId })}
                    itemTemplate={(option: ClienteOpt) => (
                      <div className="flex flex-col gap-0.5 py-0.5">
                        <span className="text-sm text-white">{option.nome}</span>
                        {(option.cpf || option.email) && (
                          <span className="text-[10px] text-white/45">
                            {[option.cpf ? formatCpfDisplay(option.cpf) : null, option.email]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                    )}
                  />
                )}
              />
              {errors.contratanteId && <small className="p-error">{errors.contratanteId.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Imobiliária <span className="text-rose-400">*</span></label>
              <Controller
                name="imobiliariaId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={imobiliarias}
                    optionLabel="razaoSocial"
                    optionValue="id"
                    placeholder="Selecione"
                    className={cn("w-full", { "p-invalid": errors.imobiliariaId })}
                    disabled={optsLoading || isImobiliaria || isCorretor}
                  />
                )}
              />
              {errors.imobiliariaId && <small className="p-error">{errors.imobiliariaId.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Corretor <span className="text-rose-400">*</span></label>
              <Controller
                name="corretorId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={corretores.filter((c) =>
                      String(c.imobiliariaId) === String(imobiliariaId),
                    )}
                    optionLabel="nome"
                    optionValue="id"
                    placeholder={imobiliariaId ? "Selecione" : "Escolha a imobiliária"}
                    className={cn("w-full", { "p-invalid": errors.corretorId })}
                    disabled={optsLoading || isCorretor || !imobiliariaId}
                  />
                )}
              />
              {errors.corretorId && <small className="p-error">{errors.corretorId.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Quadra <span className="text-rose-400">*</span></label>
              <Dropdown
                value={selectedQuadra}
                options={quadras.map(q => ({ label: `Quadra ${q}`, value: q }))}
                onChange={(e) => {
                  setSelectedQuadra(e.value);
                  setValue("imovelId", ""); // Reseta o lote ao mudar a quadra
                }}
                placeholder="Selecione a quadra"
                className="w-full"
                filter
                disabled={optsLoading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Lote <span className="text-rose-400">*</span></label>
              <Controller
                name="imovelId"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={filteredLotes}
                    optionLabel="lote"
                    optionValue="id"
                    filter
                    placeholder={selectedQuadra ? "Selecione o lote" : "Selecione primeiro a quadra"}
                    className={cn("w-full", { "p-invalid": errors.imovelId })}
                    disabled={optsLoading || !selectedQuadra}
                    itemTemplate={(opt: ImovelOption) => `Lote ${opt.lote}`}
                    valueTemplate={(opt: ImovelOption, props) => {
                      if (!opt) return props.placeholder;
                      return `Lote ${opt.lote}`;
                    }}
                  />
                )}
              />
              {errors.imovelId && <small className="p-error">{errors.imovelId.message}</small>}
            </div>
          </div>
        </section>

        {/* Dados do Contrato */}
        <section className="flex flex-col gap-4 border-l-4 border-purple-500 pl-6 py-2">
          <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
            <i className="pi pi-file"></i> Dados do Contrato
          </h2>
          <Divider className="mt-0 opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">
                Número do Contrato {!isAutomatico && <span className="text-rose-400">*</span>}
              </label>
              <Controller
                name="numeroContrato"
                control={control}
                render={({ field }) => (
                  <InputText 
                    {...field} 
                    readOnly={isAutomatico} 
                    placeholder={
                      isAutomatico && mode === "create"
                        ? imovelId
                          ? "Gerando número…"
                          : "Selecione o lote para gerar o número"
                        : "Digite o número"
                    }
                    className={cn("w-full tabular-nums", { 
                      "opacity-70 cursor-default bg-white/5": isAutomatico,
                      "p-invalid": errors.numeroContrato 
                    })} 
                  />
                )}
              />
              {errors.numeroContrato && <small className="p-error">{errors.numeroContrato.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Data de Assinatura <span className="text-rose-400">*</span></label>
              <Controller
                name="dataAssinatura"
                control={control}
                render={({ field }) => (
                  <InputText type="date" {...field} className={cn("w-full", { "p-invalid": errors.dataAssinatura })} />
                )}
              />
            </div>

            {!isContratoLegado ? (
              <div className="flex flex-col gap-2">
                <label className="text-white/90 font-medium">Status <span className="text-rose-400">*</span></label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      {...field}
                      options={statusOptions}
                      className={cn("w-full", { "p-invalid": errors.status })}
                    />
                  )}
                />
                {errors.status && <small className="p-error">{errors.status.message}</small>}
              </div>
            ) : (
              <div className="flex flex-col gap-2 justify-end">
                <label className="text-white/90 font-medium">Situação</label>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                  Assinado (registo legado)
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-white/90 font-medium">Cidade de Assinatura <span className="text-rose-400">*</span></label>
              <Controller
                name="cidadeAssinatura"
                control={control}
                render={({ field }) => (
                  <InputText {...field} className={cn("w-full", { "p-invalid": errors.cidadeAssinatura })} />
                )}
              />
              {errors.cidadeAssinatura && <small className="p-error">{errors.cidadeAssinatura.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">UF <span className="text-rose-400">*</span></label>
              <Controller
                name="ufAssinatura"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    options={UFS_BRASIL.map(uf => ({ label: uf, value: uf }))}
                    placeholder="Selecione"
                    className={cn("w-full", { "p-invalid": errors.ufAssinatura })}
                  />
                )}
              />
              {errors.ufAssinatura && <small className="p-error">{errors.ufAssinatura.message}</small>}
            </div>
          </div>
        </section>

        {/* Condições Financeiras */}
        <section className="flex flex-col gap-4 border-l-4 border-green-500 pl-6 py-2">
          <h2 className="text-xl font-semibold text-green-400 flex items-center gap-2">
            <i className="pi pi-money-bill"></i> Condições Financeiras
          </h2>
          {!canEditValoresFinanceiros && (
            <Message
              severity="info"
              text="Valores e parcelas vêm da tabela de preços do lote. Corretor e imobiliária podem alterar apenas a data da 1ª parcela e o dia de vencimento."
              className="w-full"
            />
          )}
          <Divider className="mt-0 opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Usando InputNumber para facilitar a vida do usuário com BRL */}
            {[
              { name: "valorNegociacao", label: "Valor Negociação" },
              { name: "valorLote", label: "Valor do Lote" },
              { name: "valorComissaoCorretagem", label: "Comissão Corretagem" },
              { name: "valorHonorarioEntrada", label: "Valor do Sinal" },
              { name: "valorParcelaHonorarioEntrada", label: "Valor Parcela Imobiliária" },
              { name: "parcelaSubsequente", label: "Valor Parcela Incorporadora" },
              { name: "valorParcela", label: "Valor Parcela Mensal" },
            ].map((field) => (
              <div key={field.name} className="flex flex-col gap-2">
                <label className="text-white/90 font-medium">{field.label} <span className="text-rose-400">*</span></label>
                <Controller
                  name={field.name as any}
                  control={control}
                  render={({ field: f }) => (
                    <InputText
                      {...f}
                      disabled={!canEditValoresFinanceiros}
                      placeholder="R$ 0,00"
                      className={cn("w-full tabular-nums", { "p-invalid": errors[field.name as keyof typeof errors] })}
                    />
                  )}
                />
                {errors[field.name as keyof typeof errors] && (
                  <small className="p-error">{(errors[field.name as keyof typeof errors] as any)?.message}</small>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Nº Parcelas Sinal <span className="text-rose-400">*</span></label>
              <Controller
                name="numParcelasMensaisEntrada"
                control={control}
                render={({ field }) => (
                  <InputText {...field} disabled={!canEditValoresFinanceiros} className={cn("w-full", { "p-invalid": errors.numParcelasMensaisEntrada })} />
                )}
              />
              {errors.numParcelasMensaisEntrada && <small className="p-error">{errors.numParcelasMensaisEntrada.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Nº Parcelas Mensais <span className="text-rose-400">*</span></label>
              <Controller
                name="numParcelasMensais"
                control={control}
                render={({ field }) => (
                  <InputText {...field} disabled={!canEditValoresFinanceiros} className={cn("w-full", { "p-invalid": errors.numParcelasMensais })} />
                )}
              />
              {errors.numParcelasMensais && <small className="p-error">{errors.numParcelasMensais.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Data 1ª Parcela <span className="text-rose-400">*</span></label>
              <Controller
                name="dataPrimeiraParcela"
                control={control}
                render={({ field }) => (
                  <InputText type="date" {...field} disabled={!canEditAgendamentoParcelas} className={cn("w-full", { "p-invalid": errors.dataPrimeiraParcela })} />
                )}
              />
              {errors.dataPrimeiraParcela && <small className="p-error">{errors.dataPrimeiraParcela.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Dia Vencimento <span className="text-rose-400">*</span></label>
              <Controller
                name="diaVencimento"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    disabled={!canEditAgendamentoParcelas}
                    options={vencimentoOptions}
                    placeholder="Selecione"
                    className={cn("w-full", { "p-invalid": errors.diaVencimento })}
                  />
                )}
              />
              {errors.diaVencimento && <small className="p-error">{errors.diaVencimento.message}</small>}
            </div>
          </div>
        </section>

        {/* Seção Oculta Temporariamente: Fracionamento e Leilão 
        <section className="flex flex-col gap-4 border-l-4 border-orange-500 pl-6 py-2">
          <h2 className="text-xl font-semibold text-orange-400 flex items-center gap-2">
            <i className="pi pi-list"></i> Fracionamento e Leilão
          </h2>
          <Divider className="mt-0 opacity-20" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Qtd. Parcelas Fracionadas <span className="text-rose-400">*</span></label>
              <Controller
                name="quantidadeParcelasFracionadas"
                control={control}
                render={({ field }) => (
                  <InputText {...field} className={cn("w-full", { "p-invalid": errors.quantidadeParcelasFracionadas })} />
                )}
              />
              {errors.quantidadeParcelasFracionadas && <small className="p-error">{errors.quantidadeParcelasFracionadas.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Valor Boleto Vendedora <span className="text-rose-400">*</span></label>
              <Controller
                name="valorFracionadoVendedora"
                control={control}
                render={({ field }) => (
                  <InputText {...field} placeholder="R$ 0,00" className={cn("w-full tabular-nums", { "p-invalid": errors.valorFracionadoVendedora })} />
                )}
              />
              {errors.valorFracionadoVendedora && <small className="p-error">{errors.valorFracionadoVendedora.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Valor Boleto Imobiliária <span className="text-rose-400">*</span></label>
              <Controller
                name="valorFracionadoIntermediaria"
                control={control}
                render={({ field }) => (
                  <InputText {...field} placeholder="R$ 0,00" className={cn("w-full tabular-nums", { "p-invalid": errors.valorFracionadoIntermediaria })} />
                )}
              />
              {errors.valorFracionadoIntermediaria && <small className="p-error">{errors.valorFracionadoIntermediaria.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Valor Base Leilão <span className="text-rose-400">*</span></label>
              <Controller
                name="valorBaseLeilao"
                control={control}
                render={({ field }) => (
                  <InputText {...field} placeholder="R$ 0,00" className={cn("w-full tabular-nums", { "p-invalid": errors.valorBaseLeilao })} />
                )}
              />
              {errors.valorBaseLeilao && <small className="p-error">{errors.valorBaseLeilao.message}</small>}
            </div>
          </div>
        </section>
        */}

        {/* Correção e Juros */}
        <section className="flex flex-col gap-4 border-l-4 border-purple-500 pl-6 py-2">
          <h2 className="text-xl font-semibold text-purple-400 flex items-center gap-2">
            <i className="pi pi-percentage"></i> Correção e Juros
          </h2>
          {!canEditValoresFinanceiros && (
            <Message
              severity="info"
              text="Correção, juros e limites de reajuste seguem a tabela de preços e só podem ser editados por administradores."
              className="w-full"
            />
          )}
          <Divider className="mt-0 opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Tipo Correção <span className="text-rose-400">*</span></label>
              <Controller
                name="tipoCorrecaoAnual"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    disabled={!canEditValoresFinanceiros}
                    options={tipoCorrecaoOptions}
                    className={cn("w-full", { "p-invalid": errors.tipoCorrecaoAnual })}
                  />
                )}
              />
              {errors.tipoCorrecaoAnual && <small className="p-error">{errors.tipoCorrecaoAnual.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">% Correção <span className="text-rose-400">*</span></label>
              <Controller
                name="percentualCorrecao"
                control={control}
                render={({ field }) => (
                  <InputText {...field} disabled={!canEditValoresFinanceiros} className={cn("w-full", { "p-invalid": errors.percentualCorrecao })} />
                )}
              />
              {errors.percentualCorrecao && <small className="p-error">{errors.percentualCorrecao.message}</small>}
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-white/90 font-medium">Periodicidade <span className="text-rose-400">*</span></label>
              <Controller
                name="periodicidadeCorrecao"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    disabled={!canEditValoresFinanceiros}
                    options={periodicidadeOptions}
                    className={cn("w-full", { "p-invalid": errors.periodicidadeCorrecao })}
                  />
                )}
              />
              {errors.periodicidadeCorrecao && <small className="p-error">{errors.periodicidadeCorrecao.message}</small>}
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-white/90 font-medium whitespace-nowrap">Taxa Juros Remuneratórios (%) <span className="text-rose-400">*</span></label>
              <Controller
                name="taxaJurosRemuneratorios"
                control={control}
                render={({ field }) => (
                  <InputText {...field} disabled={!canEditValoresFinanceiros} className={cn("w-full", { "p-invalid": errors.taxaJurosRemuneratorios })} />
                )}
              />
              {errors.taxaJurosRemuneratorios && <small className="p-error">{errors.taxaJurosRemuneratorios.message}</small>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">Periodicidade Juros <span className="text-rose-400">*</span></label>
              <Controller
                name="periodicidadeJuros"
                control={control}
                render={({ field }) => (
                  <Dropdown
                    {...field}
                    disabled={!canEditValoresFinanceiros}
                    options={periodicidadeJurosOptions}
                    className={cn("w-full", { "p-invalid": errors.periodicidadeJuros })}
                  />
                )}
              />
              {errors.periodicidadeJuros && <small className="p-error">{errors.periodicidadeJuros.message}</small>}
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-white/90 font-medium whitespace-nowrap">Limite Reajuste Anual (%) <span className="text-rose-400">*</span></label>
              <Controller
                name="limiteReajusteAnual"
                control={control}
                render={({ field }) => (
                  <InputText {...field} disabled={!canEditValoresFinanceiros} className={cn("w-full", { "p-invalid": errors.limiteReajusteAnual })} />
                )}
              />
              {errors.limiteReajusteAnual && <small className="p-error">{errors.limiteReajusteAnual.message}</small>}
            </div>
          </div>
        </section>

        {isContratoLegado && canGerirPdfLegado && (
          <section className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-6 py-2">
            <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
              <i className="pi pi-file-pdf"></i> Contrato assinado (PDF)
            </h2>
            <Divider className="mt-0 opacity-20" />
            {mode === "edit" && linkPdfAssinado && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-white/60">PDF já anexado ao contrato.</span>
                <Button
                  type="button"
                  label="Ver PDF"
                  icon="pi pi-external-link"
                  severity="secondary"
                  outlined
                  className="p-button-sm"
                  onClick={() => void openPdfAssinado()}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label className="text-white/90 font-medium">
                {isLegado || !linkPdfAssinado ? (
                  <>
                    Arquivo PDF <span className="text-rose-400">*</span>
                  </>
                ) : (
                  "Substituir PDF (opcional)"
                )}
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-white"
                onChange={(e) => setPdfLegado(e.target.files?.[0] ?? null)}
              />
              {pdfLegado ? (
                <small className="text-emerald-400/80">{pdfLegado.name}</small>
              ) : (
                <small className="text-white/40">
                  Máximo 15 MB. Será guardado na mesma pasta dos contratos assinados via Clicksign.
                </small>
              )}
            </div>
          </section>
        )}

        {isContratoLegado && mode === "edit" && !canGerirPdfLegado && linkPdfAssinado && (
          <section className="flex flex-col gap-4 border-l-4 border-emerald-500 pl-6 py-2">
            <h2 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
              <i className="pi pi-file-pdf"></i> Contrato assinado (PDF)
            </h2>
            <Divider className="mt-0 opacity-20" />
            <Button
              type="button"
              label="Ver PDF assinado"
              icon="pi pi-external-link"
              severity="secondary"
              outlined
              onClick={() => void openPdfAssinado()}
            />
          </section>
        )}

        {/* Observações */}
        <section className="flex flex-col gap-4 border-l-4 border-gray-500 pl-6 py-2">
          <h2 className="text-xl font-semibold text-gray-400 flex items-center gap-2">
            <i className="pi pi-comment"></i> Observações
          </h2>
          <Divider className="mt-0 opacity-20" />
          <div className="flex flex-col gap-2">
            <Controller
              name="observacoes"
              control={control}
              render={({ field }) => (
                <InputText {...field} placeholder="Notas adicionais sobre o contrato..." className="w-full" />
              )}
            />
          </div>
        </section>

        {/* Ações */}
        <div className="flex justify-end gap-4 pt-8 pb-12 border-t border-white/10">
          <Button
            type="button"
            label="Cancelar"
            icon="pi pi-times"
            iconPos="right"
            severity="danger"
            outlined
            className="p-button-lg px-8 flex gap-4 items-center border-2 border-rose-500 hover:bg-rose-500/10 transition-colors"
            onClick={() => router.back()}
          />
          <Button
            type="submit"
            label={isLegado ? "Registar contrato legado" : mode === "create" ? "Cadastrar" : "Salvar"}
            icon="pi pi-check"
            iconPos="right"
            severity="success"
            outlined
            className="p-button-lg px-10 font-bold flex gap-4 items-center border-2 border-emerald-500 hover:bg-emerald-500/10 transition-colors"
          />
        </div>
      </form>
    </div>
  );
}
