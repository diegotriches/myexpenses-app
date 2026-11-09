"use client";

// src/components/aplicacao/ImportarOperacoesDialog.tsx

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Loader2, AlertCircle, Info, FileSpreadsheet, ChevronDown, ChevronUp, CheckCircle2, TriangleAlert,
} from "lucide-react";
import { useImportarOperacoesRv } from "@/hooks/useRendaVariavel";
import type { OperacaoRvApi } from "@/services/rendaVariavelService";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import {
  TIPO_ATIVO_LABEL, TICKER_REGEX, normalizarTicker, validarSequencia, EVENTO_LABEL,
  type OperacaoRv, type TipoAtivo,
} from "@/utils/rendaVariavelUtils";
import {
  lerPlanilhaOperacoes, lerPosicaoOficial, sugerirIgnorar, sugerirRenomeacoes,
  sugerirTipoAtivoPorNome, paraOperacaoRv, saldoPorTicker,
  type LeituraOperacoes, type OperacaoImportavel,
} from "@/utils/importacaoOperacoesUtils";
import { formatarMoeda } from "@/utils/formatadores";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existentes: OperacaoRvApi[];
}

const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

async function lerArquivo(file: File) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  return wb.SheetNames.map((nome) => ({
    nome,
    linhas: XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[nome], { header: 1, raw: true, defval: "" }),
  }));
}

