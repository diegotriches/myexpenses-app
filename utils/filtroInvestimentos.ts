//
// Filtros e ordenação das listas de investimentos (renda fixa e renda
// variável). Puro: o componente monta os itens (com valor e rendimento já
// calculados como no card) e recebe de volta os que passam, na ordem escolhida.
// O filtro vale só enquanto a página está aberta (decisão do Diego, 19/11/2026).

/** Minúsculas e sem acento, para a busca não depender de "Tesouro"/"tesouro" ou "Crédito"/"credito" */
export function normalizarBusca(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function casaBusca(busca: string, textos: (string | null | undefined)[]): boolean {
  const termo = normalizarBusca(busca);
  if (!termo) return true;
  const alvo = normalizarBusca(textos.filter(Boolean).join(" "));
  // Todas as palavras digitadas precisam aparecer, em qualquer ordem
  return termo.split(/\s+/).every((p) => alvo.includes(p));
}

const diasAte = (hoje: string, data: string) =>
  Math.round((new Date(`${data}T00:00:00Z`).getTime() - new Date(`${hoje}T00:00:00Z`).getTime()) / 86_400_000);

/** Quantos itens de cada tipo (para as etiquetas clicáveis) */
export function contarPorTipo<T extends { tipo: string }>(itens: T[]): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const i of itens) contagem.set(i.tipo, (contagem.get(i.tipo) ?? 0) + 1);
  return contagem;
}

// ── Renda fixa ───────────────────────────────────────────────────────────────

export type VencimentoFiltro = "todos" | "liquidez" | "ate90" | "ate365" | "mais365";
export type OrdemRendaFixa = "valor" | "rendimento" | "vencimento" | "nome";

export interface FiltroRendaFixa {
  busca: string;
  tipos: string[];       // vazio = todos; "sem_tipo" para as antigas
  indexadores: string[]; // vazio = todos
  contaId: string;       // "" = todas
  vencimento: VencimentoFiltro;
  ordem: OrdemRendaFixa;
}

export const FILTRO_RENDA_FIXA_PADRAO: FiltroRendaFixa = {
  busca: "", tipos: [], indexadores: [], contaId: "", vencimento: "todos", ordem: "valor",
};

export interface ItemRendaFixa {
  id: string;
  nome: string;            // como aparece no card
  textosBusca: (string | null | undefined)[];
  tipo: string;            // tipo do produto ou "sem_tipo"
  indexador: string;
  contaId: string;
  vencimento: string | null; // AAAA-MM-DD; null = liquidez diária
  valor: number;
  rendimento: number;
}

/** Quantos filtros estão ligados (a ordem não conta: ela não esconde nada) */
export function filtrosAtivosRendaFixa(f: FiltroRendaFixa): number {
  return (f.busca.trim() ? 1 : 0) + (f.tipos.length ? 1 : 0) + (f.indexadores.length ? 1 : 0)
    + (f.contaId ? 1 : 0) + (f.vencimento !== "todos" ? 1 : 0);
}

function passaVencimento(i: ItemRendaFixa, filtro: VencimentoFiltro, hoje: string): boolean {
  if (filtro === "todos") return true;
  if (filtro === "liquidez") return i.vencimento === null;
  if (i.vencimento === null) return false;
  const dias = diasAte(hoje, i.vencimento);
  if (filtro === "ate90") return dias <= 90;
  if (filtro === "ate365") return dias <= 365;
  return dias > 365;
}

const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR");

export function filtrarRendaFixa<T extends ItemRendaFixa>(itens: T[], f: FiltroRendaFixa, hoje: string): T[] {
  const filtrados = itens.filter((i) =>
    casaBusca(f.busca, [i.nome, ...i.textosBusca])
    && (f.tipos.length === 0 || f.tipos.includes(i.tipo))
    && (f.indexadores.length === 0 || f.indexadores.includes(i.indexador))
    && (!f.contaId || i.contaId === f.contaId)
    && passaVencimento(i, f.vencimento, hoje));

  return [...filtrados].sort((a, b) => {
    if (f.ordem === "valor") return b.valor - a.valor || porNome(a, b);
    if (f.ordem === "rendimento") return b.rendimento - a.rendimento || porNome(a, b);
    if (f.ordem === "vencimento") {
      // Mais próximo primeiro; liquidez diária (sem vencimento) por último
      if (a.vencimento === b.vencimento) return porNome(a, b);
      if (a.vencimento === null) return 1;
      if (b.vencimento === null) return -1;
      return a.vencimento < b.vencimento ? -1 : 1;
    }
    return porNome(a, b);
  });
}

// ── Renda variável ───────────────────────────────────────────────────────────

export type ResultadoFiltro = "todos" | "lucro" | "prejuizo";
export type OrdemRendaVariavel = "valor" | "resultado" | "ticker";

export interface FiltroRendaVariavel {
  busca: string;
  tipos: string[]; // vazio = todos
  resultado: ResultadoFiltro;
  ordem: OrdemRendaVariavel;
}

export const FILTRO_RENDA_VARIAVEL_PADRAO: FiltroRendaVariavel = {
  busca: "", tipos: [], resultado: "todos", ordem: "valor",
};

export interface ItemRendaVariavel {
  ticker: string;
  tipo: string;
  valor: number;     // carteira: valor de mercado; encerrada: total vendido
  resultado: number; // carteira: não realizado; encerrada: realizado
}

export function filtrosAtivosRendaVariavel(f: FiltroRendaVariavel): number {
  return (f.busca.trim() ? 1 : 0) + (f.tipos.length ? 1 : 0) + (f.resultado !== "todos" ? 1 : 0);
}

export function filtrarRendaVariavel<T extends ItemRendaVariavel>(itens: T[], f: FiltroRendaVariavel): T[] {
  const filtrados = itens.filter((i) =>
    casaBusca(f.busca, [i.ticker])
    && (f.tipos.length === 0 || f.tipos.includes(i.tipo))
    && (f.resultado === "todos" || (f.resultado === "lucro" ? i.resultado > 0 : i.resultado < 0)));

  const porTicker = (a: T, b: T) => a.ticker.localeCompare(b.ticker);
  return [...filtrados].sort((a, b) => {
    if (f.ordem === "valor") return b.valor - a.valor || porTicker(a, b);
    if (f.ordem === "resultado") return b.resultado - a.resultado || porTicker(a, b);
    return porTicker(a, b);
  });
}
