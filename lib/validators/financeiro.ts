// lib/validators/financeiro.ts
import { z } from "zod";

const valorPositivo = z.coerce.number().positive();

/** Devolve o valor como número, ou null se não for finito e maior que zero. */
export function lerValorPositivo(valor: unknown): number | null {
  const resultado = valorPositivo.safeParse(valor);
  return resultado.success ? resultado.data : null;
}
