"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FiMail,
  FiCheckCircle,
  FiClock,
  FiArchive,
  FiSearch,
  FiRefreshCw,
  FiTrash2,
  FiExternalLink,
  FiAlertCircle,
} from "react-icons/fi";

interface Contato {
  id: string;
  nome: string;
  email: string;
  assunto: string;
  mensagem: string;
  status: "pendente" | "em_andamento" | "resolvido" | "arquivado";
  lido: boolean;
  createdAt: string;
  userId?: string;
}

interface Estatisticas {
  pendentes: number;
  emAndamento: number;
  resolvidos: number;
  arquivados: number;
  naoLidos: number;
}

export default function AdminContatosPage() {
  const router = useRouter();
  
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [stats, setStats] = useState<Estatisticas>({
    pendentes: 0,
    emAndamento: 0,
    resolvidos: 0,
    arquivados: 0,
    naoLidos: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroAssunto, setFiltroAssunto] = useState("todos");
  const [filtroBusca, setFiltroBusca] = useState("");

  // Carregar contatos
  const carregarContatos = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        status: filtroStatus,
        assunto: filtroAssunto,
        ...(filtroBusca && { busca: filtroBusca }),
      });

      const response = await fetch(`/api/admin/contatos?${params}`);
      
      if (response.status === 403) {
        setError("Acesso negado. Apenas administradores podem acessar esta página.");
        return;
      }

      if (!response.ok) {
        throw new Error("Erro ao carregar contatos");
      }

      const data = await response.json();
      setContatos(data.contatos);
      setStats(data.estatisticas);
    } catch (err: any) {
      console.error("Erro:", err);
      setError(err.message || "Erro ao carregar contatos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarContatos();
  }, [filtroStatus, filtroAssunto]);

  // Atualizar status
  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      const response = await fetch(`/api/admin/contatos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!response.ok) throw new Error();

      carregarContatos();
    } catch (err) {
      alert("Erro ao atualizar status");
    }
  };

  // Marcar como lido
  const marcarComoLido = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/contatos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lido: true }),
      });

      if (!response.ok) throw new Error();

      carregarContatos();
    } catch (err) {
      alert("Erro ao marcar como lido");
    }
  };

  // Excluir
  const excluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este contato permanentemente?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/contatos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error();

      carregarContatos();
    } catch (err) {
      alert("Erro ao excluir contato");
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pendente: { label: "Pendente", class: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
      em_andamento: { label: "Em Andamento", class: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
      resolvido: { label: "Resolvido", class: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
      arquivado: { label: "Arquivado", class: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
    };

    const badge = badges[status as keyof typeof badges] || badges.pendente;
    
    return (
      <Badge className={badge.class}>
        {badge.label}
      </Badge>
    );
  };

  const getAssuntoLabel = (assunto: string) => {
    const labels: Record<string, string> = {
      duvida: "Dúvida",
      sugestao: "Sugestão",
      problema: "Problema",
      outro: "Outro",
    };
    return labels[assunto] || assunto;
  };

  if (error && error.includes("Acesso negado")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900">
          <CardContent className="p-8 text-center">
            <FiAlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Acesso Negado
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Apenas administradores podem acessar esta página.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📬 Gerenciar Contatos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Mensagens recebidas através do formulário de contato
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pendentes</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.pendentes}</p>
              </div>
              <FiClock className="text-red-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.emAndamento}</p>
              </div>
              <FiRefreshCw className="text-yellow-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Resolvidos</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolvidos}</p>
              </div>
              <FiCheckCircle className="text-green-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Arquivados</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.arquivados}</p>
              </div>
              <FiArchive className="text-gray-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Não Lidos</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.naoLidos}</p>
              </div>
              <FiMail className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Buscar
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nome, email ou mensagem..."
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && carregarContatos()}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Status
              </label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-[180px] dark:bg-gray-900 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvidos</SelectItem>
                  <SelectItem value="arquivado">Arquivados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Assunto
              </label>
              <Select value={filtroAssunto} onValueChange={setFiltroAssunto}>
                <SelectTrigger className="w-[180px] dark:bg-gray-900 dark:border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="duvida">Dúvidas</SelectItem>
                  <SelectItem value="sugestao">Sugestões</SelectItem>
                  <SelectItem value="problema">Problemas</SelectItem>
                  <SelectItem value="outro">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={carregarContatos} variant="outline">
                <FiRefreshCw className="mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      )}

      {/* Lista de Contatos */}
      {!loading && contatos.length === 0 && (
        <Card className="border-dashed dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-12 text-center">
            <FiMail className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Nenhum contato encontrado
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && contatos.map((contato) => (
        <Card
          key={contato.id}
          className={`hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700 ${
            !contato.lido ? "border-l-4 border-l-blue-500" : ""
          }`}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {contato.nome}
                  </h3>
                  {!contato.lido && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Novo
                    </Badge>
                  )}
                  {getStatusBadge(contato.status)}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FiMail size={14} />
                    {contato.email}
                  </span>
                  <span>🏷️ {getAssuntoLabel(contato.assunto)}</span>
                  <span>⏰ {new Date(contato.createdAt).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
              {contato.mensagem}
            </p>

            <div className="flex flex-wrap gap-2">
              {!contato.lido && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => marcarComoLido(contato.id)}
                >
                  Marcar como Lido
                </Button>
              )}

              <Select
                value={contato.status}
                onValueChange={(valor) => atualizarStatus(contato.id, valor)}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="arquivado">Arquivar</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`mailto:${contato.email}?subject=Re: ${getAssuntoLabel(contato.assunto)}`)}
              >
                <FiExternalLink className="mr-2" size={14} />
                Responder
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => excluir(contato.id)}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <FiTrash2 className="mr-2" size={14} />
                Excluir
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}