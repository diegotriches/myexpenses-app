import { useEffect, useState, useCallback } from "react";
import { categoriaService, Categoria } from "@/services/categoriaService";

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await categoriaService.listar();
      setCategorias(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  }, []);

  const criar = useCallback(async (dados: Omit<Categoria, "id" | "createdAt" | "updatedAt">) => {
    setLoading(true);
    setError(null);

    try {
      const novaCategoria = await categoriaService.criar(dados);
      setCategorias((prev) => [...prev, novaCategoria]);
      return novaCategoria;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao criar categoria");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizar = useCallback(async (id: string, dados: Partial<Categoria>) => {
    setLoading(true);
    setError(null);

    try {
      const categoriaAtualizada = await categoriaService.atualizar(id, dados);
      setCategorias((prev) =>
        prev.map((c) => (c.id === id ? categoriaAtualizada : c))
      );
      return categoriaAtualizada;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao atualizar categoria");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remover = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await categoriaService.remover(id);
      setCategorias((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao remover categoria");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reordenar = useCallback(async (categorias: { id: string; ordem: number }[]) => {
    setLoading(true);
    setError(null);

    try {
      await categoriaService.reordenar(categorias);
      await carregar(); // Recarrega para refletir a nova ordem
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao reordenar categorias");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [carregar]);

  const listarPorTipo = useCallback(async (tipo: "entrada" | "saida") => {
    setLoading(true);
    setError(null);

    try {
      const data = await categoriaService.listarPorTipo(tipo);
      return data;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar categorias");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { 
    categorias, 
    loading, 
    error, 
    carregar,
    criar,
    atualizar,
    remover,
    reordenar,
    listarPorTipo
  };
}