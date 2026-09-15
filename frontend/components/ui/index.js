import * as React from "react";

/**
 * Minimal implementation of the "Infotact" component library referenced
 * in backend/src/codegen/designSystem.js. This is what generated
 * components are allowed to import (via DynamicRenderer's `UI` scope).
 * Swap these for your real design-system components.
 */

export function Card({ children, className = "" }) {
  return <div className={`rounded-xl shadow-sm border border-slate-200 bg-white ${className}`}>{children}</div>;
}
export function CardHeader({ children }) {
  return <div className="p-4 border-b border-slate-200 font-semibold text-slate-900">{children}</div>;
}
export function CardBody({ children }) {
  return <div className="p-4">{children}</div>;
}
export function CardFooter({ children }) {
  return <div className="p-4 border-t border-slate-200 flex gap-2 justify-end">{children}</div>;
}

export function Field({ label, required, helpText, error, children }) {
  return (
    <label className="block mb-4">
      <span className="text-sm font-medium text-slate-900">
        {label}
        {required && <span className="text-indigo-600"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {helpText && !error && <p className="text-sm text-slate-500 mt-1">{helpText}</p>}
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </label>
  );
}

export function Input({ type = "text", name, value, onChange, placeholder }) {
  return (
    <input
      type={type}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={placeholder || name}
      className="w-full rounded-xl border border-slate-200 p-2 text-base text-slate-900 focus:outline-none focus:ring-2 ring-indigo-500"
    />
  );
}

export function Select({ name, value, onChange, options = [] }) {
  return (
    <select
      name={name}
      value={value ?? ""}
      onChange={onChange}
      aria-label={name}
      className="w-full rounded-xl border border-slate-200 p-2 text-base text-slate-900 focus:outline-none focus:ring-2 ring-indigo-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function Button({ variant = "primary", onClick, children }) {
  const styles = {
    primary: "bg-indigo-600 text-white",
    secondary: "bg-slate-50 text-slate-900 border border-slate-200",
    ghost: "bg-white text-indigo-600",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 p-2 text-base font-medium ${styles[variant] || styles.primary}`}
    >
      {children}
    </button>
  );
}

export function StepIndicator({ step, total }) {
  return (
    <div className="flex gap-2 mb-4" role="progressbar" aria-valuenow={step} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-xl ${i < step ? "bg-indigo-600" : "bg-slate-50"}`}
        />
      ))}
    </div>
  );
}

export function Banner({ variant = "info", children }) {
  const styles = {
    info: "bg-slate-50 text-slate-900",
    warning: "bg-amber-50 text-amber-900",
    success: "bg-green-50 text-green-900",
  };
  return <div className={`rounded-xl p-4 text-sm ${styles[variant] || styles.info}`}>{children}</div>;
}
