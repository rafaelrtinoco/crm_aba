import type { Boleto, ClienteLite } from "../types/boleto";

export type TierCliente = "Ouro" | "Prata" | "Bronze" | "Sem histórico";

export type ClienteRankingRow = {
  cliente: ClienteLite;
  tier: TierCliente;
  score: number;
  totalBoletos: number;
  pagos: number;
  pendentesVencidos: number;
  pendentesAvencer: number;
};

function boletosDoCadastro(c: ClienteLite, boletos: Boleto[], doc: string) {
  return boletos.filter(
    (b) => b.documentoDigits === doc && b.ramo === c.ramo
  );
}

export function rankingClientesPorPagamento(
  clientes: ClienteLite[],
  boletos: Boleto[],
  hojeIso: string,
  docDigits: (doc: string) => string
): ClienteRankingRow[] {
  return clientes.map((c) => {
    const doc = docDigits(c.documento);
    const B = boletosDoCadastro(c, boletos, doc);
    if (B.length === 0) {
      return {
        cliente: c,
        tier: "Sem histórico",
        score: 0,
        totalBoletos: 0,
        pagos: 0,
        pendentesVencidos: 0,
        pendentesAvencer: 0,
      };
    }

    let score = 50;
    let pagos = 0;
    let pendentesVencidos = 0;
    let pendentesAvencer = 0;

    for (const b of B) {
      if (b.status === "Pago") {
        pagos += 1;
        score += 14;
      } else {
        if (b.vencimento < hojeIso) {
          pendentesVencidos += 1;
          score -= 22;
        } else {
          pendentesAvencer += 1;
          score += 4;
        }
      }
    }

    score = Math.max(0, Math.min(100, score));

    let tier: TierCliente;
    if (pendentesVencidos >= 1 || score < 38) tier = "Bronze";
    else if (score >= 72 && pendentesVencidos === 0) tier = "Ouro";
    else tier = "Prata";

    return {
      cliente: c,
      tier,
      score,
      totalBoletos: B.length,
      pagos,
      pendentesVencidos,
      pendentesAvencer,
    };
  });
}
