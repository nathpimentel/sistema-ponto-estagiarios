import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ModalConfirmacao } from "../ModalConfirmacao";
import { calcularStatus } from "../../lib/statusPonto";
import type { Academico, RegistroPonto } from "../../types/ponto";

type ListaAcademicosProps = {
  academicos: Academico[];
  registros: RegistroPonto[];
  onExcluir: (id: number) => void;
};

const corPorStatus: Record<string, string> = {
  "No expediente": "bg-green-100 text-green-700",
  "Entrada com atraso": "bg-yellow-100 text-yellow-700",
  "Aguardando 2º expediente": "bg-blue-100 text-blue-700",
  "Aguardando entrada": "bg-slate-100 text-slate-700",
  "Expediente encerrado": "bg-slate-100 text-slate-700",
  Atrasado: "bg-orange-100 text-orange-700",
  Ausente: "bg-red-100 text-red-700",
};

function BadgeStatus({ texto }: { texto: string }) {
  const chave = Object.keys(corPorStatus).find((k) => texto.startsWith(k)) ?? "";
  const cor = corPorStatus[chave] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${cor}`}>
      {texto}
    </span>
  );
}

export function ListaAcademicos({ academicos, registros, onExcluir }: ListaAcademicosProps) {
  const [confirmarId, setConfirmarId] = useState<number | null>(null);

  function confirmarExclusao(id: number) {
    setConfirmarId(id);
  }

  function executarExclusao() {
    if (confirmarId !== null) {
      onExcluir(confirmarId);
      setConfirmarId(null);
    }
  }

  return (
    <>
      {confirmarId !== null && (
        <ModalConfirmacao
          mensagem="Tem certeza que deseja excluir este usuário?"
          onConfirmar={executarExclusao}
          onCancelar={() => setConfirmarId(null)}
        />
      )}

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">Usuários cadastrados</h2>

        <div className="mt-4 space-y-3">
          {academicos.map((academico) => {
            const statusTexto = calcularStatus(academico, registros);

            return (
              <div
                key={academico.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-800">{academico.nome}</h3>

                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                      {academico.ehAdmin ? "ADMINISTRADOR" : "ACADÊMICO BOLSISTA"}
                    </span>

                    {statusTexto && <BadgeStatus texto={statusTexto} />}
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {academico.matricula} · {academico.email}
                  </p>

                  {!academico.ehAdmin && academico.horarioEntrada && (
                    <p className="text-xs text-slate-400">
                      Expediente: {academico.horarioEntrada} às {academico.horarioSaida}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => confirmarExclusao(academico.id)}
                  className="ml-4 flex items-center justify-center rounded-xl p-2 text-red-500 transition hover:bg-red-100 hover:text-red-700"
                >
                  <Trash2 size={18} strokeWidth={2.2} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
