import { X, AlertCircle, CheckCircle2, Info } from "lucide-react";

export type ModalType = "error" | "success" | "info";

interface NotificationModalProps {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  onClose: () => void;
}

export default function NotificationModal({
  isOpen,
  type,
  title,
  message,
  onClose,
}: NotificationModalProps) {
  if (!isOpen) return null;

  // Configuração dinâmica de cores e ícones conforme o tipo
  const configs = {
    error: {
      bgIcon: "bg-rose-100 text-rose-600",
      icon: AlertCircle,
      accentBar: "bg-rose-500",
      btnClass: "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/20",
    },
    success: {
      bgIcon: "bg-emerald-100 text-emerald-600",
      icon: CheckCircle2,
      accentBar: "bg-emerald-500",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/20",
    },
    info: {
      bgIcon: "bg-sky-100 text-sky-600",
      icon: Info,
      accentBar: "bg-sky-500",
      btnClass: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500/20",
    },
  };

  const current = configs[type];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      {/* Container do Modal */}
      <div className="w-full max-w-md relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Barra de destaque superior */}
        <div className={`absolute inset-x-0 top-0 h-1.5 ${current.accentBar}`} />

        <div className="p-6">
          {/* Cabeçalho / Botão Fechar */}
          <div className="absolute right-4 top-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Corpo do Modal */}
          <div className="flex flex-col items-center text-center mt-2">
            <div className={`rounded-full p-3 mb-4 shadow-xs ${current.bgIcon}`}>
              <IconComponent className="size-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            
            <p className="mt-2 text-sm leading-relaxed text-slate-500 whitespace-pre-wrap">
              {message}
            </p>
          </div>

          {/* Ação Única (Fechar/Ok) */}
          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-xs outline-hidden focus:ring-4 transition-all duration-150 ${current.btnClass}`}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}