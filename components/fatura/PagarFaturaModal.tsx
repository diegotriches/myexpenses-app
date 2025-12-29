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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Wallet,
  Calendar,
  CreditCard,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Conta {
  id: string;
  nome: string;
  saldoAtual?: number;
}

interface Props {
  aberto: boolean;
  onClose: () => void;
  total: number;
  contas: Conta[];
  onConfirmar: (data: {
    contaId: string;
    dataPagamento?: string;
  }) => Promise<void>;
}

export default function PagarFaturaModal({
  aberto,
  onClose,
  total,
  contas,
  onConfirmar,
}: Props) {
  const [contaId, setContaId] = useState("");
  const [dataPagamento, setDataPagamento] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { toast } = useToast();
  const CalendarIcon = Calendar;

  // Reset ao abrir
  useEffect(() => {
    if (aberto) {
      setContaId("");
      setDataPagamento(new Date());
      setErro(null);
    }
  }, [aberto]);

  // Formatação monetária
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Verifica se conta tem saldo suficiente
  const contaSelecionada = contas.find(c => c.id === contaId);
  const saldoSuficiente = contaSelecionada 
    ? (contaSelecionada.saldoAtual || 0) >= total
    : true;

  const validarFormulario = (): boolean => {
    setErro(null);

    if (!contaId) {
      setErro("Selecione uma conta para débito");
      return false;
    }

    if (!dataPagamento) {
      setErro("Selecione a data de pagamento");
      return false;
    }

    return true;
  };

  const confirmar = async () => {
    if (!validarFormulario()) {
      return;
    }

    try {
      setLoading(true);
      setErro(null);

      await onConfirmar({
        contaId,
        dataPagamento: dataPagamento 
          ? format(dataPagamento, "yyyy-MM-dd")
          : undefined,
      });

      toast({
        title: "Fatura paga!",
        description: `Pagamento de ${formatarMoeda(total)} realizado com sucesso.`,
      });

      onClose();
    } catch (err: any) {
      console.error("Erro ao pagar fatura:", err);
      
      const mensagem = err.response?.data?.message || 
                      err.message || 
                      "Erro ao processar pagamento. Tente novamente.";
      
      setErro(mensagem);
      
      toast({
        title: "Erro ao pagar",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="text-blue-600" size={24} />
            Pagar Fatura
          </DialogTitle>
          <DialogDescription>
            Confirme os dados do pagamento da fatura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Valor da Fatura */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-1 font-medium">
              Valor Total da Fatura
            </p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {formatarMoeda(total)}
            </p>
          </div>

          {/* Seleção de Conta */}
          <div className="space-y-2">
            <Label htmlFor="conta" className="flex items-center gap-1">
              Conta para Débito
              <span className="text-red-500">*</span>
            </Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger id="conta" className={erro && !contaId ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {contas.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">
                    Nenhuma conta disponível
                  </div>
                ) : (
                  contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.id}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-2">
                          <Wallet size={14} />
                          <span>{conta.nome}</span>
                        </div>
                        {conta.saldoAtual !== undefined && (
                          <span className="text-xs text-gray-500">
                            {formatarMoeda(conta.saldoAtual)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {/* Alerta de saldo insuficiente */}
            {contaSelecionada && !saldoSuficiente && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Saldo insuficiente. Disponível: {formatarMoeda(contaSelecionada.saldoAtual || 0)}
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Data de Pagamento */}
          <div className="space-y-2">
            <Label htmlFor="data" className="flex items-center gap-1">
              Data de Pagamento
              <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="data"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataPagamento && "text-muted-foreground",
                    erro && !dataPagamento && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataPagamento ? (
                    format(dataPagamento, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dataPagamento}
                  onSelect={setDataPagamento}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Data em que o pagamento será processado
            </p>
          </div>

          {/* Informação */}
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-900">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs">
              O valor será debitado da conta selecionada e a fatura será marcada como paga.
              Esta ação não pode ser desfeita.
            </AlertDescription>
          </Alert>

          {/* Erro */}
          {erro && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={loading || !contaId || !dataPagamento || !saldoSuficiente}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}