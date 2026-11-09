/**
 * Formata data para exibição sem problemas de timezone
 * 
 * Resolve o problema de datas que aparecem "um dia antes"
 * quando convertidas de UTC para timezone local
 * 
 * @param data - Data em formato string (ISO) ou Date
 * @returns String formatada "DD/MM/YYYY"
 * 
 * @example
 * formatarDataParaExibicao("2026-01-20T00:00:00.000Z") // "20/01/2026"
 * formatarDataParaExibicao("2026-01-20") // "20/01/2026"
 */
export function formatarDataParaExibicao(data: string | Date | null | undefined): string {
  if (!data) return '';
  
  // Se for string no formato YYYY-MM-DD (sem horário), usar direto
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  // Se for timestamp ISO ou Date object
  const d = new Date(data);
  
  // Usar UTC para evitar conversão de timezone
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const ano = d.getUTCFullYear();
  
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata data para input type="date"
 * 
 * @param data - Data em formato string (ISO) ou Date
 * @returns String formatada "YYYY-MM-DD"
 * 
 * @example
 * formatarDataParaInput("2026-01-20T00:00:00.000Z") // "2026-01-20"
 */
export function formatarDataParaInput(data: string | Date | null | undefined): string {
  if (!data) return '';
  
  // Se já estiver no formato correto
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }
  
  const d = new Date(data);
  
  // Usar UTC para evitar conversão de timezone
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  
  return `${ano}-${mes}-${dia}`;
}

/**
 * Formata data curta (apenas dia e mês)
 * 
 * @param data - Data em formato string (ISO) ou Date
 * @returns String formatada "DD/MM"
 * 
 * @example
 * formatarDataCurta("2026-01-20") // "20/01"
 */
export function formatarDataCurta(data: string | Date | null | undefined): string {
  if (!data) return '';
  
  const d = new Date(data);
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  
  return `${dia}/${mes}`;
}

/**
 * Avança N meses sem transbordar o dia: 31/01 + 1 mês = 28/02, não 03/03.
 * Calcula em UTC porque as datas de lançamento vêm como meia-noite UTC.
 */
export function adicionarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data);
  const diaOriginal = resultado.getUTCDate();
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0)).getUTCDate();
  resultado.setUTCDate(Math.min(diaOriginal, ultimoDia));
  return resultado;
}
