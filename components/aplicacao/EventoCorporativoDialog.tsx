"use client";

// src/components/aplicacao/EventoCorporativoDialog.tsx

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Info } from "lucide-react";
import { useCriarEventoRv } from "@/hooks/useRendaVariavel";
import type { OperacaoRvApi } from "@/services/rendaVariavelService";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { TICKER_REGEX, normalizarTicker } from "@/utils/rendaVariavelUtils";
import { calcularEvento, posicaoEm } from "@/utils/eventosCorporativosUtils";

type TipoForm = "desdobramento" | "grupamento" | "bonificacao" | "troca";

const ROTULO: Record<TipoForm, string> = {
  desdobramento: "Desdobramento (split)",
  grupamento: "Grupamento (inplit)",
  bonificacao: "Bonificação em ações",
  troca: "Troca de ticker",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operacoes: OperacaoRvApi[];
}

const num = (s: string) => Number(s.replace(",", "."));

export default function EventoCorporativoDialog({ open, onOpenChange, operacoes }: Props) {
  const criar = useCriarEventoRv();
  const hoje = hojeBrt();

  const tickers = useMemo(() => Array.from(new Set(operacoes.map((o) => o.ticker))).sort(), [operacoes]);
  const abertos = useMemo(
    () => tickers.filter((t) => posicaoEm(operacoes, t, hoje) > 0),
    [tickers, operacoes, hoje],
  );

  const [tipo, setTipo] = useState<TipoForm>("desdobramento");
  const [ticker, setTicker] = useState("");
  const [data, setData] = useState(hoje);
  const [antigo, setAntigo] = useState("1");
  const [novo, setNovo] = useState("2");
  const [percentual, setPercentual] = useState("");
  const [custo, setCusto] = useState("");
  const [para, setPara] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const aoMudar = (v: boolean) => {
    if (v) {
      setTipo("desdobramento"); setTicker(abertos[0] ?? tickers[0] ?? ""); setData(hoje);
      setAntigo("1"); setNovo("2"); setPercentual(""); setCusto(""); setPara(""); setErro(null);
    }
    onOpenChange(v);
  };

  const trocarTipo = (t: TipoForm) => {
    setTipo(t);
    setErro(null);
    if (t === "desdobramento") { setAntigo("1"); setNovo("2"); }
    if (t === "grupamento") { setAntigo("10"); setNovo("1"); }
  };

  const previa = useMemo(() => {
    if (tipo === "troca" || !ticker) return null;
    return calcularEvento(posicaoEm(operacoes, ticker, data), {
      tipo, antigo: num(antigo), novo: num(novo), percentual: num(percentual || "0"),
    });
  }, [tipo, ticker, data, antigo, novo, percentual, operacoes]);

  const paraNorm = normalizarTicker(para);
  const trocaUne = tipo === "troca" && tickers.includes(paraNorm);

  const confirmar = async () => {
    setErro(null);
    try {
      if (tipo === "troca") {
        if (!TICKER_REGEX.test(paraNorm)) return setErro("Informe o novo ticker (ex.: VPPR11).");
        await criar.mutateAsync({ tipo: "troca", de: ticker, para: paraNorm });
      } else if (tipo === "bonificacao") {
        await criar.mutateAsync({
          tipo, ticker, data, percentual: num(percentual || "0"), custoUnitario: num(custo || "0"),
        });
      } else {
        await criar.mutateAsync({ tipo, ticker, data, antigo: num(antigo), novo: num(novo) });
      }
      onOpenChange(false);
    } catch (e: any) {
      setErro(e.message);
    }
  };

  const bloqueado = !ticker || (tipo === "troca" ? !paraNorm : !!previa?.erro);

  return (
    <Dialog open={open} onOpenChange={aoMudar}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evento corporativo</DialogTitle>
          <DialogDescription>
            Ajusta a quantidade e o preço médio sem gerar compra ou venda (e sem imposto).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Evento</Label>
            <Select value={tipo} onValueChange={(v) => trocarTipo(v as TipoForm)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ROTULO) as TipoForm[]).map((t) => (
                  <SelectItem key={t} value={t}>{ROTULO[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{tipo === "troca" ? "Ticker antigo" : "Ativo"}</Label>
            <Select value={ticker} onValueChange={setTicker}>
              <SelectTrigger><SelectValue placeholder="Escolha o ativo" /></SelectTrigger>
              <SelectContent>
                {(tipo === "troca" ? tickers : abertos).map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "troca" ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Novo ticker</Label>
                <Input value={para} onChange={(e) => setPara(normalizarTicker(e.target.value))} maxLength={12} className="uppercase" placeholder="VPPR11" />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Todo o histórico (operações e proventos) de {ticker || "…"} passa para {paraNorm || "o novo ticker"}
                {trocaUne && ", unindo com as operações que ele já tem"}. A posição e o preço médio continuam iguais.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Data do evento</Label>
                <Input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} />
              </div>

              {tipo === "bonificacao" ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Bonificação (%)</Label>
                    <Input inputMode="decimal" value={percentual} onChange={(e) => setPercentual(e.target.value)} placeholder="10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Custo por ação (R$)</Label>
                    <InputMoeda value={custo} onChange={setCusto} placeholder="0,00" />
                  </div>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Cada</Label>
                    <Input inputMode="numeric" value={antigo} onChange={(e) => setAntigo(e.target.value)} />
                  </div>
                  <span className="pb-2 text-sm text-gray-500">{tipo === "desdobramento" ? "vira" : "viram"}</span>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">&nbsp;</Label>
                    <Input inputMode="numeric" value={novo} onChange={(e) => setNovo(e.target.value)} />
                  </div>
                </div>
              )}

              {previa && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-sm">
                  {previa.erro ? (
                    <p className="text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> {previa.erro}
                    </p>
                  ) : (
                    <p className="text-gray-700 dark:text-gray-300">
                      Posição em {data.split("-").reverse().join("/")}:{" "}
                      <strong>{previa.posicaoAntes}</strong> → <strong>{previa.posicaoDepois}</strong>
                      <span className="text-gray-500"> ({previa.delta > 0 ? "+" : ""}{previa.delta})</span>
                    </p>
                  )}
                </div>
              )}
              <p className="text-[11px] text-gray-400">
                Frações de ação são desconsideradas. Subscrição de novas ações não é evento: registre como uma compra normal ao preço pago.
              </p>
            </>
          )}

          {erro && (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {erro}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={criar.isPending || bloqueado}>
            {criar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}