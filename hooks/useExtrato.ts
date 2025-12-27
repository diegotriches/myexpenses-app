import { useCallback, useState, useEffect } from "react";
import { usePeriodo } from "@/components/PeriodoContext";

export interface MovimentacaoExtrato {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  valor: number;
  descricao: string;
  saldoApos: number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO";
  referenciaId?: string | null;
  
  // Campos extras para contexto
  contaId: string;
  contaNome?: string;
  categoria?: string | null;
  formaPagamento?: string | null;
}

export interface SaldoConta {
  contaId: string;
  contaNome: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
}

interface FiltrosExtrato {
  contaId?: string | null;
  origem?: MovimentacaoExtrato["origem"] | "TODAS";
  tipo?: "entrada" | "saida" | "TODOS";
  dataInicio?: string;
  dataFim?: string;
}

interface UseExtratoReturn {
  movimentacoes: MovimentacaoExtrato[];
  saldos: SaldoConta[];
  loading: boolean;
  error: string | null;
  filtros: FiltrosExtrato;
  setFiltros: (filtros: FiltrosExtrato) => void;
  carregar: () => Promise<void>;
  exportarPDF: () => Promise<void>;
  exportarExcel: () => Promise<void>;
}

export function useExtrato(): UseExtratoReturn {
  const { mesSelecionado, anoSelecionado } = usePeriodo();
  
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoExtrato[]>([]);
  const [saldos, setSaldos] = useState<SaldoConta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [filtros, setFiltros] = useState<FiltrosExtrato>({
    contaId: null,
    origem: "TODAS",
    tipo: "TODOS",
  });

  // Carregar extrato
  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ano: String(anoSelecionado),
        mes: String(mesSelecionado + 1),
      });

      // Adiciona filtros opcionais
      if (filtros.contaId) {
        params.append("contaId", filtros.contaId);
      }
      
      if (filtros.origem && filtros.origem !== "TODAS") {
        params.append("origem", filtros.origem);
      }
      
      if (filtros.tipo && filtros.tipo !== "TODOS") {
        params.append("tipo", filtros.tipo);
      }

      if (filtros.dataInicio) {
        params.append("dataInicio", filtros.dataInicio);
      }

      if (filtros.dataFim) {
        params.append("dataFim", filtros.dataFim);
      }

      const res = await fetch(`/api/extrato?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error("Falha ao carregar extrato");
      }

      const data = await res.json();
      
      setMovimentacoes(data.movimentacoes || []);
      setSaldos(data.saldos || []);
      
    } catch (err: any) {
      console.error("Erro ao carregar extrato:", err);
      setError(err?.message || "Erro ao carregar extrato");
    } finally {
      setLoading(false);
    }
  }, [anoSelecionado, mesSelecionado, filtros]);

  // Carregar ao montar e quando período/filtros mudarem
  useEffect(() => {
    carregar();
  }, [carregar]);

  // Exportar PDF
  const exportarPDF = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ano: String(anoSelecionado),
        mes: String(mesSelecionado + 1),
        formato: "pdf",
      });

      if (filtros.contaId) {
        params.append("contaId", filtros.contaId);
      }

      const res = await fetch(`/api/extrato/exportar?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error("Falha ao exportar PDF");
      }

      // Download do arquivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extrato-${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, "0")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      console.error("Erro ao exportar PDF:", err);
      setError(err?.message || "Erro ao exportar PDF");
    } finally {
      setLoading(false);
    }
  }, [anoSelecionado, mesSelecionado, filtros]);

  // Exportar Excel
  const exportarExcel = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ano: String(anoSelecionado),
        mes: String(mesSelecionado + 1),
        formato: "excel",
      });

      if (filtros.contaId) {
        params.append("contaId", filtros.contaId);
      }

      const res = await fetch(`/api/extrato/exportar?${params.toString()}`);
      
      if (!res.ok) {
        throw new Error("Falha ao exportar Excel");
      }

      // Download do arquivo
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `extrato-${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, "0")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err: any) {
      console.error("Erro ao exportar Excel:", err);
      setError(err?.message || "Erro ao exportar Excel");
    } finally {
      setLoading(false);
    }
  }, [anoSelecionado, mesSelecionado, filtros]);

  return {
    movimentacoes,
    saldos,
    loading,
    error,
    filtros,
    setFiltros,
    carregar,
    exportarPDF,
    exportarExcel,
  };
}