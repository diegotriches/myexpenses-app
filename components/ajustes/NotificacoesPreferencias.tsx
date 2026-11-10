"use client";

import type { ReactNode } from "react";
import { Bell, CreditCard, Gauge, Wallet, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferenciasNotificacao, useSalvarPreferenciasNotificacao } from "@/hooks/useNotificacoes";

// Preferências dos avisos automáticos (tabela preferencias_notificacao). Só as que
// de fato controlam um aviso aparecem aqui; cada mudança é salva na hora.
const DIAS_ANTECEDENCIA = [1, 2, 3, 5, 7, 10];

function Linha({
  id,
  icone,
  titulo,
  descricao,
  ativo,
  desabilitado,
  aoMudar,
  children,
}: {
  id: string;
  icone: ReactNode;
  titulo: string;
  descricao: string;
  ativo: boolean;
  desabilitado: boolean;
  aoMudar: (ativo: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <span className={`mt-0.5 ${ativo ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`}>{icone}</span>
          <div>
            <Label htmlFor={id} className="cursor-pointer">{titulo}</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{descricao}</p>
          </div>
        </div>
        <Switch id={id} checked={ativo} onCheckedChange={aoMudar} disabled={desabilitado} />
      </div>
      {children}
    </div>
  );
}

export default function NotificacoesPreferencias() {
  const { data: prefs, isLoading, isError } = usePreferenciasNotificacao();
  const salvar = useSalvarPreferenciasNotificacao();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Notificações</h3>
        </div>
        {salvar.isPending && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 size={12} className="animate-spin" /> Salvando...
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : isError || !prefs ? (
        <p className="text-sm text-red-500">Não foi possível carregar as preferências de notificação.</p>
      ) : (
        <div className="space-y-3">
          <Linha
            id="notif-faturas"
            icone={<CreditCard size={20} />}
            titulo="Fatura perto do vencimento"
            descricao="Avisa antes do vencimento e quando a fatura passa da data sem pagamento."
            ativo={prefs.faturas}
            desabilitado={salvar.isPending}
            aoMudar={(v) => salvar.mutate({ faturas: v })}
          >
            {prefs.faturas && (
              <div className="flex items-center gap-3 pl-8">
                <Label htmlFor="notif-dias" className="text-xs text-gray-600 dark:text-gray-400">Avisar com</Label>
                <Select
                  value={String(prefs.diasAntesVencimento)}
                  onValueChange={(v) => salvar.mutate({ diasAntesVencimento: Number(v) })}
                  disabled={salvar.isPending}
                >
                  <SelectTrigger id="notif-dias" className="w-36 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Mantém um valor salvo fora da lista padrão */}
                    {Array.from(new Set([...DIAS_ANTECEDENCIA, prefs.diasAntesVencimento])).sort((a, b) => a - b).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} dia{d === 1 ? "" : "s"} antes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </Linha>

          <Linha
            id="notif-limite"
            icone={<Gauge size={20} />}
            titulo="Limite do cartão"
            descricao="Avisa quando o uso do limite passa de 80% e de 95%."
            ativo={prefs.limiteCartao}
            desabilitado={salvar.isPending}
            aoMudar={(v) => salvar.mutate({ limiteCartao: v })}
          />

          <Linha
            id="notif-saldo"
            icone={<Wallet size={20} />}
            titulo="Saldo negativo"
            descricao="Avisa quando uma recorrência lançada deixa a conta no negativo."
            ativo={prefs.saldoBaixo}
            desabilitado={salvar.isPending}
            aoMudar={(v) => salvar.mutate({ saldoBaixo: v })}
          />

          <p className="text-xs text-gray-500 dark:text-gray-400">
            As alterações são salvas na hora. Os avisos aparecem no sino do menu superior.
          </p>
        </div>
      )}
    </div>
  );
}
