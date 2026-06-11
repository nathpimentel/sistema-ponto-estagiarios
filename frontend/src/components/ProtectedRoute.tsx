import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

type ProtectedRouteProps = {
  children: ReactNode;
  adminOnly?: boolean;
  alunoOnly?: boolean;
};

type Usuario = {
  id: number;
  nome: string;
  email: string;
  ehAdmin: boolean;
};

function ProtectedRoute({
  children,
  adminOnly = false,
  alunoOnly = false,
}: ProtectedRouteProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarUsuario() {
      try {
        const resposta = await apiFetch("/academicos/me");

        if (!resposta.ok) {
          setUsuario(null);
          return;
        }

        const dados = await resposta.json();
        setUsuario(dados);
      } catch {
        setUsuario(null);
      } finally {
        setCarregando(false);
      }
    }

    carregarUsuario();
  }, []);

  if (carregando) {
    return <div>Carregando...</div>;
  }

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  if (adminOnly && !usuario.ehAdmin) {
    return <Navigate to="/" replace />;
  }

  if (alunoOnly && usuario.ehAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;