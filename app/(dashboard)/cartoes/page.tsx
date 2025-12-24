"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { usePeriodo } from "@/components/PeriodoContext";
import { Button } from "@/components/ui/button";
import { BsCreditCard } from "react-icons/bs";
import { MdAdd } from "react-icons/md";

import CartaoFormModal from "@/components/cartoes/CartaoFormModal";
import CartaoItem from "@/components/cartoes/CartaoItem";

import { Cartao } from "@/types/cartao";
import { cartaoService } from "@/services/cartaoService";
import { useTransacoes } from "@/hooks/useTransacoes";
import type { Transacao } from "@/types/transacao";


export default function CartoesPage() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [cartaoEdicao, setCartaoEdicao] = useState<Cartao | null>(null);
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  const router = useRouter();

  const {
    transacoes,
  } = useTransacoes();

  const carregarCartoes = useCallback(async () => {
    try {
      const data = await cartaoService.listar();
      setCartoes(data);
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
    }
  }, []);

  const transacoesPorCartao = useMemo(() => {
    const map = new Map<number, { valor: number | string; cartaoId: number }[]>();

    transacoes.forEach((t) => {
      if (typeof t.cartaoId === "number") {
        const lista = map.get(t.cartaoId) ?? [];

        lista.push({
          valor: t.valor,
          cartaoId: t.cartaoId,
        });

        map.set(t.cartaoId, lista);
      }
    });

    return map;
  }, [transacoes]);

  useEffect(() => {
    carregarCartoes();
  }, [carregarCartoes]);

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

  const abrirFatura = (cartaoId: number) => {
    router.push(`/cartoes/${cartaoId}/fatura`);
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {cartoes.map((cartao) => (
          <CartaoItem
            key={cartao.id}
            cartao={cartao}
            movimentacoes={transacoesPorCartao.get(cartao.id) ?? []}
            onEditar={abrirEdicao}
            onExcluir={excluir}
            onFatura={abrirFatura}
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