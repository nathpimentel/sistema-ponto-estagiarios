import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import { Trash2 } from "lucide-react";

type Academico = {
  id: number;
  matricula: string;
  nome: string;
  email: string;
  ehAdmin: boolean;
  horarioEntrada: string;
  horarioSaida: string;
  ativo: boolean;
};

type RegistroPonto = {
  id: number;

  academicoId: number;

  nomeAcademico: string;

  entrada: string;

  saida: string | null;

  totalHoras: string | null;
};

type StatusAcademico = {
  texto: string;
};

type LinhaRelatorioPresenca = {
  nome: string;
  data: Date;
  entrada: string;
  saida: string;
  total: string;
  status: "Presente" | "Presente com atraso" | "Ausente";
};

function AdminDashboard() {
  const [academicos, setAcademicos] = useState<Academico[]>([]);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);

  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ehAdmin, setEhAdmin] = useState(false);

  const [horarioEntrada, setHorarioEntrada] = useState("");
  const [horarioSaida, setHorarioSaida] = useState("");

  const [filtroNome, setFiltroNome] = useState("");
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState(new Date());

  const [toast, setToast] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");

  function obterHeadersAutenticados() {
    return {
      Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
    };
  }

  function carregarAcademicos() {
    fetch("http://localhost:5294/academicos", {
      headers: obterHeadersAutenticados(),
    })
      .then((res) => res.json())
      .then((dados) => setAcademicos(dados.data ?? dados));
  }

  function carregarRegistros() {
    fetch("http://localhost:5294/registros-ponto", {
      headers: obterHeadersAutenticados(),
    })
      .then((res) => res.json())
      .then((dados) => setRegistros(dados.data ?? dados));
  }

  useEffect(() => {
    carregarAcademicos();
    carregarRegistros();
  }, []);

  async function cadastrarAcademico() {
    if (!ehAdmin && (!horarioEntrada || !horarioSaida)) {
      alert("Informe os horários do acadêmico.");
      return;
    }

    const resposta = await fetch("http://localhost:5294/academicos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...obterHeadersAutenticados(),
      },
      body: JSON.stringify({
        matricula,
        nome,
        email,
        ehAdmin,
        horarioEntrada,
        horarioSaida,
      }),
    });

    if (resposta.ok) {
      alert("Usuário cadastrado!");

      setMatricula("");
      setNome("");
      setEmail("");
      setEhAdmin(false);
      setHorarioEntrada("");
      setHorarioSaida("");

      carregarAcademicos();
    } else {
      const erro = await resposta.text();
      alert(erro || "Erro ao cadastrar.");
    }
  }

  async function excluirAcademico(id: number) {
    const confirmar = confirm("Tem certeza que deseja excluir este usuário?");
    if (!confirmar) return;

    const resposta = await fetch(`http://localhost:5294/academicos/${id}`, {
      method: "DELETE",
      headers: obterHeadersAutenticados(),
    });

    if (resposta.ok) {
      carregarAcademicos();
      carregarRegistros();
    } else {
      alert("Erro ao excluir usuário.");
    }
  }

  function formatarData(data: string) {
    const dataSemHora = data.split("T")[0];
    const [ano, mes, dia] = dataSemHora.split("-").map(Number);
    const dataLocal = new Date(ano, mes - 1, dia);

    return dataLocal.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }

  function formatarHora(data: string | null) {
    if (!data) return "--:--";

    return new Date(data).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatarTotal(total: string | null) {
    if (!total) return "Em andamento";
    return total.split(".")[0];
  }

  function obterDiaRegistro(data: string) {
    const dataSemHora = data.split("T")[0];
    const [, , dia] = dataSemHora.split("-").map(Number);
    return dia;
  }

  function obterMesRegistro(data: string) {
    const dataSemHora = data.split("T")[0];
    const [, mes] = dataSemHora.split("-").map(Number);
    return mes - 1;
  }

  function obterAnoRegistro(data: string) {
    const dataSemHora = data.split("T")[0];
    const [ano] = dataSemHora.split("-").map(Number);
    return ano;
  }

  function criarDataComHorario(horario: string) {
    const [hora, minuto] = horario.split(":").map(Number);
    const data = new Date();

    data.setHours(hora, minuto, 0, 0);

    return data;
  }

  function pegarStatus(academico: Academico): StatusAcademico | null {
    if (academico.ehAdmin) return null;

    const agora = new Date();
    const hoje = agora.toDateString();

    const registrosHoje = registros
      .filter((registro) => {
        const dataRegistro = new Date(registro.entrada).toDateString();

        return (
          registro.nomeAcademico === academico.nome &&
          dataRegistro === hoje
        );
      })
      .sort(
        (a, b) =>
          new Date(a.entrada).getTime() -
          new Date(b.entrada).getTime()
      );

    const limiteAtraso = criarDataComHorario(academico.horarioEntrada);
    const limiteFalta = criarDataComHorario(academico.horarioSaida);
    const inicioExpediente = criarDataComHorario(academico.horarioEntrada);

    const toleranciaMinutos = 10;
    limiteAtraso.setMinutes(limiteAtraso.getMinutes() + toleranciaMinutos);

    const inicioValidoDoExpediente = new Date(inicioExpediente);
    inicioValidoDoExpediente.setMinutes(
      inicioValidoDoExpediente.getMinutes() - toleranciaMinutos
    );

    const entradaAberta = registrosHoje.find(
      (registro) => registro.saida === null
    );

    if (entradaAberta) {
      const horaEntrada = new Date(entradaAberta.entrada);

      if (horaEntrada > limiteAtraso) {
        return {
          texto: "No expediente • Entrada com atraso",
        };
      }

      return {
        texto: `No expediente até ${academico.horarioSaida}`,
      };
    }

    const registrosDoExpediente = registrosHoje.filter((registro) => {
      const horaEntrada = new Date(registro.entrada);

      return horaEntrada >= inicioValidoDoExpediente;
    });

    if (registrosDoExpediente.length === 0) {
      if (agora >= limiteAtraso && agora < limiteFalta) {
        return {
          texto: `Atrasado • Entrada prevista: ${academico.horarioEntrada}`,
        };
      }

      if (agora >= limiteFalta) {
        return {
          texto: `Ausente • Expediente encerrado às ${academico.horarioSaida}`,
        };
      }

      return {
        texto: `Aguardando entrada • Entrada às ${academico.horarioEntrada}`,
      };
    }

    const primeiroRegistro = registrosDoExpediente[0];
    const horaEntrada = new Date(primeiroRegistro.entrada);

    if (horaEntrada > limiteAtraso) {
      return {
        texto: "Entrada com atraso",
      };
    }

    return {
      texto: "Expediente encerrado",
    };
  }

  async function gerarPdfRelatorio() {
    if (!dataInicial || !dataFinal) {
      alert("Selecione o período do relatório.");
      return;
    }

    function formatarDataInput(data: string) {
      const [ano, mes, dia] = data.split("-").map(Number);
      return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
    }

    function formatarDataRelatorio(data: Date) {
      return data.toLocaleDateString("pt-BR");
    }

    function obterChaveData(data: Date) {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, "0");
      const dia = String(data.getDate()).padStart(2, "0");

      return `${ano}-${mes}-${dia}`;
    }

    function listarDiasUteis(inicioPeriodo: Date, fimPeriodo: Date) {
      const dias: Date[] = [];
      const diaAtual = new Date(inicioPeriodo);
      diaAtual.setHours(0, 0, 0, 0);

      while (diaAtual <= fimPeriodo) {
        const diaSemana = diaAtual.getDay();

        if (diaSemana !== 0 && diaSemana !== 6) {
          dias.push(new Date(diaAtual));
        }

        diaAtual.setDate(diaAtual.getDate() + 1);
      }

      return dias;
    }

    function segundosDoTotal(total: string | null) {
      if (!total) return 0;

      const [horas, minutos, segundos] = total
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

    function obterStatusPresenca(
      academico: Academico,
      registrosDia: RegistroPonto[]
    ): LinhaRelatorioPresenca["status"] {
      if (registrosDia.length === 0) return "Ausente";
      if (!academico.horarioEntrada) return "Presente";

      const limiteAtraso = criarDataComHorario(academico.horarioEntrada);
      limiteAtraso.setMinutes(limiteAtraso.getMinutes() + 10);

      const primeiraEntrada = new Date(registrosDia[0].entrada);

      return primeiraEntrada > limiteAtraso
        ? "Presente com atraso"
        : "Presente";
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

    function desenharTitulo(pdf: jsPDF, periodo: string) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Relatório de Ponto", 20, 63);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text("Subsecretaria de Gestão", 20, 71);
      pdf.text(`Período: ${periodo}`, 20, 78);
    }

    function desenharCabecalhoTabela(pdf: jsPDF, posicaoY: number) {
      pdf.setFillColor(15, 76, 117);
      pdf.roundedRect(20, posicaoY, 170, 10, 2, 2, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Nome", 24, posicaoY + 6.5);
      pdf.text("Data", 80, posicaoY + 6.5, { align: "center" });
      pdf.text("Entrada", 108, posicaoY + 6.5, { align: "center" });
      pdf.text("Saída", 132, posicaoY + 6.5, { align: "center" });
      pdf.text("Total", 154, posicaoY + 6.5, { align: "center" });
      pdf.text("Status", 177, posicaoY + 6.5, { align: "center" });
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

    const diasUteis = listarDiasUteis(inicio, fim);
    const academicosBolsistas = academicos
      .filter((academico) => !academico.ehAdmin)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    if (diasUteis.length === 0) {
      alert("Selecione um período com pelo menos um dia útil.");
      return;
    }

    if (academicosBolsistas.length === 0) {
      alert("Nenhum acadêmico bolsista cadastrado.");
      return;
    }

    const registrosPeriodo = registros
      .filter((registro) => {
        const dataRegistro = new Date(registro.entrada);

        return dataRegistro >= inicio && dataRegistro <= fim;
      })
      .sort(
        (a, b) =>
          new Date(a.entrada).getTime() -
          new Date(b.entrada).getTime()
      );

    const linhasRelatorio: LinhaRelatorioPresenca[] = diasUteis.flatMap(
      (dia) => {
        const chaveDia = obterChaveData(dia);

        return academicosBolsistas.map((academico) => {
          const registrosDia = registrosPeriodo.filter((registro) => {
            const dataRegistro = new Date(registro.entrada);

            return (
              obterChaveData(dataRegistro) === chaveDia &&
              registro.nomeAcademico === academico.nome
            );
          });

          const totalSegundos = registrosDia.reduce(
            (total, registro) => total + segundosDoTotal(registro.totalHoras),
            0
          );

          const primeiraEntrada = registrosDia[0]?.entrada ?? null;
          const registrosComSaida = registrosDia.filter(
            (registro) => registro.saida
          );
          const ultimaSaida =
            registrosComSaida[registrosComSaida.length - 1]?.saida ?? null;
          const temRegistroAberto = registrosDia.some(
            (registro) => registro.saida === null
          );

          return {
            nome: academico.nome,
            data: dia,
            entrada: primeiraEntrada ? formatarHora(primeiraEntrada) : "--:--",
            saida: ultimaSaida ? formatarHora(ultimaSaida) : "--:--",
            total: temRegistroAberto
              ? "Em andamento"
              : registrosDia.length > 0
              ? formatarSegundos(totalSegundos)
              : "00:00:00",
            status: obterStatusPresenca(academico, registrosDia),
          };
        });
      }
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
    desenharTitulo(pdf, periodo);

    let posicaoY = 98;

    desenharCabecalhoTabela(pdf, posicaoY);
    posicaoY += 14;

    linhasRelatorio.forEach((linha, indice) => {
      if (posicaoY > 260) {
        pdf.addPage();
        desenharCabecalho(pdf, logoRelatorio);
        desenharTitulo(pdf, periodo);
        posicaoY = 98;
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
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);
      pdf.text(linha.nome, 24, posicaoY, { maxWidth: 48 });

      pdf.setTextColor(51, 65, 85);
      pdf.text(formatarDataRelatorio(linha.data), 80, posicaoY, {
        align: "center",
      });
      pdf.text(linha.entrada, 108, posicaoY, {
        align: "center",
      });
      pdf.text(linha.saida, 132, posicaoY, {
        align: "center",
      });
      pdf.text(linha.total, 154, posicaoY, {
        align: "center",
      });

      if (linha.status === "Ausente") {
        pdf.setTextColor(185, 28, 28);
      } else {
        pdf.setTextColor(22, 101, 52);
      }

      pdf.text(linha.status, 177, posicaoY, {
        align: "center",
        maxWidth: 28,
      });

      posicaoY += 12;
    });

    if (posicaoY > 236) {
      pdf.addPage();
      desenharCabecalho(pdf, logoRelatorio);
      desenharTitulo(pdf, periodo);
      posicaoY = 100;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Assinatura do responsável:", 20, posicaoY + 18);
    pdf.setDrawColor(100, 116, 139);
    pdf.line(20, posicaoY + 42, 120, posicaoY + 42);
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    pdf.text(
      `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
      20,
      posicaoY + 50
    );

    pdf.save("relatorio-ponto.pdf");

    setToast("Relatório gerado com sucesso!");

    setTimeout(() => {
      setToast("");
    }, 3000);
  }

const mesAtual = mesSelecionado.getMonth();
const anoAtual = mesSelecionado.getFullYear();

const diasDoMes = Array.from(
  { length: new Date(anoAtual, mesAtual + 1, 0).getDate() },
  (_, i) => i + 1
);

  function nomeMesAtual() {
    return mesSelecionado.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }

  function mesAnterior() {
    setMesSelecionado(new Date(anoAtual, mesAtual - 1, 1));
    setDiaSelecionado(null);
  }

  function proximoMes() {
    setMesSelecionado(new Date(anoAtual, mesAtual + 1, 1));
    setDiaSelecionado(null);
  }

  function registrosDoDia(dia: number) {
    return registros.some(
      (registro) =>
        obterDiaRegistro(registro.entrada) === dia &&
        obterMesRegistro(registro.entrada) === mesAtual &&
        obterAnoRegistro(registro.entrada) === anoAtual
    );
  }

  const termoBusca = filtroNome.trim().toLowerCase();

  const registrosFiltrados = registros
    .filter((registro) => {
      const nome = String(registro.nomeAcademico || "").toLowerCase();
      const matricula = "";

      const passouBusca =
        !termoBusca ||
        nome.includes(termoBusca) ||
        matricula.includes(termoBusca);

      const passouDia =
        diaSelecionado === null ||
        obterDiaRegistro(registro.entrada) === diaSelecionado;

      const passouMes = obterMesRegistro(registro.entrada) === mesAtual;
      const passouAno = obterAnoRegistro(registro.entrada) === anoAtual;

      return passouBusca && passouDia && passouMes && passouAno;
    })
    .sort((a, b) => {
      const dataA = new Date(a.entrada).getTime();
      const dataB = new Date(b.entrada).getTime();

      return dataB - dataA;
    });

  const registrosAgrupadosPorDia = registrosFiltrados.reduce(
    (grupos: Record<string, RegistroPonto[]>, registro) => {
      const dataFormatada = formatarData(registro.entrada).toUpperCase();

      if (!grupos[dataFormatada]) {
        grupos[dataFormatada] = [];
      }

      grupos[dataFormatada].push(registro);

      return grupos;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {toast && (
        <div className="fixed right-6 top-6 z-50 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

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

          <p className="text-xl font-bold">
            {new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-8 py-8 lg:grid-cols-[420px_1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-blue-900">
              Painel do Administrador
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cadastre usuários do sistema.
            </p>

            <div className="mt-6 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    Matrícula
                  </label>

                  <input
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-600">
                    Nome
                  </label>

                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-600">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
                />
              </div>

              {!ehAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">
                      Horário de entrada
                    </label>

                    <input
                      type="time"
                      value={horarioEntrada}
                      onChange={(e) => setHorarioEntrada(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600">
                      Horário de saída
                    </label>

                    <input
                      type="time"
                      value={horarioSaida}
                      onChange={(e) => setHorarioSaida(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={ehAdmin}
                  onChange={(e) => setEhAdmin(e.target.checked)}
                />
                Usuário administrador
              </label>

              <button
                onClick={cadastrarAcademico}
                className="rounded-xl bg-blue-700 p-3 font-bold text-white transition hover:bg-blue-800"
              >
                Cadastrar Usuário
              </button>

              <div className="grid grid-cols-2 gap-3">
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
                onClick={gerarPdfRelatorio}
                className="rounded-xl bg-green-600 p-3 font-bold text-white transition hover:bg-green-700"
              >
                Gerar Relatório
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800">
              Usuários cadastrados
            </h2>

            <div className="mt-4 space-y-3">
              {academicos.map((academico) => {
                const status = pegarStatus(academico);

                return (
                  <div
                    key={academico.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-800">
                          {academico.nome}
                        </h3>

                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                          {academico.ehAdmin
                            ? "ADMINISTRADOR"
                            : "ACADÊMICO BOLSISTA"}
                        </span>

                        {status?.texto.includes("No expediente") && (
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
                            No expediente
                          </span>
                        )}

                        {status?.texto.includes("Entrada com atraso") && (
                          <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
                            Entrada com atraso
                          </span>
                        )}

                        {status?.texto.includes("Atrasado") && (
                          <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-700">
                            Atrasado
                          </span>
                        )}

                        {status?.texto.includes("Ausente") && (
                          <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                            Ausente
                          </span>
                        )}

                        {status?.texto === "Expediente encerrado" && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                            Expediente encerrado
                          </span>
                        )}

                        {status?.texto.includes("Aguardando entrada") && (
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                            Aguardando entrada
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {academico.matricula} · {academico.email}
                      </p>
                    </div>

                    {!academico.ehAdmin && (
                      <p className="text-xs text-slate-400">
                        Expediente: {academico.horarioEntrada} às{" "}
                        {academico.horarioSaida}
                      </p>
                    )}

                    <button
                      onClick={() => excluirAcademico(academico.id)}
                      className="flex items-center justify-center rounded-xl p-2 text-red-500 transition hover:bg-red-100 hover:text-red-700"
                    >
                      <Trash2 size={18} strokeWidth={2.2} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">
              Registros de Ponto
            </h2>

            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Buscar por nome ou matrícula"
                value={filtroNome}
                onChange={(e) => setFiltroNome(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              {filtroNome && (
                <button
                  onClick={() => setFiltroNome("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                {nomeMesAtual()}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={mesAnterior}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50"
                >
                  &lt;
                </button>

                <button
                  onClick={proximoMes}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDiaSelecionado(null)}
                className={`relative rounded-lg border px-4 py-2 text-sm font-bold transition ${
                  diaSelecionado === null
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Todos
              </button>

              {diasDoMes.map((dia) => (
                <button
                  key={dia}
                  onClick={() => setDiaSelecionado(dia)}
                  className={`relative rounded-lg border px-4 py-2 text-sm font-bold transition ${
                    diaSelecionado === dia
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {dia}

                  {registrosDoDia(dia) && (
                    <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-orange-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-7">
            {registrosFiltrados.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                Nenhum registro encontrado.
              </p>
            )}

            {Object.entries(registrosAgrupadosPorDia).map(
              ([data, registrosDoGrupo]) => (
                <div key={data}>
                  <p className="mb-4 text-sm font-extrabold uppercase tracking-wide text-blue-900">
                    {data}
                  </p>

                  <div className="space-y-3">
                    {registrosDoGrupo.map((registro) => (
                      <div
                        key={registro.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
                      >
                        <div className="flex items-start justify-between gap-8">
                          <div>
                            <p className="text-lg font-bold text-slate-900">
                              {registro.nomeAcademico ?? "Não informado"}
                            </p>

                            <p className="text-sm text-slate-500">
                              Matrícula:{" "}
                              {registro.academicoId}
                            </p>
                          </div>

                          <div className="flex gap-10 text-sm">
                            <div>
                              <p className="font-bold text-slate-700">
                                Entrada
                              </p>

                              <p className="mt-1 text-slate-900">
                                {formatarHora(registro.entrada)}
                              </p>
                            </div>

                            <div>
                              <p className="font-bold text-slate-700">
                                Saída
                              </p>

                              <p className="mt-1 text-slate-900">
                                {formatarHora(registro.saida)}
                              </p>
                            </div>

                            <div>
                              <p className="font-bold text-slate-700">
                                Total
                              </p>

                              <span className="mt-1 inline-block rounded-full bg-blue-100 px-3 py-1 font-bold text-blue-700">
                                {formatarTotal(registro.totalHoras)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
