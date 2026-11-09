//
// Função pura, sem dependência de banco/Node — pode ser importada tanto
// nas rotas de API (servidor) quanto nos componentes (client), garantindo
// que o valor mostrado ao usuário antes de confirmar o resgate seja
// exatamente o mesmo aplicado de verdade.

export type Tributacao = "isento" | "tributavel";

/**
 * Tabela regressiva de IR sobre renda fixa (legislação vigente):
 * - Até 180 dias:        22,5%
 * - De 181 a 360 dias:   20%
 * - De 361 a 720 dias:   17,5%
 * - Acima de 720 dias:   15%
 *
 * Alíquota fixa por lei — não é editável pelo usuário.
 */
export function calcularAliquotaIR(diasCorridos: number): number {
  if (diasCorridos <= 180) return 22.5;
  if (diasCorridos <= 360) return 20;
  if (diasCorridos <= 720) return 17.5;
  return 15;
}

export interface ResultadoResgate {
  diasCorridos: number;
  rendimentoBruto: number;
  aliquotaIR: number;   // 0 se isento
  impostoRetido: number; // 0 se isento
  valorLiquido: number;  // o que efetivamente entra no saldo da conta
}

