import { Categoria, CriarCategoriaDTO, AtualizarCategoriaDTO, TotaisCategoriasResponse, UsoCategoria } from "@/types/categoria";
import { requisicao } from "@/services/http";

/**
 * Helper para tratar erros de forma consistente
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = "Erro desconhecido";
    
    try {
      const error = await response.json();
      errorMessage = error.error || error.message || "Erro na requisição";
    } catch {
      // Se não conseguir parsear JSON, usa mensagem padrão baseada no status
      errorMessage = response.status === 404 
        ? "Recurso não encontrado"
        : response.status === 401
        ? "Não autenticado"
        : response.status === 403
        ? "Sem permissão"
        : `Erro ${response.status}`;
    }
    
    throw new Error(errorMessage);
  }
  
  // Para DELETE que não retorna conteúdo
  if (response.status === 204) {
    return null as T;
  }
  
  return response.json();
}

export const categoriaService = {
  totais(ano: number) {
    return requisicao<TotaisCategoriasResponse>(`/api/categorias/totais?ano=${ano}`, undefined, "Erro ao carregar totais");
  },

  uso(id: string) {
    return requisicao<UsoCategoria>(`/api/categorias/${id}/uso`, undefined, "Erro ao verificar o uso da categoria");
  },

  /**
   * Lista todas as categorias do usuário logado
   */
  async listar(): Promise<Categoria[]> {
    try {
      const res = await fetch("/api/categorias");
      return handleResponse<Categoria[]>(res);
    } catch (error) {
      console.error("[categoriaService.listar]", error);
      throw error instanceof Error ? error : new Error("Erro ao listar categorias");
    }
  },

  /**
   * Lista categorias filtradas por tipo
   */
  async listarPorTipo(tipo: "entrada" | "saida"): Promise<Categoria[]> {
    try {
      const res = await fetch(`/api/categorias?tipo=${tipo}`);
      return handleResponse<Categoria[]>(res);
    } catch (error) {
      console.error("[categoriaService.listarPorTipo]", error);
      throw error instanceof Error ? error : new Error("Erro ao listar categorias");
    }
  },

  /**
   * Busca uma categoria específica por ID
   */
  async buscarPorId(id: string): Promise<Categoria> {
    try {
      const res = await fetch(`/api/categorias/${id}`);
      return handleResponse<Categoria>(res);
    } catch (error) {
      console.error("[categoriaService.buscarPorId]", error);
      throw error instanceof Error ? error : new Error("Categoria não encontrada");
    }
  },

  /**
   * Cria uma nova categoria
   */
  async criar(dados: CriarCategoriaDTO): Promise<Categoria> {
    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      return handleResponse<Categoria>(res);
    } catch (error) {
      console.error("[categoriaService.criar]", error);
      throw error instanceof Error ? error : new Error("Erro ao criar categoria");
    }
  },

  /**
   * Atualiza uma categoria existente
   */
  async atualizar(id: string, dados: AtualizarCategoriaDTO): Promise<Categoria> {
    try {
      const res = await fetch(`/api/categorias/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      return handleResponse<Categoria>(res);
    } catch (error) {
      console.error("[categoriaService.atualizar]", error);
      throw error instanceof Error ? error : new Error("Erro ao atualizar categoria");
    }
  },

  /**
   * Remove uma categoria
   */
  async remover(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/categorias/${id}`, {
        method: "DELETE",
      });
      return handleResponse<void>(res);
    } catch (error) {
      console.error("[categoriaService.remover]", error);
      throw error instanceof Error ? error : new Error("Erro ao remover categoria");
    }
  },
};