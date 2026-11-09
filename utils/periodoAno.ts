//
// Regra única do período "ano" usado pelo dashboard (cliente e servidor):
//   • ano vigente  → de 1º de janeiro até o FIM DO MÊS ATUAL
//   • anos passados → de janeiro a dezembro
// Use sempre estas funções, para que gráficos, totais e listas concordem.

export const ANO_MINIMO = 2000;

/** "Agora" no fuso de Brasília, independente do fuso do servidor (UTC na Vercel) */
export function hojeBrtDate(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

export interface IntervaloAno {
  ano: number;
  ehAnoVigente: boolean;
  /** Último mês exibido (1-12): mês atual no ano vigente, 12 nos anos passados */
  mesFinal: number;
  /** 1º de janeiro, 00:00 */
  inicio: Date;
  /** Último dia de `mesFinal`, 23:59:59.999 */
  fim: Date;
  /** 31 de dezembro, 23:59:59.999 (usado em projeções do ano todo) */
  fimAno: Date;
  /** Meses exibidos, em ordem: [{ano, mes: 1}, ..., {ano, mes: mesFinal}] */
  meses: { ano: number; mes: number }[];
  /** Chaves ano*12+mes, para comparar mês/ano de fatura sem erro na virada de ano */
  chaveInicio: number;
  chaveFim: number;
  chaveFimAno: number;
}

export function calcularIntervaloAno(ano: number, hoje: Date = hojeBrtDate()): IntervaloAno {
  const anoVigente = hoje.getFullYear();
  const ehAnoVigente = ano === anoVigente;
  const mesFinal = ehAnoVigente ? hoje.getMonth() + 1 : 12;

  const meses: { ano: number; mes: number }[] = [];
  for (let mes = 1; mes <= mesFinal; mes++) meses.push({ ano, mes });

  return {
    ano,
    ehAnoVigente,
    mesFinal,
    inicio: new Date(ano, 0, 1),
    fim: new Date(ano, mesFinal, 0, 23, 59, 59, 999),
    fimAno: new Date(ano, 11, 31, 23, 59, 59, 999),
    meses,
    chaveInicio: ano * 12 + 1,
    chaveFim: ano * 12 + mesFinal,
    chaveFimAno: ano * 12 + 12,
  };
}

/**
 * Lê e valida o parâmetro `ano` de uma requisição.
 * Ausente → ano vigente. Inválido ou futuro → null (a rota responde 400).
 */
export function lerAnoDaRequisicao(param: string | null, hoje: Date = hojeBrtDate()): number | null {
  const anoVigente = hoje.getFullYear();
  if (param === null || param === "") return anoVigente;
  const n = Number(param);
  if (!Number.isInteger(n) || n < ANO_MINIMO || n > anoVigente) return null;
  return n;
}