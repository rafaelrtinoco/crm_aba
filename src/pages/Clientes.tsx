// src/pages/Clientes.tsx
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { DOC_MAX_DIGITS, formatDocumento } from "../lib/documentoFormat";
import { RAMOS_SEGURO } from "../data/ramosSeguro";
import Input from "../components/Input";
import PageShell from "../components/PageShell";
import NotificationModal from "../components/NotificationModal";
import type { Cliente, Apolice, StatusCadastro, TipoCliente, StatusApolice } from "../types";

const FONE_MAX_DIGITS = 11;

function formatTelefone(digits: string): string {
  const d = digits.slice(0, FONE_MAX_DIGITS);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const SEGURADORAS = [
  "Porto Seguro","Bradesco","Allianz","SulAmérica","Tokio Marine",
  "Mapfre","Zurich","Generali","Liberty Seguros","Suhai Seguros",
  "Azul Seguros","Mitsui Seguros","Itaú Seguros","Yellow Seguros",
  "HDI Seguros","Acaad Seguros","Pier Seguros","Junto Seguros","Ezze Seguros",
];

const STATUS_APOLICE: StatusApolice[] = ["Ativa", "Cancelada", "Suspensa", "Em renovação"];

const apoliceStatusBadge: Record<StatusApolice, string> = {
  "Ativa":        "bg-emerald-100 text-emerald-900",
  "Cancelada":    "bg-rose-100 text-rose-900",
  "Suspensa":     "bg-amber-100 text-amber-900",
  "Em renovação": "bg-sky-100 text-sky-900",
};

// ── Formulário vazio de cliente ──────────────────────────────
const clienteVazio = (): Omit<Cliente, "id" | "created_at"> => ({
  nome: "",
  documento: "",
  documento_digits: "",
  telefone: "",
  email: "",
  tipo: "Cliente",
  status_cadastro: "Ativo",
  observacoes: null,
});

// ── Formulário vazio de apólice ──────────────────────────────
const apoliceVazia = (): Omit<Apolice, "id" | "cliente_id" | "created_at"> => ({
  seguradora: "Porto Seguro",
  ramo: "Auto",
  numero_apolice: "",
  vigencia_inicio: "",
  vigencia_fim: "",
  premio: null,
  status: "Ativa",
  observacoes: null,
});

// ── Row expansível de cliente ────────────────────────────────
function ClienteRow({
  cliente,
  apolices,
  onEditar,
  onExcluir,
  onNovaApolice,
  onEditarApolice,
  onExcluirApolice,
}: {
  cliente: Cliente;
  apolices: Apolice[];
  onEditar: () => void;
  onExcluir: () => void;
  onNovaApolice: () => void;
  onEditarApolice: (a: Apolice) => void;
  onExcluirApolice: (id: number) => void;
}) {
  const [aberto, setAberto] = useState(false);

  // Alerta de renovação: apólice vence em ≤ 30 dias
  const hoje = new Date();
  const alertaRenovacao = apolices.some((a) => {
    if (!a.vigencia_fim || a.status !== "Ativa") return false;
    const fim = new Date(a.vigencia_fim);
    const diff = (fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  return (
    <>
      <tr
        className="border-b border-slate-100 bg-white hover:bg-sky-50/40 transition-colors cursor-pointer"
        onClick={() => setAberto((v) => !v)}
      >
        <td className="px-3 py-2.5 font-medium text-slate-900">
          <div className="flex items-center gap-2">
            {aberto ? <ChevronUp className="size-3.5 text-slate-400 shrink-0" /> : <ChevronDown className="size-3.5 text-slate-400 shrink-0" />}
            <span className="truncate max-w-48" title={cliente.nome}>{cliente.nome}</span>
            {alertaRenovacao && (
              <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                Renovação próxima
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{cliente.documento}</td>
        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{cliente.telefone || "—"}</td>
        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{cliente.email || "—"}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span className="inline-block rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
            {cliente.tipo}
          </span>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          {cliente.status_cadastro === "Cancelado"
            ? <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900">Cancelado</span>
            : <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">Ativo</span>}
        </td>
        <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
          {apolices.length} apólice{apolices.length !== 1 ? "s" : ""}
        </td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex gap-2">
            <button type="button" onClick={onEditar}
              className="rounded-lg border border-amber-300/80 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-200/90">
              Editar
            </button>
            <button type="button" onClick={onExcluir}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
              Excluir
            </button>
          </div>
        </td>
      </tr>

      {/* Linha expandida — apólices do cliente */}
      {aberto && (
        <tr className="bg-slate-50/80 border-b border-slate-200">
          <td colSpan={8} className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Apólices de {cliente.nome}
              </p>
              <button type="button" onClick={onNovaApolice}
                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100">
                <Plus className="size-3" /> Nova apólice
              </button>
            </div>

            {apolices.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma apólice cadastrada.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="pb-1 pr-4 font-semibold">Seguradora</th>
                    <th className="pb-1 pr-4 font-semibold">Ramo</th>
                    <th className="pb-1 pr-4 font-semibold">Apólice nº</th>
                    <th className="pb-1 pr-4 font-semibold">Vigência</th>
                    <th className="pb-1 pr-4 font-semibold">Prêmio</th>
                    <th className="pb-1 pr-4 font-semibold">Status</th>
                    <th className="pb-1 font-semibold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {apolices.map((a) => {
                    // Calcula dias para vencer
                    const hoje = new Date();
                    let diasParaVencer: number | null = null;
                    if (a.vigencia_fim && a.status === "Ativa") {
                      const fim = new Date(a.vigencia_fim);
                      diasParaVencer = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
                    }
                    return (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-1.5 pr-4">{a.seguradora}</td>
                        <td className="py-1.5 pr-4">{a.ramo}</td>
                        <td className="py-1.5 pr-4 font-mono">{a.numero_apolice || "—"}</td>
                        <td className="py-1.5 pr-4 whitespace-nowrap">
                          {a.vigencia_inicio && a.vigencia_fim
                            ? `${a.vigencia_inicio.split("-").reverse().join("/")} → ${a.vigencia_fim.split("-").reverse().join("/")}`
                            : "—"}
                          {diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= 30 && (
                            <span className="ml-2 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-800">
                              {diasParaVencer === 0 ? "Vence hoje!" : `${diasParaVencer}d`}
                            </span>
                          )}
                          {diasParaVencer !== null && diasParaVencer < 0 && (
                            <span className="ml-2 rounded bg-red-100 px-1 py-0.5 text-[10px] font-semibold text-red-800">
                              Vencida
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-4">
                          {a.premio ? `R$ ${a.premio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="py-1.5 pr-4">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${apoliceStatusBadge[a.status]}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-1.5 text-right whitespace-nowrap">
                          <button type="button" onClick={() => onEditarApolice(a)}
                            className="mr-2 text-amber-700 hover:underline">Editar</button>
                          <button type="button" onClick={() => onExcluirApolice(a.id)}
                            className="text-red-600 hover:underline">Excluir</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function Clientes() {
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [apolices, setApolices]     = useState<Apolice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [busca, setBusca]           = useState("");

  // Estado do formulário de cliente
  const [formCliente, setFormCliente]     = useState(clienteVazio());
  const [editandoClienteId, setEditandoClienteId] = useState<number | null>(null);

  // Estado do modal de apólice
  const [modalApolice, setModalApolice]   = useState(false);
  const [formApolice, setFormApolice]     = useState(apoliceVazia());
  const [editandoApoliceId, setEditandoApoliceId] = useState<number | null>(null);
  const [apoliceClienteId, setApoliceClienteId]   = useState<number | null>(null);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, type: "error" as "error" | "success" | "info", title: "", message: "",
  });

  function modal(type: "error" | "success" | "info", title: string, message: string) {
    setModalConfig({ isOpen: true, type, title, message });
  }

  // ── Carrega dados ────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    const [{ data: dc }, { data: da }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("apolices").select("*"),
    ]);
    if (dc) setClientes(dc as Cliente[]);
    if (da) setApolices(da as Apolice[]);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  // ── Handlers do formulário de cliente ───────────────────
  function handleChangeCliente(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    let { name, value } = e.target;
    if (name === "documento") {
      const digits = value.replace(/\D/g, "").slice(0, DOC_MAX_DIGITS);
      setFormCliente((f) => ({ ...f, documento: formatDocumento(digits), documento_digits: digits }));
      return;
    }
    if (name === "telefone") {
      const digits = value.replace(/\D/g, "").slice(0, FONE_MAX_DIGITS);
      setFormCliente((f) => ({ ...f, telefone: formatTelefone(digits) }));
      return;
    }
    setFormCliente((f) => ({ ...f, [name]: value }));
  }

  async function salvarCliente() {
    if (!formCliente.nome.trim() || !formCliente.documento_digits) {
      modal("error", "Campos obrigatórios", "Preencha Nome e CPF/CNPJ.");
      return;
    }
    const len = formCliente.documento_digits.length;
    if (len !== 11 && len !== 14) {
      modal("error", "Documento inválido", "CPF deve ter 11 dígitos e CNPJ 14 dígitos.");
      return;
    }

    const payload = {
      nome:             formCliente.nome.trim(),
      documento:        formCliente.documento,
      documento_digits: formCliente.documento_digits,
      telefone:         formCliente.telefone || null,
      email:            formCliente.email || null,
      tipo:             formCliente.tipo,
      status_cadastro:  formCliente.status_cadastro,
      observacoes:      formCliente.observacoes || null,
    };

    if (editandoClienteId) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editandoClienteId);
      if (error) { modal("error", "Erro", error.message); return; }
    } else {
      // Verifica duplicidade
      const { data: exist } = await supabase
        .from("clientes").select("id, nome").eq("documento_digits", formCliente.documento_digits).maybeSingle();
      if (exist) {
        modal("info", "Documento já cadastrado", `Este documento pertence a ${exist.nome}.`);
        return;
      }
      const { error } = await supabase.from("clientes").insert([{ id: Date.now(), ...payload }]);
      if (error) { modal("error", "Erro", error.message); return; }
    }

    setEditandoClienteId(null);
    setFormCliente(clienteVazio());
    carregar();
  }

  function editarCliente(c: Cliente) {
    setFormCliente({
      nome: c.nome, documento: c.documento, documento_digits: c.documento_digits,
      telefone: c.telefone ?? "", email: c.email ?? "", tipo: c.tipo,
      status_cadastro: c.status_cadastro, observacoes: c.observacoes,
    });
    setEditandoClienteId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirCliente(id: number) {
    if (!window.confirm("Excluir este cliente e todas as suas apólices e boletos?")) return;
    const { error } = await supabase.from("clientes").delete().eq("id", id);
    if (error) { modal("error", "Erro", error.message); return; }
    carregar();
  }

  // ── Handlers de apólice ─────────────────────────────────
  function abrirModalNovaApolice(clienteId: number) {
    setApoliceClienteId(clienteId);
    setEditandoApoliceId(null);
    setFormApolice(apoliceVazia());
    setModalApolice(true);
  }

  function abrirModalEditarApolice(a: Apolice) {
    setApoliceClienteId(a.cliente_id);
    setEditandoApoliceId(a.id);
    setFormApolice({
      seguradora: a.seguradora, ramo: a.ramo,
      numero_apolice: a.numero_apolice ?? "",
      vigencia_inicio: a.vigencia_inicio ?? "",
      vigencia_fim: a.vigencia_fim ?? "",
      premio: a.premio, status: a.status, observacoes: a.observacoes,
    });
    setModalApolice(true);
  }

  async function salvarApolice() {
    if (!apoliceClienteId) return;
    const payload = {
      cliente_id:     apoliceClienteId,
      seguradora:     formApolice.seguradora,
      ramo:           formApolice.ramo,
      numero_apolice: formApolice.numero_apolice || null,
      vigencia_inicio: formApolice.vigencia_inicio || null,
      vigencia_fim:   formApolice.vigencia_fim || null,
      premio:         formApolice.premio || null,
      status:         formApolice.status,
      observacoes:    formApolice.observacoes || null,
    };

    if (editandoApoliceId) {
      const { error } = await supabase.from("apolices").update(payload).eq("id", editandoApoliceId);
      if (error) { modal("error", "Erro", error.message); return; }
    } else {
      const { error } = await supabase.from("apolices").insert([{ id: Date.now(), ...payload }]);
      if (error) { modal("error", "Erro", error.message); return; }
    }

    setModalApolice(false);
    carregar();
  }

  async function excluirApolice(id: number) {
    if (!window.confirm("Excluir esta apólice e seus boletos vinculados?")) return;
    const { error } = await supabase.from("apolices").delete().eq("id", id);
    if (error) { modal("error", "Erro", error.message); return; }
    carregar();
  }

  // ── Filtragem ────────────────────────────────────────────
  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.documento.includes(busca) ||
      c.documento_digits.includes(busca.replace(/\D/g, ""))
  );

  const apolicesPorCliente = (id: number) => apolices.filter((a) => a.cliente_id === id);

  // ── Alertas de renovação (painel no topo) ───────────────
  const alertas = apolices.filter((a) => {
    if (!a.vigencia_fim || a.status !== "Ativa") return false;
    const diff = (new Date(a.vigencia_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  });

  return (
    <PageShell
      title="Clientes"
      subtitle="Gerencie sua base de clientes e as apólices vinculadas a cada um."
      actions={
        <div className="w-full sm:w-96">
          <Input type="search" label="Buscar" placeholder="Nome ou CPF/CNPJ…"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
      }
    >
      {/* Alertas de renovação */}
      {alertas.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-900">
            ⚠️ {alertas.length} apólice{alertas.length > 1 ? "s" : ""} vence{alertas.length > 1 ? "m" : ""} nos próximos 30 dias
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Expanda o cliente na tabela abaixo para ver os detalhes e contatar.
          </p>
        </div>
      )}

      {/* Formulário de cliente */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {editandoClienteId ? "Editando cliente" : "Novo cliente"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Dados cadastrais da pessoa. Apólices (seguradora, ramo, vigência) são adicionadas depois, na tabela.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div className="sm:col-span-2 xl:col-span-1">
              <Input name="nome" value={formCliente.nome} onChange={handleChangeCliente}
                label="Nome completo" placeholder="Ex.: Maria Silva" autoComplete="name" />
            </div>
            <Input name="documento" value={formCliente.documento} onChange={handleChangeCliente}
              label="CPF / CNPJ" placeholder="000.000.000-00" maxLength={18} inputMode="numeric" />
            <Input name="telefone" value={formCliente.telefone ?? ""} onChange={handleChangeCliente}
              label="Telefone / WhatsApp" placeholder="(00) 00000-0000" maxLength={15} inputMode="numeric" />
            <Input name="email" value={formCliente.email ?? ""} onChange={handleChangeCliente}
              label="E-mail" placeholder="maria@email.com" type="email" />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Tipo</label>
              <select name="tipo" value={formCliente.tipo} onChange={handleChangeCliente}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500">
                <option value="Cliente">Cliente</option>
                <option value="Lead">Lead</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select name="status_cadastro" value={formCliente.status_cadastro} onChange={handleChangeCliente}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-500">
                <option value="Ativo">Ativo</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>

            <div className="sm:col-span-2 xl:col-span-3 flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Observações</label>
              <textarea name="observacoes" value={formCliente.observacoes ?? ""}
                onChange={handleChangeCliente} rows={2}
                placeholder="Anotações internas sobre o cliente..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-500" />
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {editandoClienteId && (
              <button type="button"
                onClick={() => { setEditandoClienteId(null); setFormCliente(clienteVazio()); }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar edição
              </button>
            )}
            <button type="button" onClick={salvarCliente} className="btn-save w-full sm:w-auto">
              {editandoClienteId ? "Atualizar cliente" : "Salvar cliente"}
            </button>
          </div>
        </div>
      </section>

      {/* Tabela de clientes */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Clientes cadastrados</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Clique em uma linha para ver e gerenciar as apólices do cliente.
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/95 text-left text-slate-700 border-b border-slate-200">
                  <th className="px-3 py-2.5 font-semibold">Nome</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">CPF / CNPJ</th>
                  <th className="px-3 py-2.5 font-semibold">Telefone</th>
                  <th className="px-3 py-2.5 font-semibold">E-mail</th>
                  <th className="px-3 py-2.5 font-semibold">Tipo</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Apólices</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500 animate-pulse">Carregando...</td></tr>
                ) : clientesFiltrados.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Nenhum cliente encontrado.</td></tr>
                ) : (
                  clientesFiltrados.map((c) => (
                    <ClienteRow
                      key={c.id}
                      cliente={c}
                      apolices={apolicesPorCliente(c.id)}
                      onEditar={() => editarCliente(c)}
                      onExcluir={() => excluirCliente(c.id)}
                      onNovaApolice={() => abrirModalNovaApolice(c.id)}
                      onEditarApolice={abrirModalEditarApolice}
                      onExcluirApolice={excluirApolice}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Modal de apólice */}
      {modalApolice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {editandoApoliceId ? "Editar apólice" : "Nova apólice"}
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Seguradora</label>
                <select value={formApolice.seguradora}
                  onChange={(e) => setFormApolice((f) => ({ ...f, seguradora: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500">
                  {SEGURADORAS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Ramo</label>
                <select value={formApolice.ramo}
                  onChange={(e) => setFormApolice((f) => ({ ...f, ramo: e.target.value }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500">
                  {RAMOS_SEGURO.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Nº da apólice</label>
                <input value={formApolice.numero_apolice ?? ""}
                  onChange={(e) => setFormApolice((f) => ({ ...f, numero_apolice: e.target.value.replace(/\D/g, "") }))}
                  placeholder="Somente números" inputMode="numeric"
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Prêmio (R$)</label>
                <input type="number" value={formApolice.premio ?? ""}
                  onChange={(e) => setFormApolice((f) => ({ ...f, premio: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="0,00" min={0} step={0.01}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Vigência início</label>
                <input type="date" value={formApolice.vigencia_inicio ?? ""}
                  onChange={(e) => setFormApolice((f) => ({ ...f, vigencia_inicio: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Vigência fim</label>
                <input type="date" value={formApolice.vigencia_fim ?? ""}
                  onChange={(e) => setFormApolice((f) => ({ ...f, vigencia_fim: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Status da apólice</label>
                <select value={formApolice.status}
                  onChange={(e) => setFormApolice((f) => ({ ...f, status: e.target.value as StatusApolice }))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500">
                  {STATUS_APOLICE.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2 flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Observações</label>
                <textarea value={formApolice.observacoes ?? ""}
                  onChange={(e) => setFormApolice((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={2} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button type="button" onClick={() => setModalApolice(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="button" onClick={salvarApolice} className="btn-save">
                {editandoApoliceId ? "Atualizar apólice" : "Salvar apólice"}
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