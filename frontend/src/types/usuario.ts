export interface Usuario {
  id: number;

  matricula: string;

  nome: string;

  email: string;

  ehAdmin: boolean;

  horarioEntrada: string | null;

  horarioSaida: string | null;

  token: string;
}