"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Props {
    usuario: { id?: number; nome: string; email: string };
    atualizarUsuario: (dados: { nome?: string; email?: string }) => void;
}

export default function EditarDadosCard({ usuario, atualizarUsuario }: Props) {
    const [form, setForm] = useState({ nome: usuario.nome, email: usuario.email, senha: "" });
    const [usuarioOriginal, setUsuarioOriginal] = useState({ nome: usuario.nome, email: usuario.email });

    useEffect(() => {
        setForm({ nome: usuario.nome, email: usuario.email, senha: "" });
        setUsuarioOriginal({ nome: usuario.nome, email: usuario.email });
    }, [usuario]);

    const salvarCampos = async () => {
        if (!usuario.id) return;

        try {
            const payload: any = { name: form.nome, email: form.email };
            if (form.senha && form.senha.trim() !== "") payload.password = form.senha;

            const res = await axios.put(`http://localhost:5000/users/${usuario.id}`, payload);

            atualizarUsuario({
                nome: res.data.name,
                email: res.data.email,
            });

            setForm({ ...form, senha: "" });
            setUsuarioOriginal({ nome: res.data.name, email: res.data.email });
        } catch (err) {
            console.error("Erro ao salvar campos:", err);
        }
    };

    const cancelarEdicoes = () => {
        setForm({ nome: usuarioOriginal.nome, email: usuarioOriginal.email, senha: "" });
    };

    return (
        <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-6 max-w-xl mx-auto divide-y divide-gray-200 space-y-6">
            {/* Header */}
            <div className="pb-4">
                <h2 className="text-2xl font-bold text-gray-900">Dados Pessoais</h2>
                <p className="text-gray-500 text-sm mt-1">
                    Gerencie seu nome, e-mail e senha. Edite os campos que deseja alterar e clique em salvar.
                </p>
            </div>

            {/* Campos */}
            <div className="space-y-4">
                {/* Nome */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-medium text-gray-700">Nome</label>
                    <input
                        type="text"
                        value={form.nome}
                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                        className="w-full h-12 px-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {/* E-mail */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-medium text-gray-700">E-mail</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full h-12 px-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {/* Senha */}
                <div className="flex flex-col gap-2">
                    <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                    <input
                        type="password"
                        placeholder="Deixe em branco para manter a atual"
                        value={form.senha}
                        onChange={(e) => setForm({ ...form, senha: e.target.value })}
                        className="w-full h-12 px-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
            </div>

            {/* Ações */}
            <div className="pt-4 flex gap-4 justify-end">
                <button
                    onClick={cancelarEdicoes}
                    className="px-5 py-2 rounded-lg bg-gray-300 text-gray-700 hover:bg-gray-400 transition-colors"
                >
                    ❌ Cancelar
                </button>
                <button
                    onClick={salvarCampos}
                    className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                    💾 Salvar
                </button>
            </div>
        </div>
    );
}