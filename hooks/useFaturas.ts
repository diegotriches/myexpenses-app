"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { faturaService } from "@/services/faturaService";
import { useToast } from "@/hooks/use-toast";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";
import type {
  FaturaDetalhada,
  PagarFaturaDTO,
  AdiantamentoFatura,
  RegistrarAdiantamentoDTO,
  CancelarAdiantamentoDTO,
} from "@/types/fatura";

// Re-exporta para conveniência — componentes podem importar direto do hook
export type { AdiantamentoFatura };

/**
 * Query Keys para faturas
 * ⚠️ EXPORTADO para uso em outros módulos (invalidação de cache)
 */
export const faturasKeys = {
  byCartao: (cartaoId: string | number, ano: number, mes: number) =>
    ["faturas", "cartao", String(cartaoId), ano, mes] as const,
};

/**
 * Hook para buscar fatura de um cartão específico (com cache)
 *
 * @param cartaoId - ID do cartão
 * @param ano - Ano da fatura
 * @param mes - Mês da fatura (1-12)
 *
 * @example
 * const { fatura, transacoes, porCategoria, isLoading } = useFaturaCartao({
 *   cartaoId: "1",
 *   ano: 2026,
 *   mes: 1
 * });
 */
export function useFaturaCartao({
  cartaoId,
  ano,
  mes,
}: {
  cartaoId: string | number;
  ano: number;
  mes: number;
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: faturasKeys.byCartao(cartaoId, ano, mes),
    queryFn: async (): Promise<FaturaDetalhada> => {
      return faturaService.buscarFatura(cartaoId, ano, mes);
    },
    enabled: !!(cartaoId && ano && mes !== undefined),
    // Faturas mudam frequentemente, cache de 2 minutos
    staleTime: 2 * 60 * 1000,
  });

  return {
    // Dados
    fatura: data?.fatura || null,
    cartao: data?.cartao || null,
    periodo: data?.periodo || null,
    transacoes: data?.transacoes || [],
    totalTransacoes: data?.totalTransacoes || 0,
    porCategoria: data?.porCategoria || {},

    // Estados
    isLoading,
    error,

    // Ações
    refetch,
  };
}

/**
 * Hook para pagar fatura
 *
 * @example
 * const pagarFatura = usePagarFatura();
 * await pagarFatura.mutateAsync({
 *   cartaoId: 1,
 *   ano: 2026,
 *   mes: 1,
 *   contaId: "123",
 *   dataPagamento: "2026-01-15"
 * });
 */
