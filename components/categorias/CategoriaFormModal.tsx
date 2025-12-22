"use client";

import { useState, useEffect } from "react";
import { Categoria } from "app/(dashboard)/categorias/page";
import api from "@/services/api";
import { iconOptions } from "@/utils/iconOptions";
import IconPickerModal from "@/components/categorias/IconPickerModal";

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
        <div className="bg-white p-6 rounded-lg w-[420px] shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-center">
            {categoria ? "Editar Categoria" : "Nova Categoria"}
          </h2>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nome da categoria"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md w-full"
            />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border rounded flex items-center justify-center">
                {IconComp ? <IconComp size={24} /> : "—"}
              </div>

              <button
                type="button"
                className="px-3 py-2 border rounded hover:bg-gray-100 cursor-pointer"
                onClick={() => setIconPickerOpen(true)}
              >
                Selecionar Ícone
              </button>
            </div>

            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md w-full cursor-pointer"
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-900 cursor-pointer"
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