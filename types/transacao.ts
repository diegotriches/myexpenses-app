export interface Transacao {
    id: number;

    data: string;
    tipo: "entrada" | "saida";
    descricao?: string | null;
    valor: number;

    categoria?: string | null;

    formaPagamento?: "dinheiro" | "pix" | "cartao" | null;
    
    cartaoId?: number | null;
    
    recorrente?: boolean;
    recorrenciaId?: string;
    repeticoes?: number;
    
    parcelado?: boolean;
    parcelamentoId?: string;
    parcelas?: number;
    parcelaAtual?: number;
    
    contaId: string;
    transferenciaId?: string;
}