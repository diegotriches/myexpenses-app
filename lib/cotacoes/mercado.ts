//
// Regras de "quando vale a pena buscar cotação nova". Evita gastar a cota da
// API (plano gratuito: 15.000 requisições/mês) com dados que não mudaram:
//  - pregão aberto (seg–sex, 10h–18h, horário de Brasília): vale buscar de
//    novo depois de 15 min;
//  - fora do pregão: basta ter buscado UMA vez depois do último fechamento.
// Feriados não são tratados (no máximo uma busca extra, sem prejuízo).

const BRT_MS = 3 * 3600 * 1000; // Brasília = UTC-3 (sem horário de verão)
const ABERTURA_MIN = 10 * 60;
const FECHAMENTO_MIN = 18 * 60;

const emBrt = (d: Date) => new Date(d.getTime() - BRT_MS);

export function mercadoAberto(agora: Date = new Date()): boolean {
  const b = emBrt(agora);
  const dia = b.getUTCDay();
  if (dia === 0 || dia === 6) return false;
  const min = b.getUTCHours() * 60 + b.getUTCMinutes();
  return min >= ABERTURA_MIN && min < FECHAMENTO_MIN;
}

/** Instante do último fechamento (18:00 BRT de um dia útil) que já passou. */
export function ultimoFechamento(agora: Date = new Date()): Date {
  const b = emBrt(agora);
  // 18:00 BRT = 21:00 UTC do mesmo dia
  let cand = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), 18 + 3, 0, 0);
  for (let i = 0; i < 10; i++) {
    const diaSemana = new Date(cand - BRT_MS).getUTCDay();
    if (cand <= agora.getTime() && diaSemana !== 0 && diaSemana !== 6) break;
    cand -= 24 * 3600 * 1000;
  }
  return new Date(cand);
}

const QUINZE_MIN = 15 * 60 * 1000;
const DOIS_MIN = 2 * 60 * 1000;

export function precisaAtualizar(
  atualizadoEm: Date | null,
  agora: Date = new Date(),
  forcar = false,
): boolean {
  if (!atualizadoEm) return true;
  const idade = agora.getTime() - atualizadoEm.getTime();
  // "Atualizar agora" ainda respeita um intervalo mínimo (evita gastar cota com cliques repetidos)
  if (forcar) return idade > DOIS_MIN;
  if (atualizadoEm < ultimoFechamento(agora)) return true;
  if (mercadoAberto(agora) && idade > QUINZE_MIN) return true;
  return false;
}