"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/services/api";

import {
  BsHouse,
  BsArrowLeftRight,
  BsBank,
  BsCashCoin,
  BsTags,
  BsCreditCard,
  BsFillGearFill,
} from "react-icons/bs";

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar = ({ isCollapsed }: SidebarProps) => {
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/usuarios")
      .then((res) => {
        if (res.data && res.data.foto) {
          setFotoPerfil(`${res.config.baseURL}${res.data.foto}`);
        } else if (Array.isArray(res.data) && res.data.length > 0 && res.data[0].foto) {
          setFotoPerfil(`${res.config.baseURL}${res.data[0].foto}`);
        }
      })
      .catch((err) => console.error("Erro ao carregar foto do usuário:", err));
  }, []);

  return (
    <nav
      className={`
        fixed top-0 left-0 h-screen
        bg-[#007bff] text-white p-4 flex flex-col transition-all duration-300
        ${isCollapsed ? "w-20" : "w-64"}
      `}
    >
      <h1 className="text-xl font-bold flex items-center gap-2 mb-8">
        <BsCashCoin size={24} />
        {!isCollapsed && <span>MyExpenses</span>}
      </h1>

      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className="flex items-center gap-3 p-2 hover:bg-[#1565c0] rounded-md">
          <BsHouse size={20} />
          {!isCollapsed && "Dashboard"}
        </Link>

        <Link href="/movimentacao" className="flex items-center gap-3 p-2 hover:bg-[#1565c0] rounded-md">
          <BsArrowLeftRight size={20} />
          {!isCollapsed && "Movimentação"}
        </Link>

        <Link href="/categorias" className="flex items-center gap-3 p-2 hover:bg-[#1565c0] rounded-md">
          <BsTags size={20} />
          {!isCollapsed && "Categorias"}
        </Link>

        <Link href="/cartoes" className="flex items-center gap-3 p-2 hover:bg-[#1565c0] rounded-md">
          <BsCreditCard size={20} />
          {!isCollapsed && "Cartões"}
        </Link>

        <Link href="/contas" className="flex items-center gap-3 p-2 hover:bg-[#1565c0] rounded-md">
          <BsBank size={20} />
          {!isCollapsed && "Contas"}
        </Link>

        <Link href="/ajustes" className="flex items-center gap-3 p-2 hover:bg-[#1565c0] rounded-md">
          {fotoPerfil ? (
            <img
              src={fotoPerfil}
              alt="Ajustes"
              className="w-[35px] h-[35px] rounded-full border-2 border-white object-cover"
            />
          ) : (
            <BsFillGearFill size={20} />
          )}
          {!isCollapsed && "Ajustes"}
        </Link>
      </div>
    </nav>
  );
};

export default Sidebar;