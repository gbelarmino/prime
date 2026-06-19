import type { AtendimentoResumoFinanceiro } from "./atendimento-service";
import type { InadimplenciaPresenteAgregado } from "./renegociacao-inadimplencia-presente";
import { totalQuitacaoAntesDesconto } from "./renegociacao-quitacao-calculo";
import { modalidadeUsaMotorCondicoes } from "./renegociacao-service";
import type {
  ModalidadeRenegociacao,
  RenegociacaoSimulacaoResponse,
} from "./renegociacao-types";

export type EfetivacaoResumoSecao = {
  titulo: string;
  itens: string[];
};

export type EfetivacaoResumoMontado = {
  podeEfetivarNoWizard: boolean;
  avisoPrincipal?: string;
  secoes: EfetivacaoResumoSecao[];
};

function formatBrl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function labelModalidade(m: ModalidadeRenegociacao): string {
  const map: Record<ModalidadeRenegociacao, string> = {
    T1_PARCELAS_VENCIDAS: "Parcelas vencidas (T1)",
    T2_SALDO_DEVEDOR: "Saldo devedor (T2)",
    T3_COMPLETA: "Renegociação completa (T3)",
    T4_QUITACAO: "Liquidação antecipada (T4)",
    T5_COM_ENTRADA: "Com entrada (T5)",
    T6_JUDICIAL: "Judicial (T6)",
  };
  return map[m];
}

function resumoValoresT4(
  sim: RenegociacaoSimulacaoResponse,
  inadimplencia: InadimplenciaPresenteAgregado | null,
): string[] {
  const vp = inadimplencia?.valorPresenteTotal ?? sim.memoriaCalculo.vlValorPresente ?? 0;
  const totalAntes = totalQuitacaoAntesDesconto(sim.saldoDevedor, vp);
  const desconto = sim.memoriaCalculo.vlDesconto ?? 0;
  const linhas = [
    `Saldo devedor: ${formatBrl(sim.saldoDevedor)}`,
    `Inadimplência (valor presente): ${formatBrl(vp)}`,
    `Total antes do desconto: ${formatBrl(totalAntes)}`,
    desconto > 0.005
      ? `Desconto: ${formatBrl(desconto)} (${sim.pctDesconto.toLocaleString("pt-BR")}%)`
      : "Desconto: nenhum",
    `Valor a pagar (liquidação): ${formatBrl(sim.totalNovo)}`,
  ];
  const parcelas = sim.cronogramaFuturo ?? [];
  if (parcelas.length > 0) {
    const primeira = parcelas[0];
    const ultima = parcelas[parcelas.length - 1];
    linhas.push(
      `Pagamento em ${parcelas.length} parcela(s): ${formatBrl(primeira.valorNominal)}` +
        (parcelas.length > 1 ? ` … ${formatBrl(ultima.valorNominal)}` : "") +
        ` (venc. ${new Date(primeira.vencimento).toLocaleDateString("pt-BR")}` +
        (parcelas.length > 1
          ? ` a ${new Date(ultima.vencimento).toLocaleDateString("pt-BR")})`
          : ")"),
    );
  }
  return linhas;
}

function resumoValoresT1(sim: RenegociacaoSimulacaoResponse): string[] {
  const vp = sim.totalAnterior;
  const acordo = sim.totalNovo;
  const desconto = sim.memoriaCalculo.vlDesconto ?? Math.max(0, vp - acordo);
  const cronograma = sim.cronogramaFuturo ?? [];
  const linhas = [
    `Mora (valor presente das vencidas): ${formatBrl(vp)}`,
    desconto > 0.005
      ? `Desconto sobre VP: ${formatBrl(desconto)} (${sim.pctDesconto.toLocaleString("pt-BR")}%)`
      : "Desconto sobre VP: nenhum",
    `Total do acordo (mora negociada): ${formatBrl(acordo)}`,
  ];
  if (cronograma.length > 0) {
    const p = cronograma[0]!;
    const ultima = cronograma[cronograma.length - 1]!;
    const moraParc = p.valorAcordo ?? 0;
    linhas.push(
      `Diluição: ${cronograma.length} × ${formatBrl(moraParc)} de mora somados às vincendas ${p.numeroParcela}–${ultima.numeroParcela}.`,
    );
    linhas.push(
      `Exemplo parcela ${p.numeroParcela}: ${formatBrl(p.valorVigente ?? 0)} (vigente) + ${formatBrl(moraParc)} (mora) = ${formatBrl(p.valorNominal)}.`,
    );
  }
  return linhas;
}

