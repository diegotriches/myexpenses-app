"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const linkClasses = (href: string) => {
    const base   = "flex items-center gap-3 p-3 rounded-lg transition-all duration-200 relative group";
    const hover  = "hover:bg-blue-600 dark:hover:bg-blue-500 hover:shadow-md";
    const active = isActive(href)
      ? "bg-blue-600 dark:bg-blue-500 shadow-md"
      : "hover:bg-blue-600/50 dark:hover:bg-blue-500/50";
    return `${base} ${hover} ${active}`;
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

  const NavLink = ({
    href,
    icon: Icon,
    label,
    isMobile = false,
  }: {
    href: string;
    icon: any;
    label: string;
    isMobile?: boolean;
  }) => {
    const content = (
      <Link href={href} className={linkClasses(href)}>
        <Icon size={20} className="flex-shrink-0" />
        <span
          className={`
            font-medium whitespace-nowrap
            transition-all duration-300
            ${isExpanded || isMobile
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-4 absolute pointer-events-none"
            }
          `}
        >
          {label}
        </span>
        {isActive(href) && (isExpanded || isMobile) && (
          <ChevronRight size={16} className="ml-auto opacity-70" />
        )}
        {isActive(href) && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white dark:bg-gray-200 rounded-r-full" />
        )}
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

  const UserProfileCard = ({ isMobile = false }: { isMobile?: boolean }) => {
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
          bg-blue-800 dark:bg-gray-800 hover:bg-blue-700 dark:hover:bg-gray-700
          rounded-lg transition-all duration-200 group cursor-pointer
          ${isExpanded || isMobile ? "gap-3 justify-start" : "gap-0 justify-center"}
        `}
      >
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-700 overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700">
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
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-blue-800 dark:border-slate-800 rounded-full" />
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
              <div className="h-3.5 bg-blue-600 dark:bg-gray-600 rounded w-24 animate-pulse" />
              <div className="h-2.5 bg-blue-600 dark:bg-gray-600 rounded w-32 animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold truncate text-white">{displayName}</p>
              {displayEmail && (
                <p className="text-xs text-blue-200 dark:text-gray-400 truncate">{displayEmail}</p>
              )}
            </>
          )}
        </div>

        <div className={`transition-all duration-300 overflow-hidden flex-shrink-0 ${isExpanded || isMobile ? "max-w-[16px] opacity-100" : "max-w-0 opacity-0"}`}>
          <ChevronRight size={16} className="text-blue-200 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Logo */}
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-all border border-blue-100 dark:border-slate-700">
            <BsCashCoin size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span
            className={`
              text-xl font-bold text-white whitespace-nowrap transition-all duration-300
              ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
            `}
          >
            MyExpenses
          </span>
        </Link>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto overflow-x-hidden">
        {navigationGroups.map((group) => (
          <div key={group.title}>
            <p
              className={`
                text-xs font-semibold text-blue-200 dark:text-slate-400
                uppercase tracking-wider mb-2 px-3 transition-all duration-300
                ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
              `}
            >
              {group.title}
            </p>
            <div className="flex flex-col gap-1">
              {group.links.map((link) => (
                <NavLink key={link.href} {...link} isMobile={isMobile} />
              ))}
            </div>
          </div>
        ))}

        {/* Análise + Ajustes */}
        <div className="mt-auto flex flex-col gap-1">
          <p
            className={`
              text-xs font-semibold text-blue-200 dark:text-slate-400
              uppercase tracking-wider mb-2 px-3 transition-all duration-300
              ${isExpanded || isMobile ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute pointer-events-none"}
            `}
          >
            Análise
          </p>
          <NavLink href="/resumo-anual" icon={MdOutlineAutoGraph} label="Resumo Anual" isMobile={isMobile} />

          <div className="border-t border-blue-600 dark:border-slate-700 my-2" />

          <NavLink href="/ajustes" icon={BsFillGearFill} label="Ajustes" isMobile={isMobile} />
        </div>
      </div>

      {/* User Profile Card */}
      <div className="mt-4">
        <UserProfileCard isMobile={isMobile} />
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
          bg-gradient-to-b from-blue-600 to-blue-700
          dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
          text-white p-4 flex-col
          transition-all duration-300 shadow-2xl z-40
          border-r border-blue-800 dark:border-slate-800
          overflow-x-hidden
          ${isExpanded ? "w-64" : "w-20"}
        `}
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarContent isMobile={false} />
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
              bg-gradient-to-b from-blue-600 to-blue-700
              dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
              text-white border-none
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
              <SidebarContent isMobile={true} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default Sidebar;