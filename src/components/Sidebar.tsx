import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  MessageSquareText,
  Users,
  Wallet,
} from "lucide-react";
import type { AppRoute } from "../routes";

type Props = {
  collapsed: boolean;
  current: AppRoute;
  onToggleCollapsed: () => void;
  onNavigate: (route: AppRoute) => void;
};

const items: { route: AppRoute; label: string; icon: typeof BarChart3 }[] = [
  { route: "painel", label: "Painel", icon: BarChart3 },
  { route: "clientes", label: "Clientes", icon: Users },
  { route: "financeiro", label: "Financeiro", icon: Wallet },
  { route: "marketing", label: "Marketing & relacionamento", icon: HeartHandshake },
  { route: "mensagens", label: "Mensagens", icon: MessageSquareText },
];

export default function Sidebar({
  collapsed,
  current,
  onToggleCollapsed,
  onNavigate,
}: Props) {
  return (
    <aside
      translate="no"
      className={[
        "h-screen shrink-0 flex flex-col border-r border-slate-800/80",
        "bg-[#0b1220] text-slate-200 transition-[width] duration-200 ease-out",
        collapsed ? "w-17" : "w-60",
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-col gap-1 border-b border-slate-700/60",
          collapsed ? "p-2 pt-3" : "p-4 pt-5",
        ].join(" ")}
      >
        {!collapsed ? (
          <div className="px-1 pb-3">
            <h1 className="text-lg font-bold tracking-wide text-sky-300">
              ABA SEGUROS
            </h1>
            <p className="mt-1 text-xs text-slate-400 leading-snug">
              Painel inteligente
            </p>
          </div>
        ) : (
          <div
            className="mx-auto mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/20 text-xs font-bold text-sky-300"
            aria-hidden
          >
            ABA
            
          </div>
          
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={[
            "flex items-center gap-2 rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors",
            collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2",
          ].join(" ")}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {!collapsed && <span className="text-xs font-medium">Recolher</span>}
          {collapsed ? (
            <ChevronRight className="size-5 shrink-0" strokeWidth={2} />
          ) : (
            <ChevronLeft className="size-5 shrink-0" strokeWidth={2} />
          )}
        </button>
      </div>

      <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
        {items.map(({ route, label, icon: Icon }) => {
          const active = current === route;
          return (
            <button
              key={route}
              type="button"
              onClick={() => onNavigate(route)}
              title={collapsed ? label : undefined}
              className={[
                "flex items-center gap-3 rounded-lg text-left transition-colors",
                collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                active
                  ? "bg-sky-600/25 text-sky-200 ring-1 ring-sky-500/40"
                  : "text-slate-400 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              <Icon className="size-4.5 shrink-0" strokeWidth={2} />
              {!collapsed && (
                <span className="text-sm font-medium leading-tight">{label}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}