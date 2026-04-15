/** Valores iguais aos salvos em Clientes (campo `ramo`). */
export const RAMOS_SEGURO = [
  { value: "Auto", label: "Auto" },
  { value: "Vida", label: "Vida" },
  { value: "Residencial", label: "Residencial" },
  { value: "Empresarial", label: "Empresarial" },
  { value: "Consorcio", label: "Consórcio" },
  { value: "Bike", label: "Bike" },
  { value: "Condomínio", label: "Condomínio" },
  { value: "Celular", label: "Celular" },
  { value: "Eqp. Portateis", label: "Equipamentos Portáteis" },
  { value: "Responsabilidade Civil", label: "Responsabilidade Civil" },
  { value: "Viagens", label: "Viagens" },
  { value: "Saúde", label: "Saúde" },
] as const;

export type RamoSeguro = (typeof RAMOS_SEGURO)[number]["value"];

export function normalizeRamoImport(raw: string): string | null {
  const t = raw.trim();
  const byValue = RAMOS_SEGURO.find((r) => r.value === t);
  if (byValue) return byValue.value;
  const byLabel = RAMOS_SEGURO.find(
    (r) => r.label.toLowerCase() === t.toLowerCase()
  );
  return byLabel ? byLabel.value : null;
}
