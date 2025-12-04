"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import api from "@/services/api";

import { BsArrowLeft } from "react-icons/bs";

interface Movimentacao {
  id: number;
  tipo: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
}

export default function Historico() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"entrada" | "saída" | "todos">("todos");
  const [anoSelecionado, setAnoSelecionado] = useState<number>(new Date().getFullYear());

  const carregarHistoricoAno = async () => {
    try {
      const res = await api.get("/transacoes");
      const todas = res.data as Movimentacao[];

      // Filtra por ano e tipo
      const filtradas = todas.filter((m) => {
        const ano = new Date(m.data).getFullYear();
        const tipoCorreto =
          filtroTipo === "todos" ? true : m.tipo.toLowerCase() === filtroTipo;
        return ano === anoSelecionado && tipoCorreto;
      });

      setMovimentacoes(filtradas);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  };

  useEffect(() => {
    carregarHistoricoAno();
  }, [filtroTipo, anoSelecionado]);

  return (
    <div className="relatorios-container">
      <h2>📅 Histórico de Movimentações - {anoSelecionado}</h2>

      <div className="filtro-ano">
        <Link href="/movimentacao">
          <button><BsArrowLeft />Voltar</button>
        </Link>

        <label style={{ marginLeft: "20px" }}>Tipo:</label>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as any)}>
          <option value="todos">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="saída">Saídas</option>
        </select>

        <label style={{ marginLeft: "20px" }}>Ano:</label>
        <input
          type="number"
          value={anoSelecionado}
          onChange={(e) => setAnoSelecionado(Number(e.target.value))}
          style={{ width: "100px" }}
        />
      </div>

      {movimentacoes.length === 0 ? (
        <p>Nenhuma movimentação encontrada.</p>
      ) : (
        <table border={1} cellPadding={6} style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {movimentacoes.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.data).toLocaleDateString("pt-BR")}</td>
                <td>{m.descricao}</td>
                <td>{m.categoria}</td>
                <td>{m.tipo}</td>
                <td>{m.valor.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}