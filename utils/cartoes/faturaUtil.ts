import { addMonths, setDate, isAfter } from "date-fns";

export function calcularPeriodoFatura(diaFechamento: number, referencia?: string) {
  const hoje = referencia ? new Date(referencia) : new Date();

  // Fechamento anterior
  let fechamentoAnterior = setDate(hoje, diaFechamento);
  if (isAfter(fechamentoAnterior, hoje)) {
    fechamentoAnterior = setDate(addMonths(hoje, -1), diaFechamento);
  }

  // Fechamento atual (próximo)
  const fechamentoAtual = setDate(addMonths(fechamentoAnterior, 1), diaFechamento);

  return {
    inicio: fechamentoAnterior,
    fim: fechamentoAtual
  };
}
