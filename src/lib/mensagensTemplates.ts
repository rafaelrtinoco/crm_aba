import type { PrazoVencimento } from "./vencimentoBoleto";

export const MENSAGENS_STORAGE_KEY = "mensagens_templates_boleto";
export const MARKETING_TEMPLATES_LIST_KEY = "mensagens_marketing_templates";

export type TemplateBoletoKey = PrazoVencimento;

export type TemplatesBoleto = Record<TemplateBoletoKey, string>;

export type MarketingTemplateExtra = {
  id: string;
  nome: string;
  corpo: string;
};

export type SelectableTemplate = {
  id: string;
  label: string;
  corpo: string;
};

const defaults: TemplatesBoleto = {
  vencido:
    "Olá {{nome}}, identificamos o boleto com vencimento em {{vencimento}} ({{ramo}}) ainda em aberto. Podemos ajudar no pagamento?",
  vence_hoje:
    "Olá {{nome}}, hoje vence seu boleto ({{ramo}}, venc. {{vencimento}}). Qualquer dúvida, fale comigo.",
  a_vencer:
    "Olá {{nome}}, lembrete: seu boleto ({{ramo}}) vence em {{vencimento}}. Conte conosco se precisar.",
};

export function loadTemplatesBoleto(): TemplatesBoleto {
  try {
    const raw = localStorage.getItem(MENSAGENS_STORAGE_KEY);
    if (!raw) return { ...defaults };
    const p = JSON.parse(raw) as Partial<TemplatesBoleto>;
    return {
      vencido: typeof p.vencido === "string" ? p.vencido : defaults.vencido,
      vence_hoje:
        typeof p.vence_hoje === "string" ? p.vence_hoje : defaults.vence_hoje,
      a_vencer:
        typeof p.a_vencer === "string" ? p.a_vencer : defaults.a_vencer,
    };
  } catch {
    return { ...defaults };
  }
}

export function saveTemplatesBoleto(t: TemplatesBoleto) {
  localStorage.setItem(MENSAGENS_STORAGE_KEY, JSON.stringify(t));
}

export function loadMarketingTemplatesExtra(): MarketingTemplateExtra[] {
  try {
    const raw = localStorage.getItem(MARKETING_TEMPLATES_LIST_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as MarketingTemplateExtra[];
    if (!Array.isArray(p)) return [];
    return p.filter(
      (x) =>
        x &&
        typeof x.id === "string" &&
        typeof x.nome === "string" &&
        typeof x.corpo === "string"
    );
  } catch {
    return [];
  }
}

export function saveMarketingTemplatesExtra(list: MarketingTemplateExtra[]) {
  localStorage.setItem(MARKETING_TEMPLATES_LIST_KEY, JSON.stringify(list));
}

/** Opções para listas (Marketing e, se quiser, outros fluxos). Inclui templates de boleto + extras. */
export function getSelectableTemplates(): SelectableTemplate[] {
  const b = loadTemplatesBoleto();
  const extra = loadMarketingTemplatesExtra();
  return [
    {
      id: "__boleto_vencido__",
      label: "[Boleto] Vencido (pendente)",
      corpo: b.vencido,
    },
    {
      id: "__boleto_vence_hoje__",
      label: "[Boleto] Vence hoje",
      corpo: b.vence_hoje,
    },
    {
      id: "__boleto_a_vencer__",
      label: "[Boleto] A vencer",
      corpo: b.a_vencer,
    },
    ...extra.map((e) => ({ id: e.id, label: e.nome, corpo: e.corpo })),
  ];
}

export function newMarketingTemplateId(): string {
  return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function applyTemplatePlaceholders(
  template: string,
  vars: {
    nome: string;
    vencimento: string;
    ramo: string;
    documento: string;
    seguradora?: string;
    classificacao?: string;
  }
): string {
  let s = template
    .replace(/\{\{nome\}\}/g, vars.nome)
    .replace(/\{\{vencimento\}\}/g, vars.vencimento)
    .replace(/\{\{ramo\}\}/g, vars.ramo)
    .replace(/\{\{documento\}\}/g, vars.documento);
  s = s.replace(/\{\{seguradora\}\}/g, vars.seguradora ?? "");
  s = s.replace(/\{\{classificacao\}\}/g, vars.classificacao ?? "");
  return s;
}

export function digitsToWhatsAppBr(telefone: string): string | null {
  let d = telefone.replace(/\D/g, "");
  if (d.length === 11 || d.length === 10) d = "55" + d;
  if (d.length >= 12 && d.startsWith("55")) return d;
  return null;
}
