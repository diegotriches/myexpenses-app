"use client";

import type { ComponentType } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Conta } from "@/types/conta";
import {
  Pencil,
  Trash2,
  FileText,
  Repeat,
  MoreVertical,
  Power,
  PowerOff,
  DollarSign,
  Landmark,
} from "lucide-react";
import { useMoeda } from "@/hooks/useMoeda";
import { empresaOptions } from "@/utils/cartaoOptions";

interface Props {
  conta: Conta;
  onEditar?: (conta: Conta) => void;
  onExcluir?: (conta: Conta) => void;
  onExtrato?: (conta: Conta) => void;
  onTransferir: (contaOrigemId: string) => void;
  onToggleAtivo?: (conta: Conta) => void;
  onAjustarSaldo?: (conta: Conta) => void;
}

// Compara nome e banco sem caixa nem acento: "Nubank" / "nubank" é a mesma coisa
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

function BotaoAcao({ icone: Icone, rotulo, corIcone, onClick }: {
  icone: ComponentType<{ size?: number; className?: string }>;
  rotulo: string;
  corIcone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={rotulo}
      className="flex items-center justify-center gap-1.5 h-8 rounded-md border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      <Icone size={14} className={`flex-shrink-0 ${corIcone}`} />
      <span className="truncate">{rotulo}</span>
    </button>
  );
}

// Card enxuto: logo, nome, banco (só quando difere do nome), saldo e três ações.
// Ativa/inativa não aparece aqui: as abas da página já separam
export default function ContaCard({
  conta,
  onEditar,
  onExcluir,
  onExtrato,
  onTransferir,
  onToggleAtivo,
  onAjustarSaldo,
}: Props) {
  const fmt = useMoeda();

  // Mesmo logo dos outros componentes: o nome do arquivo nem sempre é o nome do banco
  // em minúsculas (ex.: "BTG Pactual" -> btgpactual.png)
  const bancoImagem = empresaOptions.find((e) => e.value === conta.banco)?.imgSrc ?? null;
  const mostrarBanco = !!conta.banco && normalizar(conta.banco) !== normalizar(conta.nome);

  const corSaldo =
    conta.saldoAtual > 0 ? "text-green-600 dark:text-green-400"
    : conta.saldoAtual < 0 ? "text-red-600 dark:text-red-400"
    : "text-gray-600 dark:text-gray-400";

  return (
    <Card className="py-0 gap-0 shadow-sm hover:shadow-md transition-shadow duration-200 border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="p-4 space-y-3">
        {/* Logo, nome e menu */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center p-1.5" aria-hidden="true">
            {bancoImagem
              ? <img src={bancoImagem} alt="" className="w-full h-full object-contain" />
              : <Landmark size={18} className="text-gray-500 dark:text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base leading-tight text-gray-900 dark:text-white truncate" title={conta.nome}>
              {conta.nome}
            </p>
            {mostrarBanco && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{conta.banco}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                <span className="sr-only">Opções da conta {conta.nome}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 dark:bg-gray-800 dark:border-gray-700">
              {onEditar && (
                <DropdownMenuItem onClick={() => onEditar(conta)} className="cursor-pointer dark:hover:bg-gray-700">
                  <Pencil size={14} className="mr-2" />
                  Editar conta
                </DropdownMenuItem>
              )}
              {onToggleAtivo && (
                <DropdownMenuItem onClick={() => onToggleAtivo(conta)} className="cursor-pointer dark:hover:bg-gray-700">
                  {conta.ativo ? (
                    <><PowerOff size={14} className="mr-2" />Desativar</>
                  ) : (
                    <><Power size={14} className="mr-2" />Ativar</>
                  )}
                </DropdownMenuItem>
              )}
              {onExcluir && (
                <>
                  <DropdownMenuSeparator className="dark:bg-gray-700" />
                  <DropdownMenuItem
                    onClick={() => onExcluir(conta)}
                    className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:hover:bg-gray-700"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Remover
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Saldo: a cor já diz se é positivo ou negativo */}
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
          <p className={`text-2xl font-bold leading-tight tabular-nums ${corSaldo}`}>{fmt(conta.saldoAtual)}</p>
        </div>

        {/* Ações: ícone e texto sempre visíveis, em qualquer tela */}
        <div className="grid grid-cols-3 gap-2">
          {onAjustarSaldo && (
            <BotaoAcao icone={DollarSign} rotulo="Ajustar" corIcone="text-blue-600 dark:text-blue-400" onClick={() => onAjustarSaldo(conta)} />
          )}
          {onExtrato && (
            <BotaoAcao icone={FileText} rotulo="Extrato" corIcone="text-purple-600 dark:text-purple-400" onClick={() => onExtrato(conta)} />
          )}
          <BotaoAcao icone={Repeat} rotulo="Transferir" corIcone="text-green-600 dark:text-green-400" onClick={() => onTransferir(conta.id)} />
        </div>
      </div>
    </Card>
  );
}
