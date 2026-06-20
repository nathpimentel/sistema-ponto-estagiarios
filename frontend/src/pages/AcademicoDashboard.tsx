import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { apiFetch } from "../lib/api";
import { useToast } from "../hooks/useToast";
import { Toast } from "../components/Toast";
import { RelogioAtual } from "../components/RelogioAtual";
import { calcularStatusPessoal } from "../lib/statusPonto";
import {
  desenharCabecalho,
  carregarLogo,
  formatarSegundos,
  segundosDoTotal,
  formatarHoraStr,
} from "../lib/pdf/helpers";
import type { RegistroPonto } from "../types/ponto";

function formatarDataRelatorio(data: string) {
  const dataSemHora = data.split("T")[0];
  const [ano, mes, dia] = dataSemHora.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarDataTabela(data: string) {
  const dataSemHora = data.split("T")[0];
  const [ano, mes, dia] = dataSemHora.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}

function formatarTotal(total: string | null) {
  if (!total) return "Em andamento";
  return total.split(".")[0];
}

function desenharTituloIndividual(
  pdf: jsPDF,
  nome: string,
  matricula: string,
  periodo: string,
  totalSegundos: number
) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Relatório Individual de Ponto", 20, 63);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Nome: ${nome}`, 20, 71);
  pdf.text(`Matrícula: ${matricula}`, 20, 78);
  pdf.text(`Período: ${periodo}`, 20, 85);
  pdf.text(`Total trabalhado: ${formatarSegundos(totalSegundos)}`, 20, 92);
}

