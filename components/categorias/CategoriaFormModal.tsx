"use client";

import { useState, useEffect } from "react";
import { Categoria } from "app/(dashboard)/categorias/page";
import api from "@/services/api";
import { iconOptions } from "@/utils/iconOptions";
import IconPickerModal from "@/components/categorias/IconPickerModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LucideCircle } from "lucide-react";

type Props = {
  aberto: boolean;
  onClose: () => void;
  categoria: Categoria | null;
  refresh: () => void;
};

export default function CategoriaFormModal({
  aberto,
  onClose,
  categoria,
  refresh,
}: Props) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [icon, setIcon] = useState("FaWallet");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  useEffect(() => {
    if (categoria) {
      setNome(categoria.nome);
      setTipo(categoria.tipo);
      setIcon(categoria.icon);
    } else {
      setNome("");
      setTipo("entrada");
      setIcon("FaWallet");
    }
  }, [categoria]);

  if (!aberto) return null;

  const salvar = async () => {
    try {
      const payload = { nome, tipo, icon };

      if (categoria) {
        await api.put(`/categorias/${categoria.id}`, payload);
        onClose();

      } else {
        await api.post("/categorias", payload);
        setNome("");
        setTipo("entrada");
        setIcon("FaWallet");
        onClose();
      }

      refresh();
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const IconComp = iconOptions.find(i => i.name === icon)?.component;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded-xl w-[420px] shadow-xl">
          {/* Título principal */}
          <h2 className="text-xl font-semibold mb-1 text-center">
            {categoria ? "Editar Categoria" : "Nova Categoria"}
          </h2>

          {/* Descrição */}
          <p className="text-gray-600 text-sm mb-6 text-center">
            {categoria
              ? "Altere os detalhes da categoria selecionada."
              : "Preencha as informações para criar uma nova categoria."}
          </p>

          <div className="space-y-5">
            {/* Nome */}
            <div>
              <h3 className="text-sm font-medium mb-2">Nome</h3>
              <input
                type="text"
                placeholder="Ex.: Saúde"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tipo */}
            <div>
              <h3 className="text-sm font-medium mb-2">Tipo da Categoria</h3>
              <Select value={tipo} onValueChange={(val) => setTipo(val as "entrada" | "saida")}>
                <SelectTrigger className="w-full border border-gray-300 rounded-md px-3 py-2 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="entrada" className="flex items-center gap-3 px-2 py-1 rounded hover:bg-green-50">
                    <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                    Receita
                  </SelectItem>

                  <SelectItem value="saida" className="flex items-center gap-3 px-2 py-1 rounded hover:bg-red-50">
                    <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
                    Despesa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ícone */}
            <div>
              <h3 className="text-sm font-medium mb-2">Ícone</h3>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 border border-gray-300 rounded-full flex items-center justify-center p-2 shadow-sm">
                  {IconComp ? <IconComp size={28} /> : "—"}
                </div>

                <button
                  type="button"
                  className="w-full py-2 px-4 border rounded-full hover:bg-gray-100 cursor-pointer shadow-sm text-sm font-medium"
                  onClick={() => setIconPickerOpen(true)}
                >
                  Selecionar Ícone
                </button>
              </div>

              <p className="text-gray-500 text-xs mt-2 text-center">
                Escolha um ícone para representar a categoria.
              </p>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-900 cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>

      <IconPickerModal
        aberto={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(iconName) => setIcon(iconName)}
      />
    </>
  );
}