import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error("Data inválida no formulário");
  }
  return d.toISOString().split("T")[0];
}
