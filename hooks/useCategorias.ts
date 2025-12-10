"use client";

import { useEffect, useState, useCallback } from "react";

export interface Categoria {
  id: number;
  nome: string;
  tipo: "entrada" | "saida";
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categorias"); // ajuste se seu endpoint for outro (ex: /categorias)
      if (!res.ok) {
        const txt = await res.text().catch(() => null);
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // optional: normalize data shape if backend retorna campos diferentes
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Erro ao carregar categorias:", err);
      setError(err?.message ?? "Erro desconhecido");
      setCategorias([]);
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
    carregar, // chamada manual para recarregar após criar/editar/excluir
  };
}
