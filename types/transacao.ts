export interface Transacao {
    id: number;

    data: string;
    tipo: "entrada" | "saida";
    descricao: string;
    valor: number;

    categoria: string;

    formaPagamento: "dinheiro" | "pix" | "cartao";

    cartaoId?: number | null;

    recorrente?: boolean;
    recorrenciaId?: string;
    repeticoes?: number;
    
    parcelado?: boolean;
    parcelamentoId?: string;
    parcelas?: number;
    parcelaAtual?: number;
}