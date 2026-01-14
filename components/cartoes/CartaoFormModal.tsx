"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900 dark:text-white">
            {cartaoEdicao ? "Editar Cartão" : "Novo Cartão"}
          </DialogTitle>
        </DialogHeader>

        <CartaoForm
          initialValues={cartaoEdicao}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}