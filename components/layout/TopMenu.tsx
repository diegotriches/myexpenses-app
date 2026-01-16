// src/components/layout/TopMenu.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { BsList, BsChevronLeft, BsCalculatorFill } from "react-icons/bs";
import { Sun, Moon, LogOut, ChevronRight, MoreVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PeriodoSelector from "@/components/layout/PeriodoSelector";
import CalculadoraModal from "@/components/common/CalculadoraModal";
import { NotificacaoPopover } from "@/components/notificacao/NotificacaoPopover";

interface TopMenuProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const TopMenu = ({ isCollapsed, toggleSidebar }: TopMenuProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [calculadoraOpen, setCalculadoraOpen] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Evita hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const alternarModo = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: "/login",
      redirect: true 
    });
  };

  // Toggle do menu mobile
  const toggleMenu = () => {
    setMenuExpanded(!menuExpanded);
  };

  // Gerar breadcrumbs baseado na rota
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      movimentacoes: 'Movimentações',
      contas: 'Contas',
      cartoes: 'Cartões',
      categorias: 'Categorias',
      notificacoes: 'Notificações',
      ajustes: 'Ajustes',
      perfil: 'Perfil',
      extrato: 'Extrato',
      configuracoes: 'Configurações',
      relatorios: 'Relatórios',
      transferencias: 'Transferências',
    };

    return paths.map((path, index) => ({
      label: labels[path] || path,
      href: '/' + paths.slice(0, index + 1).join('/'),
      isLast: index === paths.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'MyExpenses';

  // Renderiza um fallback até montar (evita flash)
  if (!mounted) {
    return (
      <header
        className="
          fixed top-0 left-0 right-0 h-16
          bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700
          shadow-sm z-30
          flex items-center justify-between px-4
          md:left-20 md:right-0
          lg:left-64
        "
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10" />
        </div>
      </header>
    );
  }

  return (
    <>
      {/* ============================================
          HEADER - Adaptado para Mobile/Tablet/Desktop
          ============================================ */}
      <header
        className={`
          fixed top-0 right-0
          bg-white dark:bg-gray-900 
          border-b border-gray-200 dark:border-gray-700
          shadow-sm z-30
          transition-all duration-300
          
          /* Mobile: Altura dinâmica (16 ou 28) */
          left-0 ${menuExpanded ? 'h-28' : 'h-16'}
          
          /* Tablet: Sidebar visível, 1 linha */
          md:left-20 md:h-16
          
          /* Desktop: Sidebar expandido */
          ${isCollapsed ? 'lg:left-20' : 'lg:left-64'}
        `}
      >
        {/* ============================================
            LINHA 1: Navegação Principal
            ============================================ */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6">
          
          {/* LEFT SECTION */}
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Menu Hamburguer - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="
                md:hidden
                h-12 w-12 flex-shrink-0
                text-gray-600 hover:text-blue-600 hover:bg-blue-50 
                dark:text-gray-300 dark:hover:bg-gray-800
                touch-manipulation
                active:scale-95
                transition-all duration-100
              "
              aria-label="Menu"
            >
              <BsList size={24} />
            </Button>

            {/* Toggle Sidebar - Desktop */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="
                hidden md:flex
                text-gray-600 hover:text-blue-600 hover:bg-blue-50 
                dark:text-gray-300 dark:hover:bg-gray-800
              "
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? <BsList size={20} /> : <BsChevronLeft size={20} />}
            </Button>

            {/* Breadcrumbs - Desktop */}
            <nav className="hidden lg:flex items-center gap-2 text-sm" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight size={14} className="text-gray-400 dark:text-gray-600" aria-hidden="true" />
                  )}
                  {crumb.isLast ? (
                    <span className="font-semibold text-gray-900 dark:text-white" aria-current="page">
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

            {/* Page Title - Mobile/Tablet */}
            <h1 className="lg:hidden font-semibold text-gray-900 dark:text-white truncate text-base md:text-lg">
              {currentPageTitle}
            </h1>
          </div>

          {/* CENTER SECTION - Periodo Selector (Desktop only) */}
          <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2">
            <PeriodoSelector />
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* Calculadora - Desktop/Tablet */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalculadoraOpen(true)}
              className="
                hidden md:flex
                text-gray-600 hover:text-blue-600 hover:bg-blue-50 
                dark:text-gray-300 dark:hover:bg-gray-800
              "
              title="Calculadora"
              aria-label="Abrir calculadora"
            >
              <BsCalculatorFill size={18} />
            </Button>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={alternarModo}
              className="
                h-12 w-12 md:h-10 md:w-10
                text-gray-600 hover:text-blue-600 hover:bg-blue-50 
                dark:text-gray-300 dark:hover:bg-gray-800
                touch-manipulation
                active:scale-95
                transition-all duration-100
              "
              title={resolvedTheme === "dark" ? "Modo claro" : "Modo escuro"}
              aria-label={resolvedTheme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            >
              {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {/* Notificações */}
            <NotificacaoPopover />

            {/* Divider - Desktop only */}
            <div className="hidden lg:block h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Logout - Desktop/Tablet */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutDialog(true)}
              className="
                hidden md:flex
                text-gray-600 hover:text-red-600 hover:bg-red-50 
                dark:text-gray-300 dark:hover:bg-red-900/20
              "
              title="Sair"
              aria-label="Sair da conta"
            >
              <LogOut size={18} />
            </Button>

            {/* Botão Menu Expansível - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className={`
                md:hidden
                h-12 w-12
                touch-manipulation
                active:scale-95
                transition-all duration-100
                ${menuExpanded 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }
              `}
              aria-label={menuExpanded ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuExpanded}
            >
              {menuExpanded ? (
                <X size={20} className="transition-transform duration-200" />
              ) : (
                <MoreVertical size={20} className="transition-transform duration-200" />
              )}
            </Button>
          </div>
        </div>

        {/* ============================================
            LINHA 2: Contexto e Ações (Mobile only - Expansível)
            ============================================ */}
        <div 
          className={`
            md:hidden 
            overflow-hidden
            border-t border-gray-200 dark:border-gray-700
            transition-all duration-300 ease-in-out
            ${menuExpanded 
              ? 'h-12 opacity-100' 
              : 'h-0 opacity-0'
            }
          `}
        >
          <div className="h-12 flex items-center justify-center gap-4 px-4">
            
            {/* Label "Período:" */}
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
              Período:
            </span>

            {/* Periodo Selector Inline - Mobile */}
            <div className="flex-shrink-0">
              <PeriodoSelector />
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 flex-shrink-0" />

            {/* Ações Rápidas - Mobile */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Calculadora */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCalculadoraOpen(true);
                  setMenuExpanded(false); // Fecha o menu ao abrir calculadora
                }}
                className="
                  h-12 w-12
                  text-gray-600 hover:text-blue-600 hover:bg-blue-50
                  dark:text-gray-300 dark:hover:bg-gray-800
                  touch-manipulation
                  active:scale-95
                  transition-all duration-100
                "
                aria-label="Abrir calculadora"
                title="Calculadora"
              >
                <BsCalculatorFill size={20} />
              </Button>

              {/* Logout */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowLogoutDialog(true);
                  setMenuExpanded(false); // Fecha o menu ao abrir dialog
                }}
                className="
                  h-12 w-12
                  text-gray-600 hover:text-red-600 hover:bg-red-50
                  dark:text-gray-300 dark:hover:bg-red-900/20
                  touch-manipulation
                  active:scale-95
                  transition-all duration-100
                "
                aria-label="Sair da conta"
                title="Sair"
              >
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================
          MODALS
          ============================================ */}

      {/* Calculadora Modal */}
      <CalculadoraModal 
        open={calculadoraOpen} 
        onOpenChange={setCalculadoraOpen} 
      />

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Saída</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TopMenu;