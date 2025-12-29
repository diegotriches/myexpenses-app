"use client";

import { useState } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
    Save,
    X,
    Loader2,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Shield,
    Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
    usuarioId?: number;
}

type FormErrors = {
    senhaAtual?: string;
    novaSenha?: string;
    confirmarSenha?: string;
};

export default function AlterarSenhaCard({ usuarioId }: Props) {
    const [form, setForm] = useState({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [mostrarSenhas, setMostrarSenhas] = useState({
        atual: false,
        nova: false,
        confirmar: false,
    });
    const { toast } = useToast();

    // Validação de força da senha
    const calcularForcaSenha = (senha: string): number => {
        let forca = 0;

        if (senha.length >= 8) forca += 25;
        if (senha.length >= 12) forca += 10;
        if (/[a-z]/.test(senha)) forca += 15;
        if (/[A-Z]/.test(senha)) forca += 15;
        if (/[0-9]/.test(senha)) forca += 15;
        if (/[^a-zA-Z0-9]/.test(senha)) forca += 20;

        return Math.min(forca, 100);
    };

    const forcaSenha = calcularForcaSenha(form.novaSenha);

    const getCorForca = (forca: number): string => {
        if (forca < 40) return "[&>div]:bg-red-500";
        if (forca < 70) return "[&>div]:bg-yellow-500";
        return "[&>div]:bg-green-500";
    };

    const getTextoForca = (forca: number): string => {
        if (forca < 40) return "Fraca";
        if (forca < 70) return "Média";
        return "Forte";
    };

    // Requisitos de senha
    const requisitos = [
        { texto: "Mínimo de 8 caracteres", valido: form.novaSenha.length >= 8 },
        { texto: "Letra minúscula", valido: /[a-z]/.test(form.novaSenha) },
        { texto: "Letra maiúscula", valido: /[A-Z]/.test(form.novaSenha) },
        { texto: "Número", valido: /[0-9]/.test(form.novaSenha) },
        { texto: "Caractere especial (!@#$%)", valido: /[^a-zA-Z0-9]/.test(form.novaSenha) },
    ];

    const validarFormulario = (): boolean => {
        const novosErros: FormErrors = {};

        if (!form.senhaAtual || form.senhaAtual.trim() === "") {
            novosErros.senhaAtual = "Senha atual é obrigatória";
        }

        if (!form.novaSenha || form.novaSenha.trim() === "") {
            novosErros.novaSenha = "Nova senha é obrigatória";
        } else if (form.novaSenha.length < 8) {
            novosErros.novaSenha = "A senha deve ter no mínimo 8 caracteres";
        } else if (forcaSenha < 40) {
            novosErros.novaSenha = "Senha muito fraca. Use letras, números e símbolos";
        }

        if (form.novaSenha === form.senhaAtual) {
            novosErros.novaSenha = "A nova senha deve ser diferente da atual";
        }

        if (!form.confirmarSenha || form.confirmarSenha.trim() === "") {
            novosErros.confirmarSenha = "Confirme a nova senha";
        } else if (form.novaSenha !== form.confirmarSenha) {
            novosErros.confirmarSenha = "As senhas não coincidem";
        }

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm({ ...form, [field]: value });

        // Limpa erro do campo ao editar
        if (errors[field]) {
            setErrors({ ...errors, [field]: undefined });
        }

        // Limpa mensagem de sucesso ao editar
        if (sucesso) {
            setSucesso(false);
        }
    };

    const alterarSenha = async () => {
        if (!validarFormulario()) {
            return;
        }

        if (!usuarioId) {
            toast({
                title: "Erro",
                description: "ID do usuário não encontrado",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            setSucesso(false);

            await api.put(`/users/${usuarioId}/senha`, {
                senhaAtual: form.senhaAtual,
                novaSenha: form.novaSenha,
            });

            setSucesso(true);

            toast({
                title: "Senha alterada!",
                description: "Sua senha foi atualizada com sucesso.",
            });

            // Limpa formulário
            setForm({
                senhaAtual: "",
                novaSenha: "",
                confirmarSenha: "",
            });

            // Remove mensagem de sucesso após 5 segundos
            setTimeout(() => setSucesso(false), 5000);

        } catch (err: any) {
            console.error("Erro ao alterar senha:", err);

            let mensagemErro = "Erro ao alterar senha. Tente novamente.";

            if (err.response?.status === 401 || err.response?.status === 403) {
                mensagemErro = "Senha atual incorreta.";
                setErrors({ senhaAtual: "Senha incorreta" });
            } else if (err.response?.data?.message) {
                mensagemErro = err.response.data.message;
            }

            toast({
                title: "Erro ao alterar senha",
                description: mensagemErro,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const cancelar = () => {
        setForm({
            senhaAtual: "",
            novaSenha: "",
            confirmarSenha: "",
        });
        setErrors({});
        setSucesso(false);
    };

    const toggleMostrarSenha = (campo: keyof typeof mostrarSenhas) => {
        setMostrarSenhas({ ...mostrarSenhas, [campo]: !mostrarSenhas[campo] });
    };

    const temAlteracoes = form.senhaAtual || form.novaSenha || form.confirmarSenha;

    return (
        <div className="space-y-6">
            {/* Mensagem de Sucesso */}
            {sucesso && (
                <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                        Sua senha foi alterada com sucesso! Use a nova senha no próximo login.
                    </AlertDescription>
                </Alert>
            )}

            {/* Campos do Formulário */}
            <div className="space-y-4">
                {/* Senha Atual */}
                <div className="space-y-2">
                    <Label htmlFor="senhaAtual" className="flex items-center gap-1">
                        Senha Atual
                        <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input
                            id="senhaAtual"
                            type={mostrarSenhas.atual ? "text" : "password"}
                            value={form.senhaAtual}
                            onChange={(e) => handleChange("senhaAtual", e.target.value)}
                            placeholder="Digite sua senha atual"
                            className={errors.senhaAtual ? "border-red-500 pr-10" : "pr-10"}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => toggleMostrarSenha("atual")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            tabIndex={-1}
                        >
                            {mostrarSenhas.atual ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.senhaAtual && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} />
                            <span>{errors.senhaAtual}</span>
                        </div>
                    )}
                </div>

                {/* Nova Senha */}
                <div className="space-y-2">
                    <Label htmlFor="novaSenha" className="flex items-center gap-1">
                        Nova Senha
                        <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input
                            id="novaSenha"
                            type={mostrarSenhas.nova ? "text" : "password"}
                            value={form.novaSenha}
                            onChange={(e) => handleChange("novaSenha", e.target.value)}
                            placeholder="Digite sua nova senha"
                            className={errors.novaSenha ? "border-red-500 pr-10" : "pr-10"}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => toggleMostrarSenha("nova")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            tabIndex={-1}
                        >
                            {mostrarSenhas.nova ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.novaSenha && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} />
                            <span>{errors.novaSenha}</span>
                        </div>
                    )}

                    {/* Indicador de Força */}
                    {form.novaSenha && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">Força da senha:</span>
                                <span className={`font-semibold ${forcaSenha < 40 ? 'text-red-600' :
                                    forcaSenha < 70 ? 'text-yellow-600' :
                                        'text-green-600'
                                    }`}>
                                    {getTextoForca(forcaSenha)}
                                </span>
                            </div>
                            <Progress
                                value={forcaSenha}
                                className={`h-2 ${getCorForca(forcaSenha)}`}
                            />
                        </div>
                    )}

                    {/* Requisitos */}
                    {form.novaSenha && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                <Shield size={12} />
                                Requisitos de segurança:
                            </p>
                            <div className="space-y-1">
                                {requisitos.map((req, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                        {req.valido ? (
                                            <Check size={14} className="text-green-600 flex-shrink-0" />
                                        ) : (
                                            <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                        )}
                                        <span className={req.valido ? "text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>
                                            {req.texto}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirmar Nova Senha */}
                <div className="space-y-2">
                    <Label htmlFor="confirmarSenha" className="flex items-center gap-1">
                        Confirmar Nova Senha
                        <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input
                            id="confirmarSenha"
                            type={mostrarSenhas.confirmar ? "text" : "password"}
                            value={form.confirmarSenha}
                            onChange={(e) => handleChange("confirmarSenha", e.target.value)}
                            placeholder="Digite novamente a nova senha"
                            className={errors.confirmarSenha ? "border-red-500 pr-10" : "pr-10"}
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => toggleMostrarSenha("confirmar")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            tabIndex={-1}
                        >
                            {mostrarSenhas.confirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.confirmarSenha && (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                            <AlertCircle size={12} />
                            <span>{errors.confirmarSenha}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Ações */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                    variant="outline"
                    onClick={cancelar}
                    disabled={!temAlteracoes || loading}
                    className="flex-1 sm:flex-initial"
                >
                    <X size={16} className="mr-2" />
                    Cancelar
                </Button>
                <Button
                    onClick={alterarSenha}
                    disabled={!temAlteracoes || loading}
                    className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Alterando...
                        </>
                    ) : (
                        <>
                            <Save size={16} className="mr-2" />
                            Alterar Senha
                        </>
                    )}
                </Button>
            </div>

            {/* Dicas de Segurança */}
            <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription className="text-xs">
                    <strong>Dicas de segurança:</strong> Use uma senha única que você não usa em outros sites.
                    Considere usar um gerenciador de senhas para criar e guardar senhas fortes.
                </AlertDescription>
            </Alert>
        </div>
    );
}