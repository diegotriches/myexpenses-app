// src/services/dashboardService.ts
import type {
  DashboardResumo,
  DashboardResponse,
  DadosGraficoMeses,
  ExtratoResponse,
  FiltrosExtrato,
  CondicoesPagamento,
  FormasPagamento,
  FaturasResumo,
  Recorrente,
  DespesasFuturas,
  ValoresPeriodoResponse,
  MaioresGastosResponse,
  TransacoesRecentesResponse,
} from "@/types/dashboard";

/**
 * Service para operações do Dashboard
 * ✅ Migrado para React Query (usado via hooks)
 */
class DashboardService {
  private baseURL = "/api/dashboard";

  /**
   * Busca resumo completo do dashboard (período + totais + cartões)
   */
  async buscarResumo(mes: number, ano: number): Promise<DashboardResponse> {
    const res = await fetch(`${this.baseURL}?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar resumo");
    }
    return res.json();
  }

  /**
   * Busca apenas totais (receitas/despesas/saldo)
   * Mais rápido que buscarResumo() quando não precisa de detalhes
   */
  async buscarResumoRapido(mes: number, ano: number): Promise<DashboardResumo> {
    const res = await fetch(`${this.baseURL}/resumo-rapido?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar resumo rápido");
    }
    return res.json();
  }

  /**
   * Busca dados do gráfico de meses (receitas/despesas ao longo do tempo)
   *
   * @param periodo - Número de meses como string (padrão: "6")
   */
  async buscarGraficoMeses(periodo: string = "6"): Promise<DadosGraficoMeses[]> {
    const res = await fetch(`${this.baseURL}/grafico-meses?periodo=${periodo}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar gráfico");
    }
    return res.json();
  }

  /**
   * Busca extrato consolidado com filtros
   *
   * @param filters - Filtros obrigatórios (ano, mes) e opcionais
   */
  async buscarExtrato(filters: FiltrosExtrato): Promise<ExtratoResponse> {
    const params = new URLSearchParams({
      ano: String(filters.ano),
      mes: String(filters.mes),
    });

    if (filters.contaId) params.append("contaId", filters.contaId);
    if (filters.tipo) params.append("tipo", filters.tipo);
    if (filters.origem) params.append("origem", filters.origem);
    if (filters.dataInicio) params.append("dataInicio", filters.dataInicio);
    if (filters.dataFim) params.append("dataFim", filters.dataFim);

    const res = await fetch(`${this.baseURL}/extrato?${params.toString()}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar extrato");
    }
    return res.json();
  }

  /**
   * Busca condições de pagamento (Dinheiro/PIX/Cartão)
   */
  async buscarCondicoesPagamento(mes: number, ano: number): Promise<CondicoesPagamento> {
    const res = await fetch(`${this.baseURL}/condicoes-pagamento?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar condições de pagamento");
    }
    return res.json();
  }

  /**
   * Busca formas de pagamento (À Vista/Parcelado/Recorrente)
   */
  async buscarFormasPagamento(mes: number, ano: number): Promise<FormasPagamento> {
    const res = await fetch(`${this.baseURL}/formas-pagamento?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar formas de pagamento");
    }
    return res.json();
  }

  /**
   * Busca resumo de faturas (total/pago/aberto)
   */
  async buscarFaturasResumo(mes: number, ano: number): Promise<FaturasResumo> {
    const res = await fetch(`${this.baseURL}/faturas-resumo?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar resumo de faturas");
    }
    return res.json();
  }

  /**
   * Busca transações recorrentes
   */
  async buscarRecorrentes(mes: number, ano: number): Promise<Recorrente[]> {
    const res = await fetch(`${this.baseURL}/recorrentes?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar recorrentes");
    }
    return res.json();
  }

  /**
   * Busca despesas futuras (transações de cartão em faturas posteriores)
   *
   * @param mes - Mês de referência (1-12)
   * @param ano - Ano de referência
   */
  async buscarDespesasFuturas(mes: number, ano: number): Promise<DespesasFuturas> {
    const res = await fetch(`${this.baseURL}/despesas-futuras?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar despesas futuras");
    }
    return res.json();
  }

  /**
   * ✅ NOVO: Busca valores do período (recebidos, a receber, a pagar)
   * Alimenta o CardValores
   */
  async buscarValoresPeriodo(mes: number, ano: number): Promise<ValoresPeriodoResponse> {
    const res = await fetch(`${this.baseURL}/valores-periodo?mes=${mes}&ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar valores do período");
    }
    return res.json();
  }

  /**
   * ✅ NOVO: Busca os maiores gastos do período
   * Alimenta o CardMaioresGastos
   *
   * @param limit - Número de gastos a retornar (padrão: 5, máximo: 20)
   */
  async buscarMaioresGastos(mes: number, ano: number, limit = 5): Promise<MaioresGastosResponse> {
    const res = await fetch(`${this.baseURL}/maiores-gastos?mes=${mes}&ano=${ano}&limit=${limit}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar maiores gastos");
    }
    return res.json();
  }

  /**
   * ✅ NOVO: Busca as transações mais recentes
   * Alimenta o CardTransacoesRecentes
   *
   * @param limit - Número de transações a retornar (padrão: 5, máximo: 50)
   */
  async buscarTransacoesRecentes(limit = 5): Promise<TransacoesRecentesResponse> {
    const res = await fetch(`${this.baseURL}/transacoes-recentes?limit=${limit}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar transações recentes");
    }
    return res.json();
  }
}

export const dashboardService = new DashboardService();