import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import MarketingRelacionamento from "./pages/MarketingRelacionamento";
import Mensagens from "./pages/Mensagens";
import Painel from "./pages/Painel";
import Login from "./pages/Login";
import type { AppRoute } from "./routes";
import { routeTitles } from "./routes";
import { Menu } from "lucide-react";

function App() {
  const [route, setRoute] = useState<AppRoute>("login");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  function navigate(next: AppRoute) {
    setRoute(next);
    // Fecha a sidebar ao navegar em telas menores, se desejar
    if (window.innerWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }

  // 1. Verificamos se estamos na rota de login
  const isLoginPage = route === "login";

  // 2. Se for Login, renderizamos apenas o componente sem a estrutura de Sidebar/Header
  if (isLoginPage) {
    return <Login onLoginSuccess={() => setRoute("painel")} />;
  }

  // 3. Se não for Login, renderizamos a estrutura completa do sistema
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        current={route}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        onNavigate={navigate}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          translate="no"
          className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/90 bg-white/95 px-4 shadow-sm backdrop-blur supports-backdrop-filter:bg-white/80"
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Alternar menu lateral"
            title="Alternar menu lateral"
          >
            <Menu className="size-5" />
          </button>
          
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              ABA Seguros
            </p>
            <h2 className="truncate text-lg font-semibold text-slate-900 leading-tight">
              {routeTitles[route]}
            </h2>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto">
          {/* O Login já foi tratado no if acima, mas mantemos as outras rotas aqui */}
          {route === "painel" && <Painel />}
          {route === "clientes" && <Clientes />}
          {route === "financeiro" && <Financeiro />}
          {route === "marketing" && <MarketingRelacionamento />}
          {route === "mensagens" && <Mensagens />}
        </main>
      </div>
    </div>
  );
}

export default App;