import type {
  Boleto,
  BoletoStatus,
  ClienteLite,
  StatusCadastroCliente,
} from "../types/boleto";
import { normalizeRamoImport } from "../data/ramosSeguro";

export const BOLETOS_STORAGE_KEY = "boletos";
export const CLIENTES_STORAGE_KEY = "clientes";

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function migrateBoleto(raw: Record<string, unknown>): Boleto | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const documentoDigits = onlyDigits(String(raw.documentoDigits ?? ""));
  const ramo = String(raw.ramo ?? "").trim();
  const vencimento = String(raw.vencimento ?? "").trim();
  if (!documentoDigits || !ramo || !/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
    return null;
  }
  const status: BoletoStatus = raw.status === "Pago" ? "Pago" : "Pendente";
  return { id, documentoDigits, ramo, vencimento, status };
}

function normalizeStatusCadastro(raw: unknown): StatusCadastroCliente {
  const s = String(raw ?? "").trim().toLowerCase();
  return s === "cancelado" ? "Cancelado" : "Ativo";
}

export function normalizeClienteFromStorage(raw: unknown): ClienteLite | null {
  const c = raw as Record<string, unknown>;
  const id = Number(c.id);
  if (!Number.isFinite(id)) return null;
  const nome = String(c.nome ?? "").trim();
  if (!nome) return null;
  return {
    id,
    nome,
    documento: String(c.documento ?? ""),
    ramo: String(c.ramo ?? ""),
    telefone: c.telefone != null ? String(c.telefone) : undefined,
    seguradora: c.seguradora != null ? String(c.seguradora) : undefined,
    statusCadastro: normalizeStatusCadastro(c.statusCadastro),
  };
}

export function loadClientesFromStorage(): ClienteLite[] {
  try {
    const raw = localStorage.getItem(CLIENTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeClienteFromStorage)
      .filter((c): c is ClienteLite => c !== null);
  } catch {
    return [];
  }
}

export function loadBoletosFromStorage(): Boleto[] {
  try {
    const raw = localStorage.getItem(BOLETOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => migrateBoleto(x as Record<string, unknown>))
      .filter((b): b is Boleto => b !== null);
  } catch {
    return [];
  }
}

export function findClienteByDocRamo(
  clientes: ClienteLite[],
  documentoDigits: string,
  ramo: string
): ClienteLite | undefined {
  return clientes.find(
    (c) => onlyDigits(c.documento) === documentoDigits && c.ramo === ramo
  );
}

export function parseVencimentoToIso(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    const y = m[3];
    const iso = `${y}-${mo}-${d}`;
    const check = new Date(iso + "T12:00:00");
    if (!Number.isNaN(check.getTime())) return iso;
  }
  return null;
}

export function parseStatus(raw: string): BoletoStatus | null {
  const s = raw.trim().toLowerCase();
  if (s === "") return "Pendente";
  if (s === "pago" || s === "paga" || s === "paid") return "Pago";
  if (s === "pendente" || s === "pending") return "Pendente";
  return null;
}

/** Cabeçalhos aceitos (case-insensitive) por coluna */
const HEADER_ALIASES: Record<string, keyof RowImport> = {
  documento: "documento",
  "cpf/cnpj": "documento",
  cpf: "documento",
  cnpj: "documento",
  cpf_cnpj: "documento",
  ramo: "ramo",
  tipo_de_seguro: "ramo",
  tipodeseguro: "ramo",
  vencimento: "vencimento",
  data_vencimento: "vencimento",
  data: "vencimento",
  status: "status",
  situacao: "status",
  pagamento: "status",
};

