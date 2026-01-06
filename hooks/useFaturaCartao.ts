import { useEffect, useState, useCallback } from "react";
import { faturaService } from "@/services/faturaService";
import { cartaoService } from "@/services/cartaoService";
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

  // Carregar fatura usando cartaoService
  const carregarFatura = useCallback(async () => {
    if (!cartaoId || !ano || mes === undefined) return;

    setLoading(true);
    setError(null);

    try {
      // ✅ Usa o cartaoService.fatura
      const data = await cartaoService.fatura(cartaoId, ano, mes);

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

  // Pagar fatura usando faturaService
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
      // ✅ Usa o faturaService.pagar
      await faturaService.pagar(
        Number(cartaoId),
        ano,
        mes,
        {
          contaId,
          dataPagamento: dataPagamento || new Date().toISOString(),
        }
      );

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

  // Estornar pagamento usando faturaService
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
      // ✅ Usa o faturaService.estornarPagamento
      await faturaService.estornarPagamento(Number(cartaoId), ano, mes);

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

// ========================================
// Hook alternativo para buscar faturas gerais (não específico por cartão)
// ========================================
export function useFaturas() {
  const [fatura, setFatura] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarFatura = useCallback(async (cartaoId: number, ano: number, mes: number) => {
    setLoading(true);
    setError(null);

    try {
      // ✅ Usa o faturaService.buscarFatura
      const data = await faturaService.buscarFatura(cartaoId, ano, mes);
      setFatura(data);
      return data;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao buscar fatura");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const pagarFatura = useCallback(async (
    cartaoId: number,
    ano: number,
    mes: number,
    dados: {
      contaId: string;
      dataPagamento?: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      // ✅ Usa o faturaService.pagar
      const resultado = await faturaService.pagar(cartaoId, ano, mes, dados);
      await buscarFatura(cartaoId, ano, mes); // Atualiza a fatura
      return resultado;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao pagar fatura");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buscarFatura]);

  const estornarPagamento = useCallback(async (
    cartaoId: number,
    ano: number,
    mes: number
  ) => {
    setLoading(true);
    setError(null);

    try {
      // ✅ Usa o faturaService.estornarPagamento
      const resultado = await faturaService.estornarPagamento(cartaoId, ano, mes);
      await buscarFatura(cartaoId, ano, mes); // Atualiza a fatura
      return resultado;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao estornar pagamento");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [buscarFatura]);

  return {
    fatura,
    loading,
    error,
    buscarFatura,
    pagarFatura,
    estornarPagamento,
  };
}