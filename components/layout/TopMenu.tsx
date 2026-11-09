// src/components/layout/TopMenu.tsx
"use client";

import { useState } from "react";
import { useMounted } from "@/hooks/useMounted";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { BsList, BsChevronLeft, BsCalculatorFill } from "react-icons/bs";
import { Sun, Moon, LogOut, MoreVertical, Eye, EyeOff, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import PeriodoSelector      from "@/components/layout/PeriodoSelector";
import CalculadoraModal     from "@/components/common/CalculadoraModal";
import NotasPanel           from "@/components/common/NotasPanel";
import { NotificacaoPopover } from "@/components/notificacao/NotificacaoPopover";
import { useHideValues }    from "@/contexts/HideValuesContext";

interface TopMenuProps {
  isCollapsed:   boolean;
  toggleSidebar: () => void;
}

const TopMenu = ({ isCollapsed, toggleSidebar }: TopMenuProps) => {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const [calculadoraOpen,   setCalculadoraOpen]   = useState(false);
  const [notasPanelOpen,    setNotasPanelOpen]    = useState(false);
  const [showLogoutDialog,  setShowLogoutDialog]  = useState(false);
  const { hidden, toggle: toggleHide } = useHideValues();


  const alternarModo = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
  await signOut({ callbackUrl: `${window.location.origin}/login`, redirect: true });
};

  if (!mounted) {
    return (
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm z-30 flex items-center justify-between px-4 md:left-20 md:right-0 lg:left-64">
        <div className="flex items-center gap-3"><div className="w-10 h-10" /></div>
        <div className="flex items-center gap-2"><div className="w-10 h-10" /></div>
      </header>
    );
  }

  return (
    <>
      <header
        className={`
          fixed top-0 right-0 h-16
          bg-white dark:bg-gray-900
          border-b border-gray-200 dark:border-gray-700
          shadow-sm z-30
          transition-all duration-300
          left-0 md:left-20
          ${isCollapsed ? "lg:left-20" : "lg:left-64"}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 md:px-6">

          {/* ── LEFT ── */}
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Hamburguer - mobile */}
            <Button
              variant="ghost" size="icon"
              onClick={toggleSidebar}
              className="md:hidden h-12 w-12 flex-shrink-0 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800 touch-manipulation active:scale-95 transition-all duration-100"
              aria-label="Abrir menu lateral"
            >
              <BsList size={24} />
            </Button>

            {/* Toggle sidebar - tablet/desktop */}
            <Button
              variant="ghost" size="icon"
              onClick={toggleSidebar}
              className="hidden md:flex text-gray-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800 transition-all duration-100 active:scale-95"
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? <BsList size={20} /> : <BsChevronLeft size={20} />}
            </Button>
          </div>

          {/* ── CENTER ── */}
          <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2">
            <PeriodoSelector />
          </div>
          <div className="md:hidden flex-shrink-0 mx-2">
            <PeriodoSelector />
          </div>

          {/* ── RIGHT ── */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">

            {/* Ocultar valores - desktop/tablet */}
            <Button
              variant="ghost" size="icon"
              onClick={toggleHide}
              className={`hidden md:flex cursor-pointer transition-all duration-100 active:scale-95 ${
                hidden
                  ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                  : "text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
              title={hidden ? "Mostrar valores" : "Ocultar valores"}
              aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
            >
              {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>

            {/* Calculadora - desktop/tablet */}
            <Button
              variant="ghost" size="icon"
              onClick={() => setCalculadoraOpen(true)}
              className="hidden md:flex text-gray-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer dark:text-gray-300 dark:hover:bg-gray-800 transition-all duration-100 active:scale-95"
              title="Calculadora"
              aria-label="Abrir calculadora"
            >
              <BsCalculatorFill size={18} />
            </Button>

            {/* ✅ NOVO: Notas - desktop/tablet */}
            <Button
              variant="ghost" size="icon"
              onClick={() => setNotasPanelOpen((v) => !v)}
              className={`hidden md:flex cursor-pointer transition-all duration-100 active:scale-95 ${
                notasPanelOpen
                  ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  : "text-gray-600 hover:text-amber-500 hover:bg-amber-50 dark:text-gray-300 dark:hover:bg-amber-950/30"
              }`}
              title="Notas"
              aria-label="Abrir notas"
            >
              <StickyNote size={18} />
            </Button>

            {/* Theme toggle - desktop/tablet */}
            <Button
              variant="ghost" size="icon"
              onClick={alternarModo}
              className="hidden md:flex text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800 touch-manipulation active:scale-95 transition-all duration-100 cursor-pointer"
              title={resolvedTheme === "dark" ? "Modo claro" : "Modo escuro"}
              aria-label={resolvedTheme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {/* Notificações - todas as telas */}
            <NotificacaoPopover />

            {/* Divider - desktop */}
            <div className="hidden lg:block h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Logout - desktop/tablet */}
            <Button
              variant="ghost" size="icon"
              onClick={() => setShowLogoutDialog(true)}
              className="hidden md:flex text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:bg-red-900/20 cursor-pointer transition-all duration-100 active:scale-95"
              title="Sair"
              aria-label="Sair da conta"
            >
              <LogOut size={18} />
            </Button>

            {/* ── MENU RETICÊNCIAS - mobile apenas ── */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className="h-12 w-12 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800 touch-manipulation active:scale-95 transition-all duration-100"
                    aria-label="Mais opções"
                  >
                    <MoreVertical size={20} />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-48 dark:bg-gray-800 dark:border-gray-700">
                  {/* Ocultar valores */}
                  <DropdownMenuItem
                    onClick={toggleHide}
                    className="flex items-center gap-3 h-11 cursor-pointer dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    {hidden ? (
                      <><Eye size={17} className="text-blue-500 flex-shrink-0" /><span>Mostrar Valores</span></>
                    ) : (
                      <><EyeOff size={17} className="text-blue-500 flex-shrink-0" /><span>Ocultar Valores</span></>
                    )}
                  </DropdownMenuItem>

                  {/* Tema */}
                  <DropdownMenuItem
                    onClick={alternarModo}
                    className="flex items-center gap-3 h-11 cursor-pointer dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    {resolvedTheme === "dark" ? (
                      <><Sun size={17} className="text-amber-500 flex-shrink-0" /><span>Modo Claro</span></>
                    ) : (
                      <><Moon size={17} className="text-indigo-500 flex-shrink-0" /><span>Modo Escuro</span></>
                    )}
                  </DropdownMenuItem>

                  {/* Calculadora */}
                  <DropdownMenuItem
                    onClick={() => setCalculadoraOpen(true)}
                    className="flex items-center gap-3 h-11 cursor-pointer dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    <BsCalculatorFill size={16} className="text-blue-500 flex-shrink-0" />
                    <span>Calculadora</span>
                  </DropdownMenuItem>

                  {/* ✅ NOVO: Notas - mobile */}
                  <DropdownMenuItem
                    onClick={() => setNotasPanelOpen((v) => !v)}
                    className="flex items-center gap-3 h-11 cursor-pointer dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    <StickyNote size={16} className="text-amber-500 flex-shrink-0" />
                    <span>Notas</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="dark:bg-gray-700" />

                  {/* Logout */}
                  <DropdownMenuItem
                    onClick={() => setShowLogoutDialog(true)}
                    className="flex items-center gap-3 h-11 cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                  >
                    <LogOut size={17} className="flex-shrink-0" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* ── MODAIS E PAINÉIS ── */}
      <CalculadoraModal open={calculadoraOpen} onOpenChange={setCalculadoraOpen} />

      {/* Painel de notas */}
      <NotasPanel open={notasPanelOpen} onOpenChange={setNotasPanelOpen} />

      <ConfirmDialog
        aberto={showLogoutDialog}
        onFechar={() => setShowLogoutDialog(false)}
        titulo="Confirmar Saída"
        descricao="Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o sistema."
        onConfirmar={handleLogout}
        textoConfirmar="Sair"
      />
    </>
  );
};

export default TopMenu;