"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Zap,
  Trash2,
  Loader2,
  AlertTriangle,
  Wallet,
  Calendar,
} from "lucide-react";
import { AdiantamentoFatura } from "@/hooks/useFaturas";
import { useContas } from "@/hooks/useContas";
import { useHideValues } from "@/contexts/HideValuesContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  adiantamentos:      AdiantamentoFatura[];
  cartaoId:           number | string;
  mes:                number;
  ano:                number;
  faturaJaPaga:       boolean;
  onCancelar:         (adiantamentoId: string) => Promise<void>;
  cancelando?:        boolean;
}

const formatarMoeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function AdiantamentosLista({
  adiantamentos,
  faturaJaPaga,
  onCancelar,
  cancelando = false,
}: Props) {
  const { data: contas = [] } = useContas();
  const { mask }              = useHideValues();

  const [confirmando, setConfirmando] = useState<AdiantamentoFatura | null>(null);

  if (adiantamentos.length === 0) return null;

  const totalAdiantado = adiantamentos.reduce((acc, a) => acc + Number(a.valor), 0);

  function nomeContaPorId(contaId: string) {
    return contas.find((c) => c.id === contaId)?.nome ?? "Conta";
  }

  async function handleConfirmarCancelamento() {
    if (!confirmando) return;
    await onCancelar(confirmando.id);
    setConfirmando(null);
  }

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm md:text-base flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Adiantamentos
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
                {adiantamentos.length}
              </Badge>
            </div>
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              {mask(formatarMoeda(totalAdiantado))}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 space-y-2">
          {adiantamentos.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/40"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {a.descricao || "Adiantamento"}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Wallet size={11} />
                    {nomeContaPorId(a.contaId)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar size={11} />
                    {format(new Date(a.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {mask(formatarMoeda(Number(a.valor)))}
                </span>
                {!faturaJaPaga && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={() => setConfirmando(a)}
                    disabled={cancelando}
                    title="Cancelar adiantamento"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {faturaJaPaga && (
            <Alert className="py-2 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <AlertDescription className="text-xs text-gray-500 dark:text-gray-400">
                Fatura paga — adiantamentos não podem ser cancelados.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Modal de confirmação de cancelamento */}
      <Dialog open={!!confirmando} onOpenChange={() => setConfirmando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={18} />
              Cancelar adiantamento
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível e estornará o valor de volta para a conta.
            </DialogDescription>
          </DialogHeader>

          {confirmando && (
            <div className="py-2 space-y-3">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Valor:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatarMoeda(Number(confirmando.valor))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Conta:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {nomeContaPorId(confirmando.contaId)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Data:</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {format(new Date(confirmando.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
              <Alert className="py-2 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                  O valor será estornado à conta e o limite do cartão será removido novamente.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmando(null)} disabled={cancelando}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarCancelamento}
              disabled={cancelando}
            >
              {cancelando ? (
                <><Loader2 size={14} className="mr-2 animate-spin" />Cancelando...</>
              ) : (
                <><Trash2 size={14} className="mr-2" />Cancelar adiantamento</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}