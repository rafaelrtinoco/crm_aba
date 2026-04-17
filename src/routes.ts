export type AppRoute =
  | "login"
  | "painel"
  | "clientes"
  | "financeiro"
  | "marketing"
  | "mensagens";

export const routeTitles: Record<AppRoute, string> = {
  login: "Login",
  painel: "Painel",
  clientes: "Clientes",
  financeiro: "Financeiro",
  marketing: "Marketing & relacionamento",
  mensagens: "Mensagens",
};
