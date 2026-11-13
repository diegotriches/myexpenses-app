"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MdAdd } from "react-icons/md";
import { BsArrowLeftRight, BsBank } from "react-icons/bs";
import { AlertCircle, Repeat, List, Layers } from "lucide-react";

import FormMovimentacaoModal from "@/components/transacoes/FormMovimentacaoModal";
import MovimentacaoTabela from "@/components/transacoes/MovimentacaoTabela";
import ConfirmarEdicaoModal from "@/components/transacoes/ConfirmarEdicaoModal";
import ConfirmarExclusaoModal from "@/components/transacoes/ConfirmarExclusaoModal";
import FaturaFechadaModal from "@/components/transacoes/FaturaFechadaModal";
import FiltrosMovimentacoes, { FiltrosState } from "@/components/transacoes/FiltrosMovimentacoes";
import RecorrenciasTab from "@/components/transacoes/RecorrenciasTab";
import ParcelasTab from "@/components/transacoes/ParcelasTab";

import {
  useTransacoes,
  useCriarTransacao,
  useAtualizarTransacao,
  useExcluirTransacao,
} from "@/hooks/useTransacoes";
import { useCriarRecorrencia } from "@/hooks/useRecorrencias";
// ✅ NOVO
import { useTodasAntecipacoes } from "@/hooks/useParcelamentos";
import { useToast } from "@/hooks/use-toast";
import { useCartoes } from "@/hooks/useCartoes";
import { useContas } from "@/hooks/useContas";
import { Transacao, ModoEdicao } from "@/types/transacao";
import { calcularFaturaDaTransacao } from "@/utils/faturaUtils";
import { useFaturas } from "@/hooks/useFaturas";
import { ehAtualizacaoTransacao, type DadosSalvarTransacao } from "@/types/transacao";
import type { CreateRecorrenciaDTO } from "@/types/recorrencia";
import { PageHeader } from "@/components/common/PageHeader";
import { AbasSecao } from "@/components/common/AbasSecao";

