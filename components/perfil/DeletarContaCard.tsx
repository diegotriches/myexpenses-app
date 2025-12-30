"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trash2, 
  AlertTriangle, 
  Loader2,
  ShieldAlert,
  Database,
  CreditCard,
  FileText,
  TrendingDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  usuario: { id?: number; nome?: string; email?: string };
}

export default function DeletarContaCard({ usuario }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [deletando, setDeletando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const validarFormulario = (): boolean => {
    setErro(null);

    if (!senha || senha.trim() === "") {
      setErro("Digite sua senha para confirmar");
      return false;
    }

    if (confirmacao !== "DELETE") {
      setErro('Digite "DELETE" em letras maiúsculas para confirmar');
      return false;
    }

    if (!aceitaTermos) {
      setErro("Você precisa confirmar que entende as consequências");
      return false;
    }

    return true;
  };

  const deletarConta = async () => {
    if (!validarFormulario() || !usuario.id) return;

    try {
      setDeletando(true);
      setErro(null);

      // Verifica senha antes de deletar
      await api.post("/auth/verify-password", { password: senha });

      // Deleta a conta
      await api.delete(`/users/${usuario.id}`);

      toast({
        title: "Conta deletada",
        description: "Sua conta foi deletada permanentemente.",
      });

      // Limpa dados locais
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Aguarda um pouco para o toast ser visível
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (err: any) {
      console.error("Erro ao deletar conta:", err);
      
      let mensagem = "Erro ao deletar conta. Tente novamente.";
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        mensagem = "Senha incorreta. Tente novamente.";
      } else if (err.response?.data?.message) {
        mensagem = err.response.data.message;
      }
      
      setErro(mensagem);
      
      toast({
        title: "Erro ao deletar conta",
        description: mensagem,
        variant: "destructive",
      });
    } finally {
      setDeletando(false);
    }
  };

  const resetarFormulario = () => {
    setSenha("");
    setConfirmacao("");
    setAceitaTermos(false);
    setErro(null);
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetarFormulario();
    }
  };

  // Lista de itens que serão deletados
  const itensADeletar = [
    { icon: Database, label: "Todos os seus dados pessoais", color: "text-red-600" },
    { icon: CreditCard, label: "Todas as suas contas e cartões cadastrados", color: "text-red-600" },
    { icon: TrendingDown, label: "Histórico completo de movimentações", color: "text-red-600" },
    { icon: FileText, label: "Categorias e configurações personalizadas", color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Avisos */}
      <Alert variant="destructive" className="border-red-300 bg-red-50 dark:bg-red-950">
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong className="font-semibold">Atenção: Esta ação é permanente e irreversível!</strong>
          <p className="mt-1">
            Ao deletar sua conta, todos os seus dados serão permanentemente removidos de nossos servidores.
            Não será possível recuperar essas informações.
          </p>
        </AlertDescription>
      </Alert>

      {/* O que será deletado */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-600" />
          O que será deletado:
        </h3>
        <div className="grid gap-3">
          {itensADeletar.map((item, index) => (
            <div 
              key={index}
              className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg"
            >
              <item.icon size={18} className={item.color} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Informação adicional */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Alternativa:</strong> Se você deseja apenas pausar temporariamente o uso da conta,
          considere desativar suas notificações ou fazer logout. Você sempre pode voltar depois.
        </AlertDescription>
      </Alert>

      {/* Botão de deletar */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button 
            variant="destructive" 
            className="cursor-pointer"
            size="lg"
          >
            <Trash2 size={18} className="mr-2" />
            Deletar Minha Conta Permanentemente
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle size={20} />
              Confirmar Exclusão de Conta
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Por favor, confirme sua identidade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="senha" className="flex items-center gap-1">
                Confirme sua senha
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha atual"
                disabled={deletando}
                className="border-red-200 focus:border-red-500"
              />
            </div>

            {/* Confirmação de texto */}
            <div className="space-y-2">
              <Label htmlFor="confirmacao" className="flex items-center gap-1">
                Digite "DELETE" para confirmar
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmacao"
                type="text"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="DELETE"
                disabled={deletando}
                className="border-red-200 focus:border-red-500 font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Digite exatamente "DELETE" em letras maiúsculas
              </p>
            </div>

            {/* Checkbox de confirmação */}
            <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900">
              <Checkbox
                id="termos"
                checked={aceitaTermos}
                onCheckedChange={(checked) => setAceitaTermos(checked as boolean)}
                disabled={deletando}
                className="mt-0.5"
              />
              <label
                htmlFor="termos"
                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-tight"
              >
                Eu entendo que esta ação é permanente e que todos os meus dados,
                incluindo contas, transações e configurações, serão deletados para sempre.
              </label>
            </div>

            {/* Mensagem de erro */}
            {erro && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleDialogChange(false)}
              disabled={deletando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deletarConta}
              disabled={deletando || !senha || confirmacao !== "DELETE" || !aceitaTermos}
            >
              {deletando ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 size={16} className="mr-2" />
                  Deletar Permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Aviso final */}
      <Alert className="bg-gray-50 dark:bg-gray-900">
        <AlertDescription className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Dica:</strong> Antes de deletar, você pode exportar seus dados para backup.
          Entre em contato com o suporte se precisar de ajuda.
        </AlertDescription>
      </Alert>
    </div>
  );
}