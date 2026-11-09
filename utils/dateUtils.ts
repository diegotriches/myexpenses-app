// src/utils/dateUtils.ts

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
 * ✨ NOVO: Converte string de data para objeto Date UTC (para salvar no banco)
 * 
 * Garante que a data seja salva corretamente no banco sem problemas de timezone.
 * Cria a data em UTC meio-dia para evitar que conversões de timezone alterem o dia.
 * 
 * @param dataString - Data em formato "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS"
 * @returns Date object em UTC
 * 
 * @example
 * parseDataParaBanco("2026-01-20") 
 * // Retorna: Date object representando 20/01/2026 12:00 UTC
 * // Isso garante que mesmo com timezone -03:00, ainda será dia 20
 */
export function parseDataParaBanco(dataString: string): Date {
  if (!dataString) {
    throw new Error("Data inválida: string vazia");
  }
  
  // Remove qualquer parte de horário (pega apenas YYYY-MM-DD)
  const dataLimpa = dataString.split('T')[0];
  
  // Valida formato
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    throw new Error(`Data inválida: formato esperado YYYY-MM-DD, recebido ${dataString}`);
  }
  
  const [ano, mes, dia] = dataLimpa.split('-').map(Number);
  
  // Validações básicas
  if (ano < 1900 || ano > 2100) {
    throw new Error(`Ano inválido: ${ano}`);
  }
  if (mes < 1 || mes > 12) {
    throw new Error(`Mês inválido: ${mes}`);
  }
  if (dia < 1 || dia > 31) {
    throw new Error(`Dia inválido: ${dia}`);
  }
  
  // Cria Date em UTC meio-dia (12:00)
  // Isso evita que conversões de timezone mudem o dia
  // Exemplo: 2026-01-20 12:00 UTC = 2026-01-20 09:00 -03:00 (ainda dia 20!)
  return new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
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
 * Formata data com mês por extenso
 * 
 * @param data - Data em formato string (ISO) ou Date
 * @returns String formatada "DD de MMMM de YYYY"
 * 
 * @example
 * formatarDataPorExtenso("2026-01-20") // "20 de janeiro de 2026"
 */
export function formatarDataPorExtenso(data: string | Date | null | undefined): string {
  if (!data) return '';
  
  const d = new Date(data);
  
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  const dia = d.getUTCDate();
  const mes = meses[d.getUTCMonth()];
  const ano = d.getUTCFullYear();
  
  return `${dia} de ${mes} de ${ano}`;
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
