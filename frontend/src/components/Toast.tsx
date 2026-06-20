import type { ToastInfo } from "../hooks/useToast";

type ToastProps = {
  toast: ToastInfo | null;
};

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      className={`fixed right-6 top-6 z-50 rounded-xl px-5 py-3 font-semibold text-white shadow-lg transition-all ${
        toast.tipo === "sucesso" ? "bg-green-600" : "bg-red-600"
      }`}
    >
      {toast.mensagem}
    </div>
  );
}
