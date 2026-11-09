"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  aberto: boolean;
  onFechar: () => void;
  titulo: ReactNode;
  /** Texto curto logo abaixo do título */
  descricao?: ReactNode;
  /** Conteúdo livre entre o cabeçalho e os botões */
  children?: ReactNode;
  onConfirmar: () => void;
  textoConfirmar?: ReactNode;
  textoCarregando?: ReactNode;
  textoCancelar?: ReactNode;
  /** Ícone à esquerda do texto de confirmar (some enquanto carrega) */
  iconeConfirmar?: ReactNode;
  /** Mostra o carregamento no botão de confirmar e impede fechar */
  carregando?: boolean;
  /** Impede confirmar, cancelar e fechar, sem mostrar carregamento (ex.: outra ação do modal em andamento) */
  bloqueado?: boolean;
  confirmarDesabilitado?: boolean;
  /** Classe do conteúdo, normalmente a largura (padrão sm:max-w-md) */
  className?: string;
}

/** Base dos modais de confirmação de ações destrutivas: título com alerta, corpo livre, Cancelar e Confirmar. */
export default function ConfirmDialog({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
  onConfirmar,
  textoConfirmar = "Excluir",
  textoCarregando = "Excluindo...",
  textoCancelar = "Cancelar",
  iconeConfirmar,
  carregando = false,
  bloqueado = false,
  confirmarDesabilitado = false,
  className = "sm:max-w-md",
}: Props) {
  const ocupado = carregando || bloqueado;

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && !ocupado) onFechar(); }}>
      <DialogContent className={`${className} dark:bg-gray-900 dark:border-gray-800`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            {titulo}
          </DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onFechar} disabled={ocupado}>
            {textoCancelar}
          </Button>
          <Button variant="destructive" onClick={onConfirmar} disabled={ocupado || confirmarDesabilitado}>
            {carregando ? (
              <><Loader2 size={16} className="mr-2 animate-spin" />{textoCarregando}</>
            ) : (
              <>{iconeConfirmar}{textoConfirmar}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
