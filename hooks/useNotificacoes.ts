// src/hooks/useNotificacoes.ts

import { useState, useCallback, useEffect } from "react";
import { notificacaoService } from "@/services/notificacaoService";
import type { Notificacao, NotificacoesResponse, PreferenciasNotificacao } from "@/types/notificacao";

export function useNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega notificações do usuário
   */
  const carregar = useCallback(async (lidas?: boolean, limite?: number) => {
    setLoading(true);
    setError(null);
    try {
      const data: NotificacoesResponse = await notificacaoService.listar(lidas, limite);
      setNotificacoes(data.notificacoes);
      setNaoLidas(data.naoLidas);
    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Marca notificação como lida
   */
  const marcarComoLida = useCallback(async (id: string) => {
    setError(null);
    try {
      await notificacaoService.marcarComoLida(id);
      // Atualiza localmente
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
      setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Marca todas como lidas
   */
  const marcarTodasComoLidas = useCallback(async () => {
    setError(null);
    try {
      await notificacaoService.marcarTodasComoLidas();
      // Atualiza localmente
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Remove notificação
   */
  const remover = useCallback(async (id: string) => {
    setError(null);
    try {
      await notificacaoService.remover(id);
      // Remove localmente
      setNotificacoes((prev) => prev.filter((n) => n.id !== id));
      // Atualiza contador se não estava lida
      const notif = notificacoes.find((n) => n.id === id);
      if (notif && !notif.lida) {
        setNaoLidas((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [notificacoes]);

  /**
   * Limpa todas as notificações lidas
   */
  const limparLidas = useCallback(async () => {
    setError(null);
    try {
      await notificacaoService.limparLidas();
      // Remove localmente
      setNotificacoes((prev) => prev.filter((n) => !n.lida));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Verifica e cria notificações automáticas
   */
  const verificarNotificacoes = useCallback(async () => {
    setError(null);
    try {
      await notificacaoService.verificarNotificacoes();
      // Recarrega notificações após verificação
      await carregar();
    } catch (err: any) {
      setError(err.message);
      console.error("Erro ao verificar notificações:", err);
    }
  }, [carregar]);

  // Carrega notificações ao montar
  useEffect(() => {
    carregar();
  }, [carregar]);

  // Poll de notificações a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      carregar();
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [carregar]);

  return {
    notificacoes,
    naoLidas,
    loading,
    error,
    carregar,
    marcarComoLida,
    marcarTodasComoLidas,
    remover,
    limparLidas,
    verificarNotificacoes,
  };
}

/**
 * Hook para gerenciar preferências de notificação
 */
export function usePreferenciasNotificacao() {
  const [preferencias, setPreferencias] = useState<PreferenciasNotificacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificacaoService.buscarPreferencias();
      setPreferencias(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const atualizar = useCallback(async (dados: Partial<PreferenciasNotificacao>) => {
    setError(null);
    try {
      const updated = await notificacaoService.atualizarPreferencias(dados);
      setPreferencias(updated);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    preferencias,
    loading,
    error,
    carregar,
    atualizar,
  };
}