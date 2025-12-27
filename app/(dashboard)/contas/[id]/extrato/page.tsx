"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ExtratoItem {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  descricao: string;
  valor: number;
  saldoApos: number;
  origem: "TRANSACAO_MANUAL" | "PAGAMENTO_FATURA" | "TRANSFERENCIA" | "AJUSTE" | "ESTORNO";
  referenciaId?: string | null;
}

interface ResumoExtrato {
  contaId: string;
  contaNome: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
  variacao: number;
  periodo: {
    inicio: string;
    fim: string;
  };
}

export default function ExtratoContaPage() {
  const params = useParams();
  const router = useRouter();
  const contaId = params?.id as string;

  const [extrato, setExtrato] = useState<ExtratoItem[]>([]);
  const [resumo, setResumo] = useState<ResumoExtrato | null>(null);
  const [contaNome, setContaNome] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Filtros
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [tipo, setTipo] = useState<string>("TODOS");
  const [origem, setOrigem] = useState<string>("TODAS");

  const carregarExtrato = useCallback(async () => {
    setLoading(true);

    try {
      const query = new URLSearchParams();
      if (inicio) query.append("inicio", inicio);
      if (fim) query.append("fim", fim);
      if (tipo !== "TODOS") query.append("tipo", tipo);
      if (origem !== "TODAS") query.append("origem", origem);

      const res = await fetch(`/api/contas/${contaId}/extrato?${query.toString()}`);
      
      if (!res.ok) {
        throw new Error("Erro ao carregar extrato");
      }

      const data = await res.json();

      setExtrato(data.extrato ?? []);
      setResumo(data.resumo ?? null);
      setContaNome(data.contaNome ?? "");
    } catch (error) {
      console.error("Erro ao carregar extrato:", error);
    } finally {
      setLoading(false);
    }
  }, [contaId, inicio, fim, tipo, origem]);

  useEffect(() => {
    if (contaId) {
      carregarExtrato();
    }
  }, [contaId, carregarExtrato]);

  const limparFiltros = () => {
    setInicio("");
    setFim("");
    setTipo("TODOS");
    setOrigem("TODAS");
  };

  const getOrigemBadge = (origem: string) => {
    const badges: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      TRANSACAO_MANUAL: { label: "Transação", variant: "default" },
      TRANSFERENCIA: { label: "Transferência", variant: "secondary" },
      AJUSTE: { label: "Ajuste", variant: "outline" },
      ESTORNO: { label: "Estorno", variant: "destructive" },
      PAGAMENTO_FATURA: { label: "Pag. Fatura", variant: "default" },
    };

    const badge = badges[origem] || { label: origem, variant: "outline" as const };
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Extrato da Conta</h1>
            {contaNome && <p className="text-muted-foreground">{contaNome}</p>}
          </div>
        </div>
        
        <Button variant="outline" disabled>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Resumo do Período */}
      {resumo && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
            <p className="text-sm text-muted-foreground">
              {new Date(resumo.periodo.inicio).toLocaleDateString("pt-BR")} até{" "}
              {new Date(resumo.periodo.fim).toLocaleDateString("pt-BR")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Inicial</p>
                <p className="text-lg font-bold">R$ {resumo.saldoInicial.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entradas</p>
                <p className="text-lg font-bold text-green-600">+ R$ {resumo.totalEntradas.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saídas</p>
                <p className="text-lg font-bold text-red-600">- R$ {resumo.totalSaidas.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Variação</p>
                <p className={`text-lg font-bold ${resumo.variacao >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {resumo.variacao >= 0 ? "+" : ""} R$ {resumo.variacao.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Final</p>
                <p className="text-lg font-bold">R$ {resumo.saldoFinal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              Limpar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Data Início</label>
            <Input 
              type="date" 
              value={inicio} 
              onChange={(e) => setInicio(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Data Fim</label>
            <Input 
              type="date" 
              value={fim} 
              onChange={(e) => setFim(e.target.value)} 
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tipo</label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="entrada">Apenas Entradas</SelectItem>
                <SelectItem value="saida">Apenas Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Origem</label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                <SelectItem value="TRANSACAO_MANUAL">Transações</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferências</SelectItem>
                <SelectItem value="AJUSTE">Ajustes</SelectItem>
                <SelectItem value="ESTORNO">Estornos</SelectItem>
                <SelectItem value="PAGAMENTO_FATURA">Pagamento Fatura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="md:col-span-4" onClick={carregarExtrato}>
            Aplicar Filtros
          </Button>
        </CardContent>
      </Card>

      {/* Tabela de Extrato */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Data</th>
                  <th className="text-left p-3 font-medium">Descrição</th>
                  <th className="text-center p-3 font-medium">Origem</th>
                  <th className="text-right p-3 font-medium">Entrada</th>
                  <th className="text-right p-3 font-medium">Saída</th>
                  <th className="text-right p-3 font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Carregando extrato...
                    </td>
                  </tr>
                )}

                {!loading && extrato.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Nenhuma movimentação encontrada no período
                    </td>
                  </tr>
                )}

                {!loading && extrato.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(item.data).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3">
                      <div className="max-w-md">
                        {item.descricao}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {getOrigemBadge(item.origem)}
                    </td>
                    <td className="p-3 text-right font-medium text-green-600">
                      {item.tipo === "entrada" && `+ R$ ${item.valor.toFixed(2)}`}
                    </td>
                    <td className="p-3 text-right font-medium text-red-600">
                      {item.tipo === "saida" && `- R$ ${item.valor.toFixed(2)}`}
                    </td>
                    <td className={`p-3 text-right font-semibold ${
                      item.saldoApos >= 0 ? "text-gray-900" : "text-red-600"
                    }`}>
                      R$ {item.saldoApos.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}