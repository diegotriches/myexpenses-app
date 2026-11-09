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

// ============================================================================
// CURRENCY UTILITIES
// ============================================================================

// ============================================================================
// NUMBER UTILITIES
// ============================================================================

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
 * Trunca uma string e adiciona "..." no final
 */
export function truncate(str: string, length: number): string {
  if (!str) return str;
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
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

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

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

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

// ============================================================================
// MISC UTILITIES
// ============================================================================

