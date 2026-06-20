import { useState, useCallback } from "react";

export type ToastInfo = {
  mensagem: string;
  tipo: "sucesso" | "erro";
};

export function useToast() {
  const [toast, setToast] = useState<ToastInfo | null>(null);

  const mostrarToast = useCallback((mensagem: string, tipo: "sucesso" | "erro" = "sucesso") => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, mostrarToast };
}
