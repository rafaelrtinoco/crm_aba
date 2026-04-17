import { useEffect, useState } from "react";

import { BarChart3, TrendingUp, Wallet, Users } from "lucide-react";

import {
  loadBoletosFromStorage,
  loadClientesFromStorage,
} from "../lib/financeiroUtils";
import PageShell from "../components/PageShell";

import type { Boleto } from "../types/boleto";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Painel() {
  const [clientesN, setClientesN] = useState(0);
  const [ativosN, setAtivosN] = useState(0);
  const [boletos, setBoletos] = useState<Boleto[]>([]);

  useEffect(() => {
    const c = loadClientesFromStorage();
    setClientesN(c.length);
    setAtivosN(c.filter((x) => x.statusCadastro !== "Cancelado").length);
    setBoletos(loadBoletosFromStorage());
  }, []);

  const hoje = todayIso();

  const pendentes = boletos.filter((b) => b.status === "Pendente").length;
  const pagos = boletos.filter((b) => b.status === "Pago").length;
  const vencidosPendente = boletos.filter(
    (b) => b.status === "Pendente" && b.vencimento < hoje
  ).length;

  const kpis = [
    {
      label: "Clientes na base",
      value: String(clientesN),
      sub: `${ativosN} ativos`,
      icon: Users,
      accent: "from-sky-500 to-blue-700",
    },

    {
      label: "Boletos pendentes",
      value: String(pendentes),
      sub: "Financeiro",
      icon: Wallet,
      accent: "from-amber-500 to-orange-600",
    },

    {
      label: "Boletos pagos",
      value: String(pagos),
      sub: "Histórico positivo",
      icon: TrendingUp,
      accent: "from-emerald-500 to-teal-700",
    },

    {
      label: "Pendências vencidas",
      value: String(vencidosPendente),
      sub: "Ação sugerida",
      icon: BarChart3,
      accent: "from-rose-500 to-red-700",
    },
  ];

  return (
    <PageShell
      title="Painel"
      subtitle="Resumo operacional a partir de Clientes e Financeiro. Ajuste cadastros nas abas para ver os números evoluírem."
      actions={
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
          <p className="text-xs font-medium text-slate-500">Hoje</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      }
      maxWidthClassName="max-w-6xl"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, accent }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${accent}`}
            />

            <div className="p-5 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">
                    {value}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </div>

                <div
                  className={`rounded-xl bg-linear-to-br p-3 text-white ${accent}`}
                >
                  <Icon className="size-5" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Visão rápida</h2>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Use <strong className="text-slate-900">Financeiro</strong> para
            boletos e cobrança,{" "}
            <strong className="text-slate-900">Marketing</strong> para quadro
            por classificação e WhatsApp, e{" "}
            <strong className="text-slate-900">Mensagens</strong> para criar
            novos templates de texto.
          </p>

          <div className="mt-4 flex h-24 items-end gap-1">
            {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-linear-to-t from-sky-600/40 to-sky-400/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-500">
            Ilustração — indicadores reais virão com integrações futuras
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Próximos passos
          </h2>

          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className="text-slate-400">1.</span>
              Pendências vencidas: priorize contato (WhatsApp).
            </li>

            <li className="flex gap-2">
              <span className="text-slate-400">2.</span>
              Clientes cancelados: campanhas na aba Marketing.
            </li>

            <li className="flex gap-2">
              <span className="text-slate-400">3.</span>
              Cadastre telefones em Clientes para disparos.
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
