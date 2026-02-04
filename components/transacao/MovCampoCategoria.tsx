"use client";

import { useCategorias } from "@/hooks/useCategorias";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { iconOptions } from "@/utils/iconOptions";
import { AlertCircle, Folder } from "lucide-react";

interface Props {
  form: {
    tipo: "entrada" | "saida";
    categoria: string;
  };
  update: (k: string, v: any) => void;
}

export default function MovCampoCategoria({ form, update }: Props) {
  const { data: categorias = [], isLoading, error } = useCategorias();

  // Filtra categorias pelo tipo (entrada/saida) OU tipo "ambos"
  const categoriasFiltradas = categorias.filter(
    (c) => c.tipo === form.tipo || c.tipo === "ambos"
  );

  // Helper para obter componente do ícone
  const getIconComponent = (iconName: string | undefined) => {
    const found = iconOptions.find((i) => i.name === iconName);
    return found ? found.component : null;
  };

  // Categoria selecionada
  const categoriaSelecionada = categoriasFiltradas.find(
    (c) => c.nome === form.categoria
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-white">Categoria</Label>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-white">Categoria</Label>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-800 dark:text-red-300">
            {error instanceof Error ? error.message : "Erro ao carregar categorias"}
          </span>
        </div>
      </div>
    );
  }

  if (categoriasFiltradas.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-gray-900 dark:text-white">Categoria</Label>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 flex items-start gap-2">
          <Folder className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              Nenhuma categoria disponível
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
              Cadastre categorias de {form.tipo === "entrada" ? "receita" : "despesa"} na página de Categorias
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-gray-900 dark:text-white">Categoria</Label>

      <Select
        value={form.categoria}
        onValueChange={(v) => update("categoria", v)}
      >
        <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700">
          <SelectValue placeholder="Selecione a categoria">
            {categoriaSelecionada && (
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = getIconComponent(categoriaSelecionada.icone);
                  return Icon ? (
                    <Icon 
                      className={`w-4 h-4 ${
                        form.tipo === "entrada"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    />
                  ) : (
                    <Folder 
                      className={`w-4 h-4 ${
                        form.tipo === "entrada"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    />
                  );
                })()}
                <span className="text-gray-900 dark:text-white">
                  {categoriaSelecionada.nome}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="dark:bg-gray-800 dark:border-gray-700 max-h-[300px]">
          {categoriasFiltradas.map((c) => {
            const Icon = getIconComponent(c.icone);
            return (
              <SelectItem
                key={c.id}
                value={c.nome}
                className="dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-2 py-1">
                  {Icon ? (
                    <Icon 
                      className={`w-4 h-4 ${
                        c.tipo === "entrada"
                          ? "text-green-600 dark:text-green-400"
                          : c.tipo === "saida"
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    />
                  ) : (
                    <Folder 
                      className={`w-4 h-4 ${
                        c.tipo === "entrada"
                          ? "text-green-600 dark:text-green-400"
                          : c.tipo === "saida"
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {c.nome}
                    </span>
                    {c.tipo === "ambos" && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Universal
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}