// src/hooks/useAplicacoes.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aplicacaoService, CreateAplicacaoDTO } from "@/services/aplicacaoService";
import { useToast } from "@/hooks/use-toast";

export function useAplicacoes(contaId?: string) {
  return useQuery({
    queryKey: contaId ? ["aplicacoes", contaId] : ["aplicacoes", "todas"],
    queryFn: () => aplicacaoService.listar(contaId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCriarAplicacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateAplicacaoDTO) => aplicacaoService.criar(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aplicacoes"] });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      toast({ title: "Aplicação criada!", description: "O valor foi debitado da conta e começa a render a partir de hoje." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar aplicação", description: error.message, variant: "destructive" });
    },
  });
}

export function useResgatarAplicacao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => aplicacaoService.resgatar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aplicacoes"] });
      queryClient.invalidateQueries({ queryKey: ["contas"] });
      queryClient.invalidateQueries({ queryKey: ["extrato"] });
      toast({ title: "Aplicação resgatada!", description: "O valor voltou pro saldo da conta." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao resgatar aplicação", description: error.message, variant: "destructive" });
    },
  });
}