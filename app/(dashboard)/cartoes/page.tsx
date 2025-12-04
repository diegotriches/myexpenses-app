"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
import api from "@/services/api";

import { BsPlusCircle, BsArrowLeft, BsTrash, BsPencil } from "react-icons/bs";

interface Cartao {
  id: number;
  nome: string;
  tipo: string; // "Crédito" | "Débito"
  limite?: number | null;
  diaFechamento?: number | null;
  diaVencimento?: number | null;
}

export default function Cartoes() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("Crédito");
  const [limite, setLimite] = useState<number | "">("");
  const [diaFechamento, setDiaFechamento] = useState<number | "">("");
  const [diaVencimento, setDiaVencimento] = useState<number | "">("");

  const [editandoId, setEditandoId] = useState<number | null>(null);

  const router = useRouter();

  // Carregar cartões
  useEffect(() => {
    api.get<Cartao[]>("/cartoes")
      .then(res => setCartoes(res.data))
      .catch((err: AxiosError) => console.error("Erro ao carregar cartões:", err.message));
  }, []);

  // Adicionar ou atualizar cartão
  const salvarCartao = () => {
    if (!nome) return alert("Digite um nome para o cartão");

    const novoCartao = {
      nome,
      tipo,
      limite: tipo === "Crédito" ? Number(limite) : null,
      diaFechamento: tipo === "Crédito" ? Number(diaFechamento) : null,
      diaVencimento: tipo === "Crédito" ? Number(diaVencimento) : null,
    };

    if (editandoId) {
      // Atualizar
      api.put<Cartao>(`/cartoes/${editandoId}`, novoCartao)
        .then((res) => {
          setCartoes(cartoes.map((c) => (c.id === editandoId ? res.data : c)));
          resetForm();
        })
        .catch((err: AxiosError) => console.error("Erro ao editar cartão:", err.message));
    } else {
      // Adicionar
      api.post<Cartao>("/cartoes", novoCartao)
        .then((res) => {
          setCartoes([...cartoes, res.data]);
          resetForm();
        })
        .catch((err: AxiosError) => console.error("Erro ao adicionar cartão:", err.message));
    }
  };

  // Editar cartão
  const editarCartao = (cartao: Cartao) => {
    setEditandoId(cartao.id);
    setNome(cartao.nome);
    setTipo(cartao.tipo);
    setLimite(cartao.limite ?? "");
    setDiaFechamento(cartao.diaFechamento ?? "");
    setDiaVencimento(cartao.diaVencimento ?? "");
  };

  // Excluir cartão
  const excluirCartao = (id: number) => {
    if (!window.confirm("Deseja realmente excluir este cartão?")) return;

    api.delete(`/cartoes/${id}`)
      .then(() => {
        setCartoes(cartoes.filter((c) => c.id !== id));
      })
      .catch((err: AxiosError) => console.error("Erro ao excluir cartão:", err.message));
  };

  // Resetar formulário
  const resetForm = () => {
    setEditandoId(null);
    setNome("");
    setTipo("Crédito");
    setLimite("");
    setDiaFechamento("");
    setDiaVencimento("");
  };

  return (
    <>
      <div id="add-categoria">
        <div id="top-btn">
          <button onClick={() => router.push("/formmovimentacao")}>
            <BsArrowLeft /> Voltar
          </button>
          <h3>Cadastro de Cartões</h3>
        </div>

        <div className="linha-1">
          <input
            type="text"
            placeholder="Nome do cartão"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />

          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="Crédito">Crédito</option>
            <option value="Débito">Débito</option>
          </select>
        </div>
        {tipo === "Crédito" && (
          <div className="linha-1">
            <input
              type="number"
              placeholder="Limite de crédito"
              value={limite}
              onChange={(e) =>
                setLimite(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
            <input
              type="number"
              placeholder="Dia de fechamento"
              value={diaFechamento}
              onChange={(e) =>
                setDiaFechamento(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min={1}
              max={31}
            />
            <input
              type="number"
              placeholder="Dia de vencimento"
              value={diaVencimento}
              onChange={(e) =>
                setDiaVencimento(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min={1}
              max={31}
            />
          </div>
        )}

        <button onClick={salvarCartao}>
          {editandoId ? "Salvar Edição" : <BsPlusCircle />}
        </button>
        {editandoId && (
          <button onClick={resetForm} style={{ marginLeft: "10px" }}>
            Cancelar
          </button>
        )}
      </div>

      <div id="categoria-container">
        <h3>Meus Cartões</h3>
        <ul>
          {cartoes.map((c) => (
            <li key={c.id}>
              {c.nome} - {c.tipo}
              {c.tipo === "Crédito" && (
                <span>
                  {" "} | Limite: R$ {c.limite?.toFixed(2)} | Fechamento:{" "}
                  {c.diaFechamento} | Vencimento: {c.diaVencimento}
                </span>
              )}
              <button onClick={() => editarCartao(c)}>
                <BsPencil />
              </button>
              <button onClick={() => excluirCartao(c.id)}>
                <BsTrash />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}