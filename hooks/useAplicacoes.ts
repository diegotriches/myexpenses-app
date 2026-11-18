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
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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
      const retroativa = !!vars.dataAplicacao && vars.dataAplicacao < hojeBrt();
      toast({
        title: "Aplicação criada!",
        description: !retroativa
          ? "O valor foi debitado da conta e começa a render a partir do próximo dia útil."
          : vars.movimentarConta === false
            ? "Registrada como histórico: o rendimento desde a data informada foi calculado e o saldo da conta não foi alterado."
            : "O valor foi debitado da conta na data informada, e o rendimento desde então já foi calculado.",
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
    onSuccess: (_d, { dados }) => {
      invalidar();
      toast({
        title: "Aporte registrado!",
        description: dados.movimentarConta === false
          ? "Registrado como histórico, sem alterar o saldo da conta. O rendimento e o IR desse aporte são calculados separadamente."
          : "O valor foi debitado da conta. O rendimento e o IR desse aporte são calculados separadamente.",
      });
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

export function useDescontoAporte() {
  const invalidar = useInvalidarAplicacoes();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, aporteId, descontado }: { id: string; aporteId: string; descontado: boolean }) =>
      aplicacaoService.alterarDescontoAporte(id, aporteId, descontado),
    onSuccess: (_r, { descontado }) => {
      invalidar();
      toast({
        title: descontado ? "Aporte descontado da conta" : "Desconto desfeito",
        description: descontado
          ? "O valor saiu da conta, com o lançamento no extrato na data do aporte."
          : "O valor voltou para a conta e o lançamento saiu do extrato. O aporte ficou como histórico.",
      });
    },
    onError: (error: Error, { descontado }) => {
      toast({
        title: descontado ? "Erro ao descontar da conta" : "Erro ao desfazer o desconto",
        description: error.message,
        variant: "destructive",
      });
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