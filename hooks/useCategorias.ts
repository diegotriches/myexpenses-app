// src/hooks/useCategorias.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoriaService } from "@/services/categoriaService";
import { useToast } from "@/hooks/use-toast";

import type { Categoria, CriarCategoriaDTO, AtualizarCategoriaDTO } from "@/types/categoria";

/**
 * Query Keys para categorias
 */
export const categoriasKeys = {
  all: ["categorias"] as const,
  byId: (id: string) => ["categorias", id] as const,
  byTipo: (tipo: "entrada" | "saida") => ["categorias", "tipo", tipo] as const,
};

/**
 * Hook para listar todas as categorias (com cache)
 */
export function useCategorias() {
  return useQuery({
    queryKey: categoriasKeys.all,
    queryFn: () => categoriaService.listar(),
    // Dados de categorias mudam raramente, cache por 10 minutos
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para listar categorias por tipo (com cache)
 */
export function useCategoriasPorTipo(tipo: "entrada" | "saida") {
  return useQuery({
    queryKey: categoriasKeys.byTipo(tipo),
    queryFn: () => categoriaService.listarPorTipo(tipo),
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook para buscar categoria por ID (com cache)
 */
export function useCategoria(id: string) {
  return useQuery({
    queryKey: categoriasKeys.byId(id),
    queryFn: () => categoriaService.buscarPorId(id),
    enabled: !!id, // Só executa se ID existir
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Opções para controlar toast nas mutations
 */
interface MutationOptions {
  showToast?: boolean; // Padrão: true
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook para criar categoria
 */
export function useCriarCategoria(options: MutationOptions = {}) {
  const { showToast = true, successMessage, errorMessage } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dados: CriarCategoriaDTO) => categoriaService.criar(dados),
    onSuccess: (data) => {
      // Invalida cache de categorias
      queryClient.invalidateQueries({ queryKey: categoriasKeys.all });
      
      if (showToast) {
        toast({
          title: "Categoria criada!",
          description: successMessage || "A categoria foi criada com sucesso.",
        });
      }
    },
    onError: (error: Error) => {
      if (showToast) {
        toast({
          title: "Erro ao criar categoria",
          description: errorMessage || error.message,
          variant: "destructive",
        });
      }
    },
  });
}

/**
 * Hook para atualizar categoria
 */
export function useAtualizarCategoria(options: MutationOptions = {}) {
  const { showToast = true, successMessage, errorMessage } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: AtualizarCategoriaDTO }) =>
      categoriaService.atualizar(id, dados),
    onSuccess: (_, variables) => {
      // Invalida categoria específica e lista
      queryClient.invalidateQueries({ queryKey: categoriasKeys.byId(variables.id) });
      queryClient.invalidateQueries({ queryKey: categoriasKeys.all });
      
      if (showToast) {
        toast({
          title: "Categoria atualizada!",
          description: successMessage || "As alterações foram salvas.",
        });
      }
    },
    onError: (error: Error) => {
      if (showToast) {
        toast({
          title: "Erro ao atualizar categoria",
          description: errorMessage || error.message,
          variant: "destructive",
        });
      }
    },
  });
}

/**
 * Hook para remover categoria
 */
export function useRemoverCategoria(options: MutationOptions = {}) {
  const { showToast = true, successMessage, errorMessage } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => categoriaService.remover(id),
    onSuccess: () => {
      // Invalida cache de categorias
      queryClient.invalidateQueries({ queryKey: categoriasKeys.all });
      
      if (showToast) {
        toast({
          title: "Categoria removida!",
          description: successMessage || "A categoria foi removida com sucesso.",
        });
      }
    },
    onError: (error: Error) => {
      if (showToast) {
        toast({
          title: "Erro ao remover categoria",
          description: errorMessage || error.message,
          variant: "destructive",
        });
      }
    },
  });
}

/**
 * Hook auxiliar para pré-carregar categoria (útil para hover/prefetch)
 */
export function usePrefetchCategoria() {
  const queryClient = useQueryClient();
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: categoriasKeys.byId(id),
      queryFn: () => categoriaService.buscarPorId(id),
      staleTime: 10 * 60 * 1000,
    });
  };
}