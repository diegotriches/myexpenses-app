export function pertenceAFaturaAtual(
  dataTransacao: string,
  diaFechamento: number
): boolean {
  const hoje = new Date();
  const data = new Date(dataTransacao);

  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const dataFechamento = new Date(anoAtual, mesAtual, diaFechamento);

  // Se ainda não fechou este mês
  if (hoje <= dataFechamento) {
    return data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
  }

  // Fechou, então pertence ao próximo ciclo
  const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
  const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

  return (
    data.getMonth() === mesAnterior && data.getFullYear() === anoAnterior
  );
}
