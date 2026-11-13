"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Store, ListOrdered } from "lucide-react";
import { iconOptions } from "@/utils/iconOptions";
import { Estabelecimento } from "@/types/estabelecimento";

type Props = {
  estabelecimento: Estabelecimento;
  /** Extrato do estabelecimento: o card inteiro é um link para ele */
  hrefExtrato: string;
  onEditar: () => void;
  onExcluir: () => void;
};

// Card enxuto: ícone e nome. Endereço, totais e lançamentos ficam no extrato
export default function EstabelecimentoCard({ estabelecimento, hrefExtrato, onEditar, onExcluir }: Props) {
  const IconComp = iconOptions.find((i) => i.name === estabelecimento.icone)?.component || Store;

  return (
    <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition">
      <Link
        href={hrefExtrato}
        className="flex flex-1 min-w-0 items-center gap-3 p-3 rounded-l-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Extrato do estabelecimento ${estabelecimento.nome}`}
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-sm"
          aria-hidden="true"
        >
          <IconComp size={20} className="text-white" />
        </div>
        <h3 className="flex-1 min-w-0 font-semibold text-sm text-gray-900 dark:text-white truncate" title={estabelecimento.nome}>
          {estabelecimento.nome}
        </h3>
      </Link>

      <div className="pr-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={`Opções para ${estabelecimento.nome}`}
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={hrefExtrato}>
                <ListOrdered size={14} className="mr-2" />
                Ver extrato
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onEditar} className="cursor-pointer">
              <Edit size={14} className="mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onExcluir}
              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <Trash2 size={14} className="mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
