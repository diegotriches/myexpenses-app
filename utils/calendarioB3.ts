// utils/calendarioB3.ts
//
// Feriados calculados por ano. O pregão da B3 fecha também em 24 e 31/12, datas
// em que os bancos funcionam e o DARF pode vencer: por isso há duas consultas.

const iso = (d: Date) => d.toISOString().slice(0, 10);
const somarDiasUtc = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(ano, mes - 1, dia));
}

const cacheFeriados = new Map<number, Set<string>>();

function feriadosNacionais(ano: number): Set<string> {
  const c = cacheFeriados.get(ano);
  if (c) return c;
  const p = pascoa(ano);
  const f = new Set<string>([
    `${ano}-01-01`, `${ano}-04-21`, `${ano}-05-01`, `${ano}-09-07`, `${ano}-10-12`,
    `${ano}-11-02`, `${ano}-11-15`, `${ano}-12-25`,
    iso(somarDiasUtc(p, -48)), iso(somarDiasUtc(p, -47)), // Carnaval
    iso(somarDiasUtc(p, -2)), // Sexta-feira Santa
    iso(somarDiasUtc(p, 60)), // Corpus Christi
  ]);
  if (ano >= 2024) f.add(`${ano}-11-20`); // Consciência Negra
  cacheFeriados.set(ano, f);
  return f;
}

function ehFimDeSemana(dataIso: string): boolean {
  const dia = new Date(`${dataIso}T00:00:00Z`).getUTCDay();
  return dia === 0 || dia === 6;
}

export function ehDiaUtilBancario(dataIso: string): boolean {
  return !ehFimDeSemana(dataIso) && !feriadosNacionais(Number(dataIso.slice(0, 4))).has(dataIso);
}

export function ehDiaUtilB3(dataIso: string): boolean {
  const fimDoAno = dataIso.endsWith("-12-24") || dataIso.endsWith("-12-31");
  return !fimDoAno && ehDiaUtilBancario(dataIso);
}
