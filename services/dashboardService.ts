// src/services/dashboardService.ts
import type {
  DashboardResponse,
  DadosGraficoMeses,
  CondicoesPagamento,
  FormasPagamento,
  Recorrente,
  DespesasFuturas,
  ValoresPeriodoResponse,
  MaioresGastosResponse,
  TransacoesRecentesResponse,
} from "@/types/dashboard";

/**
 * Service para operações do Dashboard
 * Migrado para React Query (usado via hooks)
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
   * Busca dados do gráfico de meses (receitas/despesas ao longo do ano)
   *
   * @param ano - Ano do gráfico (janeiro até o mês atual no ano vigente)
   */
  async buscarGraficoMeses(ano: number): Promise<DadosGraficoMeses[]> {
    const res = await fetch(`${this.baseURL}/grafico-meses?ano=${ano}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar gráfico");
    }
    return res.json();
  }

  /**
   * Busca condições de pagamento (Dinheiro/PIX/Cartão) — no ano
   */
  async buscarCondicoesPagamento(
    ano: number,
  ): Promise<CondicoesPagamento> {
    const res = await fetch(
      `${this.baseURL}/condicoes-pagamento?ano=${ano}`,
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar condições de pagamento");
    }
    return res.json();
  }

  /**
   * Busca formas de pagamento (À Vista/Parcelado/Recorrente)
   */
  async buscarFormasPagamento(ano: number): Promise<FormasPagamento> {
    const res = await fetch(
      `${this.baseURL}/formas-pagamento?ano=${ano}`,
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar formas de pagamento");
    }
    return res.json();
  }

  /**
   * Busca transações recorrentes
   */
  async buscarRecorrentes(ano: number): Promise<Recorrente[]> {
    const res = await fetch(
      `${this.baseURL}/recorrentes?ano=${ano}`,
    );
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
  async buscarDespesasFuturas(
    mes: number,
    ano: number,
  ): Promise<DespesasFuturas> {
    const res = await fetch(
      `${this.baseURL}/despesas-futuras?mes=${mes}&ano=${ano}`,
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar despesas futuras");
    }
    return res.json();
  }

  /**
   * Busca valores do período (recebidos, a receber, a pagar)
   * Alimenta o CardValores
   */
  async buscarValoresPeriodo(
    ano: number,
  ): Promise<ValoresPeriodoResponse> {
    const res = await fetch(
      `${this.baseURL}/valores-periodo?ano=${ano}`,
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar valores do período");
    }
    return res.json();
  }

  /**
   * Busca os maiores gastos do período
   * Alimenta o CardMaioresGastos
   *
   * @param limit - Número de gastos a retornar (padrão: 5, máximo: 20)
   */
  async buscarMaioresGastos(
    ano: number,
    limit = 5,
  ): Promise<MaioresGastosResponse> {
    const res = await fetch(
      `${this.baseURL}/maiores-gastos?ano=${ano}&limit=${limit}`,
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar maiores gastos");
    }
    return res.json();
  }

  /**
   * Busca as transações mais recentes
   * Alimenta o CardTransacoesRecentes
   *
   * @param limit - Número de transações a retornar (padrão: 5, máximo: 50)
   */
  async buscarTransacoesRecentes(
    limit = 5,
  ): Promise<TransacoesRecentesResponse> {
    const res = await fetch(
      `${this.baseURL}/transacoes-recentes?limit=${limit}`,
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Erro ao buscar transações recentes");
    }
    return res.json();
  }
}

export const dashboardService = new DashboardService();