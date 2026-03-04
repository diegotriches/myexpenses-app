"use client";

import { useCategorias } from "@/hooks/useCategorias";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { iconOptions } from "@/utils/iconOptions";
import { AlertCircle, Folder, Tag } from "lucide-react";

interface Props {
  form: {
    tipo: "entrada" | "saida";
    categoria: string;
  };
  update: (k: string, v: any) => void;
  error?: string;
}

export default function MovCampoCategoria({ form, update, error }: Props) {
  const { data: categorias = [], isLoading, error: queryError } = useCategorias();

  const categoriasFiltradas = categorias.filter(
    (c) => c.tipo === form.tipo || c.tipo === "ambos"
  );

  const getIconComponent = (iconName: string | undefined) => {
    const found = iconOptions.find((i) => i.name === iconName);
    return found ? found.component : null;
  };

  const categoriaSelecionada = categoriasFiltradas.find(
    (c) => c.nome === form.categoria
  );

  const getCorGradiente = (tipo: "entrada" | "saida" | "ambos") => {
    if (tipo === "entrada") return "from-green-500 to-green-600 dark:from-green-600 dark:to-green-700";
    if (tipo === "saida") return "from-red-500 to-red-600 dark:from-red-600 dark:to-red-700";
    return "from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700";
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</Label>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
    );
  }

  if (queryError) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</Label>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-800 dark:text-red-300">
            {queryError instanceof Error ? queryError.message : "Erro ao carregar categorias"}
          </span>
        </div>
      </div>
    );
  }

  if (categoriasFiltradas.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</Label>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 flex items-start gap-2">
          <Folder className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Nenhuma categoria disponível</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Cadastre categorias de {form.tipo === "entrada" ? "receita" : "despesa"} na página de Categorias
            </p>
          </div>
        </div>
      </div>
    );
  }

  const Icon = categoriaSelecionada ? getIconComponent(categoriaSelecionada.icone) : null;
  const gradiente = categoriaSelecionada
    ? getCorGradiente(categoriaSelecionada.tipo)
    : error
    ? "from-red-400 to-red-500"
    : "from-gray-400 to-gray-500";

  const triggerErrorClass = error
    ? "border-red-500 dark:border-red-500 focus:ring-red-500"
    : "";

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Categoria <span className="text-red-500">*</span>
      </Label>

      <div className="flex items-center gap-4">
        <div className={`w-13 h-13 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center shadow-md flex-shrink-0`}>
          {Icon ? <Icon size={28} className="text-white" /> : <Tag size={28} className="text-white" />}
        </div>

        <div className="flex-1 space-y-1">
          <Select value={form.categoria} onValueChange={(v) => update("categoria", v)}>
            <SelectTrigger className={`dark:bg-gray-800 dark:border-gray-700 h-12 flex-1 ${triggerErrorClass}`}>
              <SelectValue placeholder="Selecione a categoria">
                {categoriaSelecionada && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {categoriaSelecionada.nome}
                    </span>
                    {categoriaSelecionada.tipo === "ambos" && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">(Universal)</span>
                    )}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>

            <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-[300px]">
              {categoriasFiltradas.map((c) => {
                const IconItem = getIconComponent(c.icone);
                const gradienteItem = getCorGradiente(c.tipo);
                return (
                  <SelectItem key={c.id} value={c.nome} className="dark:hover:bg-gray-700 py-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradienteItem} flex items-center justify-center shadow-sm flex-shrink-0`}>
                        {IconItem ? <IconItem size={16} className="text-white" /> : <Tag size={16} className="text-white" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{c.nome}</span>
                        {c.tipo === "ambos" && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Universal</span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {error && <p className="text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
        </div>
      </div>
    </div>
  );
}