"use client";

import { useState, useRef, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, VisuallyHidden } from "@/components/ui/sheet";

import {
  BsHouse,
  BsArrowLeftRight,
  BsBank,
  BsCashCoin,
  BsTags,
  BsCreditCard,
  BsFillGearFill,
  BsShop, // Ícone para Estabelecimentos
  BsPiggyBank, // ✅ NOVO: ícone para Aplicações
} from "react-icons/bs";
import { MdOutlineAutoGraph } from "react-icons/md";
import { Menu, ChevronRight } from "lucide-react";
import type { IconType } from "react-icons";

interface SidebarProps {
  isCollapsed: boolean;
}

const Sidebar = ({ isCollapsed }: SidebarProps) => {
  const { data: userData, isLoading: loading } = useProfile();

  const [fotoError,   setFotoError]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isHovered,   setIsHovered]   = useState(false);
  const pathname = usePathname();
  const router   = useRouter();

  const touchStartX = useRef<number>(0);
  const touchEndX   = useRef<number>(0);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  const isExpanded = !isCollapsed || isHovered;

  // Ajusta o estado durante o render quando as dependências mudam (inclusive na montagem)
  const [depsAnteriores, setDepsAnteriores] = useState<readonly unknown[] | null>(null);
  const depsAtuais: readonly unknown[] = [pathname];
  if (!depsAnteriores || depsAtuais.some((d, i) => !Object.is(d, depsAnteriores[i]))) {
    setDepsAnteriores(depsAtuais);
    setMobileOpen(false);
  }

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const linkClasses = (href: string) => {
    const base   = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 relative group";
    const estado = isActive(href)
      ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
      : "text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white";
    return `${base} ${estado}`;
  };

  const navigationGroups = [
    {
      title: "Principal",
      links: [
        { href: "/dashboard",  icon: BsHouse,         label: "Dashboard"     },
        { href: "/transacoes", icon: BsArrowLeftRight, label: "Movimentações" },
      ],
    },
    {
      title: "Financeiro",
      links: [
        { href: "/contas",           icon: BsBank,       label: "Contas"             },
        // ✅ ATUALIZADO: Aplicações agora é página independente, não mais
        // uma aba dentro de Contas
        { href: "/aplicacoes",       icon: BsPiggyBank,  label: "Aplicações"         },
        { href: "/cartoes",          icon: BsCreditCard, label: "Cartões"            },
        { href: "/categorias",       icon: BsTags,       label: "Categorias"         },
        { href: "/estabelecimentos", icon: BsShop,       label: "Estabelecimentos"   },
      ],
    },
  ];

  const renderNavLink = ({
    href,
    icon: Icon,
    label,
    isMobile = false,
  }: {
    href: string;
    icon: IconType;
    label: string;
    isMobile?: boolean;
  }) => {
    const content = (
      <Link href={href} className={linkClasses(href)}>
        <Icon size={18} className="flex-shrink-0" />
        <span
          className={`
            whitespace-nowrap
            transition-all duration-300
            ${isExpanded || isMobile
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 absolute pointer-events-none"
            }
          `}
        >
          {label}
        </span>
      </Link>
    );

    if (isCollapsed && !isHovered && !isMobile) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">{label}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return content;
  };

  const renderUserProfileCard = ({ isMobile = false }: { isMobile?: boolean }) => {
    const getInitials = () => {
      if (userData?.name) {
        return userData.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      }
      return userData?.email?.[0]?.toUpperCase() || "U";
    };

    const initials     = getInitials();
    const displayName  = userData?.name  || "Usuário";
    const displayEmail = userData?.email || "";

    const cardContent = (
      <button
        onClick={() => router.push("/perfil")}
        className={`
          w-full flex items-center p-3 overflow-hidden
          bg-gray-50 hover:bg-gray-100 border border-gray-200
          dark:bg-gray-800/60 dark:hover:bg-gray-800 dark:border-gray-800
          rounded-lg transition-colors duration-150 group cursor-pointer
          ${isExpanded || isMobile ? "gap-3 justify-start" : "gap-0 justify-center"}
        `}
      >
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700">
            {loading ? (
              <div className="w-full h-full bg-blue-400 dark:bg-blue-600 animate-pulse" />
            ) : userData?.image && !fotoError ? (
              <img
                src={userData.image}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={() => setFotoError(true)}
              />
            ) : (
              <span className="text-white font-bold text-sm">{initials}</span>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-50 dark:border-gray-900 rounded-full" />
        </div>

        <div
          className={`
            text-left overflow-hidden transition-all duration-300
            ${isExpanded || isMobile
              ? "opacity-100 max-w-[160px] flex-1 min-w-0"
              : "opacity-0 max-w-0 flex-none pointer-events-none"
            }
          `}
        >
          {loading ? (
            <div className="space-y-1.5">
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
              <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{displayName}</p>
              {displayEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayEmail}</p>
              )}
            </>
          )}
        </div>

        <div className={`transition-all duration-300 overflow-hidden flex-shrink-0 ${isExpanded || isMobile ? "max-w-[16px] opacity-100" : "max-w-0 opacity-0"}`}>
          <ChevronRight size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
    );

    if (isCollapsed && !isHovered && !isMobile) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              <div className="text-left">
                <p className="font-semibold">{displayName}</p>
                {displayEmail && <p className="text-xs text-muted-foreground">{displayEmail}</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return cardContent;
  };

  const renderSidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className="mb-6 px-1">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 shrink-0 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-blue-700 transition-colors">
            <BsCashCoin size={20} className="text-white" />
          </div>
          <span
            className={`
              text-lg font-bold tracking-tight text-gray-900 dark:text-white whitespace-nowrap transition-all duration-300
              ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
            `}
          >
            MyExpenses
          </span>
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col gap-5 overflow-y-auto overflow-x-hidden">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <p
              className={`
                text-[11px] font-semibold text-gray-400 dark:text-gray-500
                uppercase tracking-wider mb-1.5 px-3 transition-all duration-300
                ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
              `}
            >
              {group.title}
            </p>
            <div className="flex flex-col gap-1">
              {group.links.map((link) => (
                <Fragment key={link.href}>{renderNavLink({ ...link, isMobile })}</Fragment>
              ))}
            </div>
          </div>
        ))}

        {/* Análise na sequência dos grupos; Ajustes fica embaixo, junto do perfil */}
        <div className="flex flex-col gap-1">
          <p
            className={`
              text-[11px] font-semibold text-gray-400 dark:text-gray-500
              uppercase tracking-wider mb-1.5 px-3 transition-all duration-300
              ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
            `}
          >
            Análise
          </p>
          {renderNavLink({ href: "/resumo-anual", icon: MdOutlineAutoGraph, label: "Resumo Anual", isMobile })}
        </div>

        <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-3">
          {renderNavLink({ href: "/ajustes", icon: BsFillGearFill, label: "Ajustes", isMobile })}
        </div>
      </div>

      {/* User Profile Card */}
      <div className="mt-3">
        {renderUserProfileCard({ isMobile })}
      </div>
    </>
  );

  return (
    <>
      {isCollapsed && isHovered && (
        <div
          className="hidden md:block fixed inset-0 bg-black/10 backdrop-blur-[1px] z-30"
          onClick={() => setIsHovered(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <nav
        className={`
          hidden md:flex fixed top-0 left-0 h-screen
          bg-white dark:bg-gray-900
          p-4 flex-col
          transition-all duration-300 z-40
          border-r border-gray-200 dark:border-gray-800
          overflow-x-hidden
          ${isExpanded ? "w-64" : "w-20"}
          ${isCollapsed && isHovered ? "shadow-xl" : ""}
        `}
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {renderSidebarContent({ isMobile: false })}
      </nav>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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
            ref={sheetContentRef}
            side="left"
            className="
              w-64 p-4
              bg-white dark:bg-gray-900
              border-r border-gray-200 dark:border-gray-800
              [&>button]:hidden
            "
          >
            <VisuallyHidden>
              <SheetTitle>Menu de Navegação</SheetTitle>
            </VisuallyHidden>
            <div
              className="flex flex-col h-full relative"
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
                touchEndX.current   = e.touches[0].clientX;
              }}
              onTouchMove={(e) => { touchEndX.current = e.touches[0].clientX; }}
              onTouchEnd={() => {
                const swipeDistance = touchStartX.current - touchEndX.current;
                if (swipeDistance > 50) setMobileOpen(false);
              }}
            >
              {renderSidebarContent({ isMobile: true })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default Sidebar;