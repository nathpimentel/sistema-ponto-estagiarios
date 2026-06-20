import { apiFetch } from "../lib/api";

export async function login(
  email: string,
  senha: string
) {
  const response = await apiFetch(
    "/academicos/login",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        senha,
      }),
    }
  );

  return response.json();
}