function resumoTitulosT1(sim: RenegociacaoSimulacaoResponse | null): string[] {
  if (!sim) return ["Simulação T1 não disponível."];
  const vencidas = sim.titulosAfetados.filter((t) => t.papel === "VENCIDA");
  const vincendas = sim.titulosAfetados.filter((t) => t.papel === "VINCENDA_REEMITIDA");
  const linhas = [
    `Cancelar ${vencidas.length} título(s) vencido(s) — dívida absorvida no acordo.`,
    `Cancelar e reemitir ${vincendas.length} vincenda(s) com valor composto (vigente + mora).`,
  ];
  if (vincendas.length > 0) {
    const nums = vincendas.map((t) => t.numeroParcela).sort((a, b) => a - b);
    linhas.push(
      `Vincendas reemitidas: ${nums[0]}–${nums[nums.length - 1]}. Demais vincendas permanecem inalteradas.`,
    );
  }
  return linhas;
}

function resumoTitulos(
  sim: RenegociacaoSimulacaoResponse | null,
  parcelaInicial: number,
  financeiro: AtendimentoResumoFinanceiro | null,
  modalidade: ModalidadeRenegociacao | null,
): string[] {
  if (modalidade === "T1_PARCELAS_VENCIDAS") {
    return resumoTitulosT1(sim);
  }
  const afetados = sim?.titulosAfetados ?? [];
  if (afetados.length > 0) {
    return [
      `Cancelar ${afetados.length} título(s) em aberto a partir da parcela ${parcelaInicial} (substituídos pelo novo fluxo).`,
      "Títulos pagos ou já cancelados não são alterados.",
    ];
  }
  const abertos =
    financeiro?.titulosAbertos.filter((t) => t.numeroParcela >= parcelaInicial).length ?? 0;
  if (abertos > 0) {
    return [
      `Há ${abertos} título(s) em aberto na faixa de corte (parcela ≥ ${parcelaInicial}) — serão cancelados na efetivação, com confirmação.`,
    ];
  }
  return ["Nenhum título em aberto na parcela de corte informada."];
}

function resumoDocumentos(
  sim: RenegociacaoSimulacaoResponse | null,
  documentosOk: boolean,
): string[] {
  const docs = sim?.instrumentosSugeridos ?? ["TERMO_RENEGOCIACAO"];
  const base = docs.map((d) => d.replace(/_/g, " "));
  if (documentosOk) {
    return [
      ...base.map((d) => `Instrumento registrado: ${d}.`),
      "Assinatura e PDF definitivos seguem no fluxo documental (quando integrado).",
    ];
  }
  return base.map((d) => `Pendente registro formal: ${d}.`);
}