function desenharCabecalhoTabelaIndividual(pdf: jsPDF, y: number) {
  pdf.setFillColor(15, 76, 117);
  pdf.roundedRect(20, y, 170, 10, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Data", 47, y + 6.5, { align: "center" });
  pdf.text("Entrada", 95, y + 6.5, { align: "center" });
  pdf.text("Saída", 135, y + 6.5, { align: "center" });
  pdf.text("Total", 170, y + 6.5, { align: "center" });
}

function AcademicoDashboard() {
  const { usuario } = useAuth();
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const { toast, mostrarToast } = useToast();

  useEffect(() => {
    if (!usuario) return;

    const controller = new AbortController();

    apiFetch("/registros-ponto", { signal: controller.signal })
      .then((res) => res.json())
      .then((dados) => setRegistros(dados.data ?? dados))
      .catch((err) => {
        if (err.name !== "AbortError") {
          mostrarToast("Erro ao carregar registros.", "erro");
        }
      });

    return () => controller.abort();
  }, [usuario, mostrarToast]);

  async function registrarEntrada() {
    if (!usuario) return;
    try {
      const res = await apiFetch("/registros-ponto/entrada", { method: "POST" });
      if (res.ok) {
        mostrarToast("Entrada registrada!");
        const dados = await apiFetch("/registros-ponto").then((r) => r.json());
        setRegistros(dados.data ?? dados);
      } else {
        const erro = await res.text();
        mostrarToast(erro || "Não foi possível registrar a entrada.", "erro");
      }
    } catch {
      mostrarToast("Erro de conexão com o servidor.", "erro");
    }
  }

  async function registrarSaida() {
    if (!usuario) return;
    try {
      const res = await apiFetch("/registros-ponto/saida", { method: "POST" });
      if (res.ok) {
        mostrarToast("Saída registrada!");
        const dados = await apiFetch("/registros-ponto").then((r) => r.json());
        setRegistros(dados.data ?? dados);
      } else {
        mostrarToast("Erro ao registrar saída.", "erro");
      }
    } catch {
      mostrarToast("Erro de conexão com o servidor.", "erro");
    }
  }

  async function gerarRelatorioIndividual() {
    if (!usuario) return;

    if (!dataInicial || !dataFinal) {
      mostrarToast("Selecione o período do relatório.", "erro");
      return;
    }

    const [anoInicio, mesInicio, diaInicio] = dataInicial.split("-").map(Number);
    const [anoFim, mesFim, diaFim] = dataFinal.split("-").map(Number);

    const inicio = new Date(anoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0);
    const fim = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59, 999);

    // Fix 2.3: > em vez de >= permite relatório de um dia só
    if (inicio > fim) {
      mostrarToast("A data inicial deve ser menor ou igual à data final.", "erro");
      return;
    }

    const registrosPeriodo = registros
      .filter((r) => {
        const d = new Date(r.entrada);
        return d >= inicio && d <= fim;
      })
      .sort((a, b) => new Date(a.entrada).getTime() - new Date(b.entrada).getTime());

    if (registrosPeriodo.length === 0) {
      mostrarToast("Nenhum registro encontrado nesse período.", "erro");
      return;
    }

    const totalSegundos = registrosPeriodo.reduce((t, r) => t + segundosDoTotal(r.totalHoras), 0);
    const periodo = `${inicio.toLocaleDateString("pt-BR")} até ${fim.toLocaleDateString("pt-BR")}`;

    const pdf = new jsPDF();
    const logo = await carregarLogo();

    desenharCabecalho(pdf, logo);
    desenharTituloIndividual(pdf, usuario.nome, usuario.matricula, periodo, totalSegundos);

    let y = 108;
    desenharCabecalhoTabelaIndividual(pdf, y);
    y += 14;

    registrosPeriodo.forEach((registro, i) => {
      if (y > 260) {
        pdf.addPage();
        desenharCabecalho(pdf, logo);
        desenharTituloIndividual(pdf, usuario.nome, usuario.matricula, periodo, totalSegundos);
        y = 108;
        desenharCabecalhoTabelaIndividual(pdf, y);
        y += 14;
      }

      if (i % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(20, y - 6, 170, 11, "F");
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(20, y + 6, 190, y + 6);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatarDataTabela(registro.entrada), 47, y, { align: "center" });
      pdf.text(formatarHoraStr(registro.entrada), 95, y, { align: "center" });
      pdf.text(formatarHoraStr(registro.saida), 135, y, { align: "center" });
      pdf.text(formatarTotal(registro.totalHoras), 170, y, { align: "center" });
      y += 12;
    });

    pdf.save(`relatorio-${usuario.nome}.pdf`);
    mostrarToast("Relatório gerado com sucesso!");
  }

  const registrosHoje = registros.filter(
    (r) => new Date(r.entrada).toDateString() === new Date().toDateString()
  );

  // Fix 2.6: admin não tem status de expediente
  const statusAtual = usuario?.ehAdmin
    ? null
    : calcularStatusPessoal(registrosHoje, usuario?.horarioEntrada ?? null, usuario?.horarioSaida ?? null);

  const corStatus =
    statusAtual === "No expediente" ? "text-green-600"
    : statusAtual === "Aguardando entrada" ? "text-blue-600"
    : "text-red-600";

  return (
    <div className="min-h-screen bg-slate-50">
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

      <main className="mx-auto max-w-7xl px-8 py-10">
        <p className="text-lg text-slate-500">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-blue-900">Dashboard do Acadêmico Bolsista</h1>

        <p className="mt-3 text-xl text-slate-500">
          Bem-vindo(a), <strong className="text-slate-900">{usuario?.nome}</strong>. Pronto para registrar seu ponto?
        </p>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hora atual</p>
              <p className="mt-3 text-4xl font-semibold text-slate-900">
                {new Date().toLocaleTimeString("pt-BR")}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                onClick={registrarEntrada}
                className="rounded-2xl bg-green-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-green-700"
              >
                Registrar Entrada
              </button>
              <button
                onClick={registrarSaida}
                className="rounded-2xl bg-red-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-red-700"
              >
                Registrar Saída
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Registros hoje</p>
            <h2 className="mt-3 text-4xl font-semibold text-slate-900">{registrosHoje.length}</h2>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Total de registros</p>
            <h2 className="mt-3 text-4xl font-semibold text-slate-900">{registros.length}</h2>
          </div>
          {/* Fix 2.6: ocultar status para admin */}
          {!usuario?.ehAdmin && statusAtual && (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Status</p>
              <h2 className={`mt-3 text-4xl font-semibold ${corStatus}`}>{statusAtual}</h2>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Histórico recente</h2>
            <p className="text-slate-500">{registros.length} registro(s)</p>
          </div>

          <div className="mt-6 space-y-4">
            {registros.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                <h3 className="mt-5 text-xl font-bold">Nenhum registro ainda</h3>
                <p className="mt-2 text-slate-500">Use os botões acima para registrar seu primeiro ponto.</p>
              </div>
            )}

            {registros.map((registro) => (
              <div key={registro.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  {formatarDataRelatorio(registro.entrada)}
                </p>
                <p><strong>Entrada:</strong> {formatarHoraStr(registro.entrada)}</p>
                <p><strong>Saída:</strong> {registro.saida ? formatarHoraStr(registro.saida) : "Ainda não registrada"}</p>
                <p><strong>Total trabalhado:</strong> {formatarTotal(registro.totalHoras)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">Relatório individual</h2>
          <p className="mt-2 text-slate-500">Consulte seus registros de horas trabalhadas por período.</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-600">Data inicial</label>
              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">Data final</label>
              <input
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={gerarRelatorioIndividual}
            className="mt-6 rounded-2xl bg-blue-700 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-800"
          >
            Gerar relatório
          </button>
        </section>
      </main>
    </div>
  );
}

export default AcademicoDashboard;
