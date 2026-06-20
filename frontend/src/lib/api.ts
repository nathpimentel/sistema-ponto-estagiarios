const API_URL = "http://localhost:5294";

export async function apiFetch(
  endpoint: string,

  options: RequestInit = {},
) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",

    ...(token && {
      Authorization: `Bearer ${token}`,
    }),

    ...options.headers,
  };

  const resposta = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  );

  if (resposta.status === 401) {
    localStorage.removeItem("token");

    localStorage.removeItem("usuario");

    window.location.href = "/";
  }

  return resposta;
}