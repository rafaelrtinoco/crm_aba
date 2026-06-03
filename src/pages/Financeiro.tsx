// src/pages/Financeiro.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, MessageCircle, Upload } from "lucide-react";
import PageShell from "../components/PageShell";
import { supabase } from "../lib/supabaseClient";
import NotificationModal from "../components/NotificationModal";
import { applyTemplatePlaceholders, digitsToWhatsAppBr, loadTemplatesBoleto } from "../lib/mensagensTemplates";
import { prazoLabels, prazoVencimento, todayIsoBr } from "../lib/vencimentoBoleto";
import { downloadTextFile } from "../lib/financeiroUtils";
import type { Cliente, Apolice, Boleto, BoletoCompleto, StatusBoleto } from "../types";

// ── Helpers ──────────────────────────────────────────────────

function prazoClass(prazo: ReturnType<typeof prazoVencimento>) {
  if (prazo === "vencido")    return "bg-red-100 text-red-900 ring-red-200";
  if (prazo === "vence_hoje") return "bg-amber-100 text-amber-950 ring-amber-200";
  return "bg-sky-100 text-sky-900 ring-sky-200";
}

function nomeClienteCell(cliente: BoletoCompleto["cliente"] | undefined) {
  if (!cliente) return <span className="text-amber-700">Sem vínculo</span>;
  if (cliente.status_cadastro === "Cancelado") {
    return (
      <span className="inline-flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <span>{cliente.nome}</span>
        <span className="w-fit rounded-md bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-900">
          Cancelado
        </span>
      </span>
    );
  }
  return <span>{cliente.nome}</span>;
}

// CSV modelo para importação
const BOLETO_CSV_MODELO = `apolice_id,vencimento,valor,status
123456789,2025-08-10,350.00,Pendente
123456790,2025-08-15,180.00,Pendente`;

