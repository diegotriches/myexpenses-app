"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import api from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

import {
  BsHouse,
  BsArrowLeftRight,
  BsBank,
  BsCashCoin,
  BsTags,
  BsCreditCard,
  BsFillGearFill,
} from "react-icons/bs";
import { LogOut, Menu, ChevronRight, Moon, Sun } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
}

interface UserData {
  id?: number;
  foto?: string | null;
  email?: string;
  nome?: string;
}

const Sidebar = ({ isCollapsed }: SidebarProps) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoError, setFotoError] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        console.log("🔄 Carregando dados do usuário para sidebar...");
        
        // ✅ Endpoint correto
        const res = await api.get("/users/me");
        
        console.log("📦 Dados recebidos:", res.data);

        if (res.data) {
          setUserData({
            id: res.data.id,
            nome: res.data.nome || res.data.name,
            email: res.data.email,
            foto: res.data.foto, // ✅ Já vem a URL completa do Vercel Blob
          });
        }
      } catch (err) {
        console.error("❌ Erro ao carregar dados do usuário:", err);
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const linkClasses = (href: string) => {
    const base = "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 relative group";
    const hover = "hover:bg-blue-600 dark:hover:bg-blue-500 hover:shadow-md";
    const active = isActive(href) 
      ? "bg-blue-600 dark:bg-blue-500 shadow-md" 
      : "hover:bg-blue-600/50 dark:hover:bg-blue-500/50";
    return `${base} ${hover} ${active}`;
  };

  // Grupos de navegação
  const navigationGroups = [
    {
      title: "Principal",
      links: [
        { href: "/dashboard", icon: BsHouse, label: "Dashboard" },
        { href: "/movimentacao", icon: BsArrowLeftRight, label: "Movimentações" },
      ],
    },
    {
      title: "Financeiro",
      links: [
        { href: "/contas", icon: BsBank, label: "Contas" },
        { href: "/cartoes", icon: BsCreditCard, label: "Cartões" },
        { href: "/categorias", icon: BsTags, label: "Categorias" },
      ],
    },
  ];

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const content = (
      <Link href={href} className={linkClasses(href)}>
        <Icon size={20} className="flex-shrink-0" />
        {!isCollapsed && <span className="font-medium">{label}</span>}
        {isActive(href) && !isCollapsed && (
          <ChevronRight size={16} className="ml-auto opacity-70" />
        )}
        {isActive(href) && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white dark:bg-gray-200 rounded-r-full" />
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              {label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  const UserProfileCard = () => {
    // ✅ Prioriza nome, senão pega primeira letra do email
    const getInitials = () => {
      if (userData?.nome) {
        return userData.nome
          .split(' ')
          .map(n => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
      }
      return userData?.email?.[0]?.toUpperCase() || "U";
    };

    const initials = getInitials();
    const displayName = userData?.nome || "Usuário";
    const displayEmail = userData?.email || "";

    const cardContent = (
      <button
        onClick={() => router.push("/perfil")}
        className="w-full flex items-center gap-3 p-3 bg-blue-800 dark:bg-gray-800 hover:bg-blue-700 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 group cursor-pointer"
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700">
            {loading ? (
              <div className="w-full h-full bg-blue-400 dark:bg-blue-600 animate-pulse" />
            ) : userData?.foto && !fotoError ? (
              <img
                src={userData.foto}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => {
                  console.error("❌ Erro ao carregar foto:", userData.foto);
                  setFotoError(true);
                }}
              />
            ) : (
              <span className="text-white font-bold text-sm">{initials}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-blue-800 dark:border-slate-800 rounded-full" />
        </div>

        {/* Nome e Email */}
        {!isCollapsed && (
          <div className="flex-1 text-left overflow-hidden min-w-0">
            {loading ? (
              <div className="space-y-1.5">
                <div className="h-3.5 bg-blue-600 dark:bg-gray-600 rounded w-24 animate-pulse" />
                <div className="h-2.5 bg-blue-600 dark:bg-gray-600 rounded w-32 animate-pulse" />
              </div>
            ) : (
              <>
                {/* ✅ Nome acima */}
                <p className="text-sm font-semibold truncate text-white">
                  {displayName}
                </p>
                {/* ✅ Email abaixo */}
                {displayEmail && (
                  <p className="text-xs text-blue-200 dark:text-gray-400 truncate">
                    {displayEmail}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {!isCollapsed && (
          <ChevronRight 
            size={16} 
            className="text-blue-200 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
          />
        )}
      </button>
    );

    if (isCollapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <div className="text-left">
                <p className="font-semibold">{displayName}</p>
                {displayEmail && (
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return cardContent;
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all border border-blue-100 dark:border-slate-700">
            <BsCashCoin size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-white">MyExpenses</span>
          )}
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            {!isCollapsed && (
              <p className="text-xs font-semibold text-blue-200 dark:text-slate-400 uppercase tracking-wider mb-2 px-3">
                {group.title}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {group.links.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </div>
          </div>
        ))}

        {/* Ajustes no final */}
        <div className="mt-auto pt-4 border-t border-blue-600 dark:border-slate-700">
          <NavLink href="/ajustes" icon={BsFillGearFill} label="Ajustes" />
        </div>
      </div>

      {/* User Profile Card */}
      <div className="mt-4 space-y-2">
        <UserProfileCard />
        
        {/* Botões de ação */}
        <div className="flex gap-2">
          {/* Botão Tema */}
          {mounted && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleTheme}
                    variant="ghost"
                    size={isCollapsed ? "icon" : "default"}
                    className={`text-yellow-200 hover:text-white hover:bg-yellow-600/80 dark:text-gray-300 dark:hover:bg-gray-700 transition-all cursor-pointer ${
                      isCollapsed ? "w-full" : "flex-1"
                    }`}
                  >
                    {theme === "dark" ? (
                      <Sun size={20} className="flex-shrink-0" />
                    ) : (
                      <Moon size={20} className="flex-shrink-0" />
                    )}
                    {!isCollapsed && (
                      <span className="ml-2 font-medium">
                        {theme === "dark" ? "Claro" : "Escuro"}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="font-medium">
                    Modo {theme === "dark" ? "Claro" : "Escuro"}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Botão Sair */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setShowLogoutDialog(true)}
                  variant="ghost"
                  size={isCollapsed ? "icon" : "default"}
                  className={`text-red-200 hover:text-white hover:bg-red-600/80 dark:text-red-400 dark:hover:bg-red-600/80 transition-all cursor-pointer ${
                    isCollapsed ? "w-full" : "flex-1"
                  }`}
                >
                  <LogOut size={20} className="flex-shrink-0" />
                  {!isCollapsed && <span className="ml-2 font-medium">Sair</span>}
                </Button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="font-medium">
                  Sair
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        className={`
          hidden md:flex fixed top-0 left-0 h-screen
          bg-gradient-to-b from-blue-600 to-blue-700 
          dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
          text-white p-4 flex-col 
          transition-all duration-300 shadow-2xl z-40
          border-r border-blue-800 dark:border-slate-800
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        <SidebarContent />
      </nav>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50 bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="left" 
            className="w-64 p-4 bg-gradient-to-b from-blue-600 to-blue-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white border-none"
          >
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

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

export default Sidebar;