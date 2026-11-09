"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Layers, CreditCard, Calendar, Pencil, Trash2, FastForward,
  Loader2, AlertCircle, Undo2,
} from "lucide-react";
import { useTransacoesTodas } from "@/hooks/useTransacoes";
import { useAntecipagem, useAntecipacoes, useDesfazerAntecipacao, useTodasAntecipacoes } from "@/hooks/useParcelamentos";
import { filtrarParceladas } from "@/utils/dashboardUtils";
import type { Transacao } from "@/types/transacao";
import type { AntecipacaoRegistro } from "@/services/parcelamentoService";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

interface Props {
  onEditar: (mov: Transacao) => void;
  onExcluir: (mov: Transacao) => void;
}

interface GrupoParcelamento {
  chave: string;
  representante: Transacao;
  totalCompra: number;
  parcelasPagas: number;
  totalParcelas: number;
  porcentagem: number;
  parcelasRestantes: number;
  valorRestante: number;
  // ✅ NOVO: true quando já existe uma antecipação pendente pra esse
  // parcelamento — desabilita Editar/Excluir/Antecipar até o usuário
  // desfazer a antecipação existente primeiro
  bloqueado: boolean;
}

// Card "órfão" — parcelamento totalmente antecipado, sem nenhuma
// transação viva restante no banco (nem paga, nem futura). Não dá pra
// montar um GrupoParcelamento normal (que depende de um representante
// vindo de uma transação real), então usamos só os dados salvos na
// própria antecipação.
interface AntecipacaoOrfa {
  chave: string;
  descricao: string;
  categoria: string | null;
  valorTotalAntecipado: number;
  antecipacaoId: string;
}

