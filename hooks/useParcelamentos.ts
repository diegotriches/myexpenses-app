"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parcelamentoService } from "@/services/parcelamentoService";
import { useToast } from "@/hooks/use-toast";

export function useAntecipagem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ parcelamentoId, quantidadeParcelas, desconto }: {
      parcelamentoId: string;
      quantidadeParcelas: number;
      desconto?: number;
    }) => parcelamentoService.antecipar(parcelamentoId, { quantidadeParcelas, desconto }),

    onSuccess: (resultado) => {
      // refetchQueries força a busca imediata (em vez de só marcar como
      // stale) — evita o card sumir até o usuário atualizar a página
      queryClient.refetchQueries({ queryKey: ["transacoes"] });
      queryClient.refetchQueries({ queryKey: ["antecipacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      toast({
        title: "Parcelas antecipadas!",
        description: `${resultado.quantidadeAntecipada} parcela(s), valor total R$ ${resultado.valorFaceAntecipado.toFixed(2)}.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao antecipar parcelas", description: error.message, variant: "destructive" });
    },
  });
}

export function useAntecipacoes(parcelamentoId: string) {
  return useQuery({
    queryKey: ["antecipacoes", parcelamentoId],
    queryFn: () => parcelamentoService.listarAntecipacoes(parcelamentoId),
    staleTime: 60 * 1000,
    enabled: !!parcelamentoId,
  });
}

// Sem escopo de parcelamento — usado pra decidir quais cards totalmente
// antecipados (sem parcela viva restante) ainda precisam continuar
// visíveis na aba
export function useTodasAntecipacoes() {
  return useQuery({
    queryKey: ["antecipacoes", "todas"],
    queryFn: () => parcelamentoService.listarTodasAntecipacoes(),
    staleTime: 60 * 1000,
  });
}

export function useDesfazerAntecipacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (antecipacaoId: string) => parcelamentoService.desfazerAntecipacao(antecipacaoId),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["transacoes"] });
      queryClient.refetchQueries({ queryKey: ["antecipacoes"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["cartoes"] });
      queryClient.invalidateQueries({ queryKey: ["faturas"] });
      toast({ title: "Antecipação desfeita", description: "As parcelas originais foram restauradas." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao desfazer antecipação", description: error.message, variant: "destructive" });
    },
  });
}