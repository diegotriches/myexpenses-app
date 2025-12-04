"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/services/api";

import { BsHouse, BsArrowLeftRight, BsBarChart, BsCashCoin, BsList, BsX, BsFillPersonFill } from "react-icons/bs";

const Navbar = () => {
  const [menuAberto, setMenuAberto] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);

  const toggleMenu = () => {
    setMenuAberto(!menuAberto);
  };

  // Buscar a foto do usuário ao carregar o Navbar
  useEffect(() => {
    api.get("/usuarios")
      .then(res => {
        if (res.data && res.data.foto) {
          setFotoPerfil(`${res.config.baseURL}${res.data.foto}`);
        } else if (Array.isArray(res.data) && res.data.length > 0 && res.data[0].foto) {
          setFotoPerfil(`${res.config.baseURL}${res.data[0].foto}`);
        }
      })
      .catch(err => console.error("Erro ao carregar foto do usuário:", err));
  }, []);

  return (
    <nav className="bg-[#007bff] text-white p-3 flex rounded-xl justify-between flex-col md:flex-row">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-[1.2rem] font-bold flex items-center gap-1">
          <BsCashCoin id="text-[1.2rem] font-bold flex items-center gap-1" /> MyExpenses
        </h1>

        <button className="md:hidden bg-transparent border-none text-white cursor-pointer" onClick={toggleMenu}>
          {menuAberto ? <BsX size={28} /> : <BsList size={28} />}
        </button>
      </div>

      <div className={`"hidden md:flex gap-4 mt-2" ${menuAberto ? "ativo" : ""}`}>
        <Link href="/dashboard" onClick={() => setMenuAberto(false)} className="flex items-center gap-1 text-white no-underline py-1 px-2 rounded-md transition-colors duration-300 hover:bg-[#1565c0]">
          <BsHouse className="icon" /> Home
        </Link>

        <Link href="/movimentacao" onClick={() => setMenuAberto(false)} className="flex items-center gap-1 text-white no-underline py-1 px-2 rounded-md transition-colors duration-300 hover:bg-[#1565c0]">
          <BsArrowLeftRight className="icon" /> Movimentação
        </Link>

        <Link href="/relatorios" onClick={() => setMenuAberto(false)} className="flex items-center gap-1 text-white no-underline py-1 px-2 rounded-md transition-colors duration-300 hover:bg-[#1565c0]">
          <BsBarChart className="icon" /> Relatórios
        </Link>

        <Link href="/perfil" onClick={() => setMenuAberto(false)} className="flex items-center gap-1 text-white no-underline py-1 px-2 rounded-md transition-colors duration-300 hover:bg-[#1565c0]">
          {fotoPerfil ? (
            <img src={fotoPerfil} alt="Perfil" className="w-[35px] h-[35px] rounded-full border-2 border-white object-cover cursor-pointer transition-transform duration-200 hover:scale-105" />
          ) : (
            <BsFillPersonFill className="icon" />
          )}
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
