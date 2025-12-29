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
  Tag
} from "lucide-react";
import { Categoria } from "app/(dashboard)/categorias/page";
import api from "@/services/api";
import { iconOptions } from "@/utils/iconOptions";
import IconPickerModal from "@/components/categorias/IconPickerModal";
import { useToast } from "@/hooks/use-toast";

type Props = {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
  refresh: () => void;
};

type FormErrors = {
  nome?: string;
  tipo?: string;
};

export default function CategoriaFormModal({
  aberto,
  onClose,
  categoria,
  refresh,
}: Props) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [icon, setIcon] = useState("FaWallet");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const { toast } = useToast();

  useEffect(() => {
    if (aberto) {
      if (categoria) {
        setNome(categoria.nome);
        setTipo(categoria.tipo);
        setIcon(categoria.icon);
      } else {
        setNome("");
        setTipo("entrada");
        setIcon("FaWallet");
      }
      setErrors({});
    }
  }, [categoria, aberto]);

  const validarFormulario = (): boolean => {
    const novosErros: FormErrors = {};

    if (!nome || nome.trim() === "") {
      novosErros.nome = "Nome é obrigatório";
    } else if (nome.trim().length < 2) {
      novosErros.nome = "Nome deve ter pelo menos 2 caracteres";
    }

    if (!tipo) {
      novosErros.tipo = "Selecione o tipo da categoria";
    }

    setErrors(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleNomeChange = (value: string) => {
    setNome(value);
    if (errors.nome) {
      setErrors({ ...errors, nome: undefined });
    }
  };

  const handleTipoChange = (value: "entrada" | "saida") => {
    setTipo(value);
    if (errors.tipo) {
      setErrors({ ...errors, tipo: undefined });
    }
  };

  const salvar = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);

      const payload = { 
        nome: nome.trim(), 
        tipo, 
        icon 
      };

      if (categoria) {
        await api.put(`/categorias/${categoria.id}`, payload);
        toast({
          title: "Categoria atualizada!",
          description: `"${nome}" foi atualizada com sucesso.`,
        });
      } else {
        await api.post("/categorias", payload);
        toast({
          title: "Categoria criada!",
          description: `"${nome}" foi adicionada com sucesso.`,
        });
      }

      refresh();
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      
      const mensagem = err.response?.data?.message ||
                      err.response?.data?.error ||
                      "Erro ao salvar categoria. Tente novamente.";
      
      toast({
        title: "Erro ao salvar",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const IconComp = iconOptions.find(i => i.name === icon)?.component;

  return (
    <>
      <Dialog open={aberto} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Tag className="text-blue-600" size={24} />
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
              <Label htmlFor="nome" className="flex items-center gap-1">
                Nome da Categoria
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                type="text"
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                placeholder="Ex: Alimentação, Transporte, Saúde"
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
                >
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-green-600" />
                      <span>Receita</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="saida">
                    <div className="flex items-center gap-2">
                      <TrendingDown size={14} className="text-red-600" />
                      <span>Despesa</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.tipo && (
                <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
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
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                  tipo === "entrada" 
                    ? "from-green-500 to-green-600" 
                    : "from-red-500 to-red-600"
                } flex items-center justify-center shadow-md flex-shrink-0`}>
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
                  className="flex-1"
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
            >
              <X size={16} className="mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={loading || !nome.trim()}
              className="bg-blue-600 hover:bg-blue-700"
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
        onSelect={(iconName) => setIcon(iconName)}
      />
    </>
  );
}