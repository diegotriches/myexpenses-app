"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { BsCreditCard } from "react-icons/bs";
import { MdAdd } from "react-icons/md";

import CartaoFormModal from "@/components/cartoes/CartaoFormModal";
import CartaoItem from "@/components/cartoes/CartaoItem";

import { Cartao } from "@/types/cartao";
import { cartaoService } from "@/services/cartaoService";
import { useMovimentacoes } from "@/hooks/useMovimentacoes";
import type { Transacao } from "@/types/transacao";


export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [cartaoEdicao, setCartaoEdicao] = useState<Cartao | null>(null);

  // Hook oficial que você possui
  const {
    movimentacoes,
    carregar: carregarMovimentacoes,
  } = useMovimentacoes();

  const carregarCartoes = useCallback(async () => {
    try {
      const data = await cartaoService.listar();
      setCartoes(data);
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
    }
  }, []);

  useEffect(() => {
    carregarCartoes();
    carregarMovimentacoes(); // agora usando o hook corretamente
  }, [carregarCartoes, carregarMovimentacoes]);

  const abrirNovo = () => {
    setCartaoEdicao(null);
    setModalOpen(true);
  };

  const abrirEdicao = (cartao: Cartao) => {
    setCartaoEdicao(cartao);
    setModalOpen(true);
  };

  const salvar = async (dados: Cartao) => {
    if (cartaoEdicao) {
      await cartaoService.atualizar(cartaoEdicao.id, dados);
    } else {
      await cartaoService.criar(dados);
    }
    await carregarCartoes();
  };

  const excluir = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir este cartão?")) return;

    await cartaoService.remover(id);
    await carregarCartoes();
  };

  return (
    <div className="max-w-[1000px] mx-auto p-6 space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-3">
          <BsCreditCard className="text-3xl text-blue-700" />
          <h1 className="text-2xl font-bold text-gray-900">Cartões</h1>
        </div>

        <p className="text-gray-600 mb-6">
          Gerencie seus cartões cadastrados e controle limites, bandeiras e empresas emissoras.
        </p>

        <hr className="border-t border-gray-300 my-4" />
      </header>

      <div className="flex justify-end mb-6">
        <Button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 hover:bg-blue-900"
        >
          <MdAdd className="text-xl" />
          Adicionar Cartão
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cartoes.map((cartao) => (
          <CartaoItem
            key={cartao.id}
            cartao={cartao}
            movimentacoes={
              Array.isArray(movimentacoes)
                ? movimentacoes
                  .filter(
                    (mov): mov is Transacao & { cartaoId: number } =>
                      typeof mov.cartaoId === "number" && mov.cartaoId === cartao.id
                  )
                : []
            }
            onEditar={abrirEdicao}
            onExcluir={excluir}
          />
        ))}
      </div>

      <CartaoFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        cartaoEdicao={cartaoEdicao}
        salvar={salvar}
      />
    </div>
  );
}