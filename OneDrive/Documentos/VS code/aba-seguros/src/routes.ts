export type AppRoute =
  | "painel"
  | "clientes"
  | "financeiro"
  | "marketing"
  | "mensagens";

export const routeTitles: Record<AppRoute, string> = {
  painel: "Painel",
  clientes: "Clientes",
  financeiro: "Financeiro",
  marketing: "Marketing & relacionamento",
  mensagens: "Mensagens",
};
