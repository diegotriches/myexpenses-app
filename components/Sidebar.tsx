"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [email, setEmail] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    api
      .get("/users")
      .then((res) => {
        let userData;
        if (res.data && res.data.foto) {
          userData = res.data;
        } else if (Array.isArray(res.data) && res.data.length > 0) {
          userData = res.data[0];
        }

        if (userData) {
          if (userData.foto) setFotoPerfil(`${res.config.baseURL}${userData.foto}`);
          if (userData.email) setEmail(userData.email);
        }
      })
      .catch((err) => console.error("Erro ao carregar dados do usuário:", err));
  }, []);

  const linkClasses = (href: string) => {
    const base = "flex items-center gap-3 p-2 rounded-md transition-colors";
    const hover = "hover:bg-[#1565c0]";
    const ativo = "bg-[#1565c0]";
    return `${base} ${hover} ${pathname === href ? ativo : ""}`;
  };

  return (
    <nav
      className={`
        fixed top-0 left-0 h-screen
        bg-[#007bff] text-white p-4 flex flex-col transition-all duration-300
        ${isCollapsed ? "w-20" : "w-64"}
      `}
    >
      {/* Logo */}
      <h1 className="text-xl font-bold flex items-center gap-2 mb-8">
        <BsCashCoin size={24} />
        {!isCollapsed && <span>MyExpenses</span>}
      </h1>

      {/* Links */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard" className={linkClasses("/dashboard")}>
          <BsHouse size={20} />
          {!isCollapsed && "Dashboard"}
        </Link>

        <Link href="/movimentacao" className={linkClasses("/movimentacao")}>
          <BsArrowLeftRight size={20} />
          {!isCollapsed && "Movimentação"}
        </Link>

        <Link href="/categorias" className={linkClasses("/categorias")}>
          <BsTags size={20} />
          {!isCollapsed && "Categorias"}
        </Link>

        <Link href="/cartoes" className={linkClasses("/cartoes")}>
          <BsCreditCard size={20} />
          {!isCollapsed && "Cartões"}
        </Link>

        <Link href="/contas" className={linkClasses("/contas")}>
          <BsBank size={20} />
          {!isCollapsed && "Contas"}
        </Link>

        <Link href="/ajustes" className={linkClasses("/ajustes")}>
          <BsFillGearFill size={20} />
          {!isCollapsed && "Ajustes"}
        </Link>
      </div>

      {/* Bottom: foto e e-mail */}
      <div className="mt-auto flex items-center gap-2 p-2 bg-[#005bb5] rounded-md">
        <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden flex items-center justify-center bg-gray-300">
          {fotoPerfil ? (
            <img
              src={fotoPerfil}
              alt="Perfil"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-white font-bold text-lg">
              {email ? email[0].toUpperCase() : "U"}
            </span>
          )}
        </div>
        {!isCollapsed && email && (
          <span className="text-sm truncate">{email}</span>
        )}
      </div>
    </nav>
  );
};

export default Sidebar;