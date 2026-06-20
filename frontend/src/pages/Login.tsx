import { useAuth } from "../hooks/useAuth";

import { apiFetch } from "../lib/api";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const { login } = useAuth();
  const [modoPrimeiroAcesso, setModoPrimeiroAcesso] = useState(false);

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const [senha, setSenha] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const navigate = useNavigate();

  function limparCamposSenha() {
    setSenha("");
    setNovaSenha("");
    setConfirmarSenha("");
    setToken("");
  }

  function alternarModoPrimeiroAcesso() {
    setModoPrimeiroAcesso((modoAtual) => !modoAtual);

    limparCamposSenha();
  }

  async function fazerLogin() {
    const resposta = await apiFetch(
  "/academicos/login",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          senha,
        }),
      },
    );

    if (resposta.ok) {
      const usuario = await resposta.json();

      login(usuario);

      if (usuario.ehAdmin) {
        navigate("/admin");
      } else {
        navigate("/aluno");
      }

      return;
    }

    const mensagem = await resposta.text();

    alert(mensagem || "Email ou senha inválidos.");
  }

  async function definirPrimeiraSenha() {
    if (novaSenha !== confirmarSenha) {
      alert("As senhas informadas não conferem.");

      return;
    }

    const resposta = await fetch(
  "http://localhost:5294/academicos/primeiro-acesso",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          email,
          token,
          novaSenha,
        }),
      },
    );

    const mensagem = await resposta.text();

    if (resposta.ok) {
      alert(mensagem || "Senha definida com sucesso.");

      setModoPrimeiroAcesso(false);

      limparCamposSenha();

      return;
    }

    alert(mensagem || "Não foi possível definir a senha.");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-2">
      <section className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-sky-500 via-blue-700 to-blue-950 p-10 text-white">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/80">
            Prefeitura do Rio de Janeiro
          </p>

          <h2 className="text-xl font-bold">
            Subsecretaria de Gestão
          </h2>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-xl">
            <h1 className="text-6xl font-extrabold leading-tight">
              Ponto{" "}
              <span className="text-orange-400">
                Digital
              </span>
            </h1>

            <p className="mt-8 text-2xl leading-relaxed text-white/90">
              Registro de jornada simples,
              transparente e seguro para
              estagiários e equipe administrativa da
              SUBG.
            </p>

            <p className="mt-16 text-xl text-white/90">
              Bata ponto em segundos
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-xl rounded-3xl bg-white p-10 shadow-2xl">
          <div className="mb-10">
            <h1 className="text-5xl font-black text-slate-950">
              {modoPrimeiroAcesso
                ? "Primeiro acesso"
                : "Entrar"}
            </h1>

            <p className="mt-4 text-lg text-slate-500">
              {modoPrimeiroAcesso
                ? "Confirme seus dados e crie sua senha pessoal."
                : "Faça login para acessar o sistema."}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-3 block font-bold text-slate-900">
                E-mail
              </label>

              <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-4 shadow-sm">
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            {modoPrimeiroAcesso ? (
              <>
                <div>
                  <label className="mb-3 block font-bold text-slate-900">
                    Token de primeiro acesso
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-4 shadow-sm">
                    <input
                      type="text"
                      placeholder="Digite seu token"
                      value={token}
                      onChange={(e) =>
                        setToken(e.target.value)
                      }
                      className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block font-bold text-slate-900">
                    Nova senha
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-4 shadow-sm">
                    <input
                      type="password"
                      value={novaSenha}
                      onChange={(e) =>
                        setNovaSenha(e.target.value)
                      }
                      className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-3 block font-bold text-slate-900">
                    Confirmar senha
                  </label>

                  <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-4 shadow-sm">
                    <input
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) =>
                        setConfirmarSenha(
                          e.target.value,
                        )
                      }
                      className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="mb-3 block font-bold text-slate-900">
                  Senha
                </label>

                <div className="flex items-center rounded-2xl border border-slate-300 bg-white px-5 py-4 shadow-sm">
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) =>
                      setSenha(e.target.value)
                    }
                    className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            <button
              onClick={
                modoPrimeiroAcesso
                  ? definirPrimeiraSenha
                  : fazerLogin
              }
              className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-900 px-6 py-5 text-lg font-bold text-white shadow-xl transition hover:scale-[1.01]"
            >
              {modoPrimeiroAcesso
                ? "Definir senha"
                : "Entrar"}
            </button>

            <button
              type="button"
              onClick={alternarModoPrimeiroAcesso}
              className={`w-full rounded-2xl border px-6 py-4 text-center font-bold shadow-sm transition hover:scale-[1.01] ${
                modoPrimeiroAcesso
                  ? "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-800"
                  : "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400 hover:bg-blue-100"
              }`}
            >
              {modoPrimeiroAcesso
                ? "Já tenho senha"
                : "Primeiro acesso? Definir minha senha"}
            </button>

            <p className="text-center text-sm text-slate-500">
              Problemas para acessar? Procure a
              coordenação da SUBG.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Login;