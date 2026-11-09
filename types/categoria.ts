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

// ── Totais por categoria (GET /api/categorias/totais) ──
export interface TotalCategoria {
  total: number;
  totalEntrada: number;
  totalSaida: number;
  quantidade: number;
}

export interface TotaisCategoriasResponse {
  ano: number;
  totais: Record<string, TotalCategoria>;
}

// ── Uso antes de excluir (GET /api/categorias/[id]/uso) ──
export interface UsoCategoria {
  transacoes: number;
  recorrencias: number;
  destinos: string[];
  bloqueada: boolean;
}
