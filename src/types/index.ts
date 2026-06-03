// src/types/index.ts
// Tipos centralizados — gerados a partir do novo schema do Supabase

export type StatusCadastro = "Ativo" | "Cancelado";
export type TipoCliente = "Cliente" | "Lead";

export type Cliente = {
  id: number;
  nome: string;
  documento: string;        // formatado: 000.000.000-00
  documento_digits: string; // só números
  telefone: string | null;
  email: string | null;
  tipo: TipoCliente;
  status_cadastro: StatusCadastro;
  observacoes: string | null;
  created_at: string;
};

// -------------------------------------------------------

export type StatusApolice = "Ativa" | "Cancelada" | "Suspensa" | "Em renovação";

export type Apolice = {
  id: number;
  cliente_id: number;
  seguradora: string;
  ramo: string;
  numero_apolice: string | null;
  vigencia_inicio: string | null; // ISO date "YYYY-MM-DD"
  vigencia_fim: string | null;
  premio: number | null;
  status: StatusApolice;
  observacoes: string | null;
  created_at: string;
};

// Apólice com dados do cliente já embutidos (join)
export type ApoliceComCliente = Apolice & {
  cliente: Pick<Cliente, "id" | "nome" | "documento" | "documento_digits" | "telefone" | "status_cadastro">;
};

// -------------------------------------------------------

export type StatusBoleto = "Pendente" | "Pago" | "Cancelado";

export type Boleto = {
  id: number;
  apolice_id: number;
  vencimento: string; // ISO date "YYYY-MM-DD"
  valor: number | null;
  status: StatusBoleto;
  observacoes: string | null;
  created_at: string;
};

// Boleto com join de apólice e cliente para exibição na tabela
export type BoletoCompleto = Boleto & {
  apolice: Pick<Apolice, "id" | "seguradora" | "ramo" | "numero_apolice">;
  cliente: Pick<Cliente, "id" | "nome" | "documento" | "documento_digits" | "telefone" | "status_cadastro">;
};

// -------------------------------------------------------

export type TipoTemplate = "boleto" | "marketing";

export type Template = {
  id: string;
  label: string;
  corpo: string;
  tipo: TipoTemplate;
  created_at: string;
};

// -------------------------------------------------------

export type Campanha = {
  id: number;
  nome: string;
  template_id: string | null;
  filtro_tier: string | null;
  filtro_ramo: string | null;
  filtro_status: string | null;
  total_enviados: number;
  created_at: string;
};

// -------------------------------------------------------

// Ranking de clientes para Marketing
export type TierCliente = "Ouro" | "Prata" | "Bronze" | "Sem histórico";

export type ClienteRankingRow = {
  cliente: Cliente;
  apolices: Apolice[];
  tier: TierCliente;
  score: number;
  totalBoletos: number;
  pagos: number;
};