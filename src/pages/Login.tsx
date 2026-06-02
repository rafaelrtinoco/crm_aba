import { useState } from "react";
import { Lock, User, ShieldCheck, AlertCircle, UserPlus, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient"; // Cliente oficial unificado
import Logo from "/LOGO-ABA.png"

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados do Modal de Cadastro
  const [newEmail, setNewEmail] = useState("");
  const [newSenha, setNewSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [loadingModal, setLoadingModal] = useState(false);
  const [sucessoCadastro, setSucessoCadastro] = useState(false);

  // Lógica de Autenticação com Supabase Cloud
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: usuario.trim(),
      password: senha,
    });

    if (error) {
      // Tradução amigável dos erros comuns do Supabase
      if (error.message.includes("Invalid login credentials")) {
        setErro("E-mail ou palavra-passe incorretos.");
      } else {
        setErro(error.message);
      }
      setLoading(false);
      return;
    }

    setErro("");
    setLoading(false);
    onLoginSuccess(); // Navega com segurança para o painel
  };

  // Lógica de Criação de Conta Real no Supabase Auth
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newSenha !== confirmSenha) {
      alert("As palavras-passe não coincidem!");
      return;
    }

    setLoadingModal(true);

    const { error } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newSenha,
    });

    if (error) {
      alert("Erro ao criar conta: " + error.message);
      setLoadingModal(false);
      return;
    }
    
    setSucessoCadastro(true);
    setLoadingModal(false);
    
    setTimeout(() => {
      setIsModalOpen(false);
      setSucessoCadastro(false);
      setNewEmail("");
      setNewSenha("");
      setConfirmSenha("");
      setUsuario(newEmail); // Preenche automaticamente o campo de login
    }, 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-500">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-[#001f3D]" />
      <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="rounded-xl bg-linear-to-br p-3 text-white mb-4 shadow-lg shadow-blue-500/20">
              <img src={Logo} alt="Logo Aba Seguros" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center">Aba Seguros</h1>
            <p className="text-sm text-slate-500 mt-1">Gestão de Clientes e Seguros</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1">E-mail</label>
              <div className="relative group">
                <User className="absolute left-3 top-2.5 size-4.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="utilizador@aba.com"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Palavra-passe</label>
                <a href="#" className="text-xs font-medium text-blue-primary hover:text-blue-700">Esqueci-me da senha</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-2.5 size-4.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={loading}
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

            <button 
              type="submit" 
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Validando credenciais..." : "Entrar no Sistema"}
            </button>
            
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
              <span className="relative bg-white px-2 text-xs uppercase text-slate-400 font-medium">Primeiro acesso?</span>
            </div>

            <button 
              type="button" 
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors py-2"
              disabled={loading}
            >
              <UserPlus size={18} />
              Criar Conta
            </button>
          </form>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO NO BACKEND AUTH */}
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
                  <h3 className="text-lg font-semibold text-slate-900">Conta Criada com sucesso!</h3>
                  <p className="text-sm text-slate-500">Verifique a caixa de entrada para confirmar o seu e-mail.</p>
                </div>
              ) : (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">E-mail</label>
                    <input 
                      type="email" 
                      className="input" 
                      value={newEmail} 
                      onChange={(e) => setNewEmail(e.target.value)} 
                      disabled={loadingModal}
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Palavra-passe</label>
                    <input 
                      type="password" 
                      className="input" 
                      value={newSenha} 
                      onChange={(e) => setNewSenha(e.target.value)} 
                      disabled={loadingModal}
                      required 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Confirmar Palavra-passe</label>
                    <input 
                      type="password" 
                      className="input" 
                      value={confirmSenha} 
                      onChange={(e) => setConfirmSenha(e.target.value)} 
                      disabled={loadingModal}
                      required 
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn-primary w-full py-3 mt-4 disabled:opacity-50"
                    disabled={loadingModal}
                  >
                    {loadingModal ? "Registando na nuvem..." : "Gravar Utilizador"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}