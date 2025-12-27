"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MdAdd } from "react-icons/md";
import { BsArrowLeftRight } from "react-icons/bs";
import { Filter, X } from "lucide-react";

import FormMovimentacaoModal from "@/components/movimentacao/FormMovimentacaoModal";
import MovimentacaoTabela from "@/components/movimentacao/MovimentacaoTabela";
import ConfirmarEdicaoModal from "@/components/movimentacao/ConfirmarEdicaoModal";
import ConfirmarExclusaoModal from "@/components/movimentacao/ConfirmarExclusaoModal";
import { usePeriodo } from '@/components/PeriodoContext';
import { Card, CardContent } from "@/components/ui/card";

import { useTransacoes } from "@/hooks/useTransacoes";
import { useCartoes } from "@/hooks/useCartoes";
import { Transacao } from "@/types/transacao";

export default function MovimentacoesConteudo() {
  const {
    transacoes,
    loading,
    salvar,
    excluir,
  } = useTransacoes();

  const { cartoes, loading: loadingCartoes } = useCartoes();

  const [openModal, setOpenModal] = useState(false);
  const [editando, setEditando] = useState<Transacao | null>(null);

  const [modalEdicao, setModalEdicao] = useState(false);
  const [tipoEdicao, setTipoEdicao] =
    useState<"unica" | "todas_parcelas" | "toda_recorrencia">("unica");

  const [modalExcluir, setModalExcluir] = useState(false);
  const [itemExcluir, setItemExcluir] = useState<Transacao | null>(null);

  const { mesSelecionado, anoSelecionado } = usePeriodo();

  // ✅ NOVOS FILTROS
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "entrada" | "saida">("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("TODAS");
  const [filtroFormaPagamento, setFiltroFormaPagamento] = useState<string>("TODAS");
  const [filtroBusca, setFiltroBusca] = useState<string>("");
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  // Movimentações filtradas por período
  const movimentacoesPeriodo = transacoes.filter((mov) => {
    if (!mov.data) return false;
    const [ano, mes] = mov.data.split("T")[0].split("-").map(Number);
    return mes - 1 === mesSelecionado && ano === anoSelecionado;
  });

  // ✅ APLICAR FILTROS ADICIONAIS
  const movimentacoesFiltradas = movimentacoesPeriodo.filter((mov) => {
    // Filtro por tipo (receita/despesa)
    if (filtroTipo !== "TODOS" && mov.tipo !== filtroTipo) return false;

    // Filtro por categoria
    if (filtroCategoria !== "TODAS" && mov.categoria !== filtroCategoria) return false;

    // Filtro por forma de pagamento
    if (filtroFormaPagamento !== "TODAS" && mov.formaPagamento !== filtroFormaPagamento) return false;

    // Filtro por busca textual
    if (filtroBusca) {
      const busca = filtroBusca.toLowerCase();
      const descricao = mov.descricao?.toLowerCase() || "";
      const categoria = mov.categoria?.toLowerCase() || "";
      if (!descricao.includes(busca) && !categoria.includes(busca)) return false;
    }

    return true;
  });

  // ✅ EXTRAIR OPÇÕES ÚNICAS PARA OS FILTROS
  const categoriasUnicas = Array.from(
    new Set(movimentacoesPeriodo.map(m => m.categoria).filter(Boolean))
  ).sort();

  const formasPagamentoUnicas = Array.from(
    new Set(movimentacoesPeriodo.map(m => m.formaPagamento).filter(Boolean))
  ).sort();

  // ✅ CALCULAR RESUMO DAS MOVIMENTAÇÕES FILTRADAS
  const totalReceitas = movimentacoesFiltradas
    .filter(m => m.tipo === "entrada")
    .reduce((sum, m) => sum + Number(m.valor), 0);

  const totalDespesas = movimentacoesFiltradas
    .filter(m => m.tipo === "saida")
    .reduce((sum, m) => sum + Number(m.valor), 0);

  const balanco = totalReceitas - totalDespesas;

  // ✅ LIMPAR TODOS OS FILTROS
  const limparFiltros = () => {
    setFiltroTipo("TODOS");
    setFiltroCategoria("TODAS");
    setFiltroFormaPagamento("TODAS");
    setFiltroBusca("");
  };

  const temFiltrosAtivos = 
    filtroTipo !== "TODOS" || 
    filtroCategoria !== "TODAS" || 
    filtroFormaPagamento !== "TODAS" || 
    filtroBusca !== "";

  function abrirNovo() {
    setEditando(null);
    setOpenModal(true);
  }

  function editarItem(mov: Transacao) {
    const isParcelada = !!mov.parcelamentoId;
    const isRecorrente = !!mov.recorrenciaId;

    setEditando(mov);

    if (isParcelada || isRecorrente) {
      setModalEdicao(true);
    } else {
      setTipoEdicao("unica");
      setOpenModal(true);
    }
  }

  function confirmarExclusao(mov: Transacao) {
    setItemExcluir(mov);
    setModalExcluir(true);
  }

  async function handleExcluir(tipo: "unica" | "todas_parcelas" | "toda_recorrencia") {
    if (!itemExcluir) return;

    try {
      // CASO 1: Transferência (não deveria estar aqui, mas proteção)
      if (itemExcluir.transferenciaId) {
        alert("Transferências devem ser gerenciadas na página de Extrato ou Transferências");
        setModalExcluir(false);
        setItemExcluir(null);
        return;
      }

      // CASO 2: Transação normal
      await excluir(itemExcluir.id, tipo);

      setModalExcluir(false);
      setItemExcluir(null);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="max-w-[1100px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BsArrowLeftRight className="text-3xl text-blue-700" />
          <h1 className="text-2xl font-bold text-gray-900">Movimentações</h1>
        </div>
        <p className="text-gray-600 mb-4">
          Visualize e gerencie suas receitas e despesas
        </p>
        <hr className="border-t border-gray-300" />
      </div>

      {/* ✅ RESUMO RÁPIDO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Receitas</p>
            <p className="text-2xl font-bold text-green-600">
              R$ {totalReceitas.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {movimentacoesFiltradas.filter(m => m.tipo === "entrada").length} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Despesas</p>
            <p className="text-2xl font-bold text-red-600">
              R$ {totalDespesas.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {movimentacoesFiltradas.filter(m => m.tipo === "saida").length} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 mb-1">Balanço</p>
            <p className={`text-2xl font-bold ${balanco >= 0 ? "text-blue-600" : "text-orange-600"}`}>
              {balanco >= 0 ? "+" : ""} R$ {balanco.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {movimentacoesFiltradas.length} transações totais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ✅ BARRA DE AÇÕES E FILTROS */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Button
          variant="outline"
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {temFiltrosAtivos && (
            <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {[
                filtroTipo !== "TODOS",
                filtroCategoria !== "TODAS",
                filtroFormaPagamento !== "TODAS",
                filtroBusca !== ""
              ].filter(Boolean).length}
            </span>
          )}
        </Button>

        <Button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-700 hover:bg-blue-900 text-white"
        >
          <MdAdd className="text-xl" />
          Nova Movimentação
        </Button>
      </div>

      {/* ✅ PAINEL DE FILTROS */}
      {mostrarFiltros && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </h3>
              {temFiltrosAtivos && (
                <Button variant="ghost" size="sm" onClick={limparFiltros}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro de busca */}
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <Input
                  placeholder="Descrição ou categoria..."
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                />
              </div>

              {/* Filtro por tipo */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select value={filtroTipo} onValueChange={(v: any) => setFiltroTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todas</SelectItem>
                    <SelectItem value="entrada">Apenas Receitas</SelectItem>
                    <SelectItem value="saida">Apenas Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por categoria */}
              <div>
                <label className="text-sm font-medium mb-2 block">Categoria</label>
                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas</SelectItem>
                    {categoriasUnicas.map(cat => (
                      <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por forma de pagamento */}
              <div>
                <label className="text-sm font-medium mb-2 block">Forma de Pagamento</label>
                <Select value={filtroFormaPagamento} onValueChange={setFiltroFormaPagamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODAS">Todas</SelectItem>
                    {formasPagamentoUnicas.map(forma => (
                      <SelectItem key={forma} value={forma!}>
                        {forma === "dinheiro" ? "Dinheiro" : 
                         forma === "pix" ? "PIX" : 
                         forma === "cartao" ? "Cartão" : forma}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de movimentações */}
      <MovimentacaoTabela
        movimentacoes={movimentacoesFiltradas}
        loading={loading || loadingCartoes}
        cartoes={cartoes}
        onEditar={editarItem}
        onExcluir={confirmarExclusao}
      />

      {/* Modais */}
      <FormMovimentacaoModal
        open={openModal}
        onOpenChange={setOpenModal}
        transacaoEdicao={editando}
        modoEdicao={tipoEdicao}
        salvar={async (d) => {
          await salvar(d);
          setOpenModal(false);
        }}
      />

      <ConfirmarExclusaoModal
        open={modalExcluir}
        onClose={() => setModalExcluir(false)}
        transacao={itemExcluir}
        onConfirmar={handleExcluir}
      />

      <ConfirmarEdicaoModal
        open={modalEdicao}
        onClose={() => setModalEdicao(false)}
        transacao={editando}
        onConfirmar={(tipo) => {
          setTipoEdicao(tipo);
          setModalEdicao(false);
          setOpenModal(true);
        }}
      />
    </div>
  );
}