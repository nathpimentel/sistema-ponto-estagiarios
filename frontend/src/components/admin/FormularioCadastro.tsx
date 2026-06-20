import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { gerarRelatorioGeral } from "../../lib/pdf/relatorios";
import type { Academico, RegistroPonto } from "../../types/ponto";

type FormularioCadastroProps = {
  academicos: Academico[];
  registros: RegistroPonto[];
  onCadastrarSucesso: () => void;
  mostrarToast: (mensagem: string, tipo?: "sucesso" | "erro") => void;
};

export function FormularioCadastro({
  academicos,
  registros,
  onCadastrarSucesso,
  mostrarToast,
}: FormularioCadastroProps) {
  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ehAdmin, setEhAdmin] = useState(false);
  const [horarioEntrada, setHorarioEntrada] = useState("");
  const [horarioSaida, setHorarioSaida] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  async function cadastrar() {
    if (!ehAdmin && (!horarioEntrada || !horarioSaida)) {
      mostrarToast("Informe os horários do acadêmico.", "erro");
      return;
    }

    try {
      const resposta = await apiFetch("/academicos", {
        method: "POST",
        body: JSON.stringify({ matricula, nome, email, ehAdmin, horarioEntrada, horarioSaida }),
      });

      if (resposta.ok) {
        mostrarToast("Usuário cadastrado com sucesso!");
        setMatricula("");
        setNome("");
        setEmail("");
        setEhAdmin(false);
        setHorarioEntrada("");
        setHorarioSaida("");
        onCadastrarSucesso();
      } else {
        const erro = await resposta.text();
        mostrarToast(erro || "Erro ao cadastrar.", "erro");
      }
    } catch {
      mostrarToast("Erro de conexão com o servidor.", "erro");
    }
  }

  async function gerarPdf() {
    if (!dataInicial || !dataFinal) {
      mostrarToast("Selecione o período do relatório.", "erro");
      return;
    }

    const erro = await gerarRelatorioGeral(academicos, registros, dataInicial, dataFinal);
    if (erro) {
      mostrarToast(erro, "erro");
    } else {
      mostrarToast("Relatório gerado com sucesso!");
    }
  }

  const inputCls = "mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500";

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-blue-900">Painel do Administrador</h2>
      <p className="mt-1 text-sm text-slate-500">Cadastre usuários do sistema.</p>

      <div className="mt-6 grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-600">Matrícula</label>
            <input value={matricula} onChange={(e) => setMatricula(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-600">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>

        {!ehAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-slate-600">Horário de entrada</label>
              <input type="time" value={horarioEntrada} onChange={(e) => setHorarioEntrada(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">Horário de saída</label>
              <input type="time" value={horarioSaida} onChange={(e) => setHorarioSaida(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={ehAdmin} onChange={(e) => setEhAdmin(e.target.checked)} />
          Usuário administrador
        </label>

        <button
          onClick={cadastrar}
          className="rounded-xl bg-blue-700 p-3 font-bold text-white transition hover:bg-blue-800"
        >
          Cadastrar Usuário
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-slate-600">Data inicial</label>
            <input type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Data final</label>
            <input type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} className={inputCls} />
          </div>
        </div>

        <button
          onClick={gerarPdf}
          className="rounded-xl bg-green-600 p-3 font-bold text-white transition hover:bg-green-700"
        >
          Gerar Relatório
        </button>
      </div>
    </div>
  );
}
