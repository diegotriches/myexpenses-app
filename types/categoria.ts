// src/types/categoria.ts

/**
 * Interface principal de Categoria
 */
export interface Categoria {
  id: string;
  userId: string;
  nome: string;
  tipo: "entrada" | "saida" | "ambos";
  icone: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

/**
 * DTO para criar categoria (sem id, userId, timestamps)
 */
export interface CriarCategoriaDTO {
  nome: string;
  tipo: "entrada" | "saida" | "ambos";
  icone: string;
}

/**
 * DTO para atualizar categoria (todos campos opcionais)
 */
export interface AtualizarCategoriaDTO {
  nome?: string;
  tipo?: "entrada" | "saida" | "ambos";
  icone?: string;
}

