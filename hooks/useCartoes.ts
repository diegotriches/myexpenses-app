import { useEffect, useState, useCallback } from "react";
import { Cartao } from "@/types/cartao";
import { cartaoService } from "@/services/cartaoService";

export function useCartoes() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await cartaoService.listar();
      setCartoes(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar cartões");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { cartoes, loading, error, carregar };
}