// ════════════════════════════════════════════════════════════
export default function Financeiro() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [clientes, setClientes]   = useState<Cliente[]>([]);
  const [apolices, setApolices]   = useState<Apolice[]>([]);
  const [boletos, setBoletos]     = useState<Boleto[]>([]);
  const [loading, setLoading]     = useState(true);

  // Formulário de novo boleto
  const [apoliceId, setApoliceId]     = useState<number | null>(null);
  const [clienteSearch, setClienteSearch] = useState("");
  const [comboOpen, setComboOpen]     = useState(false);
  const [clienteSel, setClienteSel]   = useState<Cliente | null>(null);
  const [vencimento, setVencimento]   = useState("");
  const [valor, setValor]             = useState("");
  const [editandoId, setEditandoId]   = useState<number | null>(null);

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroRamo, setFiltroRamo]       = useState("");
  const [filtroSeg, setFiltroSeg]         = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState<"" | StatusBoleto>("");

  const comboRef = useRef<HTMLDivElement>(null);
  const hoje = todayIsoBr();

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, type: "error" as "error" | "success" | "info", title: "", message: "",
  });
  function modal(type: "error" | "success" | "info", title: string, message: string) {
    setModalConfig({ isOpen: true, type, title, message });
  }

  // ── Carrega dados ────────────────────────────────────────
  async function carregar() {
    setLoading(true);
    const [{ data: dc }, { data: da }, { data: db }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("apolices").select("*"),
      supabase.from("boletos").select("*").order("vencimento"),
    ]);
    if (dc) setClientes(dc as Cliente[]);
    if (da) setApolices(da as Apolice[]);
    if (db) setBoletos(db as Boleto[]);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    function close(e: MouseEvent) {
      if (!comboRef.current?.contains(e.target as Node)) setComboOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ── Join boletos com apólice + cliente ───────────────────
  const boletosCompletos: BoletoCompleto[] = useMemo(() => {
    return boletos.map((b) => {
      const apolice = apolices.find((a) => a.id === b.apolice_id);
      const cliente = clientes.find((c) => c.id === apolice?.cliente_id);
      return {
        ...b,
        apolice: apolice
          ? { id: apolice.id, seguradora: apolice.seguradora, ramo: apolice.ramo, numero_apolice: apolice.numero_apolice }
          : { id: 0, seguradora: "—", ramo: "—", numero_apolice: null },
        cliente: cliente
          ? { id: cliente.id, nome: cliente.nome, documento: cliente.documento, telefone: cliente.telefone, status_cadastro: cliente.status_cadastro }
          : undefined as any,
      };
    });
  }, [boletos, apolices, clientes]);

  // ── Apólices do cliente selecionado ─────────────────────
  const apolicesDoCliente = useMemo(
    () => (clienteSel ? apolices.filter((a) => a.cliente_id === clienteSel.id) : []),
    [clienteSel, apolices]
  );

  // ── Combo de busca de clientes ───────────────────────────
  const clientesFiltradosCombo = useMemo(() => {
    const q = clienteSearch.trim().toLowerCase();
    if (!q) return clientes.slice(0, 12);
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.documento.includes(q) || c.documento_digits.includes(q.replace(/\D/g, ""))
    ).slice(0, 20);
  }, [clientes, clienteSearch]);

  // ── Opções de filtro ─────────────────────────────────────
  const ramosOpts = useMemo(() => [...new Set(apolices.map((a) => a.ramo))].sort(), [apolices]);
  const segOpts   = useMemo(() => [...new Set(apolices.map((a) => a.seguradora))].sort(), [apolices]);
  const clientesOpts = useMemo(() => clientes.map((c) => ({ id: c.id, nome: c.nome })), [clientes]);

  // ── Salvar boleto ────────────────────────────────────────
  async function salvarBoleto() {
    if (!apoliceId) {
      modal("info", "Apólice não selecionada", "Selecione o cliente e a apólice antes de salvar.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
      modal("error", "Data inválida", "Informe uma data de vencimento válida.");
      return;
    }

    const payload = {
      apolice_id:  apoliceId,
      vencimento,
      valor:       valor ? Number(valor) : null,
      status:      "Pendente" as StatusBoleto,
      observacoes: null,
    };

    if (editandoId) {
      const anterior = boletos.find((b) => b.id === editandoId);
      const { error } = await supabase.from("boletos").update({ ...payload, status: anterior?.status ?? "Pendente" }).eq("id", editandoId);
      if (error) { modal("error", "Erro", error.message); return; }
      setEditandoId(null);
    } else {
      const { error } = await supabase.from("boletos").insert([{ id: Date.now(), ...payload }]);
      if (error) { modal("error", "Erro", error.message); return; }
    }

    setClienteSel(null);
    setClienteSearch("");
    setApoliceId(null);
    setVencimento("");
    setValor("");
    carregar();
  }

  function editarBoleto(b: BoletoCompleto) {
    const apolice = apolices.find((a) => a.id === b.apolice_id);
    const cliente = clientes.find((c) => c.id === apolice?.cliente_id);
    if (cliente) {
      setClienteSel(cliente);
      setClienteSearch(`${cliente.nome} — ${cliente.documento}`);
    }
    setApoliceId(b.apolice_id);
    setVencimento(b.vencimento);
    setValor(b.valor ? String(b.valor) : "");
    setEditandoId(b.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function excluirBoleto(id: number) {
    if (!window.confirm("Excluir este boleto?")) return;
    const { error } = await supabase.from("boletos").delete().eq("id", id);
    if (error) { modal("error", "Erro", error.message); return; }
    if (editandoId === id) {
      setEditandoId(null); setClienteSel(null); setClienteSearch("");
      setApoliceId(null); setVencimento(""); setValor("");
    }
    carregar();
  }

  async function setBoletoStatus(id: number, status: StatusBoleto) {
    const { error } = await supabase.from("boletos").update({ status }).eq("id", id);
    if (error) { modal("error", "Erro", error.message); return; }
    setBoletos((list) => list.map((b) => (b.id === id ? { ...b, status } : b)));
  }

  // ── WhatsApp ─────────────────────────────────────────────
  function abrirWhatsApp(b: BoletoCompleto) {
    if (b.status === "Pago") { modal("info", "Boleto pago", "WhatsApp é sugerido apenas para boletos pendentes."); return; }
    if (!b.cliente?.telefone?.trim()) { modal("info", "Sem telefone", "Cadastre o telefone do cliente na aba Clientes."); return; }
    const wa = digitsToWhatsAppBr(b.cliente.telefone);
    if (!wa) { modal("error", "Telefone inválido", "Use DDD + número (10 ou 11 dígitos)."); return; }
    const prazo = prazoVencimento(b.vencimento, hoje);
    const templates = loadTemplatesBoleto();
    const texto = applyTemplatePlaceholders(templates[prazo], {
      nome:       b.cliente.nome,
      vencimento: b.vencimento.split("-").reverse().join("/"),
      ramo:       b.apolice.ramo,
      documento:  b.cliente.documento,
      seguradora: b.apolice.seguradora,
    });
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  // ── Importação CSV ────────────────────────────────────────
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.trim().split("\n").slice(1); // pula header
      const rows = lines.map((l) => l.split(",").map((v) => v.trim().replace(/^"|"$/g, "")));
      const payload = rows
        .filter((r) => r.length >= 2 && r[0] && r[1])
        .map((r, i) => ({
          id:          Date.now() + i,
          apolice_id:  Number(r[0]),
          vencimento:  r[1],
          valor:       r[2] ? Number(r[2]) : null,
          status:      (r[3] || "Pendente") as StatusBoleto,
          observacoes: null,
        }));
      const { error } = await supabase.from("boletos").insert(payload);
      if (error) { modal("error", "Erro na importação", error.message); return; }
      modal("success", "Importação concluída", `${payload.length} boleto(s) importado(s).`);
      carregar();
    } catch {
      modal("error", "Erro", "Não foi possível processar o arquivo.");
    }
  }

  // ── Filtro da tabela ─────────────────────────────────────
  const filtrados = useMemo(() => {
    return boletosCompletos.filter((b) => {
      if (filtroCliente && b.cliente?.id !== Number(filtroCliente)) return false;
      if (filtroRamo && b.apolice.ramo !== filtroRamo) return false;
      if (filtroSeg && b.apolice.seguradora !== filtroSeg) return false;
      if (filtroPagamento && b.status !== filtroPagamento) return false;
      return true;
    });
  }, [boletosCompletos, filtroCliente, filtroRamo, filtroSeg, filtroPagamento]);

  return (
    <PageShell
      title="Financeiro"
      subtitle="Gerencie boletos vinculados às apólices e acione o WhatsApp conforme o prazo de vencimento."
    >
      {/* Importar */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Importar boletos em lote</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Colunas do CSV: <code className="rounded bg-slate-100 px-1 text-xs">apolice_id, vencimento (YYYY-MM-DD), valor, status</code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-5">
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImportFile} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50">
            <Upload className="size-4" /> Importar CSV
          </button>
          <button type="button" onClick={() => downloadTextFile("modelo_boletos.csv", BOLETO_CSV_MODELO, "text/csv")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50">
            <Download className="size-4" /> Baixar modelo (.csv)
          </button>
        </div>
      </section>

      {/* Cadastro de boleto */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            {editandoId ? "Editando boleto" : "Novo boleto"}
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Selecione o cliente, escolha a apólice (ramo + seguradora) e informe o vencimento.
          </p>
        </div>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Combo cliente */}
            <div className="relative lg:col-span-2" ref={comboRef}>
              <label className="mb-1 block text-sm font-medium text-slate-700">Buscar cliente</label>
              <input className="input" placeholder="Digite nome ou CPF/CNPJ…"
                value={clienteSearch}
                onChange={(e) => { setClienteSearch(e.target.value); setComboOpen(true); setClienteSel(null); setApoliceId(null); }}
                onFocus={() => setComboOpen(true)} autoComplete="off" />
              {comboOpen && clientesFiltradosCombo.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {clientesFiltradosCombo.map((c) => (
                    <li key={c.id}>
                      <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setClienteSel(c);
                          setClienteSearch(`${c.nome} — ${c.documento}`);
                          setApoliceId(null);
                          setComboOpen(false);
                        }}>
                        <span className="font-medium text-slate-900">{c.nome}</span>
                        <span className="block text-xs text-slate-500">{c.documento}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Seleção de apólice */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Apólice</label>
              <select value={apoliceId ?? ""} onChange={(e) => setApoliceId(Number(e.target.value) || null)}
                disabled={!clienteSel} className="input">
                <option value="">{clienteSel ? "Selecione a apólice" : "Selecione um cliente acima"}</option>
                {apolicesDoCliente.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.ramo} — {a.seguradora}{a.numero_apolice ? ` (nº ${a.numero_apolice})` : ""}
                  </option>
                ))}
              </select>
              {clienteSel && apolicesDoCliente.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">Este cliente não tem apólices. Cadastre em Clientes primeiro.</p>
              )}
            </div>

            {/* Vencimento */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vencimento</label>
              <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="input" />
            </div>

            {/* Valor */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Valor (R$) — opcional</label>
              <input type="number" value={valor} onChange={(e) => setValor(e.target.value)}
                placeholder="0,00" min={0} step={0.01} className="input" />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {editandoId && (
              <button type="button"
                onClick={() => { setEditandoId(null); setClienteSel(null); setClienteSearch(""); setApoliceId(null); setVencimento(""); setValor(""); }}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancelar edição
              </button>
            )}
            <button type="button" onClick={salvarBoleto} className="btn-save w-full sm:w-auto">
              {editandoId ? "Atualizar boleto" : "Salvar boleto"}
            </button>
          </div>
        </div>
      </section>

      {/* Tabela de boletos */}
      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Boletos cadastrados</h2>
        </div>
        <div className="p-4 sm:p-6 space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Cliente</label>
              <select className="input h-10 text-sm" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                <option value="">Todos</option>
                {clientesOpts.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ramo</label>
              <select className="input h-10 text-sm" value={filtroRamo} onChange={(e) => setFiltroRamo(e.target.value)}>
                <option value="">Todos</option>
                {ramosOpts.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Seguradora</label>
              <select className="input h-10 text-sm" value={filtroSeg} onChange={(e) => setFiltroSeg(e.target.value)}>
                <option value="">Todas</option>
                {segOpts.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Pagamento</label>
              <select className="input h-10 text-sm" value={filtroPagamento} onChange={(e) => setFiltroPagamento(e.target.value as "" | StatusBoleto)}>
                <option value="">Todos</option>
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/95 text-left text-slate-700">
                  <th className="px-3 py-2.5 font-semibold">Cliente</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Ramo</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Seguradora</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Apólice nº</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Vencimento</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Valor</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Prazo</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Pagamento</th>
                  <th className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">WhatsApp</th>
                  <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap w-[1%]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500 animate-pulse">Carregando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">Nenhum boleto encontrado.</td></tr>
                ) : (
                  filtrados.map((b) => {
                    const prazo = b.status === "Pago" ? null : prazoVencimento(b.vencimento, hoje);
                    return (
                      <tr key={b.id} className="border-b border-slate-100 bg-white hover:bg-sky-50/40 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-slate-900 max-w-48">
                          <span className="block truncate">{nomeClienteCell(b.cliente)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{b.apolice.ramo}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{b.apolice.seguradora}</td>
                        <td className="px-3 py-2.5 text-slate-500 font-mono text-xs whitespace-nowrap">{b.apolice.numero_apolice || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {b.vencimento.split("-").reverse().join("/")}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {b.valor ? `R$ ${b.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {prazo === null
                            ? <span className="text-slate-400">—</span>
                            : <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${prazoClass(prazo)}`}>
                                {prazoLabels[prazo]}
                              </span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <select value={b.status} onChange={(e) => setBoletoStatus(b.id, e.target.value as StatusBoleto)}
                            className="input h-9 min-w-32 py-1 text-sm">
                            <option value="Pendente">Pendente</option>
                            <option value="Pago">Pago</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <button type="button" onClick={() => abrirWhatsApp(b)}
                            disabled={b.status === "Pago" || !b.cliente?.telefone?.trim()}
                            className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed">
                            <MessageCircle className="size-5" />
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-2">
                            <button type="button" onClick={() => editarBoleto(b)}
                              className="rounded-lg border border-amber-300/80 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-200/90">
                              Editar
                            </button>
                            <button type="button" onClick={() => excluirBoleto(b.id)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <NotificationModal isOpen={modalConfig.isOpen} type={modalConfig.type}
        title={modalConfig.title} message={modalConfig.message}
        onClose={() => setModalConfig((m) => ({ ...m, isOpen: false }))} />
    </PageShell>
  );
}