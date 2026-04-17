import { useState } from "react";
import { Lock, User, ShieldCheck, AlertCircle, UserPlus, X } from "lucide-react";

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Modal
  const [newEmail, setNewEmail] = useState("");
  const [newSenha, setNewSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [sucessoCadastro, setSucessoCadastro] = useState(false);

  const STORAGE_KEY = "@AbaSeguros:User";

  // Lógica de Autenticação
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const storedUser = localStorage.getItem(STORAGE_KEY);

    if (!storedUser) {
      setErro("Nenhum utilizador registado. Utilize o botão abaixo para criar uma conta.");
      return;
    }

    const { email, senha: savedSenha } = JSON.parse(storedUser);

    if (usuario === email && senha === savedSenha) {
      setErro("");
      onLoginSuccess(); // Navega para o painel
    } else {
      setErro("E-mail ou palavra-passe incorretos.");
    }
  };

  // Lógica de Criação no localStorage
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newSenha !== confirmSenha) {
      alert("As palavras-passe não coincidem!");
      return;
    }

    const userData = { email: newEmail, senha: newSenha };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    
    setSucessoCadastro(true);
    
    setTimeout(() => {
      setIsModalOpen(false);
      setSucessoCadastro(false);
      setNewEmail("");
      setNewSenha("");
      setConfirmSenha("");
      // Opcional: preencher automaticamente o campo de login com o novo email
      setUsuario(newEmail); 
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-sky-500 to-blue-700" />

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="rounded-xl bg-linear-to-br from-sky-500 to-blue-700 p-3 text-white mb-4 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="size-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center">Aba Seguros</h1>
            <p className="text-sm text-slate-500 mt-1">Gestão de Clientes e Seguros</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1">E-mail</label>
              <div className="relative group">
                <User className="absolute left-3 top-2.5 size-[18px] text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="utilizador@aba.com"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Palavra-passe</label>
                <a href="#" className="text-xs font-medium text-sky-600 hover:text-blue-700">Esqueci-me da senha</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-2.5 size-[18px] text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100 animate-in slide-in-from-top-1">
                <AlertCircle size={18} />
                <span className="text-sm font-medium">{erro}</span>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-3 mt-2">Entrar no Sistema</button>
            
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
              <span className="relative bg-white px-2 text-xs uppercase text-slate-400 font-medium">Primeiro acesso?</span>
            </div>

            <button 
              type="button" 
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors py-2"
            >
              <UserPlus size={18} />
              Criar Conta
            </button>
          </form>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO (Email, Senha, Confirmar Senha) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-900">Novo Registo</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              {sucessoCadastro ? (
                <div className="py-8 text-center space-y-3">
                  <div className="inline-flex items-center justify-center size-12 rounded-full bg-emerald-100 text-emerald-600">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Conta Criada!</h3>
                  <p className="text-sm text-slate-500">Dados guardados no sistema local.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                    <input type="email" className="input" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Palavra-passe</label>
                    <input type="password" className="input" value={newSenha} onChange={(e) => setNewSenha(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Confirmar Palavra-passe</label>
                    <input type="password" className="input" value={confirmSenha} onChange={(e) => setConfirmSenha(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 mt-4">Gravar Utilizador</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}