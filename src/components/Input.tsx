import React, { forwardRef } from "react";

type InputProps = {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      id,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId =
      id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    const fieldBase =
      "flex items-center w-full rounded-xl border bg-white transition-colors duration-150 shadow-sm";

    const fieldState = error
      ? "border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/10"
      : "border-slate-200 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/10";

    const fieldDisabled = disabled
      ? "bg-gray-50 border-gray-200 cursor-not-allowed"
      : "";

    const inputBase = [
      "flex-1 min-w-0 bg-transparent outline-none",
      "px-4 py-3",
      "text-sm text-gray-900",
      "placeholder:text-gray-400",
      "disabled:text-gray-400 disabled:cursor-not-allowed",
    ].join(" ");

    return (
      <div className="flex flex-col gap-2 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-slate-700 select-none"
          >
            {label}
          </label>
        )}

        <div
          className={[fieldBase, fieldState, fieldDisabled]
            .filter(Boolean)
            .join(" ")}
        >
          {leftIcon && (
            <span className="pl-3.5 text-slate-400 flex items-center shrink-0">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={[inputBase, className].filter(Boolean).join(" ")}
            {...props}
          />

          {rightIcon && (
            <span className="pr-3.5 text-slate-400 flex items-center shrink-0">
              {rightIcon}
            </span>
          )}
        </div>

        {(error || hint) && (
          <span
            className={`text-xs ${error ? "text-red-600" : "text-slate-500"}`}
          >
            {error ?? hint}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;