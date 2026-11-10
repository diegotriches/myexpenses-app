export const STATUS_CONTATO = ["pendente", "em_andamento", "resolvido", "arquivado"] as const;
export type StatusContato = (typeof STATUS_CONTATO)[number];

export const ehStatusContato = (v: unknown): v is StatusContato =>
  typeof v === "string" && (STATUS_CONTATO as readonly string[]).includes(v);

export interface NovoContatoDTO {
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
}

export interface Contato extends NovoContatoDTO {
  id: string;
  status: StatusContato;
  lido: boolean;
  createdAt: string;
  userId?: string;
}

export interface EstatisticasContatos {
  pendentes: number;
  emAndamento: number;
  resolvidos: number;
  arquivados: number;
  naoLidos: number;
}

export interface FiltrosContatosAdmin {
  status: string;
  assunto: string;
  busca: string;
}

export interface ContatosAdminResponse {
  contatos: Contato[];
  estatisticas: EstatisticasContatos;
}
