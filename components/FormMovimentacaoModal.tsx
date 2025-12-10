"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import { Transacao } from "@/types/transacao";
import { useCartoes } from "@/hooks/useCartoes";
import { useCategorias } from "@/hooks/useCategorias";

import { CartaoSelectItem } from "@/components/CartaoSelectItem";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transacaoEdicao: Transacao | null;
  salvar: (dados: Transacao) => Promise<void>;
}

export default function FormMovimentacaoModal({
  open,
  onOpenChange,
  transacaoEdicao,
  salvar,
}: Props) {

  const isEdit = !!transacaoEdicao;

  const [tipoSelecionado, setTipoSelecionado] = useState<"entrada" | "saida">(
    transacaoEdicao?.tipo
      ? (transacaoEdicao.tipo.toLowerCase() as "entrada" | "saida")
      : "entrada"
  );

  const [recorrenteSelecionado, setRecorrenteSelecionado] = useState(
    transacaoEdicao?.recorrente ?? false
  );

  const [repeticoes, setRepeticoes] = useState(
    transacaoEdicao?.repeticoes ?? 1
  );

  const { cartoes, loading: loadingCartoes } = useCartoes();
  const { categorias, loading: loadingCategorias } = useCategorias();

  const categoriasFiltradas = categorias.filter(
    (c) => c.tipo === tipoSelecionado
  );

  const [formaSelecionada, setFormaSelecionada] = useState<
    "dinheiro" | "pix" | "cartao"
  >(transacaoEdicao?.formaPagamento ?? "dinheiro");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const tipo = form.get("tipo") as "entrada" | "saida";
    const formaPagamento = form.get("formaPagamento") as "dinheiro" | "pix" | "cartao";

    const cartaoIdRaw = form.get("cartaoId");
    const cartaoId =
      formaPagamento === "cartao" && cartaoIdRaw
        ? Number(cartaoIdRaw)
        : null;

    const dados: Transacao = {
      id: transacaoEdicao?.id ?? 0,
      tipo,
      categoria: form.get("categoria") as string,
      valor: Number(form.get("valor")),
      data: form.get("data") as string,
      descricao: form.get("descricao") as string,
      formaPagamento,
      cartaoId,
      parcela: form.get("parcela")
        ? String(form.get("parcela"))
        : undefined,
      recorrente: recorrenteSelecionado,
      repeticoes: recorrenteSelecionado ? repeticoes : 1,
    };

    await salvar(dados);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Movimentação" : "Nova Movimentação"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select
              name="tipo"
              value={tipoSelecionado}
              onValueChange={(v) => {
                setTipoSelecionado(v as "entrada" | "saida");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            {loadingCategorias ? (
              <p>Carregando categorias...</p>
            ) : categoriasFiltradas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria cadastrada para este tipo.
              </p>
            ) : (
              <Select
                name="categoria"
                defaultValue={transacaoEdicao?.categoria ?? undefined}
                key={tipoSelecionado} // força reset ao mudar tipo
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoriasFiltradas.map((c) => (
                    <SelectItem key={c.id} value={c.nome}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

          </div>
          <div>
            <Label>Valor</Label>
            <Input
              type="number"
              step="0.01"
              name="valor"
              defaultValue={transacaoEdicao?.valor ?? ""}
              required
            />
          </div>
          <div>
            <Label>Data</Label>
            <Input
              type="date"
              name="data"
              defaultValue={transacaoEdicao?.data ?? ""}
              required
            />
          </div>
          <div>
            <Label>Descrição</Label>
            <Input
              name="descricao"
              defaultValue={transacaoEdicao?.descricao ?? ""}
            />
          </div>
          <div>
            <Label>Forma de Pagamento</Label>
            <Select
              name="formaPagamento"
              value={formaSelecionada}
              onValueChange={(v) =>
                setFormaSelecionada(v as "dinheiro" | "pix" | "cartao")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">Pix</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formaSelecionada === "cartao" && (
            <div>
              <Label>Cartão</Label>

              {loadingCartoes ? (
                <p>Carregando cartões...</p>
              ) : cartoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum cartão cadastrado.
                </p>
              ) : (
                <Select
                  name="cartaoId"
                  defaultValue={
                    transacaoEdicao?.cartaoId
                      ? String(transacaoEdicao.cartaoId)
                      : undefined
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    {cartoes.map((c) => (
                      <CartaoSelectItem key={c.id} cartao={c} />
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          <div>
            <Label>Parcela (opcional)</Label>
            <Input
              name="parcela"
              defaultValue={transacaoEdicao?.parcela ?? ""}
            />
          </div>
          <div>
            <Label>Recorrente</Label>
            <Select
              name="recorrente"
              value={recorrenteSelecionado ? "true" : "false"}
              onValueChange={(v) => setRecorrenteSelecionado(v === "true")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Não</SelectItem>
                <SelectItem value="true">Sim</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {recorrenteSelecionado && (
            <div>
              <Label>Repetições</Label>
              <Input
                type="number"
                name="repeticoes"
                min={1}
                value={repeticoes}
                onChange={(e) => setRepeticoes(Number(e.target.value))}
                required
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {isEdit ? "Salvar Alterações" : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
