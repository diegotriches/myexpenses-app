"use client";

import { useState } from "react";
import { BsList, BsChevronLeft, BsCalculatorFill } from "react-icons/bs";
import { FiSun, FiMoon, FiLogOut } from "react-icons/fi";
import PeriodoSelector from "@/components/PeriodoSelector";
import CalculadoraModal from "@/components/CalculadoraModal";

interface TopMenuProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const TopMenu = ({ isCollapsed, toggleSidebar }: TopMenuProps) => {
  const [modoNoturno, setModoNoturno] = useState(false);
  const [calculadoraOpen, setCalculadoraOpen] = useState(false);

  const alternarModo = () => setModoNoturno(!modoNoturno);

  // Estilo base para botões com efeito de inversão de cores
  const botaoEstilo =
    "w-10 h-10 flex items-center justify-center rounded-lg text-blue-600 bg-transparent cursor-pointer " +
    "hover:bg-blue-600 hover:text-white " +
    "transform hover:scale-110 transition-transform duration-200 ";

  return (
    <header
      className="
        fixed top-0 right-0 left-0 h-14
        bg-white shadow-md z-50
        flex items-center justify-between px-6
      "
      style={{ marginLeft: isCollapsed ? "80px" : "256px" }}
    >
      {/* Botão para abrir/fechar sidebar */}
      <button onClick={toggleSidebar} className={botaoEstilo}>
        {isCollapsed ? <BsList size={20} /> : <BsChevronLeft size={20} />}
      </button>

      {/* Periodo Selector centralizado */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <PeriodoSelector />
      </div>

      {/* Botões do lado direito */}
      <div className="flex items-center gap-2">
        {/* Botão da Calculadora */}
        <button
          className={botaoEstilo}
          title="Calculadora"
          onClick={() => setCalculadoraOpen(true)}
        >
          <BsCalculatorFill size={20} />
        </button>

        {/* Botão de alternar modo noturno */}
        <button onClick={alternarModo} className={botaoEstilo} title="Alternar modo">
          {modoNoturno ? <FiMoon size={20} /> : <FiSun size={20} />}
        </button>

        {/* Separador vertical */}
        <div className="h-6 border-l border-gray-300" />

        {/* Botão de logout */}
        <button
          className="
            w-10 h-10 flex items-center justify-center rounded-lg text-red-600 bg-transparent cursor-pointer
            hover:bg-red-600 hover:text-white
            transform hover:scale-110 transition-transform duration-200
          "
          title="Sair"
        >
          <FiLogOut size={20} />
        </button>
      </div>

      {/* Modal da Calculadora */}
      <CalculadoraModal open={calculadoraOpen} onOpenChange={setCalculadoraOpen} />
    </header>
  );
};

export default TopMenu;
