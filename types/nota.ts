// src/types/nota.ts

export type CorNota = "yellow" | "blue" | "green" | "red" | "purple" | "gray";

export interface Nota {
  id:        string;
  userId:    string;
  titulo:    string;
  conteudo:  string;
  cor:       CorNota;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotaDTO {
  titulo:   string;
  conteudo: string;
  cor:      CorNota;
}

export interface UpdateNotaDTO {
  titulo?:   string;
  conteudo?: string;
  cor?:      CorNota;
}

// Paleta de cores disponíveis para as notas
export const COR_CONFIG: Record<CorNota, {
  label:      string;
  bg:         string;   // card background
  border:     string;   // card border
  header:     string;   // header background
  dot:        string;   // dot seletor
}> = {
  yellow: {
    label:  "Amarelo",
    bg:     "bg-yellow-50 dark:bg-yellow-950/20",
    border: "border-yellow-200 dark:border-yellow-800",
    header: "bg-yellow-100 dark:bg-yellow-900/30",
    dot:    "bg-yellow-400",
  },
  blue: {
    label:  "Azul",
    bg:     "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    header: "bg-blue-100 dark:bg-blue-900/30",
    dot:    "bg-blue-400",
  },
  green: {
    label:  "Verde",
    bg:     "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
    header: "bg-green-100 dark:bg-green-900/30",
    dot:    "bg-green-400",
  },
  red: {
    label:  "Vermelho",
    bg:     "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
    header: "bg-red-100 dark:bg-red-900/30",
    dot:    "bg-red-400",
  },
  purple: {
    label:  "Roxo",
    bg:     "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
    header: "bg-purple-100 dark:bg-purple-900/30",
    dot:    "bg-purple-400",
  },
  gray: {
    label:  "Cinza",
    bg:     "bg-gray-50 dark:bg-gray-900/40",
    border: "border-gray-200 dark:border-gray-700",
    header: "bg-gray-100 dark:bg-gray-800",
    dot:    "bg-gray-400",
  },
};