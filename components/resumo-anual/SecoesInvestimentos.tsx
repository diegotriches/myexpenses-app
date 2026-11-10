"use client";

import { Landmark, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMoeda } from "@/hooks/useMoeda";
import type { InvestimentosAno } from "@/utils/resumoInvestimentosUtils";
import { TIPO_ATIVO_LABEL } from "@/utils/rendaVariavelUtils";

// Seções do Resumo Anual: investimentos no ano e dados para a declaração de IR.

const fmtData = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const fmtCompetencia = (c: string) => `${c.slice(5, 7)}/${c.slice(0, 4)}`;
const corValor = (v: number) => (v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400");

function Carregando() {
  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardContent className="p-6 space-y-3">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-28 w-full" />
      </CardContent>
    </Card>
  );
}

function Indicador({ rotulo, valor, detalhe, cor }: { rotulo: string; valor: string; detalhe?: string; cor?: string }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400">{rotulo}</p>
      <p className={`text-lg font-bold ${cor ?? "text-gray-900 dark:text-white"}`}>{valor}</p>
      {detalhe && <p className="text-[11px] text-gray-400 dark:text-gray-500">{detalhe}</p>}
    </div>
  );
}

export function SecaoInvestimentosAno({
  dados, ano, carregando, incompleto,
}: { dados: InvestimentosAno | null; ano: number; carregando: boolean; incompleto: boolean }) {
  const fmt = useMoeda();
  if (carregando || !dados) return <Carregando />;

  const { patrimonio: p, rendaFixa: rf, rendaVariavel: rv, proventos } = dados;
  const pctPatrimonio = p.inicio.total > 0 ? Math.round((p.variacao / p.inicio.total) * 1000) / 10 : null;
  const rotuloFim = dados.fimEhHoje ? "Hoje" : fmtData(dados.fim);
  const linhas = [
    { rotulo: "Em contas", inicio: p.inicio.contas, fim: p.fim.contas },
    { rotulo: "Renda fixa (líquida)", inicio: p.inicio.rendaFixa, fim: p.fim.rendaFixa },
    { rotulo: dados.fimEhHoje ? "Renda variável (custo → mercado)" : "Renda variável (custo)", inicio: p.inicio.rendaVariavel, fim: p.fim.rendaVariavel },
  ];

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900 dark:text-white">
          <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Investimentos e patrimônio — {ano}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-[1fr_1.4fr] gap-5 items-start">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Patrimônio de {fmtData(dados.inicio)} a {dados.fimEhHoje ? "hoje" : rotuloFim}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(p.fim.total)}</p>
            <p className={`text-sm font-medium ${corValor(p.variacao)}`}>
              {p.variacao >= 0 ? "+" : "−"} {fmt(Math.abs(p.variacao))}
              {pctPatrimonio !== null && ` (${pctPatrimonio >= 0 ? "+" : ""}${String(pctPatrimonio).replace(".", ",")}%)`}
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 dark:text-gray-400">
                <th className="text-left font-medium pb-1"></th>
                <th className="text-right font-medium pb-1">{fmtData(dados.inicio)}</th>
                <th className="text-right font-medium pb-1">{rotuloFim}</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.rotulo} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-1.5 text-gray-600 dark:text-gray-400">{l.rotulo}</td>
                  <td className="py-1.5 text-right text-gray-700 dark:text-gray-300">{fmt(l.inicio)}</td>
                  <td className="py-1.5 text-right font-medium text-gray-900 dark:text-white">{fmt(l.fim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Indicador rotulo="Rendimento da renda fixa" valor={fmt(rf.rendimento)} cor={corValor(rf.rendimento)}
            detalhe={`líquido estimado · aportes ${fmt(rf.aportes)} · resgates ${fmt(rf.resgates)}`} />
          <Indicador rotulo="Proventos recebidos" valor={fmt(proventos.total)} cor="text-green-600 dark:text-green-400"
            detalhe="dividendos, rendimentos e JCP (líquidos)" />
          <Indicador rotulo="Resultado em vendas na bolsa" valor={fmt(rv.resultadoRealizado)} cor={corValor(rv.resultadoRealizado)}
            detalhe="ganhos e perdas realizados no ano" />
          <Indicador rotulo="IR apurado na bolsa" valor={fmt(rv.impostoApurado)}
            detalhe={dados.darfs.length ? `${dados.darfs.length} DARF${dados.darfs.length === 1 ? "" : "s"} no ano` : "nenhum DARF no ano"} />
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Renda fixa reconstruída com a última taxa publicada (estimativa). Renda variável pelo custo de aquisição nas datas passadas
          {dados.fimEhHoje ? " e a valor de mercado hoje" : ""}, porque o app não guarda o histórico de cotações.
        </p>
        {incompleto && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> Parte dos investimentos não carregou: os números estão incompletos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{titulo}</p>
      {children}
    </div>
  );
}

function Linha({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="text-gray-700 dark:text-gray-300 min-w-0">
        {rotulo}
        {detalhe && <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">{detalhe}</span>}
      </span>
      <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">{valor}</span>
    </div>
  );
}

export function SecaoDeclaracao({ dados, ano, carregando }: { dados: InvestimentosAno | null; ano: number; carregando: boolean }) {
  const fmt = useMoeda();
  if (carregando || !dados) return <Carregando />;
  const d = dados.declaracao;
  const semBens = d.contas.length === 0 && d.aplicacoes.length === 0 && d.rendaVariavel.length === 0;

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base md:text-lg text-gray-900 dark:text-white">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Para a declaração de IR — ano-calendário {ano}
        </CardTitle>
        {dados.fimEhHoje && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Ano em andamento: prévia com a posição de hoje, não de 31/12.</p>
        )}
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <Bloco titulo={`Bens e direitos em ${dados.fimEhHoje ? "hoje" : fmtData(dados.fim)}`}>
          {semBens ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum bem com saldo nessa data.</p>
          ) : (
            <div>
              {d.contas.map((c) => <Linha key={`c-${c.nome}`} rotulo={c.nome} detalhe="conta" valor={fmt(c.saldo)} />)}
              {d.aplicacoes.map((a, i) => <Linha key={`a-${i}`} rotulo={a.descricao} detalhe="renda fixa, bruto" valor={fmt(a.bruto)} />)}
              {d.rendaVariavel.map((b) => (
                <Linha key={`rv-${b.ticker}`} rotulo={b.ticker}
                  detalhe={`${TIPO_ATIVO_LABEL[b.tipoAtivo]} · ${b.quantidade} cota${b.quantidade === 1 ? "" : "s"} · custo`}
                  valor={fmt(b.custoTotal)} />
              ))}
            </div>
          )}
        </Bloco>

        <div className="space-y-6">
          <Bloco titulo="Rendimentos isentos e não tributáveis">
            <Linha rotulo="Dividendos" valor={fmt(d.isentos.dividendos)} />
            <Linha rotulo="Rendimentos de FII" valor={fmt(d.isentos.rendimentosFii)} />
            <Linha rotulo="Ganho em vendas de ações até R$ 20 mil/mês" valor={fmt(d.isentos.ganhoIsentoAcoes)} />
          </Bloco>

          <Bloco titulo="Tributação exclusiva">
            <Linha rotulo="Juros sobre capital próprio (JCP)" valor={fmt(d.exclusivos.jcp)} />
          </Bloco>

          <Bloco titulo="DARFs de renda variável (código 6015)">
            {dados.darfs.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum DARF no ano.</p>
            ) : (
              dados.darfs.map((x) => (
                <div key={x.competencia} className="flex items-center justify-between gap-3 text-sm py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-gray-700 dark:text-gray-300">
                    {fmtCompetencia(x.competencia)}
                    <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">vence {fmtData(x.vencimento)}</span>
                  </span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-medium text-gray-900 dark:text-white">{fmt(x.valor)}</span>
                    {x.pago ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" />pago</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><Clock className="h-3.5 w-3.5" />em aberto</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </Bloco>
        </div>

        <p className="md:col-span-2 text-[11px] text-gray-400 dark:text-gray-500">
          Conferência a partir dos lançamentos do app. Os informes de rendimentos de bancos e corretoras prevalecem; o valor da renda fixa em datas passadas é estimado.
        </p>
      </CardContent>
    </Card>
  );
}
