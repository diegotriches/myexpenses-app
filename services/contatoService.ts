import { comJson, requisicao } from "@/services/http";
import type { Contato, ContatosAdminResponse, FiltrosContatosAdmin, NovoContatoDTO, StatusContato } from "@/types/contato";

export const contatoService = {
  enviar(dados: NovoContatoDTO) {
    return requisicao<{ message?: string }>("/api/contato", comJson("POST", dados), "Erro ao enviar mensagem");
  },

  // ── Administração ──
  listarAdmin({ status, assunto, busca }: FiltrosContatosAdmin) {
    const params = new URLSearchParams({ status, assunto, ...(busca && { busca }) });
    return requisicao<ContatosAdminResponse>(`/api/admin/contatos?${params}`, undefined, "Erro ao carregar contatos");
  },

  atualizarAdmin(id: string, dados: { status?: StatusContato; lido?: boolean }) {
    return requisicao<Contato>(`/api/admin/contatos/${id}`, comJson("PATCH", dados), "Erro ao atualizar contato");
  },

  excluirAdmin(id: string) {
    return requisicao<{ message?: string }>(`/api/admin/contatos/${id}`, { method: "DELETE" }, "Erro ao excluir contato");
  },
};
