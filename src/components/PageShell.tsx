import type { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
};

export default function PageShell({
  title,
  subtitle,
  actions,
  children,
  maxWidthClassName = "max-w-[1400px]",
}: Props) {
  return (
    <div
      translate="no"
      className="min-h-full bg-linear-to-b from-slate-50 to-slate-100/60 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <div className={`mx-auto ${maxWidthClassName} space-y-6`}>
        {(title || subtitle || actions) && (
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              {title && (
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <div className="mt-1 text-sm leading-relaxed text-slate-600">
                  {subtitle}
                </div>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </header>
        )}

        {children}
      </div>
    </div>
  );
}

