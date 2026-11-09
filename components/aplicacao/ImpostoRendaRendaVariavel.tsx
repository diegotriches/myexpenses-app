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
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Receipt, Settings2, ChevronDown, ChevronUp, Info, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useHideValues } from "@/contexts/HideValuesContext";
import {
  useRendaVariavel, useProventosRv, useIrRv, useSalvarConfigIrRv, useMarcarDarfsRv,
} from "@/hooks/useRendaVariavel";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { TIPO_ATIVO_LABEL } from "@/utils/rendaVariavelUtils";
import { TIPO_PROVENTO_LABEL, type TipoProvento } from "@/utils/proventosUtils";
import {
  CONFIG_IR_PADRAO, apurarVendas, apurarMeses, resumirAnos, bensEDireitosEm,
  type ConfigIr, type MesIr, type OperacaoIr,
} from "@/utils/irRendaVariavelUtils";
import { formatarMoeda } from "@/utils/formatadores";

const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (c: string) => `${MESES[Number(c.slice(5, 7)) - 1]}/${c.slice(0, 4)}`;

const CHAVES_CONFIG = Object.keys(CONFIG_IR_PADRAO) as (keyof ConfigIr & string)[];

const CAMPOS_ALIQUOTA: { chave: keyof ConfigIr; rotulo: string }[] = [
  { chave: "aliquotaAcao", rotulo: "Ações (swing)" },
  { chave: "aliquotaEtf", rotulo: "ETFs (swing)" },
  { chave: "aliquotaBdr", rotulo: "BDRs (swing)" },
  { chave: "aliquotaFii", rotulo: "FIIs" },
  { chave: "aliquotaDayTrade", rotulo: "Day trade" },
];
const CAMPOS_VALOR: { chave: keyof ConfigIr; rotulo: string; dica?: string }[] = [
  { chave: "limiteIsencaoAcoes", rotulo: "Isenção: vendas de ações no mês até (R$)" },
  { chave: "prejuizoInicialComum", rotulo: "Prejuízo anterior — ações/ETFs/BDRs (R$)", dica: "Só se tinha prejuízo a compensar de antes do histórico importado." },
  { chave: "prejuizoInicialFii", rotulo: "Prejuízo anterior — FIIs (R$)" },
  { chave: "prejuizoInicialDayTrade", rotulo: "Prejuízo anterior — day trade (R$)" },
];

