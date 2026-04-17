import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, MessageCircle, Upload } from "lucide-react";
import { formatDocumento } from "../lib/documentoFormat";
import PageShell from "../components/PageShell";
import {
  BOLETOS_STORAGE_KEY,
  BOLETO_TEMPLATE_CSV,
  downloadTextFile,
  findClienteByDocRamo,
  loadBoletosFromStorage,
  loadClientesFromStorage,
  onlyDigits,
  parseDelimitedText,
  parseTableRows,
} from "../lib/financeiroUtils";
import {
  applyTemplatePlaceholders,
  digitsToWhatsAppBr,
  loadTemplatesBoleto,
} from "../lib/mensagensTemplates";
import { downloadBoletoTemplateXlsx, readFirstSheetAsRows } from "../lib/readExcelSheet";
import type { Boleto, BoletoStatus, ClienteLite } from "../types/boleto";
import { prazoLabels, prazoVencimento, todayIsoBr } from "../lib/vencimentoBoleto";

function formatDisplayDoc(digits: string): string {
  return formatDocumento(digits);
}

type UniqDoc = { docDigits: string; nome: string; docFmt: string };

function uniqueClienteDocs(clientes: ClienteLite[]): UniqDoc[] {
  const m = new Map<string, { nome: string; docFmt: string }>();
  for (const c of clientes) {
    const d = onlyDigits(c.documento);
    if (d.length !== 11 && d.length !== 14) continue;
    if (!m.has(d)) m.set(d, { nome: c.nome, docFmt: c.documento });
  }
  return [...m.entries()].map(([docDigits, v]) => ({
    docDigits,
    nome: v.nome,
    docFmt: v.docFmt,
  }));
}

function ramosForDocumento(clientes: ClienteLite[], docDigits: string): string[] {
  const s = new Set<string>();
  for (const c of clientes) {
    if (onlyDigits(c.documento) === docDigits) s.add(c.ramo);
  }
  return [...s];
}

