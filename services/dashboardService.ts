export const dashboardService = {
  /**
   * Busca resumo do dashboard para um mês/ano
   */
  async buscarResumo(mes: number, ano: number) {
    const res = await fetch(`/api/dashboard?mes=${mes}&ano=${ano}`);
    if (!res.ok) throw new Error("Erro ao buscar resumo");
    return res.json();
  },

  /**
   * Busca dados do gráfico de meses
   */
  async buscarGraficoMeses(periodo?: string) {
    const searchParams = new URLSearchParams();
    if (periodo) searchParams.set("periodo", periodo);

    const res = await fetch(`/api/dashboard/grafico-meses?${searchParams}`);
    if (!res.ok) throw new Error("Erro ao buscar gráfico");
    return res.json();
  },

  /**
   * Busca extrato geral (consolidado de todas as contas)
   */
  async buscarExtrato(params: {
    ano: number;
    mes: number;
    contaId?: string;
    origem?: string;
    tipo?: string;
    dataInicio?: string;
    dataFim?: string;
  }) {
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
    if (!res.ok) throw new Error("Erro ao buscar extrato");
    return res.json();
  },
};