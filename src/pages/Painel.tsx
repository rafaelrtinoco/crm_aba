// src/pages/Painel.tsx
import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3, TrendingUp, Wallet, Users, FileText } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import PageShell from "../components/PageShell";

type MetricasPainel = {
  totalClientes: number;
  clientesAtivos: number;
  totalApolices: number;
  apolicesAtivas: number;
  boletosPendentes: number;
  boletosPagos: number;
  boletosVencidos: number;
  renovacoesProximas: number; // apólices com vigência_fim ≤ 30 dias
};

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function em30Dias() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Painel() {
  const [metricas, setMetricas] = useState<MetricasPainel | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregarMetricas() {
    setLoading(true);
    const hoje = todayIso();
    const daqui30 = em30Dias();

    const [{ data: clientes }, { data: apolices }, { data: boletos }] = await Promise.all([
      supabase.from("clientes").select("status_cadastro"),
      supabase.from("apolices").select("status, vigencia_fim"),
      supabase.from("boletos").select("status, vencimento"),
    ]);

    const m: MetricasPainel = {
      totalClientes:       clientes?.length ?? 0,
      clientesAtivos:      clientes?.filter((c) => c.status_cadastro === "Ativo").length ?? 0,
      totalApolices:       apolices?.length ?? 0,
      apolicesAtivas:      apolices?.filter((a) => a.status === "Ativa").length ?? 0,
      boletosPendentes:    boletos?.filter((b) => b.status === "Pendente").length ?? 0,
      boletosPagos:        boletos?.filter((b) => b.status === "Pago").length ?? 0,
      boletosVencidos:     boletos?.filter((b) => b.status === "Pendente" && b.vencimento < hoje).length ?? 0,
      renovacoesProximas:  apolices?.filter((a) => a.status === "Ativa" && a.vigencia_fim && a.vigencia_fim >= hoje && a.vigencia_fim <= daqui30).length ?? 0,
    };

    setMetricas(m);
    setLoading(false);
  }

  useEffect(() => { carregarMetricas(); }, []);

  const val = (n: number | undefined) => (loading ? "..." : String(n ?? 0));

  const kpis = [
    {
      label: "Clientes na base",
      value: val(metricas?.totalClientes),
      sub: loading ? "—" : `${metricas?.clientesAtivos} ativos`,
      icon: Users,
      accent: "from-sky-500 to-blue-700",
    },
    {
      label: "Apólices ativas",
      value: val(metricas?.apolicesAtivas),
      sub: loading ? "—" : `${metricas?.totalApolices} no total`,
      icon: FileText,
      accent: "from-violet-500 to-purple-700",
    },
    {
      label: "Boletos pendentes",
      value: val(metricas?.boletosPendentes),
      sub: "A receber",
      icon: Wallet,
      accent: "from-amber-500 to-orange-600",
    },
    {
      label: "Boletos pagos",
      value: val(metricas?.boletosPagos),
      sub: "Histórico positivo",
      icon: TrendingUp,
      accent: "from-emerald-500 to-teal-700",
    },
    {
      label: "Pendências vencidas",
      value: val(metricas?.boletosVencidos),
      sub: "Ação urgente",
      icon: BarChart3,
      accent: "from-rose-500 to-red-700",
    },
    {
      label: "Renovações em 30 dias",
      value: val(metricas?.renovacoesProximas),
      sub: "Apólices a vencer",
      icon: AlertTriangle,
      accent: "from-amber-400 to-yellow-600",
    },
  ];

  return (
    <PageShell
      title="Painel"
      subtitle="Resumo operacional da corretora. Clientes, apólices, financeiro e renovações em um só lugar."
      maxWidthClassName="max-w-6xl"
      actions={
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
          <p className="text-xs font-medium text-slate-500">Hoje</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
      }
    >
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ label, value, sub, icon: Icon, accent }) => (
          <div key={label} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${accent}`} />
            <div className="p-5 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </div>
                <div className={`rounded-xl bg-linear-to-br p-3 text-white ${accent}`}>
                  <Icon className="size-5" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas + Próximos passos */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Como usar o sistema</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { titulo: "Clientes", desc: "Cadastre o cliente e adicione uma ou mais apólices (ramo, seguradora, vigência) diretamente na linha da tabela." },
              { titulo: "Financeiro", desc: "Crie boletos vinculados a uma apólice. Use o WhatsApp automático conforme o prazo de vencimento." },
              { titulo: "Marketing", desc: "Clientes classificados por histórico de pagamentos (Ouro, Prata, Bronze). Envie mensagens segmentadas." },
              { titulo: "Mensagens", desc: "Crie e gerencie campanhas: escolha público por classificação, ramo ou status e dispare para o grupo." },
            ].map((item) => (
              <div key={item.titulo} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-700">{item.titulo}</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Próximas ações</h2>
          <ul className="mt-3 space-y-3 text-sm text-slate-700">
            {!loading && (metricas?.boletosVencidos ?? 0) > 0 && (
              <li className="flex gap-2 text-rose-700">
                <span className="shrink-0 font-bold">!</span>
                {metricas!.boletosVencidos} boleto(s) vencido(s) pendente(s). Acione o WhatsApp no Financeiro.
              </li>
            )}
            {!loading && (metricas?.renovacoesProximas ?? 0) > 0 && (
              <li className="flex gap-2 text-amber-700">
                <span className="shrink-0 font-bold">!</span>
                {metricas!.renovacoesProximas} apólice(s) vence(m) em 30 dias. Verifique em Clientes.
              </li>
            )}
            <li className="flex gap-2 text-slate-600">
              <span className="text-slate-400">1.</span> Clientes sem telefone não recebem WhatsApp — complete o cadastro.
            </li>
            <li className="flex gap-2 text-slate-600">
              <span className="text-slate-400">2.</span> Use Marketing para identificar clientes Ouro e fortalecer o relacionamento.
            </li>
            <li className="flex gap-2 text-slate-600">
              <span className="text-slate-400">3.</span> Crie campanhas de renovação em Mensagens antes das vigências vencerem.
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}