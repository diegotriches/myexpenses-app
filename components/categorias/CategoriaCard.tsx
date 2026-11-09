"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Tag,
  Receipt,
  ListOrdered,
} from "lucide-react";
import { iconOptions } from "@/utils/iconOptions";
import { Categoria } from "@/types/categoria";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";

type Props = {
  categoria: Categoria;
  onEditar: () => void;
  onExcluir: () => void;
  totalEntrada?: number;
  totalSaida?: number;
  quantidade?: number;
  loadingTotais?: boolean;
  // Mobile: ao clicar no card em tela pequena, delega para o pai abrir o bottom sheet
  onMobileSelect?: () => void;
  // Abre o extrato (página) da categoria
  onVerExtrato?: () => void;
};

export default function CategoriaCard({
  categoria,
  onEditar,
  onExcluir,
  totalEntrada = 0,
  totalSaida = 0,
  quantidade = 0,
  loadingTotais = false,
  onMobileSelect,
  onVerExtrato,
}: Props) {
  const { mask } = useHideValues();
  const [virado, setVirado] = useState(false);

  const IconComp = iconOptions.find((i) => i.name === categoria.icone)?.component || null;

  const getCorGradiente = () => {
    if (categoria.tipo === "entrada") return "from-green-500 to-green-600 dark:from-green-600 dark:to-green-700";
    if (categoria.tipo === "saida")   return "from-red-500 to-red-600 dark:from-red-600 dark:to-red-700";
    return "from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700";
  };

  const temMovimentacao = totalEntrada > 0 || totalSaida > 0;

  // Ao clicar no card: em mobile delega para o pai; em desktop faz flip
  function handleCardClick() {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onMobileSelect?.();
    } else {
      setVirado((v) => !v);
    }
  }

  // Impede que cliques nos menus/botões internos propaguem o flip
  function stopFlip(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    // Wrapper com perspectiva 3D — altura fixa para o flip funcionar
    <div
      className="cursor-pointer"
      style={{ perspective: "1000px", height: "128px" }}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Categoria ${categoria.nome}. ${virado ? "Verso com detalhes" : "Clique para ver detalhes"}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleCardClick(); }}
    >
      {/* Contêiner que rotaciona */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: virado ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── FRENTE ─────────────────────────────────────────────────────── */}
        <div
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          className="absolute inset-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200 p-4 flex items-center gap-3 overflow-hidden"
        >
          {/* Ícone */}
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${getCorGradiente()} flex items-center justify-center shadow-md`}
            aria-hidden="true"
          >
            {IconComp ? (
              <IconComp size={24} className="text-white" />
            ) : (
              <Tag size={24} className="text-white" />
            )}
          </div>

          {/* Nome */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base text-gray-900 dark:text-white truncate">
              {categoria.nome}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden md:block">
              Clique para detalhes
            </p>
          </div>

          {/* Menu ⋮ — apenas na frente, stopPropagation para não acionar flip */}
          <div onClick={stopFlip}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label={`Opções para ${categoria.nome}`}
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onVerExtrato && (
                  <>
                    <DropdownMenuItem onClick={onVerExtrato} className="cursor-pointer">
                      <ListOrdered size={14} className="mr-2" />
                      Ver extrato
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
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

        {/* ── VERSO ──────────────────────────────────────────────────────── */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          className="absolute inset-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col justify-between overflow-hidden"
        >
          {/* Totais */}
          <div className="flex-1 flex flex-col justify-center py-1 space-y-0.5">
            {loadingTotais ? (
              <div className="space-y-1.5 animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ) : !temMovimentacao ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Sem movimentações no ano
              </p>
            ) : (
              <>
                {categoria.tipo !== "saida" && totalEntrada > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <TrendingUp size={11} /> {categoria.tipo === "ambos" ? "Entradas" : "Total"}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-green-600 dark:text-green-400">
                      {mask(formatarMoeda(totalEntrada))}
                    </span>
                  </div>
                )}
                {categoria.tipo !== "entrada" && totalSaida > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <TrendingDown size={11} /> {categoria.tipo === "ambos" ? "Saídas" : "Total"}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {mask(formatarMoeda(totalSaida))}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 pt-0.5">
                  <Receipt size={11} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {quantidade} {quantidade === 1 ? "transação" : "transações"}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Rodapé: extrato + ações */}
          <div className="flex gap-2 pt-1" onClick={stopFlip}>
            {onVerExtrato && (
              <Button
                size="sm"
                onClick={onVerExtrato}
                className="flex-1 h-7 text-xs bg-blue-700 hover:bg-blue-800 text-white"
              >
                <ListOrdered size={12} className="mr-1" />
                Extrato
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onEditar}
              aria-label="Editar"
              className={`h-7 text-xs border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${onVerExtrato ? "w-8 px-0" : "flex-1"}`}
            >
              <Edit size={12} className={onVerExtrato ? "" : "mr-1"} />
              {!onVerExtrato && "Editar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onExcluir}
              aria-label="Excluir"
              className={`h-7 text-xs border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ${onVerExtrato ? "w-8 px-0" : "flex-1"}`}
            >
              <Trash2 size={12} className={onVerExtrato ? "" : "mr-1"} />
              {!onVerExtrato && "Excluir"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}