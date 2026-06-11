import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { apiFetch } from "../lib/api";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  matricula: string;
  horarioEntrada?: string;
  horarioSaida?: string;
};

type RegistroPonto = {
  id: number;
  academicoId: number;
  data: string;
  horaEntrada: string;
  horaSaida: string | null;
  totalTrabalhado: string | null;
};

function AcademicoDashboard() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [horaAtual, setHoraAtual] = useState(new Date());

  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  useEffect(() => {
  async function carregarDados() {
    try {
      const resposta = await apiFetch("/academicos/me");

      if (!resposta.ok) {
        return;
      }

      const usuarioLogado = await resposta.json();

      setUsuario(usuarioLogado);

      carregarRegistros();
    } catch (erro) {
      console.error(erro);
    }
  }

  carregarDados();

  const timer = setInterval(() => {
    setHoraAtual(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

  function carregarRegistros() {
    apiFetch("/registros-ponto")
      .then((res) => res.json())
      .then((dados) => {
        setRegistros(dados);
      });
  }

  async function registrarEntrada() {
    if (!usuario) return;

    const resposta = await apiFetch("/registros-ponto/entrada", {
      method: "POST",
    });

    if (resposta.ok) {
      alert("Entrada registrada!");
      carregarRegistros();
    } else {
      const erro = await resposta.text();
      alert(erro);
    }
  }

  async function registrarSaida() {
    if (!usuario) return;

    const resposta = await apiFetch("/registros-ponto/saida", {
      method: "POST",
    });

    if (resposta.ok) {
      alert("Saída registrada!");
      carregarRegistros();
    } else {
      alert("Erro ao registrar saída.");
    }
  }

  async function logout() {
  try {
    await apiFetch("/academicos/logout", {
      method: "POST",
    });
  } finally {
    window.location.href = "/";
  }
}

  function formatarHora(data: string | null) {
    if (!data) return "--:--";

    return new Date(data).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function formatarTotal(total: string | null) {
    if (!total) return "Em andamento";

    return total.split(".")[0];
  }

  function segundosDoRegistro(registro: RegistroPonto) {
    if (!registro.totalTrabalhado) return 0;

    const [horas, minutos, segundos] = registro.totalTrabalhado
      .split(".")[0]
      .split(":")
      .map(Number);

    return horas * 3600 + minutos * 60 + segundos;
  }

  function formatarSegundos(totalSegundos: number) {
    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
      2,
      "0"
    )}:${String(segundos).padStart(2, "0")}`;
  }

  function formatarDataInput(data: string) {
    const [ano, mes, dia] = data.split("-").map(Number);

    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
  }

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

  async function gerarRelatorioIndividual() {
    if (!usuario) return;

    const usuarioAtual = usuario;

    if (!dataInicial || !dataFinal) {
      alert("Selecione o período do relatório.");
      return;
    }

    async function carregarImagemRelatorio() {
      const resposta = await fetch("/logo-relatorio-subg.png");
      const blob = await resposta.blob();

      return await new Promise<string>((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onloadend = () => resolve(String(leitor.result));
        leitor.onerror = reject;
        leitor.readAsDataURL(blob);
      });
    }

    async function logout() {
  try {
    await apiFetch("/academicos/logout", {
      method: "POST",
    });
  } finally {
    window.location.href = "/";
  }
}

    function desenharCabecalho(pdf: jsPDF, logoRelatorio?: string) {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 210, 297, "F");

      pdf.setFillColor(15, 76, 117);
      pdf.rect(0, 0, 210, 7, "F");

      if (logoRelatorio) {
        pdf.addImage(logoRelatorio, "PNG", 18, 14, 28, 28);
      } else {
        pdf.setFillColor(15, 76, 117);
        pdf.circle(32, 28, 14, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(255, 255, 255);
        pdf.text("SUBG", 32, 31, { align: "center" });
      }

      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(8);
      pdf.text("PREFEITURA DA CIDADE DO", 52, 22);

      pdf.setFontSize(13);
      pdf.text("RIO DE JANEIRO", 52, 29);

      pdf.setFontSize(10);
      pdf.text("SECRETARIA MUNICIPAL DE SAUDE", 52, 36);

      pdf.setDrawColor(226, 232, 240);
      pdf.line(20, 48, 190, 48);
    }

    function desenharTitulo(pdf: jsPDF, periodo: string, totalSegundos: number) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Relatório Individual de Ponto", 20, 63);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Nome: ${usuarioAtual.nome}`, 20, 71);
      pdf.text(`Matrícula: ${usuarioAtual.matricula}`, 20, 78);
      pdf.text(`Período: ${periodo}`, 20, 85);
      pdf.text(`Total trabalhado: ${formatarSegundos(totalSegundos)}`, 20, 92);
    }

    function desenharCabecalhoTabela(pdf: jsPDF, posicaoY: number) {
      pdf.setFillColor(15, 76, 117);
      pdf.roundedRect(20, posicaoY, 170, 10, 2, 2, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Data", 47, posicaoY + 6.5, { align: "center" });
      pdf.text("Entrada", 95, posicaoY + 6.5, { align: "center" });
      pdf.text("Saída", 135, posicaoY + 6.5, { align: "center" });
      pdf.text("Total", 170, posicaoY + 6.5, { align: "center" });
    }

    function formatarDataTabela(data: string) {
      const dataSemHora = data.split("T")[0];
      const [ano, mes, dia] = dataSemHora.split("-").map(Number);
      return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    }

    const [anoInicio, mesInicio, diaInicio] = dataInicial
      .split("-")
      .map(Number);

    const [anoFim, mesFim, diaFim] = dataFinal.split("-").map(Number);

    const inicio = new Date(anoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0);
    const fim = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59, 999);

    if (inicio >= fim) {
      alert("A data inicial deve ser menor que a data final.");
      return;
    }

    const registrosPeriodo = registros
      .filter((registro) => {
        const dataRegistro = new Date(registro.data);

        return dataRegistro >= inicio && dataRegistro <= fim;
      })
      .sort(
        (a, b) =>
          new Date(a.horaEntrada).getTime() -
          new Date(b.horaEntrada).getTime()
      );

    if (registrosPeriodo.length === 0) {
      alert("Nenhum registro encontrado nesse período.");
      return;
    }

    const totalSegundos = registrosPeriodo.reduce(
      (total, registro) => total + segundosDoRegistro(registro),
      0
    );

    const pdf = new jsPDF();
    let logoRelatorio: string | undefined;

    try {
      logoRelatorio = await carregarImagemRelatorio();
    } catch {
      logoRelatorio = undefined;
    }

    const periodo = `${formatarDataInput(dataInicial)} até ${formatarDataInput(
      dataFinal
    )}`;

    desenharCabecalho(pdf, logoRelatorio);
    desenharTitulo(pdf, periodo, totalSegundos);

    let posicaoY = 108;
    desenharCabecalhoTabela(pdf, posicaoY);
    posicaoY += 14;

    registrosPeriodo.forEach((registro, indice) => {
      if (posicaoY > 260) {
        pdf.addPage();
        desenharCabecalho(pdf, logoRelatorio);
        desenharTitulo(pdf, periodo, totalSegundos);
        posicaoY = 108;
        desenharCabecalhoTabela(pdf, posicaoY);
        posicaoY += 14;
      }

      if (indice % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(20, posicaoY - 6, 170, 11, "F");
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.line(20, posicaoY + 6, 190, posicaoY + 6);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatarDataTabela(registro.data), 47, posicaoY, {
        align: "center",
      });
      pdf.text(formatarHora(registro.horaEntrada), 95, posicaoY, {
        align: "center",
      });
      pdf.text(formatarHora(registro.horaSaida), 135, posicaoY, {
        align: "center",
      });
      pdf.text(formatarTotal(registro.totalTrabalhado), 170, posicaoY, {
        align: "center",
      });

      posicaoY += 12;
    });

    pdf.save(`relatorio-${usuarioAtual.nome}.pdf`);
  }
  const registrosHoje = registros.filter((registro) => {
    const dataRegistro = new Date(registro.data).toDateString();
    const hoje = new Date().toDateString();

    return dataRegistro === hoje;
  });

  function criarDataComHorario(horario: string) {
    const [hora, minuto] = horario.split(":").map(Number);
    const data = new Date();

    data.setHours(hora, minuto, 0, 0);

    return data;
  }

  function obterStatusAtual() {
    const entradaAberta = registrosHoje.find(
      (registro) => registro.horaSaida === null
    );

    if (entradaAberta) return "No expediente";

    if (!usuario?.horarioEntrada || !usuario?.horarioSaida) {
      return "Expediente encerrado";
    }

    const agora = new Date();
    const toleranciaMinutos = 10;
    const limiteAtraso = criarDataComHorario(usuario.horarioEntrada);
    const limiteFalta = criarDataComHorario(usuario.horarioSaida);
    const inicioValidoDoExpediente = criarDataComHorario(
      usuario.horarioEntrada
    );

    limiteAtraso.setMinutes(limiteAtraso.getMinutes() + toleranciaMinutos);
    inicioValidoDoExpediente.setMinutes(
      inicioValidoDoExpediente.getMinutes() - toleranciaMinutos
    );

    const registrosDoExpediente = registrosHoje.filter((registro) => {
      const horaEntrada = new Date(registro.horaEntrada);

      return horaEntrada >= inicioValidoDoExpediente;
    });

    if (registrosDoExpediente.length > 0) {
      return "Expediente encerrado";
    }

    if (agora >= limiteAtraso && agora < limiteFalta) {
      return "Atrasado";
    }

    if (agora >= limiteFalta) {
      return "Ausente";
    }

    return "Aguardando entrada";
  }

  const statusAtual = obterStatusAtual();

  return (
    <div className="min-h-screen bg-slate-50">
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

  <div className="flex items-center gap-4">
    <p className="text-xl font-bold">
      {horaAtual.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </p>

    <button
      onClick={logout}
      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
    >
      Sair
    </button>
  </div>
</div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-10">
        <p className="text-lg text-slate-500">
          {horaAtual.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </p>

        <h1 className="mt-2 text-4xl font-bold text-blue-900">
          Dashboard do Acadêmico Bolsista
        </h1>

        <p className="mt-3 text-xl text-slate-500">
          Bem-vindo(a),{" "}
          <strong className="text-slate-900">{usuario?.nome}</strong>. Pronto
          para registrar seu ponto?
        </p>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Hora atual
              </p>

              <p className="mt-3 text-4xl font-semibold text-slate-900">
                {horaAtual.toLocaleTimeString("pt-BR")}
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
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Registros hoje
            </p>
            <h2 className="mt-3 text-4xl font-semibold text-slate-900">
              {registrosHoje.length}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Total de registros
            </p>
            <h2 className="mt-3 text-4xl font-semibold text-slate-900">
              {registros.length}
            </h2>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <h2
              className={`mt-3 text-4xl font-semibold ${
                statusAtual === "No expediente"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {statusAtual}
            </h2>
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              Histórico recente
            </h2>

            <p className="text-slate-500">{registros.length} registro(s)</p>
          </div>

          <div className="mt-6 space-y-4">
            {registros.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                <h3 className="mt-5 text-xl font-bold">
                  Nenhum registro ainda
                </h3>

                <p className="mt-2 text-slate-500">
                  Use os botões acima para registrar seu primeiro ponto.
                </p>
              </div>
            )}

            {registros.map((registro) => (
              <div
                key={registro.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  {formatarDataRelatorio(registro.data)}
                </p>

                <p>
                  <strong>Entrada:</strong> {formatarHora(registro.horaEntrada)}
                </p>

                <p>
                  <strong>Saída:</strong>{" "}
                  {registro.horaSaida
                    ? formatarHora(registro.horaSaida)
                    : "Ainda não registrada"}
                </p>

                <p>
                  <strong>Total trabalhado:</strong>{" "}
                  {formatarTotal(registro.totalTrabalhado)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Relatório individual
          </h2>

          <p className="mt-2 text-slate-500">
            Consulte seus registros de horas trabalhadas por período.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-600">
                Data inicial
              </label>

              <input
                type="date"
                value={dataInicial}
                onChange={(e) => setDataInicial(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600">
                Data final
              </label>

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
