"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Nota, CreateNotaDTO, UpdateNotaDTO } from "@/types/nota";

const QUERY_KEY = ["notas"] as const;

// ── Listar ────────────────────────────────────────────────────────────────────
export function useNotas() {
  return useQuery<Nota[]>({
    queryKey: QUERY_KEY,
    queryFn:  async () => {
      const res = await fetch("/api/notas");
      if (!res.ok) throw new Error("Erro ao buscar notas");
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ── Criar ─────────────────────────────────────────────────────────────────────
export function useCriarNota() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: async (dados: CreateNotaDTO): Promise<Nota> => {
      const res = await fetch("/api/notas", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(dados),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao criar nota" }));
        throw new Error(err.error || "Erro ao criar nota");
      }
      return res.json();
    },
    onSuccess: (nova) => {
      // Atualização otimista: insere no topo da lista sem refetch
      queryClient.setQueryData<Nota[]>(QUERY_KEY, (prev = []) => [nova, ...prev]);
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar nota", description: error.message, variant: "destructive" });
    },
  });
}

// ── Atualizar ─────────────────────────────────────────────────────────────────
export function useAtualizarNota() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: UpdateNotaDTO }): Promise<Nota> => {
      const res = await fetch(`/api/notas/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(dados),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao atualizar nota" }));
        throw new Error(err.error || "Erro ao atualizar nota");
      }
      return res.json();
    },
    onSuccess: (atualizada) => {
      // Atualização otimista: substitui no cache sem refetch
      queryClient.setQueryData<Nota[]>(QUERY_KEY, (prev = []) =>
        prev.map((n) => (n.id === atualizada.id ? atualizada : n))
      );
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar nota", description: error.message, variant: "destructive" });
      // Rollback: invalida para buscar estado real
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

// ── Excluir ───────────────────────────────────────────────────────────────────
export function useExcluirNota() {
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/notas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Erro ao excluir nota" }));
        throw new Error(err.error || "Erro ao excluir nota");
      }
    },
    onSuccess: (_, id) => {
      // Atualização otimista: remove do cache imediatamente
      queryClient.setQueryData<Nota[]>(QUERY_KEY, (prev = []) =>
        prev.filter((n) => n.id !== id)
      );
      toast({ title: "Nota excluída!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir nota", description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}