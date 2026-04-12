/** Situação do calendário em relação a hoje (para boletos ainda pendentes). */
export type PrazoVencimento = "vencido" | "vence_hoje" | "a_vencer";

export function todayIsoBr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Compara apenas strings ISO AAAA-MM-DD (mesmo fuso local). */
export function prazoVencimento(
  vencimentoIso: string,
  hojeIso: string
): PrazoVencimento {
  if (vencimentoIso < hojeIso) return "vencido";
  if (vencimentoIso === hojeIso) return "vence_hoje";
  return "a_vencer";
}

export const prazoLabels: Record<PrazoVencimento, string> = {
  vencido: "Vencido",
  vence_hoje: "Vence hoje",
  a_vencer: "A vencer",
};
