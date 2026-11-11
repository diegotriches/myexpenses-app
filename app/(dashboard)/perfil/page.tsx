"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EditarDadosCard from "@/components/perfil/EditarDadosCard";
import EditarFotoCard from "@/components/perfil/EditarFotoCard";
import AlterarSenhaCard from "@/components/perfil/AlterarSenhaCard";
import DeletarContaCard from "@/components/perfil/DeletarContaCard";
import { useProfile } from "@/hooks/useProfile";
import { User, Image as ImageIcon, Lock, Trash2, AlertCircle, UserCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { AbasSecao } from "@/components/common/AbasSecao";

export default function PerfilPage() {
  // React Query
  const { data: usuario, isLoading: loading, error: queryError } = useProfile();

  // Estado local
  const [abaAtiva, setAbaAtiva] = useState("dados");

  // Skeleton Loading
  const renderSkeletonCard = () => (
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
  const formatarDataMembro = (data?: string | Date) => {
    if (!data) return "Recente";
    const date = new Date(data);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="page-container p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse" />
        </div>
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        {renderSkeletonCard()}
      </div>
    );
  }

  if (queryError) {
  return (
    <div className="page-container p-4 md:p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {queryError instanceof Error ? queryError.message : "Erro ao carregar perfil"}
        </AlertDescription>
      </Alert>
    </div>
  );
}

if (!usuario) {
  return (
    <div className="page-container p-4 md:p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar dados do usuário. Tente recarregar a página.
        </AlertDescription>
      </Alert>
    </div>
  );
}

  return (
    <div className="page-container p-4 md:p-6 space-y-6">
      <PageHeader
        icone={UserCircle}
        titulo="Meu Perfil"
        selo={
          <Badge variant="secondary" className="text-xs">
            Membro desde {formatarDataMembro(usuario.createdAt)}
          </Badge>
        }
        descricao="Gerencie suas informações pessoais, foto de perfil e configurações de segurança"
      />

      {/* Tabs */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-6">
        <AbasSecao
          ariaLabel="Seções do perfil"
          abas={[
            { id: "dados", rotulo: "Dados pessoais", icone: User },
            { id: "foto", rotulo: "Foto", icone: ImageIcon },
            { id: "senha", rotulo: "Segurança", icone: Lock },
          ] as const}
          ativa={abaAtiva}
          onChange={setAbaAtiva}
        />

        {/* Dados Pessoais */}
        <TabsContent value="dados" className="space-y-4 max-w-3xl">
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
              <EditarDadosCard usuario={usuario} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Foto de Perfil */}
        <TabsContent value="foto" className="space-y-4 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon size={20} className="text-blue-600 dark:text-blue-400" />
                Foto de Perfil
              </CardTitle>
              <CardDescription>
                Adicione ou atualize sua foto de perfil. Formatos aceitos: JPG, PNG ou WebP. A foto é recortada em quadrado e reduzida antes do envio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditarFotoCard usuario={usuario} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alterar Senha */}
        <TabsContent value="senha" className="space-y-6 max-w-3xl">
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

          {/* Zona de perigo: fica no fim de Segurança, sem o peso de uma aba própria */}
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