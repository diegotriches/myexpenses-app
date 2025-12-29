"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ContaModal from "@/components/contas/ContaModal";
import ContaCard from "@/components/contas/ContaCard";
import ConfirmDeleteModal from "@/components/contas/ConfirmDeleteModal";
import { ModalTransferencia } from "@/components/transferencias/ModalTransferencia";
import { Conta, CreateContaDTO, UpdateContaDTO } from "@/types/conta";
import { useContas } from "@/hooks/useContas";

import { BsBank } from "react-icons/bs";
import { MdAdd } from "react-icons/md";
import { Search } from "lucide-react";

type OrdenacaoType = "nome" | "saldo-maior" | "saldo-menor" | "recente";

export default function ContasPage() {
  const {
    contas,
    loading,
    error,
    criarConta,
    atualizarConta,
    removerConta,
  } = useContas();

  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [contaEdicao, setContaEdicao] = useState<Conta | null>(null);
  const [contaParaExcluir, setContaParaExcluir] = useState<Conta | null>(null);
  const [modalTransferenciaOpen, setModalTransferenciaOpen] = useState(false);
  const [contaOrigemSelecionada, setContaOrigemSelecionada] = useState<string | null>(null);
  
  // Busca e ordenação
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<OrdenacaoType>("nome");

  // Aplica busca e ordenação
  const contasFiltradas = useMemo(() => {
    let resultado = [...contas];

    // Busca por nome
    if (busca) {
      resultado = resultado.filter(c =>
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        c.banco?.toLowerCase().includes(busca.toLowerCase())
      );
    }

    // Ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case "nome":
          return a.nome.localeCompare(b.nome);
        case "saldo-maior":
          return b.saldoAtual - a.saldoAtual;
        case "saldo-menor":
          return a.saldoAtual - b.saldoAtual;
        case "recente":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return resultado;
  }, [contas, busca, ordenacao]);

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
      ativo: conta.ativo,
      banco: conta.banco,
      observacoes: conta.observacoes,
      saldoInicial: conta.saldoInicial,
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

  // Empty State Component
  const EmptyState = () => (
    <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
      <BsBank className="text-6xl text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Nenhuma conta cadastrada
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        Comece adicionando sua primeira conta bancária ou carteira digital para gerenciar suas finanças
      </p>
      <Button onClick={abrirNovaConta} size="lg" className="bg-blue-700 hover:bg-blue-900">
        <MdAdd className="mr-2 text-xl" />
        Adicionar Primeira Conta
      </Button>
    </div>
  );

  // Skeleton Loading
  const SkeletonCard = () => (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse bg-white dark:bg-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="flex gap-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
      </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BsBank className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            Contas
          </h1>
        </div>

        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          Gerencie suas contas bancárias e carteiras digitais
        </p>

        <hr className="border-t border-gray-300 dark:border-gray-700 my-4" />
      </div>

      {/* Barra de busca e ações */}
      {!loading && contas.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          {/* Busca */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <Input
              placeholder="Buscar por nome ou banco..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Ordenação */}
          <Select value={ordenacao} onValueChange={(v) => setOrdenacao(v as OrdenacaoType)}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome">Nome (A-Z)</SelectItem>
              <SelectItem value="saldo-maior">Maior Saldo</SelectItem>
              <SelectItem value="saldo-menor">Menor Saldo</SelectItem>
              <SelectItem value="recente">Mais Recente</SelectItem>
            </SelectContent>
          </Select>

          {/* Botão adicionar - desktop */}
          <Button 
            onClick={abrirNovaConta} 
            className="hidden md:flex items-center gap-2 bg-blue-700 hover:bg-blue-900 cursor-pointer"
          >
            <MdAdd className="text-xl" />
            Adicionar Conta
          </Button>
        </div>
      )}

      {/* Botão adicionar - mobile fixo */}
      <Button 
        onClick={abrirNovaConta} 
        className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 hover:bg-blue-900 z-50"
        size="icon"
      >
        <MdAdd className="text-2xl" />
      </Button>

      {/* Estados de carregamento e erro */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900">
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">Erro ao carregar contas</p>
          <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
        </div>
      ) : contas.length === 0 ? (
        <EmptyState />
      ) : contasFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <Search className="text-4xl text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">Nenhuma conta encontrada</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contasFiltradas.map((conta) => (
            <ContaCard
              key={conta.id}
              conta={conta}
              onEditar={editarConta}
              onExcluir={solicitarExclusao}
              onExtrato={(c) => router.push(`/contas/${c.id}/extrato`)}
              onTransferir={handleAbrirTransferencia}
            />
          ))}
        </div>
      )}

      {/* Modais */}
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
        description={`Tem certeza que deseja excluir a conta "${contaParaExcluir?.nome}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmarExclusao}
        onCancel={cancelarExclusao}
      />
    </div>
  );
}