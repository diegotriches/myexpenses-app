"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { BsThreeDotsVertical, BsTags } from "react-icons/bs";
import { MdAdd, MdEdit, MdDelete } from "react-icons/md";
import { iconOptions } from "@/utils/iconOptions";

export default function Categorias() {
    const [categorias, setCategorias] = useState<
        { id: number; nome: string; tipo: string; icon: string }[]
    >([]);

    const [aba, setAba] = useState<"entrada" | "saida">("entrada");

    const [modalAberto, setModalAberto] = useState(false);
    const [modalIconesAberto, setModalIconesAberto] = useState(false);

    const [editandoId, setEditandoId] = useState<number | null>(null);

    const [nomeCategoria, setNomeCategoria] = useState("");
    const [tipoCategoria, setTipoCategoria] = useState<"entrada" | "saida">("entrada");
    const [iconCategoria, setIconCategoria] = useState("FaWallet");

    const [categoriaMenuAtivo, setCategoriaMenuAtivo] = useState<number | null>(null);

    const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState(false);
    const [categoriaExcluir, setCategoriaExcluir] = useState<number | null>(null);


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

    const abrirModalCriar = () => {
        setEditandoId(null);
        setNomeCategoria("");
        setTipoCategoria("entrada");
        setIconCategoria("FaWallet");
        setModalAberto(true);
    };

    const abrirModalEditar = (cat: any) => {
        setEditandoId(Number(cat.id));
        setNomeCategoria(cat.nome);
        setTipoCategoria(cat.tipo);
        setIconCategoria(cat.icon);
        setCategoriaMenuAtivo(null);
        setModalAberto(true);
    };

    const salvarCategoria = async () => {
        if (!nomeCategoria.trim()) return;

        try {
            if (editandoId !== null) {
                const res = await api.put(`/categorias/${editandoId}`, {
                    nome: nomeCategoria.trim(),
                    tipo: tipoCategoria,
                    icon: iconCategoria,
                });

                setCategorias(prev =>
                    prev.map(c => (c.id === editandoId ? res.data : c))
                );
            } else {
                const res = await api.post("/categorias", {
                    nome: nomeCategoria.trim(),
                    tipo: tipoCategoria,
                    icon: iconCategoria,
                });

                setCategorias(prev => [...prev, res.data]);
            }

            setModalAberto(false);
            setEditandoId(null);
        } catch (err) {
            console.error("Erro ao salvar categoria:", err);
        }
    };

    const excluirCategoria = async () => {
        if (!categoriaExcluir) return;

        try {
            await api.delete(`/categorias/${categoriaExcluir}`);
            setCategorias(prev => prev.filter(c => c.id !== categoriaExcluir));
        } catch (err) {
            console.error("Erro ao excluir categoria:", err);
        } finally {
            setModalConfirmacaoAberto(false);
            setCategoriaExcluir(null);
        }
    };

    const categoriasFiltradas = categorias.filter(c => c.tipo === aba);

    return (
        <div className="max-w-[900px] mx-auto p-6">
            <div className="flex items-center gap-2 mb-3">
                <BsTags className="text-3xl text-blue-700" />
                <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
            </div>
            <p className="text-gray-600 mb-6">
                Defina categorias para todas as suas receitas e despesas e mantenha suas finanças organizadas. Com categorias bem estruturadas, você consegue analisar rapidamente seus gastos, receitas e planejar melhor seu orçamento.
            </p>

            {/* Abas */}
            <div className="flex gap-4 border-b mb-6">
                {[
                    { label: "Receitas", value: "entrada" },
                    { label: "Despesas", value: "saida" },
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setAba(tab.value as any)}
                        className={`px-4 py-2 cursor-pointer font-semibold ${aba === tab.value
                            ? "border-b-2 border-blue-700 text-blue-700"
                            : "text-gray-600 hover:text-gray-800"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Botão nova categoria */}
            <div className="flex justify-end mb-6">
                <button
                    onClick={abrirModalCriar}
                    className="flex cursor-pointer items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-900 transition"
                >
                    <MdAdd className="text-xl" />
                    Nova Categoria
                </button>
            </div>

            {/* LISTAGEM */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categoriasFiltradas.map(cat => {
                    const IconComp =
                        iconOptions.find(i => i.name === cat.icon)?.component || null;

                    return (
                        <div
                            key={cat.id}
                            className="relative bg-gray-100 p-4 rounded-lg shadow-sm flex flex-col items-center justify-center group"
                        >
                            <div className="text-4xl mb-2">
                                {IconComp ? <IconComp size={40} /> : "📁"}
                            </div>

                            <span className="font-medium">{cat.nome}</span>

                            <span
                                className={`text-xs mt-1 px-2 py-1 rounded ${cat.tipo === "entrada"
                                    ? "bg-green-200 text-green-800"
                                    : "bg-red-200 text-red-800"
                                    }`}
                            >
                                {cat.tipo === "entrada" ? "Entrada" : "Saída"}
                            </span>

                            <button
                                onClick={() =>
                                    setCategoriaMenuAtivo(
                                        categoriaMenuAtivo === cat.id ? null : cat.id
                                    )
                                }
                                className="absolute cursor-pointer top-2 right-2 opacity-0 group-hover:opacity-100 transition"
                            >
                                <BsThreeDotsVertical className="text-xl text-gray-600" />
                            </button>

                            {categoriaMenuAtivo === cat.id && (
                                <div className="absolute right-2 top-10 bg-white border shadow-md rounded-md z-10 p-1">
                                    <button
                                        onClick={() => abrirModalEditar(cat)}
                                        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-100"
                                    >
                                        <MdEdit /> Editar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCategoriaExcluir(cat.id);
                                            setModalConfirmacaoAberto(true);
                                            setCategoriaMenuAtivo(null);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-gray-100 text-red-600"
                                    >
                                        <MdDelete /> Excluir
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ========== MODAL PRINCIPAL ========== */}
            {modalAberto && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg w-[420px] shadow-lg">
                        <h2 className="text-xl font-semibold mb-4 text-center">
                            {editandoId ? "Editar Categoria" : "Nova Categoria"}
                        </h2>

                        <div className="flex flex-col gap-4">
                            <p className="text-sm text-gray-700 font-semibold">Nome da Categoria</p>
                            <input
                                type="text"
                                placeholder="Nome da categoria"
                                value={nomeCategoria}
                                onChange={e => setNomeCategoria(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-md"
                            />
                            <p className="text-sm text-gray-700 font-semibold">Ícone</p>

                            {/* Linha com pré-visualização + botão */}
                            <div className="flex items-center gap-3">
                                {/* Pré-visualização do ícone */}
                                <div className="w-10 h-10 border border-gray-300 rounded-md flex items-center justify-center">
                                    {(() => {
                                        const IconComp =
                                            iconOptions.find(i => i.name === iconCategoria)?.component;

                                        return IconComp ? (
                                            <IconComp size={24} />
                                        ) : (
                                            <span className="text-gray-500 text-sm">—</span>
                                        );
                                    })()}
                                </div>

                                {/* Botão que abre o modal de ícones */}
                                <button
                                    type="button"
                                    onClick={() => setModalIconesAberto(true)}
                                    className="px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-100 flex items-center gap-2"
                                >
                                    Selecione um ícone
                                </button>
                            </div>

                            <p className="text-sm text-gray-700 font-semibold">Tipo</p>
                            <select
                                value={tipoCategoria}
                                onChange={e =>
                                    setTipoCategoria(e.target.value as "entrada" | "saida")
                                }
                                className="px-3 py-2 border border-gray-300 rounded-md"
                            >
                                <option value="entrada">Entrada</option>
                                <option value="saida">Saída</option>
                            </select>

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={() => setModalAberto(false)}
                                    className="px-4 py-2 border border-gray-300 cursor-pointer rounded-md"
                                >
                                    Cancelar
                                </button>

                                <button
                                    onClick={salvarCategoria}
                                    className="bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer hover:bg-blue-900"
                                >
                                    Salvar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== MODAL DE ÍCONES ========== */}
            {modalIconesAberto && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-60">
                    <div className="bg-white p-6 rounded-lg w-[450px] max-h-[500px] overflow-y-auto shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">Selecionar Ícone</h2>

                        <div className="grid grid-cols-6 gap-4">
                            {iconOptions.map(icon => {
                                const IconComp = icon.component;
                                return (
                                    <button
                                        key={icon.name}
                                        type="button"
                                        onClick={() => {
                                            setIconCategoria(icon.name);
                                            setModalIconesAberto(false);
                                        }}
                                        className="p-2 border rounded-md hover:bg-gray-100 flex items-center justify-center cursor-pointer"
                                    >
                                        <IconComp size={28} />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setModalIconesAberto(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {modalConfirmacaoAberto && (
                <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
                    <div className="bg-white w-[380px] p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-center mb-4">
                            Confirmar Exclusão
                        </h2>

                        <p className="text-gray-700 text-center mb-6">
                            Tem certeza de que deseja excluir esta categoria?
                            Esta ação não pode ser desfeita.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setModalConfirmacaoAberto(false);
                                    setCategoriaExcluir(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md cursor-pointer"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={excluirCategoria}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}