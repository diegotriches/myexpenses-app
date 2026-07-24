// src/components/perfil/DeletarContaCard.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
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
  TrendingDown,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { useDeletarConta } from "@/hooks/useProfile";
import type { Usuario } from "@/types/profile";

interface Props {
  usuario: Usuario;
}

// ── Componente interno que usa useSearchParams ─────────────────────────────
// Isolado em Suspense para evitar prerender-error no build.
function DeletarContaInner({ usuario }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aguardandoOAuth, setAguardandoOAuth] = useState(false);
  const [oauthReautenticado, setOauthReautenticado] = useState(false);

  const deletarConta = useDeletarConta();

  // ✅ Detecta retorno do fluxo OAuth de reautenticação.
  // Após signIn("google", { callbackUrl: "/perfil?confirmar_exclusao=true" }),
  // o NextAuth redireciona de volta com esse parâmetro — abrimos o modal
  // automaticamente para o usuário confirmar e finalizar a exclusão.
  useEffect(() => {
    if (searchParams.get("confirmar_exclusao") === "true") {
      setDialogOpen(true);
      setOauthReautenticado(true);
      router.replace("/perfil", { scroll: false });
    }
  }, [searchParams, router]);

  // Usuário OAuth = não tem senha cadastrada
  const isOAuth = !usuario.hasPassword;

  function resetarFormulario() {
    setSenha("");
    setConfirmacao("");
    setAceitaTermos(false);
    setErro(null);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) resetarFormulario();
  }

  // ── Fluxo OAuth: redireciona para reautenticar com Google ──────────────────
  async function handleReautenticarGoogle() {
    setAguardandoOAuth(true);
    try {
      await signIn("google", {
        callbackUrl: `${window.location.origin}/perfil?confirmar_exclusao=true`,
      });
    } catch (err) {
      console.error("Erro ao reautenticar com Google:", err);
      setErro("Não foi possível reautenticar com o Google. Tente novamente.");
      setAguardandoOAuth(false); // ✅ libera o botão em vez de travar pra sempre
    }
  }

  // ── Validação (apenas para fluxo Credentials) ─────────────────────────────
  function validarFormulario(): boolean {
    setErro(null);

    if (!isOAuth && (!senha || senha.trim() === "")) {
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
  }

  // ── Executa a exclusão ─────────────────────────────────────────────────────
  async function handleDeletarConta() {
    if (!validarFormulario() || !usuario.id) return;

    try {
      setErro(null);
      await deletarConta.mutateAsync({
        userId: usuario.id,
        // Usuários OAuth não enviam senha — a rota verifica o iat do token
        senha: isOAuth ? undefined : senha,
      });
      // Hook já redireciona para /login após sucesso
    } catch (err: any) {
      console.error("Erro ao deletar conta:", err);

      // Se a rota retornar OAUTH_REAUTH_REQUIRED, pede para reautenticar
      if (
        err.code === "OAUTH_REAUTH_REQUIRED" ||
        err.message?.includes("Reautenticação")
      ) {
        setErro(
          "Sua sessão expirou. Clique em 'Confirmar com Google' para reautenticar.",
        );
        return;
      }

      let mensagem = "Erro ao deletar conta. Tente novamente.";
      if (
        err.message?.includes("incorreta") ||
        err.message?.includes("Senha")
      ) {
        mensagem = "Senha incorreta. Tente novamente.";
      } else if (err.message) {
        mensagem = err.message;
      }
      setErro(mensagem);
    }
  }

  const itensADeletar = [
    { icon: Database, label: "Todos os seus dados pessoais" },
    { icon: CreditCard, label: "Todas as suas contas e cartões cadastrados" },
    { icon: TrendingDown, label: "Histórico completo de movimentações" },
    { icon: FileText, label: "Categorias e configurações personalizadas" },
  ];

  return (
    <div className="space-y-6">
      {/* Aviso principal */}
      <Alert
        variant="destructive"
        className="border-red-300 bg-red-50 dark:bg-red-950"
      >
        <AlertTriangle className="h-5 w-5" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          <strong className="font-semibold">
            Atenção: Esta ação é permanente e irreversível!
          </strong>
          <p className="mt-1">
            Ao deletar sua conta, todos os seus dados serão permanentemente
            removidos. Não será possível recuperar essas informações.
          </p>
        </AlertDescription>
      </Alert>

      {/* O que será deletado */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ShieldAlert size={16} className="text-red-600" />O que será deletado:
        </h3>
        <div className="grid gap-3">
          {itensADeletar.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg"
            >
              <item.icon size={18} className="text-red-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Alternativa */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Alternativa:</strong> Se quiser apenas pausar o uso, considere
          fazer logout. Você sempre pode voltar depois.
        </AlertDescription>
      </Alert>

      {/* Botão de abrir modal */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button variant="destructive" size="lg" className="cursor-pointer">
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
              Esta ação não pode ser desfeita. Por favor, confirme sua
              identidade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* ── Fluxo OAuth ── */}
            {isOAuth ? (
              <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                  <p className="font-medium mb-1">
                    Confirmação via Google necessária
                  </p>
                  <p className="text-xs">
                    Sua conta foi criada com o Google. Para confirmar a
                    exclusão, você será redirecionado para autenticar com o
                    Google e voltará automaticamente para finalizar.
                  </p>
                </AlertDescription>
              </Alert>
            ) : (
              /* ── Fluxo Credentials: campo de senha ── */
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
                  disabled={deletarConta.isPending}
                  className="border-red-200 focus:border-red-500"
                />
              </div>
            )}

            {/* Confirmação de texto — igual para os dois fluxos */}
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
                disabled={deletarConta.isPending || aguardandoOAuth}
                className="border-red-200 focus:border-red-500 font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Digite exatamente "DELETE" em letras maiúsculas
              </p>
            </div>

            {/* Checkbox — igual para os dois fluxos */}
            <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900">
              <Checkbox
                id="termos"
                checked={aceitaTermos}
                onCheckedChange={(checked) =>
                  setAceitaTermos(checked as boolean)
                }
                disabled={deletarConta.isPending || aguardandoOAuth}
                className="mt-0.5"
              />
              <label
                htmlFor="termos"
                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer leading-tight"
              >
                Eu entendo que esta ação é permanente e que todos os meus dados,
                incluindo contas, transações e configurações, serão deletados
                para sempre.
              </label>
            </div>

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
              disabled={deletarConta.isPending || aguardandoOAuth}
            >
              Cancelar
            </Button>

            {/* ── Botão OAuth: redireciona para reautenticar ── */}
            {isOAuth && !oauthReautenticado ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!validarFormulario()) return;
                  await handleReautenticarGoogle();
                }}
                disabled={
                  aguardandoOAuth || confirmacao !== "DELETE" || !aceitaTermos
                }
              >
                {aguardandoOAuth ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Redirecionando...
                  </>
                ) : (
                  <>
                    <FcGoogle size={16} className="mr-2" />
                    Confirmar com Google
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeletarConta}
                disabled={
                  deletarConta.isPending ||
                  confirmacao !== "DELETE" ||
                  !aceitaTermos
                }
              >
                {deletarConta.isPending ? (
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dica final */}
      <Alert className="bg-gray-50 dark:bg-gray-900">
        <AlertDescription className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Dica:</strong> Antes de deletar, você pode exportar seus dados
          para backup. Entre em contato com o suporte se precisar de ajuda.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ── Export padrão com Suspense ──────────────────────────────────────────────
export default function DeletarContaCard({ usuario }: Props) {
  return (
    <Suspense fallback={null}>
      <DeletarContaInner usuario={usuario} />
    </Suspense>
  );
}
