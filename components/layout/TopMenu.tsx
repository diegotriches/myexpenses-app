// src/components/layout/TopMenu.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { BsList, BsChevronLeft, BsCalculatorFill } from "react-icons/bs";
import { Sun, Moon, LogOut, ChevronRight, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const alternarModo = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const handleLogout = async () => {
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
  };

  // Gerar breadcrumbs baseado na rota
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    const labels: Record<string, string> = {
      dashboard: "Dashboard",
      transacoes: "Movimentações",
      contas: "Contas",
      cartoes: "Cartões",
      fatura: "Fatura",
      categorias: "Categorias",
      ajustes: "Ajustes",
      perfil: "Perfil",
      extrato: "Extrato",
      configuracoes: "Configurações",
    };

    return paths.map((path, index) => ({
      label: labels[path] || path,
      href: "/" + paths.slice(0, index + 1).join("/"),
      isLast: index === paths.length - 1,
    }));
  };

  const breadcrumbs = getBreadcrumbs();

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
          HEADER
          ============================================ */}
      <header
        className={`
          fixed top-0 right-0 h-16
          bg-white dark:bg-gray-900
          border-b border-gray-200 dark:border-gray-700
          shadow-sm z-30
          transition-all duration-300

          left-0
          md:left-20
          ${isCollapsed ? "lg:left-20" : "lg:left-64"}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 md:px-6">

          {/* ── LEFT ── */}
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            {/* Hamburguer - mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="
                md:hidden h-12 w-12 flex-shrink-0
                text-gray-600 hover:text-blue-600 hover:bg-blue-50
                dark:text-gray-300 dark:hover:bg-gray-800
                touch-manipulation active:scale-95 transition-all duration-100
              "
              aria-label="Abrir menu lateral"
            >
              <BsList size={24} />
            </Button>

            {/* Toggle sidebar - tablet/desktop */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="
                hidden md:flex
                text-gray-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer
                dark:text-gray-300 dark:hover:bg-gray-800
                transition-all duration-100 active:scale-95
              "
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? <BsList size={20} /> : <BsChevronLeft size={20} />}
            </Button>

            {/* Breadcrumbs - desktop */}
            <nav
              className="hidden lg:flex items-center gap-2 text-sm"
              aria-label="Breadcrumb"
            >
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {index > 0 && (
                    <ChevronRight
                      size={14}
                      className="text-gray-400 dark:text-gray-600"
                      aria-hidden="true"
                    />
                  )}
                  {crumb.isLast ? (
                    <span
                      className="font-semibold text-gray-900 dark:text-white"
                      aria-current="page"
                    >
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
          </div>

          {/* ── CENTER ── */}

          {/* Período - desktop (centralizado absoluto) */}
          <div className="hidden lg:flex absolute left-1/2 transform -translate-x-1/2">
            <PeriodoSelector />
          </div>

          {/* Período - mobile/tablet (inline no flow) */}
          <div className="md:hidden flex-shrink-0 mx-2">
            <PeriodoSelector />
          </div>

          {/* ── RIGHT ── */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">

            {/* Calculadora - desktop/tablet */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalculadoraOpen(true)}
              className="
                hidden md:flex
                text-gray-600 hover:text-blue-600 hover:bg-blue-50 cursor-pointer
                dark:text-gray-300 dark:hover:bg-gray-800
                transition-all duration-100 active:scale-95
              "
              title="Calculadora"
              aria-label="Abrir calculadora"
            >
              <BsCalculatorFill size={18} />
            </Button>

            {/* Theme toggle - desktop/tablet */}
            <Button
              variant="ghost"
              size="icon"
              onClick={alternarModo}
              className="
                hidden md:flex
                text-gray-600 hover:text-blue-600 hover:bg-blue-50
                dark:text-gray-300 dark:hover:bg-gray-800
                touch-manipulation active:scale-95 transition-all duration-100 cursor-pointer
              "
              title={resolvedTheme === "dark" ? "Modo claro" : "Modo escuro"}
              aria-label={
                resolvedTheme === "dark"
                  ? "Ativar modo claro"
                  : "Ativar modo escuro"
              }
            >
              {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>

            {/* Notificações - todas as telas */}
            <NotificacaoPopover />

            {/* Divider - desktop */}
            <div className="hidden lg:block h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Logout - desktop/tablet */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutDialog(true)}
              className="
                hidden md:flex
                text-gray-600 hover:text-red-600 hover:bg-red-50
                dark:text-gray-300 dark:hover:bg-red-900/20
                cursor-pointer transition-all duration-100 active:scale-95
              "
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
                    variant="ghost"
                    size="icon"
                    className="
                      h-12 w-12
                      text-gray-600 hover:text-blue-600 hover:bg-blue-50
                      dark:text-gray-300 dark:hover:bg-gray-800
                      touch-manipulation active:scale-95 transition-all duration-100
                    "
                    aria-label="Mais opções"
                  >
                    <MoreVertical size={20} />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-48 dark:bg-gray-800 dark:border-gray-700"
                >
                  {/* Modo claro/escuro */}
                  <DropdownMenuItem
                    onClick={alternarModo}
                    className="flex items-center gap-3 h-11 cursor-pointer dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    {resolvedTheme === "dark" ? (
                      <>
                        <Sun size={17} className="text-amber-500 flex-shrink-0" />
                        <span>Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon size={17} className="text-indigo-500 flex-shrink-0" />
                        <span>Modo Escuro</span>
                      </>
                    )}
                  </DropdownMenuItem>

                  {/* Calculadora */}
                  <DropdownMenuItem
                    onClick={() => setCalculadoraOpen(true)}
                    className="flex items-center gap-3 h-11 cursor-pointer dark:hover:bg-gray-700 dark:text-gray-200"
                  >
                    <BsCalculatorFill
                      size={16}
                      className="text-blue-500 flex-shrink-0"
                    />
                    <span>Calculadora</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="dark:bg-gray-700" />

                  {/* Sair */}
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

      {/* ── MODALS ── */}
      <CalculadoraModal
        open={calculadoraOpen}
        onOpenChange={setCalculadoraOpen}
      />

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Saída</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair da sua conta? Você precisará fazer
              login novamente para acessar o sistema.
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