// Cada card de parcelamento tem sua própria instância deste
// subcomponente, então o hook useAntecipacoes pode ser chamado
// normalmente (não dentro de um .map() do componente pai, o que
// violaria as regras de hooks do React)
function AntecipacoesDoParcelamento({ parcelamentoId }: { parcelamentoId: string }) {
  const { data: antecipacoes = [] } = useAntecipacoes(parcelamentoId);
  const desfazer = useDesfazerAntecipacao();

  if (antecipacoes.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      {antecipacoes.map((a: AntecipacaoRegistro) => (
        <div
          key={a.id}
          className="flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5"
        >
          <span className="text-[11px] text-amber-700 dark:text-amber-300">
            {a.quantidadeAntecipada}x antecipada(s) — R$ {Number(a.valorComDesconto).toFixed(2)}
          </span>
          {a.podeDesfazer ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-amber-700 hover:text-amber-900 dark:text-amber-300"
              onClick={() => desfazer.mutate(a.id)}
              disabled={desfazer.isPending}
            >
              {desfazer.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Undo2 className="w-3 h-3 mr-1" />Desfazer</>}
            </Button>
          ) : (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Fatura já paga</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ParcelasTab({ onEditar, onExcluir }: Props) {
  const { mask } = useHideValues();
  const { data: transacoes = [], isLoading } = useTransacoesTodas();
  const antecipar = useAntecipagem();
  // Usado só pra saber QUAIS parcelamentos têm antecipação pendente
  // (mantém o card visível mesmo com parcelasRestantes = 0)
  const { data: todasAntecipacoes = [] } = useTodasAntecipacoes();

  const [parcelamentoAntecipar, setParcelamentoAntecipar] = useState<GrupoParcelamento | null>(null);
  const [quantidade, setQuantidade] = useState("1");
  const [desconto, setDesconto] = useState("");
  const [erroAntecipacao, setErroAntecipacao] = useState<string | null>(null);

  const formatarData = (data: string | Date) => {
    const date = typeof data === "string" ? new Date(data) : data;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const hoje = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Só compras parceladas no CARTÃO — parcelado deixou de ser permitido
  // em dinheiro/PIX na criação, mas parcelamentos antigos (legado) nesse
  // formato podem ainda existir; eles não aparecem aqui pois "antecipar"
  // não se aplica a eles (continuam editáveis/excluíveis normalmente pela
  // tabela de Movimentações)
  const gruposEmAberto = useMemo<GrupoParcelamento[]>(() => {
    const parceladas = filtrarParceladas(transacoes).filter((t) => t.formaPagamento === "cartao");

    const grupos = new Map<string, Transacao[]>();
    parceladas.forEach((t) => {
      const chave = t.parcelamentoId || t.id;
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave)!.push(t);
    });

    const todos: GrupoParcelamento[] = Array.from(grupos.entries()).map(([chave, parcelas]) => {
      const representante = parcelas.reduce((min, t) =>
        (t.parcelaAtual ?? 0) < (min.parcelaAtual ?? 0) ? t : min
      );

      const valorParcela = Number(representante.valor);
      const totalParcelas = representante.parcelas ?? parcelas.length;
      const totalCompra = valorParcela * totalParcelas;

      const parcelasPagas = parcelas.filter((p) => {
        const dataParcela = typeof p.data === "string" ? new Date(p.data) : p.data;
        return dataParcela <= hoje;
      }).length;

      const parcelasFuturas = parcelas.filter((p) => {
        const dataParcela = typeof p.data === "string" ? new Date(p.data) : p.data;
        return dataParcela > hoje;
      });

      const porcentagem = totalParcelas > 0 ? (parcelasPagas / totalParcelas) * 100 : 0;

      return {
        chave,
        representante,
        totalCompra,
        parcelasPagas,
        totalParcelas,
        porcentagem,
        parcelasRestantes: parcelasFuturas.length,
        valorRestante: parcelasFuturas.length * valorParcela,
        bloqueado: false, // placeholder — valor real definido logo abaixo
      };
    });

    // Além de "tem parcela futura", também mantém visível se existe uma
    // antecipação pendente (podeDesfazer) pra esse parcelamento — sem
    // isso, antecipar TODAS as parcelas restantes fazia o card sumir da
    // lista mesmo com uma antecipação ainda desfazível
    const parcelamentosComAntecipacaoPendente = new Set(
      todasAntecipacoes.filter((a: AntecipacaoRegistro) => a.podeDesfazer).map((a: AntecipacaoRegistro) => a.parcelamentoId)
    );

    return todos
      .filter((g) => g.parcelasRestantes > 0 || parcelamentosComAntecipacaoPendente.has(g.chave))
      .sort((a, b) => b.porcentagem - a.porcentagem)
      // ✅ NOVO: marca cada grupo se está bloqueado por antecipação pendente
      .map((g) => ({ ...g, bloqueado: parcelamentosComAntecipacaoPendente.has(g.chave) }));
  }, [transacoes, hoje, todasAntecipacoes]);

  // Antecipações "órfãs" — parcelamentos totalmente antecipados (todas as
  // parcelas removidas, nenhuma sobrou como transação viva), que por isso
  // nunca chegam a formar um grupo em `gruposEmAberto`
  const antecipacoesOrfas = useMemo<AntecipacaoOrfa[]>(() => {
    const chavesComGrupo = new Set(gruposEmAberto.map((g) => g.chave));
    return todasAntecipacoes
      .filter((a: AntecipacaoRegistro) => a.podeDesfazer && !chavesComGrupo.has(a.parcelamentoId))
      .map((a: AntecipacaoRegistro) => {
        const parcelas = a.parcelasRemovidas;
        return {
          chave: a.parcelamentoId,
          descricao: parcelas?.[0]?.descricao || "Compra parcelada",
          categoria: parcelas?.[0]?.categoria || null,
          valorTotalAntecipado: Number(a.valorFaceAntecipado),
          antecipacaoId: a.id,
        };
      });
  }, [gruposEmAberto, todasAntecipacoes]);

  function abrirAntecipar(grupo: GrupoParcelamento) {
    setParcelamentoAntecipar(grupo);
    setQuantidade("1");
    setDesconto("");
    setErroAntecipacao(null);
  }

  async function confirmarAntecipacao() {
    if (!parcelamentoAntecipar) return;
    setErroAntecipacao(null);

    const qtdNum = parseInt(quantidade);
    if (isNaN(qtdNum) || qtdNum < 1) {
      setErroAntecipacao("Informe uma quantidade válida");
      return;
    }
    if (qtdNum > parcelamentoAntecipar.parcelasRestantes) {
      setErroAntecipacao(`Só há ${parcelamentoAntecipar.parcelasRestantes} parcela(s) restante(s)`);
      return;
    }
    const descontoNum = desconto ? parseFloat(desconto) : 0;
    if (isNaN(descontoNum) || descontoNum < 0) {
      setErroAntecipacao("Desconto inválido");
      return;
    }

    try {
      await antecipar.mutateAsync({
        parcelamentoId: parcelamentoAntecipar.chave,
        quantidadeParcelas: qtdNum,
        desconto: descontoNum,
      });
      setParcelamentoAntecipar(null);
    } catch (err) {
      setErroAntecipacao(err instanceof Error ? err.message : "Erro ao antecipar");
    }
  }

  const valorParcelaAtual = parcelamentoAntecipar ? Number(parcelamentoAntecipar.representante.valor) : 0;
  const qtdParaCalculo = parseInt(quantidade) || 0;
  const descontoParaCalculo = desconto ? parseFloat(desconto) : 0;
  const totalAntecipacao = valorParcelaAtual * qtdParaCalculo;
  const totalComDesconto = Math.max(0, totalAntecipacao - descontoParaCalculo);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (gruposEmAberto.length === 0 && antecipacoesOrfas.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 bg-gray-50 dark:bg-gray-900/40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
        <Layers className="mx-auto mb-4 text-gray-300 dark:text-gray-700" size={48} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Nenhuma compra parcelada em aberto
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4">
          Compras parceladas no cartão de crédito com parcelas ainda pendentes aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gruposEmAberto.map((g) => (
          <Card key={g.chave} className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {g.representante.descricao || "Compra parcelada"}
                    </p>
                    {g.representante.categoria && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{g.representante.categoria}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                  {mask(formatarMoeda(g.totalCompra))}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Progresso</span>
                  <span>{g.parcelasPagas}/{g.totalParcelas}</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
                    style={{ width: `${g.porcentagem}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {g.representante.data && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatarData(g.representante.data)}
                  </div>
                )}
                <span>{g.totalParcelas}x de {mask(formatarMoeda(Number(g.representante.valor)))}</span>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Restante ({g.parcelasRestantes}x):</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{mask(formatarMoeda(g.valorRestante))}</span>
              </div>

              <AntecipacoesDoParcelamento parcelamentoId={g.chave} />

              {g.bloqueado && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  Desfaça a antecipação pendente pra editar, antecipar de novo ou excluir
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => onEditar(g.representante)}
                  disabled={g.bloqueado}
                >
                  <Pencil className="w-3 h-3 mr-1.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                  onClick={() => abrirAntecipar(g)}
                  disabled={g.bloqueado}
                >
                  <FastForward className="w-3 h-3 mr-1.5" />
                  Antecipar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  onClick={() => onExcluir(g.representante)}
                  disabled={g.bloqueado}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Parcelamentos totalmente antecipados — sem transação viva
          restante, mostrados num card simplificado só com os dados da
          própria antecipação (e a opção de desfazer) */}
      {antecipacoesOrfas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {antecipacoesOrfas.map((a) => (
            <Card key={a.chave} className="dark:bg-gray-900 dark:border-gray-800 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                      <FastForward className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {a.descricao}
                      </p>
                      {a.categoria && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.categoria}</p>
                      )}
                    </div>
                  </div>
                  <Badge className="text-[10px] px-2 py-0.5 border-0 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Totalmente antecipada
                  </Badge>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Valor de face antecipado: <span className="font-semibold text-gray-800 dark:text-gray-200">{mask(formatarMoeda(a.valorTotalAntecipado))}</span>
                </p>

                <AntecipacoesDoParcelamento parcelamentoId={a.chave} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!parcelamentoAntecipar} onOpenChange={(open) => { if (!open) setParcelamentoAntecipar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Antecipar parcelas</DialogTitle>
            <DialogDescription>
              Quita as últimas parcelas de &quot;{parcelamentoAntecipar?.representante.descricao || "esta compra"}&quot; agora,
              removendo-as das faturas futuras.
            </DialogDescription>
          </DialogHeader>

          {parcelamentoAntecipar && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="antecipar-qtd">Quantas parcelas antecipar</Label>
                <Input
                  id="antecipar-qtd"
                  type="number"
                  min="1"
                  max={parcelamentoAntecipar.parcelasRestantes}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Máximo: {parcelamentoAntecipar.parcelasRestantes} parcela(s) restante(s)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="antecipar-desconto">Desconto por antecipação (opcional)</Label>
                <InputMoeda
                  id="antecipar-desconto"
                  value={desconto}
                  onChange={setDesconto}
                  placeholder="0,00"
                />
              </div>

              {qtdParaCalculo > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-amber-700 dark:text-amber-300">Valor de face ({qtdParaCalculo}x):</span>
                    <span className="font-medium text-amber-900 dark:text-amber-200">{mask(formatarMoeda(totalAntecipacao))}</span>
                  </div>
                  {descontoParaCalculo > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-amber-700 dark:text-amber-300">Com desconto:</span>
                      <span className="font-semibold text-amber-900 dark:text-amber-200">{mask(formatarMoeda(totalComDesconto))}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 pt-1">
                    O limite do cartão volta pelo valor de face ({mask(formatarMoeda(totalAntecipacao))}), independente do desconto.
                  </p>
                </div>
              )}

              {erroAntecipacao && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {erroAntecipacao}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setParcelamentoAntecipar(null)}>Cancelar</Button>
            <Button onClick={confirmarAntecipacao} disabled={antecipar.isPending}>
              {antecipar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Antecipando...</> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}