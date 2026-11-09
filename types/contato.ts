export type StatusContato = "pendente" | "em_andamento" | "resolvido" | "arquivado";

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
