export interface Categoria {
  id: string;
  nome: string;
  tipo: "entrada" | "saida" | "ambos";
  cor?: string;
  icone?: string;
  ativa: boolean;
  ordem?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const categoriaService = {
  /**
   * Lista todas as categorias
   */
  async listar(): Promise<Categoria[]> {
    const res = await fetch("/api/categorias");
    if (!res.ok) throw new Error("Erro ao listar categorias");
    return res.json();
  },

  /**
   * Busca uma categoria por ID
   */
  async buscarPorId(id: string): Promise<Categoria> {
    const res = await fetch(`/api/categorias/${id}`);
    if (!res.ok) throw new Error("Categoria não encontrada");
    return res.json();
  },

  /**
   * Cria uma nova categoria
   */
  async criar(dados: Omit<Categoria, "id" | "createdAt" | "updatedAt">): Promise<Categoria> {
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao criar categoria");
    }
    return res.json();
  },

  /**
   * Atualiza uma categoria existente
   */
  async atualizar(id: string, dados: Partial<Categoria>): Promise<Categoria> {
    const res = await fetch(`/api/categorias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao atualizar categoria");
    }
    return res.json();
  },

  /**
   * Remove uma categoria
   */
  async remover(id: string): Promise<void> {
    const res = await fetch(`/api/categorias/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao remover categoria");
    }
  },

  /**
   * Reordena categorias
   */
  async reordenar(categorias: { id: string; ordem: number }[]): Promise<void> {
    const res = await fetch("/api/categorias/reordenar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorias }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao reordenar categorias");
    }
  },

  /**
   * Lista categorias por tipo
   */
  async listarPorTipo(tipo: "entrada" | "saida"): Promise<Categoria[]> {
    const res = await fetch(`/api/categorias?tipo=${tipo}`);
    if (!res.ok) throw new Error("Erro ao listar categorias");
    return res.json();
  },
};