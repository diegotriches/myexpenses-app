export interface Transacao {
    id: number;
    data: string;
    descricao: string;
    valor: number;
    tipo: "entrada" | "saida";
    categoria: string;
    recorrente?: boolean;
    repeticoes?: number;
    parcelado?: boolean;
    parcelas?: number;
    formaPagamento: "dinheiro" | "pix" | "cartao";
    cartaoId?: number | null;
}