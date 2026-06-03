// src/pages/MarketingRelacionamento.tsx
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import PageShell from "../components/PageShell";
import { supabase } from "../lib/supabaseClient";
import { applyTemplatePlaceholders, digitsToWhatsAppBr } from "../lib/mensagensTemplates";
// import { todayIsoBr } from "../lib/vencimentoBoleto";
import NotificationModal from "../components/NotificationModal";
import type { Cliente, Apolice, Boleto, Template, TierCliente, ClienteRankingRow } from "../types";

// ── Algoritmo de ranking ─────────────────────────────────────
function calcularRanking(
  clientes: Cliente[],
  apolices: Apolice[],
  boletos: Boleto[]
): ClienteRankingRow[] {
  return clientes.map((c) => {
    const apolicesCliente = apolices.filter((a) => a.cliente_id === c.id);
    const apoliceIds = new Set(apolicesCliente.map((a) => a.id));
    const boletosCliente = boletos.filter((b) => apoliceIds.has(b.apolice_id));

    const total = boletosCliente.length;
    const pagos = boletosCliente.filter((b) => b.status === "Pago").length;
    const score = total === 0 ? 0 : Math.round((pagos / total) * 100);

    let tier: TierCliente = "Sem histórico";
    if (total > 0) {
      if (score >= 80) tier = "Ouro";
      else if (score >= 50) tier = "Prata";
      else tier = "Bronze";
    }

    return { cliente: c, apolices: apolicesCliente, tier, score, totalBoletos: total, pagos };
  });
}

const tierStyle: Record<TierCliente, string> = {
  Ouro:           "bg-amber-100 text-amber-950 ring-amber-300",
  Prata:          "bg-slate-200 text-slate-900 ring-slate-400",
  Bronze:         "bg-orange-100 text-orange-950 ring-orange-300",
  "Sem histórico": "bg-slate-50 text-slate-600 ring-slate-200",
};

const columnHeader: Record<TierCliente, string> = {
  Ouro:           "border-b-4 border-amber-500 bg-amber-50 text-amber-950",
  Prata:          "border-b-4 border-slate-400 bg-slate-100 text-slate-900",
  Bronze:         "border-b-4 border-orange-400 bg-orange-50 text-orange-950",
  "Sem histórico": "border-b-4 border-slate-300 bg-slate-50 text-slate-700",
};

const tierOrder: TierCliente[] = ["Ouro", "Prata", "Bronze", "Sem histórico"];

