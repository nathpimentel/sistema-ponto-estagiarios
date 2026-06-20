export type Academico = {
  id: number;
  matricula: string;
  nome: string;
  email: string;
  ehAdmin: boolean;
  horarioEntrada: string | null;
  horarioSaida: string | null;
  ativo: boolean;
};

export type RegistroPonto = {
  id: number;
  academicoId: number;
  nomeAcademico: string;
  entrada: string;
  saida: string | null;
  totalHoras: string | null;
};

export type StatusPresenca = "Presente" | "Presente com atraso" | "Ausente";
