"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pencil,
  Trash2,
  FileText,
  CreditCard,
  AlertCircle,
  MoreVertical,
  Power,
  PowerOff,
  Wallet,
  Building2,
} from "lucide-react";
import { Cartao } from "@/types/cartao";
import { useRouter } from "next/navigation";
import { empresaOptions, bandeiraOptions } from "@/utils/cartaoOptions";
import { useContas } from "@/hooks/useContas";
import { useHideValues } from "@/contexts/HideValuesContext";
import { formatarMoeda } from "@/utils/formatadores";
import { useMoeda } from "@/hooks/useMoeda";

interface Props {
  cartao: Cartao;
  onEditar: (cartao: Cartao) => void;
  onExcluir: (cartao: Cartao) => void;
  onFatura?: (cartaoId: number) => void;
  onToggleAtivo?: (cartao: Cartao) => void;
}

function getImgFromOption(options: readonly { value: string; imgSrc: string }[], value: string) {
  const found = options.find((o) => o.value === value);
  return found ? found.imgSrc : null;
}

export default function CartaoItem({
  cartao,
  onEditar,
  onExcluir,
  onFatura,
  onToggleAtivo,
}: Props) {
  const router = useRouter();
  const { data: contas = [] } = useContas();
  const { mask } = useHideValues();

  const contaVinculada = cartao.contaVinculadaId
    ? contas.find(c => c.id === cartao.contaVinculadaId)
    : null;

  const empresaImg  = getImgFromOption(empresaOptions,  cartao.empresa  ?? "");
  const bandeiraImg = getImgFromOption(bandeiraOptions, cartao.bandeira);

  const formatarMoedaCompacta = (valor: number) => {
    if (valor >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)} mi`;
    if (valor >= 10000)   return `R$ ${(valor / 1000).toFixed(1)} mil`;
    return formatarMoeda(valor);
  };

  const fmt  = useMoeda();
  const fmtC = (valor: number) => mask(formatarMoedaCompacta(valor));

  const ehCredito        = cartao.tipo === "credito";
  const limiteTotal      = Number(cartao.limite)           || 0;
  const totalEmUso       = Number(cartao.emUso)            || 0;
  const limiteDisponivel = Number(cartao.limiteDisponivel) || 0;
  const porcentagemUso   = limiteTotal > 0 ? (totalEmUso / limiteTotal) * 100 : 0;

  // Uso do limite: verde até 50%, âmbar até 80%, vermelho acima
  const corBarra = porcentagemUso < 50 ? "bg-emerald-500" : porcentagemUso < 80 ? "bg-amber-500" : "bg-red-500";
  const corUso   = porcentagemUso < 50
    ? "text-gray-900 dark:text-white"
    : porcentagemUso < 80 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";

  const hoje               = new Date().getDate();
  const diaVencimento      = Number(cartao.diaVencimento) || 0;
  const diasAteVencimento  = diaVencimento >= hoje
    ? diaVencimento - hoje
    : (30 - hoje) + diaVencimento;
  const vencimentoProximo  = diasAteVencimento <= 5 && diasAteVencimento > 0;

  const diaFechamento    = Number(cartao.diaFechamento) || 0;
  const melhorDiaCompra  = diaFechamento === 30 ? 1 : diaFechamento + 1;

  const abrirFatura = () => {
    if (onFatura) return onFatura(cartao.id);
    router.push(`/cartoes/${cartao.id}/fatura`);
  };

  const abrirExtratoConta = () => {
    if (contaVinculada) router.push(`/contas/${contaVinculada.id}/extrato`);
  };

  // Valor com o número completo no tooltip (a tela mostra a versão compacta acima de R$ 10 mil)
  const renderValor = (rotulo: string, valor: number, classeValor: string, alinhar: "left" | "right" = "left") => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`min-w-0 ${alinhar === "right" ? "text-right" : ""}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{rotulo}</p>
            <p className={`text-lg font-semibold tabular-nums truncate ${classeValor}`}>{fmtC(valor)}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-semibold">{fmt(valor)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="py-0 gap-0 overflow-hidden hover:shadow-md transition-shadow duration-200 dark:bg-gray-900 dark:border-gray-800">
      {/* Face do cartão: crédito em grafite, débito em azul */}
      <div
        className={`relative m-3 mb-0 rounded-xl p-4 text-white shadow-sm overflow-hidden ${
          ehCredito
            ? "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950"
            : "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800"
        }`}
      >
        {/* Brilho decorativo */}
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {empresaImg && (
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1.5 flex-shrink-0">
                <img src={empresaImg} alt={cartao.empresa || "Empresa"} className="w-full h-full object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{cartao.nome}</p>
              <p className="flex items-center gap-1 text-xs text-white/70">
                {ehCredito ? <CreditCard size={12} /> : <Wallet size={12} />}
                {ehCredito ? "Crédito" : "Débito"}
                {!cartao.ativo && " · Inativo"}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1 -mt-1 text-white/80 hover:text-white hover:bg-white/15">
                <MoreVertical size={16} />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onEditar(cartao)} className="cursor-pointer">
                <Pencil size={14} className="mr-2" />
                Editar cartão
              </DropdownMenuItem>
              {onToggleAtivo && (
                <DropdownMenuItem onClick={() => onToggleAtivo(cartao)} className="cursor-pointer">
                  {cartao.ativo ? (
                    <><PowerOff size={14} className="mr-2" />Desativar</>
                  ) : (
                    <><Power size={14} className="mr-2" />Ativar</>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onExcluir(cartao)}
                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 size={14} className="mr-2" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative mt-6 flex items-end justify-between gap-3">
          {ehCredito ? (
            <div className="flex gap-4 text-xs">
              <div>
                <p className="text-white/60">Fecha</p>
                <p className="text-sm font-semibold">dia {cartao.diaFechamento}</p>
              </div>
              <div>
                <p className="text-white/60">Vence</p>
                <p className="text-sm font-semibold">dia {cartao.diaVencimento}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/70">Desconto imediato na conta</p>
          )}
          {bandeiraImg && (
            <img src={bandeiraImg} alt={cartao.bandeira} className="h-8 w-12 object-contain flex-shrink-0" />
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* ===== CRÉDITO ===== */}
        {ehCredito && (
          <>
            {vencimentoProximo && (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle size={14} className="flex-shrink-0" />
                Vence em {diasAteVencimento} {diasAteVencimento === 1 ? "dia" : "dias"}
              </div>
            )}

            <div className="flex items-end justify-between gap-3">
              {renderValor("Em uso", totalEmUso, corUso)}
              {renderValor("Disponível", limiteDisponivel, "text-emerald-600 dark:text-emerald-400", "right")}
            </div>

            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${corBarra}`}
                  style={{ width: `${Math.min(porcentagemUso, 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {porcentagemUso.toFixed(0)}% de {fmtC(limiteTotal)}
                </span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help whitespace-nowrap">Melhor dia de compra: {melhorDiaCompra}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Compre no dia {melhorDiaCompra} para pagar só no próximo mês</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <Button onClick={abrirFatura} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <FileText size={16} className="mr-2" />
              Ver fatura atual
            </Button>
          </>
        )}

        {/* ===== DÉBITO ===== */}
        {!ehCredito && (
          <>
            {contaVinculada ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Conta vinculada</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{contaVinculada.nome}</p>
                  </div>
                </div>
                {renderValor("Saldo", Number(contaVinculada.saldoAtual), "text-gray-900 dark:text-white", "right")}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertCircle size={14} className="flex-shrink-0" />
                Nenhuma conta vinculada
              </div>
            )}

            <Button
              onClick={abrirExtratoConta}
              disabled={!contaVinculada}
              variant="outline"
              className="w-full"
            >
              <FileText size={16} className="mr-2" />
              {contaVinculada ? "Ver extrato da conta" : "Sem conta vinculada"}
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
