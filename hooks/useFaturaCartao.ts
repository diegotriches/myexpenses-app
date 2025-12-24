import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import type { Transacao } from "@/types/transacao";

interface FaturaResumo {
  id?: number;
  cartaoId: number;
  mes: number;
  ano: number;
  total: number;
  paga: boolean;
  dataPagamento: string | null;
}

interface UseFaturaCartaoProps {
  cartaoId: string;
  ano: number;
  mes: number;
}

export function useFaturaCartao({
  cartaoId,
  ano,
  mes,
}: UseFaturaCartaoProps) {
  const [fatura, setFatura] = useState<FaturaResumo | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [porCategoria, setPorCategoria] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pagando, setPagando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);

  const carregarFatura = useCallback(async () => {
    if (!cartaoId || !ano || mes === undefined) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(
        `/api/cartoes/${cartaoId}/fatura`,
        { params: { ano, mes } }
      );

      const data = res.data;

      setFatura(data.fatura ?? null);
      setTransacoes(Array.isArray(data.transacoes) ? data.transacoes : []);
      setPorCategoria(data.porCategoria ?? {});
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar fatura");
      setFatura(null);
      setTransacoes([]);
      setPorCategoria({});
    } finally {
      setLoading(false);
    }
  }, [cartaoId, ano, mes]);

  useEffect(() => {
    carregarFatura();
  }, [carregarFatura]);

  interface PagarFaturaPayload {
    contaId: string;
    dataPagamento?: string;
  }

  const pagarFatura = async ({
    contaId,
    dataPagamento,
  }: PagarFaturaPayload) => {
    if (!cartaoId || ano === undefined || mes === undefined) {
      throw new Error("Parâmetros insuficientes para pagar a fatura");
    }

    if (pagando) return;

    if (fatura?.paga) {
      throw new Error("Fatura já está paga");
    }

    setPagando(true);
    setErroPagamento(null);

    try {
      await axios.post(
        `/api/cartoes/${cartaoId}/fatura`,
        { contaId, dataPagamento },
        { params: { ano, mes } }
      );

      await carregarFatura();
    } catch (err: any) {
      console.error(err);
      setErroPagamento(
        err?.response?.data?.error ?? "Erro ao pagar fatura"
      );
      throw err;
    } finally {
      setPagando(false);
    }
  };

  return {
    fatura,
    transacoes,
    porCategoria,

    loading,
    error,

    pagando,
    erroPagamento,
    pagarFatura,
  };
}