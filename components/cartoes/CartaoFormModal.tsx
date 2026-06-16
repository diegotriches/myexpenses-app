"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Cartao, CreateCartaoDTO, UpdateCartaoDTO } from "@/types/cartao";
import CartaoForm from "@/components/cartoes/CartaoForm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cartaoEdicao: Cartao | null;
  salvar: (dados: CreateCartaoDTO | UpdateCartaoDTO) => Promise<void>;
}

export default function CartaoFormModal({
  open,
  onOpenChange,
  cartaoEdicao,
  salvar,
}: Props) {
  async function handleSubmit(values: CreateCartaoDTO | UpdateCartaoDTO) {
    await salvar(values);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ max-w reduzido de 650px para 560px — form ficou mais compacto
          com os campos lado a lado, então o modal não precisa ser tão largo */}
      <DialogContent className="h-[100dvh] md:h-auto sm:max-w-[560px] p-0 gap-0 flex flex-col">
        {/* Header Fixo */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b dark:border-gray-800 shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {cartaoEdicao ? "Editar Cartão" : "Novo Cartão"}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-400">
            {cartaoEdicao
              ? "Atualize as informações do seu cartão"
              : "Adicione um novo cartão de crédito ou débito"}
          </DialogDescription>
        </DialogHeader>

        {/* Conteúdo Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <CartaoForm
            initialValues={cartaoEdicao}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}