// src/lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================================
// TAILWIND UTILITIES
// ============================================================================

/**
 * Combina classes CSS do Tailwind de forma inteligente
 * Resolve conflitos e mescla classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Normaliza uma data para formato ISO (YYYY-MM-DD)
 * @throws {Error} Se a data for inválida
 */
export function normalizeDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error("Data inválida no formulário");
  }
  return d.toISOString().split("T")[0];
}

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return "Data inválida";
  }
  
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Formata uma data para o formato brasileiro com hora (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  if (isNaN(d.getTime())) {
    return "Data inválida";
  }
  
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formata data de forma relativa (hoje, ontem, há 2 dias, etc)
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - d.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return "Hoje";
  if (diffInDays === 1) return "Ontem";
  if (diffInDays < 7) return `Há ${diffInDays} dias`;
  if (diffInDays < 30) return `Há ${Math.floor(diffInDays / 7)} semanas`;
  if (diffInDays < 365) return `Há ${Math.floor(diffInDays / 30)} meses`;
  
  return `Há ${Math.floor(diffInDays / 365)} anos`;
}

/**
 * Converte uma string de data para objeto Date
 * Aceita formatos: YYYY-MM-DD, DD/MM/YYYY
 */
export function parseDate(dateStr: string): Date {
  // Tenta formato ISO primeiro (YYYY-MM-DD)
  let date = new Date(dateStr);
  
  // Se não funcionar, tenta formato brasileiro (DD/MM/YYYY)
  if (isNaN(date.getTime()) && dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    date = new Date(`${year}-${month}-${day}`);
  }
  
  if (isNaN(date.getTime())) {
    throw new Error("Formato de data inválido");
  }
  
  return date;
}

/**
 * Retorna o nome do mês por extenso
 */
export function getMonthName(month: number, short: boolean = false): string {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  
  const monthsShort = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];
  
  return short ? monthsShort[month] : months[month];
}

/**
 * Retorna o nome do dia da semana
 */
export function getDayName(date: Date | string, short: boolean = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: short ? "short" : "long",
  }).format(d);
}

// ============================================================================
// CURRENCY UTILITIES
// ============================================================================

/**
 * Formata um número como moeda brasileira (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata um número como moeda brasileira sem símbolo (1.234,56)
 */
export function formatCurrencyNoSymbol(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Converte uma string de moeda para número
 * Aceita: "R$ 1.234,56", "1.234,56", "1234.56"
 */
export function parseCurrency(value: string): number {
  // Remove símbolos e espaços
  let cleaned = value.replace(/[R$\s]/g, "");
  
  // Se tem ponto e vírgula, é formato brasileiro
  if (cleaned.includes(".") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  // Se tem apenas vírgula, é decimal brasileiro
  else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error("Formato de moeda inválido");
  }
  
  return parsed;
}

// ============================================================================
// NUMBER UTILITIES
// ============================================================================

/**
 * Formata uma porcentagem (0.125 → "12,5%")
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata um número com separador de milhares (1234567 → "1.234.567")
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

/**
 * Arredonda um número para N casas decimais
 */
export function roundTo(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Capitaliza a primeira letra de uma string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitaliza a primeira letra de cada palavra
 */
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .split(" ")
    .map(word => capitalize(word))
    .join(" ");
}

/**
 * Trunca uma string e adiciona "..." no final
 */
export function truncate(str: string, length: number): string {
  if (!str) return str;
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

/**
 * Remove acentos de uma string
 */
export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Converte uma string para slug (URL-friendly)
 */
export function slugify(str: string): string {
  return removeAccents(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Extrai iniciais de um nome (João Silva → JS)
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return "";
  
  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, maxLength)
    .map(word => word.charAt(0).toUpperCase())
    .join("");
  
  return initials;
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Valida um email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida um CPF (formato: 123.456.789-00 ou 12345678900)
 */
export function isValidCPF(cpf: string): boolean {
  // Remove formatação
  const cleaned = cpf.replace(/[^\d]/g, "");
  
  // Verifica tamanho
  if (cleaned.length !== 11) return false;
  
  // Verifica sequências inválidas (111.111.111-11, etc)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
}

/**
 * Valida um CNPJ (formato: 12.345.678/0001-00 ou 12345678000100)
 */
export function isValidCNPJ(cnpj: string): boolean {
  // Remove formatação
  const cleaned = cnpj.replace(/[^\d]/g, "");
  
  // Verifica tamanho
  if (cleaned.length !== 14) return false;
  
  // Verifica sequências inválidas
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Valida um telefone brasileiro
 * Aceita: (11) 98765-4321, 11987654321, +55 11 98765-4321
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^\d]/g, "");
  
  // Deve ter 10 ou 11 dígitos (com ou sem 9 no celular)
  // Ou 12-13 se tiver código do país (+55)
  return /^(\d{10}|\d{11}|\d{12}|\d{13})$/.test(cleaned);
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Formata um CPF (12345678900 → 123.456.789-00)
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/[^\d]/g, "");
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata um CNPJ (12345678000100 → 12.345.678/0001-00)
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/[^\d]/g, "");
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Formata um telefone ((11) 98765-4321)
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d]/g, "");
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  
  return phone;
}

/**
 * Formata um CEP (12345678 → 12345-678)
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/[^\d]/g, "");
  return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2");
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Remove duplicatas de um array
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array));
}

/**
 * Agrupa um array por uma chave
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Embaralha um array (Fisher-Yates shuffle)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Remove propriedades undefined/null de um objeto
 */
export function compact<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key as keyof T] = value;
    }
    return acc;
  }, {} as Partial<T>);
}

/**
 * Seleciona apenas algumas propriedades de um objeto
 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {} as Pick<T, K>);
}

/**
 * Remove algumas propriedades de um objeto
 */
export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

// ============================================================================
// MISC UTILITIES
// ============================================================================

/**
 * Gera um ID único simples
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Sleep/delay assíncrono
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce de uma função
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Copia texto para a área de transferência
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Erro ao copiar para clipboard:", error);
    return false;
  }
}