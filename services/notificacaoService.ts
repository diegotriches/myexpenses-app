// src/services/notificacaoService.ts

import type { 
  Notificacao, 
  CriarNotificacaoDTO, 
  NotificacoesResponse,
  PreferenciasNotificacao 
} from "@/types/notificacao";

const API_URL = "/api/notificacoes";

// ==================== HELPER ====================

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(error.error || error.message || "Erro na requisição");
  }
  return res.json();
}

// ==================== SERVICE ====================

export const notificacaoService = {
  /**
   * Lista notificações do usuário
   * GET /api/notificacoes?lidas=false&limite=10
   */
  async listar(lidas?: boolean, limite?: number): Promise<NotificacoesResponse> {
    const params = new URLSearchParams();
    if (lidas !== undefined) params.append("lidas", String(lidas));
    if (limite) params.append("limite", String(limite));

    const url = params.toString() ? `${API_URL}?${params}` : API_URL;
    const res = await fetch(url);
    return handleResponse<NotificacoesResponse>(res);
  },

  /**
   * Cria nova notificação (usado internamente pela API)
   * POST /api/notificacoes
   */
  async criar(dados: CriarNotificacaoDTO): Promise<Notificacao> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    return handleResponse<Notificacao>(res);
  },

  /**
   * Marca notificação como lida
   * PUT /api/notificacoes/[id]/lida
   */
  async marcarComoLida(id: string): Promise<Notificacao> {
    const res = await fetch(`${API_URL}/${id}/lida`, {
      method: "PUT",
    });
    return handleResponse<Notificacao>(res);
  },

  /**
   * Marca todas as notificações como lidas
   * PUT /api/notificacoes/marcar-todas-lidas
   */
  async marcarTodasComoLidas(): Promise<{ message: string; count: number }> {
    const res = await fetch(`${API_URL}/marcar-todas-lidas`, {
      method: "PUT",
    });
    return handleResponse<{ message: string; count: number }>(res);
  },

  // ==================== PREFERÊNCIAS ====================

  /**
   * Busca preferências de notificação do usuário
   * GET /api/notificacoes/preferencias
   */
  async buscarPreferencias(): Promise<PreferenciasNotificacao> {
    const res = await fetch(`${API_URL}/preferencias`);
    return handleResponse<PreferenciasNotificacao>(res);
  },

  /**
   * Atualiza preferências de notificação
   * PUT /api/notificacoes/preferencias
   */
  async atualizarPreferencias(dados: Partial<PreferenciasNotificacao>): Promise<PreferenciasNotificacao> {
    const res = await fetch(`${API_URL}/preferencias`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    return handleResponse<PreferenciasNotificacao>(res);
  },

  // ==================== VERIFICAÇÃO ====================

  /**
   * Verifica e cria notificações automáticas
   * POST /api/notificacoes/verificar
   */
  async verificarNotificacoes(): Promise<{ message: string; criadas: number }> {
    const res = await fetch(`${API_URL}/verificar`, {
      method: "POST",
    });
    return handleResponse<{ message: string; criadas: number }>(res);
  },
};

// ==================== TIPOS EXPORTADOS ====================

export type {
  Notificacao,
  CriarNotificacaoDTO,
  NotificacoesResponse,
  PreferenciasNotificacao,
  TipoNotificacao,
  SeveridadeNotificacao,
} from "@/types/notificacao";