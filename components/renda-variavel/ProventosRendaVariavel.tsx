"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Plus, Upload, Trash2, Loader2, AlertCircle, Info, Coins, FileSpreadsheet,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid,
} from "recharts";
import { useHideValues } from "@/contexts/HideValuesContext";
import {
  useProventosRv, useCriarProventoRv, useExcluirProventoRv, useImportarProventosRv, useRendaVariavel,
} from "@/hooks/useRendaVariavel";
import type { Conta } from "@/types/conta";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import { TICKER_REGEX, normalizarTicker, calcularPosicoes, encerramentoRecente } from "@/utils/rendaVariavelUtils";
import { posicaoEm } from "@/utils/eventosCorporativosUtils";
import {
  TIPO_PROVENTO_LABEL, lerPlanilhaProventos, resumirProventos,
  type ProventoRv, type ResultadoLeitura, type TipoProvento,
} from "@/utils/proventosUtils";
import MovCampoConta from "@/components/transacoes/MovCampoConta";
import { formatarMoeda } from "@/utils/formatadores";
import { textoDoErro } from "@/utils/erro";

interface Props {
  contas: Conta[];
}

const fmtIso = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

// Aceita "6,75" e "1.234,56"
const lerDecimal = (s: string): number => {
  const t = s.trim();
  if (!t) return NaN;
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
};

const OUTRO_TICKER = "__outro";

const formatarPorUnidade = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(valor);

