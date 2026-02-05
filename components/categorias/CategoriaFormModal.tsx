"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Tag,
  Check,
  ChevronRight,
} from "lucide-react";
import { Categoria } from "@/types/categoria";
import { iconOptions } from "@/utils/iconOptions";
import IconPickerModal from "@/components/categorias/IconPickerModal";

import { useCriarCategoria, useAtualizarCategoria } from "@/hooks/useCategorias";

type Props = {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
};

type FormErrors = {
  nome?: string;
  tipo?: string;
};

export default function CategoriaFormModal({
  aberto,
  onClose,
  categoria,
}: Props) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [icone, setIcone] = useState("FaWallet");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // React Query hooks
  const criarCategoria = useCriarCategoria();
  const atualizarCategoria = useAtualizarCategoria();

  const loading = criarCategoria.isPending || atualizarCategoria.isPending;

  useEffect(() => {
    if (aberto) {
      if (categoria) {
        setNome(categoria.nome);
        // Se a categoria for "ambos", converte para "entrada" por padrão
        setTipo(categoria.tipo === "ambos" ? "entrada" : categoria.tipo);
        setIcone(categoria.icone);
      } else {
        setNome("");
        setTipo("entrada");
        setIcone("FaWallet");
      }
      setErrors({});
      setTouched({});
    }
  }, [categoria, aberto]);

  const validarCampo = (campo: "nome" | "tipo", valor: string): string | undefined => {
    if (campo === "nome") {
      if (!valor || valor.trim() === "") {
        return "Nome é obrigatório";
      }
      if (valor.trim().length < 2) {
        return "Nome deve ter pelo menos 2 caracteres";
      }
      if (valor.trim().length > 50) {
        return "Nome deve ter no máximo 50 caracteres";
      }
      if (!/^[a-zA-ZÀ-ÿ0-9\s-]+$/.test(valor)) {
        return "Apenas letras, números, espaços e hífens são permitidos";
      }
    }
    
    if (campo === "tipo" && !valor) {
      return "Selecione o tipo da categoria";
    }
    
    return undefined;
  };

  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {
      nome: validarCampo("nome", nome),
      tipo: validarCampo("tipo", tipo),
    };

    Object.keys(novosErros).forEach(key => {
      if (!novosErros[key as keyof FormErrors]) {
        delete novosErros[key as keyof FormErrors];
      }
    });

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleNomeChange = (value: string) => {
    setNome(value);
    
    if (touched.nome) {
      const erro = validarCampo("nome", value);
      setErrors(prev => ({ ...prev, nome: erro }));
    }
  };

  const handleNomeBlur = () => {
    setTouched(prev => ({ ...prev, nome: true }));
    const erro = validarCampo("nome", nome);
    setErrors(prev => ({ ...prev, nome: erro }));
  };

  const handleTipoChange = (value: "entrada" | "saida") => {
    setTipo(value);
    setTouched(prev => ({ ...prev, tipo: true }));
    setErrors(prev => ({ ...prev, tipo: undefined }));
  };

  const salvar = async () => {
    setTouched({ nome: true, tipo: true });
    
    if (!validarFormulario()) {
      return;
    }

    const payload = { 
      nome: nome.trim(), 
      tipo, 
      icone,
    };

    try {
      if (categoria) {
        await atualizarCategoria.mutateAsync({
          id: categoria.id,
          dados: payload
        });
      } else {
        await criarCategoria.mutateAsync(payload);
      }
      
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && nome.trim()) {
      e.preventDefault();
      salvar();
    }
  };

  const IconComp = iconOptions.find(i => i.name === icone)?.component;
  const iconeSelecionado = iconOptions.find(i => i.name === icone);

  const getCorGradiente = () => {
    if (tipo === "entrada") {
      return "from-green-500 to-green-600 dark:from-green-600 dark:to-green-700";
    } else {
      return "from-red-500 to-red-600 dark:from-red-600 dark:to-red-700";
    }
  };

  const isNomeValido = nome.trim().length >= 2 && !errors.nome;
  const temErros = Object.keys(errors).length > 0;

  return (
    <>
      <Dialog open={aberto} onOpenChange={handleClose}>
        <DialogContent className="h-[100dvh] md:h-auto sm:max-w-[550px] p-0 gap-0 flex flex-col">
          {/* Header Fixo */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b dark:border-gray-800 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <Tag className="text-blue-600 dark:text-blue-400" size={24} />
              {categoria ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
              {categoria
                ? "Atualize os detalhes da categoria selecionada"
                : "Preencha as informações para criar uma nova categoria"}
            </DialogDescription>
          </DialogHeader>

          {/* Conteúdo Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* Nome */}
              <div>
                <Label htmlFor="nome" className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome da Categoria
                    <span className="text-red-500">*</span>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {nome.length}/50
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => handleNomeChange(e.target.value)}
                    onBlur={handleNomeBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Alimentação, Transporte, Saúde"
                    className={`pr-10 ${
                      errors.nome 
                        ? "border-red-500 dark:border-red-500" 
                        : touched.nome && isNomeValido 
                        ? "border-green-500 dark:border-green-500" 
                        : ""
                    }`}
                    disabled={loading}
                    maxLength={50}
                    aria-invalid={!!errors.nome}
                    aria-describedby={errors.nome ? "nome-error" : undefined}
                  />
                  {touched.nome && isNomeValido && !loading && (
                    <Check 
                      size={16} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-400"
                      aria-hidden="true"
                    />
                  )}
                </div>
                {errors.nome && (
                  <div 
                    id="nome-error" 
                    className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1"
                    role="alert"
                  >
                    <AlertCircle size={12} />
                    <span>{errors.nome}</span>
                  </div>
                )}
              </div>

              {/* Tipo - Botões Visuais */}
              <div>
                <Label className="flex items-center gap-1 mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo da Categoria
                  <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Botão Receita */}
                  <button
                    type="button"
                    onClick={() => handleTipoChange("entrada")}
                    disabled={loading}
                    className={`
                      h-24 border-2 rounded-lg transition-all duration-200
                      flex flex-col items-center justify-center gap-2
                      ${
                        tipo === "entrada"
                          ? "border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400"
                          : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
                      }
                      ${loading ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <TrendingUp
                      className={`h-8 w-8 ${
                        tipo === "entrada"
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        tipo === "entrada"
                          ? "text-green-700 dark:text-green-300"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      Receita
                    </span>
                  </button>

                  {/* Botão Despesa */}
                  <button
                    type="button"
                    onClick={() => handleTipoChange("saida")}
                    disabled={loading}
                    className={`
                      h-24 border-2 rounded-lg transition-all duration-200
                      flex flex-col items-center justify-center gap-2
                      ${
                        tipo === "saida"
                          ? "border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400"
                          : "border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-600"
                      }
                      ${loading ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <TrendingDown
                      className={`h-8 w-8 ${
                        tipo === "saida"
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    />
                    <span
                      className={`text-sm font-medium ${
                        tipo === "saida"
                          ? "text-red-700 dark:text-red-300"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      Despesa
                    </span>
                  </button>
                </div>
                {errors.tipo && (
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
                    <AlertCircle size={12} />
                    <span>{errors.tipo}</span>
                  </div>
                )}
              </div>

              {/* Ícone */}
              <div>
                <Label className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ícone da Categoria
                </Label>
                
                {/* Preview grande do ícone + botão */}
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getCorGradiente()} flex items-center justify-center shadow-md flex-shrink-0`}>
                    {IconComp ? (
                      <IconComp size={28} className="text-white" />
                    ) : (
                      <Tag size={28} className="text-white" />
                    )}
                  </div>

                  {/* Info + Botão */}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => setIconPickerOpen(true)}
                      disabled={loading}
                      className={`
                        w-full h-14 px-4 border rounded-lg
                        flex items-center justify-between
                        transition-colors duration-200
                        border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500
                        bg-white dark:bg-gray-800
                        ${loading ? "opacity-50 cursor-not-allowed" : ""}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        {IconComp && (
                          <IconComp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        )}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {iconeSelecionado?.name || "Selecionar ícone"}
                        </span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  💡 Escolha um ícone para representar visualmente esta categoria
                </p>
              </div>

              {/* Info */}
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs">
                  <p className="font-medium">Organize suas finanças</p>
                  <p className="mt-0.5">
                    Categorias ajudam a organizar suas transações e gerar relatórios mais precisos.
                  </p>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Footer Fixo - Botões Lado a Lado */}
          <div className="px-6 py-4 border-t dark:border-gray-800 shrink-0">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={salvar}
                disabled={loading || temErros || !nome.trim() || nome.trim().length < 2}
                className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>{categoria ? "Salvar Alterações" : "Criar Categoria"}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <IconPickerModal
        aberto={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(iconName) => setIcone(iconName)}
        iconeAtual={icone}
      />
    </>
  );
}