"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Banknote, Pencil, Trash2 } from "lucide-react";
import { BsBank } from "react-icons/bs";

export default function ContasPage() {
  const [contas, setContas] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [novaConta, setNovaConta] = useState({
    nome: "",
    tipo: "corrente",
    status: "ativo",
    saldo: "",
    icone: "default",
  });

  function salvarConta() {
    setContas([...contas, { ...novaConta, id: Date.now() }]);
    setNovaConta({ nome: "", tipo: "corrente", status: "ativo", saldo: "", icone: "default" });
    setModalOpen(false);
  }

  return (
    <div className="max-w-[900px] mx-auto p-6 space-y-8">
      <div className="flex items-center gap-2 mb-3">
        <BsBank className="text-3xl text-blue-700" />
        <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
      </div>
      <p className="text-gray-600 mb-6">
        Nesta página você pode registrar e gerenciar todas as suas contas bancárias. Adicione novas contas,
        visualize saldos, tipos e status, além de editar ou remover quando necessário.
      </p>
      <hr className="border-t border-gray-300 my-4" />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogTrigger asChild>
          <Button className="flex cursor-pointer items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-900 transition">Adicionar Nova Conta</Button>
        </DialogTrigger>

        <DialogContent className="space-y-4">
          <DialogHeader>
            <DialogTitle>Registrar Nova Conta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ícone do Banco</Label>
              <Select
                onValueChange={(v) => setNovaConta({ ...novaConta, icone: v })}
                defaultValue="default"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ícone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão</SelectItem>
                  <SelectItem value="bank1">Banco 1</SelectItem>
                  <SelectItem value="bank2">Banco 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome da Conta</Label>
              <Input
                value={novaConta.nome}
                onChange={(e) => setNovaConta({ ...novaConta, nome: e.target.value })}
                placeholder="Ex: Nubank, Caixa, Carteira..."
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Conta</Label>
              <Select
                onValueChange={(v) => setNovaConta({ ...novaConta, tipo: v })}
                defaultValue="corrente"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrente">Conta Corrente</SelectItem>
                  <SelectItem value="poupanca">Poupança</SelectItem>
                  <SelectItem value="salario">Conta Salário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status da Conta</Label>
              <Select
                onValueChange={(v) => setNovaConta({ ...novaConta, status: v })}
                defaultValue="ativo"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Saldo Inicial</Label>
              <Input
                type="number"
                value={novaConta.saldo}
                onChange={(e) => setNovaConta({ ...novaConta, saldo: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={salvarConta}>Salvar Conta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
        {contas.map((conta) => (
          <Card key={conta.id} className="shadow-md">
            <CardHeader className="flex items-center gap-2">
              <Banknote />
              <div className="font-semibold">{conta.nome}</div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Saldo:</strong> R$ {conta.saldo}</p>
              <p><strong>Tipo:</strong> {conta.tipo}</p>
              <p><strong>Status:</strong> {conta.status}</p>

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline"><Pencil size={16} /></Button>
                <Button size="sm" variant="destructive"><Trash2 size={16} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}