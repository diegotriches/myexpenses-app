// src/lib/queryKeys.ts

/**
 * Chaves centralizadas para cache do React Query
 * Mantém consistência e facilita invalidação
 */
export const queryKeys = {
  // Contas
  contas: {
    all: ["contas"] as const,
    byId: (id: string) => ["contas", id] as const,
    extrato: (id: string, filters?: any) => 
      ["contas", id, "extrato", filters] as const,
  },

  // Cartões
  cartoes: {
    all: ["cartoes"] as const,
    byId: (id: number) => ["cartoes", id] as const,
    fatura: (id: number, ano: number, mes: number) => 
      ["cartoes", id, "fatura", ano, mes] as const,
  },

  // Transações
  transacoes: {
    all: ["transacoes"] as const,
    filtered: (filters?: any) => ["transacoes", "filtered", filters] as const,
    byId: (id: string) => ["transacoes", id] as const,
  },

  // Categorias
  categorias: {
    all: ["categorias"] as const,
    byId: (id: string) => ["categorias", id] as const,
    byTipo: (tipo: string) => ["categorias", "tipo", tipo] as const,
  },

  // Notificações
  notificacoes: {
    all: ["notificacoes"] as const,
    filtered: (lidas?: boolean) => ["notificacoes", "filtered", lidas] as const,
    preferencias: ["notificacoes", "preferencias"] as const,
  },

  // Dashboard
  dashboard: {
    resumo: (mes: number, ano: number) => ["dashboard", "resumo", mes, ano] as const,
    grafico: (periodo?: number) => ["dashboard", "grafico", periodo] as const,
    extrato: (filters?: any) => ["dashboard", "extrato", filters] as const,
  },

  // Transferências
  transferencias: {
    all: ["transferencias"] as const,
    filtered: (filters?: any) => ["transferencias", "filtered", filters] as const,
    byId: (id: string) => ["transferencias", id] as const,
  },

  // Usuário
  user: {
    profile: ["user", "profile"] as const,
    preferences: ["user", "preferences"] as const,
  },
} as const;

/**
 * Helpers para invalidar cache
 */
export const invalidateKeys = {
  // Invalida todas as queries de contas
  allContas: () => queryKeys.contas.all,
  
  // Invalida conta específica e seu extrato
  conta: (id: string) => [
    queryKeys.contas.byId(id),
    queryKeys.contas.extrato(id),
  ],
  
  // Invalida todos os cartões
  allCartoes: () => queryKeys.cartoes.all,
  
  // Invalida cartão específico e suas faturas
  cartao: (id: number) => [
    queryKeys.cartoes.byId(id),
    // Invalida todas as faturas deste cartão
    ["cartoes", id, "fatura"],
  ],
  
  // Invalida transações e dashboard
  transacoesEDashboard: (mes: number, ano: number) => [
    queryKeys.transacoes.all,
    queryKeys.dashboard.resumo(mes, ano),
    queryKeys.dashboard.grafico(),
  ],
};