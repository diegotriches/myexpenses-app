"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import type { Transacao } from '@/types/transacao';
import api from "@/services/api";

import { BsFloppy2Fill, BsArrowLeft, BsThreeDotsVertical } from "react-icons/bs";

type FormaPagamento = "dinheiro" | "pix" | "cartao";

interface Props {
    transacoes: Transacao[];
    adicionarTransacao: (nova: Transacao) => Promise<void>;
    editarTransacao: (atualizada: Transacao) => Promise<void>;
}

export default function FormMovimentacao({ transacoes, adicionarTransacao, editarTransacao }: Props) {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [data, setData] = useState("");
    const [tipo, setTipo] = useState<"Entrada" | "Saída">("Entrada");
    const [descricao, setDescricao] = useState("");
    const [valor, setValor] = useState("");
    const [categoria, setCategoria] = useState("");
    const [categorias, setCategorias] = useState<{ id: number; nome: string; tipo: string }[]>([]);
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("dinheiro");
    const [cartaoId, setCartaoId] = useState<number | null>(null);

    const [modoLancamento, setModoLancamento] = useState<"A Vista" | "Parcelado" | "Recorrente">("A Vista");
    const [parcelas, setParcelas] = useState(1);
    const [mesesRecorrencia, setMesesRecorrencia] = useState(1);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [cartoes, setCartoes] = useState<{ id: number; nome: string; tipo: string }[]>([]);
    const [menuAberto, setMenuAberto] = useState(false);

    // Carregar categorias do backend
    useEffect(() => {
        api.get("/categorias")
            .then(res => setCategorias(res.data))
            .catch(err => console.error("Erro ao carregar categorias:", err));
    }, []);

    // Carregar cartões do backend
    useEffect(() => {
        api.get("/cartoes")
            .then(res => setCartoes(res.data))
            .catch(err => console.error("Erro ao carregar cartões:", err));
    }, []);


    // Preencher campos se estiver editando
    useEffect(() => {
        if (!id) return;
        const transacao = transacoes.find((t) => t.id === Number(id));
        if (!transacao) return;

        setEditandoId(transacao.id);
        setData(transacao.data);
        setTipo(transacao.tipo);
        setDescricao(transacao.descricao);
        setValor(transacao.valor.toString());
        setCategoria(transacao.categoria ?? "");
        setFormaPagamento(transacao.formaPagamento);
        setCartaoId(transacao.cartaoId ?? null);

        if (transacao.parcela) setModoLancamento("Parcelado");
        else if (transacao.recorrente) setModoLancamento("Recorrente");
        else setModoLancamento("A Vista");
    }, [id, transacoes]);

    const limparCampos = () => {
        setTipo("Entrada");
        setData("");
        setDescricao("");
        setValor("");
        setCategoria("");
        setFormaPagamento("dinheiro");
        setModoLancamento("A Vista");
        setParcelas(1);
        setMesesRecorrencia(1);
        setEditandoId(null);
    };

    const adicionarOuEditarTransacao = async () => {
        if (!data || !descricao || !valor || !categoria) return;
        const valorNumber = Number(valor);

        try {
            if (editandoId) {
                // Edição
                const transacaoAtualizada: Transacao = {
                    id: editandoId,
                    data,
                    tipo,
                    descricao,
                    valor: valorNumber,
                    categoria,
                    formaPagamento,
                    parcela: modoLancamento === "Parcelado" ? `${parcelas}x` : undefined,
                    recorrente: modoLancamento === "Recorrente" ? true : undefined,
                    cartaoId,
                };
                // Aguardar a função do App que faz PUT + atualiza estado
                await editarTransacao(transacaoAtualizada);
            } else {
                // Criação (parcelado / recorrente / simples)
                if (modoLancamento === "Parcelado" && parcelas > 1) {
                    for (let i = 1; i <= parcelas; i++) {
                        const dataParcela = new Date(data);
                        dataParcela.setMonth(dataParcela.getMonth() + (i - 1));
                        await adicionarTransacao({
                            id: Date.now() + i,
                            data: dataParcela.toISOString().split("T")[0],
                            tipo,
                            descricao,
                            valor: valorNumber / parcelas,
                            categoria,
                            formaPagamento,
                            parcela: `${i}/${parcelas}`,
                            cartaoId,
                        });
                    }
                } else if (modoLancamento === "Recorrente" && mesesRecorrencia > 1) {
                    for (let i = 0; i < mesesRecorrencia; i++) {
                        const dataRecorrencia = new Date(data);
                        dataRecorrencia.setMonth(dataRecorrencia.getMonth() + i);
                        await adicionarTransacao({
                            id: Date.now() + i,
                            data: dataRecorrencia.toISOString().split("T")[0],
                            tipo,
                            descricao,
                            valor: valorNumber,
                            categoria,
                            formaPagamento,
                            recorrente: true,
                            cartaoId,
                        });
                    }
                } else {
                    await adicionarTransacao({
                        id: Date.now(),
                        data,
                        tipo,
                        descricao,
                        valor: valorNumber,
                        categoria,
                        formaPagamento,
                        cartaoId,
                    });
                }
            }

            limparCampos();
            router.back();
        } catch (err) {
            console.error("Erro ao salvar transação:", err);
        }
    };

    const categoriasDisponiveis = categorias.filter(c => c.tipo === tipo);

    return (
        <>
            <div className='flex flex-col bg-white rounded-xl max-w-[600px] mx-auto my-5 gap-3 p-5'>
                <div className="flex justify-between items-center text-gray-800 py-1">
                    <button className="flex items-center gap-2 p-2 bg-white border border-gray-500 rounded-lg text-gray-800 cursor-pointer transition duration-300 hover:bg-[#f0f8ff] hover:border-blue-500 hover:text-blue-700" onClick={() => router.push("/movimentacao")}><BsArrowLeft />Voltar</button>
                    <h3>{editandoId ? "Editar Movimentação" : "Nova Movimentação"}</h3>
                    <div className="relative inline-block mb-4 menu-suspenso">
                        <button onClick={() => setMenuAberto(!menuAberto)}><BsThreeDotsVertical /></button>
                        {menuAberto && (
                            <div className="absolute top-full left-0 bg-white border border-gray-300 rounded-md shadow-md z-[100] menu-opcoes">
                                <Link href="/categorias" className="block px-3 py-2 text-gray-800 hover:bg-gray-100 menu-item">
                                    Categorias
                                </Link>
                                <Link href="/cartoes" className="block px-3 py-2 text-gray-800 hover:bg-gray-100 menu-item">
                                    Cartões
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 linha-1">
                    <input
                        type="date"
                        value={data}
                        onChange={(e) => setData(e.target.value)} required
                        className="flex-1 min-w-[100px] rounded-xl p-2.5 transition-all box-border border border-gray-300"
                    />

                    <select value={tipo} onChange={(e) => setTipo(e.target.value as "Entrada" | "Saída")} className="flex-1 min-w-[100px] rounded-xl p-2.5 transition-all box-border border border-gray-300">
                        <option value="Entrada">Entrada</option>
                        <option value="Saída">Saída</option>
                    </select>

                    <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}>
                        <option value="">Categoria</option>
                        {categoriasDisponiveis.map(c => (
                            <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <input
                        type="text"
                        placeholder='Descrição'
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)} required
                        className="w-full p-2.5 rounded-xl transition-all box-border border border-gray-300"
                    />
                </div>

                <div id="flex gap-3 flex-wrap">
                    <input
                        type="number"
                        placeholder='Valor'
                        value={valor}
                        onChange={(e) => setValor(e.target.value)} required
                        className="p-2.5 rounded-xl transition-all box-border border border-gray-300 flex-1 min-w-[120px]"
                    />

                    <select
                        id="formaPagamento"
                        value={formaPagamento}
                        onChange={(e) => {
                            const value = e.target.value as FormaPagamento;
                            setFormaPagamento(value);
                            if (value !== "cartao") setCartaoId(null);
                        }}
                        className="p-2.5 rounded-xl transition-all box-border border border-gray-300 flex-1 min-w-[120px]"
                    >
                        <option value="dinheiro">Dinheiro</option>
                        <option value="pix">Pix</option>
                        <option value="cartao">Cartão</option>
                    </select>

                    {formaPagamento === "cartao" && (
                        <select
                            id="cartaoId"
                            value={cartaoId ?? ""}
                            onChange={(e) => setCartaoId(Number(e.target.value))}
                        >
                            <option value="">Selecione o cartão</option>
                            {cartoes.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nome} ({c.tipo})
                                </option>
                            ))}
                        </select>
                    )}

                    <select value={modoLancamento} onChange={(e) => setModoLancamento(e.target.value as "A Vista" | "Parcelado" | "Recorrente")}>
                        <option value="A Vista">A Vista</option>
                        <option value="Parcelado">Parcelado</option>
                        <option value="Recorrente">Recorrente</option>
                    </select>

                    {modoLancamento === "Parcelado" && (
                        <input
                            type="number"
                            placeholder='Número de parcelas'
                            value={parcelas}
                            onChange={(e) => setParcelas(Number(e.target.value))}
                        />
                    )}

                    {modoLancamento === "Recorrente" && (
                        <input
                            type="number"
                            placeholder='Meses de recorrência'
                            value={mesesRecorrencia}
                            onChange={(e) => setMesesRecorrencia(Number(e.target.value))}
                        />
                    )}
                </div>
                <div className="mx-auto">
                    <button className="w-[120px] p-2 bg-[#4a90e2] text-white border-2 rounded-md text-lg transition-all cursor-pointer hover:bg-[#e6f0ff] hover:text-[#4a90e2] hover:border-[#4a90e2]" type="button" onClick={adicionarOuEditarTransacao}>
                        <BsFloppy2Fill /> {editandoId ? "Salvar edições" : "Salvar"}
                    </button>
                </div>
            </div>
        </>
    )
}