"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Props {
    usuario: { id?: number; foto?: string | null };
    atualizarUsuario: (dados: { foto?: string | null }) => void;
}

export default function EditarFotoCard({ usuario, atualizarUsuario }: Props) {
    const [novaFoto, setNovaFoto] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [enviandoFoto, setEnviandoFoto] = useState(false);

    useEffect(() => {
        setPreview(null);
        setNovaFoto(null);
    }, [usuario]);

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setNovaFoto(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const enviarFoto = async () => {
        if (!usuario.id || !novaFoto) return;

        const formData = new FormData();
        formData.append("foto", novaFoto);

        try {
            setEnviandoFoto(true);
            const res = await axios.post(
                `http://localhost:5000/users/${usuario.id}/foto`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            atualizarUsuario({ foto: res.data.foto });
            setPreview(null);
            setNovaFoto(null);
        } catch (err) {
            console.error("Erro ao enviar foto:", err);
        } finally {
            setEnviandoFoto(false);
        }
    };

    const cancelarEdicao = () => {
        setPreview(null);
        setNovaFoto(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 max-w-xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Alterar Foto</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Escolha uma nova foto de perfil e clique em salvar.
                </p>
            </div>

            <div className="flex flex-col items-center gap-4">
                <img
                    src={
                        preview
                            ? preview
                            : usuario.foto
                            ? `http://localhost:5000${usuario.foto}`
                            : "/default-avatar.png"
                    }
                    alt="Foto de perfil"
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-300 shadow-sm"
                />

                <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                    📷 Selecionar Foto
                    <input type="file" accept="image/*" onChange={handleFotoChange} className="hidden" />
                </label>

                {novaFoto && (
                    <div className="flex gap-4">
                        <button
                            onClick={cancelarEdicao}
                            className="px-5 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors"
                        >
                            ❌ Cancelar
                        </button>
                        <button
                            onClick={enviarFoto}
                            disabled={enviandoFoto}
                            className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                            {enviandoFoto ? "Enviando..." : "💾 Salvar"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}