import { Conta } from "@/types/conta";

export const contaService = {
  /**
   * Lista todas as contas do usuário autenticado
   */
  async listar(): Promise<Conta[]> {
    const res = await fetch("/api/contas");
    if (!res.ok) throw new Error("Erro ao listar contas");
    return res.json();
  },

  /**
   * Busca uma conta específica por ID
   */
  async buscarPorId(id: string): Promise<Conta> {
    const res = await fetch(`/api/contas/${id}`);
    if (!res.ok) throw new Error("Conta não encontrada");
    return res.json();
  },

  /**
   * Cria uma nova conta
   */
  async criar(dados: Omit<Conta, "id" | "createdAt" | "updatedAt">): Promise<Conta> {
    const res = await fetch("/api/contas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error("Erro ao criar conta");
    return res.json();
  },

  /**
   * Atualiza uma conta existente
   */
  async atualizar(id: string, dados: Partial<Conta>): Promise<Conta> {
    const res = await fetch(`/api/contas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    if (!res.ok) throw new Error("Erro ao atualizar conta");
    return res.json();
  },

  /**
   * Remove uma conta
   */
  async remover(id: string): Promise<void> {
    const res = await fetch(`/api/contas/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Erro ao remover conta");
  },

  /**
   * Busca o extrato de uma conta em um período
   */
  async buscarExtrato(
    contaId: string,
    params?: {
      inicio?: string;
      fim?: string;
      origem?: string;
      tipo?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const searchParams = new URLSearchParams();
    if (params?.inicio) searchParams.set("inicio", params.inicio);
    if (params?.fim) searchParams.set("fim", params.fim);
    if (params?.origem) searchParams.set("origem", params.origem);
    if (params?.tipo) searchParams.set("tipo", params.tipo);
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());

    const res = await fetch(`/api/contas/${contaId}/extrato?${searchParams}`);
    if (!res.ok) throw new Error("Erro ao buscar extrato");
    return res.json();
  },

  /**
   * Ajusta o saldo de uma conta manualmente
   */
  async ajustarSaldo(contaId: string, valor: number, descricao?: string) {
    const res = await fetch(`/api/contas/${contaId}/ajustar-saldo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ valor, descricao }),
    });
    if (!res.ok) throw new Error("Erro ao ajustar saldo");
    return res.json();
  },
};