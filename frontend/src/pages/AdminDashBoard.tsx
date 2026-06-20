import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "../hooks/useToast";
import { Toast } from "../components/Toast";
import { RelogioAtual } from "../components/RelogioAtual";
import { FormularioCadastro } from "../components/admin/FormularioCadastro";
import { ListaAcademicos } from "../components/admin/ListaAcademicos";
import { PainelRegistros } from "../components/admin/PainelRegistros";
import type { Academico, RegistroPonto } from "../types/ponto";

function AdminDashboard() {
  const [academicos, setAcademicos] = useState<Academico[]>([]);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const { toast, mostrarToast } = useToast();

  async function carregarAcademicos() {
    try {
      const res = await apiFetch("/academicos");
      const dados = await res.json();
      setAcademicos(dados.data ?? dados);
    } catch {
      mostrarToast("Erro ao carregar usuários.", "erro");
    }
  }

  async function carregarRegistros() {
    try {
      const res = await apiFetch("/registros-ponto");
      const dados = await res.json();
      setRegistros(dados.data ?? dados);
    } catch {
      mostrarToast("Erro ao carregar registros.", "erro");
    }
  }

  useEffect(() => {
    async function inicializar() {
      try {
        const [resA, resR] = await Promise.all([
          apiFetch("/academicos"),
          apiFetch("/registros-ponto"),
        ]);
        const [dadosA, dadosR] = await Promise.all([resA.json(), resR.json()]);
        setAcademicos(dadosA.data ?? dadosA);
        setRegistros(dadosR.data ?? dadosR);
      } catch {
        mostrarToast("Erro ao carregar dados.", "erro");
      }
    }
    void inicializar();
  }, [mostrarToast]);

  async function excluirAcademico(id: number) {
    try {
      const res = await apiFetch(`/academicos/${id}`, { method: "DELETE" });
      if (res.ok) {
        await Promise.all([carregarAcademicos(), carregarRegistros()]);
        mostrarToast("Usuário excluído.");
      } else {
        mostrarToast("Erro ao excluir usuário.", "erro");
      }
    } catch {
      mostrarToast("Erro de conexão com o servidor.", "erro");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Toast toast={toast} />

      <header className="bg-gradient-to-r from-blue-900 via-blue-700 to-sky-500 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest">
              Prefeitura do Rio · Subsecretaria de Gestão
            </p>
            <h1 className="text-xl font-bold">
              Ponto <span className="text-sky-300">Digital</span>
            </h1>
          </div>
          <RelogioAtual />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-8 py-8 lg:grid-cols-[420px_1fr]">
        <section className="space-y-6">
          <FormularioCadastro
            academicos={academicos}
            registros={registros}
            onCadastrarSucesso={carregarAcademicos}
            mostrarToast={mostrarToast}
          />
          <ListaAcademicos
            academicos={academicos}
            registros={registros}
            onExcluir={excluirAcademico}
          />
        </section>

        <PainelRegistros registros={registros} />
      </main>
    </div>
  );
}

export default AdminDashboard;
