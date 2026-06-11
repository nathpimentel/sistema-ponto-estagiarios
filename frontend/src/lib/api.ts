const API_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:5294";

export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const resposta = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (resposta.status === 401) {
    localStorage.removeItem("usuario");

    if (window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  return resposta;
}
