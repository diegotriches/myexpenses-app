"use client";

import { useState } from "react";
import { empresaOptions } from "@/utils/cartaoOptions";
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
import { Search, Check, Building2 } from "lucide-react";
import Image from "next/image";

interface EmpresaPickerModalProps {
  aberto: boolean;
  onClose: () => void;
  onSelect: (empresaValue: string) => void;
  empresaAtual?: string;
}

export default function EmpresaPickerModal({
  aberto,
  onClose,
  onSelect,
  empresaAtual,
}: EmpresaPickerModalProps) {
  const [busca, setBusca] = useState("");

  const empresasFiltradas = empresaOptions.filter((empresa) =>
    empresa.label.toLowerCase().includes(busca.toLowerCase())
  );

  const handleSelect = (empresaValue: string) => {
    onSelect(empresaValue);
    onClose();
    setBusca("");
  };

  return (
    <Dialog 
      open={aberto} 
      onOpenChange={(open) => {
        if (!open) {
          setBusca("");
        }
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>Selecionar Banco Emissor</span>
            <Badge variant="outline" className="text-xs">
              {empresasFiltradas.length} empresa{empresasFiltradas.length !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Escolha a instituição emissora do cartão
          </DialogDescription>
        </DialogHeader>

        {/* Campo de busca */}
        <div className="px-6 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar emissor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 dark:bg-gray-800 dark:border-gray-700"
              autoFocus
            />
          </div>
        </div>

        {/* Grid de empresas */}
        <ScrollArea className="h-[450px] px-6 pb-6">
          {empresasFiltradas.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {empresasFiltradas.map((empresa) => {
                const isSelecionado = empresaAtual === empresa.value;

                return (
                  <button
                    key={empresa.value}
                    type="button"
                    className={`
                      relative aspect-square p-3 border rounded-lg 
                      transition-all duration-200 
                      flex flex-col items-center justify-center gap-2 group
                      hover:bg-blue-50 hover:border-blue-500
                      dark:hover:bg-blue-950 dark:hover:border-blue-400
                      ${isSelecionado 
                        ? "bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400" 
                        : "hover:scale-105 bg-white dark:bg-gray-800"
                      }
                    `}
                    onClick={() => handleSelect(empresa.value)}
                    title={empresa.label}
                  >
                    {/* Logo da empresa */}
                    <div className="w-12 h-12 flex items-center justify-center">
                      {empresa.imgSrc ? (
                        <Image
                          src={empresa.imgSrc}
                          alt={empresa.label}
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      ) : (
                        <Building2 
                          size={32} 
                          className={`
                            ${isSelecionado 
                              ? "text-blue-600 dark:text-blue-400" 
                              : "text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            }
                          `}
                        />
                      )}
                    </div>

                    {/* Nome da empresa */}
                    <span 
                      className={`
                        text-[10px] font-medium text-center line-clamp-2 leading-tight
                        ${isSelecionado 
                          ? "text-blue-700 dark:text-blue-300" 
                          : "text-gray-600 dark:text-gray-400 group-hover:text-blue-700 dark:group-hover:text-blue-300"
                        }
                      `}
                    >
                      {empresa.label}
                    </span>
                    
                    {/* Check para empresa selecionada */}
                    {isSelecionado && (
                      <div className="absolute -top-1 -right-1 bg-blue-600 dark:bg-blue-500 rounded-full p-0.5">
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
                Nenhuma empresa encontrada
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