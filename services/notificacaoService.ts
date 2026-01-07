// src/services/notificacaoService.ts

import type { 
  Notificacao, 
  CriarNotificacaoDTO, 
  NotificacoesResponse,
  PreferenciasNotificacao 
} from "@/types/notificacao";

const API_URL = "/api/notificacoes";

export const notificacaoService = {
  /**
   * Lista notificações do usuário
   * @param lidas - Filtrar por status (true/false/undefined para todas)
   * @param limite - Número máximo de notificações
   */
  async listar(lidas?: boolean, limite?: number): Promise<NotificacoesResponse> {
    const params = new URLSearchParams();
    if (lidas !== undefined) params.append("lidas", String(lidas));
    if (limite) params.append("limite", String(limite));

    const url = params.toString() ? `${API_URL}?${params}` : API_URL;
    const res = await fetch(url);
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao listar notificações");
    }
    
    return res.json();
  },

  /**
   * Busca notificação por ID
   */
  async buscarPorId(id: string): Promise<Notificacao> {
    const res = await fetch(`${API_URL}/${id}`);
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar notificação");
    }
    
    return res.json();
  },

  /**
   * Cria nova notificação (usado internamente pela API)
   */
  async criar(dados: CriarNotificacaoDTO): Promise<Notificacao> {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao criar notificação");
    }
    
    return res.json();
  },

  /**
   * Marca notificação como lida
   */
  async marcarComoLida(id: string): Promise<Notificacao> {
    const res = await fetch(`${API_URL}/${id}/lida`, {
      method: "PUT",
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao marcar como lida");
    }
    
    return res.json();
  },

  /**
   * Marca todas as notificações como lidas
   */
  async marcarTodasComoLidas(): Promise<{ message: string; count: number }> {
    const res = await fetch(`${API_URL}/marcar-todas-lidas`, {
      method: "PUT",
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao marcar todas como lidas");
    }
    
    return res.json();
  },

  /**
   * Remove notificação
   */
  async remover(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao remover notificação");
    }
    
    return res.json();
  },

  /**
   * Remove todas as notificações lidas
   */
  async limparLidas(): Promise<{ message: string; count: number }> {
    const res = await fetch(`${API_URL}/limpar-lidas`, {
      method: "DELETE",
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao limpar notificações");
    }
    
    return res.json();
  },

  // ==================== PREFERÊNCIAS ====================

  /**
   * Busca preferências de notificação do usuário
   */
  async buscarPreferencias(): Promise<PreferenciasNotificacao> {
    const res = await fetch(`${API_URL}/preferencias`);
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar preferências");
    }
    
    return res.json();
  },

  /**
   * Atualiza preferências de notificação
   */
  async atualizarPreferencias(dados: Partial<PreferenciasNotificacao>): Promise<PreferenciasNotificacao> {
    const res = await fetch(`${API_URL}/preferencias`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao atualizar preferências");
    }
    
    return res.json();
  },

  // ==================== VERIFICAÇÃO (Cron Job) ====================

  /**
   * Verifica e cria notificações automáticas
   * Chamado por cron job ou manualmente
   */
  async verificarNotificacoes(): Promise<{ message: string; criadas: number }> {
    const res = await fetch(`${API_URL}/verificar`, {
      method: "POST",
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao verificar notificações");
    }
    
    return res.json();
  },
};