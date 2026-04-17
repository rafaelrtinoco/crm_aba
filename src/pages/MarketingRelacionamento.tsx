import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { formatDocumento } from "../lib/documentoFormat";
import PageShell from "../components/PageShell";
import {
  loadBoletosFromStorage,
  loadClientesFromStorage,
  onlyDigits,
} from "../lib/financeiroUtils";
import {
  applyTemplatePlaceholders,
  digitsToWhatsAppBr,
  getSelectableTemplates,
} from "../lib/mensagensTemplates";
import {
  rankingClientesPorPagamento,
  type ClienteRankingRow,
  type TierCliente,
} from "../lib/marketingRanking";
import { todayIsoBr } from "../lib/vencimentoBoleto";

const tierStyle: Record<TierCliente, string> = {
  Ouro: "bg-amber-100 text-amber-950 ring-amber-300",
  Prata: "bg-slate-200 text-slate-900 ring-slate-400",
  Bronze: "bg-orange-100 text-orange-950 ring-orange-300",
  "Sem histórico": "bg-slate-50 text-slate-600 ring-slate-200",
};

const columnHeader: Record<TierCliente, string> = {
  Ouro: "border-b-4 border-amber-500 bg-amber-50 text-amber-950",
  Prata: "border-b-4 border-slate-400 bg-slate-100 text-slate-900",
  Bronze: "border-b-4 border-orange-400 bg-orange-50 text-orange-950",
  "Sem histórico": "border-b-4 border-slate-300 bg-slate-50 text-slate-700",
};

const tierOrder: TierCliente[] = ["Ouro", "Prata", "Bronze", "Sem histórico"];

