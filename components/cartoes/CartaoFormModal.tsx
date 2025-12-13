"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Cartao } from "@/types/cartao";
import CartaoForm, { CartaoFormValues } from "@/components/cartoes/CartaoForm";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cartaoEdicao: Cartao | null;
  salvar: (dados: Cartao) => Promise<void>;
}

export default function CartaoFormModal({
  open,
  onOpenChange,
  cartaoEdicao,
  salvar,
}: Props) {
  async function handleSubmit(values: CartaoFormValues) {
    await salvar(values as Cartao);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cartaoEdicao ? "Editar Cartão" : "Novo Cartão"}
          </DialogTitle>
        </DialogHeader>

        <CartaoForm
          initialValues={cartaoEdicao}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />

        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
