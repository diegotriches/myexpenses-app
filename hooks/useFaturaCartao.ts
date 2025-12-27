import { useEffect, useState, useCallback } from "react";
import type { Transacao } from "@/types/transacao";

interface FaturaResumo {
  id?: number;
  cartaoId: number;
  mes: number;
  ano: number;
  total: number;
  paga: boolean;
  dataPagamento: string | null;
  contaPagamentoId?: string | null;
}

interface UseFaturaCartaoProps {
  cartaoId: string;
  ano: number;
  mes: number;
}

interface PagarFaturaPayload {
  contaId: string;
  dataPagamento?: string;
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

  // Carregar fatura
  const carregarFatura = useCallback(async () => {
    if (!cartaoId || !ano || mes === undefined) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ano: String(ano),
        mes: String(mes),
      });

      const res = await fetch(
        `/api/cartoes/${cartaoId}/fatura?${params.toString()}`
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao carregar fatura");
      }

      const data = await res.json();

      setFatura(data.fatura ?? null);
      setTransacoes(Array.isArray(data.transacoes) ? data.transacoes : []);
      setPorCategoria(data.porCategoria ?? {});
    } catch (err: any) {
      console.error("Erro ao carregar fatura:", err);
      setError(err.message || "Erro ao carregar fatura");
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

  // Pagar fatura
  const pagarFatura = useCallback(async ({
    contaId,
    dataPagamento,
  }: PagarFaturaPayload) => {
    if (!cartaoId || ano === undefined || mes === undefined) {
      throw new Error("Parâmetros insuficientes para pagar a fatura");
    }

    if (pagando) {
      console.warn("Pagamento já em andamento");
      return;
    }

    if (fatura?.paga) {
      throw new Error("Fatura já está paga");
    }

    if (!fatura || fatura.total <= 0) {
      throw new Error("Fatura não possui valor a pagar");
    }

    setPagando(true);
    setErroPagamento(null);

    try {
      const params = new URLSearchParams({
        ano: String(ano),
        mes: String(mes),
      });

      const res = await fetch(
        `/api/cartoes/${cartaoId}/fatura?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contaId,
            dataPagamento: dataPagamento || new Date().toISOString(),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao pagar fatura");
      }

      // Recarrega a fatura após pagamento
      await carregarFatura();
    } catch (err: any) {
      console.error("Erro ao pagar fatura:", err);
      const mensagemErro = err.message || "Erro ao pagar fatura";
      setErroPagamento(mensagemErro);
      throw err;
    } finally {
      setPagando(false);
    }
  }, [cartaoId, ano, mes, pagando, fatura, carregarFatura]);

  // Estornar pagamento de fatura
  const estornarPagamento = useCallback(async () => {
    if (!cartaoId || ano === undefined || mes === undefined) {
      throw new Error("Parâmetros insuficientes para estornar pagamento");
    }

    if (!fatura?.paga) {
      throw new Error("Fatura não está paga");
    }

    if (!fatura.id) {
      throw new Error("ID da fatura não encontrado");
    }

    setPagando(true);
    setErroPagamento(null);

    try {
      const params = new URLSearchParams({
        ano: String(ano),
        mes: String(mes),
      });

      const res = await fetch(
        `/api/cartoes/${cartaoId}/fatura?${params.toString()}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro ao estornar pagamento");
      }

      // Recarrega a fatura após estorno
      await carregarFatura();
    } catch (err: any) {
      console.error("Erro ao estornar pagamento:", err);
      const mensagemErro = err.message || "Erro ao estornar pagamento";
      setErroPagamento(mensagemErro);
      throw err;
    } finally {
      setPagando(false);
    }
  }, [cartaoId, ano, mes, fatura, carregarFatura]);

  // Limpar erro
  const limparErro = useCallback(() => {
    setError(null);
    setErroPagamento(null);
  }, []);

  return {
    // Dados
    fatura,
    transacoes,
    porCategoria,

    // Estados de loading
    loading,
    error,

    // Estados de pagamento
    pagando,
    erroPagamento,

    // Ações
    carregarFatura,
    pagarFatura,
    estornarPagamento,
    limparErro,
  };
}