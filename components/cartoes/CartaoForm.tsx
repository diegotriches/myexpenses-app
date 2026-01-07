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

import { Cartao } from "@/types/cartao";

// ✅ Definir tipo localmente (ou adicionar em @/types/cartao)
type TipoCartao = "credito" | "debito";
import { bandeiraOptions, empresaOptions } from "@/utils/cartaoOptions";
import CampoSelect from "./CampoSelect";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useContas } from "@/hooks/useContas";
import { Info } from "lucide-react";

export interface CartaoFormValues extends Partial<Cartao> { }

interface Props {
    initialValues: Cartao | null;
    onSubmit: (values: CartaoFormValues) => Promise<void>;
    onCancel?: () => void;
}

export default function CartaoForm({ initialValues, onSubmit, onCancel }: Props) {
    const { contas } = useContas();

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
                // ✅ CORRIGIDO: Converter string para number antes de exibir
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
        setForm((f) => ({ ...f, [field]: value }));
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

        const payload: CartaoFormValues = {
            nome: form.nome,
            tipo: form.tipo,
            bandeira: form.bandeira || undefined,
            empresa: form.empresa || undefined,
            // ✅ CORRIGIDO: Manter como string (será enviada como string para a API)
            limite: form.tipo === "credito" ? form.limite : "0",
            diaFechamento:
                form.tipo === "credito" ? Number(form.diaFechamento) : undefined,
            diaVencimento:
                form.tipo === "credito" ? Number(form.diaVencimento) : undefined,
            ativo: form.ativo,
            observacoes: form.observacoes || undefined,
            contaVinculadaId: form.contaVinculadaId === "none" ? null : form.contaVinculadaId,
        };

        await onSubmit(payload);
    }

    // Filtrar apenas contas ativas
    const contasAtivas = contas.filter(c => c.ativo);

    return (
        <div className="space-y-3">
            {/* Descrição do modal */}
            <p className="text-gray-600 dark:text-gray-400 text-sm">
                Preencha os dados abaixo para cadastrar ou editar um cartão.
            </p>

            {/* Nome + Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                    <p className="text-sm font-medium mb-1">Nome</p>
                    <Input
                        placeholder="Nome do cartão"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)}
                    />
                </div>

                <div>
                    <p className="text-sm font-medium mb-1">Tipo</p>
                    <Select
                        value={form.tipo}
                        onValueChange={(v: TipoCartao) => handleChange("tipo", v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="credito">Crédito</SelectItem>
                            <SelectItem value="debito">Débito</SelectItem>
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

            {/* Conta Vinculada (só para crédito) */}
            {form.tipo === "credito" && (
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">Conta para pagamento da fatura</p>
                        <Info className="h-4 w-4 text-gray-400" />
                    </div>
                    <Select
                        value={form.contaVinculadaId}
                        onValueChange={(v) => handleChange("contaVinculadaId", v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione uma conta (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Nenhuma (definir depois)</SelectItem>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        💡 Esta conta será usada como padrão para pagar a fatura do cartão
                    </p>
                </div>
            )}

            {/* Limite e Ativo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {form.tipo === "credito" && (
                    <div>
                        <p className="text-sm font-medium mb-1">Limite (R$)</p>
                        <Input
                            type="number"
                            placeholder="R$ 0,00"
                            value={form.limite}
                            onChange={(e) => handleChange("limite", e.target.value)}
                        />
                    </div>
                )}
                <div className="flex items-center gap-3 pt-2">
                    <p className="text-sm font-medium">Ativo</p>
                    <Switch
                        checked={form.ativo}
                        onCheckedChange={(v) => handleChange("ativo", v)}
                    />
                </div>
            </div>

            {/* Fechamento e Vencimento */}
            {form.tipo === "credito" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm font-medium mb-1">Dia de fechamento</p>
                        <Input
                            type="number"
                            placeholder="Fechamento"
                            value={form.diaFechamento}
                            onChange={(e) =>
                                handleChange("diaFechamento", e.target.value)
                            }
                        />
                    </div>

                    <div>
                        <p className="text-sm font-medium mb-1">Dia de vencimento</p>
                        <Input
                            type="number"
                            placeholder="Vencimento"
                            value={form.diaVencimento}
                            onChange={(e) =>
                                handleChange("diaVencimento", e.target.value)
                            }
                        />
                    </div>
                </div>
            )}

            {/* Observações */}
            <div>
                <p className="text-sm font-medium mb-1">Observações</p>
                <Textarea
                    placeholder="Informações adicionais, lembretes, regras do cartão, etc."
                    value={form.observacoes}
                    onChange={(e) => handleChange("observacoes", e.target.value)}
                    className="min-h-[80px]"
                />
            </div>

            {/* Botões */}
            <div className="pt-4 flex justify-end gap-3">
                <Button type="button" className="cursor-pointer" variant="outline" onClick={onCancel}>
                    Cancelar
                </Button>

                <Button type="submit" className="cursor-pointer" onClick={handleSubmit}>
                    {initialValues ? "Salvar" : "Adicionar"}
                </Button>
            </div>
        </div>
    );
}