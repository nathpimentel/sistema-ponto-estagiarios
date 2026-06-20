import jsPDF from "jspdf";
import type { Academico, RegistroPonto, StatusPresenca } from "../../types/ponto";
import {
  desenharCabecalho,
  carregarLogo,
  formatarSegundos,
  segundosDoTotal,
  formatarHoraStr,
  formatarDataPtBR,
} from "./helpers";
import { calcularPresencaDia } from "../statusPonto";

type LinhaRelatorio = {
  nome: string;
  data: Date;
  entrada: string;
  saida: string;
  total: string;
  status: StatusPresenca;
};

function obterChaveData(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function listarDiasUteis(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = [];
  const atual = new Date(inicio);
  atual.setHours(0, 0, 0, 0);
  while (atual <= fim) {
    const diaSemana = atual.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) dias.push(new Date(atual));
    atual.setDate(atual.getDate() + 1);
  }
  return dias;
}

function desenharTitulo(pdf: jsPDF, periodo: string): void {
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

function desenharCabecalhoTabela(pdf: jsPDF, y: number): void {
  pdf.setFillColor(15, 76, 117);
  pdf.roundedRect(20, y, 170, 10, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Nome", 24, y + 6.5);
  pdf.text("Data", 80, y + 6.5, { align: "center" });
  pdf.text("Entrada", 108, y + 6.5, { align: "center" });
  pdf.text("Saída", 132, y + 6.5, { align: "center" });
  pdf.text("Total", 154, y + 6.5, { align: "center" });
  pdf.text("Status", 177, y + 6.5, { align: "center" });
}

export async function gerarRelatorioGeral(
  academicos: Academico[],
  registros: RegistroPonto[],
  dataInicial: string,
  dataFinal: string
): Promise<string | null> {
  const [anoInicio, mesInicio, diaInicio] = dataInicial.split("-").map(Number);
  const [anoFim, mesFim, diaFim] = dataFinal.split("-").map(Number);

  const inicio = new Date(anoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0);
  const fim = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59, 999);

  // Fix 2.3: usar > em vez de >= para permitir relatório de um dia só
  if (inicio > fim) return "A data inicial deve ser menor ou igual à data final.";

  const diasUteis = listarDiasUteis(inicio, fim);
  const bolsistas = academicos
    .filter((a) => !a.ehAdmin)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  if (diasUteis.length === 0) return "Selecione um período com pelo menos um dia útil.";
  if (bolsistas.length === 0) return "Nenhum acadêmico bolsista cadastrado.";

  const registrosPeriodo = registros
    .filter((r) => {
      const d = new Date(r.entrada);
      return d >= inicio && d <= fim;
    })
    .sort((a, b) => new Date(a.entrada).getTime() - new Date(b.entrada).getTime());

  const linhas: LinhaRelatorio[] = diasUteis.flatMap((dia) => {
    const chaveDia = obterChaveData(dia);
    return bolsistas.map((academico) => {
      const registrosDia = registrosPeriodo.filter(
        (r) => obterChaveData(new Date(r.entrada)) === chaveDia && r.nomeAcademico === academico.nome
      );
      const totalSegundos = registrosDia.reduce((t, r) => t + segundosDoTotal(r.totalHoras), 0);
      const primeiraEntrada = registrosDia[0]?.entrada ?? null;
      const registrosComSaida = registrosDia.filter((r) => r.saida);
      const ultimaSaida = registrosComSaida[registrosComSaida.length - 1]?.saida ?? null;
      const temAberto = registrosDia.some((r) => r.saida === null);

      return {
        nome: academico.nome,
        data: dia,
        entrada: primeiraEntrada ? formatarHoraStr(primeiraEntrada) : "--:--",
        saida: ultimaSaida ? formatarHoraStr(ultimaSaida) : "--:--",
        total: temAberto ? "Em andamento" : registrosDia.length > 0 ? formatarSegundos(totalSegundos) : "00:00:00",
        status: calcularPresencaDia(academico.horarioEntrada, registrosDia),
      };
    });
  });

  const periodo = `${new Date(anoInicio, mesInicio - 1, diaInicio).toLocaleDateString("pt-BR")} até ${new Date(anoFim, mesFim - 1, diaFim).toLocaleDateString("pt-BR")}`;
  const pdf = new jsPDF();
  const logo = await carregarLogo();

  desenharCabecalho(pdf, logo);
  desenharTitulo(pdf, periodo);

  let y = 98;
  desenharCabecalhoTabela(pdf, y);
  y += 14;

  linhas.forEach((linha, i) => {
    if (y > 260) {
      pdf.addPage();
      desenharCabecalho(pdf, logo);
      desenharTitulo(pdf, periodo);
      y = 98;
      desenharCabecalhoTabela(pdf, y);
      y += 14;
    }

    if (i % 2 === 0) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(20, y - 6, 170, 11, "F");
    }

    pdf.setDrawColor(226, 232, 240);
    pdf.line(20, y + 6, 190, y + 6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(linha.nome, 24, y, { maxWidth: 48 });
    pdf.setTextColor(51, 65, 85);
    pdf.text(formatarDataPtBR(linha.data), 80, y, { align: "center" });
    pdf.text(linha.entrada, 108, y, { align: "center" });
    pdf.text(linha.saida, 132, y, { align: "center" });
    pdf.text(linha.total, 154, y, { align: "center" });
    pdf.setTextColor(linha.status === "Ausente" ? 185 : 22, linha.status === "Ausente" ? 28 : 101, linha.status === "Ausente" ? 28 : 52);
    pdf.text(linha.status, 177, y, { align: "center", maxWidth: 28 });

    y += 12;
  });

  if (y > 236) {
    pdf.addPage();
    desenharCabecalho(pdf, logo);
    desenharTitulo(pdf, periodo);
    y = 100;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Assinatura do responsável:", 20, y + 18);
  pdf.setDrawColor(100, 116, 139);
  pdf.line(20, y + 42, 120, y + 42);
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 20, y + 50);

  pdf.save("relatorio-ponto.pdf");
  return null;
}
