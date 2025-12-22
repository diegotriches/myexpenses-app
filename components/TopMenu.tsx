"use client";

import { BsList, BsChevronLeft } from "react-icons/bs";
import PeriodoSelector from "@/components/PeriodoSelector";

interface TopMenuProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const TopMenu = ({ isCollapsed, toggleSidebar }: TopMenuProps) => {
  return (
    <header
      className="
        fixed top-0 right-0 left-0 h-14
        bg-white shadow-md z-50
        flex items-center justify-between px-6
      "
      style={{ marginLeft: isCollapsed ? "80px" : "256px" }}
    >
      {/* Botão da Sidebar */}
      <button
        onClick={toggleSidebar}
        className="p-2 rounded hover:bg-gray-200 transition cursor-pointer"
      >
        {isCollapsed ? <BsList size={22} /> : <BsChevronLeft size={22} />}
      </button>

      {/* Seletor de Período */}
      <PeriodoSelector />
    </header>
  );
};

export default TopMenu;