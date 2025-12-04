"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface Usuario {
  id?: number;
  nome: string;
  email: string;
  rendaMensal: number;
  metaEconomia: number;
  foto?: string | null;
}

export default function Perfil() {
  const [usuario, setUsuario] = useState<Usuario>({
    nome: "",
    email: "",
    rendaMensal: 0,
    metaEconomia: 0,
  });

  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const [editando, setEditando] = useState(false);

  // Buscar usuário do backend
  useEffect(() => {
    axios.get("http://localhost:5000/usuarios")
      .then((res) => {
        if (res.data) setUsuario(res.data);
      })
      .catch((err) => console.error("Erro ao buscar usuário:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUsuario((prev) => ({ ...prev, [name]: value }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNovaFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };


  const salvarPerfil = async () => {
    try {
      if (usuario.id) {
        // Atualiza
        await axios.put(`http://localhost:5000/usuarios/${usuario.id}`, usuario);
      } else {
        // Cria
        const res = await axios.post("http://localhost:5000/usuarios", usuario);
        setUsuario(res.data);
      }
      setEditando(false);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
    }
  };

  const enviarFoto = async () => {
    if (!usuario.id || !novaFoto) return;

    const formData = new FormData();
    formData.append("foto", novaFoto);

    try {
      setEnviandoFoto(true);
      const res = await axios.post(
        `http://localhost:5000/usuarios/${usuario.id}/foto`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setUsuario(res.data); // atualiza com o novo caminho da foto
      setPreview(null);
      setNovaFoto(null);
    } catch (err) {
      console.error("Erro ao enviar foto:", err);
    } finally {
      setEnviandoFoto(false);
    }
  };


  return (
    <div className="p-4 sm:p-8 max-w-[600px] mx-auto my-8 bg-white text-[#333] rounded-2xl">
      <h2 className="text-center mb-6">Perfil do Usuário</h2>

      <div className="flex flex-col items-center mb-5">
        <img
          src={
            preview
              ? preview
              : usuario.foto
                ? `http://localhost:5000${usuario.foto}`
                : "/default-avatar.png"
          }
          alt="Foto de perfil"
          className="w-[120px] h-[120px] rounded-full object-cover border-[3px] border-gray-300
         shadow-[0_0_6px_rgba(0,0,0,0.1)] mb-2"
        />
        <label className="bg-[#007bff] text-white px-3 py-1.5 rounded-md cursor-pointer text-sm
         transition-colors duration-200 hover:bg-[#0056b3]">
          📷 Alterar foto
          <input
            type="file"
            accept="image/*"
            onChange={handleFotoChange}
            className="hidden"
          />
        </label>

        {preview && (
          <button
            onClick={enviarFoto}
            className="mt-2 px-3 py-1.5 bg-[#28a745] text-white rounded-md cursor-pointer
         transition-colors duration-200 hover:bg-[#218838]"
            disabled={enviandoFoto}
          >
            {enviandoFoto ? "Enviando..." : "Salvar nova foto"}
          </button>
        )}
      </div>


      <div>
        <label className="flex flex-col mb-4">
          Nome:
          <input
            type="text"
            name="nome"
            value={usuario.nome}
            onChange={handleChange}
            disabled={!editando}
            className="p-2.5 bg-[#2b2b2b] text-white rounded-lg border-none mt-1 text-base
         disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col mb-4">
          E-mail:
          <input
            type="email"
            name="email"
            value={usuario.email}
            onChange={handleChange}
            disabled={!editando}
            className="p-2.5 bg-[#2b2b2b] text-white rounded-lg border-none mt-1 text-base
         disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col mb-4">
          Renda Mensal:
          <input
            type="number"
            name="rendaMensal"
            value={usuario.rendaMensal}
            onChange={handleChange}
            disabled={!editando}
            className="p-2.5 bg-[#2b2b2b] text-white rounded-lg border-none mt-1 text-base
         disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col mb-4">
          Meta de Economia:
          <input
            type="number"
            name="metaEconomia"
            value={usuario.metaEconomia}
            onChange={handleChange}
            disabled={!editando}
            className="p-2.5 bg-[#2b2b2b] text-white rounded-lg border-none mt-1 text-base
         disabled:opacity-70 disabled:cursor-not-allowed"
          />
        </label>

        <div className="flex justify-center gap-4 mt-6">
          {editando ? (
            <button onClick={salvarPerfil} className="px-5 py-2.5 rounded-lg font-semibold text-white bg-[#00c49f] cursor-pointer
         transition-colors duration-300 hover:bg-[#009b7a]">
              💾 Salvar
            </button>
          ) : (
            <button onClick={() => setEditando(true)} className="px-5 py-2.5 rounded-lg font-semibold text-white bg-[#007bff] cursor-pointer
         transition-colors duration-300 hover:bg-[#0056b3]">
              ✏️ Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}