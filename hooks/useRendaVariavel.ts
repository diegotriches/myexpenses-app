// src/hooks/useRendaVariavel.ts
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  rendaVariavelService,
  type CriarOperacaoRvDTO,
  type CriarEventoDTO,
  type CriarProventoRvDTO,
  type ImportarProventosDTO,
  type OperacaoParaImportar,
} from "@/services/rendaVariavelService";
import { useToast } from "@/hooks/use-toast";
import type { ConfigIr } from "@/utils/irRendaVariavelUtils";

export function useRendaVariavel() {
  return useQuery({
    queryKey: ["renda-variavel"],
    queryFn: () => rendaVariavelService.listar(),
    staleTime: 2 * 60 * 1000,
  });
}

function useInvalidar() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["renda-variavel"] });
    queryClient.invalidateQueries({ queryKey: ["contas"] });
    queryClient.invalidateQueries({ queryKey: ["extrato"] });
  };
}

export function useCriarOperacaoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CriarOperacaoRvDTO) => rendaVariavelService.criar(dados),
    onSuccess: (op) => {
      invalidar();
      toast({
        title: op.tipo === "compra" ? "Compra registrada!" : "Venda registrada!",
        description: op.movimentouConta
          ? "O valor foi lançado no saldo e no extrato da conta."
          : "Registrada sem alterar o saldo da conta.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar operação", description: error.message, variant: "destructive" });
    },
  });
}

export function useImportarOperacoesRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (operacoes: OperacaoParaImportar[]) => rendaVariavelService.importarOperacoes(operacoes),
    onSuccess: (r) => {
      invalidar();
      toast({
        title: r.inseridos > 0 ? "Operações importadas!" : "Nada novo para importar",
        description:
          `${r.inseridos} nova(s)` +
          (r.duplicados > 0 ? ` · ${r.duplicados} já existia(m)` : "") +
          (r.invalidos > 0 ? ` · ${r.invalidos} inválida(s)` : ""),
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao importar operações", description: error.message, variant: "destructive" });
    },
  });
}

export function useCriarEventoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CriarEventoDTO) => rendaVariavelService.criarEvento(dados),
    onSuccess: (r, vars) => {
      invalidar();
      toast({
        title: vars.tipo === "troca" ? "Ticker atualizado" : "Evento registrado",
        description:
          vars.tipo === "troca"
            ? `${r.operacoes ?? 0} operação(ões) movida(s) para ${vars.para}.`
            : `Posição: ${r.posicaoAntes} → ${r.posicaoDepois}. Preço médio recalculado.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar evento", description: error.message, variant: "destructive" });
    },
  });
}

export function useExcluirOperacaoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => rendaVariavelService.excluir(id),
    onSuccess: () => {
      invalidar();
      toast({ title: "Operação excluída", description: "Posição e preço médio foram recalculados." });
    },
    onError: (error: Error) => {
      toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * Busca cotações novas na brapi. `silencioso` = não mostra toast de sucesso
 * (usado na atualização automática ao abrir a aba).
 */
export function useAtualizarCotacoesRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ forcar }: { forcar: boolean; silencioso?: boolean }) =>
      rendaVariavelService.atualizarCotacoes(forcar),
    onSuccess: (r, vars) => {
      if (r.atualizados.length > 0) invalidar();

      if (r.interrompido === "sem-chave") {
        toast({
          title: "Cotação automática desativada",
          description: "Configure a variável BRAPI_API_KEY no servidor.",
          variant: "destructive",
        });
        return;
      }
      if (r.interrompido === "chave-invalida") {
        toast({ title: "Chave da brapi recusada", description: "Confira a BRAPI_API_KEY.", variant: "destructive" });
        return;
      }
      if (r.interrompido === "limite") {
        toast({
          title: "Limite da brapi atingido",
          description: "Tente de novo em alguns minutos (ou no próximo ciclo da cota).",
          variant: "destructive",
        });
        return;
      }
      if (r.falhas.length > 0) {
        toast({
          title: "Algumas cotações não foram atualizadas",
          description: r.falhas.map((f) => `${f.ticker}: ${f.motivo}`).join(" · "),
          variant: "destructive",
        });
        return;
      }
      if (!vars.silencioso) {
        toast({
          title: r.atualizados.length > 0 ? "Cotações atualizadas" : "Cotações já estão em dia",
          description:
            r.atualizados.length > 0
              ? `${r.atualizados.length} ativo(s) atualizado(s).`
              : "Atualizadas há pouco; tente de novo em alguns minutos.",
        });
      }
    },
    onError: (error: Error, vars) => {
      if (!vars.silencioso) {
        toast({ title: "Erro ao atualizar cotações", description: error.message, variant: "destructive" });
      }
    },
  });
}

export function useSalvarCotacaoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ ticker, preco }: { ticker: string; preco: number }) =>
      rendaVariavelService.salvarCotacao(ticker, preco),
    onSuccess: () => {
      invalidar();
      toast({ title: "Cotação atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar cotação", description: error.message, variant: "destructive" });
    },
  });
}

// ── Proventos ───────────────────────────────────────────────────────────────

export function useProventosRv() {
  return useQuery({
    queryKey: ["renda-variavel", "proventos"],
    queryFn: () => rendaVariavelService.listarProventos(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCriarProventoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CriarProventoRvDTO) => rendaVariavelService.criarProvento(dados),
    onSuccess: (p) => {
      invalidar();
      toast({
        title: "Provento registrado!",
        description: p.movimentouConta
          ? "O valor foi creditado na conta e lançado no extrato."
          : "Registrado sem alterar o saldo da conta.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar provento", description: error.message, variant: "destructive" });
    },
  });
}

export function useExcluirProventoRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => rendaVariavelService.excluirProvento(id),
    onSuccess: () => {
      invalidar();
      toast({ title: "Provento excluído" });
    },
    onError: (error: Error) => {
      toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" });
    },
  });
}

export function useImportarProventosRv() {
  const invalidar = useInvalidar();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: ImportarProventosDTO) => rendaVariavelService.importarProventos(dados),
    onSuccess: (r) => {
      invalidar();
      toast({
        title: r.inseridos > 0 ? "Proventos importados!" : "Nada novo para importar",
        description:
          `${r.inseridos} novo(s)` +
          (r.duplicados > 0 ? ` · ${r.duplicados} já existia(m)` : "") +
          (r.invalidos > 0 ? ` · ${r.invalidos} inválido(s)` : ""),
      });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao importar proventos", description: error.message, variant: "destructive" });
    },
  });
}

// ── Imposto de renda ────────────────────────────────────────────────────────

export function useIrRv() {
  return useQuery({
    queryKey: ["renda-variavel", "ir"],
    queryFn: () => rendaVariavelService.obterIr(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSalvarConfigIrRv() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (config: ConfigIr) => rendaVariavelService.salvarConfigIr(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renda-variavel", "ir"] });
      toast({ title: "Configuração de IR salva", description: "A apuração foi recalculada." });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar configuração", description: error.message, variant: "destructive" });
    },
  });
}

export function useMarcarDarfsRv() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ itens, pago }: { itens: { competencia: string; valor: number }[]; pago: boolean }) =>
      rendaVariavelService.marcarDarfs(itens, pago),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ["renda-variavel", "ir"] });
      toast({ title: vars.pago ? "DARF marcado como pago" : "DARF marcado como pendente" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar DARF", description: error.message, variant: "destructive" });
    },
  });
}