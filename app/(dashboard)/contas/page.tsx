"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import ContaModal from "@/components/contas/ContaModal";
import ContaCard from "@/components/contas/ContaCard";
import ConfirmDeleteModal from "@/components/contas/ConfirmDeleteModal";
import { ModalTransferencia } from "@/components/transferencias/ModalTransferencia";
import { Conta, CreateContaDTO, UpdateContaDTO } from "@/types/conta";
import { useContas } from "@/hooks/useContas";

import { BsBank } from "react-icons/bs";

export default function ContasPage() {
  const {
    contas,
    loading,
    error,
    criarConta,
    atualizarConta,
    removerConta,
  } = useContas();

  const [modalOpen, setModalOpen] = useState(false);
  const [contaEdicao, setContaEdicao] = useState<Conta | null>(null);
  const [contaParaExcluir, setContaParaExcluir] = useState<Conta | null>(null);
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);
  const [contaOrigemSelecionada, setContaOrigemSelecionada] = useState<string | null>(null);

  function abrirNovaConta() {
    setContaEdicao(null);
    setModalOpen(true);
  }

  async function salvarConta(data: CreateContaDTO | UpdateContaDTO) {
    if (contaEdicao) {
      await atualizarConta(contaEdicao.id, data as UpdateContaDTO);
    } else {
      await criarConta(data as CreateContaDTO);
    }

    setModalOpen(false);
    setContaEdicao(null);
  }

  function editarConta(conta: Conta) {
    const dto: CreateContaDTO = {
      nome: conta.nome,
      tipo: conta.tipo,
      ativo: conta.ativo,
      banco: conta.banco,
      observacoes: conta.observacoes,
      saldoInicial: conta.saldoInicial,

      bandeira: "bandeira" in conta ? conta.bandeira : undefined,
      ultimosDigitos: "ultimosDigitos" in conta ? conta.ultimosDigitos : undefined,
      limite: "limite" in conta ? conta.limite : undefined,
      fechamentoFatura: "fechamentoFatura" in conta ? conta.fechamentoFatura : undefined,
      vencimentoFatura: "vencimentoFatura" in conta ? conta.vencimentoFatura : undefined,
    };

    setContaEdicao({ ...conta, ...dto });
    setModalOpen(true);
  }

  function solicitarExclusao(conta: Conta) {
    setContaParaExcluir(conta);
  }

  async function confirmarExclusao() {
    if (!contaParaExcluir) return;

    await removerConta(contaParaExcluir.id);
    setContaParaExcluir(null);
  }

  function cancelarExclusao() {
    setContaParaExcluir(null);
  }

  const handleAbrirTransferencia = (contaOrigemId: string) => {
    setContaOrigemSelecionada(contaOrigemId);
    setModalTransferenciaOpen(true);
  };

  const handleFecharTransferencia = () => {
    setModalTransferenciaOpen(false);
    setContaOrigemSelecionada(null);
  };

  return (
    <div className="max-w-[1100px] mx-auto p-6 space-y-8">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BsBank className="text-3xl text-blue-700" />
          <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
        </div>

        <p className="text-gray-600">
          Registre e gerencie suas contas bancárias e cartões.
        </p>

        <hr className="border-t border-gray-300 my-4" />
      </div>

      {/* Ações */}
      <div className="flex justify-end">
        <Button onClick={abrirNovaConta} className="bg-blue-700 hover:bg-blue-900">
          Adicionar Nova Conta
        </Button>
      </div>

      {/* Estados */}
      {loading && (
        <p className="text-sm text-gray-500">Carregando contas...</p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Lista de contas */}
      {!loading && contas.length === 0 && (
        <p className="text-sm text-gray-500">
          Nenhuma conta cadastrada.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contas.map((conta) => (
          <ContaCard
            key={conta.id}
            conta={conta}
            onEditar={editarConta}
            onExcluir={solicitarExclusao}
            onExtrato={() => console.log("Extrato", conta)}
            onTransferir={handleAbrirTransferencia}
          />
        ))}
      </div>

      {/* Modal */}
      <ContaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        contaInicial={contaEdicao ?? undefined}
        onSalvar={salvarConta}
      />

      <ModalTransferencia
        open={modalTransferenciaOpen}
        onClose={handleFecharTransferencia}
        contas={contas}
        contaOrigemInicialId={contaOrigemSelecionada}
      />

      <ConfirmDeleteModal
        open={!!contaParaExcluir}
        title="Excluir conta"
        description={`Tem certeza que deseja excluir a conta "${contaParaExcluir?.nome}"?`}
        onConfirm={confirmarExclusao}
        onCancel={cancelarExclusao}
      />
    </div>
  );
}