"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from "@/services/api";

import { BsPlusCircle, BsArrowLeft, BsPencil, BsTrash } from "react-icons/bs";

export default function Categorias() {
    const [tipo, setTipo] = useState<"Entrada" | "Saída">("Entrada");
    const [novaCategoria, setNovaCategoria] = useState("");
    const [categorias, setCategorias] = useState<{ id: number; nome: string; tipo: string }[]>([]);
    const [editandoId, setEditandoId] = useState<number | null>(null);

    const router = useRouter(); // Hook para navegar entre a página de criar novas categorias

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        try {
            const res = await api.get("/categorias");
            setCategorias(res.data);
        } catch (err) {
            console.error("Erro ao carregar categorias:", err);
        }
    };

    const handleAdicionarOuEditar = async () => {
        if (!novaCategoria.trim()) return;

        try {
            if (editandoId) {
                // Editar categoria existente
                const res = await api.put(`/categorias/${editandoId}`, {
                    nome: novaCategoria.trim(),
                    tipo
                });
                setCategorias(categorias.map(cat => cat.id === editandoId ? res.data : cat));
                setEditandoId(null);
                setNovaCategoria("");
                alert("Categoria editada com sucesso!");
            } else {
                // Adicionar nova categoria
                const res = await api.post("/categorias", {
                    nome: novaCategoria.trim(),
                    tipo
                });
                setCategorias([...categorias, res.data]);
                setNovaCategoria("");
                alert(`Categoria "${novaCategoria}" adicionada em ${tipo}`);
            }
        } catch (error) {
            console.error("Erro ao adicionar/editar categoria:", error);
        }
    };

    // Preparar edição
    const handleEditar = (cat: { id: number; nome: string; tipo: string }) => {
        setEditandoId(cat.id);
        setNovaCategoria(cat.nome);
        setTipo(cat.tipo as "Entrada" | "Saída");
    };

    // Excluir categoria
    const handleExcluir = async (id: number) => {
        if (!window.confirm("Deseja realmente excluir esta categoria?")) return;

        try {
            await api.delete(`/categorias/${id}`);
            setCategorias(categorias.filter(cat => cat.id !== id));
            alert("Categoria excluída com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir categoria:", error);
        }
    };

    return (
        <div>
            <div className='bg-white p-6 my-4 mx-auto max-w-[600px] rounded-xl shadow-md flex flex-col gap-4'>
                <div className='flex justify-center items-center relative text-gray-700 py-1'>
                    <button className='flex absolute left-0 items-center gap-2 p-2 bg-white border border-gray-500 rounded-md text-gray-700 cursor-pointer transition-all duration-300 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700' onClick={() => router.push("/formmovimentacao")}><BsArrowLeft /> Voltar</button>
                    <h3>Gerenciar Categorias</h3>
                </div>
                <div className="linha-1">
                    <select value={tipo} onChange={(e) => setTipo(e.target.value as "Entrada" | "Saída")} className='px-3 py-2 border border-gray-300 rounded-md text-base outline-none transition-colors duration-200 focus:border-blue-700'>
                        <option value="Entrada">Entrada</option>
                        <option value="Saída">Saída</option>
                    </select>

                    <input
                        type="text"
                        placeholder='Nova categoria'
                        value={novaCategoria}
                        onChange={(e) => setNovaCategoria(e.target.value)}
                        className='px-3 py-2 border border-gray-300 rounded-md text-base outline-none transition-colors duration-200 focus:border-blue-700'
                    />

                </div>
                <button onClick={handleAdicionarOuEditar} className='self-center flex items-center justify-center bg-blue-700 text-white rounded-full p-3 text-xl cursor-pointer transition duration-200 hover:bg-blue-900 hover:scale-105'>
                    {editandoId ? "Salvar Edição" : <BsPlusCircle />}
                </button>
                {editandoId && (
                    <button onClick={() => { setEditandoId(null); setNovaCategoria(""); }} className='self-center flex items-center justify-center bg-blue-700 text-white rounded-full p-3 text-xl cursor-pointer transition duration-200 hover:bg-blue-900 hover:scale-105'>
                        Cancelar
                    </button>
                )}
            </div>

            <div className='bg-white p-6 my-4 mx-auto max-w-[600px] rounded-xl shadow-md'>
                <h3 className='mt-4 text-lg font-semibold text-gray-700'>Categorias de Entrada</h3>

                <ul className='list-none p-0 my-2'>
                    {categorias.filter(cat => cat.tipo === "Entrada").map((cat) => (
                        <li className='bg-gray-100 my-1 px-4 py-2 rounded-md text-sm text-gray-700 transition-colors duration-200 hover:bg-blue-50' key={cat.id}>
                            {cat.nome}
                            <button className='bg-transparent border-none cursor-pointer text-gray-600 text-lg transition-colors duration-200 ml-2 hover:text-blue-600' onClick={() => handleEditar(cat)}><BsPencil /></button>
                            <button className='bg-transparent border-none cursor-pointer text-gray-600 text-lg transition-colors duration-200 ml-2 hover:text-blue-600' onClick={() => handleExcluir(cat.id)}><BsTrash /></button>
                        </li>
                    ))}
                </ul>

                <h3>Categorias de Saída</h3>

                <ul>
                    {categorias.filter(cat => cat.tipo === "Saída").map((cat) => (
                        <li key={cat.id}>
                            {cat.nome}
                            <button className='bg-transparent border-none cursor-pointer text-gray-600 text-lg transition-colors duration-200 ml-2 hover:text-blue-600' onClick={() => handleEditar(cat)}><BsPencil /></button>
                            <button className='bg-transparent border-none cursor-pointer text-gray-600 text-lg transition-colors duration-200 ml-2 hover:text-blue-600' onClick={() => handleExcluir(cat.id)}><BsTrash /></button>
                        </li>
                    ))}
                </ul>
            </div>

        </div>
    );
}