export default function TransacoesPage() {
  const router = useRouter();
  const { toast } = useToast();

  const { data: transacoes = [], isLoading: loadingTransacoes } = useTransacoes();
  const { data: cartoes    = [], isLoading: loadingCartoes    } = useCartoes();
  const { data: contas     = [], isLoading: loadingContas     } = useContas();
  const { buscarFatura }                                        = useFaturas();

  const criarTransacao     = useCriarTransacao();
  const atualizarTransacao = useAtualizarTransacao();
  const excluirTransacao   = useExcluirTransacao();
  const criarRecorrencia   = useCriarRecorrencia();

  // ✅ NOVO: usado pra calcular quais transações estão bloqueadas (fazem
  // parte de uma antecipação pendente — fatura ainda não paga)
  const { data: todasAntecipacoes = [] } = useTodasAntecipacoes();

  const [openModal,          setOpenModal]          = useState(false);
  const [editando,           setEditando]           = useState<Transacao | null>(null);
  const [modalEdicao,        setModalEdicao]        = useState(false);
  const [tipoEdicao,         setTipoEdicao]         = useState<ModoEdicao>("unica");
  const [modalExcluir,       setModalExcluir]       = useState(false);
  const [itemExcluir,        setItemExcluir]        = useState<Transacao | null>(null);
  const [modalFaturaFechada, setModalFaturaFechada] = useState(false);

  const [abaMov, setAbaMov] = useState<"movimentacoes" | "parcelas" | "recorrencias">("movimentacoes");
  const [filtros, setFiltros] = useState<FiltrosState>({
    tipo:              "todas",
    categoria:         "",
    formaPagamento:    "",
    estabelecimentoId: "",
    busca:             "",
    valorMin:          "",
    valorMax:          "",
  });

  const temContasAtivas = useMemo(() => contas.some((c) => c.ativo), [contas]);

  // ✅ NOVO: conjuntos de parcelamentoId e transacaoSinteticaId bloqueados
  // por antecipação pendente — mesma lógica já usada na aba Parcelas, só
  // que aqui aplicada à tabela de Movimentações. Como os dois lugares
  // consultam a mesma query (useTodasAntecipacoes), ficam sempre
  // sincronizados automaticamente via cache do React Query.
  const parcelamentosBloqueados = useMemo(
    () => new Set(todasAntecipacoes.filter((a) => a.podeDesfazer).map((a) => a.parcelamentoId)),
    [todasAntecipacoes]
  );
  const transacoesSinteticasBloqueadas = useMemo(
    () => new Set(todasAntecipacoes.filter((a) => a.podeDesfazer).map((a) => a.transacaoSinteticaId)),
    [todasAntecipacoes]
  );

  function isBloqueada(mov: Transacao): boolean {
    if (mov.parcelamentoId && parcelamentosBloqueados.has(mov.parcelamentoId)) return true;
    if (transacoesSinteticasBloqueadas.has(mov.id)) return true;
    return false;
  }

  const movimentacoesFiltradas = useMemo(() => {
    return transacoes.filter((mov) => {
      if (filtros.tipo !== "todas" && mov.tipo !== filtros.tipo) return false;
      if (filtros.categoria      && mov.categoria      !== filtros.categoria)      return false;
      if (filtros.formaPagamento && mov.formaPagamento !== filtros.formaPagamento) return false;
      if (filtros.estabelecimentoId && filtros.estabelecimentoId !== "all") {
        if (mov.estabelecimentoId !== filtros.estabelecimentoId) return false;
      }
      if (filtros.busca) {
        const busca     = filtros.busca.toLowerCase();
        const descricao = mov.descricao?.toLowerCase() || "";
        const categoria = mov.categoria?.toLowerCase()  || "";
        if (!descricao.includes(busca) && !categoria.includes(busca)) return false;
      }
      if (filtros.valorMin !== "") {
        const min = parseFloat(filtros.valorMin);
        if (!isNaN(min) && Math.abs(Number(mov.valor)) < min) return false;
      }
      if (filtros.valorMax !== "") {
        const max = parseFloat(filtros.valorMax);
        if (!isNaN(max) && Math.abs(Number(mov.valor)) > max) return false;
      }
      return true;
    });
  }, [transacoes, filtros]);

  const categoriasUnicas = useMemo(
    () => Array.from(new Set(transacoes.map((m) => m.categoria).filter(Boolean))).sort() as string[],
    [transacoes]
  );

  const formasPagamentoUnicas = useMemo(
    () => Array.from(new Set(transacoes.map((m) => m.formaPagamento).filter(Boolean))).sort() as string[],
    [transacoes]
  );

  async function faturaParcelaEstaBloqueada(mov: Transacao): Promise<boolean> {
    if (!mov.parcelamentoId || !mov.cartaoId || mov.formaPagamento !== "cartao") return false;
    const cartao = cartoes.find((c) => c.id === mov.cartaoId);
    if (!cartao || cartao.tipo !== "credito") return false;
    const diaFechamento = cartao.diaFechamento || 1;
    const { mes, ano }  = calcularFaturaDaTransacao(new Date(mov.data), diaFechamento);
    // Só fatura PAGA bloqueia; fechada e não paga pode ser ajustada
    try {
      const faturaData = await buscarFatura(mov.cartaoId, ano, mes);
      return faturaData?.fatura?.paga === true;
    } catch { return false; }
  }

  function abrirNovo() {
    if (!temContasAtivas) return;
    setEditando(null);
    setTipoEdicao("unica");
    setOpenModal(true);
  }

  async function editarItem(mov: Transacao) {
    // ✅ NOVO: trava extra além da UI desabilitada — se por algum motivo o
    // clique chegar aqui mesmo assim, barra e explica o motivo
    if (isBloqueada(mov)) {
      toast({
        title: "Não é possível editar",
        description: "Esta transação faz parte de uma antecipação pendente. Desfaça a antecipação na aba Parcelas primeiro.",
        variant: "destructive",
      });
      return;
    }

    if (await faturaParcelaEstaBloqueada(mov)) { setModalFaturaFechada(true); return; }
    const isParcelada  = !!mov.parcelamentoId;
    const isRecorrente = !!mov.recorrenciaId;
    setEditando(mov);
    if (isParcelada) { setTipoEdicao("todas_parcelas"); setOpenModal(true); }
    else if (isRecorrente) { setModalEdicao(true); }
    else { setTipoEdicao("unica"); setOpenModal(true); }
  }

  function confirmarExclusao(mov: Transacao) {
    // ✅ NOVO: mesma trava, aplicada à exclusão
    if (isBloqueada(mov)) {
      toast({
        title: "Não é possível excluir",
        description: "Esta transação faz parte de uma antecipação pendente. Desfaça a antecipação na aba Parcelas primeiro.",
        variant: "destructive",
      });
      return;
    }
    setItemExcluir(mov);
    setModalExcluir(true);
  }

  async function handleExcluir(tipo: ModoEdicao) {
    if (!itemExcluir) return;
    try {
      if (itemExcluir.transferenciaId) {
        alert("Transferências devem ser gerenciadas na página de Extrato ou Transferências");
        setModalExcluir(false);
        setItemExcluir(null);
        return;
      }
      await excluirTransacao.mutateAsync({ id: itemExcluir.id, tipo });
      setModalExcluir(false);
      setItemExcluir(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  }

  async function handleSalvar(dados: DadosSalvarTransacao) {
    try {
      if (editando) {
        if (!ehAtualizacaoTransacao(dados)) throw new Error("Dados de edição inválidos");
        await atualizarTransacao.mutateAsync({
          id: editando.id,
          dados: { ...dados, modoEdicao: tipoEdicao },
        });
      } else {
        if (ehAtualizacaoTransacao(dados)) throw new Error("Dados de criação inválidos");
        await criarTransacao.mutateAsync(dados);
      }
      setOpenModal(false);
      setEditando(null);
      setTipoEdicao("unica");
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      throw error;
    }
  }

  async function handleSalvarRecorrencia(dados: CreateRecorrenciaDTO) {
    try {
      await criarRecorrencia.mutateAsync(dados);
      setOpenModal(false);
      setEditando(null);
      setTipoEdicao("unica");
    } catch (error) {
      console.error("Erro ao salvar recorrência:", error);
      throw error;
    }
  }

  const renderEmptyStateNoConta = () => (
    <div className="text-center py-12 md:py-16 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border-2 border-dashed border-yellow-300 dark:border-yellow-700">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <BsBank className="text-5xl md:text-6xl text-yellow-500 dark:text-yellow-400" />
          <AlertCircle className="absolute -top-2 -right-2 text-red-500 bg-white dark:bg-gray-800 rounded-full" size={20} />
        </div>
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2 px-4">
        Nenhuma conta cadastrada
      </h3>
      <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 mb-2 max-w-md mx-auto px-4">
        Você precisa cadastrar pelo menos uma conta bancária antes de registrar movimentações.
      </p>
      <Button onClick={() => router.push("/contas")} size="lg" className="bg-blue-700 hover:bg-blue-900">
        <BsBank className="mr-2 text-xl" />
        Cadastrar Primeira Conta
      </Button>
    </div>
  );

  const loading = loadingTransacoes || loadingCartoes || loadingContas;

  if (loadingContas) {
    return (
      <div className="page-container p-4 md:p-6">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container p-4 md:p-6 space-y-6">
      <PageHeader
        icone={BsArrowLeftRight}
        titulo="Movimentações"
        descricao={`${movimentacoesFiltradas.length} ${movimentacoesFiltradas.length === 1 ? "transação encontrada" : "transações encontradas"}`}
      />

      {temContasAtivas && (
        <Button
          onClick={abrirNovo}
          disabled={criarTransacao.isPending}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-blue-700 text-white hover:bg-blue-900 z-50"
          size="icon"
        >
          <MdAdd className="text-2xl" />
        </Button>
      )}

      {!temContasAtivas ? (
        renderEmptyStateNoConta()
      ) : (
        <Tabs value={abaMov} className="space-y-4">
          <AbasSecao
            ariaLabel="Tipo de lançamento"
            abas={[
              { id: "movimentacoes", rotulo: "Movimentações", icone: List },
              { id: "parcelas", rotulo: "Parcelas", icone: Layers },
              { id: "recorrencias", rotulo: "Recorrências", icone: Repeat },
            ] as const}
            ativa={abaMov}
            onChange={setAbaMov}
          />

          <TabsContent value="movimentacoes" className="space-y-4">
            <div className="space-y-4">
              <FiltrosMovimentacoes
                filtros={filtros}
                onFiltrosChange={setFiltros}
                categorias={categoriasUnicas}
                formasPagamento={formasPagamentoUnicas}
              />
              <div className="hidden md:flex justify-end">
                <Button
                  onClick={abrirNovo}
                  disabled={criarTransacao.isPending}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-900 text-white disabled:opacity-50"
                >
                  <MdAdd className="text-xl" />
                  {criarTransacao.isPending ? "Criando..." : "Nova Movimentação"}
                </Button>
              </div>
            </div>

            <MovimentacaoTabela
              movimentacoes={movimentacoesFiltradas}
              loading={loading}
              cartoes={cartoes}
              onEditar={editarItem}
              onExcluir={confirmarExclusao}
              isBloqueada={isBloqueada}
            />
          </TabsContent>

          <TabsContent value="parcelas">
            <ParcelasTab onEditar={editarItem} onExcluir={confirmarExclusao} />
          </TabsContent>

          <TabsContent value="recorrencias">
            <RecorrenciasTab contas={contas} cartoes={cartoes} />
          </TabsContent>
        </Tabs>
      )}

      {/* Modais */}
      <FormMovimentacaoModal
        open={openModal}
        onOpenChange={(open: boolean) => {
          setOpenModal(open);
          if (!open) { setEditando(null); setTipoEdicao("unica"); }
        }}
        transacaoEdicao={editando}
        modoEdicao={tipoEdicao}
        salvar={handleSalvar}
        salvarRecorrencia={handleSalvarRecorrencia}
        loading={criarTransacao.isPending || atualizarTransacao.isPending || criarRecorrencia.isPending}
      />

      <ConfirmarExclusaoModal
        open={modalExcluir}
        onClose={() => { setModalExcluir(false); setItemExcluir(null); }}
        transacao={itemExcluir}
        onConfirmar={handleExcluir}
        loading={excluirTransacao.isPending}
      />

      <ConfirmarEdicaoModal
        open={modalEdicao}
        onClose={() => setModalEdicao(false)}
        transacao={editando}
        onConfirmar={(tipo: ModoEdicao) => {
          setTipoEdicao(tipo);
          setModalEdicao(false);
          setOpenModal(true);
        }}
      />

      <FaturaFechadaModal
        open={modalFaturaFechada}
        onClose={() => setModalFaturaFechada(false)}
      />
    </div>
  );
}