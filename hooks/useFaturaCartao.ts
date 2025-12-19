import { useState, useEffect } from "react";
import axios from "axios";
import type { Transacao } from "@/types/transacao";

interface Fatura {
  transacoesDoMes: Transacao[];
  total: number;
  porCategoria: Record<string, number>;
}

interface UseFaturaCartaoProps {
  cartaoId: string;
  ano: number;
  mes: number;
}

export function useFaturaCartao({ cartaoId, ano, mes }: UseFaturaCartaoProps) {
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cartaoId || !ano || !mes) return;

    const carregarFatura = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get(`/api/cartoes/${cartaoId}/fatura`, {
          params: { ano, mes },
        });

        const data = res.data ?? {};

        setFatura({
          transacoesDoMes: Array.isArray(data.transacoesDoMes)
            ? data.transacoesDoMes
            : [],
          total: Number(data.total ?? 0),
          porCategoria: data.porCategoria ?? {},
        });
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar fatura");
        setFatura(null);
      } finally {
        setLoading(false);
      }
    };

    carregarFatura();
  }, [cartaoId, ano, mes]);

  return { fatura, loading, error };
}