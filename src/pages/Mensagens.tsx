// src/pages/Mensagens.tsx
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageShell from "../components/PageShell";
import { supabase } from "../lib/supabaseClient";
import NotificationModal from "../components/NotificationModal";
import { prazoLabels } from "../lib/vencimentoBoleto";
import type { Template, Campanha } from "../types";

type TemplatesBoleto = { vencido: string; vence_hoje: string; a_vencer: string };

const labelsBoleto: Record<keyof TemplatesBoleto, string> = {
  vencido:    "Boleto vencido (ainda pendente)",
  vence_hoje: "Boleto que vence hoje",
  a_vencer:   "Boleto a vencer",
};

function novoId() {
  return `mkt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function Mensagens() {
  const [tBoleto, setTBoleto]   = useState<TemplatesBoleto>({ vencido: "", vence_hoje: "", a_vencer: "" });
  const [extras, setExtras]     = useState<Template[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loading, setLoading]   = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [novoNome, setNovoNome]   = useState("");
  const [novoCorpo, setNovoCorpo] = useState("");

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, type: "error" as "error" | "success" | "info", title: "", message: "",
  });
  function modal(type: "error" | "success" | "info", title: string, message: string) {
    setModalConfig({ isOpen: true, type, title, message });
  }

  async function carregar() {
    setLoading(true);
    const [{ data: dt }, { data: dc }] = await Promise.all([
      supabase.from("templates_mensagens").select("*"),
      supabase.from("campanhas").select("*").order("created_at", { ascending: false }).limit(20),
    ]);

    if (dt) {
      const todos = dt as Template[];
      setTBoleto({
        vencido:    todos.find((t) => t.id === "vencido")?.corpo ?? "",
        vence_hoje: todos.find((t) => t.id === "vence_hoje")?.corpo ?? "",
        a_vencer:   todos.find((t) => t.id === "a_vencer")?.corpo ?? "",
      });
      setExtras(todos.filter((t) => t.tipo === "marketing"));
    }

    if (dc) setCampanhas(dc as Campanha[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvarTudo() {
    setSalvando(true);

    const payloadBoleto = (Object.keys(labelsBoleto) as (keyof TemplatesBoleto)[]).map((key) => ({
      id: key, label: labelsBoleto[key], corpo: tBoleto[key], tipo: "boleto" as const,
    }));

    const payloadMarketing = extras.map((ex) => ({
      id: ex.id, label: ex.label, corpo: ex.corpo, tipo: "marketing" as const,
    }));

    const { error } = await supabase.from("templates_mensagens").upsert([...payloadBoleto, ...payloadMarketing]);

    if (error) {
      modal("error", "Erro ao salvar", error.message);
    } else {
      modal("success", "Templates salvos!", "Todos os modelos foram atualizados com sucesso.");
      carregar();
    }
    setSalvando(false);
  }

  function adicionarTemplate() {
    if (!novoNome.trim() || !novoCorpo.trim()) {
      modal("info", "Campos incompletos", "Preencha o nome e o corpo da mensagem.");
      return;
    }
    setExtras((list) => [
      ...list,
      { id: novoId(), label: novoNome.trim(), corpo: novoCorpo, tipo: "marketing", created_at: new Date().toISOString() },
    ]);
    setNovoNome("");
    setNovoCorpo("");
  }

  async function removerTemplate(id: string) {
    if (!window.confirm("Excluir este template definitivamente?")) return;

    // Se ainda não foi salvo (id local), remove só do estado
    if (id.startsWith("mkt-") && !extras.find((x) => x.id === id && x.created_at)) {
      setExtras((list) => list.filter((x) => x.id !== id));
      return;
    }

    const { error } = await supabase.from("templates_mensagens").delete().eq("id", id);
    if (error) { modal("error", "Erro", error.message); return; }
    carregar();
  }

  return (
    <PageShell
      title="Mensagens"
      subtitle="Gerencie os templates de WhatsApp e visualize o histórico de campanhas disparadas."
      maxWidthClassName="max-w-3xl"
    >
      {/* Templates de boleto */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-slate-900">Templates de boleto</h2>
        <p className="mt-1 text-sm text-slate-600">
          Usados automaticamente no Financeiro conforme o prazo de vencimento.{" "}
          <span className="font-medium text-slate-700">Variáveis disponíveis:</span>{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">{"{{nome}} {{vencimento}} {{ramo}} {{documento}} {{seguradora}}"}</code>
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center text-sm text-slate-500 animate-pulse">
          Carregando templates...
        </div>
      ) : (
        <>
          {(Object.keys(labelsBoleto) as (keyof TemplatesBoleto)[]).map((key) => (
            <div key={key} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-slate-800">
                {labelsBoleto[key]}
                <span className="ml-2 font-normal text-slate-500">({prazoLabels[key]})</span>
              </label>
              <textarea
                value={tBoleto[key]}
                onChange={(e) => setTBoleto((prev) => ({ ...prev, [key]: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          ))}

          {/* Templates de marketing */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
            <h3 className="text-base font-semibold text-slate-900">Templates de marketing e relacionamento</h3>
            <p className="mt-1 text-sm text-slate-600">
              Aparecem na seleção de templates na aba Marketing. Variáveis:{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">
                {"{{nome}} {{documento}} {{ramo}} {{seguradora}} {{classificacao}}"}
              </code>
            </p>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              {extras.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum template de marketing ainda.</p>
              ) : (
                extras.map((ex) => (
                  <div key={ex.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <input
                        value={ex.label}
                        onChange={(e) => setExtras((list) => list.map((x) => x.id === ex.id ? { ...x, label: e.target.value } : x))}
                        placeholder="Nome do template"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium outline-none focus:border-sky-500"
                      />
                      <button type="button" onClick={() => removerTemplate(ex.id)}
                        className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Excluir">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <textarea
                      value={ex.corpo}
                      onChange={(e) => setExtras((list) => list.map((x) => x.id === ex.id ? { ...x, corpo: e.target.value } : x))}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-sky-500"
                    />
                  </div>
                ))
              )}
            </div>

            {/* Novo template */}
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
              <p className="text-xs font-medium text-slate-600">Novo template de marketing</p>
              <input
                placeholder="Nome (ex.: Boas-vindas ao cliente)"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="input"
              />
              <textarea
                placeholder="Texto da mensagem com {{nome}}, {{ramo}}…"
                value={novoCorpo}
                onChange={(e) => setNovoCorpo(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
              <button type="button" onClick={adicionarTemplate}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50">
                <Plus className="size-4" /> Adicionar à lista
              </button>
            </div>
          </div>
        </>
      )}

      {/* Botão salvar */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={salvarTudo} disabled={loading || salvando} className="btn-save">
          {salvando ? "Salvando..." : "Salvar todos os templates"}
        </button>
      </div>

      {/* Histórico de campanhas */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Histórico de campanhas</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Últimas 20 campanhas disparadas via Marketing & Relacionamento.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <p className="px-5 py-4 text-sm text-slate-500 animate-pulse">Carregando...</p>
          ) : campanhas.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">Nenhuma campanha disparada ainda.</p>
          ) : (
            campanhas.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{c.nome}</p>
                  <p className="text-xs text-slate-500">
                    {c.filtro_tier ? `Tier: ${c.filtro_tier}` : "Todos os tiers"}
                    {c.filtro_ramo ? ` · Ramo: ${c.filtro_ramo}` : ""}
                    {c.filtro_status ? ` · Status: ${c.filtro_status}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-900">{c.total_enviados} enviado{c.total_enviados !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(c.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <NotificationModal isOpen={modalConfig.isOpen} type={modalConfig.type}
        title={modalConfig.title} message={modalConfig.message}
        onClose={() => setModalConfig((m) => ({ ...m, isOpen: false }))} />
    </PageShell>
  );
}