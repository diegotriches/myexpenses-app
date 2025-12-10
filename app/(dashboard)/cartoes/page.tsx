"use client";

import { useState } from "react";
import { useCartoes } from "@/hooks/useCartoes";
import { Cartao, TipoCartao } from "@/types/cartao";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BsPencil, BsTrash, BsCreditCard2Back } from "react-icons/bs";
import { MdAdd } from "react-icons/md";

export default function CartoesPage() {
  const { cartoes, loading, carregar } = useCartoes();

  const [modalOpen, setModalOpen] = useState(false);
  const [cartaoEditando, setCartaoEditando] = useState<Cartao | null>(null);

  const [form, setForm] = useState({
    nome: "",
    tipo: "credito" as TipoCartao,
    bandeira: "",
    limite: "",
    limiteDisponivel: "",
    diaFechamento: "",
    diaVencimento: "",
    cor: "#4F46E5",
    icone: "credit-card",
    ativo: true,
    observacoes: "",
  });

  function abrirNovo() {
    setCartaoEditando(null);
    setForm({
      nome: "",
      tipo: "credito",
      bandeira: "",
      limite: "",
      limiteDisponivel: "",
      diaFechamento: "",
      diaVencimento: "",
      cor: "#4F46E5",
      icone: "credit-card",
      ativo: true,
      observacoes: "",
    });
    setModalOpen(true);
  }

  function abrirEdicao(c: Cartao) {
    setCartaoEditando(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      bandeira: c.bandeira,
      limite: c.limite?.toString() ?? "",
      limiteDisponivel: c.limiteDisponivel?.toString() ?? "",
      diaFechamento: c.diaFechamento?.toString() ?? "",
      diaVencimento: c.diaVencimento?.toString() ?? "",
      cor: c.cor,
      icone: c.icone,
      ativo: c.ativo,
      observacoes: c.observacoes ?? "",
    });
    setModalOpen(true);
  }

  async function salvarCartao() {
    const payload: Partial<Cartao> = {
      nome: form.nome,
      tipo: form.tipo,
      bandeira: form.bandeira,
      limite: form.tipo === "credito" ? Number(form.limite) : 0,
      limiteDisponivel:
        form.tipo === "credito" ? Number(form.limiteDisponivel) : 0,
      diaFechamento:
        form.tipo === "credito" ? Number(form.diaFechamento) : undefined,
      diaVencimento:
        form.tipo === "credito" ? Number(form.diaVencimento) : undefined,
      cor: form.cor,
      icone: form.icone,
      ativo: form.ativo,
      observacoes: form.observacoes,
    };

    if (cartaoEditando) {
      await fetch(`/api/cartoes/${cartaoEditando.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/cartoes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    await carregar();
    setModalOpen(false);
  }

  async function excluirCartao(id: number) {
    if (!window.confirm("Confirmar exclusão do cartão?")) return;

    await fetch(`/api/cartoes/${id}`, { method: "DELETE" });
    carregar();
  }

  return (
  <div className="max-w-[900px] mx-auto p-6">

    {/* TÍTULO COM ÍCONE E DESCRIÇÃO */}
    <div>
      <div className="flex items-center gap-2 mb-3">
        <BsCreditCard2Back className="text-3xl text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Cartões</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Gerencie todos os seus cartões de crédito, débito ou múltiplos em um só lugar. 
        Visualize informações como limite, vencimento e bandeira, e organize seus pagamentos de forma prática e segura.
      </p>
      <hr className="border-t border-gray-300 my-4" />
    </div>

    {/* BOTÃO DE ADICIONAR NOVO CARTÃO */}
    <div className="flex justify-end mb-6">
      <Button onClick={abrirNovo} className="flex cursor-pointer items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-900 transition">
        <MdAdd className="text-x1" /> Novo Cartão
      </Button>
    </div>

    {/* CARDS DE CARTÕES */}
    {loading ? (
      <p className="text-gray-600">Carregando cartões...</p>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cartoes.map((c) => (
          <Card key={c.id} className="shadow-sm rounded-xl overflow-hidden">
            <CardHeader
              style={{ backgroundColor: c.cor }}
              className="text-white rounded-t-xl p-4"
            >
              <CardTitle className="text-lg font-bold">{c.nome}</CardTitle>
              <p className="text-sm opacity-90">{c.bandeira}</p>
            </CardHeader>

            <CardContent className="space-y-2 p-4">
              <p>Tipo: {c.tipo}</p>

              {c.tipo === "credito" && (
                <>
                  <p>Limite: R$ {c.limite?.toFixed(2)}</p>
                  <p>Disponível: R$ {c.limiteDisponivel?.toFixed(2)}</p>
                  <p>Fechamento: {c.diaFechamento}</p>
                  <p>Vencimento: {c.diaVencimento}</p>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => abrirEdicao(c)} className="flex items-center gap-2">
                  <BsPencil /> Editar
                </Button>

                <Button variant="destructive" onClick={() => excluirCartao(c.id)} className="flex items-center gap-2">
                  <BsTrash /> Excluir
                </Button>

                {c.tipo === "credito" && (
                  <Button onClick={() => (window.location.href = `/cartoes/${c.id}/fatura`)}>
                    Ver Fatura
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}

    {/* MODAL */}
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cartaoEditando ? "Editar Cartão" : "Novo Cartão"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input placeholder="Bandeira" value={form.bandeira} onChange={(e) => setForm({ ...form, bandeira: e.target.value })} />

          <Select value={form.tipo} onValueChange={(v: TipoCartao) => setForm({ ...form, tipo: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo do cartão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="credito">Crédito</SelectItem>
              <SelectItem value="debito">Débito</SelectItem>
              <SelectItem value="multiplo">Múltiplo</SelectItem>
            </SelectContent>
          </Select>

          {form.tipo === "credito" && (
            <>
              <Input type="number" placeholder="Limite" value={form.limite} onChange={(e) => setForm({ ...form, limite: e.target.value })} />
              <Input type="number" placeholder="Limite disponível" value={form.limiteDisponivel} onChange={(e) => setForm({ ...form, limiteDisponivel: e.target.value })} />
              <Input type="number" placeholder="Dia de fechamento" value={form.diaFechamento} onChange={(e) => setForm({ ...form, diaFechamento: e.target.value })} />
              <Input type="number" placeholder="Dia de vencimento" value={form.diaVencimento} onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })} />
            </>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={salvarCartao}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
);
}
