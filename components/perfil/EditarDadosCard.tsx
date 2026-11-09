"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAtualizarProfile } from "@/hooks/useProfile";
import type { Usuario } from "@/types/profile";

interface Props {
  usuario: Usuario;
}

type FormErrors = {
  name?: string;
  email?: string;
};

export default function EditarDadosCard({ usuario }: Props) {
  const [form, setForm] = useState({ name: usuario.name, email: usuario.email });
  const [usuarioOriginal, setUsuarioOriginal] = useState({ name: usuario.name, email: usuario.email });
  const [errors, setErrors] = useState<FormErrors>({});
  const [sucesso, setSucesso] = useState(false);

  // React Query Mutation
  const atualizarProfile = useAtualizarProfile();

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [usuario];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    setForm({ name: usuario.name, email: usuario.email });
    setUsuarioOriginal({ name: usuario.name, email: usuario.email });
  }

  // Verifica se houve alterações
  const temAlteracoes = () => {
    return form.name !== usuarioOriginal.name || form.email !== usuarioOriginal.email;
  };

  // Validação de email
  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Validação do formulário
  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {};

    if (!form.name || form.name.trim() === "") {
      novosErros.name = "Nome é obrigatório";
    } else if (form.name.trim().length < 2) {
      novosErros.name = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!form.email || form.email.trim() === "") {
      novosErros.email = "Email é obrigatório";
    } else if (!validarEmail(form.email)) {
      novosErros.email = "E-mail inválido";
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

  const salvarCampos = async () => {
    if (!validarFormulario()) {
      return;
    }

    if (!usuario.id) {
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
      };

      await atualizarProfile.mutateAsync({
        userId: usuario.id,
        dados: payload,
      });

      setUsuarioOriginal({ 
        name: form.name.trim(), 
        email: form.email.trim().toLowerCase(),
      });

      setSucesso(true);

      // Remove mensagem de sucesso após 3 segundos
      setTimeout(() => setSucesso(false), 3000);

    } catch (err: any) {
      console.error("Erro ao salvar dados:", err);
      
      // Verifica se é erro de email duplicado
      if (err.message?.toLowerCase().includes("email") && 
          err.message?.toLowerCase().includes("já existe")) {
        setErrors({ email: "Este email já está em uso" });
      }
    }
  };

  const cancelarEdicoes = () => {
    setForm({ 
      name: usuarioOriginal.name, 
      email: usuarioOriginal.email 
    });
    setErrors({});
    setSucesso(false);
  };

  return (
    <div className="space-y-6">
      {/* Mensagem de Sucesso */}
      {sucesso && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Suas informações foram atualizadas com sucesso!
          </AlertDescription>
        </Alert>
      )}

      {/* Campos do Formulário */}
      <div className="space-y-4">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-1">
            Nome Completo
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Seu nome completo"
            className={errors.name ? "border-red-500" : ""}
            disabled={atualizarProfile.isPending}
          />
          {errors.name && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              <span>{errors.name}</span>
            </div>
          )}
        </div>

        {/* E-mail */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1">
            E-mail
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="seu@email.com"
            className={errors.email ? "border-red-500" : ""}
            disabled={atualizarProfile.isPending}
          />
          {errors.email && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              <span>{errors.email}</span>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Certifique-se de que tem acesso a este email
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          variant="outline"
          onClick={cancelarEdicoes}
          disabled={!temAlteracoes() || atualizarProfile.isPending}
          className="flex-1 sm:flex-initial"
        >
          <X size={16} className="mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={salvarCampos}
          disabled={!temAlteracoes() || atualizarProfile.isPending}
          className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700"
        >
          {atualizarProfile.isPending ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* Informação sobre senha */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Para alterar sua senha, utilize a aba <strong>Segurança</strong> no menu acima.
        </AlertDescription>
      </Alert>
    </div>
  );
}