function CardCliente({
  row,
  templateId,
  templates,
  onTemplateChange,
}: {
  row: ClienteRankingRow;
  templateId: string;
  templates: ReturnType<typeof getSelectableTemplates>;
  onTemplateChange: (id: string) => void;
}) {
  const c = row.cliente;
  const wa = c.telefone ? digitsToWhatsAppBr(c.telefone) : null;
  const tpl = templates.find((t) => t.id === templateId) ?? templates[0];
  const docFmt = formatDocumento(onlyDigits(c.documento));

  function enviar() {
    if (!c.telefone?.trim() || !wa) {
      alert("Cadastre um telefone válido em Clientes.");
      return;
    }
    const body = applyTemplatePlaceholders(tpl?.corpo ?? "", {
      nome: c.nome,
      vencimento: "",
      ramo: c.ramo,
      documento: docFmt,
      seguradora: c.seguradora ?? "",
      classificacao: row.tier,
    });
    window.open(
      `https://wa.me/${wa}?text=${encodeURIComponent(body)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{c.nome}</p>
          <p className="text-xs text-slate-500">{c.ramo}</p>
          {c.statusCadastro === "Cancelado" ? (
            <span className="mt-1 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
              Cancelado
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={enviar}
          disabled={!wa}
          title={wa ? "WhatsApp" : "Sem telefone"}
          className="shrink-0 rounded-lg bg-emerald-500 p-2 text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          <MessageCircle className="size-4" />
        </button>
      </div>
      <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Template
      </label>
      <select
        value={templateId}
        onChange={(e) => onTemplateChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <p className="mt-2 text-[10px] text-slate-400">
        Score {row.totalBoletos ? row.score : "—"} · {row.pagos} pagos
      </p>
    </div>
  );
}

export default function MarketingRelacionamento() {
  const [version, setVersion] = useState(0);
  const [busca, setBusca] = useState("");
  const [filtroRamo, setFiltroRamo] = useState("");
  const [filtroTier, setFiltroTier] = useState<"" | TierCliente>("");
  const [filtroStatus, setFiltroStatus] = useState<"" | "Ativo" | "Cancelado">(
    ""
  );
  const [templateByClienteId, setTemplateByClienteId] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    const sync = () => setVersion((v) => v + 1);
    window.addEventListener("focus", sync);
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const hoje = todayIsoBr();
  const clientes = useMemo(() => {
    void version;
    return loadClientesFromStorage();
  }, [version]);
  const boletos = useMemo(() => {
    void version;
    return loadBoletosFromStorage();
  }, [version]);

  const templates = useMemo(() => getSelectableTemplates(), [version]);

  const ranked = useMemo(
    () => rankingClientesPorPagamento(clientes, boletos, hoje, onlyDigits),
    [clientes, boletos, hoje]
  );

  const ramosUniq = useMemo(() => {
    const s = new Set<string>();
    for (const c of clientes) s.add(c.ramo);
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clientes]);

  const defaultTplId = templates[0]?.id ?? "";

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const dq = onlyDigits(busca);
    return ranked.filter((r) => {
      const c = r.cliente;
      if (filtroRamo && c.ramo !== filtroRamo) return false;
      if (filtroTier && r.tier !== filtroTier) return false;
      if (filtroStatus === "Ativo" && c.statusCadastro === "Cancelado")
        return false;
      if (filtroStatus === "Cancelado" && c.statusCadastro !== "Cancelado")
        return false;
      if (q) {
        const matchNome = c.nome.toLowerCase().includes(q);
        const matchDoc =
          c.documento.toLowerCase().includes(q) ||
          onlyDigits(c.documento).includes(dq);
        const matchRamo = c.ramo.toLowerCase().includes(q);
        const matchTier = r.tier.toLowerCase().includes(q);
        if (!matchNome && !matchDoc && !matchRamo && !matchTier) return false;
      }
      return true;
    });
  }, [ranked, busca, filtroRamo, filtroTier, filtroStatus]);

  const porColuna = useMemo(() => {
    const m: Record<TierCliente, ClienteRankingRow[]> = {
      Ouro: [],
      Prata: [],
      Bronze: [],
      "Sem histórico": [],
    };
    for (const r of filtrados) {
      m[r.tier].push(r);
    }
    return m;
  }, [filtrados]);

  const sortedTable = useMemo(
    () =>
      [...filtrados].sort(
        (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
      ),
    [filtrados]
  );

  function templateFor(id: number): string {
    return templateByClienteId[id] ?? defaultTplId;
  }

  function setTemplateFor(id: number, tid: string) {
    setTemplateByClienteId((prev) => ({ ...prev, [id]: tid }));
  }

  return (
    <PageShell
      title="Marketing & relacionamento"
      subtitle={
        <>
          Quadro por classificação (histórico de boletos). Escolha o template por
          cliente e envie WhatsApp. Crie novos modelos na aba{" "}
          <strong>Mensagens</strong>.
        </>
      }
      maxWidthClassName="max-w-[1600px]"
    >

        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Buscar
            </label>
            <input
              className="input"
              placeholder="Nome, CPF, ramo ou classificação…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Ramo
            </label>
            <select
              className="input"
              value={filtroRamo}
              onChange={(e) => setFiltroRamo(e.target.value)}
            >
              <option value="">Todos</option>
              {ramosUniq.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Classificação
            </label>
            <select
              className="input"
              value={filtroTier}
              onChange={(e) =>
                setFiltroTier((e.target.value || "") as "" | TierCliente)
              }
            >
              <option value="">Todas</option>
              {tierOrder.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Status cadastro
            </label>
            <select
              className="input"
              value={filtroStatus}
              onChange={(e) =>
                setFiltroStatus(e.target.value as "" | "Ativo" | "Cancelado")
              }
            >
              <option value="">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[900px] gap-3">
            {tierOrder.map((tier) => (
              <div
                key={tier}
                className="flex min-h-[320px] w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/80 shadow-inner"
              >
                <div
                  className={`rounded-t-2xl px-3 py-2 text-sm font-bold ${columnHeader[tier]}`}
                >
                  {tier}
                  <span className="ml-2 font-normal opacity-80">
                    ({porColuna[tier].length})
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {porColuna[tier].length === 0 ? (
                    <p className="p-3 text-center text-xs text-slate-500">
                      Nenhum cliente neste filtro.
                    </p>
                  ) : (
                    porColuna[tier].map((row) => (
                      <CardCliente
                        key={row.cliente.id}
                        row={row}
                        templateId={templateFor(row.cliente.id)}
                        templates={templates}
                        onTemplateChange={(tid) =>
                          setTemplateFor(row.cliente.id, tid)
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">
              Tabela resumo
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[800px] w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Ramo</th>
                  <th className="px-4 py-3 font-semibold">Classificação</th>
                  <th className="px-4 py-3 font-semibold">Template</th>
                  <th className="px-4 py-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {sortedTable.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Nenhum cliente no filtro.
                    </td>
                  </tr>
                ) : (
                  sortedTable.map((r) => {
                    const tid = templateFor(r.cliente.id);
                    const tpl = templates.find((t) => t.id === tid) ?? templates[0];
                    const wa = r.cliente.telefone
                      ? digitsToWhatsAppBr(r.cliente.telefone)
                      : null;
                    const docFmt = formatDocumento(
                      onlyDigits(r.cliente.documento)
                    );
                    return (
                      <tr
                        key={r.cliente.id}
                        className="border-b border-slate-100 hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {r.cliente.nome}
                          {r.cliente.statusCadastro === "Cancelado" ? (
                            <span className="ml-2 text-xs text-rose-600">
                              (cancelado)
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.cliente.ramo}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${tierStyle[r.tier]}`}
                          >
                            {r.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="input h-9 max-w-[240px] py-1 text-xs"
                            value={tid}
                            onChange={(e) =>
                              setTemplateFor(r.cliente.id, e.target.value)
                            }
                          >
                            {templates.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={!wa}
                            onClick={() => {
                              if (!wa) return;
                              const body = applyTemplatePlaceholders(
                                tpl?.corpo ?? "",
                                {
                                  nome: r.cliente.nome,
                                  vencimento: "",
                                  ramo: r.cliente.ramo,
                                  documento: docFmt,
                                  seguradora: r.cliente.seguradora ?? "",
                                  classificacao: r.tier,
                                }
                              );
                              window.open(
                                `https://wa.me/${wa}?text=${encodeURIComponent(body)}`,
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            <MessageCircle className="size-3.5" />
                            WhatsApp
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
    </PageShell>
  );
}
