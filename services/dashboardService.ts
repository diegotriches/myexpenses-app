// src/services/dashboardService.ts

import type {
  DashboardResponse,
  DadosGraficoMeses,
  ExtratoResponse,
  FiltrosExtrato,
  DashboardResumo,
  CondicoesPagamento,
  FormasPagamento,
  DashboardFaturas,
} from "@/types/dashboard";
import type { Transacao } from "@/types/transacao";

export const dashboardService = {
  /**
   * Busca resumo completo do dashboard para um mês/ano específico
   * Inclui: período, resumo financeiro, cartões com faturas
   * 
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2026)
   * @returns DashboardResponse completo
   * 
   * @example
   * const dashboard = await dashboardService.buscarResumo(1, 2026);
   * console.log(dashboard.resumo);  // { receitas, despesas, saldo }
   * console.log(dashboard.cartoes); // [{ cartaoId, nome, totalFatura, paga }]
   */
  async buscarResumo(mes: number, ano: number): Promise<DashboardResponse> {
    const res = await fetch(`/api/dashboard?mes=${mes}&ano=${ano}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar resumo do dashboard" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar resumo do dashboard"
      );
    }
    
    return res.json();
  },

  /**
   * Busca dados do gráfico de meses (últimos N meses)
   * 
   * @param periodo - Número de meses como string (opcional, padrão: "6")
   * @returns Array com dados de receitas/despesas/balanço por mês
   * 
   * @example
   * // Últimos 6 meses (padrão)
   * const grafico6m = await dashboardService.buscarGraficoMeses();
   * 
   * // Últimos 12 meses
   * const grafico12m = await dashboardService.buscarGraficoMeses("12");
   * 
   * // Estrutura do retorno:
   * // [{ mes: "2026-01", receitas: 1000, despesas: 500, balanco: 500 }]
   */
  async buscarGraficoMeses(periodo?: string): Promise<DadosGraficoMeses[]> {
    const searchParams = new URLSearchParams();
    if (periodo) searchParams.set("periodo", periodo);

    const res = await fetch(`/api/dashboard/grafico-meses?${searchParams}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar dados do gráfico" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar dados do gráfico"
      );
    }
    
    return res.json();
  },

  /**
   * Busca extrato consolidado de todas as contas
   * 
   * @param params - Filtros para o extrato (ano e mes obrigatórios)
   * @returns Movimentações e resumo do extrato
   * 
   * @example
   * const extrato = await dashboardService.buscarExtrato({
   *   ano: 2026,
   *   mes: 1,
   *   contaId: "123",      // Opcional: filtrar por conta
   *   tipo: "entrada",     // Opcional: "entrada" ou "saida"
   *   origem: "TRANSACAO_MANUAL" // Opcional
   * });
   * 
   * console.log(extrato.movimentacoes); // Array de movimentações
   * console.log(extrato.resumo);        // { saldoInicial, totalEntradas, ... }
   */
  async buscarExtrato(params: FiltrosExtrato): Promise<ExtratoResponse> {
    const searchParams = new URLSearchParams({
      ano: params.ano.toString(),
      mes: params.mes.toString(),
    });

    if (params.contaId) searchParams.set("contaId", params.contaId);
    if (params.origem) searchParams.set("origem", params.origem);
    if (params.tipo) searchParams.set("tipo", params.tipo);
    if (params.dataInicio) searchParams.set("dataInicio", params.dataInicio);
    if (params.dataFim) searchParams.set("dataFim", params.dataFim);

    const res = await fetch(`/api/extrato?${searchParams}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar extrato" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar extrato"
      );
    }
    
    return res.json();
  },

  /**
   * Busca resumo financeiro rápido (sem detalhes de cartões)
   * Mais leve que buscarResumo() - use quando não precisar de info de cartões
   * 
   * @param mes - Mês (1-12)
   * @param ano - Ano
   * @returns Apenas resumo financeiro { receitas, despesas, saldo }
   * 
   * @example
   * const resumo = await dashboardService.buscarResumoRapido(1, 2026);
   * console.log(resumo); // { receitas: 1000, despesas: 500, saldo: 500 }
   */
  async buscarResumoRapido(mes: number, ano: number): Promise<DashboardResumo> {
    const res = await fetch(`/api/dashboard/resumo?mes=${mes}&ano=${ano}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar resumo rápido" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar resumo rápido"
      );
    }
    
    return res.json();
  },

  /**
   * Busca contagem de transações por condição de pagamento
   * (Dinheiro, PIX, Cartão)
   * 
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2026)
   * @returns Contagem por forma de pagamento
   * 
   * @example
   * const condicoes = await dashboardService.buscarCondicoesPagamento(1, 2026);
   * console.log(condicoes); // { dinheiro: 10, pix: 15, cartao: 25 }
   */
  async buscarCondicoesPagamento(mes: number, ano: number): Promise<CondicoesPagamento> {
    const res = await fetch(`/api/dashboard/condicoes-pagamento?mes=${mes}&ano=${ano}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar condições de pagamento" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar condições de pagamento"
      );
    }
    
    return res.json();
  },

  /**
   * Busca contagem de transações por forma de pagamento
   * (À vista, Parcelado, Recorrente)
   * 
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2026)
   * @returns Contagem por tipo de pagamento
   * 
   * @example
   * const formas = await dashboardService.buscarFormasPagamento(1, 2026);
   * console.log(formas); // { aVista: 20, parcelado: 10, recorrente: 5 }
   */
  async buscarFormasPagamento(mes: number, ano: number): Promise<FormasPagamento> {
    const res = await fetch(`/api/dashboard/formas-pagamento?mes=${mes}&ano=${ano}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar formas de pagamento" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar formas de pagamento"
      );
    }
    
    return res.json();
  },

  /**
   * Busca resumo de faturas de cartão
   * (Total de faturas, total pago, total em aberto)
   * 
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2026)
   * @returns Resumo financeiro de faturas
   * 
   * @example
   * const faturas = await dashboardService.buscarFaturasResumo(1, 2026);
   * console.log(faturas); 
   * // { totalFaturas: 5000, totalPago: 3000, totalAberto: 2000 }
   */
  async buscarFaturasResumo(mes: number, ano: number): Promise<DashboardFaturas> {
    const res = await fetch(`/api/dashboard/faturas-resumo?mes=${mes}&ano=${ano}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar resumo de faturas" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar resumo de faturas"
      );
    }
    
    return res.json();
  },

  /**
   * Busca transações recorrentes ativas do período
   * 
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2026)
   * @returns Array de transações recorrentes
   * 
   * @example
   * const recorrentes = await dashboardService.buscarRecorrentes(1, 2026);
   * console.log(recorrentes);
   * // [{ id, descricao, valor, categoria, tipo, recorrente: true }]
   */
  async buscarRecorrentes(mes: number, ano: number): Promise<Transacao[]> {
    const res = await fetch(`/api/dashboard/recorrentes?mes=${mes}&ano=${ano}`);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ 
        error: "Erro ao buscar transações recorrentes" 
      }));
      throw new Error(
        error.error || error.message || "Erro ao buscar transações recorrentes"
      );
    }
    
    return res.json();
  },
};