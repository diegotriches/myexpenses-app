"use client";

import { useState } from "react";

interface Conta {
    id: string;
    nome: string;
}

interface Props {
    aberto: boolean;
    onClose: () => void;
    total: number;
    contas: Conta[];
    onConfirmar: (data: {
        contaId: string;
        dataPagamento?: string;
    }) => Promise<void>;
    loading?: boolean;
}

export default function PagarFaturaModal({
    aberto,
    onClose,
    total,
    contas,
    onConfirmar,
}: Props) {
    const [contaId, setContaId] = useState("");
    const [loading, setLoading] = useState(false);
    const [dataPagamento] = useState("");

    if (!aberto) return null;

    const confirmar = async () => {
        if (!contaId) {
            alert("Selecione uma conta para pagamento.");
            return;
        }

        try {
            setLoading(true);
            await onConfirmar({
                contaId,
                dataPagamento: dataPagamento || undefined,
            });

            onClose();
        } catch (err) {
            console.error(err);
            alert("Erro ao pagar fatura.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[420px] shadow-lg space-y-4">
                <h2 className="text-xl font-semibold text-center">
                    Pagar Fatura
                </h2>

                <p className="text-center text-gray-600">
                    Valor total da fatura
                </p>

                <p className="text-center text-2xl font-bold">
                    R$ {total.toFixed(2)}
                </p>

                <div className="space-y-2">
                    <label className="text-sm font-medium">
                        Conta para débito
                    </label>

                    <select
                        value={contaId}
                        onChange={(e) => setContaId(e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                    >
                        <option value="">Selecione uma conta</option>
                        {contas.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.nome}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded hover:bg-gray-100"
                        disabled={loading}
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={confirmar}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-900 disabled:opacity-50"
                    >
                        {loading ? "Pagando..." : "Confirmar Pagamento"}
                    </button>
                </div>
            </div>
        </div>
    );
}