export default function ImpostoRendaRendaVariavel() {
  const { mask } = useHideValues();
  const { data: rv } = useRendaVariavel();
  const { data: proventos } = useProventosRv();
  const { data: ir, isLoading } = useIrRv();
  const salvarConfig = useSalvarConfigIrRv();
  const marcar = useMarcarDarfsRv();

  const config = ir?.config ?? CONFIG_IR_PADRAO;
  const pagos = useMemo(() => new Set(ir?.darfsPagos ?? []), [ir]);
  const hoje = hojeBrt();

  const [aberto, setAberto] = useState(false);
  const [anoSel, setAnoSel] = useState<number | null>(null);
  const [mesAberto, setMesAberto] = useState<string | null>(null);

  const operacoes = useMemo<OperacaoIr[]>(() => rv?.operacoes ?? [], [rv]);
  const meses = useMemo(() => apurarMeses(apurarVendas(operacoes), config), [operacoes, config]);
  const anos = useMemo(() => resumirAnos(meses), [meses]);

  const darfs = useMemo(
    () => meses.filter((m) => m.darf).map((m) => ({ competencia: m.competencia, ...m.darf! })),
    [meses],
  );
  const darfsAbertos = darfs.filter((d) => !pagos.has(d.competencia));
  const ultimoMes = meses[meses.length - 1];
  const prejuizo = ultimoMes?.prejuizoFinal ?? {
    comum: config.prejuizoInicialComum, fii: config.prejuizoInicialFii, day: config.prejuizoInicialDayTrade,
  };
  const pendente = ultimoMes?.impostoPendente ?? 0;
  const algumEstimado = meses.some((m) => m.estimado);

  const ano = anoSel ?? anos[0]?.ano ?? Number(hoje.slice(0, 4));
  const mesesDoAno = meses.filter((m) => m.competencia.startsWith(String(ano))).reverse();
  const resumoAno = anos.find((a) => a.ano === ano);

  const ateDeclaracao = `${ano}-12-31`;
  const bens = ateDeclaracao <= hoje ? bensEDireitosEm(operacoes, ateDeclaracao) : [];
  const proventosAno = useMemo(() => {
    const t: Record<TipoProvento, number> = { dividendo: 0, jcp: 0, rendimento: 0 };
    (proventos ?? []).filter((p) => p.data.startsWith(String(ano))).forEach((p) => { t[p.tipo] += p.valorLiquido; });
    return t;
  }, [proventos, ano]);

  const anosDisponiveis = Array.from(new Set<number>([...anos.map((a) => a.ano), Number(hoje.slice(0, 4))]))
    .sort((a, b) => b - a);

  // ── Configuração ─────────────────────────────────────────────────────────
  const [cfgOpen, setCfgOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [erroCfg, setErroCfg] = useState<string | null>(null);

  const abrirConfig = () => {
    const f: Record<string, string> = {};
    CHAVES_CONFIG.forEach((k) => { f[k] = String(config[k]).replace(".", ","); });
    setForm(f);
    setErroCfg(null);
    setCfgOpen(true);
  };

  const salvar = async () => {
    const novo = {} as ConfigIr;
    for (const k of CHAVES_CONFIG) {
      const v = Number((form[k] ?? "").replace(",", "."));
      if (!Number.isFinite(v) || v < 0) return setErroCfg("Preencha todos os campos com valores válidos (≥ 0).");
      if (k.startsWith("aliquota") && v > 100) return setErroCfg("Alíquota deve estar entre 0% e 100%.");
      novo[k] = v;
    }
    try {
      await salvarConfig.mutateAsync(novo);
      setCfgOpen(false);
    } catch (e: any) {
      setErroCfg(e.message);
    }
  };

  const textoStatus = (m: MesIr) => {
    if (m.imposto.total > 0) return { t: `Imposto ${mask(formatarMoeda(m.imposto.total))}`, c: "text-red-600 dark:text-red-400" };
    if (m.acaoIsenta) return { t: "Ganho isento", c: "text-green-600 dark:text-green-400" };
    if (m.resultado.total < 0) return { t: "Prejuízo", c: "text-gray-500 dark:text-gray-400" };
    return { t: "Sem imposto", c: "text-gray-500 dark:text-gray-400" };
  };

  const linha = (rotulo: string, valor: string, destaque = false) => (
    <div key={rotulo} className="flex justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400">{rotulo}</span>
      <span className={destaque ? "font-semibold text-gray-900 dark:text-white" : "text-gray-800 dark:text-gray-200"}>{valor}</span>
    </div>
  );

  if (isLoading || (operacoes.length === 0 && !ir)) return null;
  if (meses.length === 0 && operacoes.length === 0) return null;

  return (
    <>
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-500" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Imposto de renda</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Apuração mensal calculada a partir das suas operações</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={abrirConfig}>
              <Settings2 className="w-4 h-4 mr-1.5" /> Alíquotas
            </Button>
          </div>

          {/* DARFs em aberto */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2">
            {darfsAbertos.length === 0 ? (
              <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Nenhum DARF pendente.
                {pendente > 0 && <span className="text-gray-500 dark:text-gray-400"> {mask(formatarMoeda(pendente))} abaixo de R$ 10 acumulados para o próximo mês.</span>}
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  DARF pendente (código 6015) — {darfsAbertos.length}
                </p>
                {darfsAbertos.map((d) => {
                  const vencido = d.vencimento < hoje;
                  return (
                    <div key={d.competencia} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{nomeMes(d.competencia)}</span>
                        <span className="text-gray-500 dark:text-gray-400"> · vence {fmtIso(d.vencimento)}</span>
                        {vencido && <Badge variant="outline" className="ml-2 text-[10px] border-red-400 text-red-600 dark:text-red-400">vencido</Badge>}
                        {d.acumuladoAnterior > 0 && <span className="text-xs text-gray-400"> (inclui {mask(formatarMoeda(d.acumuladoAnterior))} acumulados)</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-white">{mask(formatarMoeda(d.valor))}</span>
                        <Button size="sm" variant="outline" disabled={marcar.isPending}
                          onClick={() => marcar.mutate({ itens: [{ competencia: d.competencia, valor: d.valor }], pago: true })}>
                          Marcar paga
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {darfsAbertos.length > 1 && (
                  <Button size="sm" variant="ghost" className="text-xs h-7" disabled={marcar.isPending}
                    onClick={() => marcar.mutate({ itens: darfsAbertos.map((d) => ({ competencia: d.competencia, valor: d.valor })), pago: true })}>
                    Marcar todos como pagos
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Prejuízo a compensar */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {([
              ["Ações/ETFs/BDRs", prejuizo.comum],
              ["FIIs", prejuizo.fii],
              ["Day trade", prejuizo.day],
            ] as const).map(([r, v]) => (
              <div key={r} className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Prejuízo a compensar</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{mask(formatarMoeda(v))}</p>
                <p className="text-[11px] text-gray-400">{r}</p>
              </div>
            ))}
          </div>

          {algumEstimado && (
            <p className="text-xs text-gray-500 dark:text-gray-400 flex gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              Meses marcados com * usam datas de negócio estimadas (importação da B3): confira a virada do mês, e day trade não é detectado nessas operações. A importação também não traz taxas, e ativos que você optou por não importar ficam fora da apuração.
            </p>
          )}

          <Button variant="ghost" size="sm" className="w-full justify-between" onClick={() => setAberto((v) => !v)}>
            <span>Apuração mensal e dados para a declaração</span>
            {aberto ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {aberto && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600 dark:text-gray-400">Ano</Label>
                <Select value={String(ano)} onValueChange={(v) => { setAnoSel(Number(v)); setMesAberto(null); }}>
                  <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {resumoAno && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-sm space-y-1">
                  {linha("Resultado do ano", mask(formatarMoeda(resumoAno.resultado)), true)}
                  {linha("Ganhos isentos (ações até o limite)", mask(formatarMoeda(resumoAno.ganhoIsento)))}
                  {linha("Imposto apurado", mask(formatarMoeda(resumoAno.impostoDevido)))}
                </div>
              )}

              {mesesDoAno.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma venda em {ano}.</p>
              ) : (
                <div className="space-y-1.5">
                  {mesesDoAno.map((m) => {
                    const s = textoStatus(m);
                    const exp = mesAberto === m.competencia;
                    return (
                      <div key={m.competencia} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <button type="button" className="w-full flex items-center justify-between gap-2 p-2.5 text-sm"
                          onClick={() => setMesAberto(exp ? null : m.competencia)}>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {nomeMes(m.competencia)}{m.estimado && "*"}
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="text-gray-600 dark:text-gray-400">{mask(formatarMoeda(m.resultado.total))}</span>
                            <span className={`text-xs ${s.c}`}>{s.t}</span>
                            {exp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                          </span>
                        </button>
                        {exp && (
                          <div className="border-t border-gray-100 dark:border-gray-800 p-2.5 text-xs space-y-1">
                            {linha("Vendas de ações (swing)", mask(formatarMoeda(m.vendasAcoes)))}
                            {m.resultado.acao !== 0 && linha(`Resultado ${TIPO_ATIVO_LABEL.acao}s${m.acaoIsenta ? " (isento)" : ""}`, mask(formatarMoeda(m.resultado.acao)))}
                            {m.resultado.etf !== 0 && linha("Resultado ETFs", mask(formatarMoeda(m.resultado.etf)))}
                            {m.resultado.bdr !== 0 && linha("Resultado BDRs", mask(formatarMoeda(m.resultado.bdr)))}
                            {m.resultado.fii !== 0 && linha("Resultado FIIs", mask(formatarMoeda(m.resultado.fii)))}
                            {m.resultado.dayTrade !== 0 && linha("Resultado day trade", mask(formatarMoeda(m.resultado.dayTrade)))}
                            {(m.compensado.comum + m.compensado.fii + m.compensado.day) > 0 &&
                              linha("Prejuízo compensado", mask(formatarMoeda(m.compensado.comum + m.compensado.fii + m.compensado.day)))}
                            {linha("Base de cálculo", mask(formatarMoeda(m.base.comum + m.base.fii + m.base.day)))}
                            {linha("Imposto do mês", mask(formatarMoeda(m.imposto.total)), true)}
                            {m.darf && (
                              <p className="pt-1 text-gray-500 dark:text-gray-400">
                                DARF {m.darf.codigo}: {mask(formatarMoeda(m.darf.valor))}, vence {fmtIso(m.darf.vencimento)} ·{" "}
                                {pagos.has(m.competencia) ? (
                                  <button type="button" className="underline"
                                    onClick={() => marcar.mutate({ itens: [{ competencia: m.competencia, valor: m.darf!.valor }], pago: false })}>
                                    paga (desfazer)
                                  </button>
                                ) : "pendente"}
                              </p>
                            )}
                            {!m.darf && m.impostoPendente > 0 && (
                              <p className="pt-1 text-gray-500 dark:text-gray-400">Abaixo de R$ 10: acumulado para o próximo mês.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Declaração anual */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Para a declaração de {ano}</p>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs space-y-1">
                  <p className="font-medium text-gray-700 dark:text-gray-300">Proventos recebidos (líquidos)</p>
                  {(Object.keys(proventosAno) as TipoProvento[]).map((t) => linha(
                    t === "jcp" ? "JCP (tributação exclusiva)" : t === "rendimento" ? "Rendimentos de FII (isentos)" : "Dividendos (isentos)",
                    mask(formatarMoeda(proventosAno[t])),
                  ))}
                  <p className="text-gray-400 pt-1">
                    {TIPO_PROVENTO_LABEL.jcp} está líquido do IR retido; na ficha use o valor bruto do informe de rendimentos da corretora.
                  </p>
                </div>

                <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3 text-xs space-y-1">
                  <p className="font-medium text-gray-700 dark:text-gray-300">Bens e direitos em 31/12/{ano} (custo de aquisição)</p>
                  {ateDeclaracao > hoje ? (
                    <p className="text-gray-500 dark:text-gray-400">O ano ainda não terminou.</p>
                  ) : bens.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">Sem posições nessa data.</p>
                  ) : (
                    bens.map((b) => linha(
                      `${b.ticker} · ${b.quantidade} ${TIPO_ATIVO_LABEL[b.tipoAtivo]}`,
                      mask(formatarMoeda(b.custoTotal)),
                    ))
                  )}
                </div>
              </div>

              <p className="text-[11px] text-gray-400">
                Estimativa para controle pessoal: confira regras e valores antes de pagar ou declarar. Não considera o IRRF &quot;dedo-duro&quot; nem eventos corporativos ainda não lançados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alíquotas e parâmetros</DialogTitle>
            <DialogDescription>
              Padrão: 15% para ações, ETFs e BDRs, 20% para FIIs e day trade, isenção de ações até R$ 20 mil em vendas no mês.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {CAMPOS_ALIQUOTA.map((c) => (
                <div key={c.chave} className="space-y-1">
                  <Label className="text-xs">{c.rotulo} (%)</Label>
                  <Input inputMode="decimal" value={form[c.chave] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [c.chave]: e.target.value }))} />
                </div>
              ))}
            </div>
            {CAMPOS_VALOR.map((c) => (
              <div key={c.chave} className="space-y-1">
                <Label className="text-xs">{c.rotulo}</Label>
                <InputMoeda value={form[c.chave] ?? ""} onChange={(v) => setForm((f) => ({ ...f, [c.chave]: v }))} />
                {c.dica && <p className="text-[11px] text-gray-400">{c.dica}</p>}
              </div>
            ))}
            {erroCfg && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erroCfg}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setForm(Object.fromEntries(Object.entries(CONFIG_IR_PADRAO).map(([k, v]) => [k, String(v).replace(".", ",")])))}>
              Restaurar padrão
            </Button>
            <Button onClick={salvar} disabled={salvarConfig.isPending}>
              {salvarConfig.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}