type RowImport = {
  documento: string;
  ramo: string;
  vencimento: string;
  status: string;
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function mapHeader(cell: string): keyof RowImport | null {
  const key = normalizeHeader(cell).replace(/\s/g, "_");
  const spaced = normalizeHeader(cell);
  return HEADER_ALIASES[key] ?? HEADER_ALIASES[spaced] ?? null;
}

export type ImportRowResult =
  | { ok: true; boleto: Omit<Boleto, "id"> }
  | { ok: false; line: number; reason: string };

export function rowToBoleto(
  row: Partial<Record<keyof RowImport, string>>,
  line: number,
  clientes: ClienteLite[]
): ImportRowResult {
  const docRaw = (row.documento ?? "").trim();
  const docDigits = onlyDigits(docRaw);
  if (docDigits.length !== 11 && docDigits.length !== 14) {
    return { ok: false, line, reason: "CPF/CNPJ inválido (11 ou 14 dígitos)." };
  }

  const ramoRaw = (row.ramo ?? "").trim();
  const ramo = normalizeRamoImport(ramoRaw);
  if (!ramo) {
    return { ok: false, line, reason: `Ramo desconhecido: "${ramoRaw}".` };
  }

  if (!findClienteByDocRamo(clientes, docDigits, ramo)) {
    return {
      ok: false,
      line,
      reason: "Nenhum cliente com este CPF/CNPJ e ramo de seguro.",
    };
  }

  const vIso = parseVencimentoToIso(row.vencimento ?? "");
  if (!vIso) {
    return {
      ok: false,
      line,
      reason: "Vencimento inválido (use AAAA-MM-DD ou DD/MM/AAAA).",
    };
  }

  const stRaw = (row.status ?? "").trim();
  const st = parseStatus(stRaw);
  if (st === null) {
    return {
      ok: false,
      line,
      reason: 'Status deve ser "Pago", "Pendente" ou vazio (Pendente).',
    };
  }

  return {
    ok: true,
    boleto: {
      documentoDigits: docDigits,
      ramo,
      vencimento: vIso,
      status: st,
    },
  };
}

/** Primeira linha = cabeçalhos; demais = dados. */
export function parseTableRows(
  rows: string[][],
  clientes: ClienteLite[]
): { results: ImportRowResult[]; added: Boleto[] } {
  if (rows.length < 2) {
    return {
      results: [{ ok: false, line: 0, reason: "Arquivo sem dados." }],
      added: [],
    };
  }

  const headers = rows[0].map((c) => String(c ?? ""));
  const colIndex: Partial<Record<keyof RowImport, number>> = {};
  headers.forEach((h, i) => {
    const mapped = mapHeader(h);
    if (mapped) colIndex[mapped] = i;
  });

  const required: (keyof RowImport)[] = ["documento", "ramo", "vencimento"];
  for (const k of required) {
    if (colIndex[k] === undefined) {
      return {
        results: [
          {
            ok: false,
            line: 1,
            reason: `Cabeçalho obrigatório ausente: ${k}. Use o modelo exportado.`,
          },
        ],
        added: [],
      };
    }
  }

  const results: ImportRowResult[] = [];
  const added: Boleto[] = [];
  let seq = 0;

  for (let r = 1; r < rows.length; r++) {
    const line = r + 1;
    const cells = rows[r] ?? [];
    if (cells.every((c) => String(c ?? "").trim() === "")) continue;

    const row: Partial<Record<keyof RowImport, string>> = {};
    for (const k of required) {
      const idx = colIndex[k]!;
      row[k] = String(cells[idx] ?? "").trim();
    }
    if (colIndex.status !== undefined) {
      row.status = String(cells[colIndex.status] ?? "").trim();
    } else {
      row.status = "";
    }

    const res = rowToBoleto(row, line, clientes);
    results.push(res);
    if (res.ok) {
      seq += 1;
      added.push({
        id: Date.now() + seq,
        ...res.boleto,
      });
    }
  }

  if (added.length === 0 && results.length === 0) {
    results.push({ ok: false, line: 0, reason: "Nenhuma linha de dados." });
  }

  return { results, added };
}

export const BOLETO_TEMPLATE_CSV = [
  "documento;ramo;vencimento;status",
  "12345678901;Auto;2026-12-31;Pendente",
].join("\n");

export function parseDelimitedText(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines.map((line) => {
    const sep = line.includes(";") ? ";" : ",";
    return line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  });
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
