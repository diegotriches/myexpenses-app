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

import { Cartao, TipoCartao } from "@/types/cartao";
import { bandeiraOptions, empresaOptions } from "@/utils/cartoes/cartaoOptions";
import CampoSelect from "./CampoSelect";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export interface CartaoFormValues extends Partial<Cartao> {}

interface Props {
    initialValues: Cartao | null;
    onSubmit: (values: CartaoFormValues) => Promise<void>;
    onCancel?: () => void;
}

export default function CartaoForm({ initialValues, onSubmit, onCancel }: Props) {
    const [form, setForm] = useState({
        nome: "",
        tipo: "credito" as TipoCartao,
        bandeira: "",
        empresa: "",
        limite: "",
        limiteDisponivel: "",
        diaFechamento: "",
        diaVencimento: "",
        cor: "#4F46E5",
        ativo: true,
        observacoes: "",
        ultimosDigitos: "",
    });

    useEffect(() => {
        if (initialValues) {
            setForm({
                nome: initialValues.nome,
                tipo: initialValues.tipo,
                bandeira: initialValues.bandeira,
                empresa: initialValues.empresa || "",
                limite: initialValues.limite?.toString() ?? "",
                limiteDisponivel: initialValues.limiteDisponivel?.toString() ?? "",
                diaFechamento: initialValues.diaFechamento?.toString() ?? "",
                diaVencimento: initialValues.diaVencimento?.toString() ?? "",
                cor: initialValues.cor || "#4F46E5",
                ativo: initialValues.ativo,
                observacoes: initialValues.observacoes ?? "",
                ultimosDigitos: initialValues.ultimosDigitos ?? "",
            });
        }
    }, [initialValues]);

    function handleChange(field: string, value: any) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSubmit() {
        const payload: CartaoFormValues = {
            ...form,
            limite: form.tipo === "credito" ? Number(form.limite) : 0,
            limiteDisponivel:
                form.tipo === "credito" ? Number(form.limiteDisponivel) : 0,
            diaFechamento:
                form.tipo === "credito" ? Number(form.diaFechamento) : undefined,
            diaVencimento:
                form.tipo === "credito" ? Number(form.diaVencimento) : undefined,
        };

        await onSubmit(payload);
    }

    return (
        <div className="space-y-3">

            {/* Descrição do modal */}
            <p className="text-gray-600 text-sm">
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
                            <SelectItem value="multiplo">Múltiplo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Cor (na posição antiga do Tipo) + Ativo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div>
                    <p className="text-sm font-medium mb-1">Cor do cartão</p>
                    <input
                        type="color"
                        value={form.cor}
                        onChange={(e) => handleChange("cor", e.target.value)}
                        className="h-10 w-20 rounded cursor-pointer border border-gray-300"
                    />
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <p className="text-sm font-medium">Ativo</p>
                    <Switch
                        checked={form.ativo}
                        onCheckedChange={(v) => handleChange("ativo", v)}
                    />
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

            {/* Últimos dígitos + Limite */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p className="text-sm font-medium mb-1">Últimos 4 dígitos</p>
                    <Input
                        placeholder="1234"
                        maxLength={4}
                        value={form.ultimosDigitos}
                        onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            handleChange("ultimosDigitos", v);
                        }}
                    />
                </div>

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
