"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import FormMovimentacaoModal from "@/components/FormMovimentacaoModal";
import { Transacao } from "@/types/transacao";
import { useCartoes } from "@/hooks/useCartoes";
import { MdAdd } from "react-icons/md";
import { BsArrowLeftRight } from "react-icons/bs";

export default function MovimentacoesPage() {
  const [movimentacoes, setMovimentacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editando, setEditando] = useState<Transacao | null>(null);

  // >>> NOVO: carregando os cartões
  const { cartoes, loading: loadingCartoes } = useCartoes();

  async function carregar() {
    setLoading(true);
    try {
      const resp = await fetch("/api/transacoes");
      const data = await resp.json();
      setMovimentacoes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function salvarMovimentacao(dados: Transacao) {
    const url = editando ? `/api/transacoes/${dados.id}` : "/api/transacoes";

    const method = editando ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    setEditando(null);
    await carregar();
  }

  function abrirNovo() {
    setEditando(null);
    setOpenModal(true);
  }

  function editar(mov: Transacao) {
    setEditando(mov);
    setOpenModal(true);
  }

  async function excluir(id: number) {
    if (!confirm("Tem certeza que deseja excluir esta movimentação?")) return;

    await fetch(`/api/transacoes/${id}`, { method: "DELETE" });
    carregar();
  }

  // >>> NOVO: função para encontrar cartão
  function buscarCartao(cartaoId?: number | null) {
    if (!cartaoId) return null;
    return cartoes.find((c) => c.id === cartaoId) || null;
  }

  return (
    <div className="max-w-[900px] mx-auto p-6 space-y-8">

      {/* TÍTULO COM ÍCONE E DESCRIÇÃO */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BsArrowLeftRight className="text-3xl text-blue-700" />
          <h1 className="text-2xl font-bold text-gray-900">Movimentação</h1>
        </div>
        <p className="text-gray-600 mb-6">
          Visualize e gerencie suas movimentações financeiras, incluindo entradas, saídas e pagamentos. Com tudo organizado em um só lugar, você consegue acompanhar facilmente o fluxo de dinheiro e tomar decisões mais conscientes.
        </p>
        <hr className="border-t border-gray-300 my-4" />
      </div>

      {/* BOTÃO DE ADICIONAR NOVA MOVIMENTAÇÃO */}
      <div className="flex justify-end mb-6">
        <Button onClick={abrirNovo} className="flex cursor-pointer items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-900 transition">
          <MdAdd className="text-xl" />
          Nova Movimentação
        </Button>
      </div>

      {/* TABELA DE MOVIMENTAÇÕES */}
      {loading || loadingCartoes ? (
        <p className="text-gray-600">Carregando...</p>
      ) : movimentacoes.length === 0 ? (
        <p className="text-gray-600">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="border rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-100">
                <th className="p-3 text-sm font-semibold text-gray-700">Data</th>
                <th className="p-3 text-sm font-semibold text-gray-700">Descrição</th>
                <th className="p-3 text-sm font-semibold text-gray-700">Categoria</th>
                <th className="p-3 text-sm font-semibold text-gray-700">Valor</th>
                <th className="p-3 text-sm font-semibold text-gray-700">Pagamento</th>
                <th className="p-3 text-sm font-semibold text-gray-700">Parcela</th>
                <th className="p-3 text-sm font-semibold text-gray-700"></th>
              </tr>
            </thead>

            <tbody>
              {movimentacoes.map((m) => {
                const cartao = buscarCartao(m.cartaoId);

                return (
                  <tr key={m.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3 text-sm">{m.data}</td>
                    <td className="p-3 text-sm">{m.descricao || "-"}</td>
                    <td className="p-3 text-sm">{m.categoria}</td>
                    <td
                      className={`p-3 text-sm font-medium ${m.tipo === "saida" ? "text-red-600" : "text-green-600"
                        }`}
                    >
                      R$ {m.valor.toFixed(2)}
                    </td>
                    <td className="p-3 text-sm">
                      {m.formaPagamento === "dinheiro" && "Dinheiro"}
                      {m.formaPagamento === "pix" && "Pix"}
                      {m.formaPagamento === "cartao" && (
                        <>
                          Cartão:{" "}
                          {cartao
                            ? `${cartao.nome} (${cartao.bandeira})`
                            : "Cartão não encontrado"}
                        </>
                      )}
                    </td>
                    <td className="p-3 text-sm">{m.parcela || "-"}</td>
                    <td className="p-3 text-sm flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => editar(m)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => excluir(m.id)}>
                        Excluir
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      <FormMovimentacaoModal
        open={openModal}
        onOpenChange={setOpenModal}
        transacaoEdicao={editando}
        salvar={salvarMovimentacao}
      />
    </div>
  );
}
