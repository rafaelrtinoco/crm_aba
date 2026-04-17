import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageShell from "../components/PageShell";
import {
  loadMarketingTemplatesExtra,
  loadTemplatesBoleto,
  newMarketingTemplateId,
  saveMarketingTemplatesExtra,
  saveTemplatesBoleto,
  type MarketingTemplateExtra,
  type TemplatesBoleto,
} from "../lib/mensagensTemplates";
import { prazoLabels } from "../lib/vencimentoBoleto";

const labelsBoleto: Record<keyof TemplatesBoleto, string> = {
  vencido: "Boleto vencido (ainda pendente)",
  vence_hoje: "Boleto que vence hoje",
  a_vencer: "Boleto a vencer",
};

export default function Mensagens() {
  const [tBoleto, setTBoleto] = useState<TemplatesBoleto>(() =>
    loadTemplatesBoleto()
  );
  const [extras, setExtras] = useState<MarketingTemplateExtra[]>(() =>
    loadMarketingTemplatesExtra()
  );
  const [saved, setSaved] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoCorpo, setNovoCorpo] = useState("");

  useEffect(() => {
    setTBoleto(loadTemplatesBoleto());
    setExtras(loadMarketingTemplatesExtra());
  }, []);

  function saveAll() {
    saveTemplatesBoleto(tBoleto);
    saveMarketingTemplatesExtra(extras);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  function addExtra() {
    if (!novoNome.trim() || !novoCorpo.trim()) {
      alert("Preencha nome e texto do template.");
      return;
    }
    setExtras((list) => [
      ...list,
      { id: newMarketingTemplateId(), nome: novoNome.trim(), corpo: novoCorpo },
    ]);
    setNovoNome("");
    setNovoCorpo("");
  }

  function removeExtra(id: string) {
    if (!window.confirm("Excluir este template?")) return;
    setExtras((list) => list.filter((x) => x.id !== id));
  }

  return (
    <PageShell
      title="Mensagens"
      subtitle="Crie e mantenha templates usados no WhatsApp (Financeiro e Marketing)."
      maxWidthClassName="max-w-3xl"
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-slate-900">
          Templates WhatsApp — boletos (Financeiro)
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Usados automaticamente no Financeiro conforme o prazo. Variáveis:{" "}
          <code className="rounded bg-slate-100 px-1 text-xs">
            {"{{nome}} {{vencimento}} {{ramo}} {{documento}} {{seguradora}}"}
          </code>
          .
        </p>
      </div>

        {(Object.keys(labelsBoleto) as (keyof TemplatesBoleto)[]).map((key) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <label className="mb-2 block text-sm font-medium text-slate-800">
              {labelsBoleto[key]}
              <span className="ml-2 font-normal text-slate-500">
                ({prazoLabels[key]})
              </span>
            </label>
            <textarea
              value={tBoleto[key]}
              onChange={(e) =>
                setTBoleto((prev) => ({ ...prev, [key]: e.target.value }))
              }
              rows={4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        ))}

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md">
          <h3 className="text-base font-semibold text-slate-900">
            Templates para Marketing & relacionamento
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Aparecem na lista suspensa da aba Marketing. Variáveis:{" "}
            <code className="rounded bg-slate-100 px-1 text-xs">
              {"{{nome}} {{documento}} {{ramo}} {{seguradora}} {{classificacao}} {{vencimento}}"}
            </code>
            .
          </p>

          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            {extras.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum template extra ainda.</p>
            ) : (
              extras.map((ex) => (
                <div
                  key={ex.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <input
                      value={ex.nome}
                      onChange={(e) =>
                        setExtras((list) =>
                          list.map((x) =>
                            x.id === ex.id ? { ...x, nome: e.target.value } : x
                          )
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removeExtra(ex.id)}
                      className="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50"
                      aria-label="Excluir"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <textarea
                    value={ex.corpo}
                    onChange={(e) =>
                      setExtras((list) =>
                        list.map((x) =>
                          x.id === ex.id ? { ...x, corpo: e.target.value } : x
                        )
                      )
                    }
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                  />
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
            <p className="text-xs font-medium text-slate-600">Novo template</p>
            <input
              placeholder="Nome (ex.: Retomada pós-cancelamento)"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              className="input"
            />
            <textarea
              placeholder="Texto da mensagem…"
              value={novoCorpo}
              onChange={(e) => setNovoCorpo(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addExtra}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <Plus className="size-4" />
              Adicionar à lista
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveAll} className="btn-save">
            Salvar tudo
          </button>
          {saved ? (
            <span className="text-sm text-emerald-700">Salvo.</span>
          ) : null}
        </div>
    </PageShell>
  );
}
