"use client";

import { useState, useEffect } from "react";
import api from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EditarDadosCard from "@/components/perfil/EditarDadosCard";
import EditarFotoCard from "@/components/perfil/EditarFotoCard";
import AlterarSenhaCard from "@/components/perfil/AlterarSenhaCard";
import DeletarContaCard from "@/components/perfil/DeletarContaCard";
import { User, Image, Lock, Trash2, AlertCircle, UserCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Usuario {
  id?: number;
  nome: string;
  email: string;
  foto?: string | null;
  createdAt?: string;
}

export default function PerfilPage() {
  const [usuario, setUsuario] = useState<Usuario>({
    nome: "",
    email: "",
    foto: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState("dados");

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔄 Carregando dados do usuário...");
      
      // ✅ CORRIGIDO: Endpoint correto
      const resUsuario = await api.get("/users/me");
      
      console.log("📦 Resposta da API:", resUsuario.data);

      if (resUsuario.data) {
        const dadosUsuario = {
          id: resUsuario.data.id,
          // Aceita tanto 'nome' quanto 'name'
          nome: resUsuario.data.nome || resUsuario.data.name || "",
          email: resUsuario.data.email,
          foto: resUsuario.data.foto || null,
          createdAt: resUsuario.data.createdAt || resUsuario.data.created_at,
        };

        console.log("✅ Dados processados:", dadosUsuario);
        setUsuario(dadosUsuario);
      }
    } catch (err: any) {
      console.error("❌ Erro ao carregar dados:", err);
      console.error("❌ Detalhes:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      setError(
        err.response?.data?.message || 
        err.response?.data?.error ||
        "Erro ao carregar dados. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const atualizarUsuario = (dados: Partial<Usuario>) => {
    console.log("🔄 Atualizando usuário local:", dados);
    setUsuario((prev) => ({ ...prev, ...dados }));
  };

  // Skeleton Loading
  const SkeletonCard = () => (
    <Card>
      <CardHeader>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardContent>
    </Card>
  );

  // Formatar data de membro desde
  const formatarDataMembro = (data?: string) => {
    if (!data) return "Recente";
    const date = new Date(data);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse" />
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <UserCircle className="text-2xl md:text-3xl text-blue-700 dark:text-blue-500" size={32} />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Meu Perfil
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                Membro desde {formatarDataMembro(usuario.createdAt)}
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Gerencie suas informações pessoais, foto de perfil e configurações de segurança
        </p>
        <hr className="border-t border-gray-300 dark:border-gray-700" />
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Debug Info (remover depois) */}
      {process.env.NODE_ENV === "development" && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-mono">
            Debug: ID={usuario.id}, Nome={usuario.nome}, Email={usuario.email}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
          <TabsTrigger
            value="dados"
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white cursor-pointer"
          >
            <User size={16} />
            <span className="hidden sm:inline">Dados Pessoais</span>
            <span className="sm:hidden">Dados</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="foto"
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white cursor-pointer"
          >
            <Image size={16} />
            <span>Foto</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="senha"
            className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white cursor-pointer"
          >
            <Lock size={16} />
            <span>Segurança</span>
          </TabsTrigger>
          
          <TabsTrigger
            value="conta"
            className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white cursor-pointer"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Deletar Conta</span>
            <span className="sm:hidden">Deletar</span>
          </TabsTrigger>
        </TabsList>

        {/* Dados Pessoais */}
        <TabsContent value="dados" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User size={20} className="text-blue-600 dark:text-blue-400" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Atualize seu nome e email. Essas informações serão visíveis apenas para você.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditarDadosCard 
                usuario={usuario} 
                atualizarUsuario={atualizarUsuario}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Foto de Perfil */}
        <TabsContent value="foto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image size={20} className="text-blue-600 dark:text-blue-400" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Adicione ou atualize sua foto de perfil. Formatos aceitos: JPG, PNG (máx. 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditarFotoCard 
                usuario={usuario} 
                atualizarUsuario={atualizarUsuario}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alterar Senha */}
        <TabsContent value="senha" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={20} className="text-blue-600 dark:text-blue-400" />
                Segurança da Conta
              </CardTitle>
              <CardDescription>
                Altere sua senha regularmente para manter sua conta segura. Use uma senha forte com letras, números e símbolos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlterarSenhaCard usuarioId={usuario.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deletar Conta */}
        <TabsContent value="conta" className="space-y-4">
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Trash2 size={20} />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Ação irreversível que excluirá permanentemente sua conta e todos os seus dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeletarContaCard usuario={usuario} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}