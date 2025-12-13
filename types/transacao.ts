export interface Transacao {
    id: number;
    data: string;
    descricao: string;
    valor: number;
    tipo: "entrada" | "saida";
    categoria: string;
    formaPagamento: "dinheiro" | "pix" | "cartao";
    cartaoId?: number | null;

    recorrente?: boolean;
    repeticoes?: number;
    parcelado?: boolean;
    parcelas?: number;

    parcelamentoId?: string;
    parcelaAtual?: number;
    totalParcelas?: number;
    recorrenciaId?: string;
}