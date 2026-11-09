// src/utils/eventosCorporativosUtils.ts
//
// Cálculo dos eventos corporativos a partir da posição na data do evento.
// Usado na prévia (navegador) e na gravação (servidor), para os dois darem o mesmo número.
//
// Frações: no desdobramento/grupamento/bonificação a B3 paga em dinheiro a fração
// que sobra. Aqui a quantidade é arredondada para baixo e a fração é desconsiderada.

import { calcularPosicoes, type OperacaoRv } from "./rendaVariavelUtils";

export type TipoEventoCorporativo = "desdobramento" | "grupamento" | "bonificacao";

export interface ParametrosEvento {
  tipo: TipoEventoCorporativo;
  antigo?: number; // desdobramento/grupamento: "cada [antigo]..."
  novo?: number; // "...viram [novo]"
  percentual?: number; // bonificação: % em novas ações
}

export interface ResultadoEvento {
  posicaoAntes: number;
  posicaoDepois: number;
  delta: number; // >0 entram ações; <0 saem (grupamento)
  erro?: string;
}

/** Quantidade em carteira ao fim do dia `ate` (inclusive). */
export function posicaoEm(ops: OperacaoRv[], ticker: string, ate: string): number {
  const p = calcularPosicoes(ops.filter((o) => o.ticker === ticker && o.data <= ate))[0];
  return p ? p.quantidade : 0;
}

export function calcularEvento(posicao: number, e: ParametrosEvento): ResultadoEvento {
  const base = { posicaoAntes: posicao, posicaoDepois: posicao, delta: 0 };
  if (posicao <= 0) return { ...base, erro: "Sem posição neste ativo na data do evento." };

  if (e.tipo === "bonificacao") {
    const pct = Number(e.percentual);
    if (!(pct > 0) || pct > 1000) return { ...base, erro: "Informe o percentual de bonificação (ex.: 10)." };
    // A tolerância evita perder uma ação por ponto flutuante (375 × 18,4% = 68,999…)
    const add = Math.floor((posicao * pct) / 100 + 1e-9);
    if (add < 1) return { ...base, erro: "A bonificação não gera nenhuma ação inteira para esta posição." };
    return { posicaoAntes: posicao, posicaoDepois: posicao + add, delta: add };
  }

  const a = Number(e.antigo);
  const n = Number(e.novo);
  if (!Number.isInteger(a) || !Number.isInteger(n) || a < 1 || n < 1)
    return { ...base, erro: "Informe a proporção com números inteiros (ex.: 1 para 10)." };

  const depois = Math.floor((posicao * n) / a);
  if (e.tipo === "desdobramento") {
    if (n <= a) return { ...base, erro: "No desdobramento o número novo deve ser maior que o antigo." };
    return { posicaoAntes: posicao, posicaoDepois: depois, delta: depois - posicao };
  }
  if (n >= a) return { ...base, erro: "No grupamento o número novo deve ser menor que o antigo." };
  if (depois < 1) return { ...base, erro: "A posição ficaria abaixo de 1 ação após o grupamento." };
  return { posicaoAntes: posicao, posicaoDepois: depois, delta: depois - posicao };
}