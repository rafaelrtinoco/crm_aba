import { useState, useEffect } from "react";
import { RAMOS_SEGURO } from "../data/ramosSeguro";
import { CLIENTES_STORAGE_KEY } from "../lib/financeiroUtils";
import { DOC_MAX_DIGITS, formatDocumento } from "../lib/documentoFormat";
import Input from "../components/Input";
import PageShell from "../components/PageShell";

type StatusCadastro = "Ativo" | "Cancelado";

type Cliente = {
  id: number;
  nome: string;
  documento: string;
  ramo: string;
  telefone: string;
  seguradora: string;
  apolice: string;
  tipo: "Cliente" | "Lead";
  statusCadastro: StatusCadastro;
};

const FONE_MAX_DIGITS = 11;

function formatTelefone(digits: string): string {
  const d = digits.slice(0, FONE_MAX_DIGITS);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    const rest = d.slice(2);
    return `(${d.slice(0, 2)}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function normalizeTipo(raw: unknown): "Cliente" | "Lead" {
  const v = String(raw ?? "").trim();
  const lower = v.toLowerCase();
  if (
    /^lead$/i.test(v) ||
    v === "Leads" ||
    v === "Pistas" ||
    lower === "liderar"
  ) {
    return "Lead";
  }
  return "Cliente";
}

function labelTipo(t: "Cliente" | "Lead"): string {
  return t === "Lead" ? "Lead" : "Cliente";
}

type SelectFieldProps = {
  label: string;
  error?: string;
  hint?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

function SelectField({
  label,
  error,
  hint,
  id,
  className = "",
  disabled,
  children,
  ...props
}: SelectFieldProps) {
  const selectId =
    id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const fieldBase =
    "flex items-center w-full rounded-xl border bg-white transition-colors duration-150 shadow-sm";

  const fieldState = error
    ? "border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10"
    : "border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/10";

  const fieldDisabled = disabled
    ? "bg-gray-50 border-gray-200 cursor-not-allowed"
    : "";

  const selectBase = [
    "w-full bg-transparent outline-none",
    "px-4 py-3",
    "text-sm text-gray-900",
    "disabled:text-gray-400 disabled:cursor-not-allowed",
  ].join(" ");

  return (
    <div className="flex flex-col gap-2 w-full">
      <label
        htmlFor={selectId}
        className="text-sm font-semibold text-slate-700 select-none"
      >
        {label}
      </label>

      <div
        className={[fieldBase, fieldState, fieldDisabled].filter(Boolean).join(" ")}
      >
        <select
          id={selectId}
          disabled={disabled}
          className={[selectBase, className].filter(Boolean).join(" ")}
          {...props}
        >
          {children}
        </select>
      </div>

      {(error || hint) && (
        <span className={`text-xs ${error ? "text-red-600" : "text-slate-500"}`}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

function readClientesFromStorage(): Cliente[] {
  try {
    const dados = localStorage.getItem(CLIENTES_STORAGE_KEY);
    if (!dados) return [];
    const parsed = JSON.parse(dados) as Cliente[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c) => ({
      ...c,
      tipo: normalizeTipo(c.tipo),
      statusCadastro:
        String((c as Cliente).statusCadastro ?? "")
          .toLowerCase()
          .trim() === "cancelado"
          ? "Cancelado"
          : "Ativo",
    }));
  } catch {
    return [];
  }
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>(() =>
    readClientesFromStorage()
  );
  const [busca, setBusca] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);

  const [form, setForm] = useState({
    nome: "",
    documento: "",
    ramo: "Auto",
    telefone: "",
    seguradora: "Porto Seguro",
    apolice: "",
    tipo: "Cliente" as "Cliente" | "Lead",
    statusCadastro: "Ativo" as StatusCadastro,
  });

  useEffect(() => {
    localStorage.setItem(CLIENTES_STORAGE_KEY, JSON.stringify(clientes));
  }, [clientes]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    let { name, value } = e.target;

    if (name === "documento") {
      const digits = value.replace(/\D/g, "").slice(0, DOC_MAX_DIGITS);
      value = formatDocumento(digits);
    }

    if (name === "telefone") {
      const digits = value.replace(/\D/g, "").slice(0, FONE_MAX_DIGITS);
      value = formatTelefone(digits);
    }

    if (name === "apolice") {
      value = value.replace(/\D/g, "");
    }

    setForm({ ...form, [name]: value });
  }

  function salvarCliente() {
    if (!form.nome || !form.documento) {
      alert("Preencha Nome e CPF/CNPJ");
      return;
    }

    const docDigits = form.documento.replace(/\D/g, "");
    if (docDigits.length !== 11 && docDigits.length !== 14) {
      alert("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos.");
      return;
    }

    if (form.telefone) {
      const telDigits = form.telefone.replace(/\D/g, "");
      if (telDigits.length !== 10 && telDigits.length !== 11) {
        alert(
          "Telefone: informe DDD + número (10 dígitos fixo ou 11 celular)."
        );
        return;
      }
    }

    if (editandoId) {
      const atualizados = clientes.map((c) =>
        c.id === editandoId ? { ...c, ...form } : c
      );
      setClientes(atualizados);
      setEditandoId(null);
    } else {
      const novo = {
        id: Date.now(),
        ...form,
      };
      setClientes([...clientes, novo]);
    }

    setForm({
      nome: "",
      documento: "",
      ramo: "Auto",
      telefone: "",
      seguradora: "Porto Seguro",
      apolice: "",
      tipo: "Cliente",
      statusCadastro: "Ativo",
    });
  }

  function editarCliente(cliente: Cliente) {
    setForm({
      ...cliente,
      tipo: normalizeTipo(cliente.tipo),
      statusCadastro:
        cliente.statusCadastro === "Cancelado" ? "Cancelado" : "Ativo",
    });
    setEditandoId(cliente.id);
  }

  function excluirCliente(id: number) {
    if (!window.confirm("Deseja excluir este cliente?")) return;
    setClientes(clientes.filter((c) => c.id !== id));
  }

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.documento.includes(busca)
  );

  return (
    <PageShell
      title="Clientes"
      subtitle="Cadastre, filtre e gerencie sua base com um layout mais limpo."
      actions={
        <div className="w-full sm:w-[26rem]">
          <Input
            type="search"
            label="Buscar"
            aria-label="Buscar clientes"
            placeholder="Nome ou CPF/CNPJ…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      }
    >

        <section className="rounded-4xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Novo cadastro
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Use <strong>Cancelado</strong> para ex-clientes que ainda entram
              em campanhas (Marketing). Boletos podem continuar vinculados; no
              Financeiro aparecem como cancelados.
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="sm:col-span-2 xl:col-span-2">
                <Input
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  label="Nome do cliente"
                  placeholder="Ex.: Maria Silva"
                  autoComplete="name"
                />
              </div>

              <Input
                name="documento"
                value={form.documento}
                onChange={handleChange}
                label="CPF / CNPJ"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                maxLength={18}
                inputMode="numeric"
                autoComplete="off"
              />

              <Input
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                label="Telefone"
                placeholder="(00) 00000-0000"
                maxLength={15}
                inputMode="numeric"
                autoComplete="tel"
              />

              <SelectField
                name="ramo"
                value={form.ramo}
                onChange={handleChange}
                label="Ramo"
              >
                {RAMOS_SEGURO.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectField>

              <SelectField
                name="seguradora"
                value={form.seguradora}
                onChange={handleChange}
                label="Seguradora"
              >
                <option>Porto Seguro</option>
                <option>Bradesco</option>
                <option>Allianz</option>
                <option>SulAmérica</option>
                <option>Tokio Marine</option>
                <option>Mapfre</option>
                <option>Zurich</option>
                <option>Generali</option>
                <option>Liberty Seguros</option>
                <option>Suhai Seguros</option>
                <option>Azul Seguros</option>
                <option>Mitsui Seguros</option>
                <option>Itaú Seguros</option>
                <option>Yellow Seguros</option>
                <option>HDI Seguros</option>
                <option>Acaad Seguros</option>
                <option>Pier Seguros</option>
                <option>Junto Seguros</option>
                <option>Ezze Seguros</option>
              </SelectField>

              <Input
                name="apolice"
                value={form.apolice}
                onChange={handleChange}
                label="Apólice"
                placeholder="Somente números"
                inputMode="numeric"
                autoComplete="off"
              />

              <SelectField
                name="tipo"
                value={form.tipo}
                onChange={handleChange}
                label="Tipo"
              >
                <option value="Cliente">Cliente</option>
                <option value="Lead">Lead</option>
              </SelectField>

              <SelectField
                name="statusCadastro"
                value={form.statusCadastro}
                onChange={handleChange}
                label="Status"
              >
                <option value="Ativo">Ativo na base</option>
                <option value="Cancelado">Cancelado (relacionamento)</option>
              </SelectField>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              {editandoId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditandoId(null);
                    setForm({
                      nome: "",
                      documento: "",
                      ramo: "Auto",
                      telefone: "",
                      seguradora: "Porto Seguro",
                      apolice: "",
                      tipo: "Cliente",
                      statusCadastro: "Ativo",
                    });
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar edição
                </button>
              )}

              <button
                type="button"
                onClick={salvarCliente}
                className="btn-save w-full sm:w-auto"
              >
                {editandoId ? "Atualizar Cliente" : "Salvar Cliente"}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-md shadow-slate-200/50 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/90 px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">
              Clientes cadastrados
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Lista alinhada por colunas; arraste horizontalmente se a tabela
              for larga.
            </p>
          </div>
          <div className="p-4 sm:p-6">
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/30">
              <table className="min-w-[960px] w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100/95 text-left text-slate-700 border-b border-slate-200">
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap min-w-[140px]">
                      Nome
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      CPF / CNPJ
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Telefone
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Ramo
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap min-w-[120px]">
                      Seguradora
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Apólice
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Tipo
                    </th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right whitespace-nowrap w-[1%]">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-3 py-8 text-center text-slate-500"
                      >
                        Nenhum cliente encontrado.
                      </td>
                    </tr>
                  ) : (
                    clientesFiltrados.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-100 bg-white hover:bg-sky-50/40 transition-colors"
                      >
                        <td className="px-3 py-2.5 font-medium text-slate-900 max-w-[220px]">
                          <span className="block truncate" title={c.nome}>
                            {c.nome}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                          {c.documento}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {c.telefone || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                          {c.ramo}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 max-w-[180px]">
                          <span className="block truncate" title={c.seguradora}>
                            {c.seguradora}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap font-mono text-xs">
                          {c.apolice || "—"}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="inline-block rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900">
                            {labelTipo(normalizeTipo(c.tipo))}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {c.statusCadastro === "Cancelado" ? (
                            <span className="inline-block rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900">
                              Cancelado
                            </span>
                          ) : (
                            <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => editarCliente(c)}
                              className="rounded-lg border border-amber-300/80 bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-200/90"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirCliente(c.id)}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
    </PageShell>
  );
}
