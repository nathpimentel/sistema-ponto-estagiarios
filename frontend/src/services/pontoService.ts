import { apiFetch } from "../lib/api";

export async function registrarEntrada() {
  const response = await apiFetch(
    "/registros-ponto/entrada",
    {
      method: "POST",
    }
  );

  return response.json();
}