import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";

type ProtectedRouteProps = {
  
  children: React.ReactNode;

  adminOnly?: boolean;

  alunoOnly?: boolean;
};

function ProtectedRoute({
  children,

  adminOnly = false,

  alunoOnly = false,
}: ProtectedRouteProps) {
  const {
  usuario,
  estaAutenticado,
  carregando,
} = useAuth();

if (carregando) {
  return null;
}

if (!estaAutenticado || !usuario) {
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