function distinctSeguradoras(clientes: ClienteLite[]): string[] {
  const s = new Set<string>();
  for (const c of clientes) {
    if (c.seguradora?.trim()) s.add(c.seguradora.trim());
  }
  return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function prazoBadgeClass(prazo: ReturnType<typeof prazoVencimento>): string {
  if (prazo === "vencido") return "bg-red-100 text-red-900 ring-red-200";
  if (prazo === "vence_hoje") return "bg-amber-100 text-amber-950 ring-amber-200";
  return "bg-sky-100 text-sky-900 ring-sky-200";
}

function nomeClienteCell(c: ClienteLite | undefined) {
  if (!c) {
    return <span className="text-amber-700">Sem vínculo</span>;
  }
  if (c.statusCadastro === "Cancelado") {
    return (
      <span className="inline-flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
        <span>{c.nome}</span>
        <span className="w-fit rounded-md bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-900 ring-1 ring-rose-200">
          Cliente cancelado
        </span>
      </span>
    );
  }
  return <span>{c.nome}</span>;
}

export default function Financeiro() {
  const fileRef = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const [clientes, setClientes] = useState<ClienteLite[]>(() =>
    loadClientesFromStorage()
  );
  const [boletos, setBoletos] = useState<Boleto[]>(() =>
    loadBoletosFromStorage()
  );
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const [docSearch, setDocSearch] = useState("");
  const [comboOpen, setComboOpen] = useState(false);
  const [selectedDocDigits, setSelectedDocDigits] = useState<string | null>(null);
  const [selectedRamo, setSelectedRamo] = useState("");
  const [vencimento, setVencimento] = useState("");

  const [filtroDoc, setFiltroDoc] = useState("");
  const [filtroSeg, setFiltroSeg] = useState("");
  const [filtroRamo, setFiltroRamo] = useState("");
  const [filtroPagamento, setFiltroPagamento] = useState<"" | BoletoStatus>("");

  const hoje = todayIsoBr();

  useEffect(() => {
    const sync = () => {
      setClientes(loadClientesFromStorage());
      setBoletos(loadBoletosFromStorage());
    };
    const onVis = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(BOLETOS_STORAGE_KEY, JSON.stringify(boletos));
  }, [boletos]);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!comboRef.current?.contains(e.target as Node)) setComboOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const uniqDocs = useMemo(() => uniqueClienteDocs(clientes), [clientes]);
  const docSearchNorm = docSearch.trim().toLowerCase();
  const docDigitsQuery = onlyDigits(docSearch);
  const filteredUniq = useMemo(() => {
    if (!docSearchNorm && !docDigitsQuery) return uniqDocs.slice(0, 12);
    return uniqDocs
      .filter(
        (u) =>
          u.nome.toLowerCase().includes(docSearchNorm) ||
          u.docDigits.includes(docDigitsQuery) ||
          u.docFmt.replace(/\D/g, "").includes(docDigitsQuery)
      )
      .slice(0, 20);
  }, [uniqDocs, docSearchNorm, docDigitsQuery]);

  const ramosDisponiveis = selectedDocDigits
    ? ramosForDocumento(clientes, selectedDocDigits)
    : [];

  const clienteLinhaSelecionada =
    selectedDocDigits && selectedRamo
      ? findClienteByDocRamo(clientes, selectedDocDigits, selectedRamo)
      : undefined;

  function setBoletoStatus(id: number, status: BoletoStatus) {
    setBoletos((list) =>
      list.map((b) => (b.id === id ? { ...b, status } : b))
    );
  }

  function salvarBoleto() {
    if (!selectedDocDigits || !selectedRamo) {
      alert("Selecione o cliente (busca) e o ramo do cadastro.");
      return;
    }
    if (!findClienteByDocRamo(clientes, selectedDocDigits, selectedRamo)) {
      alert("Combinação cliente + ramo inválida.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
      alert("Data de vencimento inválida.");
      return;
    }

    const anterior = editandoId
      ? boletos.find((b) => b.id === editandoId)
      : undefined;
    const statusPagamento: BoletoStatus = anterior?.status ?? "Pendente";

    const payload: Boleto = {
      id: editandoId ?? Date.now(),
      documentoDigits: selectedDocDigits,
      ramo: selectedRamo,
      vencimento,
      status: statusPagamento,
    };

    if (editandoId) {
      setBoletos((list) => list.map((b) => (b.id === editandoId ? payload : b)));
      setEditandoId(null);
    } else {
      setBoletos((list) => [...list, payload]);
    }

    setSelectedDocDigits(null);
    setSelectedRamo("");
    setDocSearch("");
    setVencimento("");
  }

  function editar(b: Boleto) {
    const u = uniqDocs.find((x) => x.docDigits === b.documentoDigits);
    setSelectedDocDigits(b.documentoDigits);
    setSelectedRamo(b.ramo);
    setVencimento(b.vencimento);
    setDocSearch(u ? `${u.nome} — ${u.docFmt}` : formatDisplayDoc(b.documentoDigits));
    setEditandoId(b.id);
  }

  function excluir(id: number) {
    if (!window.confirm("Excluir este boleto?")) return;
    setBoletos((list) => list.filter((b) => b.id !== id));
    if (editandoId === id) {
      setEditandoId(null);
      setSelectedDocDigits(null);
      setSelectedRamo("");
      setDocSearch("");
      setVencimento("");
    }
  }

  function abrirWhatsApp(b: Boleto, c: ClienteLite | undefined) {
    if (b.status === "Pago") {
      alert("Este boleto já está pago. WhatsApp é sugerido só para pendências.");
      return;
    }
    if (!c?.telefone?.trim()) {
      alert(
        "Cadastre o telefone do cliente na aba Clientes para enviar WhatsApp."
      );
      return;
    }
    const wa = digitsToWhatsAppBr(c.telefone);
    if (!wa) {
      alert("Telefone inválido. Use DDD + número (10 ou 11 dígitos).");
      return;
    }
    const prazo = prazoVencimento(b.vencimento, hoje);
    const templates = loadTemplatesBoleto();
    const modelo = templates[prazo];
    const texto = applyTemplatePlaceholders(modelo, {
      nome: c.nome,
      vencimento: b.vencimento.split("-").reverse().join("/"),
      ramo: b.ramo,
      documento: formatDisplayDoc(b.documentoDigits),
      seguradora: c.seguradora,
    });
    const url = `https://wa.me/${wa}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportMsg(null);
    const clientesAtual = loadClientesFromStorage();
    setClientes(clientesAtual);

    let rows: string[][] = [];
    const name = file.name.toLowerCase();

    try {
      if (name.endsWith(".csv") || name.endsWith(".txt")) {
        const text = await file.text();
        rows = parseDelimitedText(text);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        rows = await readFirstSheetAsRows(file);
      } else {
        setImportMsg("Use arquivo .csv, .txt ou .xlsx / .xls.");
        return;
      }
    } catch {
      setImportMsg("Não foi possível ler o arquivo.");
      return;
    }

    const { results, added } = parseTableRows(rows, clientesAtual);
    const ok = results.filter((r) => r.ok).length;
    const fail = results.filter((r) => !r.ok);

    if (added.length > 0) {
      setBoletos((list) => [...list, ...added]);
    }

    const erros = fail
      .filter((r): r is { ok: false; line: number; reason: string } => !r.ok)
      .filter((r) => r.line > 0)
      .slice(0, 8)
      .map((r) => `Linha ${r.line}: ${r.reason}`)
      .join("\n");

    setImportMsg(
      `Importação: ${ok} linha(s) válida(s), ${added.length} boleto(s) gravado(s).` +
        (fail.length ? `\n${fail.length} erro(s).\n${erros}` : "")
    );
  }

  function exportarCsvModelo() {
    downloadTextFile(
      "modelo_boletos.csv",
      BOLETO_TEMPLATE_CSV,
      "text/csv;charset=utf-8"
    );
  }

  const sorted = [...boletos].sort(
    (a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()
  );

  const segurosOpts = distinctSeguradoras(clientes);
  const ramosOpts = useMemo(() => {
    const s = new Set<string>();
    for (const c of clientes) s.add(c.ramo);
    for (const b of boletos) s.add(b.ramo);
    return [...s].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [clientes, boletos]);

  const filtrados = sorted.filter((b) => {
    if (filtroDoc && b.documentoDigits !== filtroDoc) return false;
    if (filtroRamo && b.ramo !== filtroRamo) return false;
    if (filtroPagamento && b.status !== filtroPagamento) return false;
    if (filtroSeg) {
      const c = findClienteByDocRamo(clientes, b.documentoDigits, b.ramo);
      if ((c?.seguradora ?? "").trim() !== filtroSeg) return false;
    }
    return true;
  });

  return (
    <PageShell
      title="Financeiro"
      subtitle="Importe boletos, cadastre vencimentos e use WhatsApp automaticamente conforme o prazo."
    >
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Importar e modelo
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Colunas: documento, ramo, vencimento, status (opcional). Templates
              de WhatsApp (boleto): aba <strong>Mensagens</strong>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Upload className="size-4" />
              Importar CSV ou Excel
            </button>
            <button
              type="button"
              onClick={exportarCsvModelo}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <Download className="size-4" />
              Baixar modelo (.csv)
            </button>
            <button
              type="button"
              onClick={downloadBoletoTemplateXlsx}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-900 shadow-sm hover:bg-emerald-100/80"
            >
              <FileSpreadsheet className="size-4" />
              Baixar modelo (.xlsx)
            </button>
          </div>
          {importMsg ? (
            <div className="border-t border-slate-100 bg-amber-50/80 px-5 py-3 text-sm text-amber-950 whitespace-pre-wrap sm:px-6">
              {importMsg}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Cadastro de boleto
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Busque o cliente por nome ou CPF/CNPJ e escolha o{" "}
              <strong>ramo cadastrado</strong> para ele. Pagamento (Pago/Pendente)
              só na tabela abaixo.
            </p>
          </div>
          <div className="p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="relative lg:col-span-2" ref={comboRef}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Cliente (busca)
                </label>
                <input
                  className="input"
                  placeholder="Digite nome ou parte do CPF/CNPJ…"
                  value={docSearch}
                  onChange={(e) => {
                    setDocSearch(e.target.value);
                    setComboOpen(true);
                    setSelectedDocDigits(null);
                    setSelectedRamo("");
                  }}
                  onFocus={() => setComboOpen(true)}
                  autoComplete="off"
                />
                {comboOpen && filteredUniq.length > 0 ? (
                  <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {filteredUniq.map((u) => (
                      <li key={u.docDigits}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => {
                            setSelectedDocDigits(u.docDigits);
                            setDocSearch(`${u.nome} — ${u.docFmt}`);
                            const r = ramosForDocumento(clientes, u.docDigits);
                            setSelectedRamo(r[0] ?? "");
                            setComboOpen(false);
                          }}
                        >
                          <span className="font-medium text-slate-900">
                            {u.nome}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {u.docFmt}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ramo (só cadastros deste cliente)
                </label>
                <select
                  value={selectedRamo}
                  onChange={(e) => setSelectedRamo(e.target.value)}
                  className="input"
                  disabled={!selectedDocDigits}
                >
                  {!selectedDocDigits ? (
                    <option value="">Selecione um cliente acima</option>
                  ) : ramosDisponiveis.length === 0 ? (
                    <option value="">Nenhum ramo</option>
                  ) : (
                    ramosDisponiveis.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Vencimento
                </label>
                <input
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {clienteLinhaSelecionada ? (
              <p className="text-sm text-emerald-800">
                Vínculo: <strong>{clienteLinhaSelecionada.nome}</strong> —{" "}
                {clienteLinhaSelecionada.seguradora ?? "—"} —{" "}
                {clienteLinhaSelecionada.statusCadastro === "Cancelado"
                  ? "cadastro cancelado (boleto permitido)"
                  : "ativo"}
              </p>
            ) : selectedDocDigits ? (
              <p className="text-sm text-amber-800">
                Escolha um ramo que exista no cadastro deste CPF/CNPJ.
              </p>
            ) : null}

            <button type="button" onClick={salvarBoleto} className="btn-save">
              {editandoId ? "Atualizar boleto" : "Salvar boleto"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Boletos cadastrados
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Filtros por cliente, seguradora, ramo e pagamento.
            </p>
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Cliente
                </label>
                <select
                  className="input h-10 text-sm"
                  value={filtroDoc}
                  onChange={(e) => setFiltroDoc(e.target.value)}
                >
                  <option value="">Todos</option>
                  {uniqDocs.map((u) => (
                    <option key={u.docDigits} value={u.docDigits}>
                      {u.nome} — {u.docFmt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Seguradora
                </label>
                <select
                  className="input h-10 text-sm"
                  value={filtroSeg}
                  onChange={(e) => setFiltroSeg(e.target.value)}
                >
                  <option value="">Todas</option>
                  {segurosOpts.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Ramo
                </label>
                <select
                  className="input h-10 text-sm"
                  value={filtroRamo}
                  onChange={(e) => setFiltroRamo(e.target.value)}
                >
                  <option value="">Todos</option>
                  {ramosOpts.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Pagamento
                </label>
                <select
                  className="input h-10 text-sm"
                  value={filtroPagamento}
                  onChange={(e) =>
                    setFiltroPagamento(e.target.value as "" | BoletoStatus)
                  }
                >
                  <option value="">Todos</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Pago">Pago</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/30">
              <table className="min-w-[1080px] w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/95 text-left text-slate-700">
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Cliente
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      CPF / CNPJ
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Ramo
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Seguradora
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Vencimento
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Prazo
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Pagamento
                    </th>
                    <th className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
                      WhatsApp
                    </th>
                    <th className="w-[1%] px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        Nenhum boleto neste filtro.
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((b) => {
                      const c = findClienteByDocRamo(
                        clientes,
                        b.documentoDigits,
                        b.ramo
                      );
                      const docFmt = formatDisplayDoc(b.documentoDigits);
                      const prazo =
                        b.status === "Pago"
                          ? null
                          : prazoVencimento(b.vencimento, hoje);
                      return (
                        <tr
                          key={b.id}
                          className="border-b border-slate-100 bg-white hover:bg-sky-50/40"
                        >
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {nomeClienteCell(c)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-700">
                            {docFmt}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {b.ramo}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">
                            {c?.seguradora ?? "—"}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                            {b.vencimento.split("-").reverse().join("/")}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {prazo === null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span
                                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${prazoBadgeClass(prazo)}`}
                              >
                                {prazoLabels[prazo]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <select
                              value={b.status}
                              onChange={(e) =>
                                setBoletoStatus(
                                  b.id,
                                  e.target.value as BoletoStatus
                                )
                              }
                              className="input h-9 min-w-[128px] py-1 text-sm"
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Pago">Pago</option>
                            </select>
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => abrirWhatsApp(b, c)}
                              disabled={
                                b.status === "Pago" || !c?.telefone?.trim()
                              }
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <MessageCircle className="size-5" />
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={() => editar(b)}
                                className="rounded-lg border border-amber-300/80 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-200/90"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => excluir(b.id)}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                              >
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
    </PageShell>
  );
}
