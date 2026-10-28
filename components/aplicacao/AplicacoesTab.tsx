"use client";

// src/components/contas/AplicacoesTab.tsx

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  TrendingUp, PiggyBank, Calendar, Undo2, Loader2, Plus, History,
  AlertCircle, Infinity as InfinityIcon, Receipt,
} from "lucide-react";
import { useAplicacoes, useCriarAplicacao, useResgatarAplicacao } from "@/hooks/useAplicacoes";
import type { Aplicacao } from "@/services/aplicacaoService";
import type { Conta } from "@/types/conta";
import { calcularResgate } from "@/utils/aplicacaoUtils";
// Mesmos campos do modal de Nova Movimentação (conta com logo do banco e
// valor em formato calculadora)
import MovCampoConta from "@/components/transacao/MovCampoConta";
import MovCamposBasicos from "@/components/transacao/MovCamposBasicos";

interface Props {
  contas: Conta[];
}

const INDEXADOR_LABEL: Record<string, string> = { cdi: "CDI", selic: "Selic" };

export default function AplicacoesTab({ contas }: Props) {
  const { data: todasAplicacoes = [], isLoading } = useAplicacoes();
  const criar = useCriarAplicacao();
  const resgatar = useResgatarAplicacao();

  const [verHistorico, setVerHistorico] = useState(false);
  const [modalNovaOpen, setModalNovaOpen] = useState(false);
  const [aplicacaoResgatar, setAplicacaoResgatar] = useState<Aplicacao | null>(null);

  const [form, setForm] = useState({
    contaId: "",
    tipo: "saida" as "entrada" | "saida", // exigido pelos campos reaproveitados, não usado além disso aqui
    descricao: "",
    valor: "",
    indexador: "cdi" as "cdi" | "selic",
    percentualIndexador: "100",
    tributacao: "tributavel" as "isento" | "tributavel",
    semVencimento: false,
    dataVencimento: "",
  });
  const [erro, setErro] = useState<string | null>(null);

  const updateForm = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const formatarData = (data: string | Date) =>
    new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const nomeConta = (contaId: string) => contas.find((c) => c.id === contaId)?.nome ?? "Conta";

  const hoje = useMemo(() => new Date(), []);

  const aplicacoesFiltradas = useMemo(
    () => todasAplicacoes.filter((a) => a.resgatada === verHistorico),
    [todasAplicacoes, verHistorico]
  );

  const gruposPorConta = useMemo(() => {
    const grupos = new Map<string, Aplicacao[]>();
    aplicacoesFiltradas.forEach((a) => {
      if (!grupos.has(a.contaId)) grupos.set(a.contaId, []);
      grupos.get(a.contaId)!.push(a);
    });
    return Array.from(grupos.entries()).map(([contaId, lista]) => ({
      contaId,
      nomeConta: nomeConta(contaId),
      aplicacoes: lista,
    }));
  }, [aplicacoesFiltradas, contas]);

  function calcularProgresso(a: Aplicacao) {
    if (!a.dataVencimento) return 0; // liquidez diária não tem progresso
    const inicio = new Date(a.dataAplicacao).getTime();
    const fim    = new Date(a.dataVencimento).getTime();
    const agora  = hoje.getTime();
    if (fim <= inicio) return 100;
    return Math.min(100, Math.max(0, ((agora - inicio) / (fim - inicio)) * 100));
  }

  function diasRestantes(a: Aplicacao) {
    if (!a.dataVencimento) return null;
    const fim = new Date(a.dataVencimento);
    const diff = Math.ceil((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }

  function abrirNovaAplicacao() {
    setForm({
      contaId: contas[0]?.id ?? "", tipo: "saida", descricao: "", valor: "",
      indexador: "cdi", percentualIndexador: "100", tributacao: "tributavel",
      semVencimento: false, dataVencimento: "",
    });
    setErro(null);
    setModalNovaOpen(true);
  }

  async function confirmarNovaAplicacao() {
    setErro(null);
    const valorNum = parseFloat(form.valor);
    if (!form.contaId) { setErro("Selecione uma conta"); return; }
    if (isNaN(valorNum) || valorNum <= 0) { setErro("Informe um valor válido"); return; }
    const percentualNum = parseFloat(form.percentualIndexador);
    if (isNaN(percentualNum) || percentualNum <= 0) { setErro("Informe um percentual válido"); return; }
    if (!form.semVencimento && !form.dataVencimento) { setErro("Selecione a data de vencimento, ou marque 'sem vencimento'"); return; }

    try {
      await criar.mutateAsync({
        contaId: form.contaId,
        descricao: form.descricao || undefined,
        valor: valorNum,
        indexador: form.indexador,
        percentualIndexador: percentualNum,
        tributacao: form.tributacao,
        dataVencimento: form.semVencimento ? undefined : form.dataVencimento,
      });
      setModalNovaOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao criar aplicação");
    }
  }

  // Detalhamento do resgate (preview) — mesma função usada pelo backend
  // pra calcular de verdade, garantindo que o valor mostrado aqui bate
  // exatamente com o que será creditado
  const detalhamentoResgate = useMemo(() => {
    if (!aplicacaoResgatar) return null;
    return calcularResgate({
      valorPrincipal: Number(aplicacaoResgatar.valorPrincipal),
      valorAtual: Number(aplicacaoResgatar.valorAtual),
      dataAplicacao: aplicacaoResgatar.dataAplicacao,
      tributacao: aplicacaoResgatar.tributacao,
    });
  }, [aplicacaoResgatar]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="inline-flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setVerHistorico(false)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              !verHistorico ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            Ativas
          </button>
          <button
            onClick={() => setVerHistorico(true)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${
              verHistorico ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Histórico
          </button>
        </div>

        {!verHistorico && (
          <Button onClick={abrirNovaAplicacao} className="bg-blue-700 hover:bg-blue-900 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Aplicação
          </Button>
        )}
      </div>

      {gruposPorConta.length === 0 ? (
        <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-900/40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <PiggyBank className="mx-auto mb-4 text-gray-300 dark:text-gray-700" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {verHistorico ? "Nenhuma aplicação resgatada ainda" : "Nenhuma aplicação ativa"}
          </h3>
          {!verHistorico && (
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4">
              Aplique um valor da sua conta em CDI ou Selic e acompanhe o rendimento diário aqui.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {gruposPorConta.map((grupo) => (
            <div key={grupo.contaId}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 px-1">
                {grupo.nomeConta}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grupo.aplicacoes.map((a) => {
                  const rendimento = Number(a.valorAtual) - Number(a.valorPrincipal);
                  const progresso  = calcularProgresso(a);
                  const dias       = diasRestantes(a);
                  const liquidezDiaria = !a.dataVencimento;

                  return (
                    <Card key={a.id} className="dark:bg-gray-900 dark:border-gray-800">
                      <CardContent className="pt-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {a.descricao || `Aplicação em ${INDEXADOR_LABEL[a.indexador]}`}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {a.percentualIndexador}% do {INDEXADOR_LABEL[a.indexador]}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {a.resgatada ? (
                              <Badge className="text-[10px] px-2 py-0.5 border-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                Resgatada
                              </Badge>
                            ) : (
                              <Badge className="text-[10px] px-2 py-0.5 border-0 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                Ativa
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                              {a.tributacao === "isento" ? "Isento de IR" : "Tributável"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            {formatarMoeda(Number(a.valorAtual))}
                          </span>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            +{formatarMoeda(rendimento)}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Principal: {formatarMoeda(Number(a.valorPrincipal))}
                        </p>

                        {!a.resgatada && (
                          liquidezDiaria ? (
                            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-2.5 py-1.5">
                              <InfinityIcon className="w-3.5 h-3.5" />
                              Liquidez diária — sem data de vencimento
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Vence em {formatarData(a.dataVencimento!)}</span>
                                <span>{dias}d restantes</span>
                              </div>
                              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300" style={{ width: `${progresso}%` }} />
                              </div>
                            </div>
                          )
                        )}

                        {a.resgatada && a.dataResgate && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
                            <p className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Resgatada em {formatarData(a.dataResgate)}
                            </p>
                            {a.impostoRetido && Number(a.impostoRetido) > 0 && (
                              <p className="flex items-center gap-1">
                                <Receipt className="w-3 h-3" />
                                IR retido: {formatarMoeda(Number(a.impostoRetido))}
                              </p>
                            )}
                          </div>
                        )}

                        {!a.resgatada && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                            onClick={() => setAplicacaoResgatar(a)}
                          >
                            <Undo2 className="w-3 h-3 mr-1.5" />
                            {liquidezDiaria ? "Resgatar" : "Resgatar antecipadamente"}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Nova Aplicação — max-h + overflow: em telas baixas (celular,
          teclado aberto) o conteúdo rola em vez de ficar cortado */}
      <Dialog open={modalNovaOpen} onOpenChange={setModalNovaOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Aplicação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Conta e valor lado a lado — empilha em telas < 420px, onde
                meia largura é estreita demais pra um valor como
                "R$ 123.456,78" sem cortar */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
              <MovCampoConta
                form={{ contaId: form.contaId, tipo: form.tipo, valor: form.valor }}
                update={updateForm}
                renderInfoBox={() => null}
              />
              <MovCamposBasicos
                form={{ tipo: form.tipo, data: "", valor: form.valor, descricao: "" }}
                update={updateForm}
                campo="valor"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="aplicacao-descricao">Descrição (opcional)</Label>
              <Input
                id="aplicacao-descricao"
                value={form.descricao}
                onChange={(e) => updateForm("descricao", e.target.value)}
                placeholder="Ex: Reserva de emergência"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Indexador</Label>
                <Select value={form.indexador} onValueChange={(v: "cdi" | "selic") => updateForm("indexador", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="selic">Selic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aplicacao-percentual">% do indexador</Label>
                {/* step 0,5 (setas do campo andam de 0,5 em 0,5). min="0"
                    e não "0.01": o navegador conta os passos a partir do
                    min, então com min 0.01 as setas dariam 100,01 → 100,51.
                    O valor > 0 continua validado ao confirmar. */}
                <Input
                  id="aplicacao-percentual"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={form.percentualIndexador}
                  onChange={(e) => updateForm("percentualIndexador", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tributação</Label>
              <Select value={form.tributacao} onValueChange={(v: "isento" | "tributavel") => updateForm("tributacao", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tributavel">Tributável (CDB, Tesouro, Fundos...)</SelectItem>
                  <SelectItem value="isento">Isento de IR (LCI, LCA, Poupança...)</SelectItem>
                </SelectContent>
              </Select>
              {form.tributacao === "tributavel" && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  O IR é calculado automaticamente no resgate, pela tabela regressiva (22,5% a 15%, conforme o tempo aplicado).
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sem vencimento</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Liquidez diária — resgate quando quiser</p>
              </div>
              <Switch
                checked={form.semVencimento}
                onCheckedChange={(checked) => updateForm("semVencimento", checked)}
              />
            </div>

            {!form.semVencimento && (
              <div className="space-y-1.5">
                <Label htmlFor="aplicacao-vencimento">Vencimento</Label>
                <Input
                  id="aplicacao-vencimento"
                  type="date"
                  value={form.dataVencimento}
                  onChange={(e) => updateForm("dataVencimento", e.target.value)}
                />
              </div>
            )}

            {erro && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erro}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalNovaOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarNovaAplicacao} disabled={criar.isPending}>
              {criar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aplicando...</> : "Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de resgate — com detalhamento de IR quando tributável */}
      <AlertDialog open={!!aplicacaoResgatar} onOpenChange={(open) => { if (!open) setAplicacaoResgatar(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar resgate</AlertDialogTitle>
          </AlertDialogHeader>

          {aplicacaoResgatar && detalhamentoResgate && (
            <div className="space-y-3 py-2">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Valor aplicado (principal):</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatarMoeda(Number(aplicacaoResgatar.valorPrincipal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Rendimento bruto:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">+{formatarMoeda(detalhamentoResgate.rendimentoBruto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dias desde a aplicação:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{detalhamentoResgate.diasCorridos}</span>
                </div>

                {aplicacaoResgatar.tributacao === "tributavel" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Alíquota de IR ({detalhamentoResgate.diasCorridos}d):</span>
                      <span className="font-medium text-gray-900 dark:text-white">{detalhamentoResgate.aliquotaIR}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">IR retido:</span>
                      <span className="font-medium text-red-600 dark:text-red-400">-{formatarMoeda(detalhamentoResgate.impostoRetido)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">IR:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">Isento</span>
                  </div>
                )}

                <div className="flex justify-between pt-1.5 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Valor líquido a receber:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatarMoeda(detalhamentoResgate.valorLiquido)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Esse valor entra agora no saldo da conta. Essa ação não pode ser desfeita.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={() => { if (aplicacaoResgatar) resgatar.mutate(aplicacaoResgatar.id); setAplicacaoResgatar(null); }}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={resgatar.isPending}
            >
              {resgatar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resgatando...</> : "Confirmar resgate"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}