import * as XLSX from "xlsx";

export async function readFirstSheetAsRows(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const name = wb.SheetNames[0];
  if (!name) return [];
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(
    sheet,
    { header: 1, defval: "", raw: false }
  );
  return data.map((row) =>
    (Array.isArray(row) ? row : []).map((c) => String(c ?? "").trim())
  );
}

export function downloadBoletoTemplateXlsx() {
  const ws = XLSX.utils.aoa_to_sheet([
    ["documento", "ramo", "vencimento", "status"],
    ["12345678901", "Auto", "2026-12-31", "Pendente"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Boletos");
  XLSX.writeFile(wb, "modelo_boletos.xlsx");
}
