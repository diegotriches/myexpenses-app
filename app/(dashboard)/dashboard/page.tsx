"use client";

import { usePeriodo } from '@/components/PeriodoContext';
import { useEffect, useState } from "react";
import api from "@/services/api";

import type { Transacao } from "@/types/transacao";
import PeriodoSelector from "@/components/PeriodoSelector";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Props {
  transacoes: Transacao[];
}

interface Cartao {
  id: number;
  nome: string;
  tipo: "credito" | "debito";
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
}

interface FaturaCartao {
  cartao: string;
  totalFaturaAtual: number;
  limite: number;
  comprometido: number;
  disponivel: number;
}

export default function Home({ transacoes }: Props) {
  const { mesSelecionado, anoSelecionado } = usePeriodo();

  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [faturasCartoes, setFaturasCartoes] = useState<FaturaCartao[]>([]);

  const [nomeUsuario, setNomeUsuario] = useState<string>("");

  // Buscar usuário no backend
  useEffect(() => {
    const fetchUsuario = async () => {
      try {
        const res = await api.get("/usuarios");
        if (res.data && res.data.nome) {
          setNomeUsuario(res.data.nome);
        } else if (Array.isArray(res.data) && res.data.length > 0) {
          setNomeUsuario(res.data[0].nome);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do usuário:", err);
      }
    };
    fetchUsuario();
  }, []);

  // Buscar cartões no backend
  useEffect(() => {
    const fetchCartoes = async () => {
      try {
        const res = await api.get("/cartoes");
        const dadosNormalizados = res.data.map((c: any) => ({
          ...c,
          tipo: c.tipo?.toLowerCase() ?? "debito",
          limite: c.limite ?? 0,
        }));
        setCartoes(dadosNormalizados);
      } catch (err) {
        console.error("Erro ao carregar cartões:", err);
      }
    };
    fetchCartoes();
  }, []);

  // Calcular faturas e limites
  useEffect(() => {
    if (!(transacoes?.length) || !(cartoes?.length)) return;

    const novasFaturas: FaturaCartao[] = cartoes.map((cartao) => {
      // --- Fatura atual ---
      const fechamento = cartao.diaFechamento;
      const hoje = new Date();

      let inicioFatura: Date;
      let fimFatura: Date;

      if (hoje.getDate() > fechamento) {
        // fatura vigente: após fechamento até próximo fechamento
        inicioFatura = new Date(hoje.getFullYear(), hoje.getMonth(), fechamento + 1);
        fimFatura = new Date(hoje.getFullYear(), hoje.getMonth() + 1, fechamento);
      } else {
        // fatura anterior ainda em aberto
        inicioFatura = new Date(hoje.getFullYear(), hoje.getMonth() - 1, fechamento + 1);
        fimFatura = new Date(hoje.getFullYear(), hoje.getMonth(), fechamento);
      }

      // Transações desse cartão
      const transacoesCartao = transacoes.filter(
        (t) => t.formaPagamento === "cartao" && t.cartaoId === cartao.id
      );

      // Valor dentro da fatura atual
      const totalFaturaAtual = transacoesCartao
        .filter((t) => {
          const data = new Date(t.data);
          return data >= inicioFatura && data <= fimFatura;
        })
        .reduce((acc, t) => acc + t.valor, 0);

      // Comprometimento do limite (todas as compras não pagas até agora e futuras)
      const comprometido = transacoesCartao.reduce((acc, t) => acc + t.valor, 0);

      const disponivel = cartao.limite - comprometido;

      return {
        cartao: cartao.nome,
        totalFaturaAtual,
        limite: cartao.limite,
        comprometido,
        disponivel,
      };
    });

    setFaturasCartoes(novasFaturas);
  }, [transacoes, cartoes]);

  const transacoesFiltradas = (transacoes ?? []).filter((t) => {
    const data = new Date(t.data);
    return (
      data.getMonth() === mesSelecionado &&
      data.getFullYear() === anoSelecionado
    );
  });

  const totalEntradas = transacoesFiltradas
    .filter((t) => t.tipo === "Entrada")
    .reduce((acc, t) => acc + t.valor, 0);

  const totalSaidas = transacoesFiltradas
    .filter((t) => t.tipo === "Saída")
    .reduce((acc, t) => acc + t.valor, 0);

  const saldo = totalEntradas - totalSaidas;
  const numeroTransacoes = transacoesFiltradas.length;
  const maiorGasto = transacoesFiltradas
    .filter((t) => t.tipo === "Saída")
    .reduce((max, t) => (t.valor > max ? t.valor : max), 0);

  // Gráfico de Barras → Entradas x Saídas
  const dataBarChart = [
    { name: "Entradas", value: totalEntradas },
    { name: "Saídas", value: totalSaidas },
  ];

  const COLORS_BARRAS = ["#00C49F", "#FF4C4C"];

  // Gráfico de Pizza → Gastos por categoria
  const totalPorCategoria: Record<string, number> = {};
  transacoesFiltradas
    .filter((t) => t.tipo === "Saída")
    .forEach((t) => {
      totalPorCategoria[t.categoria] =
        (totalPorCategoria[t.categoria] || 0) + t.valor;
    });

  const dataPieChart = Object.entries(totalPorCategoria).map(([categoria, valor]) => ({
    name: categoria,
    value: valor,
  }));

  const COLORS_PIE = [
    "#FF6384", "#36A2EB", "#FFCE56", "#8A2BE2", "#FF7F50",
    "#00CED1", "#3CB371", "#FFD700", "#FF69B4", "#87CEEB"
  ];

  return (
    <>
      <PeriodoSelector />
      <div className="bg-white rounded-xl px-8 pt-1 pb-8 max-w-[1200px] mx-auto mt-4">
        <h1>Bem-vindo(a){nomeUsuario ? `, ${nomeUsuario}` : ""}!</h1>
        <h3>Gerencie suas finanças pessoais de forma prática e organizada.</h3>
        <div className="p-5 faturas-cartoes">
          <h4 className='text-[1.3rem] mb-4 font-semibold text-gray-800'>Cartões</h4>
          {faturasCartoes.length === 0 ? (
            <p className="text-center text-gray-500 italic">Nenhum cartão cadastrado.</p>
          ) : (
            <div className="grid gap-5 lista-cartoes">
              {faturasCartoes.map((f, i) => {
                const percentualUsado = f.limite > 0 ? (f.comprometido / f.limite) * 100 : 0;

                let corBarra = "#4CAF50"; // verde
                if (percentualUsado > 80) corBarra = "#FF4C4C"; // vermelho
                else if (percentualUsado > 50) corBarra = "#FFC107"; // amarelo

                return (
                  <div key={i} className="bg-gradient-to-br from-[#f9fafb] to-[#f1f1f1] rounded-xl p-4 shadow-md flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="text-[1.2rem] mb-2 text-gray-900">
                      <h3>{f.cartao}</h3>
                    </div>

                    <div className="text-[0.95rem] text-gray-700 leading-relaxed mb-3">
                      <p><strong>Fatura atual:</strong> R$ {f.totalFaturaAtual.toFixed(2)}</p>
                      <p><strong>Limite total:</strong> R$ {f.limite.toFixed(2)}</p>
                      <p><strong>Comprometido:</strong> R$ {f.comprometido.toFixed(2)}</p>
                      <p><strong>Disponível:</strong> R$ {f.disponivel.toFixed(2)}</p>
                    </div>

                    <div className="h-[10px] bg-gray-300 rounded-lg overflow-hidden mt-1">
                      <div
                        className="h-full rounded-lg transition-all duration-400 progresso"
                        style={{ width: `${percentualUsado}%`, backgroundColor: corBarra }}
                      ></div>
                    </div>

                    <p className="mt-1 text-right text-[0.85rem] text-gray-600">
                      {percentualUsado.toFixed(0)}% do limite utilizado
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex p-4 gap-4 cards-container">
          <div className="bg-[#e3f2fd] text-[#1565c0] flex-1 rounded-xl text-center font-bold p-4 card">
            <p>Saldo: R$ {saldo.toFixed(2)}</p>
          </div>
          <div className="bg-[#e3fcef] text-[#2e7d32] flex-1 rounded-xl text-center font-bold p-4 card">
            <p>Total de Transações: {numeroTransacoes}</p>
          </div>
          <div className="bg-[#fdecea] text-[#c62828] flex-1 rounded-xl text-center font-bold p-4 card">
            <p>Maior Gasto: R$ {maiorGasto.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 graficos-relatorios">
          <div className="bg-white rounded-xl p-4 grafico-card-home">
            <h3 className='text-center mb-4 text-[#2c3e50]'>Entradas x Saídas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataBarChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="value" isAnimationActive>
                  {dataBarChart.map((_, index) => (
                    <Cell key={`bar-${index}`} fill={COLORS_BARRAS[index % COLORS_BARRAS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl p-4 grafico-card-home">
            <h3 className='text-center mb-4 text-[#2c3e50]'>Gastos por Categoria</h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={dataPieChart}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: R$ ${(value ?? 0).toFixed(2)}`}
                >
                  {dataPieChart.map((_, index) => (
                    <Cell key={`slice-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}