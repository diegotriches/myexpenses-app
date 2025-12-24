"use client";

import axios from "axios";

interface Props {
    usuario: { id?: number };
}

export default function DeletarContaCard({ usuario }: Props) {
    const deletarConta = async () => {
        if (!usuario.id) return;
        const confirm = window.confirm(
            "Tem certeza que deseja deletar sua conta? Esta ação é irreversível."
        );
        if (!confirm) return;

        try {
            await axios.delete(`http://localhost:5000/users/${usuario.id}`);
            alert("Conta deletada com sucesso!");
            // aqui você pode redirecionar para login ou limpar dados locais
        } catch (err) {
            console.error("Erro ao deletar conta:", err);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 max-w-xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Deletar Conta</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Esta ação é irreversível. Ao deletar sua conta, todos os dados serão perdidos.
                </p>
            </div>

            <button
                onClick={deletarConta}
                className="w-full py-2 mt-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
                🗑️ Deletar Conta
            </button>
        </div>
    );
}