export function montarResumoEfetivacao(options: {
  modalidade: ModalidadeRenegociacao | null;
  simulacao: RenegociacaoSimulacaoResponse | null;
  parcelaInicial: number;
  financeiro: AtendimentoResumoFinanceiro | null;
  inadimplenciaQuitacao: InadimplenciaPresenteAgregado | null;
  processoId: number | null;
  documentosOk: boolean;
  propostaId: number | null;
}): EfetivacaoResumoMontado {
  const {
    modalidade,
    simulacao,
    parcelaInicial,
    financeiro,
    inadimplenciaQuitacao,
    processoId,
    documentosOk,
    propostaId,
  } = options;

  if (!modalidade) {
    return { podeEfetivarNoWizard: false, secoes: [] };
  }

  const usaMotor = modalidadeUsaMotorCondicoes(modalidade);
  const processoValido = processoId != null && processoId > 0;
  const secoes: EfetivacaoResumoSecao[] = [];

  secoes.push({
    titulo: "Processo",
    itens: [
      processoValido
        ? `Renegociação #${processoId} com proposta${propostaId != null ? ` #${propostaId}` : ""} aprovada.`
        : "Processo não persistido na API — efetivação automática indisponível.",
      `Modalidade: ${labelModalidade(modalidade)}.`,
      `Parcela de corte: ${parcelaInicial}.`,
    ],
  });

  if (simulacao) {
    const valores: string[] =
      modalidade === "T4_QUITACAO"
        ? resumoValoresT4(simulacao, inadimplenciaQuitacao)
        : modalidade === "T1_PARCELAS_VENCIDAS"
          ? resumoValoresT1(simulacao)
          : [
              `Total anterior: ${formatBrl(simulacao.totalAnterior)}`,
              `Total após negociação: ${formatBrl(simulacao.totalNovo)}`,
              simulacao.pctDesconto > 0.005
                ? `Desconto: ${simulacao.pctDesconto.toLocaleString("pt-BR")}%`
                : "Sem desconto registrado",
              `Saldo devedor de referência: ${formatBrl(simulacao.saldoDevedor)}`,
            ];
    if (
      (simulacao.cronogramaFuturo?.length ?? 0) > 0 &&
      modalidade !== "T4_QUITACAO" &&
      modalidade !== "T1_PARCELAS_VENCIDAS"
    ) {
      valores.push(
        `Novo cronograma: ${simulacao.cronogramaFuturo.length} parcela(s) simulada(s).`,
      );
    }
    secoes.push({ titulo: "Valores acordados (simulação congelada)", itens: valores });
  }

  secoes.push({
    titulo: "Títulos de cobrança",
    itens: resumoTitulos(simulacao, parcelaInicial, financeiro, modalidade),
  });

  secoes.push({
    titulo: "Documentos e jurídico",
    itens: resumoDocumentos(simulacao, documentosOk),
  });

  if (modalidade === "T1_PARCELAS_VENCIDAS" && processoValido) {
    secoes.push({
      titulo: "Ao clicar em Efetivar (neste wizard)",
      itens: [
        "Cancela todos os títulos vencidos incluídos no acordo (dívida absorvida).",
        "Cancela e reemite as vincendas P..P+N−1 com valor composto (parcela vigente + mora).",
        "Mantém inalteradas as vincendas após P+N−1.",
        "Não altera versão contratual — apenas títulos de cobrança.",
        "Registra auditoria; processo passa para status EFETIVADO.",
        "Redireciona para a lista de contratos após sucesso.",
      ],
    });
    return { podeEfetivarNoWizard: true, secoes };
  }

  if (usaMotor && processoValido) {
    secoes.push({
      titulo: "Ao clicar em Efetivar (neste wizard)",
      itens: [
        "Cria e publica uma nova versão das condições financeiras do contrato, vinculada a este processo.",
        "Encerra a versão contratual anterior (status superseded).",
        "Atualiza as condições vigentes no cadastro do contrato (parcelas, valores, reajuste conforme simulação).",
        "Cancela os títulos em aberto na faixa de corte, com confirmação explícita.",
        "Registra transição, histórico e auditoria; processo passa para status EFETIVADO.",
        "Redireciona para a lista de contratos após sucesso.",
      ],
    });
    return {
      podeEfetivarNoWizard: true,
      secoes,
    };
  }

  if (modalidade === "T4_QUITACAO") {
    secoes.push({
      titulo: "Efetivação operacional (fora deste botão)",
      itens: [
        "Emitir cobrança conforme o cronograma simulado (valor total da liquidação).",
        "Cancelar títulos em aberto a partir da parcela de corte e registrar termo de quitação.",
        "Concluir quitação no painel de atendimento quando a integração T4 estiver ativa.",
        "O contrato só é considerado quitado após baixa dos títulos e formalização do termo.",
      ],
    });
    return {
      podeEfetivarNoWizard: false,
      avisoPrincipal:
        "A liquidação antecipada (T4) ainda não é publicada por este botão. Use o painel de atendimento para concluir a operação.",
      secoes,
    };
  }

  if (modalidade === "T6_JUDICIAL") {
    secoes.push({
      titulo: "Efetivação operacional (fora deste botão)",
      itens: [
        "Registrar acordo judicial homologado e anexar referência do processo.",
        "Aplicar condições conforme decisão; títulos conforme plano do acordo.",
      ],
    });
  } else {
    secoes.push({
      titulo: "Próximo passo",
      itens: ["Conclua a simulação e a proposta antes de efetivar."],
    });
  }

  return {
    podeEfetivarNoWizard: false,
    avisoPrincipal: processoValido
      ? "Esta modalidade não usa publicação automática de versão neste passo."
      : "Persista o processo na API para continuar.",
    secoes,
  };
}
