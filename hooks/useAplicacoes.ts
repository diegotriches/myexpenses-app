// src/hooks/useAplicacoes.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  aplicacaoService, CreateAplicacaoDTO, AportarDTO, ResgatarDTO,
} from "@/services/aplicacaoService";
import { useToast } from "@/hooks/use-toast";
import { hojeBrt } from "@/utils/aplicacaoSimulacao";

export function useAplicacoes(contaId?: string) {
  return useQuery({
    queryKey: contaId ? ["aplicacoes", contaId] : ["aplicacoes", "todas"],
    queryFn: () => aplicacaoService.listar(contaId),
    staleTime: 2 * 60 * 1000,
  });
}

function useInvalidarAplicacoes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["aplicacoes"] });
    queryClient.invalidateQueries({ queryKey: ["contas"] });
    queryClient.invalidateQueries({ queryKey: ["extrato"] });
  };
}

export function useCriarAplicacao() {
  const invalidar = useInvalidarAplicacoes();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CreateAplicacaoDTO) => aplicacaoService.criar(dados),
    onSuccess: (_d, vars) => {
      invalidar();
      const historico = !!vars.dataAplicacao && vars.dataAplicacao < hojeBrt();
      toast({
        title: "Aplicação criada!",
        description: historico
          ? "Registrada como histórico: o rendimento desde a data informada foi calculado e o saldo da conta não foi alterado."
          : "O valor foi debitado da conta e começa a render a partir do próximo dia útil.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar aplicação", description: error.message, variant: "destructive" });
    },
  });
}

export function useAportarAplicacao() {
  const invalidar = useInvalidarAplicacoes();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: AportarDTO }) => aplicacaoService.aportar(id, dados),
    onSuccess: () => {
      invalidar();
      toast({ title: "Aporte registrado!", description: "O rendimento e o IR desse aporte passam a ser calculados separadamente." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar aporte", description: error.message, variant: "destructive" });
    },
  });
}

export function useResgatarAplicacao() {
  const invalidar = useInvalidarAplicacoes();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: ResgatarDTO }) => aplicacaoService.resgatar(id, dados),
    onSuccess: (r) => {
      invalidar();
      toast({
        title: r.detalhamento.tipo === "total" ? "Aplicação resgatada!" : "Resgate parcial realizado!",
        description: "O valor líquido voltou pro saldo da conta.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao resgatar", description: error.message, variant: "destructive" });
    },
  });
}

export function useRecalcularAplicacao() {
  const invalidar = useInvalidarAplicacoes();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => aplicacaoService.recalcular(id),
    onSuccess: (r) => {
      invalidar();
      toast({ title: "Rendimentos atualizados", description: `BCB: ${r.statusBcb}` });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });
}