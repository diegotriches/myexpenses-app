export interface Transacao {
    id: number;
    data: string;
    descricao: string;
    valor: number;
    tipo: "entrada" | "saida";
    categoria: string;
    parcela?: string;
    recorrente?: boolean;
    repeticoes?: number;  // ← aqui adiciona o número de repetições
    formaPagamento: "dinheiro" | "pix" | "cartao";
    cartaoId?: number | null;
}