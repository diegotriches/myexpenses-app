"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import EditarDadosCard from "@/components/ajustes/EditarDadosCard";
import EditarFotoCard from "@/components/ajustes/EditarFotoCard";
import DeletarContaCard from "@/components/ajustes/DeletarContaCard";
import AjustesTabs from "@/components/ajustes/AjustesTabs";

interface Usuario {
  id?: number;
  nome: string;
  email: string;
  foto?: string | null;
}

export default function Ajustes() {
  const [usuario, setUsuario] = useState<Usuario>({
    nome: "",
    email: "",
    foto: null,
  });

  const [aba, setAba] = useState("dados"); // aba ativa

  useEffect(() => {
    axios
      .get("http://localhost:5000/users/me")
      .then((res) => {
        if (res.data) {
          setUsuario({
            id: res.data.id,
            nome: res.data.name,
            email: res.data.email,
            foto: res.data.foto || null,
          });
        }
      })
      .catch((err) => console.error("Erro ao buscar usuário:", err));
  }, []);

  const atualizarUsuario = (dados: Partial<Usuario>) => {
    setUsuario((prev) => ({ ...prev, ...dados }));
  };

  const atualizarFoto = (foto: string | null) => {
    setUsuario((prev) => ({ ...prev, foto }));
  };

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <AjustesTabs
        abas={[
          { label: "Dados Pessoais", value: "dados" },
          { label: "Foto", value: "foto" },
          { label: "Deletar Conta", value: "conta" },
        ]}
        abaAtiva={aba}
        setAba={setAba}
      />

      {aba === "dados" && <EditarDadosCard usuario={usuario} atualizarUsuario={atualizarUsuario} />}
      {aba === "foto" && <EditarFotoCard usuario={usuario} atualizarUsuario={atualizarUsuario} />}
      {aba === "conta" && <DeletarContaCard usuario={usuario} />}

    </div>
  );
}
