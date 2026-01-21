"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

import { Cartao, CreateCartaoDTO, UpdateCartaoDTO } from "@/types/cartao";
import { bandeiraOptions, empresaOptions } from "@/utils/cartaoOptions";
import CampoSelect from "./CampoSelect";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useContas } from "@/hooks/useContas";
import { Info, CreditCard, Wallet } from "lucide-react";

type TipoCartao = "credito" | "debito";

interface Props {
    initialValues: Cartao | null;
    onSubmit: (values: CreateCartaoDTO | UpdateCartaoDTO) => Promise<void>;
    onCancel?: () => void;
}

export default function CartaoForm({ initialValues, onSubmit, onCancel }: Props) {
    const { data: contas = [] } = useContas();

    const [form, setForm] = useState({
        nome: "",
        tipo: "credito" as TipoCartao,
        bandeira: "",
        empresa: "",
        limite: "",
        diaFechamento: "",
        diaVencimento: "",
        ativo: true,
        observacoes: "",
        contaVinculadaId: "none",
    });

    useEffect(() => {
        if (initialValues) {
            setForm({
                nome: initialValues.nome,
                tipo: initialValues.tipo,
                bandeira: initialValues.bandeira,
                empresa: initialValues.empresa || "",
                limite: initialValues.limite ? Number(initialValues.limite).toString() : "",
                diaFechamento: initialValues.diaFechamento?.toString() ?? "",
                diaVencimento: initialValues.diaVencimento?.toString() ?? "",
                ativo: initialValues.ativo,
                observacoes: initialValues.observacoes ?? "",
                contaVinculadaId: initialValues.contaVinculadaId ?? "none",
            });
        }
    }, [initialValues]);

    function handleChange(field: string, value: any) {
        setForm((f) => {
            const updated = { ...f, [field]: value };
            
            // ✅ Ao mudar de crédito para débito, resetar campos de fatura
            if (field === "tipo") {
                if (value === "debito") {
                    updated.limite = "";
                    updated.diaFechamento = "";
                    updated.diaVencimento = "";
                }
            }
            
            return updated;
        });
    }

    async function handleSubmit() {
        if (!form.nome?.trim()) {
            alert("Informe o nome do cartão");
            return;
        }

        if (!form.tipo) {
            alert("Informe o tipo do cartão");
            return;
        }

        if (!form.bandeira) {
            alert("Informe a bandeira do cartão");
            return;
        }

        if (!form.empresa) {
            alert("Informe a empresa do cartão");
            return;
        }

        // ✅ NOVO: Validação para cartão de débito
        if (form.tipo === "debito") {
            if (!form.contaVinculadaId || form.contaVinculadaId === "none") {
                alert("Cartão de débito precisa estar vinculado a uma conta");
                return;
            }
        }

        // Validações para crédito
        if (form.tipo === "credito") {
            const limite = Number(form.limite);

            if (!Number.isFinite(limite) || limite <= 0) {
                alert("Informe um limite válido para o cartão de crédito");
                return;
            }

            if (!form.diaFechamento) {
                alert("Informe o dia de fechamento da fatura");
                return;
            }

            if (!form.diaVencimento) {
                alert("Informe o dia de vencimento da fatura");
                return;
            }
        }

        const payload: CreateCartaoDTO | UpdateCartaoDTO = {
            nome: form.nome.trim(),
            tipo: form.tipo,
            bandeira: form.bandeira,
            empresa: form.empresa,
            limite: form.tipo === "credito" ? Number(form.limite) : 0,
            diaFechamento:
                form.tipo === "credito" ? Number(form.diaFechamento) : null,
            diaVencimento:
                form.tipo === "credito" ? Number(form.diaVencimento) : null,
            ativo: form.ativo,
            observacoes: form.observacoes || null,
            contaVinculadaId: form.contaVinculadaId === "none" ? null : form.contaVinculadaId,
        };

        await onSubmit(payload);
    }

    const contasAtivas = contas.filter(c => c.ativo);

    return (
        <div className="space-y-4">
            {/* Descrição do modal */}
            <p className="text-gray-600 dark:text-gray-400 text-sm">
                Preencha os dados abaixo para cadastrar ou editar um cartão.
            </p>

            {/* Nome + Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nome</p>
                    <Input
                        placeholder="Nome do cartão"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)}
                    />
                </div>

                <div>
                    <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tipo</p>
                    <Select
                        value={form.tipo}
                        onValueChange={(v: TipoCartao) => handleChange("tipo", v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                            <SelectItem value="credito">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    Crédito
                                </div>
                            </SelectItem>
                            <SelectItem value="debito">
                                <div className="flex items-center gap-2">
                                    <Wallet className="h-4 w-4" />
                                    Débito
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Banco e Bandeira */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CampoSelect
                    label="Banco emissor"
                    value={form.empresa}
                    onChange={(v) => handleChange("empresa", v)}
                    options={empresaOptions}
                />
                <CampoSelect
                    label="Bandeira"
                    value={form.bandeira}
                    onChange={(v) => handleChange("bandeira", v)}
                    options={bandeiraOptions}
                />
            </div>

            {/* ✅ CONTA VINCULADA - Crédito (opcional) ou Débito (obrigatório) */}
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {form.tipo === "credito" 
                            ? "Conta para pagamento da fatura" 
                            : "Conta vinculada"}
                    </p>
                    <Info className="h-4 w-4 text-gray-400" />
                    {form.tipo === "debito" && (
                        <span className="text-xs text-red-500 font-medium">Obrigatório</span>
                    )}
                </div>
                <Select
                    value={form.contaVinculadaId}
                    onValueChange={(v) => handleChange("contaVinculadaId", v)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={
                            form.tipo === "debito" 
                                ? "Selecione a conta vinculada" 
                                : "Selecione uma conta (opcional)"
                        } />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                        {form.tipo === "credito" && (
                            <SelectItem value="none">Nenhuma (definir depois)</SelectItem>
                        )}
                        {contasAtivas.length > 0 ? (
                            contasAtivas.map(conta => (
                                <SelectItem key={conta.id} value={conta.id}>
                                    {conta.nome} - R$ {Number(conta.saldoAtual).toFixed(2)}
                                    {conta.banco && ` (${conta.banco})`}
                                </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-accounts" disabled>
                                Nenhuma conta cadastrada
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>
                
                {/* ✅ Mensagens explicativas diferentes por tipo */}
                {form.tipo === "credito" ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        💡 Esta conta será usada como padrão para pagar a fatura do cartão
                    </p>
                ) : (
                    <Alert className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                            <p className="font-medium">Cartão de débito</p>
                            <p className="text-xs mt-1">
                                Transações com este cartão serão descontadas imediatamente da conta vinculada.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* ✅ Campos de crédito (só aparecem para tipo crédito) */}
            {form.tipo === "credito" && (
                <>
                    {/* Limite e Ativo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                            <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                Limite (R$)
                            </p>
                            <Input
                                type="number"
                                placeholder="R$ 0,00"
                                value={form.limite}
                                onChange={(e) => handleChange("limite", e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Ativo</p>
                            <Switch
                                checked={form.ativo}
                                onCheckedChange={(v) => handleChange("ativo", v)}
                            />
                        </div>
                    </div>

                    {/* Fechamento e Vencimento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                Dia de fechamento
                            </p>
                            <Input
                                type="number"
                                placeholder="Fechamento"
                                min="1"
                                max="31"
                                value={form.diaFechamento}
                                onChange={(e) =>
                                    handleChange("diaFechamento", e.target.value)
                                }
                            />
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                                Dia de vencimento
                            </p>
                            <Input
                                type="number"
                                placeholder="Vencimento"
                                min="1"
                                max="31"
                                value={form.diaVencimento}
                                onChange={(e) =>
                                    handleChange("diaVencimento", e.target.value)
                                }
                            />
                        </div>
                    </div>
                </>
            )}

            {/* ✅ Campo Ativo para débito */}
            {form.tipo === "debito" && (
                <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Ativo</p>
                    <Switch
                        checked={form.ativo}
                        onCheckedChange={(v) => handleChange("ativo", v)}
                    />
                </div>
            )}

            {/* Observações */}
            <div>
                <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Observações
                </p>
                <Textarea
                    placeholder="Informações adicionais, lembretes, regras do cartão, etc."
                    value={form.observacoes}
                    onChange={(e) => handleChange("observacoes", e.target.value)}
                    className="min-h-[80px]"
                />
            </div>

            {/* Botões */}
            <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>

                <Button type="submit" onClick={handleSubmit}>
                    {initialValues ? "Salvar" : "Adicionar"}
                </Button>
            </div>
        </div>
    );
}