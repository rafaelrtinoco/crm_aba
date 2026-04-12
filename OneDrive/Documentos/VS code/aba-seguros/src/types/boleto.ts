export type BoletoStatus = "Pendente" | "Pago";

export type Boleto = {
  id: number;
  /** CPF/CNPJ apenas dígitos — chave junto com `ramo` para ligar ao cliente */
  documentoDigits: string;
  ramo: string;
  /** ISO YYYY-MM-DD */
  vencimento: string;
  /** Pagamento: alterado na lista de boletos, não no cadastro inicial */
  status: BoletoStatus;
};

export type StatusCadastroCliente = "Ativo" | "Cancelado";

export type ClienteLite = {
  id: number;
  nome: string;
  documento: string;
  ramo: string;
  telefone?: string;
  seguradora?: string;
  /** Ativo = cliente atual; Cancelado = ex-cliente (relacionamento/marketing) */
  statusCadastro?: StatusCadastroCliente;
};
