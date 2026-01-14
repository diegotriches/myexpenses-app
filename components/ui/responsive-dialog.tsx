// src/components/ui/responsive-dialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  fullscreen?: boolean; // Modal fullscreen em mobile
}

/**
 * Dialog que vira Drawer em mobile
 * Melhor UX para formulários e conteúdo longo
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  fullscreen = false,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={cn(fullscreen && "h-[95vh]", className)}>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-[95vw] sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px]",
        fullscreen && "sm:max-w-[90vw] md:max-w-4xl",
        className
      )}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Footer do dialog com botões responsivos
 */
interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialogFooter({
  children,
  className,
}: ResponsiveDialogFooterProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "flex gap-2 pt-4",
      isMobile ? "flex-col" : "flex-row justify-end",
      className
    )}>
      {children}
    </div>
  );
}