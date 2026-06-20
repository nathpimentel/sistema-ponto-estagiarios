import type { Academico, RegistroPonto, StatusPresenca } from "../types/ponto";

function criarDataComHorario(horario: string): Date {
  const [hora, minuto] = horario.split(":").map(Number);
  const data = new Date();
  data.setHours(hora, minuto, 0, 0);
  return data;
}

// Calcula o status atual de um acadêmico no dashboard do admin
export function calcularStatus(academico: Academico, registros: RegistroPonto[]): string | null {
  if (academico.ehAdmin) return null;
  if (!academico.horarioEntrada || !academico.horarioSaida) return null;

  const agora = new Date();
  const hoje = agora.toDateString();

  const registrosHoje = registros
    .filter((r) => new Date(r.entrada).toDateString() === hoje && r.nomeAcademico === academico.nome)
    .sort((a, b) => new Date(a.entrada).getTime() - new Date(b.entrada).getTime());

  const limiteAtraso = criarDataComHorario(academico.horarioEntrada);
  const limiteFalta = criarDataComHorario(academico.horarioSaida);
  const inicioValido = criarDataComHorario(academico.horarioEntrada);

  limiteAtraso.setMinutes(limiteAtraso.getMinutes() + 10);
  inicioValido.setMinutes(inicioValido.getMinutes() - 10);

  const entradaAberta = registrosHoje.find((r) => r.saida === null);

  if (entradaAberta) {
    const horaEntrada = new Date(entradaAberta.entrada);
    if (horaEntrada > limiteAtraso) return `No expediente • Entrada com atraso`;
    return `No expediente até ${academico.horarioSaida}`;
  }

  const registrosDoExpediente = registrosHoje.filter(
    (r) => new Date(r.entrada) >= inicioValido
  );

  if (registrosDoExpediente.length === 0) {
    if (agora >= limiteAtraso && agora < limiteFalta)
      return `Atrasado • Entrada prevista: ${academico.horarioEntrada}`;
    if (agora >= limiteFalta)
      return `Ausente • Expediente encerrado às ${academico.horarioSaida}`;
    return `Aguardando entrada • Entrada às ${academico.horarioEntrada}`;
  }

  // Fix 2.4: só encerra quando todos os expedientes estão fechados (máx 2)
  const fechados = registrosDoExpediente.filter((r) => r.saida !== null);
  if (fechados.length < 2 && agora < limiteFalta) {
    const primeiraEntrada = new Date(registrosDoExpediente[0].entrada);
    if (primeiraEntrada > limiteAtraso) return "Entrada com atraso • Aguardando 2º expediente";
    return "Aguardando 2º expediente";
  }

  const primeiraEntrada = new Date(registrosDoExpediente[0].entrada);
  if (primeiraEntrada > limiteAtraso) return "Entrada com atraso";

  return "Expediente encerrado";
}

// Calcula status de presença para o relatório PDF
export function calcularPresencaDia(
  horarioEntrada: string | null,
  registrosDia: RegistroPonto[]
): StatusPresenca {
  if (registrosDia.length === 0) return "Ausente";
  if (!horarioEntrada) return "Presente";

  const limiteAtraso = criarDataComHorario(horarioEntrada);
  limiteAtraso.setMinutes(limiteAtraso.getMinutes() + 10);

  const primeiraEntrada = new Date(registrosDia[0].entrada);
  return primeiraEntrada > limiteAtraso ? "Presente com atraso" : "Presente";
}

// Calcula o status para o dashboard do próprio acadêmico
export function calcularStatusPessoal(
  registrosHoje: RegistroPonto[],
  horarioEntrada: string | null,
  horarioSaida: string | null
): string {
  const entradaAberta = registrosHoje.find((r) => r.saida === null);

  if (entradaAberta) return "No expediente";

  if (!horarioEntrada || !horarioSaida) return "Expediente encerrado";

  const agora = new Date();
  const limiteAtraso = criarDataComHorario(horarioEntrada);
  const limiteFalta = criarDataComHorario(horarioSaida);
  const inicioValido = criarDataComHorario(horarioEntrada);

  limiteAtraso.setMinutes(limiteAtraso.getMinutes() + 10);
  inicioValido.setMinutes(inicioValido.getMinutes() - 10);

  const registrosDoExpediente = registrosHoje.filter(
    (r) => new Date(r.entrada) >= inicioValido
  );

  if (registrosDoExpediente.length === 0) {
    if (agora >= limiteAtraso && agora < limiteFalta) return "Atrasado";
    if (agora >= limiteFalta) return "Ausente";
    return "Aguardando entrada";
  }

  // Fix 2.4: com 2 expedientes, só encerra quando ambos estiverem fechados
  const fechados = registrosDoExpediente.filter((r) => r.saida !== null);
  if (fechados.length < 2 && agora < limiteFalta) return "Aguardando 2º expediente";

  return "Expediente encerrado";
}
