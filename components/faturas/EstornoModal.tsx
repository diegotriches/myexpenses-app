"use client";

// components/fatura/EstornoModal.tsx

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import { useEstornoPrevia, useRegistrarEstorno } from "@/hooks/useTransacoes";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import type { TransacaoFatura } from "@/types/cartao";
import { formatarMoeda } from "@/utils/formatadores";

interface Props {
  compra: TransacaoFatura;
  onClose: () => void;
}

const formatarData = (iso: string) => iso.split("-").reverse().join("/");
const mesAno = (mes: number, ano: number) => `${String(mes).padStart(2, "0")}/${ano}`;

export default function EstornoModal({ compra, onClose }: Props) {
  const { mask } = useHideValues();
  const hoje = hojeBrt();

  const [modo, setModo] = useState<"valor" | "cancelar">("valor");
  const [valor, setValor] = useState(Number(compra.valor).toFixed(2));
  const [data, setData] = useState(hoje);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const valorNum = Number(valor) || 0;
  const { data: previa, isLoading } = useEstornoPrevia(compra.id, valorNum, data);
  const registrar = useRegistrarEstorno();

  const excedeDisponivel = previa ? valorNum > previa.disponivel : false;
  const lancamentos = previa?.lancamentos ?? [];
  const cancelamentoBloqueado = previa?.cancelamento.bloqueado ?? false;
  const nadaACancelar = previa ? previa.cancelamento.parcelasExcluidas === 0 && previa.cancelamento.valorEstorno === 0 : true;
  const podeConfirmar = modo === "cancelar"
    ? !!previa && !nadaACancelar && !cancelamentoBloqueado
    : valorNum > 0 && !excedeDisponivel && !!previa;

  const confirmar = async () => {
    setErro(null);
    try {
      await registrar.mutateAsync({
        id: compra.id,
        modo,
        valor: modo === "valor" ? valorNum : undefined,
        data,
        motivo: motivo.trim() || undefined,
      });
      onClose();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao registrar o estorno");
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => { if (!aberto) onClose(); }}>
      <DialogContent className="sm:max-w-[460px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Estornar compra</DialogTitle>
          <DialogDescription className="truncate">{compra.descricao || "Compra sem descrição"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {previa?.parcelado && (
            <div className="grid grid-cols-2 gap-2">
              {([["valor", "Estornar valor"], ["cancelar", "Cancelar compra"]] as const).map(([m, rotulo]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={[
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    modo === m
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400",
                  ].join(" ")}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          )}

          {modo === "valor" && (
            <div className="space-y-1.5">
              <Label htmlFor="estorno-valor">Valor do estorno (R$)</Label>
              <InputMoeda id="estorno-valor" value={valor} onChange={setValor} placeholder="0,00" />
              {previa && (
                <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Disponível para estorno: {mask(formatarMoeda(previa.disponivel))}
                    {previa.jaEstornado > 0 && ` · já estornado: ${mask(formatarMoeda(previa.jaEstornado))}`}
                  </span>
                  <button
                    type="button"
                    className="flex-shrink-0 text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setValor(previa.disponivel.toFixed(2))}
                  >
                    Usar o total
                  </button>
                </div>
              )}
              {excedeDisponivel && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> O valor passa do disponível para estorno.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="estorno-data">Data</Label>
              <Input id="estorno-data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="estorno-motivo">Motivo (opcional)</Label>
              <Input id="estorno-motivo" maxLength={120} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Devolução" />
            </div>
          </div>

          {isLoading && <p className="text-xs text-gray-500 dark:text-gray-400">Calculando...</p>}

          {modo === "valor" && !excedeDisponivel && lancamentos.length > 0 && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {lancamentos.map((l) => (
                <div key={`${l.ano}-${l.mes}`} className="flex justify-between gap-3">
                  <span>Fatura {mesAno(l.mes, l.ano)}{l.data !== data ? ` · lançado em ${formatarData(l.data)}` : ""}</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{mask(formatarMoeda(l.valor))}</span>
                </div>
              ))}
              {lancamentos.length > 1 && <p>A parte que passa do total da fatura fica como crédito na seguinte.</p>}
            </div>
          )}

          {modo === "cancelar" && cancelamentoBloqueado && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Esta compra já tem estorno lançado. Exclua os estornos antes de cancelar a compra.
            </p>
          )}

          {modo === "cancelar" && previa && !cancelamentoBloqueado && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <p>{previa.cancelamento.parcelasExcluidas} parcela(s) em aberto serão excluídas.</p>
              <p>
                Estorno do que já foi pago:{" "}
                <span className="font-semibold text-green-600 dark:text-green-400">{mask(formatarMoeda(previa.cancelamento.valorEstorno))}</span>
              </p>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Não pode ser desfeito: as parcelas em aberto são apagadas definitivamente.
              </p>
            </div>
          )}

          <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            O estorno reduz a fatura e libera limite; não passa pela conta bancária.
          </p>

          {erro && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {erro}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Voltar</Button>
          <Button onClick={confirmar} disabled={!podeConfirmar || registrar.isPending}>
            {registrar.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
              : modo === "cancelar" ? "Cancelar compra" : "Estornar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
