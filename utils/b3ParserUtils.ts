// utils/b3ParserUtils.ts
//
// Leitura de células das planilhas da B3 (Área do Investidor).

export const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const texto = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export function numero(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = texto(v);
  if (!t || t === "-") return null;
  // Formato brasileiro: "1.234,56" tem vírgula; "1.234" sem vírgula é milhar
  const brasileiro = t.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(t);
  const n = Number(brasileiro ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) ? n : null;
}

export function dataIso(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  const t = texto(v);
  const br = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return null;
}
