"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import api from '@/services/api';
import { exportarCSV } from '@/utils/exportCSV';
import { importarCSV } from '@/utils/importCSV';
import { usePeriodo } from '@/components/PeriodoContext';
import type { Transacao } from '@/types/transacao';
import PeriodoSelector from "@/components/PeriodoSelector";

import { BsFunnel, BsFunnelFill, BsPencil, BsFillTrash3Fill, BsCreditCard2Back, BsCash, BsFillXDiamondFill, BsThreeDotsVertical, BsFiletypeCsv, BsClockHistory, BsCloudUpload } from "react-icons/bs";

export default function Movimentacao() {
    const router = useRouter();

    const { mesSelecionado, anoSelecionado } = usePeriodo();

    const [transacoes, setTransacoes] = useState<Transacao[]>([]);

    const [filtroValorMin, setFiltroValorMin] = useState("");
    const [filtroValorMax, setFiltroValorMax] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [mostrarFiltro, setMostrarFiltro] = useState(false);
    const [abaAtiva, setAbaAtiva] = useState<"Entrada" | "Saída">("Entrada");
    const [hoverId, setHoverId] = useState<number | null>(null);
    const [excluirId, setExcluirId] = useState<number | null>(null);

    const [menuAberto, setMenuAberto] = useState(false);

    const [cartoes, setCartoes] = useState<{ id: number; nome: string; tipo: string }[]>([]);

    const [resumoImportacao, setResumoImportacao] = useState<{
        sucesso: boolean;
        importadas?: number;
        duplicadas?: number;
        total?: number;
        erro?: string;
    } | null>(null);

    const [importando, setImportando] = useState(false);

    async function importarCSVDialog() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv";
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (file) {
                setImportando(true);
                const resultado = await importarCSV(file);
                setResumoImportacao(resultado);
                setImportando(false);
            }
        };
        input.click();
    }

    useEffect(() => {
        api.get("/transacoes")
            .then(res => setTransacoes(res.data))
            .catch(err => console.error("Erro ao carregar transações:", err));
    }, []);


    useEffect(() => {
        api.get("/cartoes")
            .then(res => setCartoes(res.data))
            .catch(err => console.error("Erro ao carregar cartões:", err));
    }, []);


    // Filtragem das transações
    const transacoesFiltradas = transacoes.filter((t) => {
        const data = new Date(t.data);

        const matchMes = data.getMonth() === mesSelecionado;
        const matchAno = data.getFullYear() === anoSelecionado;

        const matchValorMin = filtroValorMin ? t.valor >= Number(filtroValorMin) : true;
        const matchValorMax = filtroValorMax ? t.valor <= Number(filtroValorMax) : true;
        const matchCategoria = filtroCategoria ? t.categoria === filtroCategoria : true;

        const matchAba = abaAtiva === t.tipo;

        return matchMes && matchAno && matchValorMin && matchValorMax && matchCategoria && matchAba;
    });

    // Categorias disponíveis para filtro
    const categoriasDisponiveis = Array.from(
        new Set(
            transacoes
                .filter((t) => {
                    const data = new Date(t.data);
                    const matchMes = data.getMonth() === mesSelecionado;
                    const matchAno = data.getFullYear() === anoSelecionado;
                    const matchAba = t.tipo === abaAtiva;
                    return matchMes && matchAno && matchAba;
                })
                .map((t) => t.categoria)
        )
    );

    const getNomeFormaPagamento = (t: Transacao) => {
        // Se for dinheiro ou pix, exibe ícone + nome
        if (t.formaPagamento === "dinheiro") return <><BsCash /> Dinheiro</>;
        if (t.formaPagamento === "pix") return <><BsFillXDiamondFill /> Pix</>;

        // Se for um cartão (verifica se tem cartaoId associado)
        if (t.formaPagamento === "cartao" && t.cartaoId) {
            const cartao = cartoes.find(c => c.id === t.cartaoId);
            return cartao ? <><BsCreditCard2Back /> {cartao.nome} ({cartao.tipo})</> : "Cartão";
        }

        // Caso não encontre correspondência
        return t.formaPagamento;
    };

    const excluirTransacao = async (id: number) => {
        try {
            await api.delete(`/transacoes/${id}`);
            setTransacoes(prev => prev.filter(t => t.id !== id));
        } catch (err) {
            console.error("Erro ao excluir transação:", err);
        }
    };


    useEffect(() => {
        setFiltroCategoria("");
    }, [abaAtiva]);

    const confirmarExclusao = (id: number) => setExcluirId(id);
    const cancelarExclusao = () => setExcluirId(null);
    const executarExclusao = () => {
        if (excluirId !== null) {
            excluirTransacao(excluirId);
            setExcluirId(null);
        }
    };

    return (
        <>
            <div>
                <PeriodoSelector />
            </div>
            {mostrarFiltro && (
                <div className="max-w-[700px] mx-auto my-6 p-6 rounded-xl bg-[#fff3e0] shadow-md flex flex-wrap gap-4">
                    <select
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        className="flex-[1_1_150px] p-2 rounded-md border border-gray-300"
                    >
                        <option value="">Todas as categorias</option>
                        {categoriasDisponiveis.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    <input
                        type="number"
                        placeholder='Valor mínimo'
                        value={filtroValorMin}
                        onChange={(e) => setFiltroValorMin(e.target.value)}
                        className="flex-[1_1_150px] p-2 rounded-md border border-gray-300"
                    />

                    <input
                        type="number"
                        placeholder='Valor máximo'
                        value={filtroValorMax}
                        onChange={(e) => setFiltroValorMax(e.target.value)}
                        className="flex-[1_1_150px] p-2 rounded-md border border-gray-300"
                    />

                    <button
                        className="flex-[1_1_100%] bg-[#ff9800] text-white py-2 px-4 rounded-md hover:bg-[#f57c00]"
                        onClick={() => {
                            setFiltroValorMin("");
                            setFiltroValorMax("");
                            setFiltroCategoria("");
                        }}>Limpar</button>
                </div>
            )}

            <div className="w-[850px] mx-auto bg-white rounded-2xl px-8 pb-6 pt-1 font-sans">
                <div>
                    <button onClick={() => setMostrarFiltro(!mostrarFiltro)}>
                        {mostrarFiltro ? <BsFunnel /> : <BsFunnelFill />}
                    </button>

                    <h3 className='text-center mb-6 text-[#555] text-xl font-bold'>Lista de Movimentações</h3>

                    <div>
                        <button onClick={() => setMenuAberto(!menuAberto)}><BsThreeDotsVertical /></button>
                        {menuAberto && (
                            <div>
                                <button onClick={() => exportarCSV(transacoes)}><BsFiletypeCsv />Exportar</button>
                                <button onClick={() => importarCSVDialog()}>
                                    <BsCloudUpload /> Importar
                                </button>
                                <button onClick={() => router.push("/historico")}><BsClockHistory />Histórico</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mb-4 abas">
                    <button
                        className={abaAtiva === "Entrada" ? "px-4 py-2 bg-gray-700 text-white rounded-md font-bold cursor-pointer transition" : "px-4 py-2 bg-gray-300 rounded-md cursor-pointer transition"}
                        onClick={() => setAbaAtiva("Entrada")}
                    >
                        Entradas
                    </button>
                    <button
                        className={abaAtiva === "Saída" ? "px-4 py-2 bg-gray-700 text-white rounded-md font-bold cursor-pointer transition" : "px-4 py-2 bg-gray-300 rounded-md cursor-pointer transition"}
                        onClick={() => setAbaAtiva("Saída")}
                    >Saídas</button>
                </div>

                <div className="flex flex-col cards-mov">
                    {transacoesFiltradas.map(t => (
                        <div
                            key={t.id}
                            className={`card-mov ${t.tipo.toLowerCase()} ${hoverId === t.id ? "border-blue-500 bg-[#f0f8ff] shadow-[0_4px_12px_rgba(0,123,255,0.3)]" : 'bg-white border border-gray-300 rounded-xl mb-2 transition-all duration-300 cursor-pointer'}`}
                            onClick={() => setHoverId(hoverId === t.id ? null : t.id)}
                        >
                            <div className="flex justify-between items-center gap-5 card-body">
                                <span className="ml-5 font-semibold text-sm text-gray-600 data">{new Date(t.data).toLocaleDateString("pt-BR")}</span>
                                <p className="font-semibold text-base text-[#222] flex-2 descricao">{t.descricao}</p>
                                <p>{getNomeFormaPagamento(t)}</p>
                                <p className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-xl categoria">{t.categoria}</p>

                                {t.parcela && <span className="bg-purple-100 text-purple-800 text-[0.75rem] font-medium px-2 py-1 rounded-xl parcela">Parcela {t.parcela}</span>}
                                {t.recorrente ? <span className="bg-yellow-100 text-yellow-700 text-[0.75rem] font-medium px-2 py-1 rounded-xl recorrente">Recorrente</span> : null}

                                <p className="font-bold text-xl flex justify-end mr-5 valor">R$ {t.valor.toFixed(2)}</p>
                            </div>

                            {hoverId === t.id && (
                                <div className="flex justify-end gap-4 p-4">
                                    <button className='text-gray-600 text-lg hover:text-blue-600' onClick={() => router.push(`/form-movimentacao/${t.id}`)}><BsPencil /></button>
                                    <button className='text-gray-600 text-lg hover:text-blue-600' onClick={() => confirmarExclusao(t.id)}><BsFillTrash3Fill /></button>
                                </div>
                            )}
                        </div>
                    ))}

                    {excluirId !== null && (
                        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
                            <div className="bg-white p-6 rounded-lg max-w-[400px] w-[90%] text-center shadow-xl animate-[fadeIn_0.25s_ease]">
                                <p>Tem certeza que deseja excluir esta movimentação?</p>
                                <div className="flex justify-center gap-3 mt-5">
                                    <button className='bg-red-700 text-white px-4 py-2 font-semibold rounded-md hover:bg-red-600' onClick={executarExclusao}>Sim</button>
                                    <button className='bg-gray-300 text-gray-800 px-4 py-2 font-semibold rounded-md hover:bg-gray-400' onClick={cancelarExclusao}>Não</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <p>Não encontrou alguma movimentação? Acesse aqui o <Link href="/historico" style={{ textDecoration: "underline", color: "blue" }}>
                    histórico
                </Link>{" "} completo.</p>
            </div>
            {importando && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
                    <div className="bg-white p-6 rounded-lg max-w-[400px] w-[90%] text-center shadow-xl animate-[fadeIn_0.25s_ease]">
                        <p>Importando movimentações, aguarde...</p>
                        <div className="w-9 h-9 mx-auto border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                </div>
            )}

            {resumoImportacao && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[1000]">
                    <div className="bg-white p-6 rounded-lg max-w-[400px] w-[90%] text-center shadow-xl animate-[fadeIn_0.25s_ease]">
                        {resumoImportacao.sucesso ? (
                            <>
                                <h3>✅ Importação concluída!</h3>
                                <p>Total de registros no arquivo: <strong>{resumoImportacao.total}</strong></p>
                                <p>Novas transações importadas: <strong>{resumoImportacao.importadas}</strong></p>
                                <p>Ignoradas (duplicadas): <strong>{resumoImportacao.duplicadas}</strong></p>
                            </>
                        ) : (
                            <>
                                <h3>❌ Erro na importação</h3>
                                <p>{resumoImportacao.erro}</p>
                            </>
                        )}
                        <button className="bg-red-700 text-white px-4 py-2 font-semibold rounded-md hover:bg-red-600" onClick={() => setResumoImportacao(null)}>
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}