export function usePagarFatura() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      cartaoId,
      ano,
      mes,
      contaId,
      dataPagamento,
    }: {
      cartaoId: number | string;
      ano: number;
      mes: number;
      contaId: string;
      dataPagamento?: string;
    }) => {
      const dados: PagarFaturaDTO = {
        contaId,
        dataPagamento: dataPagamento || hojeBrt(),
      };

      return faturaService.pagar(cartaoId, ano, mes, dados);
    },
    onSuccess: (_, variables) => {
      // Invalida fatura específica
      queryClient.invalidateQueries({
        queryKey: faturasKeys.byCartao(
          variables.cartaoId,
          variables.ano,
          variables.mes,
        ),
      });

      // Invalida lista de cartões (limite disponível mudou)
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });

      // Invalida contas (saldo foi debitado)
      queryClient.invalidateQueries({ queryKey: ["contas"] });

      // Invalida dashboard e extrato
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes-gastos-anuais"] });

      toast({
        title: "Fatura paga!",
        description: "O pagamento foi registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao pagar fatura",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCancelarPagamentoFatura() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ cartaoId, ano, mes }: { cartaoId: number | string; ano: number; mes: number }) =>
      faturaService.estornarPagamento(cartaoId, ano, mes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes-gastos-anuais"] });
      toast({ title: "Pagamento cancelado", description: "A fatura voltou a ficar em aberto." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cancelar pagamento", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * Hook genérico para buscar qualquer fatura (menos usado)
 * Útil para casos onde você precisa buscar uma fatura sob demanda
 *
 * @example
 * const { buscarFatura } = useFaturas();
 * const data = await buscarFatura(1, 2026, 1);
 */
export function useFaturas() {
  const queryClient = useQueryClient();

  const buscarFatura = async (
    cartaoId: number | string,
    ano: number,
    mes: number,
  ): Promise<FaturaDetalhada> => {
    // Busca do cache primeiro
    const cached = queryClient.getQueryData<FaturaDetalhada>(
      faturasKeys.byCartao(cartaoId, ano, mes),
    );
    if (cached) return cached;

    // Se não estiver em cache, busca da API
    const data = await faturaService.buscarFatura(cartaoId, ano, mes);

    // Salva no cache
    queryClient.setQueryData(faturasKeys.byCartao(cartaoId, ano, mes), data);

    return data;
  };

  return {
    buscarFatura,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAdiantamentoUrl(
  cartaoId: number | string,
  mes: number,
  ano: number,
) {
  return `/api/cartoes/${cartaoId}/fatura/adiantamento?mes=${mes}&ano=${ano}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// useAdiantamentos — lista os adiantamentos de uma fatura
// ─────────────────────────────────────────────────────────────────────────────
export function useAdiantamentos(
  cartaoId: number | string,
  mes: number,
  ano: number,
) {
  return useQuery<AdiantamentoFatura[]>({
    queryKey: ["adiantamentos", cartaoId, mes, ano],
    queryFn: async () => {
      const res = await fetch(buildAdiantamentoUrl(cartaoId, mes, ano));
      if (!res.ok) throw new Error("Erro ao buscar adiantamentos");
      return res.json();
    },
    enabled: !!cartaoId && !!mes && !!ano,
    staleTime: 2 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useRegistrarAdiantamento — registra novo adiantamento
// ─────────────────────────────────────────────────────────────────────────────
export function useRegistrarAdiantamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dados: RegistrarAdiantamentoDTO) => {
      const { cartaoId, mes, ano, contaId, valor, descricao } = dados;
      const res = await fetch(buildAdiantamentoUrl(cartaoId, mes, ano), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contaId, valor, descricao }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Erro ao registrar adiantamento" }));
        throw new Error(err.error || "Erro ao registrar adiantamento");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      // ✅ CORRIGIDO: faturasKeys.byCartao gera ["faturas","cartao",String(id),ano,mes]
      // que bate exatamente com a queryKey do useFaturaCartao
      queryClient.invalidateQueries({
        queryKey: ["adiantamentos", vars.cartaoId, vars.mes, vars.ano],
      });
      queryClient.invalidateQueries({
        queryKey: faturasKeys.byCartao(vars.cartaoId, vars.ano, vars.mes),
      });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      toast({
        title: "Adiantamento registrado!",
        description:
          "O valor foi debitado da conta e o limite do cartão foi restaurado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar adiantamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// useCancelarAdiantamento — cancela e estorna um adiantamento
// ─────────────────────────────────────────────────────────────────────────────
export function useCancelarAdiantamento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dados: CancelarAdiantamentoDTO) => {
      const { cartaoId, adiantamentoId } = dados;
      const res = await fetch(
        `/api/cartoes/${cartaoId}/fatura/adiantamento/${adiantamentoId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Erro ao cancelar adiantamento" }));
        throw new Error(err.error || "Erro ao cancelar adiantamento");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["adiantamentos", vars.cartaoId, vars.mes, vars.ano],
      });
      queryClient.invalidateQueries({
        queryKey: faturasKeys.byCartao(vars.cartaoId, vars.ano, vars.mes),
      });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      toast({
        title: "Adiantamento cancelado!",
        description: "O valor foi estornado de volta para a conta.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar adiantamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
