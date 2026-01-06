export interface Categoria {
  id: string;
  userId: string;
  nome: string;
  tipo: "entrada" | "saida" | "ambos";
  icone: string;
}

export interface CriarCategoriaDTO {
  nome: string;
  tipo: "entrada" | "saida" | "ambos";
  icone: string;
}

export interface AtualizarCategoriaDTO {
  nome?: string;
  tipo?: "entrada" | "saida" | "ambos";
  icone?: string;
}

// Tipo para filtros
export type TipoCategoria = "entrada" | "saida" | "ambos";
export type OrdenacaoCategoria = "nome" | "mais-usadas" | "menos-usadas";