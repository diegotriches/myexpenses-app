//
// Tipo do produto de renda fixa (CDB, LCI, Tesouro Direto...). O tipo não muda
// o cálculo, que depende só do indexador; ele sugere a tributação, limita os
// indexadores possíveis, diz se há garantia do FGC e dá o nome padrão quando a
// aplicação não tem descrição. Aplicações criadas antes de 19/11/2026 podem
// estar sem tipo (null) até o usuário definir.

import { INDEXADOR_LABEL, type Indexador } from "./tesouroUtils";
import type { Tributacao } from "./aplicacaoUtils";

export const TIPOS_APLICACAO = [
  "cdb", "rdb", "lc", "lci", "lca", "cri", "cra", "debenture", "debenture_incentivada", "tesouro",
] as const;
export type TipoAplicacao = (typeof TIPOS_APLICACAO)[number];

export function ehTipoAplicacao(valor: unknown): valor is TipoAplicacao {
  return typeof valor === "string" && (TIPOS_APLICACAO as readonly string[]).includes(valor);
}

export const TIPO_APLICACAO_LABEL: Record<TipoAplicacao, string> = {
  cdb: "CDB",
  rdb: "RDB",
  lc: "LC",
  lci: "LCI",
  lca: "LCA",
  cri: "CRI",
  cra: "CRA",
  debenture: "Debênture",
  debenture_incentivada: "Debênture incentivada",
  tesouro: "Tesouro Direto",
};

/** Nome por extenso, para a lista de escolha */
export const TIPO_APLICACAO_DESCRICAO: Record<TipoAplicacao, string> = {
  cdb: "Certificado de Depósito Bancário",
  rdb: "Recibo de Depósito Bancário",
  lc: "Letra de Câmbio",
  lci: "Letra de Crédito Imobiliário",
  lca: "Letra de Crédito do Agronegócio",
  cri: "Certificado de Recebíveis Imobiliários",
  cra: "Certificado de Recebíveis do Agronegócio",
  debenture: "Título de dívida de empresa",
  debenture_incentivada: "Debênture de infraestrutura (Lei 12.431)",
  tesouro: "Título público federal",
};

const ISENTOS: readonly TipoAplicacao[] = ["lci", "lca", "cri", "cra", "debenture_incentivada"];
const COM_FGC: readonly TipoAplicacao[] = ["cdb", "rdb", "lc", "lci", "lca"];
// Só estes costumam ter liquidez diária (sem vencimento) atrelada ao CDI
const PODEM_TER_LIQUIDEZ_DIARIA: readonly TipoAplicacao[] = ["cdb", "rdb", "lc"];

/** Tributação de pessoa física para o tipo (sugestão: o usuário pode trocar) */
export function tributacaoDoTipo(tipo: TipoAplicacao): Tributacao {
  return ISENTOS.includes(tipo) ? "isento" : "tributavel";
}

/** Coberto pelo Fundo Garantidor de Créditos */
export function temFgc(tipo: TipoAplicacao): boolean {
  return COM_FGC.includes(tipo);
}

/** Indexadores possíveis: Tesouro tem Selic, Prefixado e IPCA+; os demais, CDI, Prefixado e IPCA+ */
export function indexadoresDoTipo(tipo: TipoAplicacao): Indexador[] {
  return tipo === "tesouro" ? ["selic", "prefixado", "ipca"] : ["cdi", "prefixado", "ipca"];
}

/** Tipos que combinam com o indexador de uma aplicação (para definir o tipo depois) */
export function tiposParaIndexador(indexador: string): TipoAplicacao[] {
  return TIPOS_APLICACAO.filter((t) => (indexadoresDoTipo(t) as string[]).includes(indexador));
}

/** Pode ficar sem vencimento (liquidez diária)? Só CDB/RDB/LC atrelados ao CDI */
export function podeSemVencimento(tipo: TipoAplicacao, indexador: string): boolean {
  return indexador === "cdi" && PODEM_TER_LIQUIDEZ_DIARIA.includes(tipo);
}

/**
 * Nome padrão, quando a aplicação não tem descrição. Usado no card e no extrato:
 * "CDB", "LCI IPCA+", "Tesouro Selic", "Tesouro Prefixado". Sem tipo (aplicação
 * antiga), fica só o indexador ("CDI", "Selic").
 */
export function nomePadraoAplicacao(a: { tipo?: string | null; indexador: string }): string {
  const indexador = INDEXADOR_LABEL[a.indexador as Indexador] ?? a.indexador.toUpperCase();
  if (a.tipo === "tesouro") return `Tesouro ${indexador}`;
  if (ehTipoAplicacao(a.tipo)) {
    const tipo = TIPO_APLICACAO_LABEL[a.tipo];
    return a.indexador === "cdi" ? tipo : `${tipo} ${indexador}`;
  }
  return indexador;
}
