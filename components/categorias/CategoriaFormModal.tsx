"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  X, 
  Loader2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Tag,
  Check
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
  const [tipo, setTipo] = useState<"entrada" | "saida" | "ambos">("entrada");
  const [icone, setIcone] = useState("FaWallet");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  // ✅ NOVO: Validação em tempo real
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // React Query hooks
  const criarCategoria = useCriarCategoria();
  const atualizarCategoria = useAtualizarCategoria();

  const loading = criarCategoria.isPending || atualizarCategoria.isPending;

  useEffect(() => {
    if (aberto) {
      if (categoria) {
        setNome(categoria.nome);
        setTipo(categoria.tipo);
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

  // ✅ MELHORADO: Validação com feedback mais detalhado
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
      // ✅ NOVO: Validar caracteres especiais inválidos
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

    // Remove erros undefined
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
    
    // ✅ NOVO: Validação em tempo real após campo ser "touched"
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

  const handleTipoChange = (value: "entrada" | "saida" | "ambos") => {
    setTipo(value);
    
    // ✅ Limpa erro imediatamente ao selecionar
    setErrors(prev => ({ ...prev, tipo: undefined }));
  };

  const salvar = async () => {
    // Marca todos como touched
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

  // ✅ NOVO: Enter para salvar (UX)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && nome.trim()) {
      e.preventDefault();
      salvar();
    }
  };

  const IconComp = iconOptions.find(i => i.name === icone)?.component;

  const getCorGradiente = () => {
    if (tipo === "entrada") {
      return "from-green-500 to-green-600 dark:from-green-600 dark:to-green-700";
    } else if (tipo === "saida") {
      return "from-red-500 to-red-600 dark:from-red-600 dark:to-red-700";
    } else {
      return "from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700";
    }
  };

  // ✅ NOVO: Indicador visual de campo válido
  const isNomeValido = nome.trim().length >= 2 && !errors.nome;

  return (
    <>
      <Dialog open={aberto} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Tag className="text-blue-600 dark:text-blue-400" size={24} />
              {categoria ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {categoria
                ? "Altere os detalhes da categoria selecionada"
                : "Preencha as informações para criar uma nova categoria"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  Nome da Categoria
                  <span className="text-red-500">*</span>
                </span>
                {/* ✅ NOVO: Indicador de caracteres */}
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
                  className={`pr-10 ${errors.nome ? "border-red-500" : touched.nome && isNomeValido ? "border-green-500" : ""}`}
                  disabled={loading}
                  maxLength={50}
                  aria-invalid={!!errors.nome}
                  aria-describedby={errors.nome ? "nome-error" : undefined}
                />
                {/* ✅ NOVO: Check verde quando válido */}
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
                  className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
                  role="alert"
                >
                  <AlertCircle size={12} />
                  <span>{errors.nome}</span>
                </div>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo" className="flex items-center gap-1">
                Tipo da Categoria
                <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={tipo} 
                onValueChange={handleTipoChange}
                disabled={loading}
              >
                <SelectTrigger 
                  id="tipo" 
                  className={errors.tipo ? "border-red-500" : ""}
                  aria-invalid={!!errors.tipo}
                >
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-green-600 dark:text-green-400" />
                      <span>Receita</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="saida">
                    <div className="flex items-center gap-2">
                      <TrendingDown size={14} className="text-red-600 dark:text-red-400" />
                      <span>Despesa</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ambos">
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-blue-600 dark:text-blue-400" />
                      <span>Ambos (Receita e Despesa)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  <AlertCircle size={12} />
                  <span>{errors.tipo}</span>
                </div>
              )}
            </div>

            {/* Ícone */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex items-center gap-3">
                {/* Preview do ícone */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCorGradiente()} flex items-center justify-center shadow-md flex-shrink-0`}>
                  {IconComp ? (
                    <IconComp size={24} className="text-white" />
                  ) : (
                    <Tag size={24} className="text-white" />
                  )}
                </div>

                {/* Botão selecionar */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIconPickerOpen(true)}
                  disabled={loading}
                  className="flex-1 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Selecionar Ícone
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Escolha um ícone para representar visualmente esta categoria
              </p>
            </div>

            {/* Info */}
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
                Categorias ajudam a organizar suas transações e gerar relatórios mais precisos.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <X size={16} className="mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={loading || !nome.trim() || nome.trim().length < 2}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Salvar Categoria
                </>
              )}
            </Button>
          </DialogFooter>
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