// ── Card do cliente no kanban ────────────────────────────────
function CardCliente({
  row, templateId, templates, onTemplateChange,
}: {
  row: ClienteRankingRow;
  templateId: string;
  templates: Template[];
  onTemplateChange: (id: string) => void;
}) {
  const c = row.cliente;
  const wa = c.telefone ? digitsToWhatsAppBr(c.telefone) : null;
  const tpl = templates.find((t) => t.id === templateId) ?? templates[0];

  // Pega a primeira apólice ativa para contexto da mensagem
  const apoliceAtiva = row.apolices.find((a) => a.status === "Ativa") ?? row.apolices[0];

  function enviar() {
    if (!wa) { alert("Cadastre um telefone válido em Clientes."); return; }
    const body = applyTemplatePlaceholders(tpl?.corpo ?? "", {
      nome:          c.nome,
      vencimento:    "",
      ramo:          apoliceAtiva?.ramo ?? "",
      documento:     c.documento,
      seguradora:    apoliceAtiva?.seguradora ?? "",
      classificacao: row.tier,
    });
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{c.nome}</p>
          <p className="text-xs text-slate-500">
            {row.apolices.length} apólice{row.apolices.length !== 1 ? "s" : ""}
            {apoliceAtiva ? ` · ${apoliceAtiva.ramo}` : ""}
          </p>
          {c.status_cadastro === "Cancelado" && (
            <span className="mt-1 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800">
              Cancelado
            </span>
          )}
        </div>
        <button type="button" onClick={enviar} disabled={!wa} title={wa ? "Enviar WhatsApp" : "Sem telefone"}
          className="shrink-0 rounded-lg bg-emerald-500 p-2 text-white hover:bg-emerald-600 disabled:opacity-40">
          <MessageCircle className="size-4" />
        </button>
      </div>
      <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Template</label>
      <select value={templateId} onChange={(e) => onTemplateChange(e.target.value)}
        className="mt-0.5 w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-xs">
        {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      <p className="mt-2 text-[10px] text-slate-400">
        Score {row.totalBoletos ? `${row.score}%` : "—"} · {row.pagos}/{row.totalBoletos} pagos
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export default function MarketingRelacionamento() {
  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [apolices, setApolices]   = useState<Apolice[]>([]);
  const [boletos, setBoletos]     = useState<Boleto[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading]     = useState(true);

  // Preferências de template por cliente (em memória)
  const [templatePrefs, setTemplatePrefs] = useState<Record<number, string>>({});

  // Filtros
  const [busca, setBusca]               = useState("");
  const [filtroRamo, setFiltroRamo]     = useState("");
  const [filtroTier, setFiltroTier]     = useState<"" | TierCliente>("");
  const [filtroStatus, setFiltroStatus] = useState<"" | "Ativo" | "Cancelado">("");

  // Modal campanha
  const [modalCampanha, setModalCampanha] = useState(false);
  const [campanhaNome, setCampanhaNome]   = useState("");
  const [campanhaTemplate, setCampanhaTemplate] = useState("");
  const [disparando, setDisparando]       = useState(false);
  const [disparados, setDisparados]       = useState<string[]>([]);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, type: "error" as "error" | "success" | "info", title: "", message: "",
  });
  function modal(type: "error" | "success" | "info", title: string, message: string) {
    setModalConfig({ isOpen: true, type, title, message });
  }

  async function carregar() {
    setLoading(true);
    const [{ data: dc }, { data: da }, { data: db }, { data: dt }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("apolices").select("*"),
      supabase.from("boletos").select("id, apolice_id, status, vencimento"),
      supabase.from("templates_mensagens").select("*"),
    ]);
    if (dc) setClientes(dc as Cliente[]);
    if (da) setApolices(da as Apolice[]);
    if (db) setBoletos(db as Boleto[]);
    if (dt) {
      setTemplates(dt as Template[]);
      if (dt.length > 0) setCampanhaTemplate(dt[0].id);
    }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // Ranking calculado
  const ranked = useMemo(
    () => calcularRanking(clientes, apolices, boletos),
    [clientes, apolices, boletos]
  );

  const ramosUniq = useMemo(() => [...new Set(apolices.map((a) => a.ramo))].sort(), [apolices]);
  const defaultTplId = templates[0]?.id ?? "";

  // Filtro aplicado
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return ranked.filter((r) => {
      const c = r.cliente;
      if (filtroRamo && !r.apolices.some((a) => a.ramo === filtroRamo)) return false;
      if (filtroTier && r.tier !== filtroTier) return false;
      if (filtroStatus === "Ativo" && c.status_cadastro === "Cancelado") return false;
      if (filtroStatus === "Cancelado" && c.status_cadastro !== "Cancelado") return false;
      if (q) {
        const matchNome = c.nome.toLowerCase().includes(q);
        const matchDoc  = c.documento.toLowerCase().includes(q);
        const matchTier = r.tier.toLowerCase().includes(q);
        if (!matchNome && !matchDoc && !matchTier) return false;
      }
      return true;
    });
  }, [ranked, busca, filtroRamo, filtroTier, filtroStatus]);

  const porColuna = useMemo(() => {
    const m: Record<TierCliente, ClienteRankingRow[]> = { Ouro: [], Prata: [], Bronze: [], "Sem histórico": [] };
    for (const r of filtrados) m[r.tier].push(r);
    return m;
  }, [filtrados]);

  function templateFor(clienteId: number) {
    return templatePrefs[clienteId] ?? defaultTplId;
  }

  function alterarTemplate(clienteId: number, tplId: string) {
    setTemplatePrefs((p) => ({ ...p, [clienteId]: tplId }));
  }

  // ── Disparo de campanha ──────────────────────────────────
  async function dispararCampanha() {
    const tpl = templates.find((t) => t.id === campanhaTemplate);
    if (!tpl) { modal("error", "Template não encontrado", "Selecione um template."); return; }
    if (!campanhaNome.trim()) { modal("error", "Nome obrigatório", "Dê um nome para a campanha."); return; }

    const alvo = filtrados.filter((r) => r.cliente.telefone?.trim());
    if (alvo.length === 0) {
      modal("info", "Sem destinatários", "Nenhum cliente no filtro atual tem telefone cadastrado.");
      return;
    }

    setDisparando(true);
    setDisparados([]);

    const links: string[] = [];
    for (const r of alvo) {
      const c = r.cliente;
      const wa = digitsToWhatsAppBr(c.telefone!);
      if (!wa) continue;
      const apoliceAtiva = r.apolices.find((a) => a.status === "Ativa") ?? r.apolices[0];
      const texto = applyTemplatePlaceholders(tpl.corpo, {
        nome:          c.nome,
        vencimento:    "",
        ramo:          apoliceAtiva?.ramo ?? "",
        documento:     c.documento,
        seguradora:    apoliceAtiva?.seguradora ?? "",
        classificacao: r.tier,
      });
      links.push(`https://wa.me/${wa}?text=${encodeURIComponent(texto)}`);
      setDisparados((prev) => [...prev, c.nome]);
    }

    // Salva registro da campanha no banco
    await supabase.from("campanhas").insert([{
      id:            Date.now(),
      nome:          campanhaNome.trim(),
      template_id:   campanhaTemplate,
      filtro_tier:   filtroTier || null,
      filtro_ramo:   filtroRamo || null,
      filtro_status: filtroStatus || null,
      total_enviados: links.length,
    }]);

    setDisparando(false);

    // Abre os links em sequência (navegador pode bloquear múltiplos popups — orientar usuário)
    modal(
      "success",
      `Campanha "${campanhaNome}" criada`,
      `${links.length} cliente(s) alcançado(s). Os links do WhatsApp foram gerados. Se o navegador bloqueou os popups, autorize-os e dispare novamente.`
    );
    links.forEach((url, i) => setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), i * 400));
    setModalCampanha(false);
    setCampanhaNome("");
  }

  return (
    <PageShell
      title="Marketing & Relacionamento"
      subtitle="Visualize clientes por classificação, envie mensagens individuais ou dispare campanhas para grupos."
      maxWidthClassName="max-w-[1600px]"
    >
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Buscar</label>
          <input className="input" placeholder="Nome, CPF ou classificação…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-slate-600">Ramo</label>
          <select className="input" value={filtroRamo} onChange={(e) => setFiltroRamo(e.target.value)}>
            <option value="">Todos</option>
            {ramosUniq.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-slate-600">Classificação</label>
          <select className="input" value={filtroTier} onChange={(e) => setFiltroTier(e.target.value as "" | TierCliente)}>
            <option value="">Todas</option>
            {tierOrder.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
          <select className="input" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as "" | "Ativo" | "Cancelado")}>
            <option value="">Todos</option>
            <option value="Ativo">Ativo</option>
            <option value="Cancelado">Cancelado</option>
          </select>
        </div>
        <button type="button" onClick={() => setModalCampanha(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 shadow-sm">
          <Send className="size-4" /> Disparar campanha
        </button>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-225 gap-3">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 animate-pulse">Carregando classificação...</p>
          ) : (
            tierOrder.map((tier) => (
              <div key={tier}
                className="flex min-h-80 w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/80 shadow-inner">
                <div className={`rounded-t-2xl px-3 py-2 text-sm font-bold ${columnHeader[tier]}`}>
                  {tier}
                  <span className="ml-2 font-normal opacity-80">({porColuna[tier].length})</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {porColuna[tier].length === 0 ? (
                    <p className="p-3 text-center text-xs text-slate-500">Nenhum cliente aqui.</p>
                  ) : (
                    porColuna[tier].map((row) => (
                      <CardCliente key={row.cliente.id} row={row}
                        templateId={templateFor(row.cliente.id)}
                        templates={templates}
                        onTemplateChange={(tid) => alterarTemplate(row.cliente.id, tid)} />
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tabela resumo */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Tabela resumo — {filtrados.length} cliente{filtrados.length !== 1 ? "s" : ""}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Apólices</th>
                <th className="px-4 py-3 font-semibold">Classificação</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Template</th>
                <th className="px-4 py-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Processando...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum cliente no filtro.</td></tr>
              ) : (
                [...filtrados]
                  .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier))
                  .map((r) => {
                    const tid = templateFor(r.cliente.id);
                    const tpl = templates.find((t) => t.id === tid) ?? templates[0];
                    const wa  = r.cliente.telefone ? digitsToWhatsAppBr(r.cliente.telefone) : null;
                    const apoliceAtiva = r.apolices.find((a) => a.status === "Ativa") ?? r.apolices[0];
                    return (
                      <tr key={r.cliente.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {r.cliente.nome}
                          {r.cliente.status_cadastro === "Cancelado" && (
                            <span className="ml-2 text-xs text-rose-600">(cancelado)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {r.apolices.length === 0
                            ? "—"
                            : r.apolices.map((a) => a.ramo).join(", ")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ${tierStyle[r.tier]}`}>
                            {r.tier}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.totalBoletos ? `${r.score}%` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <select className="input h-9 max-w-60 py-1 text-xs" value={tid}
                            onChange={(e) => alterarTemplate(r.cliente.id, e.target.value)}>
                            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" disabled={!wa}
                            onClick={() => {
                              if (!wa) return;
                              const texto = applyTemplatePlaceholders(tpl?.corpo ?? "", {
                                nome:          r.cliente.nome,
                                vencimento:    "",
                                ramo:          apoliceAtiva?.ramo ?? "",
                                documento:     r.cliente.documento,
                                seguradora:    apoliceAtiva?.seguradora ?? "",
                                classificacao: r.tier,
                              });
                              window.open(`https://wa.me/${wa}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
                            <MessageCircle className="size-3.5" /> WhatsApp
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

      {/* Modal de campanha */}
      {modalCampanha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">Disparar campanha</h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Será enviado para <strong>{filtrados.filter((r) => r.cliente.telefone?.trim()).length}</strong> cliente(s)
                com telefone — conforme os filtros ativos.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Nome da campanha</label>
                <input value={campanhaNome} onChange={(e) => setCampanhaNome(e.target.value)}
                  placeholder="Ex.: Renovação julho 2025"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Template da mensagem</label>
                <select value={campanhaTemplate} onChange={(e) => setCampanhaTemplate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500">
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              {disparando && (
                <div className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
                  <p className="font-semibold mb-1">Abrindo links...</p>
                  {disparados.slice(-5).map((n) => <p key={n}>✓ {n}</p>)}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setModalCampanha(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="button" onClick={dispararCampanha} disabled={disparando}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50">
                <Send className="size-4" /> {disparando ? "Disparando..." : "Confirmar disparo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationModal isOpen={modalConfig.isOpen} type={modalConfig.type}
        title={modalConfig.title} message={modalConfig.message}
        onClose={() => setModalConfig((m) => ({ ...m, isOpen: false }))} />
    </PageShell>
  );
}