import { useState } from "react";
import type { RegistroPonto } from "../../types/ponto";

type PainelRegistrosProps = {
  registros: RegistroPonto[];
};

function formatarData(data: string) {
  const dataSemHora = data.split("T")[0];
  const [ano, mes, dia] = dataSemHora.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatarHora(data: string | null) {
  if (!data) return "--:--";
  return new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarTotal(total: string | null) {
  if (!total) return "Em andamento";
  return total.split(".")[0];
}

function extrairData(iso: string) {
  const [ano, mes, dia] = iso.split("T")[0].split("-").map(Number);
  return { dia, mes: mes - 1, ano };
}

export function PainelRegistros({ registros }: PainelRegistrosProps) {
  const [filtroNome, setFiltroNome] = useState("");
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState(new Date());

  const mesAtual = mesSelecionado.getMonth();
  const anoAtual = mesSelecionado.getFullYear();

  const diasDoMes = Array.from(
    { length: new Date(anoAtual, mesAtual + 1, 0).getDate() },
    (_, i) => i + 1
  );

  const nomeMes = mesSelecionado.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const termoBusca = filtroNome.trim().toLowerCase();

  const registrosFiltrados = registros
    .filter((r) => {
      const { dia, mes, ano } = extrairData(r.entrada);
      const passouBusca = !termoBusca || String(r.nomeAcademico || "").toLowerCase().includes(termoBusca);
      const passouDia = diaSelecionado === null || dia === diaSelecionado;
      return passouBusca && passouDia && mes === mesAtual && ano === anoAtual;
    })
    .sort((a, b) => new Date(b.entrada).getTime() - new Date(a.entrada).getTime());

  const registrosAgrupadosPorDia = registrosFiltrados.reduce(
    (grupos: Record<string, RegistroPonto[]>, r) => {
      const chave = formatarData(r.entrada).toUpperCase();
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(r);
      return grupos;
    },
    {}
  );

  function temRegistroNoDia(dia: number) {
    return registros.some((r) => {
      const { dia: d, mes: m, ano: a } = extrairData(r.entrada);
      return d === dia && m === mesAtual && a === anoAtual;
    });
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">Registros de Ponto</h2>

        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Buscar por nome"
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
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{nomeMes}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setMesSelecionado(new Date(anoAtual, mesAtual - 1, 1)); setDiaSelecionado(null); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50"
            >
              &lt;
            </button>
            <button
              onClick={() => { setMesSelecionado(new Date(anoAtual, mesAtual + 1, 1)); setDiaSelecionado(null); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50"
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDiaSelecionado(null)}
            className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
              diaSelecionado === null ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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
              {temRegistroNoDia(dia) && (
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

        {Object.entries(registrosAgrupadosPorDia).map(([data, grupo]) => (
          <div key={data}>
            <p className="mb-4 text-sm font-extrabold uppercase tracking-wide text-blue-900">{data}</p>
            <div className="space-y-3">
              {grupo.map((registro) => (
                <div key={registro.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                  <div className="flex items-start justify-between gap-8">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{registro.nomeAcademico ?? "Não informado"}</p>
                      <p className="text-sm text-slate-500">ID: {registro.academicoId}</p>
                    </div>
                    <div className="flex gap-10 text-sm">
                      <div>
                        <p className="font-bold text-slate-700">Entrada</p>
                        <p className="mt-1 text-slate-900">{formatarHora(registro.entrada)}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">Saída</p>
                        <p className="mt-1 text-slate-900">{formatarHora(registro.saida)}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-700">Total</p>
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
        ))}
      </div>
    </section>
  );
}
