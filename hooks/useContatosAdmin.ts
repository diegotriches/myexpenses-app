"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contatoService } from "@/services/contatoService";
import { ErroApi } from "@/services/http";
import type { FiltrosContatosAdmin, StatusContato } from "@/types/contato";

export function useContatosAdmin(filtros: FiltrosContatosAdmin) {
  return useQuery({
    queryKey: ["admin-contatos", filtros.status, filtros.assunto, filtros.busca],
    queryFn: () => contatoService.listarAdmin(filtros),
    // Acesso negado não melhora tentando de novo
    retry: (falhas, erro) => !(erro instanceof ErroApi && erro.status === 403) && falhas < 2,
  });
}

export function useAtualizarContatoAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }: { id: string; status?: StatusContato; lido?: boolean }) =>
      contatoService.atualizarAdmin(id, dados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-contatos"] }),
  });
}

export function useExcluirContatoAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contatoService.excluirAdmin(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-contatos"] }),
  });
}
