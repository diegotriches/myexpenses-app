"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  usuario: { id?: number; nome: string; email: string };
  atualizarUsuario: (dados: { nome?: string; email?: string }) => void;
}

type FormErrors = {
  nome?: string;
  email?: string;
};

export default function EditarDadosCard({ usuario, atualizarUsuario }: Props) {
  const [form, setForm] = useState({ nome: usuario.nome, email: usuario.email });
  const [usuarioOriginal, setUsuarioOriginal] = useState({ nome: usuario.nome, email: usuario.email });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setForm({ nome: usuario.nome, email: usuario.email });
    setUsuarioOriginal({ nome: usuario.nome, email: usuario.email });
  }, [usuario]);

  // Verifica se houve alterações
  const temAlteracoes = () => {
    return form.nome !== usuarioOriginal.nome || form.email !== usuarioOriginal.email;
  };

  // Validação de email
  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Validação do formulário
  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {};

    if (!form.nome || form.nome.trim() === "") {
      novosErros.nome = "Nome é obrigatório";
    } else if (form.nome.trim().length < 2) {
      novosErros.nome = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!form.email || form.email.trim() === "") {
      novosErros.email = "Email é obrigatório";
    } else if (!validarEmail(form.email)) {
      novosErros.email = "Email inválido";
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

      const payload = {
        name: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
      };

      const res = await api.put(`/users/${usuario.id}`, payload);

      // Atualiza estado local
      atualizarUsuario({
        nome: res.data.name || res.data.nome,
        email: res.data.email,
      });

      setUsuarioOriginal({ 
        nome: res.data.name || res.data.nome, 
        email: res.data.email 
      });

      setSucesso(true);
      
      toast({
        title: "Sucesso!",
        description: "Seus dados foram atualizados com sucesso.",
      });

      // Remove mensagem de sucesso após 3 segundos
      setTimeout(() => setSucesso(false), 3000);

    } catch (err: any) {
      console.error("Erro ao salvar dados:", err);
      
      const mensagemErro = err.response?.data?.message || 
                          err.response?.data?.error ||
                          "Erro ao salvar dados. Tente novamente.";
      
      // Verifica se é erro de email duplicado
      if (mensagemErro.toLowerCase().includes("email") && 
          mensagemErro.toLowerCase().includes("já existe")) {
        setErrors({ email: "Este email já está em uso" });
      }

      toast({
        title: "Erro ao salvar",
        description: mensagemErro,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelarEdicoes = () => {
    setForm({ 
      nome: usuarioOriginal.nome, 
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
          <Label htmlFor="nome" className="flex items-center gap-1">
            Nome Completo
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="nome"
            type="text"
            value={form.nome}
            onChange={(e) => handleChange("nome", e.target.value)}
            placeholder="Seu nome completo"
            className={errors.nome ? "border-red-500" : ""}
            disabled={loading}
          />
          {errors.nome && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={12} />
              <span>{errors.nome}</span>
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
            disabled={loading}
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
          disabled={!temAlteracoes() || loading}
          className="flex-1 sm:flex-initial"
        >
          <X size={16} className="mr-2" />
          Cancelar
        </Button>
        <Button
          onClick={salvarCampos}
          disabled={!temAlteracoes() || loading}
          className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700"
        >
          {loading ? (
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
          Para alterar sua senha, utilize a aba <strong>Senha</strong> no menu acima.
        </AlertDescription>
      </Alert>
    </div>
  );
}