export default function ImportarOperacoesDialog({ open, onOpenChange, existentes }: Props) {
  const importar = useImportarOperacoesRv();
  const movRef = useRef<HTMLInputElement>(null);
  const relRef = useRef<HTMLInputElement>(null);

  const [lendo, setLendo] = useState(false);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [arquivoRel, setArquivoRel] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<LeituraOperacoes | null>(null);
  const [oficial, setOficial] = useState<Record<string, number> | null>(null);
  const [corte, setCorte] = useState(`${Number(hojeBrt().slice(0, 4)) - 1}-12-31`);
  const [erro, setErro] = useState<string | null>(null);

  const [tickersIgnorados, setTickersIgnorados] = useState<Set<string>>(new Set());
  const [idsIgnorados, setIdsIgnorados] = useState<Set<string>>(new Set());
  const [renomear, setRenomear] = useState<Record<string, string>>({});
  const [tipoAtivo, setTipoAtivo] = useState<Record<string, TipoAtivo>>({});
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [verIgnorados, setVerIgnorados] = useState(false);

  const reiniciar = () => {
    setArquivo(null); setArquivoRel(null); setLeitura(null); setOficial(null);
    setErro(null); setTickersIgnorados(new Set()); setIdsIgnorados(new Set());
    setRenomear({}); setTipoAtivo({}); setAbertos(new Set());
  };

  const aoAbrir = (v: boolean) => {
    if (v) reiniciar();
    onOpenChange(v);
  };

  const aoEscolherMovimentacao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErro(null); setLeitura(null); setArquivo(file.name); setLendo(true);
    try {
      const abas = await lerArquivo(file);
      const aba = abas.find((a) => /movimenta/i.test(a.nome)) ?? abas[0];
      const r = lerPlanilhaOperacoes(aba.linhas);
      if (r.erro) { setErro(r.erro); return; }
      setLeitura(r);
      setIdsIgnorados(new Set());
      setTickersIgnorados(new Set(sugerirIgnorar(r.operacoes)));
      setRenomear(sugerirRenomeacoes(r.operacoes, r.atualizacoes));
      const nomes = new Map<string, string>();
      r.operacoes.forEach((o) => { if (!nomes.has(o.ticker)) nomes.set(o.ticker, o.nome); });
      const tipos: Record<string, TipoAtivo> = {};
      nomes.forEach((nome, t) => {
        tipos[t] = existentes.find((x) => x.ticker === t)?.tipoAtivo ?? sugerirTipoAtivoPorNome(t, nome);
      });
      setTipoAtivo(tipos);
    } catch {
      setErro("Não consegui ler o arquivo. Use a planilha \"Movimentação\" (.xlsx) da Área do Investidor da B3.");
    } finally {
      setLendo(false);
    }
  };

  const aoEscolherRelatorio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const pos = lerPosicaoOficial(await lerArquivo(file));
      if (Object.keys(pos).length === 0) { setErro("Não encontrei posições nesse relatório. Use o \"Relatório consolidado anual\" da B3."); return; }
      setOficial(pos);
      setArquivoRel(file.name);
      setErro(null);
    } catch {
      setErro("Não consegui ler o relatório consolidado.");
    }
  };

  // ── Seleção final ──────────────────────────────────────────────────────────
  const chavesExistentes = useMemo(
    () => new Set(existentes.map((e) => e.origemImportacao).filter((c): c is string => !!c)),
    [existentes],
  );

  const grupos = useMemo(() => {
    const m = new Map<string, OperacaoImportavel[]>();
    (leitura?.operacoes ?? []).forEach((o) => {
      const l = m.get(o.ticker) ?? [];
      l.push(o);
      m.set(o.ticker, l);
    });
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [leitura]);

  const destinoDe = (t: string) => normalizarTicker(renomear[t] ?? t);

  const selecionadas = useMemo(
    () =>
      (leitura?.operacoes ?? []).filter(
        (o) => !tickersIgnorados.has(o.ticker) && !idsIgnorados.has(o.id) && !chavesExistentes.has(o.chave),
      ),
    [leitura, tickersIgnorados, idsIgnorados, chavesExistentes],
  );

  const jaImportadas = useMemo(
    () => (leitura?.operacoes ?? []).filter((o) => chavesExistentes.has(o.chave)).length,
    [leitura, chavesExistentes],
  );

  const tickerInvalido = useMemo(
    () => grupos.find(([t]) => !tickersIgnorados.has(t) && !TICKER_REGEX.test(destinoDe(t)))?.[0] ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grupos, tickersIgnorados, renomear],
  );

  // Histórico completo por ticker de destino (existentes + selecionadas)
  const historicoPorDestino = useMemo(() => {
    const m = new Map<string, OperacaoRv[]>();
    existentes.forEach((x) => {
      const l = m.get(x.ticker) ?? [];
      l.push({
        id: x.id, ticker: x.ticker, tipoAtivo: x.tipoAtivo, tipo: x.tipo, data: x.data,
        quantidade: x.quantidade, precoUnitario: x.precoUnitario, taxas: x.taxas, evento: x.evento,
      });
      m.set(x.ticker, l);
    });
    selecionadas.forEach((o) => {
      const d = destinoDe(o.ticker);
      const l = m.get(d) ?? [];
      l.push(paraOperacaoRv(o, d, tipoAtivo[o.ticker] ?? "acao"));
      m.set(d, l);
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existentes, selecionadas, renomear, tipoAtivo]);

  const problemas = useMemo(() => {
    const afetados = new Set(selecionadas.map((o) => destinoDe(o.ticker)));
    const out: { ticker: string; faltam: number; data: string }[] = [];
    afetados.forEach((t) => {
      const p = validarSequencia(historicoPorDestino.get(t) ?? []);
      if (p) out.push({ ticker: t, faltam: p.faltam, data: p.data });
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionadas, historicoPorDestino, renomear]);

  const conferencia = useMemo(() => {
    if (!oficial) return null;
    const todas: OperacaoRv[] = [];
    historicoPorDestino.forEach((l) => todas.push(...l));
    const calc = saldoPorTicker(todas, corte);
    const tickers = new Set<string>([
      ...Object.keys(oficial),
      ...Array.from(calc.entries()).filter(([, q]) => q !== 0).map(([t]) => t),
    ]);
    const linhas = Array.from(tickers).sort().map((t) => ({
      ticker: t, oficial: oficial[t] ?? 0, calculado: calc.get(t) ?? 0,
    }));
    return { linhas, divergentes: linhas.filter((l) => l.oficial !== l.calculado) };
  }, [oficial, historicoPorDestino, corte]);

  const alternarSet = (set: Set<string>, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v); else n.add(v);
    return n;
  };

  const eventos = selecionadas.filter((o) => o.evento).length;
  const estimadas = selecionadas.filter((o) => o.dataEstimada).length;
  const bloqueado = problemas.length > 0 || !!tickerInvalido || selecionadas.length === 0;

  const confirmar = async () => {
    if (bloqueado) return;
    try {
      await importar.mutateAsync(
        selecionadas.map((o) => ({
          chave: o.chave,
          ticker: destinoDe(o.ticker),
          tipoAtivo: tipoAtivo[o.ticker] ?? "acao",
          tipo: o.tipo,
          evento: o.evento,
          data: o.data,
          quantidade: o.quantidade,
          precoUnitario: o.precoUnitario,
          dataEstimada: o.dataEstimada,
          instituicao: o.instituicao,
        })),
      );
      onOpenChange(false);
    } catch (e: any) {
      setErro(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={aoAbrir}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar operações da B3</DialogTitle>
          <DialogDescription>
            Planilha &quot;Movimentação&quot; (Área do Investidor → Extratos → Movimentação). Pode importar o histórico completo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input ref={movRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={aoEscolherMovimentacao} />
          <input ref={relRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={aoEscolherRelatorio} />

          <Button variant="outline" className="w-full" onClick={() => movRef.current?.click()} disabled={lendo}>
            {lendo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            {arquivo ?? "Escolher planilha de Movimentação (.xlsx)"}
          </Button>

          {leitura && (
            <>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Negócios e eventos encontrados</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{leitura.operacoes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Serão importados</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selecionadas.length}</span>
                </div>
                {jaImportadas > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Já importados antes</span>
                    <span className="text-gray-700 dark:text-gray-300">{jaImportadas}</span>
                  </div>
                )}
                {estimadas > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-1 flex gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    A planilha só traz a data de liquidação. A data do negócio foi estimada (2 dias úteis antes) e não traz taxas — o preço é o valor total ÷ quantidade.
                  </p>
                )}
                {eventos > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex gap-1.5">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {eventos} desdobramento(s)/bonificação(ões) entram como quantidade a custo zero.
                  </p>
                )}
              </div>

              {/* Ativos */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Ativos encontrados</p>
                {grupos.map(([ticker, ops]) => {
                  const ignorado = tickersIgnorados.has(ticker);
                  const aberto = abertos.has(ticker);
                  const incluidas = ops.filter((o) => !idsIgnorados.has(o.id));
                  const comProblema = !ignorado && problemas.some((p) => p.ticker === destinoDe(ticker));
                  const semCompra = sugerirIgnorar(ops).includes(ticker);
                  const sugestaoTroca = renomear[ticker] && renomear[ticker] !== ticker;
                  return (
                    <div
                      key={ticker}
                      className={`border rounded-lg p-2.5 space-y-2 ${ignorado ? "opacity-60 border-gray-200 dark:border-gray-800" : "border-gray-200 dark:border-gray-700"} ${comProblema ? "border-red-300 dark:border-red-800" : ""}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Importar ${ticker}`}
                          checked={!ignorado}
                          onChange={() => setTickersIgnorados((s) => alternarSet(s, ticker))}
                          className="h-4 w-4"
                        />
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">{ticker}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {incluidas.length}/{ops.length} movimento(s)
                        </span>
                        {semCompra && <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 dark:text-amber-400">venda sem compra no histórico</Badge>}
                        {sugestaoTroca && !ignorado && <Badge variant="outline" className="text-[10px] border-blue-400 text-blue-700 dark:text-blue-400">unido a {renomear[ticker]}</Badge>}
                        <button
                          type="button"
                          className="ml-auto text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          aria-label={aberto ? "Recolher" : "Ver movimentos"}
                          onClick={() => setAbertos((s) => alternarSet(s, ticker))}
                        >
                          {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {!ignorado && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400">Tipo</span>
                          <Select
                            value={tipoAtivo[ticker] ?? "acao"}
                            onValueChange={(v) => setTipoAtivo((s) => ({ ...s, [ticker]: v as TipoAtivo }))}
                          >
                            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(TIPO_ATIVO_LABEL) as TipoAtivo[]).map((t) => (
                                <SelectItem key={t} value={t}>{TIPO_ATIVO_LABEL[t]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-gray-500 dark:text-gray-400">Importar como</span>
                          <Input
                            value={renomear[ticker] ?? ticker}
                            onChange={(e) => {
                              const v = normalizarTicker(e.target.value);
                              setRenomear((s) => {
                                const n = { ...s };
                                if (v === ticker) delete n[ticker]; else n[ticker] = v;
                                return n;
                              });
                            }}
                            className="h-8 w-28 text-xs uppercase"
                            maxLength={12}
                          />
                          {!TICKER_REGEX.test(destinoDe(ticker)) && (
                            <span className="text-red-600 dark:text-red-400">ticker inválido</span>
                          )}
                        </div>
                      )}

                      {comProblema && (
                        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {(() => {
                            const p = problemas.find((x) => x.ticker === destinoDe(ticker))!;
                            return `Venda em ${fmtIso(p.data)} sem saldo (faltam ${p.faltam}). Ignore este ativo ou os movimentos problemáticos.`;
                          })()}
                        </p>
                      )}

                      {aberto && (
                        <div className="border-t border-gray-100 dark:border-gray-800 pt-2 space-y-1">
                          {[...ops].sort((a, b) => (a.data < b.data ? -1 : 1)).map((o) => (
                            <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!idsIgnorados.has(o.id)}
                                disabled={ignorado}
                                onChange={() => setIdsIgnorados((s) => alternarSet(s, o.id))}
                                className="h-3.5 w-3.5"
                              />
                              <span className={o.tipo === "compra" ? "text-blue-600 dark:text-blue-400 font-medium" : "text-orange-600 dark:text-orange-400 font-medium"}>
                                {o.evento ? EVENTO_LABEL[o.evento] : o.tipo === "compra" ? "Compra" : "Venda"}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {fmtIso(o.data)}{o.dataEstimada && "*"} · {o.quantidade}
                                {o.evento ? " (custo zero)" : ` × ${formatarMoeda(o.precoUnitario)}`}
                              </span>
                              {chavesExistentes.has(o.chave) && <span className="text-gray-400">já importada</span>}
                            </label>
                          ))}
                          <p className="text-[11px] text-gray-400">* data do negócio estimada</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ignorados / atenção */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2.5">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                  onClick={() => setVerIgnorados((v) => !v)}
                >
                  <span>Movimentos da planilha que não são importados aqui</span>
                  {verIgnorados ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {verIgnorados && (
                  <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {leitura.ignorados.map((i) => (
                      <p key={i.motivo}>{i.quantidade}× {i.motivo}</p>
                    ))}
                    {leitura.avisos.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 space-y-0.5">
                        <p className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                          <TriangleAlert className="w-3.5 h-3.5" /> Mudam posição e exigem lançamento manual
                        </p>
                        {leitura.avisos.map((a, i) => (
                          <p key={i}>{a.ticker} · {a.data ? fmtIso(a.data) : "—"} · {a.movimentacao}{a.quantidade ? ` (${a.quantidade})` : ""}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Conferência */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Conferir com o relatório consolidado (opcional)</p>
                  <Button size="sm" variant="outline" onClick={() => relRef.current?.click()}>
                    {arquivoRel ? "Trocar" : "Escolher .xlsx"}
                  </Button>
                </div>
                {oficial && conferencia && (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Posição em</span>
                      <Input type="date" value={corte} onChange={(e) => setCorte(e.target.value)} className="h-8 w-40 text-xs" />
                    </div>
                    {conferencia.divergentes.length === 0 ? (
                      <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Todas as {conferencia.linhas.length} posições batem com o relatório.
                      </p>
                    ) : (
                      <div className="text-xs space-y-0.5">
                        <p className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <TriangleAlert className="w-3.5 h-3.5" />
                          {conferencia.divergentes.length} divergência(s) de {conferencia.linhas.length}:
                        </p>
                        {conferencia.divergentes.map((d) => (
                          <p key={d.ticker} className="text-gray-700 dark:text-gray-300">
                            {d.ticker}: relatório {d.oficial} · importação {d.calculado}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
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
          <Button onClick={confirmar} disabled={importar.isPending || !leitura || bloqueado}>
            {importar.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</>
              : `Importar ${selecionadas.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}