import { useEffect, useState } from "react";

import { BarChart3, TrendingUp, Wallet, Users } from "lucide-react";

import { loadBoletosFromStorage, loadClientesFromStorage } from "../lib/financeiroUtils";

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

    <div className="min-h-full bg-[#0c1929] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">

      <div className="mx-auto max-w-6xl">

        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-sm font-medium uppercase tracking-widest text-sky-300/90">

              ABA Seguros

            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">

              Painel inteligente

            </h1>

            <p className="mt-2 max-w-xl text-sm text-slate-400">

              Resumo operacional a partir de Clientes e Financeiro. Ajuste

              cadastros nas abas para ver os números evoluírem.

            </p>

          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-right">

            <p className="text-xs text-slate-400">Hoje</p>

            <p className="text-lg font-semibold tabular-nums text-white">

              {new Date().toLocaleDateString("pt-BR", {

                weekday: "short",

                day: "2-digit",

                month: "short",

                year: "numeric",

              })}

            </p>

          </div>

        </header>



        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {kpis.map(({ label, value, sub, icon: Icon, accent }) => (

            <div

              key={label}

              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white shadow-xl shadow-black/20"

            >

              <div

                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`}

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

                    className={`rounded-xl bg-gradient-to-br p-3 text-white ${accent}`}

                  >

                    <Icon className="size-5" strokeWidth={2} />

                  </div>

                </div>

              </div>

            </div>

          ))}

        </div>



        <div className="mt-8 grid gap-4 lg:grid-cols-3">

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm lg:col-span-2">

            <h2 className="text-sm font-semibold text-white">

              Visão rápida

            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-400">

              Use <strong className="text-slate-200">Financeiro</strong> para

              boletos e cobrança,{" "}

              <strong className="text-slate-200">Marketing</strong> para quadro

              por classificação e WhatsApp, e{" "}

              <strong className="text-slate-200">Mensagens</strong> para criar

              novos templates de texto.

            </p>

            <div className="mt-4 flex h-24 items-end gap-1">

              {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (

                <div

                  key={i}

                  className="flex-1 rounded-t-md bg-gradient-to-t from-sky-600/40 to-sky-400/80"

                  style={{ height: `${h}%` }}

                />

              ))}

            </div>

            <p className="mt-2 text-center text-[10px] text-slate-500">

              Ilustração — indicadores reais virão com integrações futuras

            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-600/30 to-blue-900/40 p-5 text-white">

            <h2 className="text-sm font-semibold">Próximos passos</h2>

            <ul className="mt-3 space-y-2 text-sm text-sky-100/90">

              <li className="flex gap-2">

                <span className="text-sky-300">1.</span>

                Pendências vencidas: priorize contato (WhatsApp).

              </li>

              <li className="flex gap-2">

                <span className="text-sky-300">2.</span>

                Clientes cancelados: campanhas na aba Marketing.

              </li>

              <li className="flex gap-2">

                <span className="text-sky-300">3.</span>

                Cadastre telefones em Clientes para disparos.

              </li>

            </ul>

          </div>

        </div>

      </div>

    </div>

  );

}