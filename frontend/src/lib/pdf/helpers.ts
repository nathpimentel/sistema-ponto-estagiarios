import type jsPDF from "jspdf";

export function formatarSegundos(totalSegundos: number): string {
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

export function segundosDoTotal(total: string | null): number {
  if (!total) return 0;
  const [horas, minutos, segundos] = total.split(".")[0].split(":").map(Number);
  return horas * 3600 + minutos * 60 + segundos;
}

export function formatarHoraStr(data: string | null): string {
  if (!data) return "--:--";
  return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function formatarDataPtBR(data: Date): string {
  return data.toLocaleDateString("pt-BR");
}

export async function carregarLogo(): Promise<string | undefined> {
  try {
    const resposta = await fetch("/logo-relatorio-subg.png");
    const blob = await resposta.blob();
    return await new Promise<string>((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onloadend = () => resolve(String(leitor.result));
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export function desenharCabecalho(pdf: jsPDF, logo?: string): void {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, 210, 297, "F");
  pdf.setFillColor(15, 76, 117);
  pdf.rect(0, 0, 210, 7, "F");

  if (logo) {
    pdf.addImage(logo, "PNG", 18, 14, 28, 28);
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
