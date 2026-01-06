"use client";

import { useState } from "react";
import { iconOptions } from "@/utils/iconOptions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Check } from "lucide-react";

interface IconPickerModalProps {
  aberto: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  iconeAtual?: string;
}

export default function IconPickerModal({
  aberto,
  onClose,
  onSelect,
  iconeAtual,
}: IconPickerModalProps) {
  const [busca, setBusca] = useState("");

  const iconesFiltrados = iconOptions.filter((icon) =>
    icon.name.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    onClose();
    setBusca(""); // Limpar busca ao fechar
  };

  return (
    <Dialog open={aberto} onOpenChange={(open) => {
      if (!open) {
        setBusca(""); // Limpar busca ao fechar
      }
      onClose();
    }}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>Selecionar Ícone</span>
            <Badge variant="outline" className="text-xs">
              {iconesFiltrados.length} ícone{iconesFiltrados.length !== 1 ? "s" : ""}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Escolha um ícone para representar sua categoria
          </DialogDescription>
        </DialogHeader>

        {/* Campo de busca */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar ícone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        {/* Grid de ícones */}
        <ScrollArea className="h-[450px] px-6 pb-6">
          {iconesFiltrados.length > 0 ? (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {iconesFiltrados.map((icone) => {
                const IconComp = icone.component;
                const isSelecionado = iconeAtual === icone.name;

                return (
                  <button
                    key={icone.name}
                    type="button"
                    className={`
                      relative aspect-square p-3 border rounded-lg 
                      transition-all duration-200 
                      flex items-center justify-center group
                      hover:bg-blue-50 hover:border-blue-500
                      dark:hover:bg-blue-950 dark:hover:border-blue-400
                      ${isSelecionado 
                        ? "bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400" 
                        : "hover:scale-105"
                      }
                    `}
                    onClick={() => handleSelect(icone.name)}
                    title={icone.name}
                  >
                    <IconComp 
                      className={`
                        h-5 w-5 transition-colors
                        ${isSelecionado 
                          ? "text-blue-600 dark:text-blue-400" 
                          : "text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                        }
                      `}
                    />
                    
                    {/* Check para ícone selecionado */}
                    {isSelecionado && (
                      <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-0.5">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Nenhum ícone encontrado
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Tente buscar com outros termos
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}