// Agenda financeira do dashboard: próximos vencimentos e projeção do fim do mês.
//
// Fontes (todas já existentes):
//  - faturas não pagas de cada cartão (rota /api/dashboard/faturas-abertas);
//  - recorrências ativas fora do cartão: a do cartão entra na fatura, que já
//    aparece aqui, e contar as duas seria contar duas vezes.
// Lançamentos com data futura não entram: pela regra do app eles já
// movimentaram o saldo ao serem criados.

export interface FaturaAgenda {
  cartaoId: number;
  nomeCartao: string;
  mes: number;
  ano: number;
  total: number;
  dataVencimento: string; // YYYY-MM-DD
}

export interface RecorrenciaAgenda {
  id: string;
  descricao: string | null;
  categoria: string | null;
  valor: number | string;
  tipo: "entrada" | "saida";
  formaPagamento: "dinheiro" | "pix" | "cartao";
  diaDoMes: number;
  dataInicio: string;
  ativa: boolean;
  repeticoesTotal: number | null;
  repeticoesGeradas: number;
  ultimaGeracaoMes: number | null;
  ultimaGeracaoAno: number | null;
}

export interface ItemVencimento {
  id: string;
  origem: "fatura" | "recorrencia";
  descricao: string;
  detalhe: string;
  data: string; // YYYY-MM-DD
  valor: number; // sempre positivo; o sentido diz se entra ou sai
  sentido: "entrada" | "saida";
  atrasada: boolean;
  link: string;
}

const ultimoDia = (ano: number, mes: number) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();
const iso = (ano: number, mes: number, dia: number) =>
  `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

export function somarDiasIso(data: string, dias: number): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function fimDoMesIso(data: string): string {
  const [ano, mes] = data.split("-").map(Number);
  return iso(ano, mes, ultimoDia(ano, mes));
}

/**
 * Próxima data em que o cron vai gerar a recorrência, ou null se não há mais.
 * Segue o cron: gera no dia do mês (limitado ao último dia), uma vez por mês,
 * nunca antes de dataInicio e só no próprio dia (dia que já passou sem gerar
 * fica para o mês seguinte).
 */
export function proximaOcorrencia(r: RecorrenciaAgenda, hoje: string): string | null {
  if (!r.ativa) return null;
  if (r.repeticoesTotal !== null && r.repeticoesGeradas >= r.repeticoesTotal) return null;

  const inicio = r.dataInicio.slice(0, 10);
  let [ano, mes] = hoje.split("-").map(Number);
  for (let i = 0; i < 36; i++) {
    const data = iso(ano, mes, Math.min(r.diaDoMes, ultimoDia(ano, mes)));
    const jaGerada = r.ultimaGeracaoMes === mes && r.ultimaGeracaoAno === ano;
    if (!jaGerada && data >= hoje && data >= inicio) return data;
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }
  return null;
}

const recorrenciaForaDoCartao = (r: RecorrenciaAgenda) => r.formaPagamento !== "cartao";

/** Faturas a pagar e recorrências fora do cartão até `dias` dias à frente, mais as faturas atrasadas. */
export function montarVencimentos(p: {
  faturas: FaturaAgenda[];
  recorrencias: RecorrenciaAgenda[];
  hoje: string;
  dias: number;
}): ItemVencimento[] {
  const limite = somarDiasIso(p.hoje, p.dias);
  const itens: ItemVencimento[] = [];

  for (const f of p.faturas) {
    if (f.total <= 0 || f.dataVencimento > limite) continue;
    itens.push({
      id: `fatura-${f.cartaoId}-${f.ano}-${f.mes}`,
      origem: "fatura",
      descricao: `Fatura ${f.nomeCartao}`,
      detalhe: `${String(f.mes).padStart(2, "0")}/${f.ano}`,
      data: f.dataVencimento,
      valor: f.total,
      sentido: "saida",
      atrasada: f.dataVencimento < p.hoje,
      link: `/cartoes/${f.cartaoId}/fatura?mes=${f.mes}&ano=${f.ano}`,
    });
  }

  for (const r of p.recorrencias.filter(recorrenciaForaDoCartao)) {
    const data = proximaOcorrencia(r, p.hoje);
    if (!data || data > limite) continue;
    itens.push({
      id: `recorrencia-${r.id}`,
      origem: "recorrencia",
      descricao: r.descricao || r.categoria || "Recorrência",
      detalhe: r.categoria && r.descricao ? r.categoria : "Recorrente",
      data,
      valor: Number(r.valor),
      sentido: r.tipo,
      atrasada: false,
      link: "/transacoes",
    });
  }

  return itens.sort((a, b) => (a.data === b.data ? a.descricao.localeCompare(b.descricao) : a.data < b.data ? -1 : 1));
}

export interface ProjecaoFimDoMes {
  fimDoMes: string;
  saldoAtual: number;
  faturas: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoPrevisto: number;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

/**
 * Saldo estimado das contas no último dia do mês: saldo atual − faturas que
 * vencem até lá (inclusive as atrasadas) + recorrências fora do cartão que
 * ainda serão geradas no mês.
 */
export function projetarFimDoMes(p: {
  saldoAtual: number;
  faturas: FaturaAgenda[];
  recorrencias: RecorrenciaAgenda[];
  hoje: string;
}): ProjecaoFimDoMes {
  const fim = fimDoMesIso(p.hoje);
  const faturas = p.faturas
    .filter((f) => f.total > 0 && f.dataVencimento <= fim)
    .reduce((s, f) => s + f.total, 0);

  let entradas = 0;
  let saidas = 0;
  for (const r of p.recorrencias.filter(recorrenciaForaDoCartao)) {
    const data = proximaOcorrencia(r, p.hoje);
    if (!data || data > fim) continue;
    if (r.tipo === "entrada") entradas += Number(r.valor);
    else saidas += Number(r.valor);
  }

  return {
    fimDoMes: fim,
    saldoAtual: centavos(p.saldoAtual),
    faturas: centavos(faturas),
    entradasPrevistas: centavos(entradas),
    saidasPrevistas: centavos(saidas),
    saldoPrevisto: centavos(p.saldoAtual - faturas + entradas - saidas),
  };
}
