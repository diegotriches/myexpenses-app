import api from "../services/api";
import type { Transacao } from "../types/transacao";

export async function importarCSV(file: File) {
    try {
        const text = await file.text();
        const linhas = text.trim().split("\n");
        linhas.shift(); // remove cabeçalho

        const movimentacoes: Transacao[] = linhas.map((linha) => {
            const [
                id,
                descricao,
                valor,
                tipo,
                categoria,
                data,
                parcela,
                recorrente,
                formaPagamento,
                cartaoId,
            ] = linha.split(",");

            return {
                id: Number(id),
                descricao: descricao.trim(),
                valor: Number(valor),
                tipo: tipo === "Entrada" ? "Entrada" : "Saída",
                categoria: categoria.trim(),
                data: data.trim(),
                parcela: parcela || undefined,
                recorrente: recorrente === "true" || recorrente === "Sim",
                formaPagamento: formaPagamento as "dinheiro" | "pix" | "cartao",
                cartaoId: cartaoId ? Number(cartaoId) : undefined,
            };
        });

        // Buscar IDs já existentes
        const { data: existentes } = await api.get("/transacoes");
        const idsExistentes = new Set(existentes.map((t: Transacao) => t.id));

        const novasMovimentacoes = movimentacoes.filter(
            (mov) => !idsExistentes.has(mov.id)
        );
        const duplicadas = movimentacoes.length - novasMovimentacoes.length;

        let importadas = 0;
        for (const mov of novasMovimentacoes) {
            await api.post("/transacoes", mov);
            importadas++;
        }

        return {
            sucesso: true,
            importadas,
            duplicadas,
            total: movimentacoes.length,
        };
    } catch (error) {
        console.error("Erro ao importar CSV:", error);
        return { sucesso: false, erro: String(error) };
    }
}