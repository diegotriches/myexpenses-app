"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BsList, BsChevronLeft, BsCalculatorFill } from "react-icons/bs";
import { Sun, Moon, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PeriodoSelector from "@/components/common/PeriodoSelector";
import CalculadoraModal from "@/components/common/CalculadoraModal";
import { useTheme } from "@/contexts/ThemeContext";

interface TopMenuProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const TopMenu = ({ isCollapsed, toggleSidebar }: TopMenuProps) => {
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [calculadoraOpen, setCalculadoraOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const alternarModo = () => {
    // Alterna apenas entre light e dark (não usa system no toggle rápido)
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  // Gerar breadcrumbs baseado na rota
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      movimentacao: 'Movimentações',
      contas: 'Contas',
      cartoes: 'Cartões',
      categorias: 'Categorias',
      ajustes: 'Ajustes',
      perfil: 'Perfil',
      extrato: 'Extrato',
    };

    return paths.map((path, index) => ({
      label: labels[path] || path,
      href: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header
      className={`
        fixed top-0 right-0 h-16
        bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700
        shadow-sm z-30
        flex items-center justify-between px-4 md:px-6
        transition-all duration-300
        ${isCollapsed ? 'left-20' : 'left-64'}
        md:${isCollapsed ? 'left-20' : 'left-64'}
        left-0
      `}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Toggle Sidebar Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="hidden md:flex text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <BsList size={20} /> : <BsChevronLeft size={20} />}
        </Button>

        {/* Breadcrumbs - Desktop only */}
        <nav className="hidden lg:flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight size={14} className="text-gray-400" />
              )}
              {crumb.isLast ? (
                <span className="font-semibold text-gray-900 dark:text-white">
                  {crumb.label}
                </span>
              ) : (
                <button
                  onClick={() => router.push(crumb.href)}
                  className="text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                >
                  {crumb.label}
                </button>
              )}
            </div>
          ))}
        </nav>

        {/* Page Title - Mobile only */}
        <h1 className="lg:hidden font-semibold text-gray-900 dark:text-white">
          {breadcrumbs[breadcrumbs.length - 1]?.label || 'MyExpenses'}
        </h1>
      </div>

      {/* Center Section - Periodo Selector */}
      <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2">
        <PeriodoSelector />
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Calculadora Button - Desktop */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCalculadoraOpen(true)}
          className="hidden md:flex text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800"
          title="Calculadora"
        >
          <BsCalculatorFill size={18} />
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={alternarModo}
          className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800"
          title={effectiveTheme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {effectiveTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
        </Button>

        {/* Divider */}
        <div className="hidden md:block h-6 w-px bg-gray-300 dark:bg-gray-600" />

        {/* Logout Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:bg-red-900/20"
              title="Menu de usuário"
            >
              <LogOut size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => router.push('/perfil')}
              className="cursor-pointer"
            >
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/ajustes')}
              className="cursor-pointer"
            >
              Ajustes
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setCalculadoraOpen(true)}
              className="cursor-pointer md:hidden"
            >
              <BsCalculatorFill className="mr-2 h-4 w-4" />
              Calculadora
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 dark:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modal da Calculadora */}
      <CalculadoraModal open={calculadoraOpen} onOpenChange={setCalculadoraOpen} />
    </header>
  );
};

export default TopMenu;