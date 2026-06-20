import { useEffect, useState } from "react";

export function RelogioAtual() {
  const [agora, setAgora] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="text-xl font-bold">
      {agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </p>
  );
}
