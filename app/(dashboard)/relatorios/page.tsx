"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import type { Transacao } from "@/types/transacao";

export default function Relatorios() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());

  useEffect(() => {
  api.get("/transacoes")
    .then((res) => setTransacoes(res.data))
    .catch((err) => console.error("Erro ao carregar transações:", err));
}, []);

  const transacoesAno = transacoes.filter((t) => new Date(t.data).getFullYear() === anoSelecionado);

  // ---- Totais gerais ----
  const totalEntradas = transacoesAno
    .filter((t) => t.tipo === "Entrada")
    .reduce((acc, t) => acc + t.valor, 0);

  const totalSaidas = transacoesAno
    .filter((t) => t.tipo === "Saída")
    .reduce((acc, t) => acc + t.valor, 0);

  const saldo = totalEntradas - totalSaidas;

  // ---- Totais por mês ----
  const meses = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];

  const totaisPorMes = meses.map((mes, index) => {
    const entradasMes = transacoesAno
      .filter((t) => new Date(t.data).getMonth() === index && t.tipo === "Entrada")
      .reduce((acc, t) => acc + t.valor, 0);

    const saidasMes = transacoesAno
      .filter((t) => new Date(t.data).getMonth() === index && t.tipo === "Saída")
      .reduce((acc, t) => acc + t.valor, 0);

    return {
      mes,
      entradas: entradasMes,
      saidas: saidasMes,
      saldo: entradasMes - saidasMes,
    };
  });

  // ---- Gastos por categoria ----
  const totalPorCategoria: Record<string, number> = {};
  transacoesAno
    .filter((t) => t.tipo === "Saída")
    .forEach((t) => {
      totalPorCategoria[t.categoria] = (totalPorCategoria[t.categoria] || 0) + t.valor;
    });

  const dataCategorias = Object.entries(totalPorCategoria).map(([categoria, valor]) => ({
    name: categoria,
    value: valor,
  }));

  // ---- Top 5 maiores gastos ----
  const topGastos = [...transacoesAno]
    .filter((t) => t.tipo === "Saída")
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const COLORS = [
    "#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0", "#9966FF",
    "#FF9F40", "#8A2BE2", "#3CB371", "#FF7F50", "#20B2AA"
  ];

  return (
    <div className="bg-white text-center rounded-2xl px-8 pt-1 pb-8 max-w-[1200px] my-4 mx-auto">
      <h2>Relatório Anual de {anoSelecionado}</h2>

      <div className="mb-4 text-[17px]">
        <label htmlFor="ano">Ano: </label>
        <select
          id="border-2 border-gray-300 rounded-2xl text-[#333] bg-transparent p-[5px] text-[15px]
         hover:bg-[#f0f8ff] hover:border-[#007bff] transition-all duration-500 ease-in-out"
          value={anoSelecionado}
          onChange={(e) => setAnoSelecionado(Number(e.target.value))}
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((ano) => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="flex-1 p-4 rounded-xl text-center bg-[#e3fcef] text-[#2e7d32]">Entradas: R$ {totalEntradas.toFixed(2)}</div>
        <div className="flex-1 p-4 rounded-xl text-center bg-[#fdecea] text-[#c62828]">Saídas: R$ {totalSaidas.toFixed(2)}</div>
        <div className="flex-1 p-4 rounded-xl text-center bg-[#e3f2fd] text-[#1565c0]">Saldo: R$ {saldo.toFixed(2)}</div>
      </div>

      <div className="flex gap-8 flex-wrap mb-8">
        <div className="flex-1 text-center min-w-[400px] bg-white rounded-xl p-4">
          <h3>Gastos por Mês</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={totaisPorMes} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="entradas" fill="#36A2EB" name="Entradas" />
              <Bar dataKey="saidas" fill="#FF6384" name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 text-center min-w-[400px] bg-white rounded-xl p-4">
          <h3>Gastos por Categoria</h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={dataCategorias}
                cx="50%"
                cy="50%"
                label={({ name, value }) => `${name}: R$ ${(value ?? 0).toFixed(2)}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {dataCategorias.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3>Resumo Mensal</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 text-center bg-[#f2f2f2]">Mês</th>
              <th className="border border-gray-300 p-2 text-center bg-[#f2f2f2]">Entradas (R$)</th>
              <th className="border border-gray-300 p-2 text-center bg-[#f2f2f2]">Saídas (R$)</th>
              <th className="border border-gray-300 p-2 text-center bg-[#f2f2f2]">Saldo (R$)</th>
            </tr>
          </thead>
          <tbody>
            {totaisPorMes.map((m, i) => (
              <tr key={i}>
                <td className="border border-gray-300 p-2 text-center">{m.mes}</td>
                <td className="border border-gray-300 p-2 text-center">{m.entradas.toFixed(2)}</td>
                <td className="border border-gray-300 p-2 text-center">{m.saidas.toFixed(2)}</td>
                <td className="border border-gray-300 p-2 text-center">{m.saldo.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl border-[3px] border-gray-300 mt-5 p-4">
        <h3 className="text-[1.4rem] text-[#333] mb-4 border-b-2 border-[#f0f0f0] pb-2">Top 5 Maiores Gastos</h3>
        {topGastos.length === 0 ? (
          <p>Nenhum gasto registrado no ano.</p>
        ) : (
          <ul className="list-none p-0 m-0">
            {topGastos.map((t, i) => (
              <li className="bg-[#eee] p-3 mb-3 rounded-md" key={i}>
                <strong className="text-[#333] font-semibold">{t.descricao}</strong> — {t.categoria} — R$ {t.valor.toFixed(2)} ({new Date(t.data).toLocaleDateString("pt-BR")})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}