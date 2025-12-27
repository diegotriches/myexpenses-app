"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";

import CategoriasTabs from "@/components/categorias/CategoriasTabs";
import CategoriaCard from "@/components/categorias/CategoriaCard";
import CategoriaFormModal from "@/components/categorias/CategoriaFormModal";
import ConfirmDeleteModal from "@/components/categorias/ConfirmDeleteModal";

export type Categoria = {
  id: number;
  nome: string;
  tipo: "entrada" | "saida";
  icon: string;
};

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [aba, setAba] = useState<"entrada" | "saida">("entrada");

  // Modais
  const [formModalAberto, setFormModalAberto] = useState(false);
  const [deleteModalAberto, setDeleteModalAberto] = useState(false);

  // Edição
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null);
  const [categoriaExcluir, setCategoriaExcluir] = useState<Categoria | null>(null);

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      const res = await api.get("/categorias");
      setCategorias(res.data);
    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
    }
  };

  const abrirCriacao = () => {
    setCategoriaEditando(null);
    setFormModalAberto(true);
  };

  const abrirEdicao = (categoria: Categoria) => {
    setCategoriaEditando(categoria);
    setFormModalAberto(true);
  };

  const abrirExclusao = (categoria: Categoria) => {
    setCategoriaExcluir(categoria);
    setDeleteModalAberto(true);
  };

  const categoriasFiltradas = categorias.filter(c => c.tipo === aba);

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <CategoriasTabs aba={aba} setAba={setAba} onCriar={abrirCriacao} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        {categoriasFiltradas.map(cat => (
          <CategoriaCard
            key={cat.id}
            categoria={cat}
            onEditar={() => abrirEdicao(cat)}
            onExcluir={() => abrirExclusao(cat)}
          />
        ))}
      </div>

      <CategoriaFormModal
        aberto={formModalAberto}
        onClose={() => setFormModalAberto(false)}
        categoria={categoriaEditando}
        refresh={fetchCategorias}
      />

      <ConfirmDeleteModal
        aberto={deleteModalAberto}
        onClose={() => setDeleteModalAberto(false)}
        categoria={categoriaExcluir}
        refresh={fetchCategorias}
      />
    </div>
  );
}
