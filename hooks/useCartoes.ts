import { useEffect, useState } from "react";
import { Cartao } from "@/types/cartao";

export function useCartoes() {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const carregar = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/cartoes");
      const data = await resp.json();
      setCartoes(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  return { cartoes, loading, carregar };
}
