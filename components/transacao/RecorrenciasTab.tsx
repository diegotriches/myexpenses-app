"use client";

// src/components/transacao/RecorrenciasTab.tsx

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowUpCircle, ArrowDownCircle, Pause, Play, Trash2, Pencil,
  Repeat, Calendar, Loader2, CreditCard, Wallet, AlertCircle,
} from "lucide-react";
import {
  useRecorrencias,
  useAtualizarRecorrencia,
  useCancelarRecorrencia,
} from "@/hooks/useRecorrencias";
import type { Recorrencia } from "@/types/recorrencia";
import type { Conta } from "@/types/conta";
import type { Cartao } from "@/types/cartao";
// ✅ NOVO: reaproveita os mesmos componentes do modal de Nova Movimentação
import MovCamposBasicos from "@/components/transacao/MovCamposBasicos";
import MovCampoFormaPagamento from "@/components/transacao/MovCampoFormaPagamento";
import MovCampoConta from "@/components/transacao/MovCampoConta";
import MovCampoCartao from "@/components/transacao/MovCampoCartao";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

interface Props {
  contas: Conta[];
  cartoes: Cartao[];
}

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao: "Cartão",
};

export default function RecorrenciasTab({ contas, cartoes }: Props) {
  const { mask } = useHideValues();
  const { data: recorrencias = [], isLoading } = useRecorrencias();
  const atualizar = useAtualizarRecorrencia();
  const cancelar = useCancelarRecorrencia();

  const [recorrenciaCancelar, setRecorrenciaCancelar] = useState<Recorrencia | null>(null);

  // ✅ NOVO: edição de valor/dia do mês/forma de pagamento — form agora
  // no mesmo formato esperado pelos componentes de Nova Movimentação
  const [recorrenciaEditar, setRecorrenciaEditar] = useState<Recorrencia | null>(null);
  const [formEdicao, setFormEdicao] = useState({
    tipo: "saida" as "entrada" | "saida",
    valor: "",
    diaDoMes: "1",
    formaPagamento: "dinheiro" as "dinheiro" | "pix" | "cartao",
    contaId: "",
    cartaoId: "",
  });
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  const updateEdicao = (key: string, value: any) => {
    setFormEdicao((f) => ({ ...f, [key]: value }));
  };

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [recorrenciaEditar];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    if (recorrenciaEditar) {
    setFormEdicao({
      tipo: recorrenciaEditar.tipo,
      valor: recorrenciaEditar.valor,
      diaDoMes: String(recorrenciaEditar.diaDoMes),
      formaPagamento: recorrenciaEditar.formaPagamento,
      contaId: recorrenciaEditar.contaId ?? "",
      cartaoId: recorrenciaEditar.cartaoId ? String(recorrenciaEditar.cartaoId) : "",
    });
    setErroEdicao(null);
    }
  }

  // Mesma regra do modal de criação: receita não pode ser no cartão
  const opcoesFormaPagamentoEdicao = useMemo(
    () => (formEdicao.tipo === "entrada" ? (["dinheiro", "pix"] as const) : (["dinheiro", "pix", "cartao"] as const)),
    [formEdicao.tipo]
  );

  async function handleSalvarEdicao() {
    if (!recorrenciaEditar) return;
    setErroEdicao(null);

    const valorNum = parseFloat(formEdicao.valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      setErroEdicao("Informe um valor válido");
      return;
    }
    const diaNum = parseInt(formEdicao.diaDoMes);
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      setErroEdicao("Dia do mês deve ser entre 1 e 31");
      return;
    }
    if (formEdicao.formaPagamento === "cartao" && !formEdicao.cartaoId) {
      setErroEdicao("Selecione um cartão");
      return;
    }
    if (formEdicao.formaPagamento !== "cartao" && !formEdicao.contaId) {
      setErroEdicao("Selecione uma conta");
      return;
    }

    try {
      await atualizar.mutateAsync({
        id: recorrenciaEditar.id,
        dados: {
          valor: valorNum,
          diaDoMes: diaNum,
          formaPagamento: formEdicao.formaPagamento,
          contaId: formEdicao.formaPagamento === "cartao" ? null : formEdicao.contaId,
          cartaoId: formEdicao.formaPagamento === "cartao" ? Number(formEdicao.cartaoId) : null,
        },
      });
      setRecorrenciaEditar(null);
    } catch (err) {
      setErroEdicao(err instanceof Error ? err.message : "Erro ao salvar alterações");
    }
  }

  // ✅ Terminadas naturalmente (bateram o limite de repetições) somem da
  // lista após o fim do mês em que geraram a última ocorrência. Pausadas
  // manualmente (ativa=false, mas sem ter batido o limite) ficam visíveis
  // indefinidamente até o usuário retomar ou cancelar.
  const recorrenciasVisiveis = useMemo(() => {
    const hoje = new Date();
    return recorrencias.filter((r) => {
      if (r.ativa) return true;

      const concluidaNaturalmente =
        r.repeticoesTotal !== null && r.repeticoesGeradas >= r.repeticoesTotal;

      if (!concluidaNaturalmente) return true; // pausada manualmente

      if (r.ultimaGeracaoMes === null || r.ultimaGeracaoAno === null) return true; // sem dado, mantém por segurança

      const fimDoMesConclusao = new Date(r.ultimaGeracaoAno, r.ultimaGeracaoMes, 0, 23, 59, 59, 999);
      return hoje <= fimDoMesConclusao;
    });
  }, [recorrencias]);

  function nomeConta(contaId: string | null) {
    if (!contaId) return null;
    return contas.find((c) => c.id === contaId)?.nome ?? null;
  }

  function nomeCartao(cartaoId: number | null) {
    if (!cartaoId) return null;
    return cartoes.find((c) => c.id === cartaoId)?.nome ?? null;
  }

  function statusDaRecorrencia(r: Recorrencia): { label: string; className: string } {
    if (r.ativa) {
      return { label: "Ativa", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
    }
    const concluida = r.repeticoesTotal !== null && r.repeticoesGeradas >= r.repeticoesTotal;
    if (concluida) {
      return { label: "Concluída", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
    }
    return { label: "Pausada", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (recorrenciasVisiveis.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-900/40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <Repeat className="mx-auto mb-4 text-gray-300 dark:text-gray-700" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Nenhuma recorrência ativa
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4">
          Para criar uma, abra &quot;Nova Movimentação&quot; e escolha &quot;Recorrente&quot; como tipo de pagamento.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recorrenciasVisiveis.map((r) => {
          const isReceita = r.tipo === "entrada";
          const status = statusDaRecorrencia(r);
          const indefinida = r.repeticoesTotal === null;
          const progresso = indefinida ? 0 : Math.min(100, (r.repeticoesGeradas / (r.repeticoesTotal as number)) * 100);
          const conta = nomeConta(r.contaId);
          const cartao = nomeCartao(r.cartaoId);

          return (
            <Card key={r.id} className={`dark:bg-gray-900 dark:border-gray-800 ${!r.ativa ? "opacity-70" : ""}`}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-full flex-shrink-0 ${isReceita ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                      {isReceita
                        ? <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        : <ArrowDownCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {r.descricao || (isReceita ? "Receita recorrente" : "Despesa recorrente")}
                      </p>
                      {r.categoria && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{r.categoria}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={`text-[10px] px-2 py-0.5 border-0 flex-shrink-0 ${status.className}`}>
                    {status.label}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-lg font-bold ${isReceita ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {isReceita ? "+" : "-"} {mask(formatarMoeda(Number(r.valor)))}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">/mês</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Dia {r.diaDoMes}
                  </div>
                  <div className="flex items-center gap-1">
                    {r.formaPagamento === "cartao" ? <CreditCard className="w-3 h-3" /> : <Wallet className="w-3 h-3" />}
                    {FORMA_PAGAMENTO_LABEL[r.formaPagamento] ?? r.formaPagamento}
                    {cartao && ` · ${cartao}`}
                    {conta && ` · ${conta}`}
                  </div>
                </div>

                {indefinida ? (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    Indefinida — repete até você pausar ou cancelar
                  </Badge>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Progresso</span>
                      <span>{r.repeticoesGeradas}/{r.repeticoesTotal}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${progresso}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => atualizar.mutate({ id: r.id, dados: { ativa: !r.ativa } })}
                    disabled={atualizar.isPending || status.label === "Concluída"}
                  >
                    {r.ativa ? (
                      <><Pause className="w-3 h-3 mr-1.5" />Pausar</>
                    ) : (
                      <><Play className="w-3 h-3 mr-1.5" />Retomar</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setRecorrenciaEditar(r)}
                    disabled={status.label === "Concluída"}
                    title="Editar valor, dia do mês ou forma de pagamento"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    onClick={() => setRecorrenciaCancelar(r)}
                    disabled={cancelar.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!recorrenciaCancelar} onOpenChange={(open) => { if (!open) setRecorrenciaCancelar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar recorrência</AlertDialogTitle>
            <AlertDialogDescription>
              Nenhuma nova ocorrência de &quot;{recorrenciaCancelar?.descricao || "esta recorrência"}&quot; será gerada
              a partir de agora. As transações já criadas por ela permanecem no seu histórico normalmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (recorrenciaCancelar) cancelar.mutate(recorrenciaCancelar.id);
                setRecorrenciaCancelar(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Cancelar recorrência
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ✅ NOVO: modal de edição — valor, dia do mês e forma de pagamento.
          As mudanças valem só para as próximas gerações do cron; ocorrências
          já criadas no histórico não são recalculadas. */}
      <Dialog open={!!recorrenciaEditar} onOpenChange={(open) => { if (!open) setRecorrenciaEditar(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar recorrência</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                As alterações valem só para as próximas gerações. Transações já criadas não mudam.
              </p>
            </div>

            {/* ✅ NOVO: valor + dia do mês lado a lado, mesmo padrão do
                modal de Nova Movimentação (grid-cols-2) */}
            <div className="grid grid-cols-2 gap-3">
              <MovCamposBasicos
                form={{ tipo: formEdicao.tipo, data: "", valor: formEdicao.valor, descricao: "" }}
                update={updateEdicao}
                campo="valor"
              />

              <div className="space-y-2">
                <Label htmlFor="edicao-dia" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dia do mês
                </Label>
                <Input
                  id="edicao-dia"
                  type="number"
                  min="1"
                  max="31"
                  value={formEdicao.diaDoMes}
                  onChange={(e) => setFormEdicao((f) => ({ ...f, diaDoMes: e.target.value }))}
                  className="h-12 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              Em meses mais curtos, usa o último dia disponível.
            </p>

            {/* ✅ NOVO: forma de pagamento + conta/cartão lado a lado */}
            <div className="grid grid-cols-2 gap-3">
              <MovCampoFormaPagamento
                form={{ tipo: formEdicao.tipo, formaPagamento: formEdicao.formaPagamento }}
                update={updateEdicao}
                opcoesDisponiveis={opcoesFormaPagamentoEdicao}
              />

              {formEdicao.formaPagamento === "cartao" ? (
                <MovCampoCartao
                  form={{ cartaoId: formEdicao.cartaoId, valor: formEdicao.valor }}
                  update={updateEdicao}
                  renderInfoBox={() => null}
                />
              ) : (
                <MovCampoConta
                  form={{ contaId: formEdicao.contaId, tipo: formEdicao.tipo, valor: formEdicao.valor }}
                  update={updateEdicao}
                  renderInfoBox={() => null}
                />
              )}
            </div>

            {erroEdicao && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                ⚠ {erroEdicao}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRecorrenciaEditar(null)}>Cancelar</Button>
            <Button onClick={handleSalvarEdicao} disabled={atualizar.isPending}>
              {atualizar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}