const COR_TIPO: Record<TipoProvento, string> = {
  dividendo: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  jcp: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  rendimento: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const COR_GRAFICO: Record<TipoProvento, string> = {
  rendimento: "#8b5cf6",
  dividendo: "#22c55e",
  jcp: "#3b82f6",
};

const POR_PAGINA = 8;

export default function ProventosRendaVariavel({ contas }: Props) {
  const { mask } = useHideValues();
  const { data: proventos = [], isLoading } = useProventosRv();
  const { data: dadosCarteira } = useRendaVariavel();
  const operacoes = useMemo(() => dadosCarteira?.operacoes ?? [], [dadosCarteira]);
  const criar = useCriarProventoRv();
  const excluir = useExcluirProventoRv();
  const importar = useImportarProventosRv();

  const hojeIso = hojeBrt();
  const resumo = useMemo(() => resumirProventos(proventos, hojeIso), [proventos, hojeIso]);
  const lista = useMemo(
    () => [...proventos].sort((a, b) => (a.data === b.data ? (a.ticker < b.ticker ? -1 : 1) : a.data < b.data ? 1 : -1)),
    [proventos],
  );
  const [verTodos, setVerTodos] = useState(false);
  const visiveis = verTodos ? lista : lista.slice(0, POR_PAGINA);

  // ── Registrar provento ─────────────────────────────────────────────────────
  const formVazio = () => ({
    ticker: "",
    tipo: "rendimento" as TipoProvento,
    data: hojeIso,
    quantidade: "",
    ajustarQuantidade: false,
    tickerManual: false,
    valor: "",
    contaId: contas[0]?.id ?? "",
    movimentar: true,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(formVazio());
  const [erro, setErro] = useState<string | null>(null);

  const updateForm = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => {
      const novo = { ...f, [k]: v };
      if (k === "ticker") novo.ticker = normalizarTicker(String(v));
      // por padrão só credita a conta quando o pagamento é de hoje
      if (k === "data") novo.movimentar = v === hojeIso;
      return novo;
    });

  const abrirModal = () => {
    setForm(formVazio());
    setErro(null);
    setModalOpen(true);
  };

  // Em carteira primeiro; encerrados recentes ainda podem pagar provento, os demais usam "Outro ticker"
  const opcoesTicker = useMemo(() => {
    const posicoes = calcularPosicoes(operacoes);
    return [
      ...posicoes.filter((p) => p.quantidade > 0),
      ...posicoes.filter((p) => p.quantidade <= 0 && encerramentoRecente(p, hojeIso)),
    ];
  }, [operacoes, hojeIso]);
  const digitarTicker = form.tickerManual || opcoesTicker.length === 0;

  const tickerValido = TICKER_REGEX.test(form.ticker);
  const quantidadeNaData = useMemo(
    () => (tickerValido ? posicaoEm(operacoes, form.ticker, form.data) : 0),
    [operacoes, form.ticker, form.data, tickerValido],
  );
  // A quantidade vem da posição na data; só é digitada se precisar de ajuste
  const quantidadeDigitada = form.ajustarQuantidade || quantidadeNaData === 0;
  const quantidadeFinal = quantidadeDigitada ? (form.quantidade ? Number(form.quantidade) : undefined) : quantidadeNaData;

  const valorPreview = lerDecimal(form.valor);
  const unidade = opcoesTicker.find((p) => p.ticker === form.ticker)?.tipoAtivo === "fii" ? "cota" : "ação";
  const plural = unidade === "cota" ? "cotas" : "ações";

  const confirmarProvento = async () => {
    setErro(null);
    const valor = lerDecimal(form.valor);
    const qtd = quantidadeFinal;
    if (!TICKER_REGEX.test(form.ticker)) return setErro("Informe um ticker válido (ex.: VALE3, RECT11).");
    if (!Number.isFinite(valor) || valor <= 0) return setErro("Informe o valor líquido recebido.");
    if (!form.data || form.data > hojeIso) return setErro("A data do pagamento não pode ser futura.");
    if (form.movimentar && !form.contaId) return setErro("Escolha a conta que recebeu o provento.");
    try {
      await criar.mutateAsync({
        ticker: form.ticker,
        tipo: form.tipo,
        data: form.data,
        valorLiquido: valor,
        quantidade: qtd,
        contaId: form.contaId || undefined,
        movimentarConta: form.movimentar,
      });
      setModalOpen(false);
    } catch (e) {
      setErro(textoDoErro(e));
    }
  };

  // ── Importar planilha ──────────────────────────────────────────────────────
  const inputRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [lendo, setLendo] = useState(false);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [leitura, setLeitura] = useState<ResultadoLeitura | null>(null);
  const [creditar, setCreditar] = useState(false);
  const [contaImport, setContaImport] = useState(contas[0]?.id ?? "");
  const [erroImport, setErroImport] = useState<string | null>(null);

  const abrirImportacao = () => {
    setArquivo(null);
    setLeitura(null);
    setCreditar(false);
    setContaImport(contas[0]?.id ?? "");
    setErroImport(null);
    setImportOpen(true);
  };

  const aoEscolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErroImport(null);
    setLeitura(null);
    setArquivo(file.name);
    setLendo(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: "" });
      const r = lerPlanilhaProventos(linhas);
      if (r.erro) setErroImport(r.erro);
      else setLeitura(r);
    } catch {
      setErroImport("Não consegui ler o arquivo. Use a planilha .xlsx exportada da Área do Investidor da B3.");
    } finally {
      setLendo(false);
    }
  };

  const totalLeitura = leitura ? leitura.proventos.reduce((s, p) => s + p.valorLiquido, 0) : 0;
  const periodoLeitura = leitura && leitura.proventos.length > 0
    ? (() => {
        const datas = leitura.proventos.map((p) => p.data).sort();
        return `${fmtIso(datas[0])} a ${fmtIso(datas[datas.length - 1])}`;
      })()
    : null;

  const confirmarImportacao = async () => {
    if (!leitura || leitura.proventos.length === 0) return;
    if (creditar && !contaImport) return setErroImport("Escolha a conta para creditar.");
    try {
      await importar.mutateAsync({
        proventos: leitura.proventos,
        creditarConta: creditar,
        contaId: creditar ? contaImport : undefined,
      });
      setImportOpen(false);
    } catch (e) {
      setErroImport(textoDoErro(e));
    }
  };

  // ── Exclusão ───────────────────────────────────────────────────────────────
  const [excluirAlvo, setExcluirAlvo] = useState<ProventoRv | null>(null);
  const confirmarExclusao = async () => {
    if (!excluirAlvo) return;
    try {
      await excluir.mutateAsync(excluirAlvo.id);
    } catch {
      /* o toast do hook mostra o motivo */
    }
    setExcluirAlvo(null);
  };

  const temDados = proventos.length > 0;

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">Proventos</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={abrirImportacao}>
            <Upload className="w-4 h-4 mr-1.5" />
            Importar planilha
          </Button>
          <Button onClick={abrirModal} className="bg-blue-700 hover:bg-blue-900 text-white">
            <Plus className="w-4 h-4 mr-1.5" />
            Registrar provento
          </Button>
        </div>
      </div>

      {isLoading ? null : !temDados ? (
        <div className="text-center py-10 bg-gray-50 dark:bg-gray-900/40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Coins className="mx-auto mb-3 text-gray-300 dark:text-gray-700" size={40} />
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto px-4">
            Nenhum provento registrado. Importe a planilha &quot;Proventos Recebidos&quot; (ou &quot;Movimentação&quot;) da B3 ou lance manualmente.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {[
              { rotulo: "Últimos 12 meses", valor: resumo.ultimos12m },
              { rotulo: `Em ${hojeIso.slice(0, 4)}`, valor: resumo.noAno },
              { rotulo: "Total recebido", valor: resumo.total },
            ].map((c) => (
              <Card key={c.rotulo} className="dark:bg-gray-900 dark:border-gray-800">
                <CardContent className="py-3 px-3 md:px-4">
                  <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400">{c.rotulo}</p>
                  <p className="text-sm md:text-lg font-bold text-purple-600 dark:text-purple-400">
                    {mask(formatarMoeda(c.valor))}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-4 pb-2">
              <div className="h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumo.porMes} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#9ca3af33" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "#9ca3af22" }}
                      formatter={(v, nome) => [
                        mask(formatarMoeda(Number(v ?? 0))),
                        TIPO_PROVENTO_LABEL[String(nome) as TipoProvento] ?? String(nome ?? ""),
                      ]}
                      labelStyle={{ color: "#111827" }}
                    />
                    <Bar dataKey="rendimento" stackId="p" fill={COR_GRAFICO.rendimento} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="dividendo" stackId="p" fill={COR_GRAFICO.dividendo} />
                    <Bar dataKey="jcp" stackId="p" fill={COR_GRAFICO.jcp} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 pb-2 text-[11px] text-gray-500 dark:text-gray-400">
                {(["rendimento", "dividendo", "jcp"] as const).map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COR_GRAFICO[t] }} />
                    {TIPO_PROVENTO_LABEL[t]}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-4 space-y-2">
              {visiveis.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white">{p.ticker}</span>
                    <Badge className={`text-[10px] px-2 py-0.5 border-0 ${COR_TIPO[p.tipo]}`}>
                      {TIPO_PROVENTO_LABEL[p.tipo]}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {fmtIso(p.data)}{p.quantidade ? ` · ${p.quantidade} un.` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {mask(`+${formatarMoeda(p.valorLiquido)}`)}
                    </span>
                    <button
                      type="button"
                      aria-label="Excluir provento"
                      onClick={() => setExcluirAlvo(p)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {lista.length > POR_PAGINA && (
                <button
                  type="button"
                  onClick={() => setVerTodos((v) => !v)}
                  className="w-full text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 pt-1"
                >
                  {verTodos ? "Mostrar menos" : `Ver todos (${lista.length})`}
                </button>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Modal Registrar provento ───────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar provento</DialogTitle>
            <DialogDescription>Dividendo, JCP ou rendimento de FII recebido.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="prov-ticker">Ticker</Label>
                {opcoesTicker.length > 0 && (
                  <Select
                    value={form.tickerManual ? OUTRO_TICKER : form.ticker || undefined}
                    onValueChange={(v) => {
                      updateForm("tickerManual", v === OUTRO_TICKER);
                      updateForm("ticker", v === OUTRO_TICKER ? "" : v);
                    }}
                  >
                    <SelectTrigger id="prov-ticker"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {opcoesTicker.map((p) => (
                        <SelectItem key={p.ticker} value={p.ticker}>
                          {p.ticker}{p.quantidade > 0 ? "" : " (vendido)"}
                        </SelectItem>
                      ))}
                      <SelectItem value={OUTRO_TICKER}>Outro ticker</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {digitarTicker && (
                  <Input
                    id={opcoesTicker.length > 0 ? "prov-ticker-manual" : "prov-ticker"}
                    value={form.ticker}
                    maxLength={7}
                    placeholder="RECT11"
                    autoCapitalize="characters"
                    onChange={(e) => updateForm("ticker", e.target.value)}
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v: TipoProvento) => updateForm("tipo", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_PROVENTO_LABEL) as TipoProvento[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_PROVENTO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prov-data">Data do pagamento</Label>
              <Input
                id="prov-data"
                type="date"
                max={hojeIso}
                value={form.data}
                onChange={(e) => updateForm("data", e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prov-valor">Valor líquido (R$)</Label>
              <InputMoeda
                id="prov-valor"
                placeholder="6,75"
                value={form.valor}
                onChange={(v) => updateForm("valor", v)}
              />
            </div>

            {tickerValido && quantidadeDigitada && (
              <div className="space-y-1.5">
                <Label htmlFor="prov-qtd">Quantidade de {plural} que receberam o provento</Label>
                <Input
                  id="prov-qtd"
                  inputMode="numeric"
                  placeholder="15"
                  value={form.quantidade}
                  onChange={(e) => updateForm("quantidade", e.target.value.replace(/\D/g, ""))}
                />
              </div>
            )}

            {valorPreview > 0 && !!quantidadeFinal && (
              <p className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                {mask(formatarMoeda(valorPreview))} ÷ {quantidadeFinal.toLocaleString("pt-BR")} {quantidadeFinal === 1 ? unidade : plural} em {fmtIso(form.data)} ={" "}
                <strong className="text-gray-900 dark:text-white">{mask(formatarPorUnidade(valorPreview / quantidadeFinal))} por {unidade}</strong>
              </p>
            )}

            {tickerValido && quantidadeNaData > 0 && (
              <button
                type="button"
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => {
                  updateForm("quantidade", form.ajustarQuantidade ? "" : String(quantidadeNaData));
                  updateForm("ajustarQuantidade", !form.ajustarQuantidade);
                }}
              >
                {form.ajustarQuantidade ? `Usar a posição na data (${quantidadeNaData.toLocaleString("pt-BR")})` : "Ajustar quantidade"}
              </button>
            )}

            <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Use o valor que caiu na conta (nos JCP, já descontado o IR retido na fonte).
            </p>

            <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Creditar na conta</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Soma o valor ao saldo e lança no extrato.
                  {form.data < hojeIso && " Em datas passadas, o padrão é só registrar o histórico."}
                </p>
              </div>
              <Switch checked={form.movimentar} onCheckedChange={(c) => updateForm("movimentar", c)} />
            </div>

            {form.movimentar && contas.length > 0 && (
              <MovCampoConta
                form={{ contaId: form.contaId, tipo: "entrada", valor: lerDecimal(form.valor) > 0 ? lerDecimal(form.valor).toFixed(2) : "" }}
                update={(_, v) => updateForm("contaId", v)}
                renderInfoBox={() => null}
              />
            )}

            {erro && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erro}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarProvento} disabled={criar.isPending}>
              {criar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Importar planilha ────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar proventos da B3</DialogTitle>
            <DialogDescription>
              Área do Investidor → Extratos. Serve a planilha &quot;Proventos Recebidos&quot; ou a &quot;Movimentação&quot; (só as linhas de provento são usadas).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={aoEscolherArquivo}
            />
            <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()} disabled={lendo}>
              {lendo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              {arquivo ?? "Escolher arquivo .xlsx"}
            </Button>

            {leitura && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Proventos encontrados</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{leitura.proventos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total líquido</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{mask(formatarMoeda(totalLeitura))}</span>
                </div>
                {periodoLeitura && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Período</span>
                    <span className="text-gray-900 dark:text-white">{periodoLeitura}</span>
                  </div>
                )}
                {leitura.ignorados.length > 0 && (
                  <details className="pt-1 text-xs text-gray-500 dark:text-gray-400">
                    <summary className="cursor-pointer">
                      {leitura.ignorados.reduce((s, i) => s + i.quantidade, 0)} linha(s) ignorada(s)
                    </summary>
                    <ul className="mt-1 space-y-0.5 list-disc pl-4">
                      {leitura.ignorados.map((i) => (
                        <li key={i.motivo}>{i.quantidade}× {i.motivo}</li>
                      ))}
                    </ul>
                  </details>
                )}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                  Proventos que já estão registrados são ignorados, então pode importar planilhas que se sobrepõem.
                </p>
              </div>
            )}

            {leitura && leitura.proventos.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Creditar na conta</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Deixe desligado se esses valores já estão no saldo da conta (padrão para histórico).
                    </p>
                  </div>
                  <Switch checked={creditar} onCheckedChange={setCreditar} />
                </div>
                {creditar && contas.length > 0 && (
                  <MovCampoConta
                    form={{ contaId: contaImport, tipo: "entrada", valor: totalLeitura.toFixed(2) }}
                    update={(_, v) => setContaImport(v)}
                    renderInfoBox={() => null}
                  />
                )}
              </>
            )}

            {erroImport && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {erroImport}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancelar</Button>
            <Button
              onClick={confirmarImportacao}
              disabled={importar.isPending || !leitura || leitura.proventos.length === 0}
            >
              {importar.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</> : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar exclusão ──────────────────────────────────────────── */}
      <ConfirmDialog
        aberto={!!excluirAlvo}
        onFechar={() => setExcluirAlvo(null)}
        titulo="Excluir provento?"
        descricao={<>
          {excluirAlvo && `${TIPO_PROVENTO_LABEL[excluirAlvo.tipo]} de ${excluirAlvo.ticker} em ${fmtIso(excluirAlvo.data)}. `}
          {excluirAlvo?.movimentouConta ? "O valor será tirado do saldo da conta e do extrato." : ""}
        </>}
        onConfirmar={confirmarExclusao}
        carregando={excluir.isPending}
        className="max-w-sm"
      />
    </div>
  );
}