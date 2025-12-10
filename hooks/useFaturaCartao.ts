import { useEffect, useState } from "react";
import { Transacao } from "@/types/transacao";
import { Cartao } from "@/types/cartao";

export function useFaturaCartao(cartaoId: number, referencia?: string) {
  const [cartao, setCartao] = useState<Cartao | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);

    try {
      const url = referencia
        ? `/api/cartoes/${cartaoId}/fatura?referencia=${referencia}`
        : `/api/cartoes/${cartaoId}/fatura`;

      const resp = await fetch(url);
      const data = await resp.json();

      setCartao(data.cartao);
      setTransacoes(data.transacoes);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [cartaoId, referencia]);

  return { cartao, transacoes, loading, carregar };
}
